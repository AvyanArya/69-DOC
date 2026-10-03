'use strict';
const { fail, send, readJson, cookie, str, email: checkEmail } = require('../http');
const { hashPassword, verifyPassword, DUMMY_HASH, newToken, tokenId } = require('../security');

const COOKIE = 'lm_sid';

function userView(u) {
  return u && { id: u.id, email: u.email, name: u.name, role: u.role, isAdmin: u.role === 'admin', createdAt: u.created_at };
}

function register(router, { db, config, limit }) {
  const ttlMs = config.SESSION_TTL_DAYS * 864e5;

  function startSession(ctx, user) {
    const token = newToken();
    const now = Date.now();
    db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(tokenId(token), user.id, now, now + ttlMs);
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);
    // Promote listed admins on every sign-in, so ADMIN_EMAILS can be set later.
    if (config.ADMIN_EMAILS.includes(user.email.toLowerCase()) && user.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
      user.role = 'admin';
    }
    ctx.res.setHeader('Set-Cookie', cookie(COOKIE, token, { maxAge: ttlMs / 1000, secure: config.COOKIE_SECURE }));
  }

  // Per address, and per email for logins, so one client cannot hammer one
  // account and a shared network is not locked out by a single member.
  function guard(ctx, bucket, emailKey) {
    const ok = limit(`${bucket}:${ctx.ip}`, 30, 60000) && (!emailKey || limit(`${bucket}:${emailKey}`, 8, 60000));
    if (!ok) fail(429, 'Too many attempts. Please wait a minute and try again.');
  }

  router.post('/api/auth/signup', async (ctx) => {
    guard(ctx, 'auth');
    const b = await readJson(ctx.req);
    const name = str(b.name, { min: 1, max: 80, name: 'Name' });
    const email = checkEmail(b.email);
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 10) fail(400, 'Use a password of at least 10 characters.');
    if (password.length > 200) fail(400, 'That password is too long.');
    if (b.consent !== true) fail(400, 'Please confirm you have read the terms and privacy policy.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      fail(409, 'An account with that email already exists. Log in instead.', 'exists');
    }
    const role = config.ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
    const r = db.prepare('INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(email, name, hashPassword(password), role, Date.now());
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
    startSession(ctx, user);
    send(ctx.res, 201, { user: userView(user) });
  });

  router.post('/api/auth/login', async (ctx) => {
    const b = await readJson(ctx.req);
    const email = checkEmail(b.email);
    guard(ctx, 'login', email);
    const password = typeof b.password === 'string' ? b.password : '';
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) fail(401, 'That email and password do not match an account.');
    if (user.status !== 'active') fail(403, 'This account has been disabled. Contact support.');
    startSession(ctx, user);
    send(ctx.res, 200, { user: userView(user) });
  });

  router.post('/api/auth/logout', async (ctx) => {
    if (ctx.token) db.prepare('DELETE FROM sessions WHERE id = ?').run(tokenId(ctx.token));
    ctx.res.setHeader('Set-Cookie', cookie(COOKIE, '', { maxAge: 0, secure: config.COOKIE_SECURE }));
    send(ctx.res, 200, { ok: true });
  });

  // Completes an admin-issued reset link. The token is single-use and expires.
  router.post('/api/auth/reset', async (ctx) => {
    guard(ctx, 'reset');
    const b = await readJson(ctx.req);
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 10) fail(400, 'Use a password of at least 10 characters.');
    if (password.length > 200) fail(400, 'That password is too long.');
    const row = db.prepare('SELECT * FROM password_resets WHERE id = ?').get(tokenId(String(b.token || '')));
    if (!row || row.used_at || row.expires_at < Date.now()) fail(400, 'This reset link has expired or was already used. Ask support for a new one.');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(Date.now(), row.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    send(ctx.res, 200, { ok: true });
  });

  router.get('/api/auth/me', async (ctx) => {
    if (!ctx.user) fail(401, 'Not signed in.');
    send(ctx.res, 200, { user: userView(ctx.user) });
  });
}

module.exports = { register, userView, COOKIE };
