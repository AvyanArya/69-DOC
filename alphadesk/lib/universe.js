// The instruments AlphaDesk scans every day. Edit freely - every symbol is a
// Yahoo Finance ticker. Stocks carry the sector ETF they belong to so the app
// can connect "hottest area" -> "best stocks inside it".

export const INDICES = [
  { symbol: 'SPY', name: 'S&P 500', short: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq 100', short: 'Nasdaq' },
  { symbol: 'DIA', name: 'Dow Jones', short: 'Dow' },
  { symbol: 'IWM', name: 'Russell 2000 (small caps)', short: 'Small caps' },
  { symbol: '^VIX', name: 'Volatility index (fear gauge)', short: 'VIX' },
];

export const SECTORS = [
  { symbol: 'XLK', name: 'Technology', key: 'tech' },
  { symbol: 'XLC', name: 'Communication Services', key: 'comm' },
  { symbol: 'XLY', name: 'Consumer Discretionary', key: 'disc' },
  { symbol: 'XLF', name: 'Financials', key: 'fin' },
  { symbol: 'XLV', name: 'Health Care', key: 'health' },
  { symbol: 'XLE', name: 'Energy', key: 'energy' },
  { symbol: 'XLI', name: 'Industrials', key: 'indu' },
  { symbol: 'XLP', name: 'Consumer Staples', key: 'staples' },
  { symbol: 'XLB', name: 'Materials', key: 'materials' },
  { symbol: 'XLU', name: 'Utilities', key: 'util' },
  { symbol: 'XLRE', name: 'Real Estate', key: 're' },
];

export const THEMES = [
  { symbol: 'SMH', name: 'Semiconductors', members: ['NVDA', 'AMD', 'AVGO', 'MU', 'TSM', 'ARM', 'QCOM', 'INTC'] },
  { symbol: 'IGV', name: 'Software', members: ['MSFT', 'CRM', 'ADBE', 'NOW', 'PLTR', 'SNOW', 'APP'] },
  { symbol: 'ITA', name: 'Aerospace & Defense', members: ['RTX', 'LMT', 'GE', 'BA', 'RKLB'] },
  { symbol: 'URA', name: 'Uranium & Nuclear', members: ['CEG', 'VST', 'GEV'] },
  { symbol: 'XBI', name: 'Biotech', members: ['VRTX'] },
  { symbol: 'TAN', name: 'Solar', members: ['NEE'] },
  { symbol: 'KRE', name: 'Regional Banks', members: ['BAC', 'JPM'] },
  { symbol: 'XHB', name: 'Homebuilders', members: ['HD'] },
  { symbol: 'CIBR', name: 'Cybersecurity', members: ['CRWD', 'PANW'] },
  { symbol: 'BOTZ', name: 'Robotics & AI', members: ['NVDA', 'ISRG', 'TSLA'] },
  { symbol: 'GDX', name: 'Gold Miners', members: ['NEM'] },
  { symbol: 'ARKK', name: 'Disruptive Innovation', members: ['TSLA', 'COIN', 'PLTR', 'HOOD', 'RKLB', 'SHOP'] },
];

// Commodities: the futures contract is what we analyse, the ETF is what you
// can actually buy in a normal brokerage / challenge account.
export const COMMODITIES = [
  { symbol: 'GC=F', etf: 'GLD', name: 'Gold', group: 'Precious metals', blurb: 'Safe-haven; rises on rate cuts, a weak dollar and geopolitical stress.' },
  { symbol: 'SI=F', etf: 'SLV', name: 'Silver', group: 'Precious metals', blurb: 'Gold with more volatility plus industrial (solar, electronics) demand.' },
  { symbol: 'PL=F', etf: 'PPLT', name: 'Platinum', group: 'Precious metals', blurb: 'Small, supply-constrained market; autos and hydrogen demand.' },
  { symbol: 'HG=F', etf: 'CPER', name: 'Copper', group: 'Industrial metals', blurb: '"Dr. Copper" - tracks global growth, AI data-center and grid build-outs.' },
  { symbol: 'CL=F', etf: 'USO', name: 'Crude Oil (WTI)', group: 'Energy', blurb: 'Driven by OPEC+ supply, geopolitics and global demand.' },
  { symbol: 'NG=F', etf: 'UNG', name: 'Natural Gas', group: 'Energy', blurb: 'Very volatile and weather-driven; LNG exports and data-center power.' },
  { symbol: 'ZC=F', etf: 'CORN', name: 'Corn', group: 'Agriculture', blurb: 'Weather, harvest reports and ethanol demand.' },
  { symbol: 'ZW=F', etf: 'WEAT', name: 'Wheat', group: 'Agriculture', blurb: 'Weather and Black Sea export supply.' },
  { symbol: 'BTC-USD', etf: 'IBIT', name: 'Bitcoin', group: 'Crypto', blurb: 'Highest-volatility asset here; moves with liquidity and risk appetite.' },
  { symbol: 'ETH-USD', etf: 'ETHA', name: 'Ethereum', group: 'Crypto', blurb: 'Crypto beta plus on-chain activity; even more volatile than bitcoin.' },
];

// Defensive / cash-like and leveraged instruments used by the allocation plans.
export const SAFE = [
  { symbol: 'SGOV', name: '0-3 Month Treasury Bills (cash parking)' },
  { symbol: 'TLT', name: '20+ Year Treasury Bonds' },
];
export const LEVERAGED = [
  { symbol: 'TQQQ', name: '3x Nasdaq 100', underlying: 'QQQ' },
  { symbol: 'SOXL', name: '3x Semiconductors', underlying: 'SMH' },
  { symbol: 'UPRO', name: '3x S&P 500', underlying: 'SPY' },
];

const S = (symbol, name, sector) => ({ symbol, name, sector });
export const STOCKS = [
  // Technology
  S('AAPL', 'Apple', 'XLK'), S('MSFT', 'Microsoft', 'XLK'), S('NVDA', 'NVIDIA', 'XLK'),
  S('AVGO', 'Broadcom', 'XLK'), S('AMD', 'Advanced Micro Devices', 'XLK'), S('ORCL', 'Oracle', 'XLK'),
  S('CRM', 'Salesforce', 'XLK'), S('ADBE', 'Adobe', 'XLK'), S('NOW', 'ServiceNow', 'XLK'),
  S('PLTR', 'Palantir', 'XLK'), S('ANET', 'Arista Networks', 'XLK'), S('MU', 'Micron', 'XLK'),
  S('QCOM', 'Qualcomm', 'XLK'), S('INTC', 'Intel', 'XLK'), S('DELL', 'Dell', 'XLK'),
  S('CRWD', 'CrowdStrike', 'XLK'), S('PANW', 'Palo Alto Networks', 'XLK'), S('SNOW', 'Snowflake', 'XLK'),
  S('TSM', 'Taiwan Semiconductor', 'XLK'), S('ARM', 'Arm Holdings', 'XLK'), S('SMCI', 'Super Micro Computer', 'XLK'),
  S('APP', 'AppLovin', 'XLK'),
  // Communication services
  S('GOOGL', 'Alphabet (Google)', 'XLC'), S('META', 'Meta Platforms', 'XLC'), S('NFLX', 'Netflix', 'XLC'),
  S('DIS', 'Disney', 'XLC'), S('TMUS', 'T-Mobile US', 'XLC'), S('RDDT', 'Reddit', 'XLC'), S('SPOT', 'Spotify', 'XLC'),
  // Consumer discretionary
  S('AMZN', 'Amazon', 'XLY'), S('TSLA', 'Tesla', 'XLY'), S('HD', 'Home Depot', 'XLY'),
  S('MCD', "McDonald's", 'XLY'), S('NKE', 'Nike', 'XLY'), S('BKNG', 'Booking Holdings', 'XLY'),
  S('CMG', 'Chipotle', 'XLY'), S('ABNB', 'Airbnb', 'XLY'), S('UBER', 'Uber', 'XLY'), S('SHOP', 'Shopify', 'XLY'),
  // Financials
  S('JPM', 'JPMorgan Chase', 'XLF'), S('BAC', 'Bank of America', 'XLF'), S('GS', 'Goldman Sachs', 'XLF'),
  S('MS', 'Morgan Stanley', 'XLF'), S('V', 'Visa', 'XLF'), S('MA', 'Mastercard', 'XLF'),
  S('COIN', 'Coinbase', 'XLF'), S('HOOD', 'Robinhood', 'XLF'), S('AXP', 'American Express', 'XLF'),
  S('SOFI', 'SoFi Technologies', 'XLF'), S('BRK-B', 'Berkshire Hathaway', 'XLF'),
  // Health care
  S('LLY', 'Eli Lilly', 'XLV'), S('UNH', 'UnitedHealth', 'XLV'), S('JNJ', 'Johnson & Johnson', 'XLV'),
  S('ABBV', 'AbbVie', 'XLV'), S('MRK', 'Merck', 'XLV'), S('PFE', 'Pfizer', 'XLV'),
  S('ISRG', 'Intuitive Surgical', 'XLV'), S('VRTX', 'Vertex Pharmaceuticals', 'XLV'), S('NVO', 'Novo Nordisk', 'XLV'),
  S('HIMS', 'Hims & Hers Health', 'XLV'),
  // Energy & power
  S('XOM', 'Exxon Mobil', 'XLE'), S('CVX', 'Chevron', 'XLE'), S('COP', 'ConocoPhillips', 'XLE'),
  S('OXY', 'Occidental Petroleum', 'XLE'), S('SLB', 'Schlumberger', 'XLE'),
  // Industrials
  S('CAT', 'Caterpillar', 'XLI'), S('GE', 'GE Aerospace', 'XLI'), S('BA', 'Boeing', 'XLI'),
  S('RTX', 'RTX (Raytheon)', 'XLI'), S('LMT', 'Lockheed Martin', 'XLI'), S('DE', 'Deere', 'XLI'),
  S('UPS', 'UPS', 'XLI'), S('HON', 'Honeywell', 'XLI'), S('GEV', 'GE Vernova', 'XLI'), S('RKLB', 'Rocket Lab', 'XLI'),
  // Staples
  S('WMT', 'Walmart', 'XLP'), S('COST', 'Costco', 'XLP'), S('PG', 'Procter & Gamble', 'XLP'),
  S('KO', 'Coca-Cola', 'XLP'), S('PEP', 'PepsiCo', 'XLP'),
  // Materials
  S('FCX', 'Freeport-McMoRan (copper)', 'XLB'), S('NEM', 'Newmont (gold)', 'XLB'), S('LIN', 'Linde', 'XLB'),
  // Utilities / power for AI
  S('NEE', 'NextEra Energy', 'XLU'), S('VST', 'Vistra', 'XLU'), S('CEG', 'Constellation Energy', 'XLU'), S('SO', 'Southern Co.', 'XLU'),
  // Real estate
  S('PLD', 'Prologis', 'XLRE'), S('AMT', 'American Tower', 'XLRE'), S('EQIX', 'Equinix', 'XLRE'),
  // Crypto-linked equities
  S('MSTR', 'Strategy (MicroStrategy)', 'XLK'),
];

export const SECTOR_BY_SYMBOL = Object.fromEntries(SECTORS.map((s) => [s.symbol, s]));

// Quick local lookup so search works instantly (and offline) for common names.
export function localSearch(q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const all = [
    ...STOCKS.map((s) => ({ ...s, type: 'Stock' })),
    ...SECTORS.map((s) => ({ symbol: s.symbol, name: `${s.name} sector ETF`, type: 'ETF' })),
    ...THEMES.map((s) => ({ symbol: s.symbol, name: `${s.name} ETF`, type: 'ETF' })),
    ...COMMODITIES.map((c) => ({ symbol: c.symbol, name: `${c.name} futures`, type: 'Commodity' })),
    ...COMMODITIES.map((c) => ({ symbol: c.etf, name: `${c.name} ETF`, type: 'ETF' })),
    ...INDICES.map((s) => ({ symbol: s.symbol, name: s.name, type: 'Index' })),
  ];
  const seen = new Set();
  return all
    .map((it) => {
      const sym = it.symbol.toLowerCase();
      const name = it.name.toLowerCase();
      let rank = 0;
      if (sym === needle) rank = 100;
      else if (sym.startsWith(needle)) rank = 80;
      else if (name.startsWith(needle)) rank = 70;
      else if (name.includes(needle)) rank = 50;
      return { ...it, rank };
    })
    .filter((it) => it.rank > 0 && !seen.has(it.symbol) && seen.add(it.symbol))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8);
}
