// Smoke test: exercises the API router end-to-end without a browser.
// Usage: npm run check            (live data)
//        DEMO_DATA=1 npm run check (offline sample data)
import { handleApi } from '../lib/routes.js';

async function call(method, url, body) {
  const req = { method, url, body };
  let out = '', status = 0;
  const res = { setHeader() {}, set statusCode(s) { status = s; }, end(s) { out = s; } };
  await handleApi(req, res);
  return { status, data: JSON.parse(out) };
}

const t0 = Date.now();
const status = await call('GET', '/api/status');
console.log('status', status.status, status.data);
const b = await call('GET', '/api/briefing');
if (b.status !== 200) { console.error('briefing failed', b.data); process.exit(1); }
const d = b.data;
console.log(`briefing ok in ${Date.now() - t0}ms - ${d.universeSize} stocks scanned, regime=${d.regime.label}`);
console.log(`  top pick: ${d.topPick.symbol} score ${d.topPick.score} (${d.topPick.signal.label}) - ${d.topPick.why}`);
console.log(`  hottest: ${d.hottest.name} (${d.hottest.symbol}) 1m ${(d.hottest.ret21 * 100).toFixed(1)}% leaders: ${d.hottest.leaders.map((x) => x.symbol).join(', ')}`);
console.log(`  commodities: ${d.commodities.slice(0, 3).map((c) => `${c.name}:${c.score}`).join(', ')}`);
for (const p of d.plans) console.log(`  plan ${p.name}: ${p.buckets.map((x) => `${x.key} ${x.pct}%`).join(' | ')} (sum ${p.buckets.reduce((a, x) => a + x.pct, 0)})`);
console.log(`  news: top=${d.topPick.news.length} area=${d.hottest.news.length} market=${d.marketNews.length}`);
const s = await call('GET', `/api/stock?symbol=${d.topPick.symbol}`);
console.log('stock', s.status, s.data.symbol, s.data.score, s.data.levels, s.data.size, 'news', s.data.news?.length, 'chart', s.data.chart?.c.length);
const q = await call('GET', '/api/search?q=apple');
console.log('search', q.status, q.data.slice(0, 3).map((x) => x.symbol));
const qq = await call('GET', '/api/quotes?symbols=AAPL,GLD');
console.log('quotes', qq.status, Object.keys(qq.data));
const ai = await call('POST', '/api/ai/ask', { question: 'hi' });
console.log('ai (expect 400 without key)', ai.status, ai.data.error || 'ok');
