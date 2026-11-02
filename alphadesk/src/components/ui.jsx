import React, { useEffect, useState } from 'react';
import { pct, pctRaw, tone, ago } from '../format.js';

// ---------- Hash router ----------
export function useRoute() {
  // "#/portfolio?add=NVDA" -> { parts: ['portfolio'], query: { add: 'NVDA' } }
  const get = () => {
    const raw = window.location.hash.replace(/^#\/?/, '') || '';
    const [path, qs = ''] = raw.split('?');
    return { parts: path.split('/').map(decodeURIComponent), query: Object.fromEntries(new URLSearchParams(qs)) };
  };
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const fn = () => { setRoute(get()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return route;
}
export const go = (path) => { window.location.hash = `#/${path}`; };
export const stockPath = (symbol) => `stock/${encodeURIComponent(symbol)}`;

// ---------- Icons ----------
const P = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  today: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  markets: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  plan: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.5 6.5" /></>,
  portfolio: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  ai: <><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  back: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
  fire: <><path d="M12 22c4 0 7-2.8 7-7 0-3-2-5.5-3.5-7-.5 2-1.5 3-3 3.5C13 8 12 5 9 2c0 4-4 6.5-4 12 0 4.2 3 8 7 8z" /></>,
  news: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  gem: <><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20M12 21 8 9l4-6 4 6z" /></>,
};
export function Icon({ name, size = 18, stroke = 1.9, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {P[name]}
    </svg>
  );
}

// ---------- Bits ----------
export function Change({ value, raw = false, dp, className = '' }) {
  return <span className={`num ${tone(value)} ${className}`}>{raw ? pctRaw(value, dp ?? 2) : pct(value, dp ?? 1)}</span>;
}

export function SignalBadge({ signal, size }) {
  if (!signal) return null;
  return <span className={`badge ${signal.tone} ${size === 'lg' ? 'lg' : ''}`}><span className="dot" />{signal.label}</span>;
}

export function RiskBadge({ risk }) {
  const t = risk === 'Low' || risk === 'Very low' ? 'up' : risk === 'Medium' ? 'neutral' : 'down';
  return <span className={`badge ${t}`} title="Based on annualised volatility">{risk} risk</span>;
}

export const scoreColor = (s) => (s >= 62 ? 'var(--up)' : s >= 48 ? 'var(--warn)' : 'var(--down)');

export function ScoreRing({ score, size = 76, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="score-ring" style={{ width: size, height: size }} title="AlphaDesk score (0-100)">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={stroke}
          strokeDasharray={`${(c * score) / 100} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="val"><b>{score}</b><span>Score</span></div>
    </div>
  );
}

export function ScoreBar({ score }) {
  return (
    <div className="scorebar">
      <div className="track"><div className="fill" style={{ width: `${score}%`, background: scoreColor(score) }} /></div>
      <b>{score}</b>
    </div>
  );
}

export function NewsList({ items, limit = 6, empty = 'No recent headlines.' }) {
  if (!items || !items.length) return <div className="faint small">{empty}</div>;
  return (
    <ul className="news">
      {items.slice(0, limit).map((n, i) => (
        <li key={i}>
          <span className={`sent ${n.sentiment}`} title={`${n.sentiment} headline`} />
          <div style={{ minWidth: 0 }}>
            <a href={n.link} target="_blank" rel="noreferrer">{n.title}</a>
            <div className="meta"><span>{n.source}</span>{n.published && <span>· {ago(n.published)}</span>}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Skeleton({ h = 16, w = '100%', style }) {
  return <div className="skel" style={{ height: h, width: w, ...style }} />;
}

export function LoadingCards() {
  return (
    <div className="grid">
      <div className="card span-8"><Skeleton h={22} w="30%" /><Skeleton h={48} w="45%" style={{ marginTop: 14 }} /><Skeleton h={14} style={{ marginTop: 18 }} /><Skeleton h={14} w="80%" style={{ marginTop: 8 }} /><Skeleton h={14} w="70%" style={{ marginTop: 8 }} /><Skeleton h={70} style={{ marginTop: 18 }} /></div>
      <div className="card span-4"><Skeleton h={18} w="50%" /><Skeleton h={120} style={{ marginTop: 14 }} /><Skeleton h={14} style={{ marginTop: 12 }} /><Skeleton h={14} w="60%" style={{ marginTop: 8 }} /></div>
      <div className="card span-12"><Skeleton h={18} w="20%" /><Skeleton h={220} style={{ marginTop: 14 }} /></div>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="notice down">
      <Icon name="info" />
      <div style={{ flex: 1 }}>
        <b>Couldn't load data.</b> <span className="muted">{error}</span>
      </div>
      {onRetry && <button className="btn sm" onClick={onRetry}><Icon name="refresh" size={14} />Retry</button>}
    </div>
  );
}

export function Stat({ label, value, hint, className = '', title }) {
  return (
    <div className="stat" title={title}>
      <div className="lbl">{label}</div>
      <div className={`val ${className}`}>{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function SymbolCell({ symbol, name }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="sym">{symbol}</div>
      {name && <div className="nm">{name}</div>}
    </div>
  );
}

/** Tiny Markdown renderer for AI chat (headings, bold, italics, lists, code). */
export function Markdown({ text }) {
  const blocks = [];
  const lines = String(text || '').split('\n');
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  const inline = (s, k) => {
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((p, i) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={`${k}-${i}`}>{p.slice(2, -2)}</b>;
      if (/^`[^`]+`$/.test(p)) return <code key={`${k}-${i}`}>{p.slice(1, -1)}</code>;
      if (/^\*[^*]+\*$/.test(p)) return <i key={`${k}-${i}`}>{p.slice(1, -1)}</i>;
      return p;
    });
  };
  lines.forEach((line, i) => {
    const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (li) {
      const ordered = /^\s*\d/.test(line);
      if (!list || list.ordered !== ordered) { flush(); list = { type: 'list', ordered, items: [] }; }
      list.items.push(inline(li[1], i));
      return;
    }
    flush();
    if (!line.trim()) return;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) blocks.push({ type: 'h', content: inline(h[1], i) });
    else blocks.push({ type: 'p', content: inline(line, i) });
  });
  flush();
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'h') return <h4 key={i}>{b.content}</h4>;
        if (b.type === 'p') return <p key={i}>{b.content}</p>;
        const L = b.ordered ? 'ol' : 'ul';
        return <L key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</L>;
      })}
    </>
  );
}
