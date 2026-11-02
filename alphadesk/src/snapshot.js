// Offline preview mode: when preview.html embeds a data snapshot, answer API
// calls from it instead of the network so the file works with a double-click.
export const SNAPSHOT = typeof window !== 'undefined' ? window.__ALPHADESK_SNAPSHOT__ : null;

const notInPreview = (what) => {
  throw new Error(`${what} isn't included in this offline preview. Run the full app (npm run dev) for live data on any ticker.`);
};

export function snapshotApi(path, method) {
  const url = new URL(path, 'http://x');
  const q = Object.fromEntries(url.searchParams);
  const s = SNAPSHOT;
  switch (`${method} ${url.pathname}`) {
    case 'GET /api/status': return { ai: false, demo: false, preview: true, date: s.briefing.date, generatedAt: s.generatedAt };
    case 'GET /api/briefing': return s.briefing;
    case 'GET /api/stock': {
      const d = s.stocks[String(q.symbol || '').toUpperCase()];
      return d || notInPreview(`"${q.symbol}"`);
    }
    case 'GET /api/search': {
      const needle = String(q.q || '').trim().toLowerCase();
      if (!needle) return [];
      return s.index
        .map((it) => {
          const sym = it.symbol.toLowerCase(), nm = it.name.toLowerCase();
          const rank = sym === needle ? 100 : sym.startsWith(needle) ? 80 : nm.startsWith(needle) ? 70 : nm.includes(needle) ? 50 : 0;
          return { ...it, rank };
        })
        .filter((it) => it.rank)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 10);
    }
    case 'GET /api/quotes': {
      const out = {};
      for (const sym of String(q.symbols || '').split(',')) {
        const d = s.stocks[sym.toUpperCase()];
        if (d) out[d.symbol] = { symbol: d.symbol, name: d.name, price: d.price, changePct: d.changePct, closes: d.chart.c.slice(-60), t: d.chart.t.slice(-60) };
      }
      return out;
    }
    case 'GET /api/ai/briefing': return { enabled: false, briefing: null };
    default: return notInPreview('The AI agent');
  }
}
