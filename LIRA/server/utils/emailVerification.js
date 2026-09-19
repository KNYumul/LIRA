const crypto = require("crypto");
const Teacher = require("../models/Teacher");

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const normalizeEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";
const depedEmailAllowed = (email) => /^[a-z0-9._%+-]+@deped\.gov\.ph$/.test(email) && email.length <= 254;
const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function verificationMessage(email, token) {
  const origin = new URL(process.env.CLIENT_URL || "http://localhost:5173");
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") throw new Error("HTTPS_CLIENT_URL_REQUIRED");
  const url = new URL("/verify-email", origin);
  url.searchParams.set("token", token);
  const link = url.toString();
  const safeLink = escapeHtml(link);
  return {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your email for LIRA",
    text: `Welcome to LIRA!\n\nClick this link to verify your email and activate your account:\n${link}\n\nThis link expires in 24 hours and can only be used once. If you did not sign up, ignore this email. For help, contact your school IT support.`,
    html: `<div style="background:#f5f3ff;padding:32px;font-family:Arial,sans-serif;color:#242039"><div style="max-width:560px;margin:auto;background:white;padding:32px;border-radius:16px"><h1 style="color:#6d28d9">LIRA</h1><h2>Welcome to LIRA!</h2><p>Verify your email to activate your teacher account.</p><p style="margin:32px 0"><a href="${safeLink}" style="background:#6d28d9;color:white;padding:14px 24px;border-radius:8px;text-decoration:none">Verify my email</a></p><p>This link expires in 24 hours and can only be used once.</p><p>If the button does not work, click this link:</p><p style="word-break:break-all"><a href="${safeLink}">${safeLink}</a></p><p>If you did not sign up, ignore this email. For help, contact your school IT support.</p></div></div>`,
  };
}

async function deliverEmail(message) {
  if (!["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].every((key) => process.env[key])) throw new Error("SMTP_NOT_CONFIGURED");
  const transport = require("nodemailer").createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const result = await transport.sendMail(message);
  if (!result.accepted?.length) throw new Error("EMAIL_REJECTED");
}

async function sendVerification(teacher, deliver = deliverEmail, now = new Date()) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  // Atomic reservation prevents simultaneous resends from bypassing the limits.
  const reserved = await Teacher.findOneAndUpdate({
    _id: teacher._id, email: teacher.email, active: false, activationPending: true,
    $and: [
      { $or: [{ verificationLastSentAt: { $exists: false } }, { verificationLastSentAt: { $lte: new Date(+now - COOLDOWN) } }] },
      { $or: [{ verificationWindowStart: { $exists: false } }, { verificationWindowStart: { $lte: new Date(+now - HOUR) } }, { verificationSendCount: { $lt: 5 } }] },
    ],
  }, [{ $set: {
    verificationTokenHash: tokenHash,
    verificationExpiresAt: new Date(+now + DAY),
    verificationLastSentAt: now,
    verificationWindowStart: { $cond: [{ $gt: ["$verificationWindowStart", new Date(+now - HOUR)] }, "$verificationWindowStart", now] },
    verificationSendCount: { $cond: [{ $gt: ["$verificationWindowStart", new Date(+now - HOUR)] }, { $add: [{ $ifNull: ["$verificationSendCount", 0] }, 1] }, 1] },
  } }], { new: true, updatePipeline: true });
  if (!reserved) {
    const current = await Teacher.findById(teacher._id).select("+verificationLastSentAt +verificationWindowStart +verificationSendCount");
    const cooldownEnd = current?.verificationLastSentAt ? +current.verificationLastSentAt + COOLDOWN : +now;
    const windowEnd = current?.verificationSendCount >= 5 && current.verificationWindowStart ? +current.verificationWindowStart + HOUR : +now;
    const retryAfterSeconds = Math.max(1, Math.ceil((Math.max(cooldownEnd, windowEnd) - now) / 1000));
    return { status: 429, code: "VERIFICATION_LIMIT", retryAfterSeconds, message: "Please wait at least 60 seconds between requests. You can request up to 5 emails per hour." };
  }
  try {
    await deliver(verificationMessage(teacher.email, token));
    return { status: 200, message: "Check your email. Click the verification link to activate your account." };
  } catch {
    await Teacher.updateOne({ _id: teacher._id, verificationTokenHash: tokenHash }, { $unset: { verificationTokenHash: 1, verificationExpiresAt: 1 } });
    return { status: 503, code: "EMAIL_DELIVERY_FAILED", message: "Your account is saved, but we could not send the verification email. Please try resending in 60 seconds or contact IT support." };
  }
}

async function verifyEmail(token, now = new Date()) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return { status: 400, code: "INVALID_LINK", message: "This verification link is invalid. Please request a new email." };
  const tokenHash = digest(token);
  const teacher = await Teacher.findOneAndUpdate({ verificationTokenHash: tokenHash, verificationExpiresAt: { $gt: now }, activationPending: true, active: false }, {
    $set: { active: true, activationPending: false, emailVerified: true, emailVerifiedAt: now, verificationUsedTokenHash: tokenHash },
    $unset: { verificationTokenHash: 1, verificationExpiresAt: 1 },
  }, { new: true });
  if (teacher) return { status: 200, code: "VERIFIED", message: "Your email is verified. You can now log in to LIRA." };
  const existing = await Teacher.findOne({ $or: [{ verificationTokenHash: tokenHash }, { verificationUsedTokenHash: tokenHash }] }).select("+verificationExpiresAt +verificationUsedTokenHash");
  if (existing && !existing.active && !existing.activationPending) return { status: 403, code: "ACCOUNT_INACTIVE", message: "Your account is not active. Please contact IT support." };
  if (existing?.verificationUsedTokenHash === tokenHash) return { status: 409, code: "LINK_USED", message: "This link has already been used. Please log in if your email is verified, or request a new link." };
  if (existing?.verificationExpiresAt <= now) return { status: 410, code: "LINK_EXPIRED", message: "This verification link has expired. Please request a new email." };
  return { status: 400, code: "INVALID_LINK", message: "This link is invalid or was replaced. Please use the latest verification email." };
}

module.exports = { normalizeEmail, depedEmailAllowed, digest, verificationMessage, sendVerification, verifyEmail };
