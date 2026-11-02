// The AlphaDesk score: a transparent 0-100 rating tuned for a ~6-week holding
// window. Short horizons reward trend + momentum + relative strength, so that
// is what it measures - and it explains every point it gives or takes away.
import { last, sma, ret, rsi, atr, volatility, maxDrawdown, avg } from './indicators.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pct = (x, d = 1) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(d)}%`;
const round = (x) => (x == null ? null : x >= 100 ? Math.round(x * 100) / 100 : Math.round(x * 1000) / 1000);

export const RISK_PROFILES = {
  conservative: { label: 'Conservative', riskPerTrade: 0.005, maxPosition: 0.10 },
  balanced: { label: 'Balanced', riskPerTrade: 0.01, maxPosition: 0.15 },
  aggressive: { label: 'Aggressive', riskPerTrade: 0.02, maxPosition: 0.25 },
};

export function metricsOf(series, bench) {
  const c = series.c.filter((x) => x != null);
  const price = series.price ?? last(c);
  const m = {
    price,
    changePct: series.changePct,
    ret5: ret(c, 5), ret21: ret(c, 21), ret63: ret(c, 63), ret126: ret(c, 126),
    ytd: null,
    sma20: sma(c, 20), sma50: sma(c, 50), sma200: sma(c, 200),
    rsi: rsi(c.slice(-120)),
    atr: atr(c.slice(-60), series.h?.slice(-60), series.l?.slice(-60)),
    vol: volatility(c),
    mdd: maxDrawdown(c),
    high52: Math.max(series.high52 ?? 0, ...c.slice(-252)),
    low52: Math.min(series.low52 ?? Infinity, ...c.slice(-252)),
    volRatio: null,
    bars: c.length,
  };
  m.atrPct = price ? m.atr / price : 0;
  m.fromHigh = m.high52 ? price / m.high52 - 1 : 0;
  m.fromLow = m.low52 ? price / m.low52 - 1 : 0;
  if (series.v && series.v.length > 50) {
    const v10 = avg(series.v, 10), v50 = avg(series.v, 50);
    m.volRatio = v10 && v50 ? v10 / v50 : null;
  }
  // YTD return
  if (series.t && series.t.length) {
    const yStart = Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000;
    const idx = series.t.findIndex((t) => t >= yStart);
    if (idx > 0) m.ytd = price / series.c[idx - 1] - 1;
  }
  if (bench && bench.c && bench.c.length > 63) {
    const b = bench.c.filter((x) => x != null);
    m.rs21 = m.ret21 - ret(b, 21);
    m.rs63 = m.ret63 - ret(b, 63);
  } else {
    m.rs21 = null; m.rs63 = null;
  }
  return m;
}

export function scoreOf(m) {
  const parts = [];
  const add = (key, label, pts, max, note) => parts.push({ key, label, pts: Math.round(pts * 10) / 10, max, note });

  // 1) Trend (25)
  let trend = 0;
  if (m.sma20 && m.price > m.sma20) trend += 5;
  if (m.sma50 && m.price > m.sma50) trend += 7;
  if (m.sma200 && m.price > m.sma200) trend += 5;
  if (m.sma20 && m.sma50 && m.sma20 > m.sma50) trend += 4;
  if (m.sma50 && m.sma200 && m.sma50 > m.sma200) trend += 4;
  if (!m.sma200) trend += 3; // young listing: don't over-penalise
  add('trend', 'Trend', Math.min(trend, 25), 25, 'Price vs 20/50/200-day averages');

  // 2) Momentum (30)
  let mom = clamp((m.ret21 + 0.05) / 0.2, 0, 1) * 12 + clamp((m.ret63 + 0.05) / 0.4, 0, 1) * 12;
  mom += m.rs63 == null ? 3 : clamp((m.rs63 + 0.05) / 0.25, 0, 1) * 6;
  add('momentum', 'Momentum', mom, 30, '1- and 3-month returns, strength vs S&P 500');

  // 3) RSI quality (15) - strong but not stretched is the sweet spot
  const r = m.rsi;
  const rsiPts = r >= 50 && r <= 68 ? 15 : r > 68 && r <= 75 ? 10 : r >= 45 && r < 50 ? 9 : r > 75 ? 4 : r >= 35 ? 5 : 3;
  add('rsi', 'RSI setup', rsiPts, 15, '14-day RSI: 50-68 is ideal');

  // 4) Proximity to highs (15) - leaders make new highs
  const fh = m.fromHigh;
  const highPts = fh >= -0.03 ? 15 : fh >= -0.08 ? 11 : fh >= -0.15 ? 6 : fh >= -0.25 ? 3 : 1;
  add('highs', 'Near highs', highPts, 15, 'Distance from 52-week high');

  // 5) Volume / accumulation (8)
  let volPts = 4;
  if (m.volRatio != null) volPts = m.volRatio > 1.3 && m.ret5 > 0 ? 8 : m.volRatio > 1.05 && m.ret5 >= 0 ? 6 : m.volRatio > 1.3 && m.ret5 < 0 ? 1 : 4;
  add('volume', 'Volume', volPts, 8, '10-day vs 50-day volume');

  // 6) Risk (7) - volatility you can actually hold for 6 weeks
  const v = m.vol;
  const riskPts = v < 0.25 ? 7 : v < 0.45 ? 5 : v < 0.7 ? 2 : 0;
  add('risk', 'Risk control', riskPts, 7, 'Annualised volatility');

  const total = Math.round(clamp(parts.reduce((a, p) => a + p.pts, 0), 0, 100));
  return { score: total, parts };
}

export function signalOf(score) {
  if (score >= 75) return { label: 'Strong Buy', tone: 'up', rank: 4 };
  if (score >= 62) return { label: 'Buy', tone: 'up', rank: 3 };
  if (score >= 48) return { label: 'Hold / Watch', tone: 'neutral', rank: 2 };
  if (score >= 35) return { label: 'Weak', tone: 'down', rank: 1 };
  return { label: 'Avoid', tone: 'down', rank: 0 };
}

export function riskLevelOf(m) {
  if (m.vol < 0.25) return 'Low';
  if (m.vol < 0.45) return 'Medium';
  if (m.vol < 0.7) return 'High';
  return 'Very high';
}

/** Entry zone, stop-loss and 6-week target using ATR (the stock's normal daily range). */
export function levelsOf(m) {
  const { price, atr: a, sma20 } = m;
  const extended = sma20 && price > sma20 + 1.5 * a;
  const stop = Math.max(price - 2 * a, price * 0.8);
  const riskPerShare = price - stop;
  const target = price + 2.5 * riskPerShare;
  const entryLow = extended ? Math.max(sma20, price - 1.5 * a) : Math.max(price - 0.75 * a, stop + 0.5 * a);
  return {
    entryLow: round(entryLow),
    entryHigh: round(price),
    stop: round(stop),
    target: round(target),
    stopPct: stop / price - 1,
    targetPct: target / price - 1,
    rewardRisk: 2.5,
    extended: Boolean(extended),
    entryNote: extended
      ? 'Stretched above its 20-day average - better to buy a pullback into the entry zone or scale in.'
      : 'Reasonable entry near current price; scale in over 1-2 days to smooth your fill.',
  };
}

/** Position size so a stop-out costs only riskPerTrade of the account. */
export function sizeOf(levels, price, capital = 100000, profile = 'balanced') {
  const p = RISK_PROFILES[profile] || RISK_PROFILES.balanced;
  const riskDollars = capital * p.riskPerTrade;
  const perShare = Math.max(price - levels.stop, price * 0.01);
  let shares = Math.floor(riskDollars / perShare);
  const maxShares = Math.floor((capital * p.maxPosition) / price);
  shares = Math.max(0, Math.min(shares, maxShares));
  return { shares, dollars: Math.round(shares * price), pctOfAccount: (shares * price) / capital, riskDollars: Math.round(shares * perShare), profile };
}

/** Plain-English reasons (pros) and risks (cons). */
export function reasonsOf(m, ctx = {}) {
  const pros = [], cons = [];
  if (m.ret63 > 0.08) pros.push(`Up ${pct(m.ret63)} in 3 months${m.rs63 != null && m.rs63 > 0.02 ? `, beating the S&P 500 by ${pct(m.rs63)}` : ''}`);
  else if (m.ret63 < -0.08) cons.push(`Down ${pct(m.ret63)} over 3 months - trend is working against you`);
  if (m.ret21 > 0.05) pros.push(`Strong last month: ${pct(m.ret21)}`);
  else if (m.ret21 < -0.05) cons.push(`Weak last month: ${pct(m.ret21)}`);

  const above = [m.sma20 && m.price > m.sma20, m.sma50 && m.price > m.sma50, m.sma200 && m.price > m.sma200].filter(Boolean).length;
  if (above === 3) pros.push('Above its 20, 50 and 200-day averages - a clean uptrend');
  else if (m.sma200 && m.price < m.sma200) cons.push('Below its 200-day average - long-term downtrend');
  else if (m.sma50 && m.price < m.sma50) cons.push('Slipped under its 50-day average - momentum is fading');

  if (m.rsi >= 50 && m.rsi <= 68) pros.push(`RSI ${m.rsi.toFixed(0)}: strong buying but not overheated`);
  else if (m.rsi > 75) cons.push(`RSI ${m.rsi.toFixed(0)}: overbought - a pullback is likely before more upside`);
  else if (m.rsi < 35) cons.push(`RSI ${m.rsi.toFixed(0)}: oversold - could bounce, but sellers are in control`);

  if (m.fromHigh >= -0.03) pros.push(`Within ${Math.abs(m.fromHigh * 100).toFixed(1)}% of its 52-week high - breakout territory`);
  else if (m.fromHigh < -0.25) cons.push(`${Math.abs(m.fromHigh * 100).toFixed(0)}% below its 52-week high`);

  if (m.volRatio != null && m.volRatio > 1.3 && m.ret5 > 0) pros.push(`Volume ${m.volRatio.toFixed(1)}x normal on up days - big buyers stepping in`);
  if (m.volRatio != null && m.volRatio > 1.3 && m.ret5 < 0) cons.push(`Heavy volume (${m.volRatio.toFixed(1)}x normal) on a drop - distribution`);

  if (m.vol > 0.7) cons.push(`Very volatile (${(m.vol * 100).toFixed(0)}% annualised) - keep the position small`);
  else if (m.vol > 0.45) cons.push(`Volatile (${(m.vol * 100).toFixed(0)}% annualised) - expect big daily swings`);
  else if (m.vol < 0.25) pros.push(`Low volatility (${(m.vol * 100).toFixed(0)}% annualised) - easier to hold`);

  if (ctx.sectorName && ctx.sectorRank != null) {
    if (ctx.sectorRank <= 2) pros.push(`In ${ctx.sectorName}, a top-${ctx.sectorRank + 1} sector right now`);
    else if (ctx.sectorRank >= 8) cons.push(`${ctx.sectorName} is one of the weakest sectors right now`);
  }
  if (ctx.newsPulse && ctx.newsPulse.label === 'Positive') pros.push('News flow is positive this week');
  if (ctx.newsPulse && ctx.newsPulse.label === 'Negative') cons.push('News flow is negative this week');
  if (ctx.newsPulse && ctx.newsPulse.earningsSoon) cons.push('Headlines point to an earnings report soon - expect a big move either way; consider a smaller position until it is out');
  return { pros, cons };
}

/** One short sentence: why you would (or wouldn't) pick it. */
export function oneLiner(m, score) {
  if (score >= 75) {
    if (m.fromHigh >= -0.03) return 'Momentum leader breaking to new highs with strength across every timeframe.';
    return 'Strong, steady uptrend with market-beating momentum - a high-quality trend to ride.';
  }
  if (score >= 62) {
    if (m.rsi > 70) return 'Good trend but short-term stretched - buy on a dip, not a spike.';
    return 'Healthy uptrend with solid momentum; a good core holding for the challenge.';
  }
  if (score >= 48) return 'Mixed signals - fine to watch, but there are stronger setups today.';
  if (m.rsi < 35) return 'Beaten down and oversold; only a short-term bounce trade, not a 6-week hold.';
  return 'Trend and momentum are against it - better opportunities elsewhere.';
}

/** Complete analysis bundle for one instrument. */
export function analyze(series, bench, ctx = {}, capital = 100000, profile = 'balanced') {
  const m = metricsOf(series, bench);
  const { score, parts } = scoreOf(m);
  const signal = signalOf(score);
  const levels = levelsOf(m);
  return {
    symbol: series.symbol,
    name: series.name,
    price: m.price,
    changePct: m.changePct,
    score,
    parts,
    signal,
    risk: riskLevelOf(m),
    metrics: m,
    levels,
    size: sizeOf(levels, m.price, capital, profile),
    reasons: reasonsOf(m, ctx),
    why: oneLiner(m, score),
  };
}

/** Compact version for lists (keeps payloads small). */
export function compact(a, extra = {}) {
  const m = a.metrics;
  return {
    symbol: a.symbol, name: a.name, price: a.price, changePct: a.changePct,
    score: a.score, signal: a.signal, risk: a.risk, why: a.why,
    ret5: m.ret5, ret21: m.ret21, ret63: m.ret63, rsi: m.rsi, vol: m.vol, fromHigh: m.fromHigh,
    rs63: m.rs63, levels: a.levels, size: a.size, reasons: a.reasons, ...extra,
  };
}
