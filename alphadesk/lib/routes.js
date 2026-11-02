// One router shared by the local dev server (Vite plugin), `npm start`
// (server.js) and Vercel serverless functions (api/*.js).
import { buildBriefing, stockDetail, topicDetail, searchSymbols, quotes, marketDate } from './market.js';
import { aiEnabled, aiBriefing, cachedAiBriefing, aiStock, aiAsk } from './agent.js';
import { isDemo } from './demo.js';

const routes = {
  'GET /api/status': async () => ({ ai: aiEnabled(), demo: isDemo(), date: marketDate(), aiBriefingReady: Boolean(cachedAiBriefing()) }),
  'GET /api/briefing': async () => buildBriefing(),
  'GET /api/stock': async ({ query }) => {
    if (!query.symbol) throw Object.assign(new Error('symbol is required'), { status: 400 });
    const capital = Math.min(Math.max(Number(query.capital) || 100000, 1000), 1e9);
    return stockDetail(query.symbol, { capital, profile: query.profile || 'balanced' });
  },
  'GET /api/topic': async ({ query }) => topicDetail(String(query.key || '')),
  'GET /api/search': async ({ query }) => searchSymbols(String(query.q || '').slice(0, 60)),
  'GET /api/quotes': async ({ query }) => {
    const syms = String(query.symbols || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
    return syms.length ? quotes(syms) : {};
  },
  'GET /api/ai/briefing': async () => ({ enabled: aiEnabled(), briefing: cachedAiBriefing() }),
  'POST /api/ai/briefing': async ({ body }) => {
    requireAi();
    return aiBriefing({ force: Boolean(body && body.force) });
  },
  'POST /api/ai/stock': async ({ body }) => {
    requireAi();
    if (!body || !body.symbol) throw Object.assign(new Error('symbol is required'), { status: 400 });
    return aiStock(String(body.symbol).slice(0, 20), { force: Boolean(body.force) });
  },
  'POST /api/ai/ask': async ({ body }) => {
    requireAi();
    if (!body || !body.question) throw Object.assign(new Error('question is required'), { status: 400 });
    return aiAsk({ question: String(body.question), history: Array.isArray(body.history) ? body.history : [], portfolio: body.portfolio || null });
  },
};

function requireAi() {
  if (!aiEnabled()) {
    throw Object.assign(new Error('AI agent is not configured. Add ANTHROPIC_API_KEY to your environment (see README).'), { status: 400 });
  }
}

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

/** Node-style (req, res) handler. Returns false if the path isn't an API route. */
export async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = routes[`${req.method} ${url.pathname.replace(/\/$/, '')}`];
  if (!route) {
    if (!url.pathname.startsWith('/api/')) return false;
    send(res, 404, { error: 'Not found' });
    return true;
  }
  try {
    const body = req.method === 'POST' ? await readBody(req) : null;
    const data = await route({ query: Object.fromEntries(url.searchParams), body });
    send(res, 200, data);
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error(`[api] ${req.method} ${url.pathname}:`, err.message);
    send(res, status, { error: err.message || 'Server error' });
  }
  return true;
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
