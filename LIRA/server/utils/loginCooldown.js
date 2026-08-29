const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_MS = 5 * 60 * 1000;

const attempts = new Map();

function loginKey(req, accountType) {
  // Lock the login portal for this client, even if it switches to another account.
  return `${accountType}:${req.ip}`;
}

function cooldownStatus(key) {
  const entry = attempts.get(key);
  if (!entry) return { locked: false };

  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000)
    };
  }

  if (entry.lockedUntil) attempts.delete(key);
  return { locked: false };
}

function failedLogin(key) {
  const previous = attempts.get(key);
  const failedAttempts = (previous?.failedAttempts || 0) + 1;

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = Date.now() + COOLDOWN_MS;
    attempts.set(key, { failedAttempts, lockedUntil });
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(COOLDOWN_MS / 1000)
    };
  }

  attempts.set(key, { failedAttempts, lockedUntil: null });
  return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts };
}

function clearFailedLogins(key) {
  attempts.delete(key);
}

function sendCooldown(res, retryAfterSeconds) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    message: `Too many incorrect login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    retryAfterSeconds
  });
}

module.exports = {
  loginKey,
  cooldownStatus,
  failedLogin,
  clearFailedLogins,
  sendCooldown
};
