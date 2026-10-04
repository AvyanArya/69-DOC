'use strict';
// Every setting the server reads from the environment, in one place.
// BACKEND.md documents each of them.
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const env = process.env;
const flag = (v, fallback) => (v == null || v === '' ? fallback : /^(1|true|yes|on)$/i.test(String(v)));
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const NODE_ENV = env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

module.exports = {
  ROOT,
  NODE_ENV,
  isProd,
  PORT: Number(env.PORT || 8787),
  HOST: env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1'),
  PUBLIC_DIR: path.resolve(env.PUBLIC_DIR || path.join(ROOT, 'public')),
  DATA_DIR: path.resolve(env.DATA_DIR || path.join(ROOT, 'data')),

  // 32 bytes, base64 or hex. Encrypts each user's financial figures at rest.
  DATA_ENCRYPTION_KEY: env.DATA_ENCRYPTION_KEY || '',

  SESSION_TTL_DAYS: Number(env.SESSION_TTL_DAYS || 30),
  // Behind a TLS-terminating proxy the cookie must still be Secure.
  COOKIE_SECURE: flag(env.COOKIE_SECURE, isProd),
  // Read the client address from X-Forwarded-For (only behind a proxy you run).
  TRUST_PROXY: flag(env.TRUST_PROXY, false),

  // Accounts with these emails are made admins when they sign up or log in.
  ADMIN_EMAILS: list(env.ADMIN_EMAILS).map((e) => e.toLowerCase()),

  // Company logos. Every key is optional; without them the free icon
  // services are used and the UI falls back to a monogram.
  LOGO_DEV_SECRET_KEY: env.LOGO_DEV_SECRET_KEY || '',
  LOGO_DEV_PUBLISHABLE_KEY: env.LOGO_DEV_PUBLISHABLE_KEY || '',
  BRANDFETCH_CLIENT_ID: env.BRANDFETCH_CLIENT_ID || '',
  LOGO_LOOKUPS: flag(env.LOGO_LOOKUPS, true),

  // Optional: lock the whole site behind one password before launch.
  SITE_PASSWORD: env.SITE_PASSWORD || '',
};
