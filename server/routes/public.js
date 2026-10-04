'use strict';
// Unauthenticated-but-safe endpoints: health, app config, company logos and
// client error reports.
const { fail, send, readJson, str } = require('../http');

// Application configuration and content managed from the admin portal and
// read by every member's app: feature flags, page layout, product updates,
// news headlines and the About/team page.
const CONFIG_KEYS = ['flags', 'layout', 'updates', 'news', 'about'];

function readConfig(db) {
  const out = {};
  for (const k of CONFIG_KEYS) {
    const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(k);
    out[k] = row ? JSON.parse(row.value) : null;
  }
  return out;
}

function register(router, { db, companies, limit, version, requireUser }) {
  router.get('/api/health', async (ctx) => {
    send(ctx.res, 200, { ok: true, service: 'lumera', version, time: Date.now() });
  });

  router.get('/api/config', async (ctx) => {
    send(ctx.res, 200, readConfig(db), { 'Cache-Control': 'no-cache' });
  });

  // Lookups can trigger outbound requests, so they need a signed-in member.
  // JSON metadata for a company name.
  router.get('/api/companies/resolve', requireUser, async (ctx) => {
    if (!limit('co:' + ctx.ip, 120, 60000)) fail(429, 'Too many lookups.');
    const name = str(ctx.query.get('name'), { min: 1, max: 80, name: 'Name' });
    const row = await companies.resolve(name, ctx.query.get('domain'));
    send(ctx.res, 200, { company: companies.publicView(row) });
  });

  // The logo itself, by name: resolves on first request, then serves the cache.
  router.get('/api/companies/logo', requireUser, async (ctx) => {
    if (!limit('co:' + ctx.ip, 120, 60000)) fail(429, 'Too many lookups.');
    const name = str(ctx.query.get('name'), { min: 1, max: 80, name: 'Name' });
    const row = await companies.resolve(name, ctx.query.get('domain'));
    serveLogo(ctx, row);
  });

  router.get('/api/companies/logo/:key', async (ctx) => {
    const row = db.prepare('SELECT * FROM companies WHERE key = ?').get(String(ctx.params.key).slice(0, 64));
    serveLogo(ctx, row);
  });

  function serveLogo(ctx, row) {
    if (!row || row.status !== 'found' || !row.logo) {
      // 404 with a short cache, so the UI shows its monogram and tries again later.
      ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      ctx.res.end('No logo');
      return;
    }
    const buf = Buffer.from(row.logo);
    ctx.res.writeHead(200, {
      'Content-Type': row.logo_type || 'image/png',
      'Content-Length': buf.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      // An SVG served as an image must not run script if opened directly.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    });
    ctx.res.end(buf);
  }

  // Front-end crashes, so the admin portal can show what broke.
  router.post('/api/reports/error', async (ctx) => {
    if (!limit('err:' + ctx.ip, 20, 60000)) { send(ctx.res, 202, { ok: true }); return; }
    const b = await readJson(ctx.req, 16 * 1024);
    const message = str(b.message || 'Unknown error', { max: 500, name: 'Message' });
    const detail = JSON.stringify({
      path: String(b.path || '').slice(0, 200),
      stack: String(b.stack || '').slice(0, 4000),
      ua: String(ctx.req.headers['user-agent'] || '').slice(0, 200),
    });
    db.prepare("INSERT INTO reports (kind, reporter_id, reason, detail, created_at) VALUES ('error', ?, ?, ?, ?)")
      .run(ctx.user ? ctx.user.id : null, message, detail, Date.now());
    send(ctx.res, 202, { ok: true });
  });
}

module.exports = { register, readConfig, CONFIG_KEYS };
