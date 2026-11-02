import React from 'react';
import { money } from '../format.js';
import { useSettings } from '../store.js';
import { Icon, LoadingCards, ErrorBox, go, stockPath, scoreColor } from '../components/ui.jsx';
import { Donut, seriesColor } from '../components/charts.jsx';

// Fixed color per asset class so a bucket keeps its color across plans.
const BUCKET_ORDER = ['core', 'momentum', 'sector', 'commodities', 'swing', 'daytrade', 'leveraged', 'crypto', 'cash'];
const bucketColor = (key) => (key === 'cash' ? 'var(--text-3)' : seriesColor(BUCKET_ORDER.indexOf(key)));

export function challengeWeek(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return { days, week: Math.min(6, Math.max(1, Math.floor(days / 7) + 1)), daysLeft: Math.max(0, 42 - days) };
}

export default function Plan({ briefing }) {
  const { data: b, error, loading, reload } = briefing;
  const [settings, setSettings] = useSettings();
  if (!b && loading) return <LoadingCards />;
  if (!b && error) return <ErrorBox error={error} onRetry={reload} />;
  if (!b) return null;

  const plan = b.plans.find((p) => p.key === settings.plan) || b.plans[1];
  const scale = settings.capital / 100000;
  const { week, daysLeft } = challengeWeek(settings.startDate);
  const slices = plan.buckets.map((bk) => ({ label: bk.label, value: bk.pct * settings.capital / 100, color: bucketColor(bk.key), sub: money(bk.pct * settings.capital / 100, 0) }));
  const choose = (p) => setSettings((s) => ({ ...s, plan: p.key, profile: p.key }));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Your 6-week game plan</h1>
          <p>Pick a risk level. Each plan splits your money across asset classes and fills them with today's strongest tickers.</p>
        </div>
      </div>

      <div className="card">
        <div className="row wrap" style={{ gap: 18, alignItems: 'flex-end' }}>
          <div className="field" style={{ width: 170 }}>
            <label htmlFor="cap">Starting capital</label>
            <input id="cap" className="input num" type="number" min="1000" step="1000" value={settings.capital}
              onChange={(e) => setSettings((s) => ({ ...s, capital: Math.max(1000, Number(e.target.value) || 100000) }))} />
          </div>
          <div className="field" style={{ width: 170 }}>
            <label htmlFor="start">Challenge start date</label>
            <input id="start" className="input" type="date" value={settings.startDate} onChange={(e) => setSettings((s) => ({ ...s, startDate: e.target.value }))} />
          </div>
          <div className="row" style={{ gap: 22, marginLeft: 'auto' }}>
            <div><div className="tiny faint bold">YOU'RE IN</div><div style={{ fontSize: 20, fontWeight: 800 }}>Week {week} of 6</div></div>
            <div><div className="tiny faint bold">DAYS LEFT</div><div style={{ fontSize: 20, fontWeight: 800 }} className="num">{daysLeft}</div></div>
          </div>
        </div>
      </div>

      <div className="plan-cards">
        {b.plans.map((p) => (
          <button key={p.key} className={`plan-card ${plan.key === p.key ? 'active' : ''}`} onClick={() => choose(p)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className={`badge ${p.key === 'conservative' ? 'up' : p.key === 'aggressive' ? 'down' : 'neutral'}`}>{p.risk}</span>
              {p.recommended && <span className="badge info">Recommended</span>}
            </div>
            <h3>{p.name}</h3>
            <p>{p.tagline}</p>
            <div className="small faint" style={{ marginTop: 8 }}>Typical 6-week swing: <b className="muted num">±{(p.typicalSwing * 100).toFixed(0)}%</b> (±{money(p.typicalSwing * settings.capital, 0)})</div>
          </button>
        ))}
      </div>

      {plan.regimeNote && <div className="notice warn"><Icon name="shield" /><div>{plan.regimeNote}</div></div>}

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="plan" size={15} />{plan.name} · how to split {money(settings.capital, 0)}</div>
          <span className="card-sub">Best for: {plan.bestFor}</span>
        </div>
        <div className="alloc">
          <Donut slices={slices} center={<div><div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }} className="num">{money(settings.capital, 0)}</div><div className="tiny faint bold">{plan.buckets.length} ASSET CLASSES</div></div>} />
          <div style={{ display: 'grid', gap: 10 }}>
            {plan.buckets.map((bk) => (
              <div className="bucket" key={bk.key}>
                <div className="bucket-head">
                  <span className="sw" style={{ background: bucketColor(bk.key) }} />
                  <b>{bk.label}</b>
                  <span className={`badge ${bk.risk.includes('low') || bk.risk === 'Low' ? 'up' : bk.risk === 'Medium' ? 'neutral' : 'down'}`} style={{ height: 20, fontSize: 11 }}>{bk.risk} risk</span>
                  <span className="pct">{bk.pct}% <span className="faint" style={{ fontWeight: 500 }}>· {money(bk.dollars * scale, 0)}</span></span>
                </div>
                <div className="small muted" style={{ margin: '6px 0 8px' }}>{bk.what} <span className="faint">{bk.how}</span></div>
                {bk.note && <div className="small warn" style={{ marginBottom: 8 }}>{bk.note}</div>}
                <div className="row wrap" style={{ gap: 6 }}>
                  {bk.picks.map((p) => (
                    <span key={p.symbol} className="pick-chip" onClick={() => go(stockPath(p.symbol))} title={p.name}>
                      {p.symbol}
                      {p.score != null && <span style={{ color: scoreColor(p.score) }}>{p.score}</span>}
                      <span>{money(p.dollars * scale, 0)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title"><Icon name="today" size={15} />Week-by-week playbook</div></div>
        <div className="timeline">
          {b.gamePlan.map((g) => (
            <div key={g.week} className={`tl ${g.week === week ? 'now' : g.week < week ? 'done' : ''}`}>
              <div className="wk">Week {g.week}{g.week === week ? ' · now' : ''}</div>
              <h4>{g.title}</h4>
              <p>{g.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid">
        <div className="span-6 card">
          <div className="card-head"><div className="card-title"><Icon name="shield" size={15} />Rules that win challenges</div></div>
          <ul className="reasons">{b.rules.map((r) => <li key={r}><span className="ico up">✓</span>{r}</li>)}</ul>
        </div>
        <div className="span-6 card">
          <div className="card-head"><div className="card-title"><Icon name="info" size={15} />Asset classes explained</div></div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[...new Map(b.plans.flatMap((p) => p.buckets).map((bk) => [bk.key, bk])).values()]
              .sort((x, y) => BUCKET_ORDER.indexOf(x.key) - BUCKET_ORDER.indexOf(y.key))
              .map((bk) => (
                <div key={bk.key} className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="sw" style={{ width: 10, height: 10, borderRadius: 3, background: bucketColor(bk.key), marginTop: 6, flex: 'none' }} />
                  <div className="small"><b>{bk.label}</b> <span className="faint">({bk.risk} risk, ~{(bk.vol * 100).toFixed(0)}% yearly volatility)</span><div className="muted">{bk.how}</div></div>
                </div>
              ))}
          </div>
          <p className="tiny faint" style={{ marginBottom: 0 }}>“Typical swing” = one standard deviation of the plan over 6 weeks - roughly 2 out of 3 outcomes land inside it. It measures risk, not expected return.</p>
        </div>
      </div>
    </div>
  );
}
