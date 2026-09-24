const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { issueSession, recordingSession } = require('../utils/recordingSession');
const Session = mongoose.model('RecordingSession');
let mongo;
const verify = (token, role = 'student') => recordingSession({ get: () => `Bearer ${token}` }, role);

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Session.init();
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('new student login revokes the previous token without affecting another student', async () => {
  const student = new mongoose.Types.ObjectId();
  const first = await issueSession(student, 'student');
  const other = await issueSession(new mongoose.Types.ObjectId(), 'student');
  assert.ok(await verify(first));
  const second = await issueSession(student, 'student');
  assert.equal(await verify(first), null);
  assert.ok(await verify(second));
  assert.ok(await verify(other));
});

test('simultaneous student logins leave exactly one valid session', async () => {
  const student = new mongoose.Types.ObjectId();
  const tokens = await Promise.all(Array.from({ length: 8 }, () => issueSession(student, 'student')));
  const sessions = await Promise.all(tokens.map(token => verify(token)));
  assert.equal(sessions.filter(Boolean).length, 1);
  assert.equal(await Session.countDocuments({ userId: student }), 1);
});

test('legacy student sessions cannot bypass single-session enforcement', async () => {
  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({ tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    userId: new mongoose.Types.ObjectId(), role: 'student', expiresAt: new Date(Date.now() + 60000) });
  assert.equal(await verify(token), null);
});

test('teacher and admin logins retain multiple sessions', async () => {
  for (const role of ['teacher', 'admin']) {
    const user = new mongoose.Types.ObjectId();
    const first = await issueSession(user, role);
    const second = await issueSession(user, role);
    assert.ok(await verify(first, role));
    assert.ok(await verify(second, role));
  }
});

test('two browser logins through HTTP revoke the first browser session', async () => {
  const Learner = require('../models/Learner');
  const credentials = { lastName: 'BrowserTest', birthdate: '2015-01-01', section: 'Session Test' };
  await Learner.create(credentials);
  const app = express();
  app.use(express.json());
  app.use('/api/learners', require('../routes/learner'));
  app.use('/api/auth', require('../routes/auth'));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async () => {
    const response = await fetch(`${base}/api/learners/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials),
    });
    assert.equal(response.status, 200);
    return (await response.json()).token;
  };
  const status = async token => (await fetch(`${base}/api/auth/session?role=student`, {
    headers: { Authorization: `Bearer ${token}` },
  })).status;
  try {
    const normalBrowser = await login();
    assert.equal(await status(normalBrowser), 200);
    const incognitoBrowser = await login();
    assert.equal(await status(normalBrowser), 401);
    assert.equal(await status(incognitoBrowser), 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
