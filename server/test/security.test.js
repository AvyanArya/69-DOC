'use strict';
// Security and hardening checks against a real server: access control between
// members, admin-only routes, CSRF, rate limits, injection, headers, cookies,
// password reset by email, feedback, static-file rules and error hygiene.
// Run: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { createApp } = require('../app');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lumera-sec-'));
const sent = [];   // emails "sent" through the stubbed provider

async function fakeFetch(url, opts = {}) {
  if (String(url) === 'https://api.resend.com/emails') {
    sent.push({ auth: opts.headers.Authorization, body: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ id: 'x' }) };
  }
  return { ok: false, status: 404, headers: { get: () => 'text/plain' }, arrayBuffer: async () => Buffer.alloc(0), json: async () => [] };
}

const config = {
  NODE_ENV: 'production', isProd: true, APP_ENV: 'staging', PORT: 0, HOST: '127.0.0.1',
  PUBLIC_DIR: path.join(tmp, 'public'), DATA_DIR: tmp, PUBLIC_URL: 'https://staging.lumera.test',
  DATA_ENCRYPTION_KEY: '22'.repeat(32), SESSION_TTL_DAYS: 30, COOKIE_SECURE: true, TRUST_PROXY: true,
  ADMIN_EMAILS: ['admin@example.com'],
  LOGO_DEV_SECRET_KEY: '', LOGO_DEV_PUBLISHABLE_KEY: '', BRANDFETCH_CLIENT_ID: '', LOGO_LOOKUPS: false,
  RESEND_API_KEY: 're_test_key', MAIL_FROM: 'Lumera <hello@lumera.test>', SUPPORT_EMAIL: 'help@lumera.test',
  SITE_PASSWORD: '', NOINDEX: true, FEEDBACK_ENABLED: true, SERVE_PREVIEWS: false, LOG_REQUESTS: false,
};
fs.mkdirSync(path.join(config.PUBLIC_DIR, 'previews'), { recursive: true });
fs.writeFileSync(path.join(config.PUBLIC_DIR, 'index.html'), '<!doctype html><title>Lumera</title>' + 'x'.repeat(5000));
fs.writeFileSync(path.join(config.PUBLIC_DIR, 'lumera.html'), '<!doctype html><title>offline build</title>');
fs.writeFileSync(path.join(config.PUBLIC_DIR, 'previews', 'a.html'), 'preview');
fs.writeFileSync(path.join(config.PUBLIC_DIR, '.env'), 'SECRET=1');

const quiet = { warn() {}, error() {}, log() {} };
let server, base, handler;
before(async () => {
  handler = createApp(config, { fetchImpl: fakeFetch, log: quiet });
  server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); handler.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

// Each client has its own cookie jar and its own forwarded address, so one
// test's rate limits never spill into another's.
let ipSeq = 10;
function client(ip = `203.0.113.${ipSeq++}`) {
  let jar = '';
  const call = async (method, url, body, extra = {}) => {
    const headers = { 'X-Lumera': '1', 'X-Forwarded-For': ip, ...(extra.headers || {}) };
    if (jar) headers.Cookie = jar;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = r.headers.get('set-cookie');
    if (set) jar = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const type = r.headers.get('content-type') || '';
    const data = type.includes('json') ? await r.json() : await r.text();
    return { status: r.status, data, headers: r.headers };
  };
  call.cookie = () => jar;
  return call;
}

async function member(name, email, password = 'a fine long password') {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { name, email, password, consent: true });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return Object.assign(c, { id: r.data.user.id, password });
}

test('session cookie is HttpOnly, SameSite=Lax and Secure', async () => {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { name: 'Cookie', email: 'cookie@example.com', password: 'a fine long password', consent: true });
  const set = r.headers.get('set-cookie');
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Lax/);
  assert.match(set, /Secure/);
  assert.ok(!/Domain=/i.test(set), 'cookie is host-only');
});

test('pages carry CSP, framing, HSTS and noindex headers; robots.txt disallows all on staging', async () => {
  const r = await fetch(base + '/');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.ok(!/unsafe-eval/.test(csp), 'no eval on served pages');
  assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('strict-transport-security'), /max-age=31536000/);
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.match(robots, /Disallow: \//);
});

test('members cannot read or change each other\'s data', async () => {
  const a = await member('Ann', 'ann@example.com');
  const b = await member('Ben', 'ben@example.com');
  await a('PUT', '/api/me/state', { state: { profile: { name: 'Ann' }, expenses: { rent: 1200 } } });
  let r = await b('GET', '/api/me/state');
  assert.equal(r.data.state, null);
  r = await b('GET', '/api/me/export');
  assert.equal(r.data.account.email, 'ben@example.com');
  assert.equal(r.data.state, null, 'export only ever contains the caller');

  await a('PUT', '/api/community/profile', { displayName: 'Ann', headline: '' });
  await b('PUT', '/api/community/profile', { displayName: 'Ben', headline: '' });
  const post = (await a('POST', '/api/community/posts', { body: 'Ann\'s post' })).data.post;
  const reply = (await a('POST', `/api/community/posts/${post.id}/replies`, { body: 'Ann\'s reply' })).data.reply;
  assert.equal((await b('DELETE', `/api/community/posts/${post.id}`)).status, 403);
  assert.equal((await b('DELETE', `/api/community/replies/${reply.id}`)).status, 403);
  assert.equal((await b('PATCH', `/api/admin/users/${a.id}`, { status: 'disabled' })).status, 403);
  assert.equal((await b('DELETE', `/api/admin/users/${a.id}`)).status, 403);
  assert.equal((await b('PUT', '/api/admin/config', { flags: { community: false } })).status, 403);
  assert.equal((await b('GET', '/api/admin/feedback')).status, 403);
  // Ann's post is still there.
  r = await a('GET', '/api/community/feed');
  assert.ok(r.data.posts.some((p) => p.id === post.id));
});

test('every admin route refuses anonymous callers and members', async () => {
  const m = await member('Mo', 'mo@example.com');
  const anon = client();
  const routes = [['GET', '/api/admin/overview'], ['GET', '/api/admin/users'], ['GET', '/api/admin/posts'],
    ['GET', '/api/admin/reports'], ['GET', '/api/admin/companies'], ['GET', '/api/admin/config'],
    ['GET', '/api/admin/audit'], ['GET', '/api/admin/waitlist'], ['GET', '/api/admin/feedback'],
    ['POST', '/api/admin/users/1/reset-link'], ['PATCH', '/api/admin/posts/1'], ['DELETE', '/api/admin/companies/x']];
  for (const [method, url] of routes) {
    assert.equal((await anon(method, url, method === 'GET' ? undefined : {})).status, 401, `${method} ${url} anonymous`);
    assert.equal((await m(method, url, method === 'GET' ? undefined : {})).status, 403, `${method} ${url} member`);
  }
});

test('SQL injection attempts are treated as plain text', async () => {
  const m = await member('Sql', 'sql@example.com');
  let r = await m('GET', '/api/community/members?q=' + encodeURIComponent("' OR 1=1 --"));
  assert.equal(r.status, 200);
  assert.equal(r.data.members.length, 0);
  r = await client()('POST', '/api/auth/login', { email: "x' OR '1'='1", password: 'x' });
  assert.equal(r.status, 400, 'not a valid email');
  r = await m('GET', '/api/community/feed?tag=' + encodeURIComponent("Update' OR 1=1 --") + '&before=1;DROP TABLE posts');
  assert.equal(r.status, 200);
  assert.ok(handler.db.prepare("SELECT name FROM sqlite_master WHERE name = 'posts'").get(), 'posts table still exists');
});

test('script in a post is stored as text and served as JSON, never as HTML', async () => {
  const m = await member('Xss', 'xss@example.com');
  await m('PUT', '/api/community/profile', { displayName: '<img src=x onerror=alert(1)>', headline: '' });
  const r = await m('POST', '/api/community/posts', { body: '<script>alert(1)</script>' });
  assert.equal(r.status, 201);
  assert.match(r.headers.get('content-type'), /application\/json/);
  assert.equal(r.data.post.body, '<script>alert(1)</script>', 'stored verbatim; the app renders it as text');
  const bad = await m('PUT', '/api/community/profile', { displayName: 'x', linkedin: 'javascript:alert(1)' });
  assert.equal(bad.status, 400, 'only https linkedin.com links');
});

test('CSRF: missing header, foreign origin and cross-site form posts are refused', async () => {
  const m = await member('Csrf', 'csrf@example.com');
  const noHeader = await fetch(base + '/api/me/state', { method: 'PUT', headers: { Cookie: m.cookie(), 'Content-Type': 'application/json' }, body: '{"state":{}}' });
  assert.equal(noHeader.status, 403);
  const foreign = await m('DELETE', '/api/me', { password: m.password }, { headers: { Origin: 'https://evil.example' } });
  assert.equal(foreign.status, 403);
  const form = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: m.cookie(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a=1' });
  assert.equal(form.status, 403);
  assert.equal((await m('GET', '/api/auth/me')).status, 200, 'still signed in');
});

test('login is rate limited per account, and a forged X-Forwarded-For does not reset it', async () => {
  await member('Rate', 'rate@example.com');
  const statuses = [];
  for (let i = 0; i < 10; i++) {
    // The proxy appends the real address last; the client controls only the left part.
    const c = client(`198.51.100.${i}, 192.0.2.50`);
    statuses.push((await c('POST', '/api/auth/login', { email: 'rate@example.com', password: 'wrong password ' + i })).status);
  }
  assert.deepEqual(statuses.slice(0, 8), Array(8).fill(401));
  assert.equal(statuses[8], 429);
});

test('per-network limits use the address the proxy saw, not one the client wrote', async () => {
  const statuses = [];
  for (let i = 0; i < 22; i++) {
    const c = client(`10.9.${i}.1, 192.0.2.77`);   // forged left part changes every time
    statuses.push((await c('POST', '/api/auth/signup', { name: 'S', email: `spoof${i}@example.com`, password: 'x', consent: true })).status);
  }
  assert.ok(statuses.includes(429), 'signups from one real address are capped: ' + statuses.join(','));
});

test('weak and common passwords are refused', async () => {
  const c = client();
  for (const password of ['short', 'password123', '1234567890', 'aaaaaaaaaaaa']) {
    const r = await c('POST', '/api/auth/signup', { name: 'W', email: 'weak@example.com', password, consent: true });
    assert.equal(r.status, 400, password);
  }
});

test('forgot password: same answer for unknown emails; link built from PUBLIC_URL, works once', async () => {
  const m = await member('Reset', 'reset@example.com', 'original password 1');
  const before = sent.length;
  let r = await client()('POST', '/api/auth/forgot', { email: 'nobody@example.com' });
  assert.equal(r.status, 200);
  assert.equal(sent.length, before, 'no email for unknown addresses');
  r = await client()('POST', '/api/auth/forgot', { email: 'reset@example.com' }, { headers: { Host: 'evil.example' } });
  assert.equal(r.status, 200);
  await new Promise((res) => setTimeout(res, 50));
  assert.equal(sent.length, before + 1);
  const mail = sent[sent.length - 1];
  assert.equal(mail.auth, 'Bearer re_test_key');
  assert.deepEqual(mail.body.to, ['reset@example.com']);
  const link = /https:\/\/staging\.lumera\.test\/app\.html#\/reset\?token=([\w-]+)/.exec(mail.body.text);
  assert.ok(link, 'the link uses PUBLIC_URL, not the Host header');
  assert.ok(!mail.body.text.includes('evil.example'));
  // A second request invalidates the first link.
  await client()('POST', '/api/auth/forgot', { email: 'reset@example.com' });
  await new Promise((res) => setTimeout(res, 50));
  const second = /token=([\w-]+)/.exec(sent[sent.length - 1].body.text)[1];
  assert.equal((await client()('POST', '/api/auth/reset', { token: link[1], password: 'brand new password 2' })).status, 400);
  assert.equal((await client()('POST', '/api/auth/reset', { token: second, password: 'brand new password 2' })).status, 200);
  assert.equal((await client()('POST', '/api/auth/reset', { token: second, password: 'another new password 3' })).status, 400);
  assert.equal((await m('GET', '/api/auth/me')).status, 401, 'reset signs out every session');
  assert.equal((await client()('POST', '/api/auth/login', { email: 'reset@example.com', password: 'brand new password 2' })).status, 200);
});

test('feedback: validated, rate limited, readable only by admins', async () => {
  const m = await member('Fee', 'fee@example.com');
  let r = await m('POST', '/api/feedback', { kind: 'rant', message: 'hello there' });
  assert.equal(r.status, 400);
  r = await m('POST', '/api/feedback', { kind: 'bug', message: 'The goals page jumps when I scroll', page: '/goals' });
  assert.equal(r.status, 201);
  r = await client()('POST', '/api/feedback', { kind: 'idea', message: 'Anonymous idea from a teammate' });
  assert.equal(r.status, 201);
  const admin = await member('Admin', 'admin@example.com');
  r = await admin('GET', '/api/admin/feedback');
  assert.equal(r.status, 200);
  const item = r.data.feedback.find((f) => f.page === '/goals');
  assert.equal(item.email, 'fee@example.com');
  assert.equal((await admin('PATCH', `/api/admin/feedback/${item.id}`, { status: 'resolved' })).status, 200);
  r = await admin('GET', '/api/admin/feedback?status=resolved');
  assert.ok(r.data.feedback.some((f) => f.id === item.id));
  r = await admin('GET', '/api/admin/overview');
  assert.equal(r.data.server.env, 'staging');
  assert.equal(r.data.server.mail, true);
});

test('static files: previews hidden, dotfiles never served, malformed URLs rejected, compression and ETags', async () => {
  assert.equal((await fetch(base + '/lumera.html')).status, 404, 'offline build is not served when SERVE_PREVIEWS is off');
  assert.equal((await fetch(base + '/previews/a.html')).status, 404);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/%E0%A4%A')).status, 400);
  const raw = await new Promise((resolve) => http.get(base + '/', { headers: { 'Accept-Encoding': 'br' } }, (res) => {
    const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve({ res, body: Buffer.concat(chunks) }));
  }));
  assert.equal(raw.res.headers['content-encoding'], 'br');
  assert.match(zlib.brotliDecompressSync(raw.body).toString(), /<title>Lumera<\/title>/);
  const etag = raw.res.headers.etag;
  const again = await fetch(base + '/', { headers: { 'If-None-Match': etag } });
  assert.equal(again.status, 304);
});

test('a disabled member is signed out everywhere and cannot sign back in', async () => {
  const m = await member('Dis', 'dis@example.com');
  const admin = client();
  await admin('POST', '/api/auth/login', { email: 'admin@example.com', password: 'a fine long password' });
  assert.equal((await admin('PATCH', `/api/admin/users/${m.id}`, { status: 'disabled' })).status, 200);
  assert.equal((await m('GET', '/api/auth/me')).status, 401);
  assert.equal((await client()('POST', '/api/auth/login', { email: 'dis@example.com', password: m.password })).status, 403);
});

test('internal errors return a request id, never a stack trace; health reports a dead database', async () => {
  const h = createApp({ ...config, DATA_DIR: tmp }, { fetchImpl: fakeFetch, dbFile: ':memory:', log: quiet });
  const srv = http.createServer(h); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const u = `http://127.0.0.1:${srv.address().port}`;
  h.db.close();
  const r = await fetch(u + '/api/me/state', { headers: { Cookie: 'lm_sid=abc' } });
  assert.equal(r.status, 500);
  const body = await r.json();
  assert.deepEqual(Object.keys(body).sort(), ['error', 'requestId']);
  assert.ok(!JSON.stringify(body).includes('at '), 'no stack frames');
  assert.equal((await fetch(u + '/api/health')).status, 503);
  srv.close();
});
