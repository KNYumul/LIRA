const crypto = require("crypto");
const Teacher = require("../models/Teacher");
const { hashPassword } = require("./password");
const { normalizeEmail, digest, deliverEmail } = require("./emailVerification");

const accepted = { status: 200, message: "A password reset link has been sent." };
const invalid = { status: 400, message: "This password reset link is invalid, expired, or already used. Please request a new link." };

async function requestReset(email, deliver = deliverEmail, now = new Date()) {
  email = normalizeEmail(email);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: 400, message: "Enter a valid email address." };
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  const teacher = await Teacher.findOneAndUpdate({ email, active: true,
    $or: [{ resetLastSentAt: { $exists: false } }, { resetLastSentAt: { $lte: new Date(+now - 60000) } }],
  }, { $set: { resetTokenHash: tokenHash, resetExpiresAt: new Date(+now + 1800000), resetLastSentAt: now } });
  if (!teacher) {
    const existing = await Teacher.findOne({ email }).select("active");
    if (!existing) return { status: 404, message: "Account does not exist." };
    if (!existing.active) return { status: 403, message: "Your account is inactive. Please contact IT support." };
    return { status: 429, message: "Please wait 60 seconds before requesting another reset email." };
  }
  try {
    const url = new URL("/reset-password", process.env.CLIENT_URL || "http://localhost:5173");
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("HTTPS_CLIENT_URL_REQUIRED");
    // Fragments are not sent to the web server or included in HTTP referrers.
    url.hash = new URLSearchParams({ token }).toString();
    const link = url.toString();
    await deliver({ from: process.env.SMTP_FROM, to: email, subject: "Reset your LIRA password",
      text: `Change your password: ${link}\n\nThis link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;padding:32px"><h1>LIRA</h1><h2>Reset your password</h2><p><a href="${link}" style="display:inline-block;background:#6d28d9;color:white;padding:14px 24px;border-radius:8px;text-decoration:none">Change password</a></p><p>This link expires in 30 minutes and can only be used once.</p><p>If the button does not work, copy this link: ${link}</p><p>If you did not request this, ignore this email.</p></div>`,
    });
  } catch {
    await Teacher.updateOne({ _id: teacher._id, resetTokenHash: tokenHash }, { $unset: { resetTokenHash: 1, resetExpiresAt: 1 } });
    console.error("Password reset email delivery failed. Check SMTP and CLIENT_URL configuration.");
    return { status: 503, message: "We could not send the reset email. Please try again in 60 seconds." };
  }
  return accepted;
}

async function resetPassword(token, password, now = new Date()) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return invalid;
  if (typeof password !== "string" || !/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,50}$/.test(password)) {
    return { status: 400, message: "Password must be 8-50 characters with an uppercase letter, a number, and a special character." };
  }
  const filter = { resetTokenHash: digest(token), resetExpiresAt: { $gt: now }, active: true };
  if (!await Teacher.exists(filter)) return invalid;
  const passwordHash = await hashPassword(password);
  const teacher = await Teacher.findOneAndUpdate(filter, {
    $set: { passwordHash }, $unset: { resetTokenHash: 1, resetExpiresAt: 1 },
  });
  return teacher ? { status: 200, message: "Password updated. You can now log in with your new password." } : invalid;
}

module.exports = { requestReset, resetPassword };
