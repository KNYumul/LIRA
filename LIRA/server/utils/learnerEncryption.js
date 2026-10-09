const crypto = require("crypto");

const PREFIX = "enc:v1:";

function key() {
  const secret = process.env.LEARNER_DATA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("LEARNER_DATA_ENCRYPTION_KEY must be set to a secret of at least 32 characters.");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function encrypt(value) {
  if (value == null || value === "") return value;
  if (isEncrypted(value)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

function decrypt(value) {
  if (value == null || value === "" || !isEncrypted(value)) return value;
  const payload = Buffer.from(value.slice(PREFIX.length), "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Could not decrypt learner data. Check LEARNER_DATA_ENCRYPTION_KEY.");
  }
}

function lrnLookup(lrn) {
  return crypto.createHmac("sha256", key()).update(String(lrn).trim(), "utf8").digest("base64url");
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

module.exports = { decrypt, encrypt, isEncrypted, lrnLookup };
