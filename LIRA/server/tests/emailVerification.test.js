const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const express = require("express");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Teacher = require("../models/Teacher");
const { hashPassword } = require("../utils/password");
const { sendVerification, verifyEmail, digest, depedEmailAllowed } = require("../utils/emailVerification");

let mongo;
let server;
let base;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const app = express();
  app.use(express.json());
  app.use("/teachers", require("../routes/teacher"));
  app.use("/auth", require("../routes/auth"));
  server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}/teachers`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
beforeEach(async () => { await Teacher.deleteMany({}); });

const account = (fields = {}) => Teacher.create({ firstName: "Test", lastName: "Teacher", email: "teacher1@deped.gov.ph", passwordHash: "unused", activationPending: true, ...fields });
const post = async (path, body) => {
  const response = await fetch(`${base}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
};
function mailbox() {
  const messages = [];
  return { messages, deliver: async (message) => { messages.push(message); }, token: () => new URL(messages.at(-1).text.match(/https?:\/\/\S+/)[0]).searchParams.get("token") };
}

test("DepEd validation rejects lookalike domains and accepts numeric addresses", () => {
  assert.equal(depedEmailAllowed("teacher1@deped.gov.ph"), true);
  for (const value of ["teacher@gmail.com", "teacher@deped.gov.ph.evil.com", "teacher@evil-deped.gov.ph", "a b@deped.gov.ph", "a@b@deped.gov.ph"]) assert.equal(depedEmailAllowed(value), false);
});

test("email contains button and fallback; stores only digest; concurrent verification succeeds once", async () => {
  const teacher = await account();
  const box = mailbox();
  assert.equal((await sendVerification(teacher, box.deliver)).status, 200);
  const token = box.token();
  assert.match(box.messages[0].html, /Verify my email/);
  assert.match(box.messages[0].text, /24 hours/);
  const stored = await Teacher.findById(teacher._id).select("+verificationTokenHash +verificationExpiresAt");
  assert.equal(stored.verificationTokenHash, digest(token));
  assert.notEqual(stored.verificationTokenHash, token);
  assert.equal((await Teacher.findById(teacher._id)).verificationTokenHash, undefined);
  const results = await Promise.all([verifyEmail(token), verifyEmail(token)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const verified = await Teacher.findById(teacher._id).select("+verificationTokenHash");
  assert.equal(verified.emailVerified, true);
  assert.equal(verified.active, true);
  assert.equal(verified.activationPending, false);
  assert.ok(verified.emailVerifiedAt instanceof Date);
  assert.equal(verified.verificationTokenHash, undefined);
});

test("expired, malformed, and superseded links cannot verify", async () => {
  const teacher = await account();
  const box = mailbox();
  const now = new Date();
  await sendVerification(teacher, box.deliver, now);
  const old = box.token();
  assert.equal((await verifyEmail(old, new Date(+now + 86400000))).code, "LINK_EXPIRED");
  assert.equal((await verifyEmail({ $ne: null })).code, "INVALID_LINK");
  await sendVerification(teacher, box.deliver, new Date(+now + 60000));
  assert.equal((await verifyEmail(old)).code, "INVALID_LINK");
  assert.equal((await verifyEmail(box.token())).status, 200);
});

test("concurrent sends, cooldown, and hourly limits are enforced atomically", async () => {
  const teacher = await account();
  const box = mailbox();
  const now = new Date();
  const results = await Promise.all(Array.from({ length: 8 }, () => sendVerification(teacher, box.deliver, now)));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(box.messages.length, 1);
  for (let index = 1; index < 5; index++) assert.equal((await sendVerification(teacher, box.deliver, new Date(+now + index * 60000))).status, 200);
  assert.equal((await sendVerification(teacher, box.deliver, new Date(+now + 300000))).status, 429);
  assert.equal((await sendVerification(teacher, box.deliver, new Date(+now + 3600000))).status, 200);
});

test("delivery failure keeps account and invalidates failed token", async () => {
  const teacher = await account();
  const result = await sendVerification(teacher, async () => { throw new Error("SMTP failure"); });
  assert.equal(result.code, "EMAIL_DELIVERY_FAILED");
  const stored = await Teacher.findById(teacher._id).select("+verificationTokenHash");
  assert.equal(stored.emailVerified, false);
  assert.equal(stored.verificationTokenHash, undefined);
});

test("login refuses unverified accounts and allows them after verification", async () => {
  const teacher = await account({ passwordHash: await hashPassword("Password1!") });
  const credentials = { email: teacher.email, password: "Password1!" };
  assert.equal((await post("login", { ...credentials, password: "wrong" })).status, 401);
  const blocked = await post("login", credentials);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.code, "ACCOUNT_INACTIVE");
  assert.equal(blocked.data.canResend, true);
  assert.equal(blocked.data.token, undefined);
  const box = mailbox();
  await sendVerification(teacher, box.deliver);
  assert.equal((await post("verify-email", { token: box.token() })).status, 200);
  const loggedIn = await post("login", credentials);
  assert.equal(loggedIn.status, 200);
  assert.ok(loggedIn.data.token);
  assert.equal(loggedIn.data.teacher.emailVerified, true);
});

test("disabled accounts stay disabled; admin email changes reset verification", async () => {
  const teacher = await account();
  const box = mailbox();
  await sendVerification(teacher, box.deliver);
  await Teacher.updateOne({ _id: teacher._id }, { active: false, activationPending: false });
  assert.equal((await verifyEmail(box.token())).code, "ACCOUNT_INACTIVE");
  await Teacher.updateOne({ _id: teacher._id }, { active: true, emailVerified: true, emailVerifiedAt: new Date() });
  const response = await fetch(`${base}/${teacher._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: "Test", lastName: "Teacher", email: "changed@deped.gov.ph", active: true }) });
  assert.equal(response.status, 200);
  const changed = await Teacher.findById(teacher._id);
  assert.equal(changed.emailVerified, false);
  assert.equal(changed.emailVerifiedAt, null);
  assert.equal((await verifyEmail(box.token())).code, "INVALID_LINK");
});

test("signup rejects foreign domains and reports missing SMTP without losing account", async () => {
  const fields = { firstName: "Test", lastName: "Teacher", password: "Password1!" };
  assert.equal((await post("signup", { ...fields, email: "fake@gmail.com" })).status, 400);
  const oldHost = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  try {
    const signup = await post("signup", { ...fields, email: "new@deped.gov.ph" });
    assert.equal(signup.status, 201);
    assert.equal(signup.data.accountCreated, true);
    assert.equal(signup.data.emailSent, false);
    assert.equal(signup.data.code, "EMAIL_DELIVERY_FAILED");
    assert.equal(signup.data.teacher.emailVerified, false);
    assert.equal(signup.data.teacher.active, false);
  } finally { if (oldHost !== undefined) process.env.SMTP_HOST = oldHost; }
});

test("admin disable invalidates pending links even after re-enabling", async () => {
  const teacher = await account();
  const box = mailbox();
  await sendVerification(teacher, box.deliver);
  for (const active of [false, true]) {
    const response = await fetch(`${base}/${teacher._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email, active }) });
    assert.equal(response.status, 200);
  }
  assert.equal((await verifyEmail(box.token())).code, "INVALID_LINK");
});

test("existing active records can log in without email verification", async () => {
  const passwordHash = await hashPassword("Password1!");
  await Teacher.collection.insertOne({ firstName: "Legacy", lastName: "Teacher", email: "legacy@deped.gov.ph", passwordHash, active: true });
  const login = await post("login", { email: "legacy@deped.gov.ph", password: "Password1!" });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
});

test("signup and resend send branded emails and report cooldown through the API", async (context) => {
  const keys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) process.env[key] = "test-only";
  const sent = [];
  context.mock.method(require("nodemailer"), "createTransport", () => ({ sendMail: async (message) => { sent.push(message); return { accepted: [message.to] }; } }));
  try {
    const signup = await post("signup", { firstName: "Test", lastName: "Teacher", password: "Password1!", email: "delivery@deped.gov.ph" });
    assert.equal(signup.status, 201);
    assert.equal(signup.data.emailSent, true);
    assert.equal(signup.data.teacher.active, false);
    assert.equal(signup.data.message, "Check your email. Click the verification link to activate your account.");
    const immediateLogin = await post("login", { email: "delivery@deped.gov.ph", password: "Password1!" });
    assert.equal(immediateLogin.status, 403);
    assert.equal(immediateLogin.data.code, "ACCOUNT_INACTIVE");
    assert.match(immediateLogin.data.message, /admin must activate it/i);
    assert.equal(immediateLogin.data.token, undefined);
    assert.equal(signup.data.token, undefined);
    assert.equal(sent.length, 1);
    const blocked = await post("resend-verification", { email: "delivery@deped.gov.ph" });
    assert.equal(blocked.status, 429);
    assert.ok(blocked.data.retryAfterSeconds > 0);
    await Teacher.updateOne({ email: "delivery@deped.gov.ph" }, { verificationLastSentAt: new Date(Date.now() - 61000) });
    assert.equal((await post("resend-verification", { email: "delivery@deped.gov.ph" })).status, 200);
    assert.equal(sent.length, 2);
    assert.notEqual(sent[0].text, sent[1].text);
  } finally {
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});

test("Google login respects pending activation and allows admin-activated accounts", async (context) => {
  const keys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) process.env[key] = "test-only";
  const originalFetch = global.fetch;
  context.mock.method(global, "fetch", async (url, options) => {
    if (String(url).startsWith("https://oauth2.googleapis.com/")) return Response.json({ access_token: "test-token" });
    if (String(url).startsWith("https://openidconnect.googleapis.com/")) return Response.json({ email: "teacher1@deped.gov.ph", email_verified: true });
    return originalFetch(url, options);
  });
  const authBase = base.replace(/\/teachers$/, "/auth");
  const signIn = async () => {
    const start = await fetch(`${authBase}/google`, { redirect: "manual" });
    const state = new URL(start.headers.get("location")).searchParams.get("state");
    return fetch(`${authBase}/google/callback?code=test&state=${state}`, { redirect: "manual" });
  };
  try {
    const teacher = await account({ passwordHash: await hashPassword("Password1!") });
    const response = await signIn();
    assert.match(response.headers.get("location"), /google_auth_error=/);
    await Teacher.updateOne({ _id: teacher._id }, { active: true, activationPending: false });
    const activated = await signIn();
    assert.match(activated.headers.get("location"), /google_auth_code=/);
    await Teacher.updateOne({ _id: teacher._id }, { active: false });
    const disabled = await signIn();
    assert.match(disabled.headers.get("location"), /google_auth_error=/);
  } finally {
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});

test("admin activation allows password login without claiming email verification", async () => {
  const teacher = await account({ passwordHash: await hashPassword("Password1!") });
  const box = mailbox();
  await sendVerification(teacher, box.deliver);
  const response = await fetch(`${base}/${teacher._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email, active: true }) });
  assert.equal(response.status, 200);
  const updated = await Teacher.findById(teacher._id);
  assert.equal(updated.active, true);
  assert.equal(updated.activationPending, false);
  assert.equal(updated.emailVerified, false);
  assert.equal(updated.emailVerifiedAt, null);
  const login = await post("login", { email: teacher.email, password: "Password1!" });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
  assert.equal((await verifyEmail(box.token())).code, "INVALID_LINK");
});
