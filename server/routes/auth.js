'use strict';
const { fail, send, readJson, cookie, str, email: checkEmail, newPassword } = require('../http');
const { hashPassword, verifyPassword, DUMMY_HASH, newToken, tokenId } = require('../security');

const COOKIE = 'lm_sid';
const RESET_MINUTES = 60;

function userView(u) {
  return u && { id: u.id, email: u.email, name: u.name, role: u.role, isAdmin: u.role === 'admin', createdAt: u.created_at };
}

function register(router, { db, config, limit, mailer, log }) {
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
  // account and a shared network is not locked out by a single member. The
  // hourly cap stops slow guessing that stays under the per-minute limit.
  function guard(ctx, bucket, emailKey) {
    const ok = limit(`${bucket}:${ctx.ip}`, 30, 60000)
      && (!emailKey || (limit(`${bucket}:${emailKey}`, 8, 60000) && limit(`${bucket}-h:${emailKey}`, 40, 3600e3)));
    if (!ok) fail(429, 'Too many attempts. Please wait a few minutes and try again.');
  }

  router.post('/api/auth/signup', async (ctx) => {
    guard(ctx, 'auth');
    if (!limit('signup-h:' + ctx.ip, 20, 3600e3)) fail(429, 'Too many new accounts from this network. Try again later.');
    const b = await readJson(ctx.req);
    const name = str(b.name, { min: 1, max: 80, name: 'Name' });
    const email = checkEmail(b.email);
    const password = newPassword(b.password);
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
    const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
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

  // "Forgot password": emails a one-time link. The answer is the same whether
  // or not the address has an account, so it cannot be used to find members.
  router.post('/api/auth/forgot', async (ctx) => {
    const b = await readJson(ctx.req);
    const email = checkEmail(b.email);
    guard(ctx, 'forgot', email);
    if (!limit('forgot-h:' + email, 5, 3600e3)) fail(429, 'Too many reset emails for this address. Try again in an hour.');
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").get(email);
    if (user) {
      const token = newToken();
      const now = Date.now();
      // Only the newest self-service link works.
      db.prepare("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND kind = 'self' AND used_at IS NULL").run(now, user.id);
      db.prepare("INSERT INTO password_resets (id, user_id, created_by, created_at, expires_at, kind) VALUES (?, ?, NULL, ?, ?, 'self')")
        .run(tokenId(token), user.id, now, now + RESET_MINUTES * 60e3);
      const link = mailer.link('/app.html#/reset?token=' + token);
      if (mailer.enabled) {
        const m = mailer.resetEmail({ name: user.name, url: link, minutes: RESET_MINUTES });
        mailer.send({ to: user.email, ...m }).catch(() => {});
      } else if (!config.isProd) {
        // Development without email: the link goes to the server log only.
        log.warn(`[lumera] email is not configured; reset link for ${user.email}: ${link}`);
      }
    }
    send(ctx.res, 200, { ok: true, mail: mailer.enabled });
  });

  // Completes a reset link (self-service or admin-issued). Single use, expires.
  router.post('/api/auth/reset', async (ctx) => {
    guard(ctx, 'reset');
    const b = await readJson(ctx.req);
    const password = newPassword(b.password);
    const row = db.prepare('SELECT * FROM password_resets WHERE id = ?').get(tokenId(String(b.token || '')));
    if (!row || row.used_at || row.expires_at < Date.now()) fail(400, 'This reset link has expired or was already used. Ask for a new one.');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(Date.now(), row.user_id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    send(ctx.res, 200, { ok: true });
  });

  // The app's start-up check: 200 either way, so a signed-out visit does not
  // log an error in the browser console.
  router.get('/api/auth/session', async (ctx) => {
    send(ctx.res, 200, { user: ctx.user ? userView(ctx.user) : null });
  });

  router.get('/api/auth/me', async (ctx) => {
    if (!ctx.user) fail(401, 'Not signed in.');
    send(ctx.res, 200, { user: userView(ctx.user) });
  });
}

module.exports = { register, userView, COOKIE };
