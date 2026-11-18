'use strict';
// Team-preview feedback: bugs, ideas and opinions from the "Send feedback"
// button. Anyone who can see the site may send it (on staging the whole site
// is behind SITE_PASSWORD); admins read it in the portal.
const { fail, send, readJson, str } = require('../http');

const KINDS = ['bug', 'idea', 'opinion'];

function register(router, { db, config, limit }) {
  router.post('/api/feedback', async (ctx) => {
    if (!config.FEEDBACK_ENABLED) fail(404, 'Not found.');
    const who = ctx.user ? 'u' + ctx.user.id : ctx.ip;
    if (!limit('fb:' + who, 10, 10 * 60e3)) fail(429, 'Thanks! That is a lot of feedback at once. Please wait a few minutes.');
    const b = await readJson(ctx.req, 16 * 1024);
    const kind = KINDS.includes(b.kind) ? b.kind : fail(400, 'Choose bug, idea or opinion.');
    const message = str(b.message, { min: 3, max: 4000, name: 'Your feedback' });
    const page = String(b.page || '').slice(0, 300);
    const contact = str(b.contact || '', { max: 200, name: 'Contact' });
    const r = db.prepare(`INSERT INTO feedback (user_id, kind, message, page, contact, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(ctx.user ? ctx.user.id : null, kind, message, page, contact,
      String(ctx.req.headers['user-agent'] || '').slice(0, 300), Date.now());
    send(ctx.res, 201, { ok: true, id: Number(r.lastInsertRowid) });
  });
}

module.exports = { register, KINDS };
