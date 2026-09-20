const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Teacher = require("../models/Teacher");
const { requestReset, resetPassword } = require("../utils/passwordReset");
const { hashPassword, verifyPassword } = require("../utils/password");
const { digest } = require("../utils/emailVerification");
let mongo;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => { await Teacher.deleteMany({}); });
async function account(active = true) {
  return Teacher.create({ firstName: "Reset", lastName: "Test", email: "reset@deped.gov.ph", active, passwordHash: await hashPassword("OldPassword1!") });
}
function mailbox() {
  const messages = [];
  return { messages, deliver: async (message) => messages.push(message), token: () => new URLSearchParams(new URL(messages.at(-1).text.match(/https?:\/\/\S+/)[0]).hash.slice(1)).get("token") };
}
test("email button leads to reset screen; only token digest stored; concurrent reset succeeds once", async () => {
  const user = await account();
  const box = mailbox();
  assert.equal((await requestReset(" RESET@DEPED.GOV.PH ", box.deliver)).status, 200);
  assert.match(box.messages[0].html, /Change password/);
  assert.match(box.messages[0].text, /reset-password/);
  const token = box.token();
  const stored = await Teacher.findById(user._id).select("+resetTokenHash");
  assert.equal(stored.resetTokenHash, digest(token));
  assert.equal((await Teacher.findById(user._id)).resetTokenHash, undefined);
  const results = await Promise.all([resetPassword(token, "NewPassword1!"), resetPassword(token, "NewPassword1!")]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
  const updated = await Teacher.findById(user._id).select("+passwordHash +resetTokenHash");
  assert.equal(await verifyPassword("NewPassword1!", updated.passwordHash), true);
  assert.equal(await verifyPassword("OldPassword1!", updated.passwordHash), false);
  assert.equal(updated.resetTokenHash, undefined);
});
test("expired, replaced, malformed tokens and weak passwords cannot reset", async () => {
  await account();
  const box = mailbox();
  const now = new Date();
  await requestReset("reset@deped.gov.ph", box.deliver, now);
  const old = box.token();
  assert.equal((await resetPassword(old, "NewPassword1!", new Date(+now + 1800000))).status, 400);
  assert.equal((await resetPassword({ $ne: null }, "NewPassword1!")).status, 400);
  assert.equal((await resetPassword(old, "weak")).status, 400);
  await requestReset("reset@deped.gov.ph", box.deliver, new Date(+now + 60000));
  assert.equal((await resetPassword(old, "NewPassword1!")).status, 400);
  assert.equal((await resetPassword(box.token(), "NewPassword1!")).status, 200);
});
test("concurrent requests send once and report unknown, inactive, and throttled accounts", async () => {
  await account();
  const box = mailbox();
  const results = await Promise.all(Array.from({ length: 6 }, () => requestReset("reset@deped.gov.ph", box.deliver)));
  assert.equal(box.messages.length, 1);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 429).length, 5);
  assert.equal(results.find((result) => result.status === 200).message, "A password reset link has been sent.");
  assert.deepEqual(await requestReset("unknown@deped.gov.ph", box.deliver), { status: 404, message: "Account does not exist." });
  await Teacher.updateMany({}, { $set: { active: false } });
  assert.equal((await requestReset("reset@deped.gov.ph", box.deliver)).status, 403);
  assert.equal((await resetPassword(box.token(), "NewPassword1!")).status, 400);
  assert.equal(box.messages.length, 1);
});
test("failed email delivery removes the unusable token and reports failure", async () => {
  const user = await account();
  const result = await requestReset(user.email, async () => { throw new Error("SMTP unavailable"); });
  assert.equal(result.status, 503);
  assert.equal((await Teacher.findById(user._id).select("+resetTokenHash")).resetTokenHash, undefined);
});
