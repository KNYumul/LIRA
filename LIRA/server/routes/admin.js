const express = require("express");
const Admin = require("../models/Admin");
const { hashPassword, verifyPassword } = require("../utils/password");
const { loginKey, cooldownStatus, failedLogin, clearFailedLogins, sendCooldown } = require("../utils/loginCooldown");

const router = express.Router();

function publicAdmin(admin) {
  return { id: admin._id, firstName: admin.firstName, lastName: admin.lastName, email: admin.email, role: "admin" };
}

// Create an initial admin only with the secret stored in server/.env.
router.post("/bootstrap", async (req, res) => {
  try {
    if (!process.env.ADMIN_SETUP_KEY || req.get("x-admin-setup-key") !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ message: "Admin setup is not authorized." });
    }
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters." });

    const normalizedEmail = email.trim().toLowerCase();
    if (await Admin.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An admin account already uses this email." });

    const admin = await Admin.create({ firstName, lastName, email: normalizedEmail, passwordHash: await hashPassword(password) });
    res.status(201).json({ message: "Admin account created.", admin: publicAdmin(admin) });
  } catch (error) {
    console.error("Admin setup failed:", error);
    res.status(500).json({ message: "Could not create the admin account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const key = loginKey(req, "admin");
    const status = cooldownStatus(key);
    if (status.locked) return sendCooldown(res, status.retryAfterSeconds);

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
    if (!admin || !admin.active || !(await verifyPassword(password, admin.passwordHash))) {
      const failure = failedLogin(key);
      if (failure.locked) return sendCooldown(res, failure.retryAfterSeconds);
      return res.status(401).json({ message: `Invalid email or password. ${failure.remainingAttempts} attempt${failure.remainingAttempts === 1 ? "" : "s"} remaining.` });
    }
    clearFailedLogins(key);
    res.json({ message: "Login successful.", admin: publicAdmin(admin) });
  } catch (error) {
    console.error("Admin login failed:", error);
    res.status(500).json({ message: "Could not log in." });
  }
});

module.exports = router;
