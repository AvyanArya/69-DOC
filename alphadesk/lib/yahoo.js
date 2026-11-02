// Market data from Yahoo Finance's public chart/search endpoints (no API key).
// Everything is normalised into one "series" shape the rest of the app uses:
// { symbol, name, type, currency, exchange, price, changePct, high52, low52,
//   t: [unix seconds], c: [close], h: [high], l: [low], v: [volume], ohlc: bool }
import { fetchJson, mapLimit } from './http.js';
import { cached } from './cache.js';
import { demoSeries, demoSearch, isDemo } from './demo.js';

const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const MIN = 60 * 1000;

async function yahoo(pathAndQuery) {
  let lastErr;
  for (const host of HOSTS) {
    try {
      return await fetchJson(host + pathAndQuery, { retries: 1 });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function clean(arr) {
  return (arr || []).map((x) => (x == null || Number.isNaN(x) ? null : x));
}

function normalise(symbol, r, ohlc) {
  const m = r.meta || {};
  const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  const t = r.timestamp || [];
  let c = clean(q.close);
  let h = ohlc ? clean(q.high) : [];
  let l = ohlc ? clean(q.low) : [];
  let v = ohlc ? clean(q.volume) : [];
  // Drop bars with no close (holidays / partial data).
  const keep = c.map((x) => x != null);
  const pick = (a) => (a.length ? a.filter((_, i) => keep[i]) : a);
  const tt = t.filter((_, i) => keep[i]);
  c = pick(c); h = pick(h); l = pick(l); v = pick(v);
  const price = m.regularMarketPrice ?? c[c.length - 1];
  const prev = c.length > 1 ? c[c.length - 2] : m.chartPreviousClose;
  let changePct = m.regularMarketChangePercent;
  if (changePct == null && prev) changePct = ((price - prev) / prev) * 100;
  return {
    symbol: m.symbol || symbol,
    name: m.longName || m.shortName || symbol,
    type: m.instrumentType || 'EQUITY',
    currency: m.currency || 'USD',
    exchange: m.fullExchangeName || m.exchangeName || '',
    price,
    changePct: changePct ?? 0,
    high52: m.fiftyTwoWeekHigh ?? (c.length ? Math.max(...c) : null),
    low52: m.fiftyTwoWeekLow ?? (c.length ? Math.min(...c) : null),
    dayHigh: m.regularMarketDayHigh ?? null,
    dayLow: m.regularMarketDayLow ?? null,
    volume: m.regularMarketVolume ?? (v.length ? v[v.length - 1] : null),
    marketTime: m.regularMarketTime ?? tt[tt.length - 1],
    t: tt, c, h, l, v,
    ohlc: Boolean(ohlc && h.length),
  };
}

/** Full daily OHLCV history for one symbol (used for detail pages & top picks). */
export async function getHistory(symbol, range = '1y') {
  const sym = symbol.toUpperCase();
  if (isDemo()) return demoSeries(sym, range);
  return cached(`hist:${sym}:${range}`, 10 * MIN, async () => {
    const data = await yahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d&includePrePost=false&events=div%2Csplit`);
    const r = data && data.chart && data.chart.result && data.chart.result[0];
    if (!r) {
      const msg = data?.chart?.error?.description || 'No data for symbol';
      const err = new Error(msg);
      err.status = 404;
      throw err;
    }
    return normalise(sym, r, true);
  });
}

/** Intraday (5-minute) bars for today's mini chart. */
export async function getIntraday(symbol) {
  const sym = symbol.toUpperCase();
  if (isDemo()) {
    const s = demoSeries(sym, '1y');
    return { t: s.t.slice(-40), c: s.c.slice(-40) };
  }
  return cached(`intraday:${sym}`, 3 * MIN, async () => {
    const data = await yahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m`);
    const r = data?.chart?.result?.[0];
    if (!r) return { t: [], c: [] };
    const n = normalise(sym, r, false);
    return { t: n.t, c: n.c };
  });
}

/**
 * Close-only daily history for many symbols at once (20 per request) -
 * this is what keeps the daily scan of ~100 instruments cheap.
 * Falls back to per-symbol chart calls if the batch endpoint fails.
 */
export async function getBatch(symbols, range = '1y') {
  const syms = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (isDemo()) return Object.fromEntries(syms.map((s) => [s, demoSeries(s, range)]));
  const chunks = [];
  for (let i = 0; i < syms.length; i += 20) chunks.push(syms.slice(i, i + 20));
  const out = {};
  await mapLimit(chunks, 2, async (chunk) => {
    const key = `spark:${range}:${chunk.join(',')}`;
    try {
      const res = await cached(key, 10 * MIN, async () => {
        const data = await yahoo(`/v7/finance/spark?symbols=${chunk.map(encodeURIComponent).join(',')}&range=${range}&interval=1d`);
        const list = data?.spark?.result;
        if (!list) throw new Error(data?.spark?.error?.description || 'spark failed');
        const m = {};
        for (const item of list) {
          const r = item.response && item.response[0];
          if (r && r.timestamp) m[item.symbol] = normalise(item.symbol, r, false);
        }
        return m;
      });
      Object.assign(out, res);
    } catch {
      // Batch failed: fall back to one call per symbol (cached individually).
      await mapLimit(chunk, 3, async (s) => {
        try { out[s] = await getHistory(s, range); } catch { /* skip symbol */ }
      });
    }
  });
  return out;
}

/** Ticker / company-name search. */
export async function search(q) {
  const query = q.trim();
  if (!query) return [];
  if (isDemo()) return demoSearch(query);
  return cached(`search2:${query.toLowerCase()}`, 60 * MIN, async () => {
    const data = await yahoo(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=true`);
    const allowed = new Set(['EQUITY', 'ETF', 'FUTURE', 'CRYPTOCURRENCY', 'INDEX', 'MUTUALFUND']);
    return (data.quotes || [])
      .filter((x) => x.symbol && allowed.has(x.quoteType))
      // Drop single-stock futures (e.g. XNVDA=F) - keep real commodity/index futures like GC=F, CL=F, ES=F.
      .filter((x) => x.quoteType !== 'FUTURE' || /^[A-Z]{1,3}=F$/.test(x.symbol))
      .map((x) => ({
        symbol: x.symbol,
        name: x.longname || x.shortname || x.symbol,
        type: x.typeDisp || x.quoteType,
        exchange: x.exchDisp || x.exchange || '',
        sector: x.sectorDisp || x.sector || '',
        industry: x.industryDisp || x.industry || '',
      }));
  });
}
