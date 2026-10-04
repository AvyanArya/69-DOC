'use strict';
// Password hashing, session tokens and at-rest encryption. All node:crypto.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// ---- passwords: scrypt, stored as scrypt$N$r$p$salt$hash ----
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length,
    { N: Number(N), r: Number(r), p: Number(p) });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// A hash to compare against when the email is unknown, so a login for a
// missing account takes as long as one for a real account.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

// ---- session tokens: the cookie carries the token, the DB its sha256 ----
const newToken = () => crypto.randomBytes(32).toString('base64url');
const tokenId = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// ---- at-rest encryption for user state: AES-256-GCM ----
// Layout: [version=1][iv 12][tag 16][ciphertext]
function loadKey({ DATA_ENCRYPTION_KEY, DATA_DIR, isProd }, log = console) {
  const parse = (raw) => {
    const s = String(raw).trim();
    const buf = /^[0-9a-f]{64}$/i.test(s) ? Buffer.from(s, 'hex') : Buffer.from(s, 'base64');
    if (buf.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, as 64 hex characters or base64.');
    return buf;
  };
  if (DATA_ENCRYPTION_KEY) return parse(DATA_ENCRYPTION_KEY);
  if (isProd) throw new Error('DATA_ENCRYPTION_KEY is required in production. See BACKEND.md.');
  // Development only: keep a generated key beside the database so data
  // survives restarts. Never use this in production.
  const file = path.join(DATA_DIR, '.dev-encryption-key');
  if (DATA_DIR && fs.existsSync(file)) return parse(fs.readFileSync(file, 'utf8'));
  const key = crypto.randomBytes(32);
  if (DATA_DIR) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, key.toString('hex'), { mode: 0o600 });
    log.warn('[lumera] No DATA_ENCRYPTION_KEY set; generated a development key at ' + file);
  }
  return key;
}

function encrypt(key, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), body]);
}

function decrypt(key, blob) {
  const buf = Buffer.from(blob);
  if (buf[0] !== 1) throw new Error('Unknown payload version');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(1, 13));
  decipher.setAuthTag(buf.subarray(13, 29));
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()]).toString('utf8'));
}

module.exports = { hashPassword, verifyPassword, DUMMY_HASH, newToken, tokenId, loadKey, encrypt, decrypt };
