const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Learner = require('../models/Learner');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');

let mongo, server, base, teacher;
const details = { lrn: '123456789012', lastName: 'Santos', section: 'Earth' };

async function request(path, body, method = 'POST') {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Teacher-Id': teacher.id },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Learner.init(), Teacher.init(), Section.init()]);
  await Learner.collection.createIndex(
    { lrnLookup: 1 },
    { unique: true, partialFilterExpression: { dataEncryptionVersion: 1 } }
  );
  teacher = await Teacher.create({ firstName: 'Test', lastName: 'Teacher', email: 'names@test.com', passwordHash: 'unused', active: true });
  await Section.create({ name: 'Earth', teacherId: teacher._id });
  const app = express();
  app.use(express.json());
  app.use('/learners', require('../routes/learner'));
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = `http://127.0.0.1:${server.address().port}/learners`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('LRN uniquely identifies a learner and surname authentication ignores case', async () => {
  assert.equal((await request('', details)).status, 201);
  assert.equal((await request('/login', { lrn: details.lrn, password: 'sAnToS' })).status, 200);
  assert.equal((await request('/login', { lrn: details.lrn, password: 'Wrong' })).status, 401);
  assert.equal((await request('', { ...details, lastName: 'Cruz' })).status, 409);
});

test('legacy plaintext roster records can still log in', async () => {
  await Learner.collection.insertOne({
    lrn: '123456789015',
    lastName: 'Legacy',
    section: 'Earth',
    deletedAt: null,
  });

  assert.equal((await request('/login', { lrn: '123456789015', password: 'lEgAcY' })).status, 200);
});

test('encrypted roster records with a lookup remain sign-in capable without a migration version', async () => {
  const learner = await Learner.create({
    lrn: '123456789016',
    lastName: 'Migrated',
    section: 'Earth',
  });
  await Learner.collection.updateOne({ _id: learner._id }, { $unset: { dataEncryptionVersion: '' } });

  assert.equal((await request('/login', { lrn: '123456789016', password: 'mIgRaTeD' })).status, 200);
});

test('learner management requires a 12-digit LRN and surname', async () => {
  assert.equal((await request('', { lastName: 'Cruz', section: 'Earth' })).status, 400);
  const added = await request('', { lrn: '123456789013', lastName: 'Cruz', section: 'Earth' });
  assert.equal(added.status, 201);
  const edited = await request('/' + added.data._id, { lrn: '123456789014', lastName: 'Reyes', section: 'Earth' }, 'PUT');
  assert.equal(edited.status, 200);
  assert.equal(edited.data.lrn, '123456789014');
});
