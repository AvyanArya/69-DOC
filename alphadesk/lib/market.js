// Builds the daily briefing (top pick, hottest area, picks, commodities, plans)
// and the per-stock deep-dive. Pure data + rules - the AI agent builds on top.
import { getBatch, getHistory, getIntraday, search as yahooSearch } from './yahoo.js';
import { getTickerNews, searchNews, newsPulse } from './news.js';
import { analyze, compact, metricsOf } from './analyze.js';
import { smaLine } from './indicators.js';
import { cached } from './cache.js';
import { mapLimit } from './http.js';
import { isDemo } from './demo.js';
import { INDICES, SECTORS, THEMES, COMMODITIES, STOCKS, SAFE, LEVERAGED, SECTOR_BY_SYMBOL, localSearch } from './universe.js';
import { buildPlans, GAME_PLAN, RULES } from './plans.js';
import { TOPICS, heatOf } from './topics.js';

const MIN = 60 * 1000;

export function marketDate(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD
}

const growthOf = (m) => 0.2 * m.ret5 + 0.5 * m.ret21 + 0.3 * m.ret63;

function regimeOf(spy, vix) {
  if (!spy) return { key: 'unknown', label: 'Unknown', note: 'Market data unavailable.' };
  const m = metricsOf(spy);
  const v = vix ? vix.price : null;
  const above50 = m.sma50 && m.price > m.sma50;
  const above200 = m.sma200 && m.price > m.sma200;
  if (above50 && above200 && (v == null || v < 20)) {
    return { key: 'risk-on', label: 'Risk-on', tone: 'up', note: 'S&P 500 is in an uptrend and fear is low - a good backdrop for buying strength.' };
  }
  if (!above50 && (v != null && v > 22)) {
    return { key: 'risk-off', label: 'Risk-off', tone: 'down', note: 'S&P 500 is below its 50-day average and fear is elevated - smaller positions, more cash, tighter stops.' };
  }
  return { key: 'cautious', label: 'Cautious', tone: 'neutral', note: 'Mixed market signals - stick to the strongest names and respect your stops.' };
}

export async function buildBriefing() {
  const key = `briefing:v4:${marketDate()}:${isDemo() ? 'demo' : 'live'}`;
  return cached(key, 15 * MIN, async () => {
    const symbols = [
      ...INDICES.map((x) => x.symbol), ...SECTORS.map((x) => x.symbol), ...THEMES.map((x) => x.symbol),
      ...STOCKS.map((x) => x.symbol), ...COMMODITIES.map((x) => x.symbol), ...COMMODITIES.map((x) => x.etf),
      ...SAFE.map((x) => x.symbol), ...LEVERAGED.map((x) => x.symbol),
    ];
    const data = await getBatch(symbols, '1y');
    const spy = data.SPY;
    if (!spy || Object.keys(data).length < 20) {
      const err = new Error('Market data provider is unavailable or rate-limited. Try again in a minute.');
      err.status = 503;
      throw err;
    }

    // --- Indices ---
    const indices = INDICES.filter((x) => data[x.symbol]).map((x) => {
      const s = data[x.symbol];
      return { symbol: x.symbol, name: x.short, price: s.price, changePct: s.changePct, spark: s.c.slice(-30) };
    });
    const regime = regimeOf(spy, data['^VIX']);

    // --- Sectors & themes: "where is the growth?" ---
    const areaOf = (x, kind) => {
      const s = data[x.symbol];
      if (!s) return null;
      const a = analyze(s, spy);
      const m = a.metrics;
      return {
        symbol: x.symbol, name: x.name, kind, price: a.price, changePct: a.changePct,
        ret5: m.ret5, ret21: m.ret21, ret63: m.ret63, growth: growthOf(m), score: a.score, signal: a.signal,
        members: x.members || STOCKS.filter((st) => st.sector === x.symbol).map((st) => st.symbol),
        spark: s.c.slice(-63),
        topicKey: TOPICS.find((t) => t.etf === x.symbol)?.key,
      };
    };
    const sectors = SECTORS.map((x) => areaOf(x, 'Sector')).filter(Boolean).sort((a, b) => b.growth - a.growth);
    const themes = THEMES.map((x) => areaOf(x, 'Theme')).filter(Boolean).sort((a, b) => b.growth - a.growth);
    const areas = [...sectors, ...themes].sort((a, b) => (b.growth + b.score / 400) - (a.growth + a.score / 400));
    const sectorRank = Object.fromEntries(sectors.map((s, i) => [s.symbol, i]));

    // --- Stocks: quick scan on close-only data, then refine the top names with full OHLCV ---
    let scanned = STOCKS.filter((x) => data[x.symbol]).map((x) => {
      const ctx = { sectorName: SECTOR_BY_SYMBOL[x.sector]?.name, sectorRank: sectorRank[x.sector] };
      const a = analyze({ ...data[x.symbol], name: x.name }, spy, ctx);
      return { a, x, ctx };
    }).sort((p, q) => q.a.score - p.a.score || q.a.metrics.ret63 - p.a.metrics.ret63);

    const refineN = 12;
    const refined = await mapLimit(scanned.slice(0, refineN), 4, async (row) => {
      try {
        const full = await getHistory(row.x.symbol, '1y');
        return { ...row, a: analyze({ ...full, name: row.x.name }, spy, row.ctx) };
      } catch {
        return row;
      }
    });
    scanned = [...refined.map((r, i) => (r && r.a ? r : scanned[i])), ...scanned.slice(refineN)]
      .sort((p, q) => q.a.score - p.a.score || q.a.metrics.ret63 - p.a.metrics.ret63);

    const stocks = scanned.map(({ a, x }) => compact(a, { sector: x.sector, sectorName: SECTOR_BY_SYMBOL[x.sector]?.name }));

    // --- Commodities (analyse the future, show the ETF you can buy) ---
    const commodities = COMMODITIES.filter((c) => data[c.symbol]).map((c) => {
      const a = analyze(data[c.symbol], spy);
      const etf = data[c.etf];
      return {
        ...compact(a), name: c.name, etf: c.etf, group: c.group, blurb: c.blurb, spark: data[c.symbol].c.slice(-63),
        etfPrice: etf ? etf.price : null, etfChangePct: etf ? etf.changePct : null,
      };
    }).sort((a, b) => b.score - a.score);

    const coreList = ['SPY', 'QQQ', 'DIA'].filter((s) => data[s]).map((s) => compact(analyze(data[s], spy), { name: INDICES.find((i) => i.symbol === s).name + ' ETF' }));
    const leveraged = LEVERAGED.filter((x) => data[x.symbol]).map((x) => compact(analyze(data[x.symbol], spy), { name: x.name })).sort((a, b) => b.score - a.score);
    const crypto = commodities.filter((c) => c.group === 'Crypto');
    const cash = SAFE.filter((x) => x.symbol === 'SGOV' && data[x.symbol]).map((x) => compact(analyze(data[x.symbol], spy), { name: x.name }));
    if (!cash.length) cash.push({ symbol: 'SGOV', name: SAFE[0].name, score: 50, signal: { label: 'Hold', tone: 'neutral' }, price: null });

    // --- The headline calls ---
    const top = stocks[0];
    const hottest = areas[0];
    const leaders = stocks.filter((s) => hottest.members.includes(s.symbol)).slice(0, 4);

    // --- News that may be driving it ---
    const [topNews, areaNews, marketNews, commodityNews] = await Promise.all([
      getTickerNews(top.symbol, top.name, 6).catch(() => []),
      searchNews(`${hottest.name} stocks`, 5).catch(() => []),
      searchNews('stock market today', 6).catch(() => []),
      commodities[0] ? searchNews(`${commodities[0].name} price`, 4).catch(() => []) : [],
    ]);
    top.newsPulse = newsPulse(topNews);
    if (top.newsPulse.earningsSoon) top.reasons.cons.unshift('Headlines point to an earnings report soon - expect a big move either way');

    const plans = buildPlans({ stocks, areas, commodities, core: coreList, leveraged, crypto, cash, regime });
    const topics = buildTopics({ data, spy, stocks });

    return {
      date: marketDate(),
      generatedAt: new Date().toISOString(),
      demo: isDemo(),
      regime,
      indices,
      topPick: { ...top, news: topNews, spark: data[top.symbol] ? data[top.symbol].c.slice(-63) : [] },
      runnersUp: stocks.slice(1, 5),
      hottest: { ...hottest, leaders, news: areaNews },
      sectors, themes, areas: areas.slice(0, 8),
      stocks,
      commodities: commodities.map((c, i) => ({ ...c, news: i === 0 ? commodityNews : undefined })),
      marketNews,
      plans,
      topics,
      gamePlan: GAME_PLAN,
      rules: RULES,
      universeSize: stocks.length,
    };
  });
}

// ---------- Topics ----------
const ETF_NAMES = Object.fromEntries([
  ...SECTORS.map((x) => [x.symbol, `${x.name} Select Sector SPDR`]),
  ...THEMES.map((x) => [x.symbol, `${x.name} ETF`]),
  ...COMMODITIES.map((c) => [c.etf, `${c.name} ETF`]),
]);
const slim = (x) => ({
  symbol: x.symbol, name: x.name, price: x.price, changePct: x.changePct, score: x.score, signal: x.signal,
  ret5: x.ret5, ret21: x.ret21, ret63: x.ret63, rsi: x.rsi, fromHigh: x.fromHigh, rs63: x.rs63, sectorName: x.sectorName, why: x.why, isEtf: x.isEtf,
});

function buildTopics({ data, spy, stocks }) {
  const bySym = Object.fromEntries(stocks.map((s) => [s.symbol, s]));
  const etfOf = (sym) => (data[sym] ? compact(analyze(data[sym], spy), { name: ETF_NAMES[sym] || sym, isEtf: true }) : null);
  const list = TOPICS.map((t) => {
    const etf = etfOf(t.etf);
    if (!etf) return null;
    const memberSyms = t.members || THEMES.find((x) => x.symbol === t.etf)?.members || [];
    const members = memberSyms.map((s) => bySym[s] || etfOf(s)).filter(Boolean).sort((a, b) => b.score - a.score);
    // The best single name - unless every name is weaker than simply owning the ETF.
    const best = members[0] && members[0].score >= etf.score - 3 ? members[0] : etf;
    return {
      key: t.key, name: t.name, group: t.group, blurb: t.blurb, drivers: t.drivers, watch: t.watch, newsQuery: t.newsQuery,
      etf: { ...etf, spark: data[t.etf].c.slice(-63) },
      ret5: etf.ret5, ret21: etf.ret21, ret63: etf.ret63, growth: 0.2 * etf.ret5 + 0.5 * etf.ret21 + 0.3 * etf.ret63,
      score: etf.score, signal: etf.signal,
      topPick: { ...best, spark: data[best.symbol] ? data[best.symbol].c.slice(-63) : [] },
      members: members.map(slim),
      buyCount: members.filter((x) => x.score >= 62).length,
    };
  }).filter(Boolean);
  const ranked = [...list].sort((a, b) => b.growth - a.growth);
  ranked.forEach((t, i) => { t.rank = i + 1; t.heat = heatOf(i, ranked.length, t.growth, t.ret63); });
  return list.map((t) => ({ ...t, of: ranked.length }));
}

/** One topic with its news (for the topic page). */
export async function topicDetail(key) {
  const b = await buildBriefing();
  const t = b.topics.find((x) => x.key === key);
  if (!t) throw Object.assign(new Error(`Unknown topic "${key}"`), { status: 404 });
  const [news, pickNews] = await Promise.all([
    searchNews(t.newsQuery, 8).catch(() => []),
    t.topPick.isEtf ? [] : getTickerNews(t.topPick.symbol, t.topPick.name, 4).catch(() => []),
  ]);
  return { ...t, news, newsPulse: newsPulse(news), pickNews, date: b.date, generatedAt: b.generatedAt };
}

/** Everything about one symbol for the detail page. */
export async function stockDetail(symbol, { capital = 100000, profile = 'balanced' } = {}) {
  const sym = symbol.toUpperCase();
  const [series, spy] = await Promise.all([getHistory(sym, '2y'), getHistory('SPY', '2y').catch(() => null)]);
  if (!series.c.length) {
    const err = new Error(`No price history for ${sym}`);
    err.status = 404;
    throw err;
  }
  const known = STOCKS.find((s) => s.symbol === sym);
  // Sector context from today's briefing if it's already been built (cheap), never blocking.
  let ctx = {};
  let sectorInfo = null;
  try {
    const b = await Promise.race([buildBriefing(), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 2500))]);
    if (known) {
      const idx = b.sectors.findIndex((s) => s.symbol === known.sector);
      if (idx >= 0) {
        ctx = { sectorName: b.sectors[idx].name, sectorRank: idx };
        sectorInfo = { symbol: known.sector, name: b.sectors[idx].name, rank: idx + 1, of: b.sectors.length, ret21: b.sectors[idx].ret21 };
      }
    }
  } catch { /* briefing not ready - fine */ }

  // Commodities/crypto: search news by plain name ("Gold"), not the contract name ("Gold Dec 26").
  const commodity = COMMODITIES.find((c) => c.symbol === sym || c.etf === sym);
  const newsName = commodity ? `${commodity.name}` : series.name;
  const [news, intraday] = await Promise.all([
    (commodity && commodity.symbol === sym ? searchNews(`${commodity.name} price`, 12) : getTickerNews(sym, newsName, 12)).catch(() => []),
    getIntraday(sym).catch(() => ({ t: [], c: [] })),
  ]);
  ctx.newsPulse = newsPulse(news);
  if (series.type !== 'EQUITY') ctx.newsPulse.earningsSoon = false; // only companies report earnings
  const a = analyze(series, spy, ctx, capital, profile);
  const sma20 = smaLine(series.c, 20);
  const sma50 = smaLine(series.c, 50);
  const sma200 = smaLine(series.c, 200);
  return {
    ...a,
    name: known ? known.name : series.name,
    longName: series.name,
    exchange: series.exchange,
    currency: series.currency,
    type: series.type,
    dayHigh: series.dayHigh, dayLow: series.dayLow, volume: series.volume,
    marketTime: series.marketTime,
    sector: sectorInfo,
    news,
    newsPulse: ctx.newsPulse,
    chart: { t: series.t, c: series.c, sma20, sma50, sma200 },
    intraday,
    demo: isDemo(),
  };
}

function topicSearch(q) {
  const n = q.trim().toLowerCase();
  if (n.length < 3) return [];
  return TOPICS.filter((t) => t.name.toLowerCase().includes(n) || t.key.includes(n.replace(/\s+/g, '-')))
    .slice(0, 3)
    .map((t) => ({ symbol: t.name, name: `Topic · ${t.group}`, type: 'Topic', topicKey: t.key }));
}

export async function searchSymbols(q) {
  const local = [...topicSearch(q), ...localSearch(q)];
  try {
    const remote = await yahooSearch(q);
    const seen = new Set();
    return [...local, ...remote].filter((x) => !seen.has(x.symbol) && seen.add(x.symbol)).slice(0, 10);
  } catch {
    return local;
  }
}

/** Live prices for the portfolio tracker. */
export async function quotes(symbols) {
  const data = await getBatch(symbols, '3mo');
  return Object.fromEntries(Object.entries(data).map(([s, x]) => [s, {
    symbol: s, name: x.name, price: x.price, changePct: x.changePct, closes: x.c.slice(-60), t: x.t.slice(-60),
  }]));
}
