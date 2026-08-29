const crypto = require("crypto");
const express = require("express");
const Teacher = require("../models/Teacher");
const Section = require("../models/Section");
const { hashPassword } = require("../utils/password");

const router = express.Router();
const oauthStates = new Map();
const loginSessions = new Map();
const TEN_MINUTES = 10 * 60 * 1000;

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function callbackUrl() {
  return process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";
}

function clientUrl() {
  return (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
}

function googleEmailAllowed(email) {
  if (email.endsWith("@deped.gov.ph")) return true;
  const testEmails = String(process.env.GOOGLE_TEST_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return testEmails.includes(email);
}

function randomCode() {
  return crypto.randomBytes(32).toString("hex");
}

function takeFresh(map, key) {
  const entry = map.get(key);
  map.delete(key);
  return entry && entry.expiresAt > Date.now() ? entry : null;
}

function redirectError(res, message) {
  return res.redirect(`${clientUrl()}/login?google_auth_error=${encodeURIComponent(message)}`);
}

router.get("/google", (req, res) => {
  if (!configured()) return res.status(503).json({ message: "Google teacher login is not configured on the server." });
  if (req.query.role && req.query.role !== "teacher") return res.status(400).json({ message: "Google login is currently available for teachers only." });

  const state = randomCode();
  oauthStates.set(state, { expiresAt: Date.now() + TEN_MINUTES });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    hd: "deped.gov.ph"
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req, res) => {
  try {
    if (req.query.error) return redirectError(res, "Google sign-in was cancelled or denied.");
    if (!req.query.code || !req.query.state || !takeFresh(oauthStates, req.query.state)) {
      return redirectError(res, "The Google sign-in request expired. Please try again.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(),
        grant_type: "authorization_code"
      })
    });
    if (!tokenResponse.ok) return redirectError(res, "Google could not verify this sign-in request.");
    const tokens = await tokenResponse.json();

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!profileResponse.ok) return redirectError(res, "Google profile information could not be loaded.");
    const profile = await profileResponse.json();
    const email = String(profile.email || "").trim().toLowerCase();
    if (!profile.email_verified || !googleEmailAllowed(email)) {
      return redirectError(res, "This Google account is not authorized for the Teacher Portal.");
    }

    let teacher = await Teacher.findOne({ email });
    if (!teacher) {
      const fallbackName = email.split("@")[0];
      teacher = await Teacher.create({
        firstName: profile.given_name || profile.name || fallbackName,
        lastName: profile.family_name || "Teacher",
        email,
        passwordHash: await hashPassword(randomCode())
      });
    } else {
      if (!teacher.active) return redirectError(res, "This teacher account is inactive. Please contact the administrator.");
    }

    const sections = await Section.find({ teacherId: teacher._id }).distinct("name");
    const sessionCode = randomCode();
    loginSessions.set(sessionCode, {
      expiresAt: Date.now() + TEN_MINUTES,
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        section: teacher.section,
        sections,
        active: teacher.active,
        createdAt: teacher.createdAt,
        role: "teacher"
      }
    });
    res.redirect(`${clientUrl()}/login?google_auth_code=${encodeURIComponent(sessionCode)}`);
  } catch (error) {
    console.error("Google teacher authentication failed:", error);
    redirectError(res, "Google sign-in could not be completed. Please try again.");
  }
});

router.get("/google/session", (req, res) => {
  const session = takeFresh(loginSessions, String(req.query.code || ""));
  if (!session) return res.status(400).json({ message: "The Google login session expired or was already used." });
  res.json({ message: "Google login successful.", teacher: session.teacher });
});

module.exports = router;
