// fetch wrapper with timeout + polite retries for rate limits (429) and 5xx.
const UA = 'Mozilla/5.0 (compatible; AlphaDesk/1.0; personal research app)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url, { retries = 2, timeoutMs = 12000, headers = {} } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*', ...headers }, signal: ctrl.signal });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        lastErr.status = res.status;
        await sleep(800 * 2 ** attempt + Math.random() * 400);
        continue;
      }
      const text = await res.text();
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        err.status = res.status;
        err.body = text.slice(0, 300);
        throw err;
      }
      return text;
    } catch (err) {
      lastErr = err;
      if (err.status && err.status < 500 && err.status !== 429) throw err;
      if (attempt < retries) await sleep(600 * 2 ** attempt);
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

export async function fetchJson(url, opts) {
  return JSON.parse(await fetchText(url, opts));
}

// Run async jobs with a concurrency cap.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); } catch (err) { out[idx] = { error: err.message }; }
    }
  });
  await Promise.all(workers);
  return out;
}
