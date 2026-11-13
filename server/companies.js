'use strict';
// Company name -> domain -> logo.
//
// A subscription is stored as whatever the user typed ("Netflix Premium",
// "iCloud 2TB"). This turns that into a company, finds its domain, fetches a
// logo once and caches it in the database. Nothing here is a fixed list of
// logos: any company resolves the same way, and an admin can correct a
// domain, which locks it.
//
// Domain lookup, first hit wins:
//   1. an admin-set (locked) row
//   2. a fresh cached row
//   3. Logo.dev brand search          (LOGO_DEV_SECRET_KEY)
//   4. Brandfetch brand search        (BRANDFETCH_CLIENT_ID)
//   5. the domain the client already knows, then guesses from the name,
//      each verified by actually finding an icon for it
// Logo fetch for a domain: Logo.dev image API (LOGO_DEV_PUBLISHABLE_KEY),
// then DuckDuckGo's icon service, then Google's.

const DAY = 864e5;
const FRESH_FOUND = 30 * DAY;
const FRESH_MISSING = 3 * DAY;
const MAX_LOGO_BYTES = 300 * 1024;
const MIN_LOGO_BYTES = 120;

// Words that describe a plan or a product line rather than the company.
const PLAN_WORDS = new Set(['premium', 'plus', 'pro', 'basic', 'standard', 'family', 'individual', 'student',
  'duo', 'annual', 'yearly', 'monthly', 'subscription', 'membership', 'plan', 'tier', 'prime', 'unlimited',
  'cloud', 'creative', 'music', 'video', 'tv', 'one', 'pass', 'app', 'apps', 'online', 'digital', 'ultimate',
  'deluxe', 'max', 'lite', 'business', 'personal', 'home', 'edition', 'account']);
// Names made only of these are a category, not a company. They get a monogram.
const GENERIC = new Set(['news', 'gym', 'fitness', 'music', 'video', 'tv', 'streaming', 'storage', 'cloud',
  'software', 'gaming', 'games', 'magazine', 'newspaper', 'insurance', 'phone', 'mobile', 'internet', 'broadband',
  'boutique', 'local', 'my', 'the', 'other', 'misc', 'subscription', 'app', 'premium', 'online', 'yoga', 'meal',
  'kit', 'box', 'club', 'course', 'courses', 'learning', 'vpn', 'dating', 'audio', 'books', 'book']);

function normalise(name) {
  const cleaned = String(name || '')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/\b\d+\s?(tb|gb|mb|months?|yrs?|years?)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  const core = words.filter((w) => !PLAN_WORDS.has(w));
  return { cleaned, words, core: core.length ? core : words };
}

const keyFor = (name) => normalise(name).core.join('-').slice(0, 64);

function isGeneric(name) {
  const { core } = normalise(name);
  return !core.length || core.every((w) => GENERIC.has(w) || w.length < 2);
}

function validDomain(d) {
  const s = String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  return /^(?=.{3,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(s) ? s : '';
}

function guessDomains(name) {
  if (isGeneric(name)) return [];
  const { core } = normalise(name);
  const out = [];
  const squash = core.join('');
  if (squash.length >= 2) out.push(squash + '.com');
  // "Xbox Game" -> xbox.com, but never from a generic first word.
  if (core.length > 1 && core[0].length >= 3 && !GENERIC.has(core[0])) out.push(core[0] + '.com');
  if (squash.length >= 2) out.push(squash + '.co', squash + '.io', squash + '.app');
  return [...new Set(out)].slice(0, 5);
}

function createCompanies({ db, config, fetchImpl = globalThis.fetch, log = console }) {
  const inflight = new Map();

  const getRow = db.prepare('SELECT * FROM companies WHERE key = ?');
  const upsert = db.prepare(`INSERT INTO companies (key, name, domain, source, status, logo, logo_type, locked, checked_at)
    VALUES (:key, :name, :domain, :source, :status, :logo, :logo_type, :locked, :checked_at)
    ON CONFLICT(key) DO UPDATE SET name=excluded.name, domain=excluded.domain, source=excluded.source,
      status=excluded.status, logo=excluded.logo, logo_type=excluded.logo_type, locked=excluded.locked,
      checked_at=excluded.checked_at`);

  async function fetchWithTimeout(url, opts = {}, ms = 4500) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      return await fetchImpl(url, { ...opts, signal: ctl.signal, redirect: 'follow',
        headers: { 'User-Agent': 'LumeraLogoBot/1.0', ...(opts.headers || {}) } });
    } finally { clearTimeout(t); }
  }

  async function tryImage(url) {
    try {
      const r = await fetchWithTimeout(url);
      if (!r.ok) return null;
      const type = (r.headers.get('content-type') || '').split(';')[0].trim();
      if (!/^image\//.test(type)) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < MIN_LOGO_BYTES || buf.length > MAX_LOGO_BYTES) return null;
      return { bytes: buf, type };
    } catch (e) { return null; }
  }

  async function logoFor(domain) {
    const sources = [];
    if (config.LOGO_DEV_PUBLISHABLE_KEY) {
      sources.push(`https://img.logo.dev/${domain}?token=${encodeURIComponent(config.LOGO_DEV_PUBLISHABLE_KEY)}&size=128&format=png&fallback=404`);
    }
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
    sources.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
    for (const url of sources) {
      const img = await tryImage(url);
      if (img) return img;
    }
    return null;
  }

  async function searchProviders(name) {
    if (config.LOGO_DEV_SECRET_KEY) {
      try {
        const r = await fetchWithTimeout('https://api.logo.dev/search?q=' + encodeURIComponent(name),
          { headers: { Authorization: 'Bearer ' + config.LOGO_DEV_SECRET_KEY } });
        if (r.ok) {
          const list = await r.json();
          const d = Array.isArray(list) && list[0] && validDomain(list[0].domain);
          if (d) return { domain: d, source: 'logo.dev', display: list[0].name };
        }
      } catch (e) { log.warn('[companies] logo.dev search failed:', e.message); }
    }
    if (config.BRANDFETCH_CLIENT_ID) {
      try {
        const r = await fetchWithTimeout('https://api.brandfetch.io/v2/search/' + encodeURIComponent(name)
          + '?c=' + encodeURIComponent(config.BRANDFETCH_CLIENT_ID));
        if (r.ok) {
          const list = await r.json();
          const d = Array.isArray(list) && list[0] && validDomain(list[0].domain);
          if (d) return { domain: d, source: 'brandfetch', display: list[0].name };
        }
      } catch (e) { log.warn('[companies] Brandfetch search failed:', e.message); }
    }
    return null;
  }

  async function lookup(key, name, hint) {
    const now = Date.now();
    if (!config.LOGO_LOOKUPS) {
      const domain = validDomain(hint) || null;
      upsert.run({ key, name, domain, source: 'offline', status: 'missing', logo: null, logo_type: null, locked: 0, checked_at: now });
      return getRow.get(key);
    }
    let found = await searchProviders(name);
    const candidates = [];
    if (found) candidates.push(found);
    const h = validDomain(hint);
    if (h) candidates.push({ domain: h, source: 'client' });
    for (const d of guessDomains(name)) candidates.push({ domain: d, source: 'heuristic' });

    for (const c of candidates) {
      const img = await logoFor(c.domain);
      if (img) {
        upsert.run({ key, name, domain: c.domain, source: c.source, status: 'found', logo: img.bytes,
          logo_type: img.type, locked: 0, checked_at: now });
        return getRow.get(key);
      }
    }
    upsert.run({ key, name, domain: found ? found.domain : (h || null), source: found ? found.source : 'auto',
      status: 'missing', logo: null, logo_type: null, locked: 0, checked_at: now });
    return getRow.get(key);
  }

  // Resolve a name to a cached company row, looking it up if needed.
  async function resolve(name, hint) {
    const display = String(name || '').trim().slice(0, 80);
    if (!display) return null;
    const key = keyFor(display);
    if (!key) return null;
    const row = getRow.get(key);
    if (row && row.locked) return row;
    if (row) {
      const age = Date.now() - row.checked_at;
      if (row.status === 'found' && age < FRESH_FOUND) return row;
      if (row.status === 'missing' && age < FRESH_MISSING) return row;
    }
    if (isGeneric(display) && !validDomain(hint)) {
      upsert.run({ key, name: display, domain: null, source: 'auto', status: 'missing', logo: null, logo_type: null,
        locked: 0, checked_at: Date.now() });
      return getRow.get(key);
    }
    if (!inflight.has(key)) {
      inflight.set(key, lookup(key, display, hint).finally(() => inflight.delete(key)));
    }
    return inflight.get(key);
  }

  // Admin correction: set the domain, fetch its logo, lock the row.
  async function setDomain(key, name, domain) {
    const d = validDomain(domain);
    if (!d) return null;
    const img = config.LOGO_LOOKUPS ? await logoFor(d) : null;
    upsert.run({ key, name, domain: d, source: 'admin', status: img ? 'found' : 'missing',
      logo: img ? img.bytes : null, logo_type: img ? img.type : null, locked: 1, checked_at: Date.now() });
    return getRow.get(key);
  }

  async function refresh(key) {
    const row = getRow.get(key);
    if (!row) return null;
    if (row.locked && row.domain) return setDomain(key, row.name, row.domain);
    db.prepare('UPDATE companies SET checked_at = 0 WHERE key = ?').run(key);
    return resolve(row.name, row.domain);
  }

  const publicView = (row) => row && ({
    key: row.key, name: row.name, domain: row.domain || null, status: row.status, source: row.source,
    locked: !!row.locked, checkedAt: row.checked_at,
    logoUrl: row.status === 'found' ? '/api/companies/logo/' + encodeURIComponent(row.key) : null,
  });

  return { resolve, setDomain, refresh, publicView, keyFor, isGeneric, guessDomains, validDomain };
}

module.exports = { createCompanies, normalise, keyFor, isGeneric, guessDomains, validDomain };
