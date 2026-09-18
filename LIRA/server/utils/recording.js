const MAX_RECORDING_BYTES = 8 * 1024 * 1024;
function parseRecording(segments) {
  if (segments == null) return [];
  if (!Array.isArray(segments) || segments.length > 100) throw new Error('Invalid recording segments.');
  let bytes = 0;
  return segments.map((segment) => {
    if (!segment || !/^audio\/(webm|ogg|mp4)(;codecs=[a-zA-Z0-9., -]+)?$/.test(segment.mimeType)
      || typeof segment.data !== 'string' || !segment.data.length
      || segment.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(segment.data)) {
      throw new Error('Invalid audio recording.');
    }
    bytes += segment.data.length * 3 / 4 - (segment.data.endsWith('==') ? 2 : segment.data.endsWith('=') ? 1 : 0);
    if (bytes > MAX_RECORDING_BYTES) throw new Error('Recording exceeds the 8 MB limit.');
    return { mimeType: segment.mimeType, data: Buffer.from(segment.data, 'base64') };
  });
}
module.exports = { parseRecording };
