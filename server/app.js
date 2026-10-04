'use strict';
const crypto = require('node:crypto');
// Builds the request handler: security headers, CSRF check, sessions, the API
// router and static files. index.js listens; tests call createApp directly.
const fs = require('node:fs');
const path = require('node:path');
const { HttpError, createRouter, send, parseCookies, createLimiter, fail } = require('./http');
const { tokenId, loadKey } = require('./security');
const { createCompanies } = require('./companies');
const dbm = require('./db');

const VERSION = '1.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};

// Retired pages from earlier versions of Lumera, and the source file names,
// send people to the one current site instead of an old copy.
const LEGACY = {
  '/launch': '/', '/hero': '/', '/font-options': '/', '/font-preview': '/', '/character-preview': '/',
  '/landing': '/', '/lumera-site': '/', '/app/index': '/app.html',
};

function createApp(config, { fetchImpl, log = console, dbFile } = {}) {
  const db = dbm.open(dbFile || path.join(config.DATA_DIR, 'lumera.db'));
  const key = loadKey(config, log);
  const limit = createLimiter();
  const companies = createCompanies({ db, config, fetchImpl, log });
  const router = createRouter();

  const audit = (actorId, action, target) => db.prepare('INSERT INTO audit_log (actor_id, action, target, at) VALUES (?, ?, ?, ?)')
    .run(actorId || null, action, String(target || '').slice(0, 300), Date.now());

  const requireUser = (ctx) => { if (!ctx.user) fail(401, 'Please log in to continue.', 'auth'); };
  const requireAdmin = (ctx) => {
    if (!ctx.user) fail(401, 'Please log in to continue.', 'auth');
    if (ctx.user.role !== 'admin') fail(403, 'Admin access only.', 'forbidden');
  };

  const deps = { db, config, key, limit, companies, audit, requireUser, requireAdmin, version: VERSION };
  require('./routes/public').register(router, deps);
  require('./routes/auth').register(router, deps);
  require('./routes/me').register(router, deps);
  require('./routes/community').register(router, deps);
  require('./routes/admin').register(router, deps);

  // Expired sessions are swept hourly.
  const sweep = setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()), 3600e3);
  sweep.unref();

  function securityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Lumera never asks for location. Saying so in a header means no script,
    // ours or anyone's, can prompt for it from these pages.
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), payment=(), usb=(), microphone=(self)');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    if (config.COOKIE_SECURE) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  function clientIp(req) {
    if (config.TRUST_PROXY) {
      const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if (fwd) return fwd;
    }
    return req.socket.remoteAddress || 'unknown';
  }

  function loadSession(ctx) {
    const token = parseCookies(ctx.req.headers.cookie).lm_sid;
    if (!token) return;
    const id = tokenId(token);
    const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ?`).get(id, Date.now());
    if (!row || row.status !== 'active') return;
    ctx.user = row;
    ctx.token = token;
    ctx.sessionId = id;
  }

  // State-changing API calls must come from our own pages: a custom header a
  // cross-site form cannot send, and an Origin (when present) matching the host.
  function checkCsrf(ctx) {
    const m = ctx.req.method;
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
    if (ctx.req.headers['x-lumera'] !== '1') fail(403, 'Missing request header.', 'csrf');
    const origin = ctx.req.headers.origin;
    if (origin) {
      let host;
      try { host = new URL(origin).host; } catch (e) { fail(403, 'Bad origin.', 'csrf'); }
      if (host !== ctx.req.headers.host) fail(403, 'Cross-site request refused.', 'csrf');
    }
  }

  async function handleApi(ctx) {
    const found = router.match(ctx.req.method, ctx.url.pathname);
    if (!found) fail(404, 'Not found.');
    if (found.methodNotAllowed) fail(405, 'Method not allowed.');
    ctx.params = found.params;
    checkCsrf(ctx);
    for (const h of found.route.handlers) {
      await h(ctx);
      if (ctx.res.writableEnded) return;
    }
  }

  function serveStatic(ctx) {
    if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') { send(ctx.res, 405, { error: 'Method not allowed.' }); return; }
    const moved = LEGACY[ctx.url.pathname.replace(/\.html$/, '').toLowerCase()];
    if (moved) { ctx.res.writeHead(301, { Location: moved, 'Cache-Control': 'public, max-age=86400' }); ctx.res.end(); return; }
    let rel = decodeURIComponent(ctx.url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(config.PUBLIC_DIR, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!file.startsWith(config.PUBLIC_DIR + path.sep) && file !== config.PUBLIC_DIR) { send(ctx.res, 403, { error: 'Forbidden.' }); return; }
    let target = file;
    if (!path.extname(target) && fs.existsSync(target + '.html')) target += '.html';
    fs.stat(target, (err, st) => {
      if (err || !st.isFile()) {
        const notFound = path.join(config.PUBLIC_DIR, 'index.html');
        ctx.res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        if (ctx.req.method === 'HEAD') return ctx.res.end();
        fs.createReadStream(notFound).on('error', () => ctx.res.end('Not found')).pipe(ctx.res);
        return;
      }
      const ext = path.extname(target).toLowerCase();
      const isHtml = ext === '.html';
      ctx.res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=604800',
      });
      if (ctx.req.method === 'HEAD') return ctx.res.end();
      fs.createReadStream(target).pipe(ctx.res);
    });
  }

  function sitePasswordOk(req) {
    const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
    if (!m) return false;
    const given = Buffer.from(m[1], 'base64').toString('utf8').split(':').slice(1).join(':');
    const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(config.SITE_PASSWORD).digest();
    return crypto.timingSafeEqual(a, b);
  }

  async function handler(req, res) {
    const ctx = { req, res, url: new URL(req.url, 'http://local'), ip: clientIp(req), user: null };
    ctx.query = ctx.url.searchParams;
    securityHeaders(res);
    // Optional pre-launch lock: with SITE_PASSWORD set, the whole site asks
    // for it (any username). The health check stays open for the host.
    if (config.SITE_PASSWORD && ctx.url.pathname !== '/api/health' && !sitePasswordOk(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Lumera preview", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('This site is not public yet.');
      return;
    }
    try {
      if (ctx.url.pathname.startsWith('/api/')) {
        loadSession(ctx);
        await handleApi(ctx);
        if (!res.writableEnded) send(res, 204);
      } else {
        serveStatic(ctx);
      }
    } catch (err) {
      if (err instanceof HttpError) {
        send(res, err.status, { error: err.message, code: err.code });
      } else {
        log.error('[lumera] ' + req.method + ' ' + ctx.url.pathname, err);
        send(res, 500, { error: 'Something went wrong on our side. Please try again.' });
      }
    }
  }

  handler.db = db;
  handler.close = () => { clearInterval(sweep); db.close(); };
  return handler;
}

module.exports = { createApp, VERSION };
