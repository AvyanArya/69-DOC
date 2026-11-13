'use strict';
// Builds the request handler: security headers, CSRF check, sessions, the API
// router and static files. index.js listens; tests call createApp directly.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { HttpError, createRouter, send, parseCookies, createLimiter, fail, safeDecode } = require('./http');
const { tokenId, loadKey } = require('./security');
const { createCompanies } = require('./companies');
const { createMailer } = require('./mailer');
const dbm = require('./db');

const VERSION = '1.1.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};
// Text worth compressing. Images, fonts and video are already compressed.
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

// Retired pages from earlier versions of Lumera, and the source file names,
// send people to the one current site instead of an old copy.
const LEGACY = {
  '/launch': '/', '/hero': '/', '/font-options': '/', '/font-preview': '/', '/character-preview': '/',
  '/landing': '/', '/lumera-site': '/', '/app/index': '/app.html',
};

// Design previews and the offline single-file build: useful to the team on
// staging, but a second, server-less copy of the app has no place in production.
const PREVIEW_PATHS = [/^\/lumera(\.html)?$/i, /^\/previews(\/|$)/i, /^\/ui-styles(\.html)?$/i];
const isPreviewPath = (p) => PREVIEW_PATHS.some((rx) => rx.test(p));

// What pages may load. Scripts and styles are inline in our own HTML, so
// 'unsafe-inline' stays; nothing else may run, and data can only be sent to
// our API, the exchange-rate feed and the opt-in translation services.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https://d8j0ntlcm91z4.cloudfront.net",
  "connect-src 'self' https://open.er-api.com https://api.mymemory.translated.net https://translate.googleapis.com",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function createApp(config, { fetchImpl, log = console, dbFile } = {}) {
  const db = dbm.open(dbFile || path.join(config.DATA_DIR, 'lumera.db'));
  const key = loadKey(config, log);
  const limit = createLimiter();
  const companies = createCompanies({ db, config, fetchImpl, log });
  const mailer = createMailer({ config, fetchImpl, log });
  const router = createRouter();

  const audit = (actorId, action, target) => db.prepare('INSERT INTO audit_log (actor_id, action, target, at) VALUES (?, ?, ?, ?)')
    .run(actorId || null, action, String(target || '').slice(0, 300), Date.now());

  const requireUser = (ctx) => { if (!ctx.user) fail(401, 'Please log in to continue.', 'auth'); };
  const requireAdmin = (ctx) => {
    if (!ctx.user) fail(401, 'Please log in to continue.', 'auth');
    if (ctx.user.role !== 'admin') fail(403, 'Admin access only.', 'forbidden');
  };

  const deps = { db, config, key, limit, companies, mailer, audit, requireUser, requireAdmin, version: VERSION, log };
  require('./routes/public').register(router, deps);
  require('./routes/auth').register(router, deps);
  require('./routes/me').register(router, deps);
  require('./routes/community').register(router, deps);
  require('./routes/feedback').register(router, deps);
  require('./routes/admin').register(router, deps);

  // Hourly housekeeping: expired sessions and reset links, and only the most
  // recent client error reports (they arrive unauthenticated).
  const sweep = setInterval(() => {
    try {
      const now = Date.now();
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
      db.prepare('DELETE FROM password_resets WHERE expires_at < ?').run(now - 864e5);
      db.prepare(`DELETE FROM reports WHERE kind = 'error' AND id NOT IN
        (SELECT id FROM reports WHERE kind = 'error' ORDER BY id DESC LIMIT 2000)`).run();
    } catch (err) { log.error('[lumera] housekeeping failed', err); }
  }, 3600e3);
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
    if (config.NOINDEX) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  // Behind a proxy the client address is the right-most X-Forwarded-For entry:
  // that one was added by the proxy. Entries to its left come from the client
  // and can be forged, so they are never trusted for rate limiting.
  function clientIp(req) {
    if (config.TRUST_PROXY) {
      const parts = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
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

  // Compressed copies of text files, keyed by path, size, mtime and encoding.
  // Bounded, and an edited file gets a new key, so nothing goes stale.
  const zcache = new Map();
  const ZCACHE_MAX = 200;
  function compressed(file, st, enc, cb) {
    const k = `${file}|${st.size}|${st.mtimeMs}|${enc}`;
    if (zcache.has(k)) return cb(null, zcache.get(k));
    fs.readFile(file, (err, buf) => {
      if (err) return cb(err);
      const done = (e, out) => {
        if (e) return cb(e);
        if (zcache.size >= ZCACHE_MAX) zcache.delete(zcache.keys().next().value);
        zcache.set(k, out);
        cb(null, out);
      };
      if (enc === 'br') zlib.brotliCompress(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }, done);
      else zlib.gzip(buf, { level: 9 }, done);
    });
  }

  function notFound(ctx) {
    const page = path.join(config.PUBLIC_DIR, '404.html');
    const fallback = path.join(config.PUBLIC_DIR, 'index.html');
    ctx.res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP });
    if (ctx.req.method === 'HEAD') return ctx.res.end();
    fs.createReadStream(fs.existsSync(page) ? page : fallback).on('error', () => ctx.res.end('Not found')).pipe(ctx.res);
  }

  function serveStatic(ctx) {
    if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') { send(ctx.res, 405, { error: 'Method not allowed.' }); return; }
    const pathname = ctx.url.pathname;
    const moved = LEGACY[pathname.replace(/\.html$/, '').toLowerCase()];
    if (moved) { ctx.res.writeHead(301, { Location: moved, 'Cache-Control': 'public, max-age=86400' }); ctx.res.end(); return; }
    const preview = isPreviewPath(pathname);
    if (preview && !config.SERVE_PREVIEWS) { notFound(ctx); return; }
    if (pathname === '/robots.txt' && config.NOINDEX) {
      ctx.res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
      ctx.res.end('User-agent: *\nDisallow: /\n');
      return;
    }
    let rel = safeDecode(pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    // Dotfiles (.env, .git, ...) are never served, even if one lands in public/.
    if (rel.split('/').some((seg) => seg.startsWith('.'))) { notFound(ctx); return; }
    const file = path.join(config.PUBLIC_DIR, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!file.startsWith(config.PUBLIC_DIR + path.sep) && file !== config.PUBLIC_DIR) { send(ctx.res, 403, { error: 'Forbidden.' }); return; }
    let target = file;
    if (!path.extname(target) && fs.existsSync(target + '.html')) target += '.html';
    fs.stat(target, (err, st) => {
      if (err || !st.isFile()) { notFound(ctx); return; }
      const ext = path.extname(target).toLowerCase();
      const isHtml = ext === '.html';
      const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
      const headers = {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=604800',
        ETag: etag,
        Vary: 'Accept-Encoding',
      };
      // The offline builds compile in the browser (eval) and carry their own
      // meta policy; every other page gets the strict one.
      if (isHtml && !preview) headers['Content-Security-Policy'] = CSP;
      if (ctx.req.headers['if-none-match'] === etag) { ctx.res.writeHead(304, headers); ctx.res.end(); return; }
      const accept = String(ctx.req.headers['accept-encoding'] || '');
      const enc = COMPRESSIBLE.has(ext) && st.size > 1024 ? (/\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : '') : '';
      if (enc) {
        compressed(target, st, enc, (e, body) => {
          if (e) { log.error('[lumera] compress failed', e); if (!ctx.res.headersSent) send(ctx.res, 500, { error: 'Could not read that file.' }); return; }
          ctx.res.writeHead(200, { ...headers, 'Content-Encoding': enc, 'Content-Length': body.length });
          ctx.res.end(ctx.req.method === 'HEAD' ? undefined : body);
        });
        return;
      }
      ctx.res.writeHead(200, { ...headers, 'Content-Length': st.size });
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
    const started = Date.now();
    const rid = crypto.randomBytes(6).toString('hex');
    res.setHeader('X-Request-Id', rid);
    let url;
    try { url = new URL(req.url, 'http://local'); } catch (e) { url = new URL('http://local/'); }
    const ctx = { req, res, url, ip: clientIp(req), user: null, rid };
    ctx.query = ctx.url.searchParams;
    securityHeaders(res);
    if (config.LOG_REQUESTS && url.pathname.startsWith('/api/')) {
      res.on('finish', () => log.log(JSON.stringify({ t: new Date(started).toISOString(), rid, m: req.method, p: url.pathname,
        s: res.statusCode, ms: Date.now() - started, u: ctx.user ? ctx.user.id : undefined })));
    }
    // Optional pre-launch lock: with SITE_PASSWORD set, the whole site asks
    // for it (any username). The health check stays open for the host.
    if (config.SITE_PASSWORD && ctx.url.pathname !== '/api/health') {
      if (!sitePasswordOk(req)) {
        const tooMany = req.headers.authorization && !limit('sitepw:' + ctx.ip, 20, 60000);
        res.writeHead(tooMany ? 429 : 401, { 'WWW-Authenticate': 'Basic realm="Lumera preview", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(tooMany ? 'Too many attempts. Wait a minute.' : 'This site is not public yet.');
        return;
      }
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
        // The detail goes to the log; the client only gets the request id.
        log.error(`[lumera] ${rid} ${req.method} ${ctx.url.pathname}`, err);
        send(res, 500, { error: 'Something went wrong on our side. Please try again.', requestId: rid });
      }
    }
  }

  handler.db = db;
  handler.close = () => { clearInterval(sweep); db.close(); };
  return handler;
}

module.exports = { createApp, VERSION };
