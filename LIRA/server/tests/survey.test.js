const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Learner = require('../models/Learner');
const Admin = require('../models/Admin');
const SurveyResponse = require('../models/SurveyResponse');
const { issueSession } = require('../utils/recordingSession');
let mongo, server, base, studentToken, adminToken, learner;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await SurveyResponse.init();
  learner = await Learner.create({ lastName: 'Student', birthdate: '2015-01-01', section: 'Earth' });
  const admin = await Admin.create({ firstName: 'Test', lastName: 'Admin', email: 'admin@example.com', passwordHash: 'unused' });
  studentToken = await issueSession(learner._id, 'student');
  adminToken = await issueSession(admin._id, 'admin');
  const app = express();
  app.use(express.json());
  app.use('/surveys', require('../routes/survey'));
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}/surveys`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
async function request(token, body) {
  const response = await fetch(base, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

test('survey results require an admin session and submissions require a student session', async () => {
  assert.equal((await request('')).status, 401);
  assert.equal((await request(studentToken)).status, 401);
  assert.equal((await request(adminToken, { answers: Array(10).fill(3) })).status, 401);
  assert.equal((await request('', { answers: Array(10).fill(3) })).status, 401);
  assert.deepEqual((await request(adminToken)).data, []);
});

test('rejects incomplete, fractional, out-of-range, and nonnumeric answers', async () => {
  for (const answers of [[], Array(9).fill(3), Array(11).fill(3), Array(10).fill(0), Array(10).fill(6), Array(10).fill(2.5), Array(10).fill('3')]) {
    assert.equal((await request(studentToken, { answers })).status, 400);
  }
  assert.equal(await SurveyResponse.countDocuments(), 0);
});

test('persists answers, derives learner identity, computes SUS, and avoids duplicate totals on retry', async () => {
  for (const [answers, score] of [[Array(10).fill(3), 50], [[5, 1, 5, 1, 5, 1, 5, 1, 5, 1], 100], [[1, 5, 1, 5, 1, 5, 1, 5, 1, 5], 0]]) {
    assert.equal((await request(studentToken, { answers, learnerId: new mongoose.Types.ObjectId() })).status, 200);
    const { status, data } = await request(adminToken);
    assert.equal(status, 200);
    assert.equal(data.length, 1);
    assert.equal(data[0].name, 'Student');
    assert.equal(data[0].section, 'Earth');
    assert.equal(data[0].score, score);
    assert.deepEqual(data[0].answers, answers);
    assert.ok(data[0].submittedAt);
    assert.equal(String((await SurveyResponse.findOne()).learnerId), String(learner._id));
  }
});
