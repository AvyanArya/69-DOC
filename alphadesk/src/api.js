import { useCallback, useEffect, useRef, useState } from 'react';
import { SNAPSHOT, snapshotApi } from './snapshot.js';

export async function api(path, { method = 'GET', body } = {}) {
  if (SNAPSHOT) return snapshotApi(path, method);
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = { error: `Server returned ${res.status}` }; }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Simple client cache so moving between pages feels instant.
const memo = new Map();

/** GET with loading/error state. `ttl` ms keeps results warm across pages. */
export function useApi(path, { ttl = 5 * 60 * 1000 } = {}) {
  const hit = path ? memo.get(path) : null;
  const [state, setState] = useState(() => ({ data: hit && hit.exp > Date.now() ? hit.data : null, error: null, loading: !hit }));
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const load = useCallback(async (force = false) => {
    if (!path) return;
    const h = memo.get(path);
    if (!force && h && h.exp > Date.now()) { setState({ data: h.data, error: null, loading: false }); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(path);
      memo.set(path, { data, exp: Date.now() + ttl });
      if (live.current) setState({ data, error: null, loading: false });
    } catch (err) {
      if (live.current) setState((s) => ({ ...s, error: err.message, loading: false }));
    }
  }, [path, ttl]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: () => load(true) };
}
