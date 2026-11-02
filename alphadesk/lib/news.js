// Headlines from free RSS feeds (Yahoo Finance per-ticker + Google News search),
// tagged with a simple, transparent keyword sentiment so you can scan fast.
import { fetchText } from './http.js';
import { cached } from './cache.js';
import { isDemo, demoNews } from './demo.js';

const MIN = 60 * 1000;

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/<[^>]+>/g, '').trim();

function parseRss(xml, fallbackSource) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? decode(mm[1]) : '';
    };
    let title = get('title');
    let source = get('source') || fallbackSource;
    // Google News appends " - Source" to titles.
    const dash = title.lastIndexOf(' - ');
    if (fallbackSource === 'Google News' && dash > 20) {
      source = source === 'Google News' ? title.slice(dash + 3) : source;
      title = title.slice(0, dash);
    }
    const pub = get('pubDate');
    items.push({
      title,
      link: get('link'),
      source,
      published: pub ? new Date(pub).toISOString() : null,
    });
  }
  return items;
}

const BULL = [
  'beat', 'beats', 'tops', 'surge', 'surges', 'soar', 'soars', 'jump', 'jumps', 'rally', 'rallies', 'record high',
  'upgrade', 'upgraded', 'outperform', 'buy rating', 'raises guidance', 'raises outlook', 'raised guidance', 'strong demand',
  'partnership', 'contract', 'wins', 'approval', 'approved', 'breakout', 'all-time high', 'expands', 'boost', 'climbs',
  'gains', 'rebound', 'bullish', 'buyback', 'dividend hike', 'accelerat', 'blowout', 'higher price target', 'raises price target',
];
const BEAR = [
  'miss', 'misses', 'plunge', 'plunges', 'tumble', 'tumbles', 'sink', 'sinks', 'slump', 'falls', 'drop', 'drops',
  'downgrade', 'downgraded', 'underperform', 'sell rating', 'cuts guidance', 'lowers guidance', 'cut guidance', 'weak',
  'lawsuit', 'probe', 'investigation', 'recall', 'layoffs', 'bearish', 'warning', 'warns', 'halt', 'fraud', 'sec charges',
  'slashes', 'lowers price target', 'cuts price target', 'tariff', 'antitrust', 'delay', 'decline', 'loss widens',
];

export function sentimentOf(title) {
  const t = ` ${title.toLowerCase()} `;
  let s = 0;
  for (const w of BULL) if (t.includes(w)) s += 1;
  for (const w of BEAR) if (t.includes(w)) s -= 1;
  return s > 0 ? 'bullish' : s < 0 ? 'bearish' : 'neutral';
}

function finish(items, limit) {
  const seen = new Set();
  return items
    .filter((it) => it.title && !seen.has(it.title.toLowerCase().slice(0, 60)) && seen.add(it.title.toLowerCase().slice(0, 60)))
    .sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    .slice(0, limit)
    .map((it) => ({ ...it, sentiment: sentimentOf(it.title) }));
}

/** News for one ticker (Yahoo per-ticker feed + Google News on the company name). */
export async function getTickerNews(symbol, name, limit = 10) {
  if (isDemo()) return finish(demoNews(name || symbol), limit);
  return cached(`news2:${symbol}`, 20 * MIN, async () => {
    const shortName = (name || symbol).replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Ltd\.?|plc|Holdings|Company|Co\.)$/i, '');
    const [y, g] = await Promise.allSettled([
      fetchText(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`, { retries: 1 }),
      fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${shortName}" OR ${symbol} stock when:7d`)}&hl=en-US&gl=US&ceid=US:en`, { retries: 1 }),
    ]);
    // Yahoo's per-ticker feed mixes in a lot of general market stories, so keep
    // only headlines that actually mention the company or ticker.
    const key = shortName.split(/[\s,.(]/)[0].toLowerCase();
    const relevant = (it) => {
      const t = ` ${it.title.toLowerCase()} `;
      return (key.length > 2 && t.includes(key)) || new RegExp(`[^a-z]${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}[^a-z]`).test(t);
    };
    const items = [
      ...(y.status === 'fulfilled' ? parseRss(y.value, 'Yahoo Finance').filter(relevant) : []),
      ...(g.status === 'fulfilled' ? parseRss(g.value, 'Google News') : []),
    ];
    if (!items.length && y.status === 'rejected' && g.status === 'rejected') throw y.reason;
    return finish(items, 30);
  }).then((list) => list.slice(0, limit));
}

/** Free-text news search (market-wide stories, sectors, commodities). */
export async function searchNews(query, limit = 8) {
  if (isDemo()) return finish(demoNews(query), limit);
  return cached(`newsq:${query.toLowerCase()}`, 20 * MIN, async () => {
    const xml = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:3d')}&hl=en-US&gl=US&ceid=US:en`, { retries: 1 });
    return finish(parseRss(xml, 'Google News'), 30);
  }).then((list) => list.slice(0, limit));
}

const EARNINGS = /\b(earnings|q[1-4] (results|report)|quarterly results)\b.*\b(tomorrow|today|this week|ahead|preview|on deck|to report|what to expect|due)\b|\b(to report|reports?|set to report|ahead of)\b.*\b(earnings|q[1-4])\b|earnings preview/i;

/** True when recent headlines suggest an earnings report is imminent. */
export function earningsSoon(items) {
  const recent = items.filter((i) => !i.published || Date.now() - new Date(i.published).getTime() < 4 * 86400000);
  return recent.some((i) => EARNINGS.test(i.title));
}

export function newsPulse(items) {
  const bull = items.filter((i) => i.sentiment === 'bullish').length;
  const bear = items.filter((i) => i.sentiment === 'bearish').length;
  const label = bull > bear + 1 ? 'Positive' : bear > bull + 1 ? 'Negative' : 'Mixed';
  return { bullish: bull, bearish: bear, neutral: items.length - bull - bear, label, earningsSoon: earningsSoon(items) };
}
