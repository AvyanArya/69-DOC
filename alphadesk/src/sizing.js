// Mirrors lib/analyze.js sizeOf() so sizes follow your own capital & risk setting.
export const PROFILES = {
  conservative: { label: 'Conservative', riskPerTrade: 0.005, maxPosition: 0.10 },
  balanced: { label: 'Balanced', riskPerTrade: 0.01, maxPosition: 0.15 },
  aggressive: { label: 'Aggressive', riskPerTrade: 0.02, maxPosition: 0.25 },
};

export function sizeFor(levels, price, { capital = 100000, profile = 'balanced' } = {}) {
  if (!levels || !price) return null;
  const p = PROFILES[profile] || PROFILES.balanced;
  const perShare = Math.max(price - levels.stop, price * 0.01);
  let shares = Math.floor((capital * p.riskPerTrade) / perShare);
  shares = Math.max(0, Math.min(shares, Math.floor((capital * p.maxPosition) / price)));
  return { shares, dollars: shares * price, pctOfAccount: (shares * price) / capital, maxLoss: shares * perShare, profile: p.label };
}
