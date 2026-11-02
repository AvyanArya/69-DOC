import React, { useMemo, useState } from 'react';
import { api, useApi } from '../api.js';
import { money, price, pct, compactNum } from '../format.js';
import { useSettings } from '../store.js';
import { sizeFor } from '../sizing.js';
import { Icon, Change, SignalBadge, RiskBadge, ScoreRing, NewsList, ErrorBox, Skeleton, Stat, go } from '../components/ui.jsx';
import { PriceChart } from '../components/charts.jsx';

const RANGES = [['1M', 21], ['3M', 63], ['6M', 126], ['1Y', 252], ['2Y', 504]];

export default function Stock({ symbol, status }) {
  const [settings] = useSettings();
  const { data: d, error, loading, reload } = useApi(`/api/stock?symbol=${encodeURIComponent(symbol)}`, { ttl: 5 * 60 * 1000 });

  if (loading && !d) return <StockSkeleton symbol={symbol} />;
  if (error && !d) {
    return (
      <div className="stack">
        <BackLink />
        <ErrorBox error={error.includes('No data') || error.includes('Not Found') ? `We couldn't find "${symbol}". Check the ticker - try the search box above.` : error} onRetry={reload} />
      </div>
    );
  }
  if (!d) return null;
  const m = d.metrics;
  const size = sizeFor(d.levels, d.price, settings);
  const isFuture = /=F$|-USD$|^\^/.test(d.symbol);

  return (
    <div className="stack">
      <BackLink />
      {/* Header */}
      <div className="card hero">
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="row wrap" style={{ gap: 12, alignItems: 'baseline' }}>
              <span className="hero-sym">{d.symbol}</span>
              <span className="hero-price">${price(d.price)}</span>
              <Change value={d.changePct} raw className="bold" />
            </div>
            <div className="hero-name">{d.longName}{d.exchange ? ` · ${d.exchange}` : ''}{d.sector ? ` · ${d.sector.name}` : ''}</div>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <SignalBadge signal={d.signal} size="lg" />
              <RiskBadge risk={d.risk} />
              {d.sector && <span className="badge plain">Sector rank #{d.sector.rank} of {d.sector.of}</span>}
              {d.newsPulse && <span className={`badge ${d.newsPulse.label === 'Positive' ? 'up' : d.newsPulse.label === 'Negative' ? 'down' : 'plain'}`}>News: {d.newsPulse.label}</span>}
              {d.newsPulse?.earningsSoon && <span className="badge neutral">Earnings soon?</span>}
            </div>
            <div className="why-line" style={{ marginBottom: 0 }}>“{d.why}”</div>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <ScoreRing score={d.score} size={96} stroke={8} />
          </div>
        </div>
        <div className="row wrap" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={() => go(`portfolio?add=${encodeURIComponent(d.symbol)}`)}><Icon name="plus" size={15} />Add to portfolio</button>
          <button className="btn" onClick={() => go(`ask?q=${encodeURIComponent(`Should I buy ${d.symbol} for my challenge right now?`)}`)}><Icon name="ai" size={15} />Ask AI about {d.symbol}</button>
          {d.marketTime && <span className="faint small" style={{ marginLeft: 'auto' }}>Last trade {new Date(d.marketTime * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
        </div>
      </div>

      <div className="grid">
        <div className="span-8 stack">
          <ChartCard d={d} />
          <div className="grid" style={{ gap: 18 }}>
            <div className="span-6 card">
              <div className="card-head"><div className="card-title up">Why buy it</div></div>
              {d.reasons.pros.length ? (
                <ul className="reasons">{d.reasons.pros.map((r) => <li key={r}><span className="ico up">✓</span>{r}</li>)}</ul>
              ) : <div className="faint small">No strong positives right now.</div>}
            </div>
            <div className="span-6 card">
              <div className="card-head"><div className="card-title down">Watch out for</div></div>
              {d.reasons.cons.length ? (
                <ul className="reasons">{d.reasons.cons.map((r) => <li key={r}><span className="ico down">!</span>{r}</li>)}</ul>
              ) : <div className="faint small">No major red flags in the data.</div>}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Key numbers</div></div>
            <div className="stats">
              <Stat label="1 week" value={pct(m.ret5)} className={m.ret5 >= 0 ? 'up' : 'down'} />
              <Stat label="1 month" value={pct(m.ret21)} className={m.ret21 >= 0 ? 'up' : 'down'} />
              <Stat label="3 months" value={pct(m.ret63)} className={m.ret63 >= 0 ? 'up' : 'down'} />
              <Stat label="6 months" value={pct(m.ret126)} className={m.ret126 >= 0 ? 'up' : 'down'} />
              <Stat label="Year to date" value={pct(m.ytd)} className={m.ytd >= 0 ? 'up' : 'down'} />
              <Stat label="vs S&P 500 (3M)" value={pct(m.rs63)} className={m.rs63 >= 0 ? 'up' : 'down'} hint="Positive = beating the market" />
              <Stat label="RSI (14)" value={m.rsi.toFixed(0)} hint={m.rsi > 70 ? 'Overbought' : m.rsi < 30 ? 'Oversold' : 'Healthy range'} className={m.rsi > 70 || m.rsi < 30 ? 'warn' : ''} />
              <Stat label="Volatility" value={`${(m.vol * 100).toFixed(0)}%`} hint="Annualised" />
              <Stat label="Avg daily move" value={`${(m.atrPct * 100).toFixed(1)}%`} hint="ATR - typical day's range" />
              <Stat label="From 52w high" value={pct(m.fromHigh)} className={m.fromHigh > -0.05 ? 'up' : ''} />
              <Stat label="Volume trend" value={m.volRatio ? `${m.volRatio.toFixed(2)}x` : '—'} hint="10-day vs 50-day" />
              <Stat label="Day volume" value={compactNum(d.volume)} hint={d.dayLow ? `Range ${price(d.dayLow)}–${price(d.dayHigh)}` : ''} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="row small" style={{ justifyContent: 'space-between' }}><span className="faint">52-week low <b className="muted num">{price(m.low52)}</b></span><span className="faint">52-week high <b className="muted num">{price(m.high52)}</b></span></div>
              <div className="range52"><div className="mark" style={{ left: `${Math.min(100, Math.max(0, ((m.price - m.low52) / (m.high52 - m.low52 || 1)) * 100))}%` }} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title"><Icon name="news" size={15} />Latest news</div>{d.newsPulse && <span className="card-sub">{d.newsPulse.bullish} positive · {d.newsPulse.bearish} negative · {d.newsPulse.neutral} neutral</span>}</div>
            <NewsList items={d.news} limit={12} />
          </div>
        </div>

        <div className="span-4 stack">
          <div className="card">
            <div className="card-head"><div className="card-title"><Icon name="target" size={15} />Trade plan</div><span className="badge plain">{size?.profile}</span></div>
            <div className="levels" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginTop: 0 }}>
              <div className="level"><div className="lbl">Buy zone</div><div className="val" style={{ fontSize: 14.5 }}>${price(d.levels.entryLow)}–{price(d.levels.entryHigh)}</div></div>
              <div className="level"><div className="lbl">Reward : risk</div><div className="val">{d.levels.rewardRisk} : 1</div></div>
              <div className="level"><div className="lbl">Stop-loss</div><div className="val down">${price(d.levels.stop)}</div><div className="sub down">{pct(d.levels.stopPct)}</div></div>
              <div className="level"><div className="lbl">6-week target</div><div className="val up">${price(d.levels.target)}</div><div className="sub up">{pct(d.levels.targetPct)}</div></div>
            </div>
            <p className="small muted" style={{ margin: '12px 0' }}>{d.levels.entryNote}</p>
            <hr className="divider" style={{ margin: '12px 0' }} />
            <div className="small faint bold" style={{ letterSpacing: '0.05em' }}>POSITION SIZE FOR YOUR {money(settings.capital, 0)}</div>
            {size && (
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8, alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }} className="num">{money(size.dollars, 0)}</div>
                  <div className="small muted num">{size.shares.toLocaleString()} {isFuture ? 'units' : 'shares'} · {(size.pctOfAccount * 100).toFixed(1)}% of account</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tiny faint bold">MAX LOSS</div>
                  <div className="down bold num">{money(size.maxLoss, 0)}</div>
                </div>
              </div>
            )}
            <p className="tiny faint" style={{ margin: '10px 0 0' }}>Sized so hitting the stop costs about {settings.profile === 'conservative' ? '0.5' : settings.profile === 'aggressive' ? '2' : '1'}% of your account. Change risk level in Game Plan.</p>
            {isFuture && <p className="tiny warn" style={{ margin: '8px 0 0' }}>This is a futures/crypto/index symbol. In most challenges you buy it through an ETF - see Sectors &amp; Commodities.</p>}
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Score breakdown</div><b className="num">{d.score}/100</b></div>
            <div className="parts">
              {d.parts.map((p) => (
                <div className="part" key={p.key}>
                  <div className="top"><span>{p.label}</span><b>{p.pts}/{p.max}</b></div>
                  <div className="track"><div className="fill" style={{ width: `${(p.pts / p.max) * 100}%` }} /></div>
                  <div className="note">{p.note}</div>
                </div>
              ))}
            </div>
          </div>

          <AiStock symbol={d.symbol} enabled={status?.ai} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ d }) {
  const [range, setRange] = useState(126);
  const [show, setShow] = useState({ sma20: true, sma50: true, sma200: false, levels: true });
  const c = d.chart;
  const n = Math.min(range, c.c.length);
  const view = useMemo(() => ({
    t: c.t.slice(-n), c: c.c.slice(-n),
    sma20: c.sma20.slice(-n), sma50: c.sma50.slice(-n), sma200: c.sma200.slice(-n),
  }), [c, n]);
  const overlays = [
    show.sma20 && { label: '20-day avg', values: view.sma20, color: 'var(--series-1)' },
    show.sma50 && { label: '50-day avg', values: view.sma50, color: 'var(--series-2)' },
    show.sma200 && { label: '200-day avg', values: view.sma200, color: 'var(--series-7)' },
  ].filter(Boolean);
  const levels = show.levels ? [
    { label: 'TARGET', value: d.levels.target, color: 'var(--up)' },
    { label: 'STOP', value: d.levels.stop, color: 'var(--down)' },
  ] : [];
  const change = view.c.length ? view.c[view.c.length - 1] / view.c[0] - 1 : 0;
  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));
  return (
    <div className="card">
      <div className="card-head wrap">
        <div className="row" style={{ gap: 10 }}>
          <div className="card-title">Price</div>
          <Change value={change} className="bold small" />
        </div>
        <div className="chip-group">
          {RANGES.filter(([, days], i) => i === 0 || RANGES[i - 1][1] < c.c.length).map(([l, days]) => <button key={l} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{l}</button>)}
        </div>
      </div>
      <PriceChart t={view.t} c={view.c} overlays={overlays} levels={levels} height={320} />
      <div className="legend" style={{ marginTop: 10 }}>
        <span className={show.sma20 ? '' : 'off'} onClick={() => toggle('sma20')}><i style={{ background: 'var(--series-1)' }} />20-day average</span>
        <span className={show.sma50 ? '' : 'off'} onClick={() => toggle('sma50')}><i style={{ background: 'var(--series-2)' }} />50-day average</span>
        <span className={show.sma200 ? '' : 'off'} onClick={() => toggle('sma200')}><i style={{ background: 'var(--series-7)' }} />200-day average</span>
        <span className={show.levels ? '' : 'off'} onClick={() => toggle('levels')}><i style={{ background: 'var(--up)' }} />Stop &amp; target</span>
      </div>
    </div>
  );
}

function AiStock({ symbol, enabled }) {
  const [state, setState] = useState({ running: false, data: null, error: null });
  const run = async (force) => {
    setState({ running: true, data: null, error: null });
    try {
      setState({ running: false, data: await api('/api/ai/stock', { method: 'POST', body: { symbol, force } }), error: null });
    } catch (err) {
      setState({ running: false, data: null, error: err.message });
    }
  };
  const r = state.data?.report;
  const tone = r ? (/buy/i.test(r.verdict) ? 'up' : /sell|avoid/i.test(r.verdict) ? 'down' : 'neutral') : '';
  return (
    <div className="card ai-card">
      <div className="card-head">
        <span className="ai-tag"><Icon name="ai" size={13} stroke={2.2} />AI DEEP-DIVE</span>
        {r && <button className="btn sm ghost" onClick={() => run(true)}><Icon name="refresh" size={14} />Re-run</button>}
      </div>
      {!enabled && <p className="small muted" style={{ margin: 0 }}>Add an <code className="inline">ANTHROPIC_API_KEY</code> to let the AI agent research {symbol}: news, earnings dates, catalysts and a verdict for your challenge.</p>}
      {enabled && !r && !state.running && (
        <>
          <p className="small muted" style={{ margin: '0 0 12px' }}>The agent will analyse {symbol}, compare it with today's market, read the latest news and check for earnings in the next 6 weeks.</p>
          <button className="btn primary" onClick={() => run(false)}><Icon name="ai" size={15} />Research {symbol}</button>
        </>
      )}
      {state.running && <div className="thinking"><span className="pulse" />Researching {symbol}… (about a minute)</div>}
      {state.error && <div className="notice down small"><Icon name="info" size={16} />{state.error}</div>}
      {r && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row wrap"><span className={`badge lg ${tone}`}>{r.verdict}</span><span className="badge info">Conviction {r.conviction}/10</span></div>
          <p style={{ margin: 0 }}>{r.summary}</p>
          <div className="ai-block"><h4>Bull case</h4><ul className="small">{r.bullCase.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="ai-block"><h4>Bear case</h4><ul className="small">{r.bearCase.map((x) => <li key={x} className="muted">{x}</li>)}</ul></div>
          <div className="ai-block"><h4>Catalysts (next 6 weeks)</h4><ul className="small">{r.catalysts.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="ai-block"><h4>News take</h4><p className="small" style={{ margin: 0 }}>{r.newsTake}</p></div>
          <div className="ai-block">
            <h4>Plan</h4>
            <div className="small" style={{ display: 'grid', gap: 4 }}>
              <div><b>Entry:</b> {r.plan.entry}</div><div><b>Stop:</b> <span className="down">{r.plan.stop}</span></div>
              <div><b>Target:</b> <span className="up">{r.plan.target}</span></div><div><b>Size:</b> {r.plan.positionSize}</div>
              <div><b>Exit rule:</b> {r.plan.exitRule}</div>
            </div>
          </div>
          <div className="notice info small">{r.fitForChallenge}</div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return <div><button className="btn sm ghost" onClick={() => (window.history.length > 1 ? window.history.back() : go(''))}><Icon name="back" size={15} />Back</button></div>;
}

function StockSkeleton({ symbol }) {
  return (
    <div className="stack">
      <BackLink />
      <div className="card"><div style={{ fontSize: 36, fontWeight: 800 }}>{symbol}</div><Skeleton h={16} w="40%" style={{ marginTop: 10 }} /><Skeleton h={14} w="60%" style={{ marginTop: 14 }} /></div>
      <div className="grid"><div className="card span-8"><Skeleton h={320} /></div><div className="card span-4"><Skeleton h={320} /></div></div>
    </div>
  );
}
