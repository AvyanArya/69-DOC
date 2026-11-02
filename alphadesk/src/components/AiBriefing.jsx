import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { ago } from '../format.js';
import { Icon, go, stockPath } from './ui.jsx';

const actionTone = (a) => (/buy/i.test(a) ? 'up' : /avoid|sell|profit/i.test(a) ? 'down' : 'neutral');

/** Today's AI agent briefing. Runs automatically once a day when an API key is set. */
export default function AiBriefing({ status }) {
  const [state, setState] = useState({ loading: true, enabled: false, briefing: null, running: false, error: null });
  const started = useRef(false);

  const run = async (force = false) => {
    setState((s) => ({ ...s, running: true, error: null }));
    try {
      const briefing = await api('/api/ai/briefing', { method: 'POST', body: { force } });
      setState((s) => ({ ...s, running: false, briefing }));
    } catch (err) {
      setState((s) => ({ ...s, running: false, error: err.message }));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/ai/briefing');
        setState((s) => ({ ...s, loading: false, enabled: res.enabled, briefing: res.briefing }));
        // Auto-run once per day per browser session.
        const flag = `alphadesk:ai-auto:${status?.date || new Date().toISOString().slice(0, 10)}`;
        if (res.enabled && !res.briefing && !started.current && !sessionStorage.getItem(flag)) {
          started.current = true;
          sessionStorage.setItem(flag, '1');
          run(false);
        }
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { loading, enabled, briefing, running, error } = state;
  const r = briefing && briefing.report;

  return (
    <div className="card ai-card">
      <div className="card-head wrap">
        <div className="row" style={{ gap: 10 }}>
          <span className="ai-tag"><Icon name="ai" size={13} stroke={2.2} />AI AGENT</span>
          <div className="card-title" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--text)' }}>Today's AI briefing</div>
          {briefing && <span className="card-sub">researched {ago(briefing.generatedAt)}</span>}
        </div>
        {enabled && (
          <button className="btn sm" onClick={() => run(true)} disabled={running}>
            <Icon name="refresh" size={14} />{running ? 'Researching…' : r ? 'Re-run research' : 'Run research'}
          </button>
        )}
      </div>

      {loading && <div className="faint small">Checking AI status…</div>}

      {!loading && !enabled && (
        <div className="muted" style={{ lineHeight: 1.6 }}>
          The quant engine above already works without AI. To switch on the <b>AI research agent</b> (it reads the scan, digs into the best names, checks live news and earnings dates on the web, and writes you a daily game plan), add an Anthropic API key:
          <div style={{ margin: '10px 0' }}><code className="inline">ANTHROPIC_API_KEY=sk-ant-…</code> in a <code className="inline">.env</code> file (local) or your Vercel project's environment variables, then restart.</div>
          <span className="faint small">See the README for the 1-minute setup.</span>
        </div>
      )}

      {running && (
        <div className="thinking" style={{ padding: '10px 0' }}>
          <span className="pulse" />
          <div>The agent is scanning the market, analysing the top names and checking news &amp; earnings dates… <span className="faint">(usually 1–3 minutes)</span></div>
        </div>
      )}
      {error && <div className="notice down" style={{ marginTop: 8 }}><Icon name="info" /><div>{error}</div></div>}

      {r && !running && <Report r={r} steps={briefing.steps} />}
    </div>
  );
}

function Report({ r, steps }) {
  const [showSteps, setShowSteps] = useState(false);
  const tp = r.topPick;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.35 }}>{r.headline}</div>
        <p className="muted" style={{ margin: '6px 0 0' }}>{r.marketView}</p>
      </div>

      <div className="grid" style={{ gap: 14 }}>
        <div className="span-7 card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div className="eyebrow">AI top pick</div>
            <span className="badge info num">Conviction {tp.conviction}/10</span>
          </div>
          <div className="row" style={{ gap: 10, margin: '6px 0 6px', alignItems: 'baseline' }}>
            <a href={`#/${stockPath(tp.symbol)}`} style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{tp.symbol}</a>
            <span className="muted">{tp.name}</span>
          </div>
          <p style={{ margin: '0 0 10px' }}>{tp.thesis}</p>
          <ul className="reasons">{tp.whyShort.map((x) => <li key={x}><span className="ico up">✓</span>{x}</li>)}</ul>
          <div className="levels" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            <div className="level"><div className="lbl">Entry</div><div className="small bold">{tp.entry}</div></div>
            <div className="level"><div className="lbl">Stop</div><div className="small bold down">{tp.stop}</div></div>
            <div className="level"><div className="lbl">Target</div><div className="small bold up">{tp.target}</div></div>
            <div className="level"><div className="lbl">Size</div><div className="small bold">{tp.positionSize}</div></div>
          </div>
        </div>
        <div className="span-5 stack" style={{ gap: 14 }}>
          <div className="ai-block"><h4>Catalysts</h4><ul>{tp.catalysts.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="ai-block"><h4>Risks</h4><ul>{tp.risks.map((x) => <li key={x} className="muted">{x}</li>)}</ul></div>
          <div className="ai-block">
            <h4>Hottest area: {r.hottestArea.name} ({r.hottestArea.etf})</h4>
            <p className="small" style={{ margin: '0 0 6px' }}>{r.hottestArea.why}</p>
            <ul className="small">{r.hottestArea.newsDrivers.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="small muted" style={{ margin: '6px 0 0' }}><b>How to play it:</b> {r.hottestArea.howToPlay}</p>
          </div>
        </div>
      </div>

      <div className="ai-grid">
        <div className="ai-block">
          <h4>Watchlist</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {r.watchlist.map((w) => (
              <div key={w.symbol} className="row" style={{ alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => go(stockPath(w.symbol))}>
                <b style={{ minWidth: 52 }}>{w.symbol}</b>
                <span className={`badge ${actionTone(w.action)}`} style={{ flex: 'none' }}>{w.action}</span>
                <span className="small muted">{w.reason}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ai-block">
          <h4>Commodities</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {r.commodities.map((c) => (
              <div key={c.name} className="row" style={{ alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => go(stockPath(c.etf))}>
                <b style={{ minWidth: 52 }}>{c.etf}</b>
                <span className={`badge ${actionTone(c.action)}`} style={{ flex: 'none' }}>{c.action}</span>
                <span className="small muted">{c.name}: {c.reason}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ai-block">
          <h4>Do this today</h4>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 5 }}>{r.todaysMoves.map((x) => <li key={x}>{x}</li>)}</ol>
          <h4 style={{ marginTop: 14 }}>Split the $100k</h4>
          <p className="small" style={{ margin: 0 }}>{r.allocation}</p>
        </div>
      </div>

      {r.keyEvents?.length > 0 && (
        <div className="ai-block"><h4>Key events ahead</h4><ul className="small">{r.keyEvents.map((x) => <li key={x}>{x}</li>)}</ul></div>
      )}

      {steps?.length > 0 && (
        <div>
          <button className="btn sm ghost" onClick={() => setShowSteps((v) => !v)}>{showSteps ? 'Hide' : 'Show'} how the agent researched this ({steps.length} steps)</button>
          {showSteps && (
            <div className="steps" style={{ marginTop: 8 }}>
              {steps.map((s, i) => <span className="step" key={i}>{s.tool}({s.input?.symbol || s.input?.query || ''})</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
