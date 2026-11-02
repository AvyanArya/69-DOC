import React, { useEffect, useMemo, useRef, useState } from 'react';
import { price as fmtPrice, pct, money } from '../format.js';

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const fmtDate = (t, withYear) => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

/** Price chart: area for price + optional moving averages, crosshair tooltip. */
export function PriceChart({ t, c, overlays = [], height = 300, levels = [] }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 8, r: 58, t: 12, b: 26 };
  const W = width, H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  const { min, max, x, y } = useMemo(() => {
    const vals = [...c, ...overlays.flatMap((o) => o.values.filter((v) => v != null)), ...levels.map((l) => l.value)].filter((v) => v != null);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const padY = (hi - lo) * 0.06 || hi * 0.02;
    lo -= padY; hi += padY;
    return {
      min: lo, max: hi,
      x: (i) => pad.l + (c.length <= 1 ? 0 : (i / (c.length - 1)) * iw),
      y: (v) => pad.t + ih - ((v - lo) / (hi - lo)) * ih,
    };
  }, [c, overlays, levels, iw, ih]);

  if (!c.length) return <div className="faint small">No chart data.</div>;
  const up = c[c.length - 1] >= c[0];
  const color = up ? 'var(--up)' : 'var(--down)';
  const line = c.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(c.length - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`;
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i) / ticks);
  const xTicks = 5;
  const xIdx = Array.from({ length: xTicks }, (_, i) => Math.round(((c.length - 1) * (i + 0.5)) / xTicks));
  const spanDays = t.length ? (t[t.length - 1] - t[0]) / 86400 : 0;
  const gid = `g${Math.round(Math.random() * 1e9)}`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - pad.l) / iw) * (c.length - 1));
    setHover(Math.max(0, Math.min(c.length - 1, i)));
  };

  return (
    <div className="chart-wrap" ref={ref}>
      <svg width={W} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchMove={(e) => onMove(e.touches[0] ? { clientX: e.touches[0].clientX, currentTarget: e.currentTarget } : e)} role="img" aria-label="Price chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + iw} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={i === 0 ? '' : '2 4'} />
            <text x={W - pad.r + 8} y={y(v) + 4} fontSize="11" fill="var(--text-3)" className="num">{fmtPrice(v)}</text>
          </g>
        ))}
        {xIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="var(--text-3)" textAnchor="middle">{t[i] ? fmtDate(t[i], spanDays > 300) : ''}</text>
        ))}
        {levels.map((l) => (
          <g key={l.label}>
            <line x1={pad.l} x2={pad.l + iw} y1={y(l.value)} y2={y(l.value)} stroke={l.color} strokeWidth="1" strokeDasharray="5 4" opacity="0.8" />
            <rect x={pad.l + iw + 2} y={y(l.value) - 9} width={54} height={18} rx={4} fill={l.color} />
            <text x={pad.l + iw + 29} y={y(l.value) + 4} fontSize="10.5" fill="#fff" textAnchor="middle" fontWeight="700">{l.label}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${gid})`} />
        {overlays.map((o) => {
          let d = '', started = false;
          o.values.forEach((v, i) => { if (v == null) return; d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; started = true; });
          return <path key={o.label} d={d} fill="none" stroke={o.color} strokeWidth="1.5" opacity="0.9" />;
        })}
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-3)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(c[hover])} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
        <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" />
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 70), W - 90), top: Math.max(y(c[hover]) - 12, 50) }}>
          <div className="d">{fmtDate(t[hover], true)}</div>
          <div className="p">{fmtPrice(c[hover])}</div>
          <div className={c[hover] >= c[0] ? 'up' : 'down'} style={{ fontSize: 11.5 }}>{pct(c[hover] / c[0] - 1)} in view</div>
          {overlays.filter((o) => o.values[hover] != null).map((o) => (
            <div key={o.label} style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{o.label}: {fmtPrice(o.values[hover])}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Minimal trend line. */
export function Sparkline({ values, width = 110, height = 34, fill = true }) {
  const v = (values || []).filter((x) => x != null);
  if (v.length < 2) return <svg width={width} height={height} />;
  const lo = Math.min(...v), hi = Math.max(...v);
  const x = (i) => (i / (v.length - 1)) * width;
  const y = (val) => height - 2 - ((val - lo) / (hi - lo || 1)) * (height - 4);
  const d = v.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('');
  const color = v[v.length - 1] >= v[0] ? 'var(--up)' : 'var(--down)';
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      {fill && <path d={`${d}L${width},${height}L0,${height}Z`} fill={color} opacity="0.1" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'];
export const seriesColor = (i) => SERIES[i % SERIES.length];

/** Donut with hover; colors are passed per slice so they follow the entity. */
export function Donut({ slices, size = 210, thickness = 30, center }) {
  const [hover, setHover] = useState(null);
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = size / 2 - 4, ir = r - thickness;
  let acc = 0;
  const arcs = slices.map((s, i) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const gap = slices.length > 1 ? 0.012 : 0;
    const A0 = a0 + gap, A1 = Math.max(A0, a1 - gap);
    const large = A1 - A0 > Math.PI ? 1 : 0;
    const cx = size / 2, cy = size / 2;
    const p = (ang, rad) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
    const d = slices.length === 1
      ? `M${cx - r},${cy}A${r},${r} 0 1 1 ${cx + r},${cy}A${r},${r} 0 1 1 ${cx - r},${cy}M${cx - ir},${cy}A${ir},${ir} 0 1 0 ${cx + ir},${cy}A${ir},${ir} 0 1 0 ${cx - ir},${cy}Z`
      : `M${p(A0, r)}A${r},${r} 0 ${large} 1 ${p(A1, r)}L${p(A1, ir)}A${ir},${ir} 0 ${large} 0 ${p(A0, ir)}Z`;
    return { ...s, d, i };
  });
  const h = hover != null ? slices[hover] : null;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label="Allocation chart">
        {arcs.map((a) => (
          <path key={a.label} d={a.d} fill={a.color} fillRule="evenodd" opacity={hover == null || hover === a.i ? 1 : 0.35}
            onMouseEnter={() => setHover(a.i)} onMouseLeave={() => setHover(null)} style={{ transition: 'opacity .15s', cursor: 'default' }} />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        {h ? (
          <div style={{ maxWidth: size - thickness * 2 - 16 }}>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }} className="num">{Math.round((h.value / total) * 100)}%</div>
            <div className="small muted" style={{ lineHeight: 1.25 }}>{h.label}</div>
            {h.sub && <div className="tiny faint num">{h.sub}</div>}
          </div>
        ) : center}
      </div>
    </div>
  );
}

/** Diverging horizontal bars around zero (e.g. sector returns). */
export function GrowthBars({ rows, valueKey = 'ret21', onClick, max }) {
  const m = max || Math.max(0.02, ...rows.map((r) => Math.abs(r[valueKey] || 0)));
  return (
    <div className="barlist">
      {rows.map((r) => {
        const v = r[valueKey] || 0;
        const w = (Math.abs(v) / m) * 50;
        return (
          <div className="barrow" key={r.symbol} onClick={() => onClick && onClick(r)} title={`${r.name} (${r.symbol}): ${pct(v)}`}>
            <div className="nm">{r.name} <span className="faint tiny">{r.symbol}</span></div>
            <div className="track">
              <div className="zero" />
              <div className="bar" style={{ left: v >= 0 ? '50%' : `${50 - w}%`, width: `${Math.max(w, 0.6)}%`, background: v >= 0 ? 'var(--up)' : 'var(--down)', opacity: 0.85 }} />
            </div>
            <div className={`v ${v >= 0 ? 'up' : 'down'}`}>{pct(v)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AllocationLegend({ slices }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="legend" style={{ display: 'grid', gap: 6 }}>
      {slices.map((s) => (
        <span key={s.label} style={{ cursor: 'default' }}>
          <i style={{ background: s.color, height: 10, width: 10, borderRadius: 3 }} />
          <span style={{ color: 'var(--text)' }}>{s.label}</span>
          <span className="faint num">{Math.round((s.value / total) * 100)}% · {money(s.value)}</span>
        </span>
      ))}
    </div>
  );
}
