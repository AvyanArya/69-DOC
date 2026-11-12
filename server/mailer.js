'use strict';
// Outgoing email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// No SDK: one POST with fetch. Without RESEND_API_KEY, MAIL_FROM and
// PUBLIC_URL the mailer reports itself as disabled and sends nothing.
//
// Links in emails are always built from PUBLIC_URL, never from the request's
// Host header, so a forged Host cannot point a reset link at another site.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function createMailer({ config, fetchImpl = globalThis.fetch, log = console }) {
  const enabled = !!(config.RESEND_API_KEY && config.MAIL_FROM && config.PUBLIC_URL);

  async function send({ to, subject, text, html }) {
    if (!enabled) return { sent: false, reason: 'not-configured' };
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        signal: ctl.signal,
        headers: { Authorization: 'Bearer ' + config.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.MAIL_FROM, to: [to], subject, text, html }),
      });
      if (!r.ok) {
        log.error(`[lumera] mail to ${to.replace(/^(.).*@/, '$1***@')} failed: HTTP ${r.status}`);
        return { sent: false, reason: 'provider-' + r.status };
      }
      return { sent: true };
    } catch (err) {
      log.error('[lumera] mail send failed: ' + (err && err.message));
      return { sent: false, reason: 'network' };
    } finally {
      clearTimeout(t);
    }
  }

  const link = (pathAndHash) => (config.PUBLIC_URL || '') + pathAndHash;

  function resetEmail({ name, url, minutes }) {
    const subject = 'Reset your Lumera password';
    const text = `Hi ${name},\n\nSomeone asked to reset the password for your Lumera account. If it was you, open this link to choose a new one:\n\n${url}\n\nIt works once and expires in ${minutes} minutes. If you did not ask for this, ignore this email; your password has not changed.\n\nLumera`;
    const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1d1b2b">
<h2 style="font-weight:600">Reset your Lumera password</h2>
<p>Hi ${esc(name)},</p>
<p>Someone asked to reset the password for your Lumera account. If it was you, choose a new one here:</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Choose a new password</a></p>
<p style="color:#555;font-size:14px">The link works once and expires in ${minutes} minutes. If you did not ask for this, ignore this email; your password has not changed.</p>
</div>`;
    return { subject, text, html };
  }

  return { enabled, send, link, resetEmail };
}

module.exports = { createMailer };
