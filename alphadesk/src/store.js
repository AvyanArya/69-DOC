// Local, per-browser storage for settings, the portfolio and daily pick history.
import { useEffect, useState } from 'react';

const KEY = 'alphadesk:';
const read = (k, fallback) => {
  try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const write = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* private mode */ } };

const listeners = new Map();
function emit(k, v) { (listeners.get(k) || []).forEach((fn) => fn(v)); }

export function useStored(k, fallback) {
  const [v, setV] = useState(() => read(k, fallback));
  useEffect(() => {
    const fn = (nv) => setV(nv);
    listeners.set(k, [...(listeners.get(k) || []), fn]);
    return () => listeners.set(k, (listeners.get(k) || []).filter((f) => f !== fn));
  }, [k]);
  const set = (next) => {
    const val = typeof next === 'function' ? next(read(k, fallback)) : next;
    write(k, val); emit(k, val);
  };
  return [v, set];
}

const today = () => new Date().toISOString().slice(0, 10);
export const DEFAULT_SETTINGS = { capital: 100000, profile: 'balanced', startDate: today(), weeks: 6, plan: 'balanced' };
export const useSettings = () => {
  const [s, set] = useStored('settings', DEFAULT_SETTINGS);
  return [{ ...DEFAULT_SETTINGS, ...s }, set];
};

/** Portfolio = list of trades; positions are derived. */
export const usePortfolio = () => useStored('trades', []);

export function positionsFrom(trades) {
  const pos = {};
  let realized = 0;
  for (const t of [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)) {
    const p = (pos[t.symbol] ||= { symbol: t.symbol, name: t.name || t.symbol, shares: 0, cost: 0 });
    if (t.side === 'buy') {
      p.cost += t.shares * t.price;
      p.shares += t.shares;
    } else {
      const sell = Math.min(t.shares, p.shares);
      const avg = p.shares ? p.cost / p.shares : 0;
      realized += sell * (t.price - avg);
      p.cost -= avg * sell;
      p.shares -= sell;
    }
  }
  const open = Object.values(pos).filter((p) => p.shares > 1e-9).map((p) => ({ ...p, avg: p.cost / p.shares }));
  const cashFlow = trades.reduce((a, t) => a + (t.side === 'buy' ? -1 : 1) * t.shares * t.price, 0);
  return { open, realized, cashFlow };
}

/** Records each day's top pick so you can see how past picks performed. */
export function recordPick(briefing) {
  if (!briefing || !briefing.topPick || briefing.demo) return;
  const hist = read('pickHistory', []);
  if (hist.some((h) => h.date === briefing.date)) return;
  hist.unshift({
    date: briefing.date,
    symbol: briefing.topPick.symbol,
    name: briefing.topPick.name,
    price: briefing.topPick.price,
    score: briefing.topPick.score,
    area: briefing.hottest ? briefing.hottest.name : null,
  });
  write('pickHistory', hist.slice(0, 60));
  emit('pickHistory', hist.slice(0, 60));
}
export const usePickHistory = () => useStored('pickHistory', []);
