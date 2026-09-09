import { useEffect, useRef, useState } from 'react';
import { getSession } from '../utils/session';
import { isInactivityPaused } from '../utils/inactivityPause';
import { readingWords, normalizedWord, matchedWordCount } from '../utils/readingTracking';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function FlashcardReader({ text, language }) {
  const [listening, setListening] = useState(false);
  const [count, setCount] = useState(0);
  const [retry, setRetry] = useState(null);
  const [status, setStatus] = useState('Tap the microphone to read aloud.');
  const recognizerRef = useRef(null);
  const requestRef = useRef(0);
  const words = readingWords(text);

  useEffect(() => () => {
    requestRef.current += 1;
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) recognizer.stopContinuousRecognitionAsync(() => recognizer.close(), () => recognizer.close());
  }, []);

  const stop = (message = 'Listening stopped. Tap the microphone to read again.') => {
    requestRef.current += 1;
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    setListening(false);
    setStatus(message);
    if (recognizer) recognizer.stopContinuousRecognitionAsync(() => recognizer.close(), () => recognizer.close());
  };

  const start = async () => {
    const request = ++requestRef.current;
    setListening(true);
    setCount(0);
    setRetry(null);
    setStatus('Connecting to your reading helper…');
    let spoken = '';
    try {
      const response = await fetch(`${API_URL}/api/speech/token`, {
        method: 'POST',
        headers: { 'X-Learner-Id': getSession()?.user?.id || '' },
      });
      const credentials = await response.json();
      if (!response.ok) throw new Error(credentials.message || 'Could not start speech recognition.');
      const SDK = await import('microsoft-cognitiveservices-speech-sdk');
      if (request !== requestRef.current) return;
      const config = SDK.SpeechConfig.fromAuthorizationToken(credentials.token, credentials.region);
      config.speechRecognitionLanguage = language === 'FIL' ? 'fil-PH' : 'en-US';
      config.outputFormat = SDK.OutputFormat.Detailed;
      config.setProperty(SDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, '500');
      const recognizer = new SDK.SpeechRecognizer(config, SDK.AudioConfig.fromDefaultMicrophoneInput());
      recognizerRef.current = recognizer;
      if (language === 'ENG') {
        new SDK.PronunciationAssessmentConfig(text,
          SDK.PronunciationAssessmentGradingSystem.HundredMark,
          SDK.PronunciationAssessmentGranularity.Word, true).applyTo(recognizer);
      }
      recognizer.recognizing = (_, event) => {
        if (recognizerRef.current !== recognizer) return;
        if (isInactivityPaused()) return;
        if (event.result.text?.trim()) window.dispatchEvent(new Event('lira:student-activity'));
        const matched = matchedWordCount(text, `${spoken} ${event.result.text || ''}`);
        setCount(matched);
        setRetry((previous) => previous === matched ? previous : null);
      };
      recognizer.recognized = (_, event) => {
        if (recognizerRef.current !== recognizer) return;
        if (isInactivityPaused()) return;
        if (event.result.text?.trim()) window.dispatchEvent(new Event('lira:student-activity'));
        if (event.result.reason !== SDK.ResultReason.RecognizedSpeech) return;
        const previous = matchedWordCount(text, spoken);
        spoken = `${spoken} ${event.result.text || ''}`.trim();
        const matched = matchedWordCount(text, spoken);
        setCount(matched);
        setRetry(matched === previous && event.result.text && matched < words.length ? matched : null);
        if (matched >= words.length) stop('Great job! You finished this flashcard.');
      };
      recognizer.canceled = (_, event) => {
        if (recognizerRef.current !== recognizer) return;
        stop(event.reason === SDK.CancellationReason.Error
          ? 'Could not continue listening. Check microphone access and your connection, then try again.'
          : 'Listening stopped. Tap the microphone to try again.');
      };
      recognizer.sessionStopped = () => {
        if (recognizerRef.current === recognizer) stop();
      };
      recognizer.startContinuousRecognitionAsync(() => {
        if (recognizerRef.current === recognizer) setStatus('Listening… Read the words at your own pace.');
      }, (error) => {
        if (recognizerRef.current === recognizer) stop(String(error || 'Could not start the reading helper.'));
      });
    } catch (error) {
      if (request !== requestRef.current) return;
      stop(error?.name === 'NotAllowedError'
        ? 'Microphone access is blocked. Allow it in your browser, then try again.'
        : error.message || 'Could not start the reading helper.');
    }
  };

  const progress = Math.round(count / Math.max(1, words.length) * 100);
  const parts = String(text || '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu) || [];
  let wordIndex = 0;
  return <>
    <div className="fs-progress" role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <div className="fs-progress__fill" style={{ width: `${progress}%` }} />
    </div>
    <p className="fs-sentence">{parts.map((part, index) => {
      if (!normalizedWord(part)) return <span key={index}>{part}</span>;
      const position = wordIndex++;
      return <span key={index} className={position === retry ? 'fs-word-retry' : position < count ? 'fs-sentence__read' : position === count && listening ? 'fs-word-current' : 'fs-sentence__rest'}>{part}</span>;
    })}</p>
    {retry !== null && <p className="fs-reading-feedback" role="status">Try: “{words[retry]}”</p>}
    <button type="button" className={`fs-mic ${listening ? 'fs-mic--active' : ''}`} onClick={() => listening ? stop() : start()} disabled={!words.length} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Start listening'}>🎤</button>
    <span className="fs-mic__status" role="status">{status}</span>
  </>;
}
