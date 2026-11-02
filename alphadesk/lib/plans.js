// Allocation plans for the 6-week challenge. Each plan splits the account into
// asset-class "buckets"; the buckets are then filled with today's strongest
// tickers from the live scan, so the plan updates itself every day.

export const BUCKETS = {
  core: { label: 'Core index ETFs', risk: 'Low', vol: 0.18, what: 'Broad-market ETFs as a stable base.', how: 'Buy once in week 1 and hold. Only trim if the index breaks its 50-day average.' },
  momentum: { label: 'Top momentum stocks', risk: 'High', vol: 0.4, what: 'The highest-scoring stocks from today\'s scan.', how: 'Split evenly across 3-5 names. Set a stop on each (shown on the stock page) and let winners run.' },
  sector: { label: 'Hot sector / theme ETFs', risk: 'Medium', vol: 0.28, what: 'ETFs for the areas with the most growth right now.', how: 'Ride the trend; rotate if the area drops out of the top 3 for a full week.' },
  commodities: { label: 'Commodities', risk: 'Medium', vol: 0.25, what: 'Commodity ETFs with the best trend (gold, silver, oil, copper...).', how: 'Good diversifier - often rises when stocks fall. Hold 2-4 weeks, exit on a close below the 50-day average.' },
  swing: { label: 'Swing trades (2-10 days)', risk: 'High', vol: 0.45, what: 'Short trades in strong stocks pulling back to support.', how: 'Buy near the 20-day average in an uptrend, sell into strength 5-10% higher. Always use a stop.' },
  daytrade: { label: 'Day trading', risk: 'Very high', vol: 0.6, what: 'Liquid, fast-moving stocks for intraday trades.', how: 'Trade only the first 90 minutes or the last hour. Max 2 trades a day; close everything before the bell.' },
  leveraged: { label: 'Leveraged ETFs (3x)', risk: 'Very high', vol: 0.6, what: '3x daily index ETFs - big upside in strong trends, brutal in chop.', how: 'Only hold while the underlying index is above its 20-day average. Never average down.' },
  crypto: { label: 'Crypto ETFs', risk: 'Very high', vol: 0.55, what: 'Spot bitcoin / ether ETFs for asymmetric upside.', how: 'Small size only. Cut if bitcoin closes below its 50-day average.' },
  cash: { label: 'Cash / T-bills (dry powder)', risk: 'Very low', vol: 0.01, what: 'Treasury-bill ETF earning interest while you wait.', how: 'Use it to buy dips in your best names or to add to winners in weeks 3-4.' },
};

export const PLAN_TEMPLATES = [
  {
    key: 'conservative', name: 'Steady Compounder', risk: 'Conservative', tagline: 'Protect the $100k, aim for a solid, low-stress gain.',
    weights: { core: 35, momentum: 15, sector: 15, commodities: 15, cash: 20 },
    bestFor: 'You want a respectable finish without big drawdowns.',
  },
  {
    key: 'balanced', name: 'Smart Growth', risk: 'Balanced', tagline: 'Lean into today\'s leaders with guard-rails on every position.',
    weights: { core: 15, momentum: 30, sector: 20, commodities: 12, swing: 10, daytrade: 5, crypto: 3, cash: 5 },
    bestFor: 'Most people - a real shot at a top finish with controlled risk.', recommended: true,
  },
  {
    key: 'aggressive', name: 'Challenge Winner', risk: 'Aggressive', tagline: 'Maximum upside for a competition - accept big swings to win.',
    weights: { momentum: 35, sector: 15, leveraged: 15, swing: 12, commodities: 8, daytrade: 5, crypto: 5, cash: 5 },
    bestFor: 'Competitions with a single winner, or if you are behind after week 3.',
  },
];

export const GAME_PLAN = [
  { week: 1, title: 'Deploy 75-85%', body: 'Build core + momentum + sector positions in the first 2-3 days. Scale into each name in 2 buys. Keep the rest as dry powder.' },
  { week: 2, title: 'Cut losers fast', body: 'Anything that hits its stop is sold - no exceptions. Add the freed cash to whatever is working best.' },
  { week: 3, title: 'Press the winners', body: 'Add to positions up 5%+ that are still scoring Buy. Rotate out of sectors that fell out of the top 3.' },
  { week: 4, title: 'Check your standing', body: 'Ahead? Tighten stops to break-even. Behind? Shift 10-15% into the aggressive buckets for more upside.' },
  { week: 5, title: 'Lock in gains', body: 'Raise stops to the 20-day average. Take partial profits (1/3) on anything up 15%+.' },
  { week: 6, title: 'Finish strong', body: 'No new long-shot bets unless you need to catch up. Avoid holding through earnings in the final days.' },
];

export const RULES = [
  'Never risk more than 1-2% of the account on one trade (the position sizes in this app do this for you).',
  'Every position gets a stop-loss the day you buy it.',
  'Don\'t put more than 25% in any single stock.',
  'Check earnings dates - a surprise can move a stock 10-20% overnight.',
  'Sell losers, keep winners. Never average down on a falling stock.',
  'Re-check AlphaDesk each morning: if a holding drops to "Weak" or "Avoid", review it.',
];

function pickTop(list, n, filter = () => true, maxPerSector = Infinity) {
  const out = [], per = {};
  for (const x of list) {
    if (out.length >= n) break;
    if (!filter(x)) continue;
    const k = x.sector || x.symbol;
    if ((per[k] || 0) >= maxPerSector) continue;
    per[k] = (per[k] || 0) + 1;
    out.push(x);
  }
  return out;
}

/**
 * Fill each plan with real tickers from the briefing.
 * @param {object} b - briefing pieces: { stocks, areas, commodities, core, leveraged, crypto, regime }
 */
export function buildPlans(b, capital = 100000) {
  const buyable = (x) => x.score >= 55;
  const fillers = {
    core: () => b.core.slice().sort((x, y) => y.score - x.score).slice(0, 2),
    momentum: () => pickTop(b.stocks, 5, buyable, 2), // max 2 per sector = real diversification
    sector: () => pickTop(b.areas, 2),
    commodities: () => {
      const good = b.commodities.filter((c) => c.score >= 55).slice(0, 2);
      return good.length ? good : b.commodities.filter((c) => c.etf === 'GLD').slice(0, 1);
    },
    swing: () => {
      const taken = new Set(pickTop(b.stocks, 5, buyable, 2).map((x) => x.symbol));
      return pickTop(b.stocks, 3, (x) => !taken.has(x.symbol) && x.score >= 55 && x.rsi < 62, 1);
    },
    daytrade: () => b.stocks.slice(0, 40).filter((x) => x.vol > 0.4).sort((x, y) => y.vol - x.vol).slice(0, 3),
    leveraged: () => b.leveraged.filter((x) => x.score >= 50).slice(0, 1),
    crypto: () => b.crypto.filter((x) => x.score >= 45).slice(0, 1),
    cash: () => b.cash.slice(0, 1),
  };

  const riskOff = b.regime && b.regime.key === 'risk-off';
  return PLAN_TEMPLATES.map((tpl) => {
    const weights = { ...tpl.weights };
    let regimeNote = null;
    if (riskOff) {
      // Defensive tilt: move 10 points from the riskiest buckets into cash.
      let moved = 0;
      for (const k of ['leveraged', 'momentum', 'daytrade', 'crypto']) {
        if (moved >= 10 || !weights[k]) continue;
        const take = Math.min(weights[k], 10 - moved, k === 'momentum' ? 5 : 10);
        weights[k] -= take; moved += take;
      }
      weights.cash = (weights.cash || 0) + moved;
      regimeNote = `Market is risk-off today, so ${moved}% was shifted into cash. Redeploy when the S&P 500 reclaims its 50-day average.`;
    }
    const buckets = Object.entries(weights)
      .filter(([, w]) => w > 0)
      .map(([key, pct]) => {
        let picks = fillers[key] ? fillers[key]() : [];
        // Empty bucket (e.g. no leveraged ETF in an uptrend) -> park in cash.
        const fallback = !picks.length && key !== 'cash';
        if (fallback) picks = b.cash.slice(0, 1);
        const dollars = Math.round((capital * pct) / 100);
        return {
          key, ...BUCKETS[key], pct, dollars,
          note: fallback ? 'Nothing in this bucket is in an uptrend today - hold T-bills until a setup appears.' : null,
          picks: picks.map((p) => ({
            symbol: p.etf || p.symbol, name: p.etf ? `${p.name} (${p.etf})` : p.name,
            score: p.score, signal: p.signal, price: p.etfPrice || p.price,
            dollars: Math.round(dollars / picks.length),
          })),
        };
      })
      .sort((a, b2) => b2.pct - a.pct);
    const vol = buckets.reduce((a, bk) => a + (bk.pct / 100) * bk.vol, 0);
    const sixWeek = vol * Math.sqrt(30 / 252);
    return { ...tpl, weights, buckets, regimeNote, typicalSwing: sixWeek };
  });
}
