import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ReadingRecorder } from './readingRecorder.js';

const originalRecorder = globalThis.MediaRecorder;
const originalReader = globalThis.FileReader;
afterEach(() => {
  globalThis.MediaRecorder = originalRecorder;
  globalThis.FileReader = originalReader;
});

function setup() {
  globalThis.MediaRecorder = class {
    static isTypeSupported() { return true; }
    constructor(stream, options) { this.mimeType = options.mimeType; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      setTimeout(() => {
        this.ondataavailable({ data: new Blob(['final audio']) });
        this.onstop();
      }, 1);
    }
  };
  globalThis.FileReader = class {
    async readAsDataURL(blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      this.result = `data:${blob.type};base64,${btoa(String.fromCharCode(...bytes))}`;
      this.onload();
    }
  };
  const stop = mock.fn();
  return { stream: { getTracks: () => [{ stop }] }, stop };
}

test('submission waits for final audio and releases microphone', async () => {
  const { stream, stop } = setup();
  const recorder = new ReadingRecorder();
  recorder.start(stream, assert.fail);
  const result = await recorder.serialize();
  assert.equal(atob(result[0].data), 'final audio');
  assert.ok(stop.mock.callCount() > 0);
});

test('pause and resume keeps independently playable segments in order', async () => {
  const { stream } = setup();
  const recorder = new ReadingRecorder();
  recorder.start(stream, assert.fail);
  recorder.stop();
  recorder.start(stream, assert.fail);
  assert.equal((await recorder.serialize()).length, 2);
  assert.equal((await recorder.serialize()).length, 2);
});

test('failed start does not leave submission waiting forever', async () => {
  const { stream, stop } = setup();
  globalThis.MediaRecorder.prototype.start = () => { throw new Error('cannot start'); };
  const recorder = new ReadingRecorder();
  assert.throws(() => recorder.start(stream, assert.fail));
  assert.deepEqual(await recorder.serialize(), []);
  assert.ok(stop.mock.callCount() > 0);
});
