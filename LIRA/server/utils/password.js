const crypto = require("crypto");

const KEY_LENGTH = 64;

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(derivedKey);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await deriveKey(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedKey = await deriveKey(password, salt);
  const storedKey = Buffer.from(hash, "hex");

  return storedKey.length === derivedKey.length && crypto.timingSafeEqual(storedKey, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
