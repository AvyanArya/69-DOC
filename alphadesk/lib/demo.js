// DEMO MODE ONLY (set DEMO_DATA=1). Generates deterministic, obviously fake
// price series so the UI can be developed or shown offline. The app shows a
// "Demo data" banner whenever this is on - never trade off these numbers.
import { STOCKS, SECTORS, THEMES, COMMODITIES, INDICES, localSearch } from './universe.js';

export const isDemo = () => process.env.DEMO_DATA === '1' || process.env.DEMO_DATA === 'true';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0; return (s % 100000) / 100000; };
}
function gauss(r) {
  return Math.sqrt(-2 * Math.log(r() || 1e-6)) * Math.cos(2 * Math.PI * r());
}

const NAMES = Object.fromEntries([
  ...STOCKS.map((s) => [s.symbol, s.name]),
  ...SECTORS.map((s) => [s.symbol, `${s.name} Select Sector SPDR`]),
  ...THEMES.map((s) => [s.symbol, `${s.name} ETF`]),
  ...COMMODITIES.map((c) => [c.symbol, `${c.name} futures`]),
  ...COMMODITIES.map((c) => [c.etf, `${c.name} ETF`]),
  ...INDICES.map((s) => [s.symbol, s.name]),
]);

export function demoSeries(symbol, range = '1y') {
  const r = rng(hash(symbol));
  const want = range === '6mo' ? 126 : range === '3mo' ? 63 : range === '2y' ? 504 : 252;
  const days = 504; // always generate 2y so every range is a slice of the same series
  const drift = (r() - 0.42) * 0.0035;
  const vol = symbol === '^VIX' ? 0.06 : 0.008 + r() * 0.03;
  let p = symbol === '^VIX' ? 16 : 20 + r() * 480;
  const t = [], c = [], h = [], l = [], v = [];
  const now = new Date();
  now.setUTCHours(20, 0, 0, 0);
  const dates = [];
  const d = new Date(now);
  while (dates.length < days) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) dates.unshift(Math.floor(d.getTime() / 1000));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  const baseVol = 1e6 + r() * 4e7;
  for (let i = 0; i < days; i++) {
    const regime = Math.sin(i / 37 + r()) * 0.002;
    p = Math.max(1, p * (1 + drift + regime + vol * gauss(r)));
    const range_ = p * vol * (0.6 + r());
    t.push(dates[i]); c.push(+p.toFixed(2));
    h.push(+(p + range_ * r()).toFixed(2)); l.push(+(p - range_ * r()).toFixed(2));
    v.push(Math.round(baseVol * (0.6 + r() * 0.9)));
  }
  const cut = days - want;
  for (const a of [t, c, h, l, v]) a.splice(0, cut);
  const price = c[c.length - 1];
  return {
    symbol, name: NAMES[symbol] || symbol, type: 'EQUITY', currency: 'USD', exchange: 'DEMO',
    price, changePct: ((price - c[c.length - 2]) / c[c.length - 2]) * 100,
    high52: Math.max(...h.slice(-252)), low52: Math.min(...l.slice(-252)), dayHigh: h[h.length - 1], dayLow: l[l.length - 1],
    volume: v[v.length - 1], marketTime: t[t.length - 1], t, c, h, l, v, ohlc: true,
  };
}

export function demoSearch(q) {
  return localSearch(q).map((x) => ({ ...x, exchange: 'DEMO' }));
}

export function demoNews(query) {
  const r = rng(hash(query + new Date().toDateString()));
  const templates = [
    ['{q} shares climb after analysts raise price targets', 'bullish'],
    ['What to watch for {q} ahead of next earnings report', 'neutral'],
    ['{q} faces margin pressure, says sell-side note', 'bearish'],
    ['Investors pile into {q} as sector momentum builds', 'bullish'],
    ['{q}: three charts that explain the recent move', 'neutral'],
  ];
  return templates.map(([tpl], i) => ({
    title: `[Demo] ${tpl.replace('{q}', query)}`,
    link: 'https://example.com/demo-news',
    source: 'Demo Wire',
    published: new Date(Date.now() - (i * 7 + Math.floor(r() * 6)) * 3600 * 1000).toISOString(),
  }));
}
