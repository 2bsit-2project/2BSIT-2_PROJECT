const { promisify } = require('node:util');
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
  const [algorithm, saltHex, keyHex, extra] = String(storedPassword).split('$');

  if (algorithm !== 'scrypt' || !saltHex || !keyHex || extra !== undefined) {
    const candidate = Buffer.from(password);
    const stored = Buffer.from(String(storedPassword));
    const matches = candidate.length === stored.length && timingSafeEqual(candidate, stored);
    return { matches, needsRehash: matches };
  }

  if (!/^[\da-f]+$/i.test(saltHex) || !/^[\da-f]+$/i.test(keyHex)) {
    return { matches: false, needsRehash: false };
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');
  if (salt.length !== 16 || expectedKey.length !== KEY_LENGTH) {
    return { matches: false, needsRehash: false };
  }

  const actualKey = await scrypt(password, salt, expectedKey.length);
  return {
    matches: timingSafeEqual(actualKey, expectedKey),
    needsRehash: false
  };
}

module.exports = { hashPassword, verifyPassword };
