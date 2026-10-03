'use strict';
// The signed-in member's own data: questionnaire answers and figures
// (encrypted at rest), export, password change and account deletion.
const { fail, send, readJson } = require('../http');
const { encrypt, decrypt, hashPassword, verifyPassword } = require('../security');
const { userView } = require('./auth');

const STATE_LIMIT = 512 * 1024;
// Only these keys are kept, so the store cannot become a dumping ground.
const STATE_KEYS = ['profile', 'expenses', 'balances', 'onboarded', 'lastUpdated', 'lastPrompt', 'lang',
  'subs', 'goals', 'budgetCustom', 'xp', 'badges'];

function register(router, { db, key, requireUser }) {
  const readState = (userId) => {
    const row = db.prepare('SELECT payload, updated_at FROM user_state WHERE user_id = ?').get(userId);
    if (!row) return { state: null, updatedAt: 0 };
    return { state: decrypt(key, row.payload), updatedAt: row.updated_at };
  };

  router.get('/api/me/state', requireUser, async (ctx) => {
    send(ctx.res, 200, readState(ctx.user.id));
  });

  router.put('/api/me/state', requireUser, async (ctx) => {
    const b = await readJson(ctx.req, STATE_LIMIT);
    const incoming = b.state && typeof b.state === 'object' ? b.state : null;
    if (!incoming) fail(400, 'Missing state.');
    const clean = {};
    for (const k of STATE_KEYS) if (k in incoming) clean[k] = incoming[k];
    const now = Date.now();
    db.prepare(`INSERT INTO user_state (user_id, payload, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
      .run(ctx.user.id, encrypt(key, clean), now);
    send(ctx.res, 200, { ok: true, updatedAt: now });
  });

  // Everything held about the member, as one JSON download (UK GDPR art. 15/20).
  router.get('/api/me/export', requireUser, async (ctx) => {
    const id = ctx.user.id;
    const out = {
      exportedAt: new Date().toISOString(),
      account: userView(ctx.user),
      ...readState(id),
      communityProfile: db.prepare('SELECT display_name, headline, linkedin, listed, updated_at FROM community_profiles WHERE user_id = ?').get(id) || null,
      posts: db.prepare('SELECT id, tag, body, link, created_at FROM posts WHERE user_id = ? ORDER BY id').all(id),
      replies: db.prepare('SELECT id, post_id, body, created_at FROM replies WHERE user_id = ? ORDER BY id').all(id),
      likes: db.prepare('SELECT post_id FROM post_likes WHERE user_id = ?').all(id).map((r) => r.post_id),
      connections: db.prepare('SELECT target_id, created_at FROM connections WHERE user_id = ?').all(id),
    };
    send(ctx.res, 200, out, { 'Content-Disposition': 'attachment; filename="lumera-export.json"' });
  });

  router.put('/api/me/password', requireUser, async (ctx) => {
    const b = await readJson(ctx.req);
    if (!verifyPassword(String(b.current || ''), ctx.user.password_hash)) fail(400, 'Your current password is not right.');
    const next = String(b.next || '');
    if (next.length < 10) fail(400, 'Use a password of at least 10 characters.');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), ctx.user.id);
    // Sign out every other device.
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(ctx.user.id, ctx.sessionId);
    send(ctx.res, 200, { ok: true });
  });

  // Erasure (UK GDPR art. 17). Cascades remove state, posts, likes, replies,
  // connections and sessions.
  router.delete('/api/me', requireUser, async (ctx) => {
    const b = await readJson(ctx.req);
    if (!verifyPassword(String(b.password || ''), ctx.user.password_hash)) fail(400, 'Enter your password to delete your account.');
    db.prepare('DELETE FROM users WHERE id = ?').run(ctx.user.id);
    ctx.res.setHeader('Set-Cookie', 'lm_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    send(ctx.res, 200, { ok: true });
  });
}

module.exports = { register, STATE_KEYS };
