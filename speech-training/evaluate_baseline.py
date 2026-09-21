"""Evaluate Whisper on validation or explicitly selected final-test data; never train."""
import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import random
import statistics
import time
import unicodedata
import wave


def normalize(text):
    text = unicodedata.normalize('NFC', text).lower()
    return ' '.join(''.join(
        '' if c in "'’" else ' ' if unicodedata.category(c).startswith('P') else c
        for c in text).split())


def edit_distance(reference, hypothesis):
    previous = list(range(len(hypothesis) + 1))
    for i, expected in enumerate(reference, 1):
        current = [i]
        for j, heard in enumerate(hypothesis, 1):
            current.append(min(current[-1] + 1, previous[j] + 1,
                               previous[j - 1] + (expected != heard)))
        previous = current
    return previous[-1]


def score(reference, hypothesis):
    reference, hypothesis = normalize(reference), normalize(hypothesis)
    words, predicted_words = reference.split(), hypothesis.split()
    chars, predicted_chars = reference.replace(' ', ''), hypothesis.replace(' ', '')
    if not words or not chars:
        raise ValueError('Reference has no scorable text')
    return {'word_errors': edit_distance(words, predicted_words), 'reference_words': len(words),
            'character_errors': edit_distance(chars, predicted_chars), 'reference_characters': len(chars)}


def select_samples(manifest, limit, seed, split='validation'):
    if split not in ('validation', 'test') or manifest.name != f'{split}.jsonl':
        raise ValueError('Manifest must match the explicitly selected validation/test split')
    if limit < 1:
        raise ValueError('Sample count must be positive')
    rows = [json.loads(line) for line in manifest.read_text(encoding='utf-8').splitlines() if line.strip()]
    if not rows:
        raise ValueError('Empty manifest')
    rows = random.Random(seed).sample(rows, min(limit, len(rows)))
    for row in rows:
        if not Path(row['audio']).is_file():
            raise ValueError(f"Audio missing: {row['audio']}")
        score(row['text'], '')
    return rows


def read_audio(path):
    import numpy as np
    with wave.open(str(path), 'rb') as audio:
        channels, width, rate, frames, compression, _ = audio.getparams()
        if (channels, width, rate, compression) != (1, 2, 16000, 'NONE') or not 0.2 <= frames / rate <= 30:
            raise ValueError(f'Unsupported audio format or duration: {path}')
        data = audio.readframes(frames)
        if len(data) != frames * width:
            raise ValueError(f'Truncated audio: {path}')
    return np.frombuffer(data, dtype='<i2').astype(np.float32) / 32768.0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset-root', type=Path, default=Path('C:/dataset'))
    parser.add_argument('--output', type=Path, default=Path('C:/dataset/baseline-whisper-base-v1'))
    parser.add_argument('--model', default='openai/whisper-base')
    parser.add_argument('--revision', default='main')
    parser.add_argument('--cache-dir', type=Path, default=Path('C:/dataset/model-cache'))
    parser.add_argument('--samples', type=int, default=100, help='Recordings per language')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--split', choices=('validation', 'test'), default='validation',
                        help='Use test only for final evaluation after model selection')
    parser.add_argument('--dry-run', action='store_true', help='Check manifests only; no downloads or output files')
    args = parser.parse_args()
    selected, manifest_hashes = {}, {}
    for language in ('fil', 'eng'):
        manifest = args.dataset_root / f'prepared-{language}-v1' / f'{args.split}.jsonl'
        selected[language] = select_samples(manifest, args.samples, args.seed, split=args.split)
        manifest_hashes[language] = hashlib.sha256(manifest.read_bytes()).hexdigest()
        print(f'{language}: {len(selected[language])} {args.split} recordings, '
              f'{len({r["speaker_id"] for r in selected[language]})} speakers', flush=True)
    if args.dry_run:
        print('Dry run passed. No model downloaded and no evaluation performed.')
        return
    if args.output.exists():
        raise ValueError('Output exists. Choose a different --output folder to preserve previous results.')
    os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
    import torch
    from transformers import WhisperForConditionalGeneration, WhisperProcessor
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA GPU is not available in this Python environment')
    print('GPU:', torch.cuda.get_device_name(0), flush=True)
    print('Loading model; first run downloads weights. Audio stays local.', flush=True)
    load_options = {'cache_dir': str(args.cache_dir), 'revision': args.revision}
    processor = WhisperProcessor.from_pretrained(args.model, **load_options)
    model = WhisperForConditionalGeneration.from_pretrained(args.model, use_safetensors=True, **load_options)
    model = model.to('cuda').eval()
    model.generation_config.forced_decoder_ids = None

    def transcribe(audio, language):
        inputs = processor(audio, sampling_rate=16000, return_tensors='pt', return_attention_mask=True)
        inputs = {key: value.to('cuda') for key, value in inputs.items()}
        with torch.inference_mode():
            # Default Whisper output strips EOS. Preserve the raw generation
            # sequences so a normal completion isn't mistaken for truncation.
            generated = model.generate(**inputs, language=language, task='transcribe',
                                       do_sample=False, num_beams=1, max_new_tokens=440,
                                       return_dict_in_generate=True, return_timestamps=False)
            tokens = generated.sequences
        text = processor.batch_decode(tokens, skip_special_tokens=True)[0].strip()
        return text, int(tokens[0, -1]) != model.config.eos_token_id

    args.output.mkdir(parents=True)
    with (args.output / 'selected.jsonl').open('w', encoding='utf-8') as stream:
        for language, rows in selected.items():
            for row in rows:
                stream.write(json.dumps({'language': language, **row}, ensure_ascii=False) + '\n')
    report = {'model': args.model, 'requested_revision': args.revision,
              'resolved_revision': getattr(model.config, '_commit_hash', None),
              'manifest_sha256': manifest_hashes, 'seed': args.seed, 'split': args.split,
              'device': torch.cuda.get_device_name(0), 'precision': str(next(model.parameters()).dtype),
              'packages': {p: importlib.metadata.version(p) for p in ('torch', 'transformers', 'numpy')},
              'normalization': 'NFC, lowercase, remove apostrophes, other punctuation becomes spaces; accents and number spelling retained. CER ignores spaces.',
              'timing': 'Per-clip preprocessing, GPU transcription and decoding; excludes disk reads, model loading and one warmup per language.',
              'decoding': {'task': 'transcribe', 'num_beams': 1, 'do_sample': False, 'max_new_tokens': 440},
              'limitations': [f'Evaluated on the selected {args.split} recordings; not a pronunciation score or child-reading validation.',
                             'Timing is offline clip processing, not live browser latency.',
                             'Error rates can exceed 100 percent with many inserted words.'],
              'results': {}}
    for language, rows in selected.items():
        model_language = 'tagalog' if language == 'fil' else 'english'
        transcribe(read_audio(rows[0]['audio']), model_language)
        torch.cuda.synchronize()
        counts = Counter()
        times, durations = [], []
        with (args.output / f'{language}-predictions.jsonl').open('w', encoding='utf-8') as stream:
            for index, row in enumerate(rows, 1):
                audio = read_audio(row['audio'])
                torch.cuda.synchronize()
                start = time.perf_counter()
                prediction, hit_limit = transcribe(audio, model_language)
                torch.cuda.synchronize()
                elapsed = time.perf_counter() - start
                metrics = score(row['text'], prediction)
                counts.update(metrics)
                counts['generation_limit_hits'] += int(hit_limit)
                times.append(elapsed)
                durations.append(len(audio) / 16000)
                result = {'audio': row['audio'], 'speaker_id': row['speaker_id'],
                          'prompt_category': row['prompt_category'], 'reference': row['text'],
                          'prediction': prediction, 'seconds': elapsed, 'audio_seconds': durations[-1],
                          'generation_limit_hit': hit_limit, **metrics}
                stream.write(json.dumps(result, ensure_ascii=False) + '\n')
                stream.flush()
                print(f'{language} {index}/{len(rows)}: {elapsed:.2f}s', flush=True)
        report['results'][language] = {
            'recordings': len(rows), 'speakers': len({r['speaker_id'] for r in rows}),
            'prompt_categories': dict(Counter(r['prompt_category'] for r in rows)),
            'wer_percent': 100 * counts['word_errors'] / counts['reference_words'],
            'cer_percent': 100 * counts['character_errors'] / counts['reference_characters'],
            'mean_seconds_per_clip': statistics.mean(times),
            'median_seconds_per_clip': statistics.median(times),
            'total_audio_seconds': sum(durations), 'total_processing_seconds': sum(times),
            'real_time_factor': sum(times) / sum(durations), **dict(counts)}
        (args.output / 'summary.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        summary = report['results'][language]
        print(f"{language}: WER={summary['wer_percent']:.2f}%, CER={summary['cer_percent']:.2f}%, "
              f"RTF={summary['real_time_factor']:.3f}", flush=True)
    print('Finished. Report:', args.output / 'summary.json')


if __name__ == '__main__':
    main()
