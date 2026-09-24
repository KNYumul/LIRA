const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Learner = require('../models/Learner');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');
let mongo, server, base, teacher, section, original, second;
const details = { lastName: 'Santos', birthdate: '2015-01-01', section: 'Earth' };
async function request(path, body, method = 'POST') {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Teacher-Id': teacher.id }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Learner.init(), Teacher.init(), Section.init()]);
  teacher = await Teacher.create({ firstName: 'Test', lastName: 'Teacher', email: 'names@test.com', passwordHash: 'unused', active: true });
  section = await Section.create({ name: 'Earth', teacherId: teacher._id });
  const app = express();
  app.use(express.json());
  app.use('/learners', require('../routes/learner'));
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}/learners`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('ordinary students need no first name; collisions prompt without creating a record', async () => {
  const added = await request('', details);
  assert.equal(added.status, 201);
  original = added.data;
  assert.equal((await request('/login', details)).status, 200);
  const collision = await request('', { ...details, lastName: 'sANTOS' });
  assert.equal(collision.status, 409);
  assert.equal(collision.data.code, 'FIRST_NAMES_REQUIRED');
  assert.equal(collision.data.unnamedLearners[0].id, original._id);
  assert.equal(await Learner.countDocuments(), 1);
});
test('distinct first names preserve the existing learner ID and create a second learner', async () => {
  const added = await request('', { ...details, firstName: 'Maria', existingFirstNames: { [original._id]: 'Juan' } });
  assert.equal(added.status, 201);
  second = added.data;
  assert.equal((await Learner.findById(original._id)).firstName, 'Juan');
  assert.equal(added.data.firstName, 'Maria');
  const list = await fetch(base, { headers: { 'X-Teacher-Id': teacher.id } }).then(response => response.json());
  assert.equal(list.find(student => student._id === original._id).firstName, 'Juan');
});
test('ambiguous login requires a first name and selects the correct account', async () => {
  const ambiguous = await request('/login', details);
  assert.equal(ambiguous.status, 409);
  assert.equal(ambiguous.data.code, 'FIRST_NAME_REQUIRED');
  assert.equal(ambiguous.data.token, undefined);
  const juan = await request('/login', { ...details, firstName: 'JUAN' });
  const maria = await request('/login', { ...details, firstName: 'maria' });
  assert.equal(juan.data.learner.id, original._id);
  assert.equal(maria.data.learner.id, second._id);
  assert.equal((await request('/login', { ...details, firstName: 'Unknown' })).status, 401);
});
test('same full identity is rejected on create and edit; different section is allowed', async () => {
  assert.equal((await request('', { ...details, firstName: 'JUAN' })).status, 409);
  assert.equal((await request('/' + second._id, { ...details, firstName: 'juan' }, 'PUT')).status, 409);
  assert.equal((await request('', { ...details, section: 'Mars' })).status, 201);
  assert.equal((await request('', { ...details, birthdate: '2015-02-01' })).status, 201);
});
test('invalid or identical first names do not rename an existing learner', async () => {
  const other = { ...details, lastName: 'Cruz' };
  const added = await request('', other);
  for (const firstName of ['123', 'ANA']) {
    const result = await request('', { ...other, firstName, existingFirstNames: { [added.data._id]: 'Ana' } });
    assert.ok([400, 409].includes(result.status));
    assert.equal((await Learner.findById(added.data._id)).firstName, '');
  }
});
test('editing into a collision prompts and preserves the IDs of both learners', async () => {
  const one = await request('', { ...details, lastName: 'Reyes' });
  const two = await request('', { ...details, lastName: 'Garcia' });
  const edit = { ...details, lastName: 'Reyes' };
  const prompt = await request('/' + two.data._id, edit, 'PUT');
  assert.equal(prompt.data.code, 'FIRST_NAMES_REQUIRED');
  const saved = await request('/' + two.data._id, { ...edit, firstName: 'Ben', existingFirstNames: { [one.data._id]: 'Ana' } }, 'PUT');
  assert.equal(saved.status, 200);
  assert.equal(saved.data._id, two.data._id);
  assert.equal((await Learner.findById(one.data._id)).firstName, 'Ana');
  // Remove the second identity so the legacy-index fixture below can be installed.
  await Learner.deleteOne({ _id: two.data._id });
});
test('legacy index migration is idempotent and preserves the new uniqueness constraint', async () => {
  await Learner.deleteMany({ _id: second._id });
  await Learner.collection.createIndex({ sectionId: 1, lastName: 1, birthdate: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
  const migrate = require('../utils/learnerIndexes');
  await migrate();
  await migrate();
  await Learner.create({ ...details, sectionId: section._id, firstName: 'Maria' });
  await assert.rejects(Learner.create({ ...details, sectionId: section._id, firstName: 'MARIA' }), { code: 11000 });
});
