import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api.js';
import { money, price, pct, niceDate, ago } from '../format.js';
import { recordPick, usePickHistory, useSettings } from '../store.js';
import { sizeFor } from '../sizing.js';
import {
  Icon, Change, SignalBadge, RiskBadge, ScoreRing, ScoreBar, NewsList, LoadingCards, ErrorBox, SymbolCell, go, stockPath,
} from '../components/ui.jsx';
import { Sparkline, GrowthBars } from '../components/charts.jsx';
import AiBriefing from '../components/AiBriefing.jsx';

export default function Today({ briefing, status }) {
  const { data: b, error, loading, reload } = briefing;
  const [settings] = useSettings();

  useEffect(() => { if (b) recordPick(b); }, [b]);

  if (!b && loading) return <><Head /><LoadingCards /></>;
  if (!b && error) return <><Head /><ErrorBox error={error} onRetry={reload} /></>;
  if (!b) return null;

  return (
    <div className="stack">
      <Head b={b} reload={reload} loading={loading} />
      <RegimeBar regime={b.regime} />
      <div className="grid">
        <div className="span-8"><TopPick p={b.topPick} settings={settings} /></div>
        <div className="span-4"><Hottest h={b.hottest} /></div>
        <div className="span-12"><AiBriefing status={status} /></div>
        <div className="span-12"><TopTable stocks={b.stocks.slice(0, 12)} /></div>
        <div className="span-6 card">
          <div className="card-head"><div className="card-title"><Icon name="news" size={15} />News that may move {b.topPick.symbol}</div><span className="badge plain">{b.topPick.newsPulse?.label || 'Mixed'}</span></div>
          <NewsList items={b.topPick.news} limit={5} />
        </div>
        <div className="span-6 card">
          <div className="card-head"><div className="card-title"><Icon name="news" size={15} />Market headlines</div></div>
          <NewsList items={b.marketNews} limit={5} />
        </div>
        <div className="span-6"><SectorCard sectors={b.sectors} themes={b.themes} /></div>
        <div className="span-6"><CommodityMini list={b.commodities} /></div>
        <div className="span-12"><PickHistory /></div>
      </div>
    </div>
  );
}

function Head({ b, reload, loading }) {
  return (
    <div className="page-head">
      <div>
        <h1>{niceDate()}</h1>
        <p>{b ? <>Scanned <b>{b.universeSize}</b> stocks, {b.sectors.length + b.themes.length} sectors &amp; themes and {b.commodities.length} commodities · updated {ago(b.generatedAt)}</> : 'Scanning the market…'}</p>
      </div>
      {reload && <button className="btn" onClick={reload} disabled={loading}><Icon name="refresh" size={15} />{loading ? 'Refreshing…' : 'Refresh'}</button>}
    </div>
  );
}

function RegimeBar({ regime }) {
  if (!regime) return null;
  return (
    <div className={`notice ${regime.tone === 'up' ? 'up' : regime.tone === 'down' ? 'down' : 'warn'}`}>
      <Icon name="shield" />
      <div className="regime"><b>Market mood: {regime.label}</b><span className="muted">{regime.note}</span></div>
    </div>
  );
}

export function TopPick({ p, settings, title = "Today's top pick" }) {
  const size = sizeFor(p.levels, p.price, settings);
  return (
    <div className="card hero">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow"><Icon name="target" size={15} />{title}</div>
          <div className="row wrap" style={{ marginTop: 10, gap: 14, alignItems: 'baseline' }}>
            <a className="hero-sym" href={`#/${stockPath(p.symbol)}`}>{p.symbol}</a>
            <span className="hero-price">${price(p.price)}</span>
            <Change value={p.changePct} raw className="bold" />
          </div>
          <div className="hero-name">{p.name}{p.sectorName ? ` · ${p.sectorName}` : ''}</div>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <SignalBadge signal={p.signal} size="lg" />
            <RiskBadge risk={p.risk} />
            <span className="badge plain num">3M {pct(p.ret63)}</span>
            {p.rs63 != null && <span className="badge plain num">vs S&amp;P {pct(p.rs63)}</span>}
          </div>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <div className="hide-sm"><Sparkline values={p.spark} width={150} height={56} /></div>
          <ScoreRing score={p.score} size={84} />
        </div>
      </div>

      <div className="why-line">“{p.why}”</div>
      <ul className="reasons">
        {p.reasons.pros.slice(0, 4).map((r) => <li key={r}><span className="ico up">✓</span>{r}</li>)}
        {p.reasons.cons.slice(0, 2).map((r) => <li key={r}><span className="ico down">!</span><span className="muted">{r}</span></li>)}
      </ul>

      <div className="levels">
        <div className="level"><div className="lbl">Buy zone</div><div className="val">${price(p.levels.entryLow)}–{price(p.levels.entryHigh)}</div><div className="sub faint">{p.levels.extended ? 'Wait for a dip' : 'Near current price'}</div></div>
        <div className="level"><div className="lbl">Stop-loss</div><div className="val down">${price(p.levels.stop)}</div><div className="sub down">{pct(p.levels.stopPct)}</div></div>
        <div className="level"><div className="lbl">6-week target</div><div className="val up">${price(p.levels.target)}</div><div className="sub up">{pct(p.levels.targetPct)}</div></div>
        <div className="level"><div className="lbl">Suggested size</div><div className="val">{size ? money(size.dollars, 0) : '—'}</div><div className="sub faint">{size ? `${size.shares} sh · max loss ${money(size.maxLoss, 0)}` : ''}</div></div>
      </div>
      <div className="row wrap" style={{ marginTop: 18 }}>
        <button className="btn primary" onClick={() => go(stockPath(p.symbol))}>Full analysis<Icon name="arrow" size={15} /></button>
        <button className="btn" onClick={() => go(`portfolio?add=${p.symbol}`)}><Icon name="plus" size={15} />Add to portfolio</button>
      </div>
    </div>
  );
}

function Hottest({ h }) {
  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-head">
        <div className="card-title"><Icon name="fire" size={15} />Most growth right now</div>
        <span className="badge info">{h.kind}</span>
      </div>
      <a href={h.topicKey ? `#/topic/${h.topicKey}` : `#/${stockPath(h.symbol)}`} style={{ display: 'block' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>{h.name} <span className="small" style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: 0 }}>Open topic →</span></div>
        <div className="faint small">ETF: <b className="muted">{h.symbol}</b> · ${price(h.price)}</div>
      </a>
      <div className="row" style={{ gap: 18, margin: '14px 0 6px' }}>
        <div><div className="tiny faint bold">1 WEEK</div><Change value={h.ret5} className="bold" /></div>
        <div><div className="tiny faint bold">1 MONTH</div><Change value={h.ret21} className="bold" /></div>
        <div><div className="tiny faint bold">3 MONTHS</div><Change value={h.ret63} className="bold" /></div>
        <div style={{ marginLeft: 'auto' }}><Sparkline values={h.spark} width={90} height={34} /></div>
      </div>
      {h.leaders.length > 0 && (
        <>
          <div className="tiny faint bold" style={{ margin: '12px 0 6px', letterSpacing: '0.05em' }}>BEST STOCKS IN IT</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {h.leaders.map((s) => (
              <span key={s.symbol} className="pick-chip" onClick={() => go(stockPath(s.symbol))}>{s.symbol}<span>{s.score}</span></span>
            ))}
          </div>
        </>
      )}
      <div className="tiny faint bold" style={{ margin: '16px 0 8px', letterSpacing: '0.05em' }}>NEWS DRIVING IT</div>
      <NewsList items={h.news} limit={3} />
    </div>
  );
}

export function TopTable({ stocks, title = 'Top-ranked stocks today' }) {
  return (
    <div className="card flush">
      <div className="card-head" style={{ padding: '18px 20px 4px' }}>
        <div className="card-title"><Icon name="gem" size={15} />{title}</div>
        <span className="card-sub">Click any row for the full breakdown</span>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>Stock</th><th className="r">Price</th><th className="r">1D</th><th className="r hide-sm">1M</th><th className="r hide-sm">3M</th><th>Score</th><th className="hide-sm">Signal</th><th className="hide-sm">Why</th></tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => (
              <tr key={s.symbol} className="click" onClick={() => go(stockPath(s.symbol))}>
                <td><span className="rank">{i + 1}</span></td>
                <td><SymbolCell symbol={s.symbol} name={s.name} /></td>
                <td className="r">{price(s.price)}</td>
                <td className="r"><Change value={s.changePct} raw /></td>
                <td className="r hide-sm"><Change value={s.ret21} /></td>
                <td className="r hide-sm"><Change value={s.ret63} /></td>
                <td><ScoreBar score={s.score} /></td>
                <td className="hide-sm"><SignalBadge signal={s.signal} /></td>
                <td className="why hide-sm">{shortWhy(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Compact, stock-specific facts (the returns are already their own columns).
function shortWhy(s) {
  const bits = [];
  if (s.fromHigh != null) bits.push(s.fromHigh >= -0.03 ? 'At 52-wk high' : `${Math.abs(s.fromHigh * 100).toFixed(0)}% below high`);
  if (s.rsi != null) bits.push(`RSI ${s.rsi.toFixed(0)}${s.rsi > 72 ? ' (hot)' : s.rsi < 40 ? ' (weak)' : ''}`);
  if (s.rs63 != null && s.rs63 > 0.05) bits.push(`beats S&P by ${(s.rs63 * 100).toFixed(0)}%`);
  if (s.sectorName) bits.push(s.sectorName);
  return bits.join(' · ') || s.why;
}

function SectorCard({ sectors, themes }) {
  const [view, setView] = useState('sectors');
  const [period, setPeriod] = useState('ret21');
  const rows = useMemo(() => [...(view === 'sectors' ? sectors : themes)].sort((a, b) => b[period] - a[period]), [view, period, sectors, themes]);
  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-head wrap">
        <div className="card-title"><Icon name="markets" size={15} />Where the growth is</div>
        <div className="row" style={{ gap: 6 }}>
          <div className="chip-group">
            <button className={view === 'sectors' ? 'active' : ''} onClick={() => setView('sectors')}>Sectors</button>
            <button className={view === 'themes' ? 'active' : ''} onClick={() => setView('themes')}>Themes</button>
          </div>
          <div className="chip-group">
            {[['ret5', '1W'], ['ret21', '1M'], ['ret63', '3M']].map(([k, l]) => <button key={k} className={period === k ? 'active' : ''} onClick={() => setPeriod(k)}>{l}</button>)}
          </div>
        </div>
      </div>
      <GrowthBars rows={rows} valueKey={period} onClick={(r) => go(r.topicKey ? `topic/${r.topicKey}` : stockPath(r.symbol))} />
    </div>
  );
}

function CommodityMini({ list }) {
  return (
    <div className="card flush" style={{ height: '100%' }}>
      <div className="card-head" style={{ padding: '18px 20px 4px' }}>
        <div className="card-title"><Icon name="gem" size={15} />Commodities &amp; crypto</div>
        <a className="btn sm ghost" href="#/markets">See all<Icon name="arrow" size={14} /></a>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Asset</th><th className="r">1M</th><th>Score</th><th>Signal</th><th className="hide-sm">Buy via</th></tr></thead>
          <tbody>
            {list.slice(0, 6).map((c) => (
              <tr key={c.symbol} className="click" onClick={() => go(stockPath(c.etf))}>
                <td><SymbolCell symbol={c.name} name={c.group} /></td>
                <td className="r"><Change value={c.ret21} /></td>
                <td><ScoreBar score={c.score} /></td>
                <td><SignalBadge signal={c.signal} /></td>
                <td className="hide-sm"><b>{c.etf}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PickHistory() {
  const [hist] = usePickHistory();
  const syms = [...new Set(hist.map((h) => h.symbol))].join(',');
  const quotes = useApi(syms ? `/api/quotes?symbols=${syms}` : null, { ttl: 5 * 60 * 1000 });
  if (!hist.length) return null;
  return (
    <div className="card flush">
      <div className="card-head" style={{ padding: '18px 20px 4px' }}>
        <div className="card-title"><Icon name="today" size={15} />Daily pick track record</div>
        <span className="card-sub">Saved automatically each day you open AlphaDesk</span>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Pick</th><th className="r">Score</th><th className="r">Price then</th><th className="r">Now</th><th className="r">Since pick</th><th className="hide-sm">Hottest area that day</th></tr></thead>
          <tbody>
            {hist.slice(0, 10).map((h) => {
              const q = quotes.data && quotes.data[h.symbol];
              const chg = q && h.price ? q.price / h.price - 1 : null;
              return (
                <tr key={h.date} className="click" onClick={() => go(stockPath(h.symbol))}>
                  <td className="num">{h.date}</td>
                  <td><SymbolCell symbol={h.symbol} name={h.name} /></td>
                  <td className="r">{h.score}</td>
                  <td className="r">{price(h.price)}</td>
                  <td className="r">{q ? price(q.price) : '—'}</td>
                  <td className="r">{chg == null ? '—' : <Change value={chg} className="bold" />}</td>
                  <td className="hide-sm muted">{h.area}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

