const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { parseRecording } = require('./recording');
const router = require('../routes/storyResult');
const Teacher = require('../models/Teacher');
const Learner = require('../models/Learner');
const Section = require('../models/Section');
const StoryResult = require('../models/StoryResult');
const Session = mongoose.model('RecordingSession');
const playback = router.stack.find((layer) => layer.route?.path === '/:id/recording/:segment').route.stack[0].handle;
const deleteRecording = router.stack.find((layer) => layer.route?.path === '/:id/recording' && layer.route.methods.delete).route.stack[0].handle;
const id = '123456789012345678901234';
afterEach(() => mock.restoreAll());

async function request({ token, role = 'teacher', owned = true, active = true, expired = false, segment = '0', handler = playback, resultId = id, missing = false } = {}) {
  mock.method(Session, 'findOne', async (query) => !expired && query.role === role ? { userId: id } : null);
  mock.method(Teacher, 'exists', async () => active);
  mock.method(Learner, 'findById', () => ({ select: async () => ({ sectionId: id }) }));
  mock.method(Section, 'exists', async (query) => owned && String(query.teacherId) === id);
  const result = { _id: id, learnerId: id, recordingSegmentCount: 1 };
  mock.method(StoryResult, 'findById', () => ({
    then: (resolve) => Promise.resolve(missing ? null : result).then(resolve),
    select: async () => ({ recording: [{ mimeType: 'audio/webm', data: Buffer.from('audio') }] }),
  }));
  const response = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; }, sendStatus(code) { this.statusCode = code; return this; } };
  await handler({ get: (key) => key === 'Authorization' ? token : id, params: { id: resultId, segment } }, response);
  return response;
}

test('recording validation preserves bytes and rejects invalid formats and sizes', () => {
  assert.equal(parseRecording([{ mimeType: 'audio/webm;codecs=opus', data: 'YXVkaW8=' }])[0].data.toString(), 'audio');
  assert.throws(() => parseRecording([{ mimeType: 'text/html', data: 'YQ==' }]));
  assert.throws(() => parseRecording([{ mimeType: 'audio/webm', data: '???=' }]));
  assert.throws(() => parseRecording(new Array(101).fill({})));
  assert.throws(() => parseRecording([{ mimeType: 'audio/webm', data: Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64') }]));
});
test('teacher ID alone never grants playback', async () => assert.equal((await request()).statusCode, 401));
test('learner session never grants playback', async () => assert.equal((await request({ token: `Bearer ${'a'.repeat(64)}`, role: 'student' })).statusCode, 401));
test('expired sessions are denied', async () => assert.equal((await request({ token: `Bearer ${'a'.repeat(64)}`, expired: true })).statusCode, 401));
test('inactive teachers are denied', async () => assert.equal((await request({ token: `Bearer ${'a'.repeat(64)}`, active: false })).statusCode, 401));
test('teachers cannot listen outside their sections', async () => assert.equal((await request({ token: `Bearer ${'a'.repeat(64)}`, owned: false })).statusCode, 403));
test('owning teacher receives private audio bytes', async () => {
  const response = await request({ token: `Bearer ${'a'.repeat(64)}` });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.toString(), 'audio');
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.headers['Content-Type'], 'audio/webm');
});
test('invalid recording segments are rejected', async () => assert.equal((await request({ token: `Bearer ${'a'.repeat(64)}`, segment: '-1' })).statusCode, 404));

test('owning teacher can remove audio without changing scores', async () => {
  const update = mock.method(StoryResult, 'updateOne', async () => ({ matchedCount: 1 }));
  const response = await request({ handler: deleteRecording, token: `Bearer ${'a'.repeat(64)}` });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments, [{ _id: id }, { $set: { recording: [], recordingSegmentCount: 0 } }]);
});

for (const [label, options, status] of [
  ['missing session', { token: undefined }, 401],
  ['student session', { role: 'student' }, 401],
  ['expired session', { expired: true }, 401],
  ['inactive teacher', { active: false }, 401],
  ['another section', { owned: false }, 403],
  ['invalid attempt ID', { resultId: 'invalid' }, 404],
  ['missing attempt', { missing: true }, 404],
]) {
  test(`recording deletion rejects ${label} without modifying data`, async () => {
    const update = mock.method(StoryResult, 'updateOne', async () => ({}));
    const response = await request({ handler: deleteRecording, token: `Bearer ${'a'.repeat(64)}`, ...options });
    assert.equal(response.statusCode, status);
    assert.equal(update.mock.callCount(), 0);
  });
}
