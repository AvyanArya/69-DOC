// Builds preview.html: ONE self-contained file (app + today's real market data)
// that opens with a double-click - no install, no server, no internet needed.
// Usage: npm run build:preview
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { buildBriefing, stockDetail } from '../lib/market.js';
import { mapLimit } from '../lib/http.js';
import { SECTORS, THEMES, COMMODITIES, INDICES, STOCKS } from '../lib/universe.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = (x) => (x == null || typeof x !== 'number' ? x : Number(x.toPrecision(6)));

console.log('1/3 Scanning the market…');
const briefing = await buildBriefing();

const symbols = new Set([
  ...briefing.stocks.slice(0, 45).map((s) => s.symbol),
  ...briefing.hottest.leaders.map((s) => s.symbol),
  ...briefing.plans.flatMap((p) => p.buckets.flatMap((b) => b.picks.map((x) => x.symbol))),
  ...SECTORS.map((s) => s.symbol), ...THEMES.map((s) => s.symbol),
  ...COMMODITIES.map((c) => c.etf), ...COMMODITIES.map((c) => c.symbol),
  ...INDICES.map((i) => i.symbol), 'TQQQ', 'SOXL',
]);

console.log(`2/3 Analysing ${symbols.size} tickers (chart, news, trade plan)…`);
const stocks = {};
let done = 0;
await mapLimit([...symbols], 3, async (sym) => {
  try {
    const d = await stockDetail(sym);
    const n = 252; // keep one year of chart history to keep the file small
    const c = d.chart;
    stocks[d.symbol] = {
      ...d,
      intraday: undefined,
      chart: { t: c.t.slice(-n), c: c.c.slice(-n).map(r), sma20: c.sma20.slice(-n).map(r), sma50: c.sma50.slice(-n).map(r), sma200: c.sma200.slice(-n).map(r) },
    };
  } catch (err) {
    console.warn(`   skipped ${sym}: ${err.message}`);
  }
  if (++done % 10 === 0) console.log(`   ${done}/${symbols.size}`);
});

console.log(`   + ${briefing.topics.length} topic pages (news per topic)…`);
const { topicDetail } = await import('../lib/market.js');
const topics = {};
await mapLimit(briefing.topics.map((t) => t.key), 3, async (key) => {
  try { topics[key] = await topicDetail(key); } catch (err) { console.warn(`   skipped topic ${key}: ${err.message}`); }
});
// Make sure every topic's best pick and members have a stock page in the preview.
const extra = [...new Set(Object.values(topics).flatMap((t) => [t.topPick.symbol, t.etf.symbol, ...t.members.map((m) => m.symbol)]))].filter((x) => !stocks[x]);
await mapLimit(extra, 3, async (sym) => {
  try {
    const d = await stockDetail(sym);
    const n = 252, c = d.chart;
    stocks[d.symbol] = { ...d, intraday: undefined, chart: { t: c.t.slice(-n), c: c.c.slice(-n).map(r), sma20: c.sma20.slice(-n).map(r), sma50: c.sma50.slice(-n).map(r), sma200: c.sma200.slice(-n).map(r) } };
  } catch { /* skip */ }
});

const names = Object.fromEntries([
  ...STOCKS.map((s) => [s.symbol, s.name]),
  ...SECTORS.map((s) => [s.symbol, `${s.name} sector ETF`]),
  ...THEMES.map((s) => [s.symbol, `${s.name} ETF`]),
  ...COMMODITIES.map((c) => [c.etf, `${c.name} ETF`]),
  ...COMMODITIES.map((c) => [c.symbol, `${c.name} futures`]),
  ...INDICES.map((i) => [i.symbol, i.name]),
]);
const index = Object.values(stocks).map((d) => ({
  symbol: d.symbol, name: names[d.symbol] || d.name,
  type: /=F$/.test(d.symbol) ? 'Futures' : /-USD$/.test(d.symbol) ? 'Crypto' : /^\^/.test(d.symbol) ? 'Index' : d.type === 'ETF' ? 'ETF' : 'Stock',
}));

console.log('3/3 Building the single-file app…');
const outDir = path.join(root, 'node_modules/.preview-build');
await build({ root, base: './', logLevel: 'warn', build: { outDir, emptyOutDir: true, assetsInlineLimit: 1e8, cssCodeSplit: false } });

let html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
const read = (href) => fs.readFileSync(path.join(outDir, href.replace(/^\.?\//, '')), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);
let appJs = '';
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => { appJs = read(src); return ''; });
const favicon = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');
html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />`);
html = html.replace('<title>AlphaDesk · 6-Week Challenge Copilot</title>', '<title>AlphaDesk · Preview</title>');

const snapshot = { generatedAt: new Date().toISOString(), briefing, stocks, topics, index };
const json = JSON.stringify(snapshot).replace(/</g, '\\u003c');
html = html.replace('</body>', `<script>window.__ALPHADESK_SNAPSHOT__ = ${json};</script>\n<script type="module">${safe(appJs)}</script>\n</body>`);

const file = path.join(root, 'preview.html');
fs.writeFileSync(file, html);
console.log(`Done: ${path.relative(process.cwd(), file)} (${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB, ${Object.keys(stocks).length} tickers)`);
process.exit(0);
