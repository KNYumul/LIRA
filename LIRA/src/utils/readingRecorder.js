// Each microphone session is a separate playable file; container files cannot
// safely be concatenated after stopping and restarting MediaRecorder.
export class ReadingRecorder {
  pending = [];
  active = null;
  bytes = 0;
  error = null;

  start(stream, onError) {
    if (this.error) throw this.error;
    if (this.pending.length >= 100) throw new Error('Too many microphone restarts. Please start this story again.');
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
      .find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('This browser cannot record your reading. Please use a supported browser.');
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
    const chunks = [];
    const entry = { recorder, stream };
    this.active = entry;
    const fail = (message) => {
      this.error = new Error(message);
      this.stop();
      onError(message);
    };
    this.pending.push(new Promise((resolve) => {
      recorder.ondataavailable = ({ data }) => {
        this.bytes += data.size;
        if (this.bytes > 8 * 1024 * 1024) {
          fail('The recording reached its size limit. Please restart the story with a shorter reading.');
        } else if (data.size) chunks.push(data);
      };
      recorder.onerror = () => fail('Audio recording failed. Please start this story again.');
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (this.active === entry) this.active = null;
        resolve(new Blob(chunks, { type: recorder.mimeType }));
      };
    }));
    try {
      recorder.start(1000);
    } catch (error) {
      this.pending.pop();
      this.active = null;
      stream.getTracks().forEach((track) => track.stop());
      throw error;
    }
  }

  stop() {
    const entry = this.active;
    this.active = null;
    if (!entry) return;
    if (entry.recorder.state !== 'inactive') entry.recorder.stop();
    entry.stream.getTracks().forEach((track) => track.stop());
  }

  async serialize() {
    this.stop();
    const blobs = await Promise.all(this.pending);
    if (this.error) throw this.error;
    return Promise.all(blobs.filter((blob) => blob.size).map((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not prepare the recording. Please retry saving.'));
      reader.onload = () => resolve({ mimeType: blob.type, data: reader.result.split(',')[1] });
      reader.readAsDataURL(blob);
    })));
  }
}
