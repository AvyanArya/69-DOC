import React, { useEffect, useMemo, useState } from 'react';
import { api, useApi } from '../api.js';
import { money, price, pct } from '../format.js';
import { usePortfolio, positionsFrom, useSettings } from '../store.js';
import { sizeFor } from '../sizing.js';
import { Icon, Change, SymbolCell, go, stockPath } from '../components/ui.jsx';
import { Donut, AllocationLegend, seriesColor } from '../components/charts.jsx';
import SearchBox from '../components/SearchBox.jsx';
import { challengeWeek } from './Plan.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function Portfolio({ query = {} }) {
  const [trades, setTrades] = usePortfolio();
  const [settings] = useSettings();
  const { open, cashFlow, realized } = useMemo(() => positionsFrom(trades), [trades]);
  const syms = [...new Set([...open.map((p) => p.symbol), 'SPY'])].join(',');
  const quotes = useApi(`/api/quotes?symbols=${encodeURIComponent(syms)}`, { ttl: 60 * 1000 });
  const q = quotes.data || {};

  const rows = open.map((p) => {
    const last = q[p.symbol]?.price ?? p.avg;
    const value = last * p.shares;
    return { ...p, last, value, pnl: value - p.cost, pnlPct: value / p.cost - 1, day: q[p.symbol]?.changePct };
  });
  const invested = rows.reduce((a, r) => a + r.value, 0);
  const cash = settings.capital + cashFlow;
  const total = cash + invested;
  const ret = total / settings.capital - 1;
  const { week, daysLeft } = challengeWeek(settings.startDate);

  // S&P 500 over the same period, for comparison.
  let spyRet = null;
  const spy = q.SPY;
  if (spy && spy.t?.length) {
    const startTs = new Date(`${settings.startDate}T00:00:00`).getTime() / 1000;
    const idx = spy.t.findIndex((t) => t >= startTs);
    const base = idx > 0 ? spy.closes[idx - 1] : idx === 0 ? spy.closes[0] : null;
    if (base) spyRet = spy.price / base - 1;
  }

  const slices = [
    ...rows.sort((a, b) => b.value - a.value).map((r, i) => ({ label: r.symbol, value: r.value, color: seriesColor(i), sub: money(r.value, 0) })),
    ...(cash > 0 ? [{ label: 'Cash', value: cash, color: 'var(--text-3)', sub: money(cash, 0) }] : []),
  ];

  const addTrade = (t) => setTrades((list) => [...list, { ...t, id: Date.now() }]);
  const removeTrade = (id) => setTrades((list) => list.filter((t) => t.id !== id));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>My challenge portfolio</h1>
          <p>Log your trades here to track your $ and % return against the S&amp;P 500. Saved in this browser.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => go(`ask?q=${encodeURIComponent('Review my portfolio: what should I sell, add to, or change today to win the challenge?')}`)}><Icon name="ai" size={15} />AI portfolio review</button>
          <button className="btn ghost" onClick={quotes.reload}><Icon name="refresh" size={15} />Prices</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="lbl">Account value</div><div className="val">{money(total, 0)}</div><div className={`sub ${ret >= 0 ? 'up' : 'down'}`}>{pct(ret, 2)} total</div></div>
        <div className="kpi"><div className="lbl">Profit / loss</div><div className={`val ${total - settings.capital >= 0 ? 'up' : 'down'}`}>{money(total - settings.capital, 0)}</div><div className="sub faint">Realized {money(realized, 0)}</div></div>
        <div className="kpi"><div className="lbl">vs S&amp;P 500</div><div className={`val ${spyRet == null ? '' : ret - spyRet >= 0 ? 'up' : 'down'}`}>{spyRet == null ? '—' : pct(ret - spyRet, 2)}</div><div className="sub faint">S&amp;P since start: {spyRet == null ? '—' : pct(spyRet, 2)}</div></div>
        <div className="kpi"><div className="lbl">Cash</div><div className="val">{money(cash, 0)}</div><div className="sub faint">{((cash / total) * 100 || 0).toFixed(0)}% of account</div></div>
        <div className="kpi"><div className="lbl">Challenge</div><div className="val">Week {week}</div><div className="sub faint">{daysLeft} days left</div></div>
      </div>

      <TradeForm onAdd={addTrade} positions={rows} preset={query.add} settings={settings} cash={cash} />

      <div className="grid">
        <div className="span-8 card flush">
          <div className="card-head" style={{ padding: '18px 20px 4px' }}><div className="card-title"><Icon name="portfolio" size={15} />Open positions</div></div>
          {rows.length ? (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Holding</th><th className="r">Shares</th><th className="r hide-sm">Avg cost</th><th className="r">Price</th><th className="r hide-sm">Today</th><th className="r">Value</th><th className="r">P&amp;L</th><th className="r hide-sm">Weight</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.symbol} className="click" onClick={() => go(stockPath(r.symbol))}>
                      <td><SymbolCell symbol={r.symbol} name={r.name} /></td>
                      <td className="r">{r.shares.toLocaleString()}</td>
                      <td className="r hide-sm">{price(r.avg)}</td>
                      <td className="r">{price(r.last)}</td>
                      <td className="r hide-sm"><Change value={r.day} raw /></td>
                      <td className="r">{money(r.value, 0)}</td>
                      <td className="r"><div className={r.pnl >= 0 ? 'up' : 'down'}>{money(r.pnl, 0)}</div><div className="tiny"><Change value={r.pnlPct} /></div></td>
                      <td className="r hide-sm">{((r.value / total) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><div className="big">📈</div>No positions yet. Add your first trade above - or start from <a href="#/" className="bold" style={{ color: 'var(--accent)' }}>today's top pick</a>.</div>
          )}
        </div>
        <div className="span-4 card">
          <div className="card-head"><div className="card-title">Allocation</div></div>
          <div className="stack" style={{ alignItems: 'center' }}>
            <Donut slices={slices} size={190} thickness={26} center={<div><div className="num" style={{ fontWeight: 800, fontSize: 18 }}>{money(total, 0)}</div><div className="tiny faint bold">TOTAL</div></div>} />
            <div style={{ width: '100%' }}><AllocationLegend slices={slices} /></div>
          </div>
        </div>
      </div>

      {trades.length > 0 && (
        <div className="card flush">
          <div className="card-head" style={{ padding: '18px 20px 4px' }}>
            <div className="card-title">Trade log</div>
            <button className="btn sm ghost danger" onClick={() => { if (window.confirm('Delete ALL trades and reset the portfolio?')) setTrades([]); }}><Icon name="trash" size={14} />Reset</button>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Side</th><th>Symbol</th><th className="r">Shares</th><th className="r">Price</th><th className="r">Total</th><th /></tr></thead>
              <tbody>
                {[...trades].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).map((t) => (
                  <tr key={t.id}>
                    <td className="num">{t.date}</td>
                    <td><span className={`badge ${t.side === 'buy' ? 'up' : 'down'}`}>{t.side.toUpperCase()}</span></td>
                    <td className="sym">{t.symbol}</td>
                    <td className="r">{t.shares.toLocaleString()}</td>
                    <td className="r">{price(t.price)}</td>
                    <td className="r">{money(t.shares * t.price, 0)}</td>
                    <td className="r"><button className="btn sm ghost" onClick={() => removeTrade(t.id)} title="Delete trade"><Icon name="trash" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TradeForm({ onAdd, positions, preset, settings, cash }) {
  const [f, setF] = useState({ symbol: '', name: '', side: 'buy', shares: '', price: '', date: today() });
  const [hint, setHint] = useState(null);
  const [err, setErr] = useState(null);

  const load = async (symbol, name) => {
    setF((x) => ({ ...x, symbol, name: name || symbol }));
    setHint('Loading price…');
    try {
      const d = await api(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      const s = sizeFor(d.levels, d.price, settings);
      setF((x) => ({ ...x, symbol: d.symbol, name: d.name, price: d.price.toFixed(2), shares: x.shares || (s && s.shares ? String(s.shares) : '') }));
      setHint(s ? `${d.signal.label} · score ${d.score}. Suggested: ${s.shares} shares (${money(s.dollars, 0)}), stop at $${price(d.levels.stop)}.` : null);
    } catch (e) {
      setHint(null);
      setErr(e.message);
    }
  };

  useEffect(() => { if (preset) load(preset.toUpperCase()); }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    setErr(null);
    const shares = Number(f.shares), px = Number(f.price);
    if (!f.symbol) return setErr('Pick a symbol first.');
    if (!(shares > 0) || !(px > 0)) return setErr('Enter shares and price.');
    if (f.side === 'sell') {
      const pos = positions.find((p) => p.symbol === f.symbol);
      if (!pos || pos.shares < shares) return setErr(`You only hold ${pos ? pos.shares : 0} shares of ${f.symbol}.`);
    } else if (shares * px > cash + 0.01) {
      return setErr(`That costs ${money(shares * px, 0)} but you only have ${money(cash, 0)} cash.`);
    }
    onAdd({ symbol: f.symbol, name: f.name, side: f.side, shares, price: px, date: f.date });
    setF({ symbol: '', name: '', side: 'buy', shares: '', price: '', date: today() });
    setHint(null);
    if (preset) window.location.hash = '#/portfolio';
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><div className="card-title"><Icon name="plus" size={15} />Log a trade</div>{f.symbol && <span className="badge info">{f.symbol}</span>}</div>
      <div className="form-row">
        <div className="field"><label>Symbol</label><SearchBox placeholder={f.symbol ? `${f.symbol} - ${f.name}` : 'Search…'} onPick={(it) => load(it.symbol, it.name)} /></div>
        <div className="field"><label htmlFor="side">Side</label>
          <select id="side" className="select" value={f.side} onChange={(e) => setF({ ...f, side: e.target.value })}><option value="buy">Buy</option><option value="sell">Sell</option></select>
        </div>
        <div className="field"><label htmlFor="sh">Shares</label><input id="sh" className="input num" type="number" min="0" step="any" value={f.shares} onChange={(e) => setF({ ...f, shares: e.target.value })} /></div>
        <div className="field"><label htmlFor="px">Price</label><input id="px" className="input num" type="number" min="0" step="any" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        <div className="field"><label htmlFor="dt">Date</label><input id="dt" className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <button className="btn primary" type="submit" style={{ height: 38 }}>Add trade</button>
      </div>
      {(hint || err) && <div className={`small ${err ? 'down' : 'muted'}`} style={{ marginTop: 10 }}>{err || hint}{f.shares && f.price && !err ? ` Total: ${money(Number(f.shares) * Number(f.price), 0)}.` : ''}</div>}
    </form>
  );
}
