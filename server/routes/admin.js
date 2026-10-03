'use strict';
// Admin API. Every route requires a signed-in account with role 'admin'.
const { fail, send, readJson, str, intId } = require('../http');
const { readConfig, CONFIG_KEYS } = require('./public');
const { newToken, tokenId } = require('../security');

function register(router, { db, requireAdmin, companies, audit }) {
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;

  router.get('/api/admin/overview', requireAdmin, async (ctx) => {
    const weekAgo = Date.now() - 7 * 864e5;
    send(ctx.res, 200, {
      users: n('SELECT COUNT(*) AS n FROM users'),
      admins: n("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
      disabled: n("SELECT COUNT(*) AS n FROM users WHERE status = 'disabled'"),
      activeThisWeek: n('SELECT COUNT(*) AS n FROM users WHERE last_login_at > ?', weekAgo),
      onboarded: n('SELECT COUNT(*) AS n FROM user_state'),
      posts: n('SELECT COUNT(*) AS n FROM posts'),
      hiddenPosts: n('SELECT COUNT(*) AS n FROM posts WHERE hidden = 1'),
      openReports: n("SELECT COUNT(*) AS n FROM reports WHERE status = 'open' AND kind != 'error'"),
      openErrors: n("SELECT COUNT(*) AS n FROM reports WHERE status = 'open' AND kind = 'error'"),
      companies: n('SELECT COUNT(*) AS n FROM companies'),
      companiesMissing: n("SELECT COUNT(*) AS n FROM companies WHERE status = 'missing'"),
    });
  });

  // ---- users ----
  router.get('/api/admin/users', requireAdmin, async (ctx) => {
    const q = String(ctx.query.get('q') || '').trim().slice(0, 80);
    const like = '%' + q.replace(/[%_]/g, '') + '%';
    const page = Math.max(0, Number(ctx.query.get('page')) || 0);
    const rows = db.prepare(`SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, u.last_login_at,
        EXISTS (SELECT 1 FROM user_state s WHERE s.user_id = u.id) AS onboarded,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS posts
      FROM users u WHERE (:q = '' OR u.email LIKE :like OR u.name LIKE :like)
      ORDER BY u.id DESC LIMIT 51 OFFSET :off`).all({ q, like, off: page * 50 });
    send(ctx.res, 200, { users: rows.slice(0, 50).map((r) => ({ ...r, onboarded: !!r.onboarded })), more: rows.length > 50 });
  });

  router.patch('/api/admin/users/:id', requireAdmin, async (ctx) => {
    const id = intId(ctx.params.id);
    const b = await readJson(ctx.req);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!u) fail(404, 'No such user.');
    if (id === ctx.user.id && (b.role === 'user' || b.status === 'disabled')) fail(400, 'You cannot demote or disable your own account.');
    if (b.role && !['user', 'admin'].includes(b.role)) fail(400, 'Unknown role.');
    if (b.status && !['active', 'disabled'].includes(b.status)) fail(400, 'Unknown status.');
    if (b.role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(b.role, id);
    if (b.status) {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(b.status, id);
      if (b.status === 'disabled') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    }
    audit(ctx.user.id, 'user.update', `${u.email} ${JSON.stringify({ role: b.role, status: b.status })}`);
    send(ctx.res, 200, { ok: true });
  });

  // A one-time link the admin sends to the member (there is no mail service).
  router.post('/api/admin/users/:id/reset-link', requireAdmin, async (ctx) => {
    const id = intId(ctx.params.id);
    const u = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (!u) fail(404, 'No such user.');
    const token = newToken();
    const now = Date.now();
    db.prepare('INSERT INTO password_resets (id, user_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(tokenId(token), id, ctx.user.id, now, now + 3600e3);
    audit(ctx.user.id, 'user.reset-link', u.email);
    send(ctx.res, 200, { path: '/app.html#/reset?token=' + token, expiresAt: now + 3600e3 });
  });

  router.delete('/api/admin/users/:id', requireAdmin, async (ctx) => {
    const id = intId(ctx.params.id);
    if (id === ctx.user.id) fail(400, 'Delete your own account from Settings instead.');
    const u = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (!u) fail(404, 'No such user.');
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    audit(ctx.user.id, 'user.delete', u.email);
    send(ctx.res, 200, { ok: true });
  });

  // ---- community moderation ----
  router.get('/api/admin/posts', requireAdmin, async (ctx) => {
    const filter = ctx.query.get('filter') || 'all';
    const where = filter === 'hidden' ? 'p.hidden = 1' : filter === 'reported'
      ? "EXISTS (SELECT 1 FROM reports r WHERE r.kind = 'post' AND r.target_id = p.id AND r.status = 'open')" : '1 = 1';
    const rows = db.prepare(`SELECT p.id, p.tag, p.body, p.link, p.hidden, p.created_at, u.email, u.name,
        (SELECT COUNT(*) FROM reports r WHERE r.kind = 'post' AND r.target_id = p.id AND r.status = 'open') AS reports,
        (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likes
      FROM posts p JOIN users u ON u.id = p.user_id WHERE ${where} ORDER BY p.id DESC LIMIT 100`).all();
    send(ctx.res, 200, { posts: rows.map((r) => ({ ...r, hidden: !!r.hidden })) });
  });

  router.patch('/api/admin/posts/:id', requireAdmin, async (ctx) => {
    const id = intId(ctx.params.id);
    const b = await readJson(ctx.req);
    if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id)) fail(404, 'No such post.');
    db.prepare('UPDATE posts SET hidden = ? WHERE id = ?').run(b.hidden ? 1 : 0, id);
    if (b.hidden) db.prepare("UPDATE reports SET status = 'resolved', resolved_at = ? WHERE kind = 'post' AND target_id = ? AND status = 'open'").run(Date.now(), id);
    audit(ctx.user.id, b.hidden ? 'post.hide' : 'post.show', String(id));
    send(ctx.res, 200, { ok: true });
  });

  router.delete('/api/admin/posts/:id', requireAdmin, async (ctx) => {
    const id = intId(ctx.params.id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    db.prepare("UPDATE reports SET status = 'resolved', resolved_at = ? WHERE kind = 'post' AND target_id = ? AND status = 'open'").run(Date.now(), id);
    audit(ctx.user.id, 'post.delete', String(id));
    send(ctx.res, 200, { ok: true });
  });

  // ---- reports (member reports and client errors) ----
  router.get('/api/admin/reports', requireAdmin, async (ctx) => {
    const status = ctx.query.get('status') === 'resolved' ? 'resolved' : 'open';
    const kind = ctx.query.get('kind') === 'error' ? 'error' : 'member';
    const rows = db.prepare(`SELECT r.*, u.email AS reporter,
        CASE r.kind WHEN 'post' THEN (SELECT body FROM posts WHERE id = r.target_id)
                    WHEN 'reply' THEN (SELECT body FROM replies WHERE id = r.target_id) END AS content
      FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
      WHERE r.status = ? AND ${kind === 'error' ? "r.kind = 'error'" : "r.kind != 'error'"}
      ORDER BY r.id DESC LIMIT 200`).all(status);
    send(ctx.res, 200, { reports: rows.map((r) => ({ ...r, detail: r.detail ? safeParse(r.detail) : null })) });
  });

  router.patch('/api/admin/reports/:id', requireAdmin, async (ctx) => {
    const id = intId(ctx.params.id);
    const b = await readJson(ctx.req);
    const status = b.status === 'open' ? 'open' : 'resolved';
    db.prepare('UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?').run(status, status === 'resolved' ? Date.now() : null, id);
    if (b.hideTarget) {
      const r = db.prepare('SELECT kind, target_id FROM reports WHERE id = ?').get(id);
      if (r && r.kind === 'post') db.prepare('UPDATE posts SET hidden = 1 WHERE id = ?').run(r.target_id);
      if (r && r.kind === 'reply') db.prepare('UPDATE replies SET hidden = 1 WHERE id = ?').run(r.target_id);
    }
    audit(ctx.user.id, 'report.' + status, String(id));
    send(ctx.res, 200, { ok: true });
  });

  // ---- companies (subscription logos) ----
  router.get('/api/admin/companies', requireAdmin, async (ctx) => {
    const rows = db.prepare('SELECT key, name, domain, source, status, locked, checked_at FROM companies ORDER BY status DESC, name LIMIT 500').all();
    send(ctx.res, 200, { companies: rows.map((r) => companies.publicView(r)) });
  });

  router.post('/api/admin/companies', requireAdmin, async (ctx) => {
    const b = await readJson(ctx.req);
    const name = str(b.name, { min: 1, max: 80, name: 'Company name' });
    const key = companies.keyFor(name);
    if (!key) fail(400, 'That name has no letters to work with.');
    const row = b.domain ? await companies.setDomain(key, name, b.domain) : await companies.resolve(name);
    if (!row) fail(400, 'That domain does not look right. Use the form example.com.');
    audit(ctx.user.id, 'company.add', `${name} ${b.domain || ''}`);
    send(ctx.res, 200, { company: companies.publicView(row) });
  });

  router.put('/api/admin/companies/:key', requireAdmin, async (ctx) => {
    const key = String(ctx.params.key).slice(0, 64);
    const b = await readJson(ctx.req);
    const existing = db.prepare('SELECT * FROM companies WHERE key = ?').get(key);
    const name = str(b.name || (existing && existing.name), { min: 1, max: 80, name: 'Company name' });
    const row = await companies.setDomain(key, name, b.domain);
    if (!row) fail(400, 'That domain does not look right. Use the form example.com.');
    audit(ctx.user.id, 'company.set', `${key} -> ${row.domain}`);
    send(ctx.res, 200, { company: companies.publicView(row) });
  });

  router.post('/api/admin/companies/:key/refresh', requireAdmin, async (ctx) => {
    const row = await companies.refresh(String(ctx.params.key).slice(0, 64));
    if (!row) fail(404, 'No such company.');
    send(ctx.res, 200, { company: companies.publicView(row) });
  });

  router.delete('/api/admin/companies/:key', requireAdmin, async (ctx) => {
    db.prepare('DELETE FROM companies WHERE key = ?').run(String(ctx.params.key).slice(0, 64));
    audit(ctx.user.id, 'company.delete', ctx.params.key);
    send(ctx.res, 200, { ok: true });
  });

  // ---- application configuration (feature flags, layout) ----
  router.get('/api/admin/config', requireAdmin, async (ctx) => {
    send(ctx.res, 200, readConfig(db));
  });

  router.put('/api/admin/config', requireAdmin, async (ctx) => {
    const b = await readJson(ctx.req, 64 * 1024);
    const now = Date.now();
    for (const k of CONFIG_KEYS) {
      if (!(k in b)) continue;
      if (b[k] === null) { db.prepare('DELETE FROM app_config WHERE key = ?').run(k); continue; }
      if (typeof b[k] !== 'object') fail(400, `${k} must be an object.`);
      db.prepare(`INSERT INTO app_config (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
        .run(k, JSON.stringify(b[k]), now, ctx.user.id);
      audit(ctx.user.id, 'config.' + k, '');
    }
    send(ctx.res, 200, readConfig(db));
  });

  router.get('/api/admin/audit', requireAdmin, async (ctx) => {
    const rows = db.prepare(`SELECT a.id, a.action, a.target, a.at, u.email AS actor
      FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200`).all();
    send(ctx.res, 200, { entries: rows });
  });
}

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

module.exports = { register };
