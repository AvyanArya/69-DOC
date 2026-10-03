'use strict';
// Community: member profiles (opt-in directory), posts, likes, replies,
// connections and reports. Everything is moderated from the admin portal.
const { fail, send, readJson, str, intId, linkedin } = require('../http');

const TAGS = ['Update', 'Milestone', 'Question', 'Looking to connect', 'Opportunity'];
const PAGE = 20;

function register(router, { db, requireUser, limit, audit }) {
  const profileOf = (userId) => db.prepare('SELECT * FROM community_profiles WHERE user_id = ?').get(userId);
  const profileView = (p) => (p ? { displayName: p.display_name, headline: p.headline, linkedin: p.linkedin, listed: !!p.listed } : null);
  const needProfile = (ctx) => {
    const p = profileOf(ctx.user.id);
    if (!p) fail(409, 'Set up your community profile first.', 'no_profile');
    return p;
  };
  const rate = (ctx, bucket, max) => {
    if (!limit(`${bucket}:${ctx.user.id}`, max, 60000)) fail(429, 'You are doing that too often. Please wait a minute.');
  };

  const postView = (r, me) => ({
    id: r.id, tag: r.tag, body: r.body, link: r.link || null, createdAt: r.created_at,
    author: { id: r.user_id, name: r.author, headline: r.headline || '' },
    likes: r.likes, liked: !!r.liked, replies: r.replies, mine: r.user_id === me,
  });

  const FEED_SQL = `
    SELECT p.id, p.tag, p.body, p.link, p.created_at, p.user_id,
           COALESCE(cp.display_name, u.name) AS author, COALESCE(cp.headline, '') AS headline,
           (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likes,
           EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = :me) AS liked,
           (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id AND r.hidden = 0) AS replies
      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN community_profiles cp ON cp.user_id = p.user_id
     WHERE p.hidden = 0 AND u.status = 'active'`;

  // ---- profile ----
  router.get('/api/community/profile', requireUser, async (ctx) => {
    send(ctx.res, 200, { profile: profileView(profileOf(ctx.user.id)) });
  });

  router.put('/api/community/profile', requireUser, async (ctx) => {
    const b = await readJson(ctx.req);
    const displayName = str(b.displayName, { min: 1, max: 60, name: 'Display name' });
    const headline = str(b.headline || '', { max: 120, name: 'Headline' });
    const li = linkedin(b.linkedin);
    const listed = b.listed === false ? 0 : 1;
    db.prepare(`INSERT INTO community_profiles (user_id, display_name, headline, linkedin, listed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, headline = excluded.headline,
        linkedin = excluded.linkedin, listed = excluded.listed, updated_at = excluded.updated_at`)
      .run(ctx.user.id, displayName, headline, li, listed, Date.now());
    send(ctx.res, 200, { profile: profileView(profileOf(ctx.user.id)) });
  });

  // ---- stats for the header ----
  router.get('/api/community/stats', requireUser, async (ctx) => {
    const one = (sql, ...a) => db.prepare(sql).get(...a).n;
    send(ctx.res, 200, {
      members: one("SELECT COUNT(*) AS n FROM community_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.listed = 1 AND u.status = 'active'"),
      posts: one('SELECT COUNT(*) AS n FROM posts WHERE hidden = 0'),
      opportunities: one("SELECT COUNT(*) AS n FROM posts WHERE hidden = 0 AND tag = 'Opportunity'"),
      connections: one('SELECT COUNT(*) AS n FROM connections WHERE user_id = ?', ctx.user.id),
    });
  });

  // ---- feed ----
  router.get('/api/community/feed', requireUser, async (ctx) => {
    const tag = TAGS.includes(ctx.query.get('tag')) ? ctx.query.get('tag') : '';
    const before = Number(ctx.query.get('before')) || 0;
    const rows = db.prepare(`${FEED_SQL}
       AND (:tag = '' OR p.tag = :tag) AND (:before = 0 OR p.id < :before)
     ORDER BY p.id DESC LIMIT ${PAGE + 1}`).all({ me: ctx.user.id, tag, before });
    send(ctx.res, 200, {
      posts: rows.slice(0, PAGE).map((r) => postView(r, ctx.user.id)),
      more: rows.length > PAGE,
      tags: TAGS,
    });
  });

  router.post('/api/community/posts', requireUser, async (ctx) => {
    needProfile(ctx);
    rate(ctx, 'post', 6);
    const b = await readJson(ctx.req);
    const body = str(b.body, { min: 1, max: 2000, name: 'Post' });
    const tag = TAGS.includes(b.tag) ? b.tag : 'Update';
    const link = linkedin(b.link);
    const r = db.prepare('INSERT INTO posts (user_id, tag, body, link, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(ctx.user.id, tag, body, link, Date.now());
    const row = db.prepare(`${FEED_SQL} AND p.id = :id`).get({ me: ctx.user.id, id: r.lastInsertRowid });
    send(ctx.res, 201, { post: postView(row, ctx.user.id) });
  });

  router.delete('/api/community/posts/:id', requireUser, async (ctx) => {
    const id = intId(ctx.params.id);
    const p = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);
    if (!p) fail(404, 'That post no longer exists.');
    const isAdmin = ctx.user.role === 'admin';
    if (p.user_id !== ctx.user.id && !isAdmin) fail(403, 'You can only delete your own posts.');
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    if (p.user_id !== ctx.user.id) audit(ctx.user.id, 'post.delete', String(id));
    send(ctx.res, 200, { ok: true });
  });

  router.post('/api/community/posts/:id/like', requireUser, async (ctx) => {
    const id = intId(ctx.params.id);
    if (!db.prepare('SELECT 1 FROM posts WHERE id = ? AND hidden = 0').get(id)) fail(404, 'That post no longer exists.');
    rate(ctx, 'like', 60);
    const had = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(id, ctx.user.id);
    if (had) db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(id, ctx.user.id);
    else db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(id, ctx.user.id);
    const likes = db.prepare('SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?').get(id).n;
    send(ctx.res, 200, { liked: !had, likes });
  });

  // ---- replies ----
  router.get('/api/community/posts/:id/replies', requireUser, async (ctx) => {
    const id = intId(ctx.params.id);
    const rows = db.prepare(`SELECT r.id, r.body, r.created_at, r.user_id,
        COALESCE(cp.display_name, u.name) AS author, COALESCE(cp.headline, '') AS headline
      FROM replies r JOIN users u ON u.id = r.user_id LEFT JOIN community_profiles cp ON cp.user_id = r.user_id
      WHERE r.post_id = ? AND r.hidden = 0 AND u.status = 'active' ORDER BY r.id ASC LIMIT 200`).all(id);
    send(ctx.res, 200, { replies: rows.map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at,
      author: { id: r.user_id, name: r.author, headline: r.headline }, mine: r.user_id === ctx.user.id })) });
  });

  router.post('/api/community/posts/:id/replies', requireUser, async (ctx) => {
    needProfile(ctx);
    rate(ctx, 'reply', 12);
    const id = intId(ctx.params.id);
    if (!db.prepare('SELECT 1 FROM posts WHERE id = ? AND hidden = 0').get(id)) fail(404, 'That post no longer exists.');
    const b = await readJson(ctx.req);
    const body = str(b.body, { min: 1, max: 1000, name: 'Reply' });
    const r = db.prepare('INSERT INTO replies (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(id, ctx.user.id, body, Date.now());
    const p = profileOf(ctx.user.id);
    send(ctx.res, 201, { reply: { id: r.lastInsertRowid, body, createdAt: Date.now(),
      author: { id: ctx.user.id, name: p.display_name, headline: p.headline }, mine: true } });
  });

  router.delete('/api/community/replies/:id', requireUser, async (ctx) => {
    const id = intId(ctx.params.id);
    const r = db.prepare('SELECT user_id FROM replies WHERE id = ?').get(id);
    if (!r) fail(404, 'That reply no longer exists.');
    if (r.user_id !== ctx.user.id && ctx.user.role !== 'admin') fail(403, 'You can only delete your own replies.');
    db.prepare('DELETE FROM replies WHERE id = ?').run(id);
    send(ctx.res, 200, { ok: true });
  });

  // ---- reports ----
  router.post('/api/community/report', requireUser, async (ctx) => {
    rate(ctx, 'report', 10);
    const b = await readJson(ctx.req);
    const kind = b.kind === 'reply' ? 'reply' : 'post';
    const id = intId(b.id);
    const reason = str(b.reason || 'Not specified', { max: 300, name: 'Reason' });
    const exists = db.prepare(`SELECT 1 FROM ${kind === 'reply' ? 'replies' : 'posts'} WHERE id = ?`).get(id);
    if (!exists) fail(404, 'That no longer exists.');
    const dup = db.prepare("SELECT 1 FROM reports WHERE kind = ? AND target_id = ? AND reporter_id = ? AND status = 'open'").get(kind, id, ctx.user.id);
    if (!dup) {
      db.prepare('INSERT INTO reports (kind, target_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(kind, id, ctx.user.id, reason, Date.now());
    }
    send(ctx.res, 200, { ok: true });
  });

  // ---- members and connections ----
  router.get('/api/community/members', requireUser, async (ctx) => {
    const q = String(ctx.query.get('q') || '').trim().slice(0, 60);
    const like = '%' + q.replace(/[%_]/g, '') + '%';
    const rows = db.prepare(`SELECT cp.user_id, cp.display_name, cp.headline, cp.linkedin,
        EXISTS (SELECT 1 FROM connections c WHERE c.user_id = :me AND c.target_id = cp.user_id) AS connected
      FROM community_profiles cp JOIN users u ON u.id = cp.user_id
      WHERE cp.listed = 1 AND u.status = 'active' AND cp.user_id != :me
        AND (:q = '' OR cp.display_name LIKE :like OR cp.headline LIKE :like)
      ORDER BY cp.updated_at DESC LIMIT 60`).all({ me: ctx.user.id, q, like });
    send(ctx.res, 200, { members: rows.map((r) => ({ id: r.user_id, name: r.display_name, headline: r.headline,
      linkedin: r.linkedin || null, connected: !!r.connected })) });
  });

  router.get('/api/community/connections', requireUser, async (ctx) => {
    const rows = db.prepare(`SELECT c.target_id, COALESCE(cp.display_name, u.name) AS name, COALESCE(cp.headline, '') AS headline
      FROM connections c JOIN users u ON u.id = c.target_id LEFT JOIN community_profiles cp ON cp.user_id = c.target_id
      WHERE c.user_id = ? AND u.status = 'active' ORDER BY c.created_at DESC`).all(ctx.user.id);
    send(ctx.res, 200, { connections: rows.map((r) => ({ id: r.target_id, name: r.name, headline: r.headline })) });
  });

  router.post('/api/community/connections/:id', requireUser, async (ctx) => {
    const target = intId(ctx.params.id);
    if (target === ctx.user.id) fail(400, 'That is you.');
    const listed = db.prepare("SELECT 1 FROM community_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.user_id = ? AND cp.listed = 1 AND u.status = 'active'").get(target);
    const had = db.prepare('SELECT 1 FROM connections WHERE user_id = ? AND target_id = ?').get(ctx.user.id, target);
    if (!had && !listed) fail(404, 'That member is not in the directory.');
    rate(ctx, 'connect', 30);
    if (had) db.prepare('DELETE FROM connections WHERE user_id = ? AND target_id = ?').run(ctx.user.id, target);
    else db.prepare('INSERT INTO connections (user_id, target_id, created_at) VALUES (?, ?, ?)').run(ctx.user.id, target, Date.now());
    send(ctx.res, 200, { connected: !had });
  });
}

module.exports = { register, TAGS };
