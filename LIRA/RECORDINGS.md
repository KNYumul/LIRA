# Story reading recordings

Restart the backend and sign in again as both learner and teacher after this update. Password and Google teacher login issue a private recording session valid for 24 hours. No new service, API key, or dependency is required; recordings use the existing MongoDB database.

Story Mode records the microphone stream used by Azure speech assessment. Turning off the microphone, leaving the tab, inactivity, leaving the story, or reaching the quiz stops capture. Restarting the microphone creates another playable part. Audio and the assessment are saved together when the quiz is submitted (or reading finishes for stories without a quiz). Failed saves retain audio in memory for retry; leaving/reloading the page discards unsaved audio.

Teachers can expand a learner in the Students page and choose **Listen to reading** under an attempt. The backend requires a valid teacher session, an active teacher account, and ownership of the learner's current section. Learner sessions and account-ID headers cannot retrieve audio. Recording data is excluded from normal result queries and served with `Cache-Control: no-store`. There is no learner player or public recording URL.

Limits: 8 MB of audio and 100 microphone sessions per attempt. Audio is stored as binary inside the result, below MongoDB's document limit. Old attempts have no audio. Only Story Mode is covered; flashcards are unchanged. Recordings currently remain with the result; automatic retention/deletion is not configured. Other existing API endpoints retain their existing authentication behavior.

Microphone capture requires HTTPS or localhost and a browser supporting MediaRecorder with WebM, MP4, or Ogg audio. The recorder waits for the final `dataavailable`/`stop` events before submission, as described in the [MediaRecorder documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop_event).

## Verification

Automated checks:

```
npm.cmd run build -- --configLoader native
node --test --test-isolation=none src/utils/*.test.js server/utils/recording.test.js
```

Manual browser check with a running database and Azure configuration:

1. Sign in as a learner, open a story, enable the microphone, read, stop and resume once, and finish the quiz.
2. Confirm no learner audio player appears. Try switching tabs during reading and confirm the microphone stops.
3. Sign in as that learner's teacher, expand the learner and play both recording parts alongside the scores.
4. Check a second teacher's session and a learner's session cannot fetch the recording endpoint.
5. Disconnect the backend during submission, reconnect, and retry saving without leaving the quiz.
