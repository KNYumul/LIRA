const crypto = require('crypto');
const mongoose = require('mongoose');

const Session = mongoose.model('RecordingSession', new mongoose.Schema({
  tokenHash: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ['teacher', 'student', 'admin'], required: true },
  expiresAt: { type: Date, expires: 0, required: true },
}));
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function issueSession(userId, role) {
  const token = crypto.randomBytes(32).toString('hex');
  const values = { tokenHash: digest(token), userId, role, expiresAt: new Date(Date.now() + 86400000) };
  if (role === 'student') {
    // A stable document ID makes replacement atomic, including concurrent logins.
    await Session.updateOne({ _id: userId }, { $set: values }, { upsert: true });
  } else {
    await Session.create(values);
  }
  return token;
}

async function recordingSession(req, role) {
  const token = (req.get('Authorization') || '').replace(/^Bearer /, '');
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return Session.findOne({
    tokenHash: digest(token), role, expiresAt: { $gt: new Date() },
    // Reject legacy student sessions as well as superseded tokens.
    ...(role === 'student' ? { $expr: { $eq: ['$_id', '$userId'] } } : {}),
  });
}

module.exports = { issueSession, recordingSession };
