const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const router = require('../routes/auth');
const Session = mongoose.model('RecordingSession');
const handler = router.stack.find((layer) => layer.route?.path === '/session').route.stack[0].handle;

afterEach(() => mock.restoreAll());

async function request(role, token, storedRole = 'student', expired = false) {
  mock.method(Session, 'findOne', async (query) => {
    assert.ok(query.expiresAt.$gt instanceof Date);
    return !expired && query.role === storedRole ? { role: storedRole } : null;
  });
  const res = {
    statusCode: 200,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler({ query: { role }, get: () => token }, res);
  return res;
}

test('missing and malformed tokens are denied', async () => {
  for (const token of [undefined, 'Bearer invalid']) {
    assert.equal((await request('student', token)).statusCode, 401);
  }
});

test('changing the requested role does not grant teacher or admin access', async () => {
  for (const role of ['teacher', 'admin', 'unknown']) {
    assert.equal((await request(role, `Bearer ${'a'.repeat(64)}`)).statusCode, 401);
  }
});

test('expired sessions are denied', async () => {
  assert.equal((await request('student', `Bearer ${'a'.repeat(64)}`, 'student', true)).statusCode, 401);
});

test('valid sessions are accepted for each matching role', async () => {
  for (const role of ['student', 'teacher', 'admin']) {
    const res = await request(role, `Bearer ${'a'.repeat(64)}`, role);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { role });
  }
});
