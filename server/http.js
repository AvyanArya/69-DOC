'use strict';
// A small router and the request/response helpers the routes share.

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || undefined;
  }
}
const fail = (status, message, code) => { throw new HttpError(status, message, code); };
// A malformed %-escape in a URL is the client's mistake, not a server error.
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch (e) { return fail(400, 'Malformed URL.'); } };

function createRouter() {
  const routes = [];
  const add = (method, pattern, ...handlers) => {
    const keys = [];
    const rx = new RegExp('^' + pattern.replace(/\/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    routes.push({ method, rx, keys, handlers });
  };
  const match = (method, pathname) => {
    let pathMatched = false;
    for (const r of routes) {
      const m = r.rx.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = safeDecode(m[i + 1]); });
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  };
  return {
    get: (p, ...h) => add('GET', p, ...h),
    post: (p, ...h) => add('POST', p, ...h),
    put: (p, ...h) => add('PUT', p, ...h),
    patch: (p, ...h) => add('PATCH', p, ...h),
    delete: (p, ...h) => add('DELETE', p, ...h),
    match,
  };
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request body is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req, limit = 64 * 1024) {
  const raw = await readBody(req, limit);
  if (!raw.length) return {};
  try {
    const v = JSON.parse(raw.toString('utf8'));
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    throw new HttpError(400, 'Body must be valid JSON.');
  }
}

function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { /* ignore a malformed cookie */ }
  });
  return out;
}

function cookie(name, value, { maxAge, secure }) {
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAge != null) bits.push('Max-Age=' + Math.floor(maxAge));
  if (secure) bits.push('Secure');
  return bits.join('; ');
}

// Fixed-window counters per client and bucket. Enough to blunt password
// guessing and spam from one address; put a real limiter in front for scale.
// The map is capped so a flood of distinct addresses cannot exhaust memory.
const LIMITER_MAX_KEYS = 100000;
function createLimiter() {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, 60000).unref();
  return (key, max, windowMs) => {
    const now = Date.now();
    const v = hits.get(key);
    if (!v || v.reset < now) {
      if (hits.size >= LIMITER_MAX_KEYS) hits.delete(hits.keys().next().value);
      hits.set(key, { n: 1, reset: now + windowMs });
      return true;
    }
    v.n += 1;
    return v.n <= max;
  };
}

// ---- input checks ----
const str = (v, { min = 0, max = 500, name = 'Value' } = {}) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) fail(400, min > 1 ? `${name} must be at least ${min} characters.` : `${name} is required.`);
  if (s.length > max) fail(400, `${name} must be at most ${max} characters.`);
  return s;
};
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const email = (v) => {
  const s = str(v, { min: 3, max: 254, name: 'Email' }).toLowerCase();
  if (!EMAIL_RX.test(s)) fail(400, 'Please enter a valid email address.');
  return s;
};
const intId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) fail(400, 'Invalid id.');
  return n;
};
// New passwords: 10 to 200 characters, and not one of the passwords that
// appear first in every leaked-password list.
const COMMON_PASSWORDS = new Set(['1234567890', '12345678910', '0123456789', 'password12', 'password123',
  'password1234', 'qwertyuiop', 'iloveyou12', '1q2w3e4r5t', 'qwerty1234', 'qwerty12345', 'abcdefghij',
  'aaaaaaaaaa', '1111111111', 'letmein123', 'welcome123', 'football12', 'lumera1234', 'lumera12345']);
const newPassword = (v) => {
  const s = typeof v === 'string' ? v : '';
  if (s.length < 10) fail(400, 'Use a password of at least 10 characters.');
  if (s.length > 200) fail(400, 'That password is too long.');
  if (COMMON_PASSWORDS.has(s.toLowerCase()) || /^(.)\1+$/.test(s)) fail(400, 'That password is too easy to guess. Try a short phrase instead.');
  return s;
};

// Only https links to LinkedIn are accepted where the UI asks for LinkedIn.
const linkedin = (v) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch (e) { fail(400, 'Please paste a full LinkedIn link, starting with https://'); }
  if (u.protocol !== 'https:' || !/(^|\.)linkedin\.com$/i.test(u.hostname)) fail(400, 'Links must point to linkedin.com.');
  if (s.length > 300) fail(400, 'That link is too long.');
  return u.toString();
};

module.exports = { HttpError, fail, safeDecode, createRouter, readJson, send, parseCookies, cookie, createLimiter, str, email, intId, linkedin, newPassword };
