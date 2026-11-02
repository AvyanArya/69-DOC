// The agentic layer: Claude gets tools over AlphaDesk's own data (market scan,
// per-ticker analysis, news) plus live web search, researches on its own, and
// files a structured report through a `submit_report` tool.
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { buildBriefing, stockDetail, marketDate } from './market.js';
import { searchNews } from './news.js';
import { getCached, setCached } from './cache.js';

const MODEL = process.env.ALPHADESK_MODEL || 'claude-opus-5-5';
const HOUR = 60 * 60 * 1000;

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client;
const getClient = () => (client ||= new Anthropic({ timeout: 280 * 1000, maxRetries: 2 }));

const pct = (x) => (x == null ? null : Math.round(x * 1000) / 10);

// ---------- Data tools ----------
function slimStock(s) {
  return {
    symbol: s.symbol, name: s.name, sector: s.sectorName, price: s.price, score: s.score, signal: s.signal?.label,
    ret1w: pct(s.ret5), ret1m: pct(s.ret21), ret3m: pct(s.ret63), rsi: Math.round(s.rsi), volatility: pct(s.vol),
    fromHigh: pct(s.fromHigh), entry: [s.levels?.entryLow, s.levels?.entryHigh], stop: s.levels?.stop, target: s.levels?.target,
  };
}

const dataTools = () => [
  betaTool({
    name: 'get_market_scan',
    description: 'Today\'s AlphaDesk quant scan: market regime, index moves, sector and theme growth rankings, the top-ranked stocks (score 0-100 with trend/momentum metrics, entry/stop/target), and commodity rankings. Percent fields are in percent units. Call this first.',
    inputSchema: { type: 'object', properties: { top_n: { type: 'integer', description: 'How many top stocks to include (default 20, max 40)' } }, additionalProperties: false },
    run: async ({ top_n }) => {
      const b = await buildBriefing();
      const n = Math.min(Math.max(top_n || 20, 5), 40);
      return JSON.stringify({
        date: b.date, regime: b.regime,
        indices: b.indices.map((i) => ({ symbol: i.symbol, name: i.name, price: i.price, dayChangePct: Math.round(i.changePct * 100) / 100 })),
        areasByGrowth: b.areas.map((a) => ({ symbol: a.symbol, name: a.name, kind: a.kind, ret1w: pct(a.ret5), ret1m: pct(a.ret21), ret3m: pct(a.ret63), score: a.score })),
        sectors: b.sectors.map((a) => ({ symbol: a.symbol, name: a.name, ret1m: pct(a.ret21), ret3m: pct(a.ret63) })),
        topStocks: b.stocks.slice(0, n).map(slimStock),
        weakestStocks: b.stocks.slice(-5).map(slimStock),
        commodities: b.commodities.map((c) => ({ name: c.name, future: c.symbol, etf: c.etf, score: c.score, signal: c.signal?.label, ret1m: pct(c.ret21), ret3m: pct(c.ret63), rsi: Math.round(c.rsi) })),
        topics: [...b.topics].sort((x, y) => x.rank - y.rank).map((t) => ({ name: t.name, group: t.group, etf: t.etf.symbol, heat: t.heat.label, ret1m: pct(t.ret21), bestPick: t.topPick.symbol, bestPickScore: t.topPick.score })),
        headlines: b.marketNews.map((n) => n.title),
      });
    },
  }),
  betaTool({
    name: 'analyze_ticker',
    description: 'Deep quantitative analysis of any ticker (stock, ETF, future like GC=F, crypto like BTC-USD): score breakdown, trend and momentum metrics, entry zone, stop-loss, 6-week target, position size for a $100k account, plain-English pros/cons, and the latest headlines with sentiment.',
    inputSchema: { type: 'object', properties: { symbol: { type: 'string', description: 'Yahoo Finance ticker, e.g. NVDA, XLE, GC=F, BTC-USD' } }, required: ['symbol'], additionalProperties: false },
    run: async ({ symbol }) => {
      try {
        const d = await stockDetail(symbol);
        const m = d.metrics;
        return JSON.stringify({
          symbol: d.symbol, name: d.name, price: d.price, dayChangePct: Math.round(d.changePct * 100) / 100,
          score: d.score, signal: d.signal.label, risk: d.risk, scoreParts: d.parts.map((p) => `${p.label} ${p.pts}/${p.max}`),
          ret1w: pct(m.ret5), ret1m: pct(m.ret21), ret3m: pct(m.ret63), ret6m: pct(m.ret126), ytd: pct(m.ytd),
          vsSP500_3m: pct(m.rs63), rsi: Math.round(m.rsi), volatility: pct(m.vol), atrPct: pct(m.atrPct), fromHigh52w: pct(m.fromHigh),
          sma20: m.sma20, sma50: m.sma50, sma200: m.sma200, volumeRatio10v50: m.volRatio,
          levels: d.levels, positionSize100k: d.size, sector: d.sector,
          pros: d.reasons.pros, cons: d.reasons.cons,
          news: d.news.slice(0, 8).map((n) => ({ title: n.title, source: n.source, published: n.published, sentiment: n.sentiment })),
        });
      } catch (err) {
        return JSON.stringify({ error: `Could not analyze ${symbol}: ${err.message}` });
      }
    },
  }),
  betaTool({
    name: 'search_news',
    description: 'Search the last few days of news headlines (Google News) for any topic, company, sector or commodity.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
    run: async ({ query }) => {
      const items = await searchNews(query, 8).catch(() => []);
      return JSON.stringify(items.map((n) => ({ title: n.title, source: n.source, published: n.published, sentiment: n.sentiment })));
    },
  }),
];

const WEB_SEARCH = { type: 'web_search_20260209', name: 'web_search', max_uses: 5 };

const SYSTEM = `You are AlphaDesk, an autonomous stock research agent working for one person who is in a 6-week stock market challenge with $100,000 of virtual money. Their goal is to finish with the highest possible account value, so you favour setups that can realistically work within 6 weeks: strong trends, momentum, relative strength, and near-term catalysts - while protecting them from blow-ups.

How you work:
- Start with get_market_scan for today's quantitative picture, then dig into the most promising names with analyze_ticker. Check catalysts and risks (earnings dates inside the 6-week window, guidance, analyst moves, macro events) with search_news and web_search. Verify before you claim; do not invent prices, dates or numbers - use the tool data.
- Be decisive and concrete: name tickers, entry zones, stop-losses and targets (use the levels from the tools unless you have a clear reason to adjust them, and say why).
- Write for a smart beginner: short sentences, no jargon without a quick explanation. Every reason should be one line.
- This is a game with virtual money, but still flag real risks honestly (earnings gaps, overbought conditions, crowded trades, high volatility).`;

// ---------- Report schemas ----------
const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const BRIEFING_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One punchy sentence summarising today\'s opportunity' },
    marketView: { type: 'string', description: '2-3 sentences on the market backdrop and what it means for the challenge' },
    topPick: {
      type: 'object',
      properties: {
        symbol: str, name: str, conviction: { type: 'integer', description: '1-10' },
        thesis: { type: 'string', description: '2-3 sentences: why this is the best pick right now' },
        whyShort: { type: 'array', items: str, description: '3-5 one-line reasons' },
        catalysts: strArr, risks: strArr,
        entry: str, stop: str, target: str, positionSize: { type: 'string', description: 'Suggested $ amount / % of the $100k and why' },
      },
      required: ['symbol', 'name', 'conviction', 'thesis', 'whyShort', 'catalysts', 'risks', 'entry', 'stop', 'target', 'positionSize'],
      additionalProperties: false,
    },
    hottestArea: {
      type: 'object',
      properties: { name: str, etf: str, why: str, newsDrivers: strArr, howToPlay: str, bestStocks: strArr },
      required: ['name', 'etf', 'why', 'newsDrivers', 'howToPlay', 'bestStocks'],
      additionalProperties: false,
    },
    watchlist: {
      type: 'array',
      items: { type: 'object', properties: { symbol: str, action: { type: 'string', enum: ['Buy', 'Buy on dip', 'Watch', 'Take profits', 'Avoid'] }, reason: str }, required: ['symbol', 'action', 'reason'], additionalProperties: false },
    },
    commodities: {
      type: 'array',
      items: { type: 'object', properties: { name: str, etf: str, action: { type: 'string', enum: ['Buy', 'Buy on dip', 'Hold', 'Avoid'] }, reason: str }, required: ['name', 'etf', 'action', 'reason'], additionalProperties: false },
    },
    allocation: { type: 'string', description: 'How to split the $100k today across asset classes (with percentages) and why' },
    todaysMoves: { type: 'array', items: str, description: '3-5 concrete actions for today' },
    keyEvents: { type: 'array', items: str, description: 'Upcoming events in the next ~2 weeks that could move markets or the picks (with dates if known)' },
  },
  required: ['headline', 'marketView', 'topPick', 'hottestArea', 'watchlist', 'commodities', 'allocation', 'todaysMoves', 'keyEvents'],
  additionalProperties: false,
};

const STOCK_SCHEMA = {
  type: 'object',
  properties: {
    symbol: str,
    verdict: { type: 'string', enum: ['Strong Buy', 'Buy', 'Buy on dip', 'Hold', 'Sell', 'Avoid'] },
    conviction: { type: 'integer', description: '1-10' },
    summary: { type: 'string', description: '2-3 sentences for a beginner' },
    bullCase: strArr, bearCase: strArr,
    catalysts: { type: 'array', items: str, description: 'Upcoming events in the next 6 weeks (earnings date etc.) - say "unknown" if you could not verify' },
    newsTake: { type: 'string', description: 'What the latest news means for the stock' },
    plan: {
      type: 'object',
      properties: { entry: str, stop: str, target: str, positionSize: str, exitRule: str },
      required: ['entry', 'stop', 'target', 'positionSize', 'exitRule'], additionalProperties: false,
    },
    fitForChallenge: { type: 'string', description: 'One sentence: how this fits a 6-week $100k challenge' },
  },
  required: ['symbol', 'verdict', 'conviction', 'summary', 'bullCase', 'bearCase', 'catalysts', 'newsTake', 'plan', 'fitForChallenge'],
  additionalProperties: false,
};

function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'The Anthropic API key is invalid. Check ANTHROPIC_API_KEY.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'This API key does not have access to the model. Set ALPHADESK_MODEL to a model you can use.';
  if (err instanceof Anthropic.RateLimitError) return 'The AI is rate-limited right now - try again in a minute.';
  if (err instanceof Anthropic.APIError) return `AI request failed (${err.status ?? 'network'}): ${err.message}`;
  return err.message || 'AI request failed';
}

/** Runs the agent loop until it calls submit_report. Returns { report, steps }. */
async function runReportAgent(prompt, schema) {
  let report = null;
  const steps = [];
  const submit = betaTool({
    name: 'submit_report',
    description: 'File your final report. Call this exactly once, at the end, after your research.',
    inputSchema: schema,
    strict: true,
    run: async (input) => { report = input; return 'Report received. You are done - reply with a short confirmation.'; },
  });
  const tools = [...dataTools(), submit].map((t) => {
    const run = t.run;
    return { ...t, run: async (input, ctx) => { steps.push({ tool: t.name, input }); return run(input, ctx); } };
  });

  const runner = getClient().beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    tools: [...tools, WEB_SEARCH],
    max_iterations: 14,
    messages: [{ role: 'user', content: prompt }],
  });
  const final = await runner.runUntilDone();
  for (const block of final.content || []) {
    if (block.type === 'server_tool_use' && block.name === 'web_search') steps.push({ tool: 'web_search', input: block.input });
  }
  if (!report) {
    if (final.stop_reason === 'refusal') throw new Error('The AI declined this request.');
    throw new Error('The agent finished without filing a report. Try again.');
  }
  return { report, steps };
}

/** Today's AI briefing - researched once per day and cached. */
export async function aiBriefing({ force = false } = {}) {
  const key = `ai-briefing:${marketDate()}`;
  if (!force) {
    const hit = getCached(key);
    if (hit) return hit;
  }
  try {
    const { report, steps } = await runReportAgent(
      `Today is ${marketDate()}. Research the market and produce today's briefing for my 6-week, $100k challenge: the single best stock pick (with why), the area with the most growth and the news driving it, a watchlist (5-8 names), commodity calls, how to split the $100k across asset classes today, and concrete moves for today. Use the tools, then call submit_report.`,
      BRIEFING_SCHEMA,
    );
    return setCached(key, { date: marketDate(), generatedAt: new Date().toISOString(), model: MODEL, report, steps }, 20 * HOUR);
  } catch (err) {
    const e = new Error(friendlyError(err));
    e.status = 502;
    throw e;
  }
}

export function cachedAiBriefing() {
  return getCached(`ai-briefing:${marketDate()}`) || null;
}

/** AI deep-dive on one ticker (cached per ticker per day). */
export async function aiStock(symbol, { force = false } = {}) {
  const sym = symbol.toUpperCase();
  const key = `ai-stock:${sym}:${marketDate()}`;
  if (!force) {
    const hit = getCached(key);
    if (hit) return hit;
  }
  try {
    const { report, steps } = await runReportAgent(
      `Give me your verdict on ${sym} for my 6-week, $100k challenge. Analyze it with analyze_ticker, compare it with today's market scan and its sector, check the latest news and whether earnings or other catalysts fall in the next 6 weeks (web_search), then call submit_report.`,
      STOCK_SCHEMA,
    );
    return setCached(key, { symbol: sym, date: marketDate(), generatedAt: new Date().toISOString(), model: MODEL, report, steps }, 12 * HOUR);
  } catch (err) {
    const e = new Error(friendlyError(err));
    e.status = 502;
    throw e;
  }
}

/** Free-form chat with the agent, with the user's portfolio as context. */
export async function aiAsk({ question, history = [], portfolio = null }) {
  const context = portfolio ? `\n\nMy current challenge portfolio (JSON): ${JSON.stringify(portfolio).slice(0, 6000)}` : '';
  const messages = [
    ...history.slice(-8).filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
    { role: 'user', content: `${question.slice(0, 2000)}${context}` },
  ];
  if (messages[0].role !== 'user') messages.shift();
  try {
    const runner = getClient().beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 8000,
      system: `${SYSTEM}\n- In chat, answer in concise Markdown (short paragraphs or bullets, under ~250 words unless asked for more). Today is ${marketDate()}.`,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tools: [...dataTools(), WEB_SEARCH],
      max_iterations: 10,
      messages,
    });
    const final = await runner.runUntilDone();
    if (final.stop_reason === 'refusal') return { answer: 'Sorry - I can\'t help with that one.' };
    const answer = (final.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return { answer: answer || 'I could not come up with an answer - try rephrasing.' };
  } catch (err) {
    const e = new Error(friendlyError(err));
    e.status = 502;
    throw e;
  }
}

