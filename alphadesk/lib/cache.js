// Tiny TTL cache. In-memory first; mirrored to the OS temp dir so a warm
// serverless instance (or a restarted local server) can reuse recent data
// instead of hammering the free data providers.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mem = new Map();
const DIR = path.join(os.tmpdir(), 'alphadesk-cache');
try { fs.mkdirSync(DIR, { recursive: true }); } catch { /* read-only fs: memory only */ }

const fileFor = (key) => path.join(DIR, key.replace(/[^a-z0-9._-]/gi, '_').slice(0, 180) + '.json');

export function getCached(key, { allowStale = false } = {}) {
  let hit = mem.get(key);
  if (!hit) {
    try {
      hit = JSON.parse(fs.readFileSync(fileFor(key), 'utf8'));
      mem.set(key, hit);
    } catch { return undefined; }
  }
  if (!allowStale && hit.expires < Date.now()) return undefined;
  return hit.value;
}

export function setCached(key, value, ttlMs) {
  const hit = { value, expires: Date.now() + ttlMs, savedAt: Date.now() };
  mem.set(key, hit);
  try { fs.writeFileSync(fileFor(key), JSON.stringify(hit)); } catch { /* ignore */ }
  return value;
}

// Coalesces concurrent calls for the same key and caches the result.
// If the producer fails, a stale value (if any) is returned instead.
const inflight = new Map();
export async function cached(key, ttlMs, producer) {
  const fresh = getCached(key);
  if (fresh !== undefined) return fresh;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      return setCached(key, await producer(), ttlMs);
    } catch (err) {
      const stale = getCached(key, { allowStale: true });
      if (stale !== undefined) return stale;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
