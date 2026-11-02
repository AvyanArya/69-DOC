import React, { useState } from 'react';
import { price } from '../format.js';
import { Icon, Change, SignalBadge, ScoreBar, ScoreRing, LoadingCards, ErrorBox, SymbolCell, NewsList, go, stockPath } from '../components/ui.jsx';
import { Sparkline } from '../components/charts.jsx';

export default function Markets({ briefing }) {
  const { data: b, error, loading, reload } = briefing;
  const [tab, setTab] = useState('sectors');
  if (!b && loading) return <LoadingCards />;
  if (!b && error) return <ErrorBox error={error} onRetry={reload} />;
  if (!b) return null;
  const goodCommodities = b.commodities.filter((c) => c.score >= 62);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Sectors &amp; Commodities</h1>
          <p>Where the money is flowing - ranked by growth over the last week, month and quarter.</p>
        </div>
      </div>

      <div className="grid">
        <div className="span-4 card hero">
          <div className="eyebrow"><Icon name="fire" size={15} />Hottest area</div>
          <a href={`#/${stockPath(b.hottest.symbol)}`}><div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 8 }}>{b.hottest.name}</div></a>
          <div className="muted small">Buy via <b>{b.hottest.symbol}</b> · 1M <Change value={b.hottest.ret21} /> · 3M <Change value={b.hottest.ret63} /></div>
          <div style={{ marginTop: 12 }}><Sparkline values={b.hottest.spark} width={260} height={50} /></div>
        </div>
        <div className="span-4 card">
          <div className="eyebrow" style={{ color: 'var(--up)' }}><Icon name="gem" size={15} />Best commodity</div>
          {b.commodities[0] && (
            <a href={`#/${stockPath(b.commodities[0].etf)}`} style={{ display: 'block' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{b.commodities[0].name}</div>
                  <div className="muted small">Buy via <b>{b.commodities[0].etf}</b> · 1M <Change value={b.commodities[0].ret21} /></div>
                </div>
                <ScoreRing score={b.commodities[0].score} size={64} stroke={6} />
              </div>
              <p className="small muted" style={{ margin: '10px 0 0' }}>{b.commodities[0].why}</p>
            </a>
          )}
        </div>
        <div className="span-4 card">
          <div className="eyebrow" style={{ color: 'var(--text-2)' }}><Icon name="info" size={15} />Commodity playbook</div>
          <ul className="reasons" style={{ marginTop: 10 }}>
            <li><span className="ico up">✓</span>{goodCommodities.length ? <span>In uptrends now: <b>{goodCommodities.map((c) => c.etf).join(', ')}</b></span> : 'No commodity is in a strong uptrend - keep this bucket small.'}</li>
            <li><span className="ico up">✓</span>Commodities often zig when stocks zag - they smooth out your account's swings.</li>
            <li><span className="ico down">!</span>Oil, natural gas and crypto can move 5-10% in a day - size them small.</li>
          </ul>
        </div>
      </div>

      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="chip-group">
          {[['sectors', 'Sectors'], ['themes', 'Themes'], ['commodities', 'Commodities & crypto']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <span className="faint small">Click anything for the full analysis</span>
      </div>

      {tab !== 'commodities' && <AreaTable rows={tab === 'sectors' ? b.sectors : b.themes} stocks={b.stocks} />}
      {tab === 'commodities' && (
        <div className="cgrid">
          {b.commodities.map((c) => (
            <div key={c.symbol} className="ccard" onClick={() => go(stockPath(c.etf))}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="tiny faint bold" style={{ letterSpacing: '0.05em' }}>{c.group.toUpperCase()}</div>
                  <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.02em' }}>{c.name}</div>
                  <div className="small muted num">{price(c.price)} <Change value={c.changePct} raw /></div>
                </div>
                <ScoreRing score={c.score} size={58} stroke={5} />
              </div>
              <div style={{ margin: '10px 0' }}><Sparkline values={c.spark} width={230} height={40} /></div>
              <div className="row wrap" style={{ gap: 6 }}>
                <SignalBadge signal={c.signal} />
                <span className="badge plain num">1M {(c.ret21 * 100).toFixed(1)}%</span>
                <span className="badge plain num">3M {(c.ret63 * 100).toFixed(1)}%</span>
              </div>
              <p className="small muted" style={{ margin: '10px 0 8px' }}>{c.blurb}</p>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span>Buy via <b>{c.etf}</b>{c.etfPrice ? <span className="faint num"> · ${price(c.etfPrice)}</span> : null}</span>
                <span className="faint" onClick={(e) => { e.stopPropagation(); go(stockPath(c.symbol)); }} style={{ textDecoration: 'underline' }}>futures chart</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'commodities' && b.commodities[0]?.news?.length > 0 && (
        <div className="card">
          <div className="card-head"><div className="card-title"><Icon name="news" size={15} />{b.commodities[0].name} news</div></div>
          <NewsList items={b.commodities[0].news} limit={4} />
        </div>
      )}
    </div>
  );
}

function AreaTable({ rows, stocks }) {
  const bySymbol = Object.fromEntries(stocks.map((s) => [s.symbol, s]));
  return (
    <div className="card flush">
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>#</th><th>Area</th><th className="r">Price</th><th className="r">1D</th><th className="r">1W</th><th className="r">1M</th><th className="r hide-sm">3M</th><th className="hide-sm">Trend</th><th>Score</th><th className="hide-sm">Best stocks inside</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const leaders = r.members.map((s) => bySymbol[s]).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 3);
              return (
                <tr key={r.symbol} className="click" onClick={() => go(stockPath(r.symbol))}>
                  <td><span className="rank">{i + 1}</span></td>
                  <td><SymbolCell symbol={r.name} name={r.symbol} /></td>
                  <td className="r">{price(r.price)}</td>
                  <td className="r"><Change value={r.changePct} raw /></td>
                  <td className="r"><Change value={r.ret5} /></td>
                  <td className="r"><Change value={r.ret21} className="bold" /></td>
                  <td className="r hide-sm"><Change value={r.ret63} /></td>
                  <td className="hide-sm"><Sparkline values={r.spark} width={90} height={28} /></td>
                  <td><ScoreBar score={r.score} /></td>
                  <td className="hide-sm">
                    <div className="row wrap" style={{ gap: 5 }}>
                      {leaders.map((s) => (
                        <span key={s.symbol} className="pick-chip" onClick={(e) => { e.stopPropagation(); go(stockPath(s.symbol)); }}>{s.symbol}<span>{s.score}</span></span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
