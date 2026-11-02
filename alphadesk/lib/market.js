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
  const key = `briefing:v2:${marketDate()}:${isDemo() ? 'demo' : 'live'}`;
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
      gamePlan: GAME_PLAN,
      rules: RULES,
      universeSize: stocks.length,
    };
  });
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

export async function searchSymbols(q) {
  const local = localSearch(q);
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
