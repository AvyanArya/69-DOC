'use strict';
// End-to-end API tests against a real server on a random port, with a
// throwaway database and a stubbed network for logo lookups.
// Run: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../app');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lumera-test-'));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(400, 7)]);
const fetchLog = [];

// Only "netflix.com" and "adobe.com" have icons in this fake internet.
async function fakeFetch(url) {
  fetchLog.push(String(url));
  const known = /netflix\.com|adobe\.com/.test(url);
  return {
    ok: known,
    status: known ? 200 : 404,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? (known ? 'image/png' : 'text/plain') : null) },
    arrayBuffer: async () => (known ? PNG : Buffer.alloc(0)),
    json: async () => [],
  };
}

const config = {
  NODE_ENV: 'test', isProd: false, PORT: 0, HOST: '127.0.0.1',
  PUBLIC_DIR: path.join(tmp, 'public'), DATA_DIR: tmp,
  DATA_ENCRYPTION_KEY: '11'.repeat(32), SESSION_TTL_DAYS: 30, COOKIE_SECURE: false, TRUST_PROXY: false,
  ADMIN_EMAILS: ['boss@example.com'],
  LOGO_DEV_SECRET_KEY: '', LOGO_DEV_PUBLISHABLE_KEY: '', BRANDFETCH_CLIENT_ID: '', LOGO_LOOKUPS: true,
};
fs.mkdirSync(config.PUBLIC_DIR);
fs.writeFileSync(path.join(config.PUBLIC_DIR, 'index.html'), '<!doctype html><title>Lumera</title>');

let server, base, handler;
before(async () => {
  handler = createApp(config, { fetchImpl: fakeFetch, log: { warn() {}, error() {}, log() {} } });
  server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); handler.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

function client() {
  let jar = '';
  return async (method, url, body, extra = {}) => {
    const headers = { 'X-Lumera': '1', ...(extra.headers || {}) };
    if (jar) headers.Cookie = jar;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = r.headers.get('set-cookie');
    if (set) jar = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const type = r.headers.get('content-type') || '';
    const data = type.includes('json') ? await r.json() : await r.arrayBuffer();
    return { status: r.status, data, headers: r.headers };
  };
}

const alice = client();
const bob = client();
const boss = client();
const anon = client();

test('health and static files', async () => {
  const h = await anon('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.data.ok, true);
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('permissions-policy'), /geolocation=\(\)/);
  const traversal = await fetch(base + '/..%2f..%2fetc%2fpasswd');
  assert.notEqual(traversal.status, 200);
});

test('signup validates input and refuses duplicates', async () => {
  let r = await alice('POST', '/api/auth/signup', { name: 'Alice', email: 'alice@example.com', password: 'short', consent: true });
  assert.equal(r.status, 400);
  r = await alice('POST', '/api/auth/signup', { name: 'Alice', email: 'alice@example.com', password: 'correct horse battery', consent: false });
  assert.equal(r.status, 400);
  r = await alice('POST', '/api/auth/signup', { name: 'Alice', email: 'alice@example.com', password: 'correct horse battery', consent: true });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.email, 'alice@example.com');
  assert.equal(r.data.user.isAdmin, false);
  r = await anon('POST', '/api/auth/signup', { name: 'Again', email: 'ALICE@example.com', password: 'correct horse battery', consent: true });
  assert.equal(r.status, 409);
});

test('state-changing calls need the CSRF header', async () => {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.com', password: 'correct horse battery' }) });
  assert.equal(r.status, 403);
  const cross = await anon('POST', '/api/auth/login', { email: 'alice@example.com', password: 'x' },
    { headers: { Origin: 'https://evil.example' } });
  assert.equal(cross.status, 403);
});

test('login, me and logout', async () => {
  let r = await bob('POST', '/api/auth/login', { email: 'bob@example.com', password: 'whatever whatever' });
  assert.equal(r.status, 401);
  r = await bob('POST', '/api/auth/signup', { name: 'Bob', email: 'bob@example.com', password: 'another long password', consent: true });
  assert.equal(r.status, 201);
  r = await bob('POST', '/api/auth/logout', {});
  assert.equal(r.status, 200);
  r = await bob('GET', '/api/auth/me');
  assert.equal(r.status, 401);
  r = await bob('POST', '/api/auth/login', { email: 'bob@example.com', password: 'another long password' });
  assert.equal(r.status, 200);
  r = await bob('GET', '/api/auth/me');
  assert.equal(r.data.user.name, 'Bob');
});

test('state round-trips and is encrypted at rest', async () => {
  const state = { profile: { name: 'Alice', region: 'GB', city: '' }, expenses: { rent: 900 }, onboarded: true, junk: 'dropped' };
  let r = await alice('PUT', '/api/me/state', { state });
  assert.equal(r.status, 200);
  r = await alice('GET', '/api/me/state');
  assert.deepEqual(r.data.state.profile, state.profile);
  assert.equal(r.data.state.junk, undefined);
  const raw = handler.db.prepare('SELECT payload FROM user_state').get().payload;
  assert.ok(!Buffer.from(raw).toString('utf8').includes('Alice'), 'payload must not be plaintext');
  r = await bob('GET', '/api/me/state');
  assert.equal(r.data.state, null, 'one member never sees another member\'s state');
  r = await anon('GET', '/api/me/state');
  assert.equal(r.status, 401);
});

test('community: profile, posts, likes, replies, members, connections', async () => {
  let r = await alice('POST', '/api/community/posts', { body: 'Hello' });
  assert.equal(r.status, 409, 'a profile is required before posting');
  r = await alice('PUT', '/api/community/profile', { displayName: 'Alice A', headline: 'Saving for a flat', linkedin: 'https://evil.example/x' });
  assert.equal(r.status, 400);
  r = await alice('PUT', '/api/community/profile', { displayName: 'Alice A', headline: 'Saving for a flat', linkedin: 'https://www.linkedin.com/in/alice' });
  assert.equal(r.status, 200);
  r = await bob('PUT', '/api/community/profile', { displayName: 'Bob B', listed: true });
  assert.equal(r.status, 200);

  r = await alice('POST', '/api/community/posts', { body: 'First month tracked!', tag: 'Milestone' });
  assert.equal(r.status, 201);
  const postId = r.data.post.id;
  assert.equal(r.data.post.mine, true);

  r = await bob('POST', `/api/community/posts/${postId}/like`, {});
  assert.deepEqual(r.data, { liked: true, likes: 1 });
  r = await bob('POST', `/api/community/posts/${postId}/replies`, { body: 'Well done' });
  assert.equal(r.status, 201);

  r = await bob('GET', '/api/community/feed');
  assert.equal(r.data.posts.length, 1);
  assert.equal(r.data.posts[0].liked, true);
  assert.equal(r.data.posts[0].replies, 1);
  assert.equal(r.data.posts[0].mine, false);
  assert.equal(r.data.posts[0].author.name, 'Alice A');

  r = await bob('GET', '/api/community/members');
  assert.deepEqual(r.data.members.map((m) => m.name), ['Alice A']);
  const aliceId = r.data.members[0].id;
  r = await bob('POST', `/api/community/connections/${aliceId}`, {});
  assert.equal(r.data.connected, true);
  r = await bob('GET', '/api/community/stats');
  assert.equal(r.data.members, 2);
  assert.equal(r.data.connections, 1);

  r = await bob('DELETE', `/api/community/posts/${postId}`);
  assert.equal(r.status, 403, 'members cannot delete other people\'s posts');
  r = await bob('POST', '/api/community/report', { kind: 'post', id: postId, reason: 'Testing' });
  assert.equal(r.status, 200);
});

test('admin routes are closed to members and open to admins', async () => {
  let r = await alice('GET', '/api/admin/overview');
  assert.equal(r.status, 403);
  r = await anon('GET', '/api/admin/overview');
  assert.equal(r.status, 401);
  r = await boss('POST', '/api/auth/signup', { name: 'Boss', email: 'boss@example.com', password: 'boss password 123', consent: true });
  assert.equal(r.data.user.isAdmin, true);
  r = await boss('GET', '/api/admin/overview');
  assert.equal(r.status, 200);
  assert.equal(r.data.users, 3);
  assert.equal(r.data.openReports, 1);

  r = await boss('GET', '/api/admin/reports');
  const report = r.data.reports[0];
  assert.equal(report.content, 'First month tracked!');
  r = await boss('PATCH', `/api/admin/reports/${report.id}`, { status: 'resolved', hideTarget: true });
  assert.equal(r.status, 200);
  r = await bob('GET', '/api/community/feed');
  assert.equal(r.data.posts.length, 0, 'hidden posts leave the feed');

  r = await boss('PUT', '/api/admin/config', { flags: { community: false } });
  assert.deepEqual(r.data.flags, { community: false });
  r = await anon('GET', '/api/config');
  assert.deepEqual(r.data.flags, { community: false });

  r = await boss('GET', '/api/admin/users?q=bob');
  const bobId = r.data.users[0].id;
  r = await boss('PATCH', `/api/admin/users/${bobId}`, { status: 'disabled' });
  assert.equal(r.status, 200);
  r = await bob('GET', '/api/auth/me');
  assert.equal(r.status, 401, 'disabling signs the member out');
  r = await bob('POST', '/api/auth/login', { email: 'bob@example.com', password: 'another long password' });
  assert.equal(r.status, 403);

  r = await boss('GET', '/api/admin/audit');
  assert.ok(r.data.entries.length >= 3);
});

test('company logos resolve from free-text names, cache, and fall back', async () => {
  let r = await anon('GET', '/api/companies/resolve?name=Netflix%20Premium');
  assert.equal(r.status, 401, 'lookups need a signed-in member');

  r = await alice('GET', '/api/companies/resolve?name=Netflix%20Premium');
  assert.equal(r.data.company.domain, 'netflix.com');
  assert.equal(r.data.company.status, 'found');
  const calls = fetchLog.length;
  r = await alice('GET', '/api/companies/resolve?name=netflix');
  assert.equal(r.data.company.status, 'found');
  assert.equal(fetchLog.length, calls, 'second lookup is served from the cache');

  r = await alice('GET', '/api/companies/logo?name=Adobe%20Creative%20Cloud');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');

  r = await alice('GET', '/api/companies/resolve?name=Premium%20news');
  assert.equal(r.data.company.status, 'missing', 'generic names get the monogram');
  r = await alice('GET', '/api/companies/logo?name=Premium%20news');
  assert.equal(r.status, 404);

  // An admin correction locks the domain.
  r = await boss('PUT', '/api/admin/companies/premium-news', { name: 'Premium news', domain: 'https://www.adobe.com/' });
  assert.equal(r.data.company.domain, 'adobe.com');
  assert.equal(r.data.company.locked, true);
  r = await alice('GET', '/api/companies/logo/premium-news');
  assert.equal(r.status, 200);
});

test('export and account deletion', async () => {
  let r = await alice('GET', '/api/me/export');
  assert.equal(r.data.account.email, 'alice@example.com');
  assert.equal(r.data.posts.length, 1);
  r = await alice('DELETE', '/api/me', { password: 'wrong' });
  assert.equal(r.status, 400);
  r = await alice('DELETE', '/api/me', { password: 'correct horse battery' });
  assert.equal(r.status, 200);
  r = await anon('POST', '/api/auth/login', { email: 'alice@example.com', password: 'correct horse battery' });
  assert.equal(r.status, 401);
  assert.equal(handler.db.prepare('SELECT COUNT(*) AS n FROM posts').get().n, 0, 'posts go with the account');
});

test('client error reports are accepted and size-limited', async () => {
  const r = await anon('POST', '/api/reports/error', { message: 'x'.repeat(10), stack: 'y'.repeat(9000), path: '/dashboard' });
  assert.equal(r.status, 202);
  const row = handler.db.prepare("SELECT detail FROM reports WHERE kind = 'error'").get();
  assert.ok(JSON.parse(row.detail).stack.length <= 4000);
});

test('admin-issued reset links work once', async () => {
  const carol = client();
  let r = await carol('POST', '/api/auth/signup', { name: 'Carol', email: 'carol@example.com', password: 'first password 1', consent: true });
  const id = r.data.user.id;
  r = await carol('POST', `/api/admin/users/${id}/reset-link`, {});
  assert.equal(r.status, 403, 'members cannot issue reset links');
  r = await boss('POST', `/api/admin/users/${id}/reset-link`, {});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const token = new URL('http://x' + r.data.path.replace('#/reset', '/reset')).searchParams.get('token');
  r = await anon('POST', '/api/auth/reset', { token, password: 'second password 2' });
  assert.equal(r.status, 200);
  r = await anon('POST', '/api/auth/reset', { token, password: 'third password 3' });
  assert.equal(r.status, 400, 'a link works only once');
  r = await carol('GET', '/api/auth/me');
  assert.equal(r.status, 401, 'resetting signs out existing sessions');
  r = await carol('POST', '/api/auth/login', { email: 'carol@example.com', password: 'second password 2' });
  assert.equal(r.status, 200);
});

test('a member without a community profile gets profile: null', async () => {
  const dan = client();
  await dan('POST', '/api/auth/signup', { name: 'Dan', email: 'dan@example.com', password: 'dan password 123', consent: true });
  const r = await dan('GET', '/api/community/profile');
  assert.equal(r.status, 200);
  assert.ok('profile' in r.data && r.data.profile === null);
});

test('plan waitlist: members join and leave, admins see the list', async () => {
  const erin = client();
  await erin('POST', '/api/auth/signup', { name: 'Erin', email: 'erin@example.com', password: 'erin password 123', consent: true });
  let r = await erin('PUT', '/api/me/waitlist', { plan: 'Gold', on: true });
  assert.equal(r.status, 400, 'only known plans');
  r = await erin('PUT', '/api/me/waitlist', { plan: 'Pro', on: true });
  assert.deepEqual(r.data.plans, ['Pro']);
  r = await erin('PUT', '/api/me/waitlist', { plan: 'Pro', on: true });
  assert.deepEqual(r.data.plans, ['Pro'], 'joining twice is a no-op');
  r = await erin('GET', '/api/admin/waitlist');
  assert.equal(r.status, 403);
  r = await boss('GET', '/api/admin/waitlist');
  assert.ok(r.data.entries.some((e) => e.email === 'erin@example.com' && e.plan === 'Pro'));
  r = await boss('GET', '/api/admin/overview');
  assert.equal(r.data.waitlist.Pro, 1);
  r = await erin('PUT', '/api/me/waitlist', { plan: 'Pro', on: false });
  assert.deepEqual(r.data.plans, []);
  r = await anon('PUT', '/api/me/waitlist', { plan: 'Pro', on: true });
  assert.equal(r.status, 401);
});

test('retired pages from old versions redirect to the current site', async () => {
  for (const p of ['/launch.html', '/hero', '/font-options.html', '/landing.html']) {
    const r = await fetch(base + p, { redirect: 'manual' });
    assert.equal(r.status, 301, p);
    assert.equal(r.headers.get('location'), '/');
  }
});

test('SITE_PASSWORD locks the whole site except the health check', async () => {
  const h = createApp({ ...config, SITE_PASSWORD: 'preview-pass', DATA_DIR: tmp }, { fetchImpl: fakeFetch, dbFile: ':memory:', log: { warn() {}, error() {}, log() {} } });
  const srv = http.createServer(h); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const u = `http://127.0.0.1:${srv.address().port}`;
  assert.equal((await fetch(u + '/')).status, 401);
  assert.equal((await fetch(u + '/api/health')).status, 200);
  const ok = await fetch(u + '/', { headers: { Authorization: 'Basic ' + Buffer.from('x:preview-pass').toString('base64') } });
  assert.notEqual(ok.status, 401);
  srv.close(); h.close();
});
