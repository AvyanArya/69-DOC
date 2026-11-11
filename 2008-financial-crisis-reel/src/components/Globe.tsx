import React, { useId } from "react";
import dots from "../data/landDots.json";
import { clamp } from "../lib/anim";
import { C, F } from "../theme";

const RAD = Math.PI / 180;

/** Financial centres used by the map sequences: [longitude, latitude]. */
export const CITIES = {
  nyc: [-74.0, 40.7],
  washington: [-77.0, 38.9],
  berlin: [13.4, 52.5],
  toronto: [-79.4, 43.7],
  saopaulo: [-46.6, -23.5],
  reykjavik: [-21.9, 64.1],
  dublin: [-6.3, 53.3],
  london: [-0.1, 51.5],
  madrid: [-3.7, 40.4],
  paris: [2.35, 48.9],
  amsterdam: [4.9, 52.4],
  frankfurt: [8.7, 50.1],
  zurich: [8.5, 47.4],
  moscow: [37.6, 55.8],
  dubai: [55.3, 25.2],
  mumbai: [72.9, 19.1],
  singapore: [103.8, 1.35],
  hongkong: [114.2, 22.3],
  shanghai: [121.5, 31.2],
  seoul: [127.0, 37.6],
  tokyo: [139.7, 35.7],
  sydney: [151.2, -33.9],
} as const;
export type CityId = keyof typeof CITIES;

type V3 = [number, number, number];
const vec = (lon: number, lat: number): V3 => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
const DOTS: V3[] = (dots as number[][]).map(([lon, lat]) => vec(lon, lat));

/** Rotate a world vector so that (lon0, lat0) faces the viewer. Returns [x right, y up, z towards viewer]. */
const view = (v: V3, lon0: number, lat0: number): V3 => {
  const cl = Math.cos(lon0 * RAD);
  const sl = Math.sin(lon0 * RAD);
  const x = v[0] * cl - v[2] * sl;
  const z1 = v[0] * sl + v[2] * cl;
  const cp = Math.cos(lat0 * RAD);
  const sp = Math.sin(lat0 * RAD);
  return [x, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
};

export type GlobeArc = { from: CityId; to: CityId; p: number; color?: string; width?: number; lift?: number };
export type GlobeNode = {
  city: CityId;
  a: number;
  color?: string;
  label?: string;
  pulse?: number;
  size?: number;
  labelSide?: "l" | "r";
  /** nudge the label away from the dot (px); a leader line is drawn when it is moved vertically */
  dx?: number;
  dy?: number;
  labelSize?: number;
  labelFont?: string;
  labelColor?: string;
  /** small second line under the label */
  sub?: string;
};

export const Globe: React.FC<{
  cx: number;
  cy: number;
  r: number;
  lon: number;
  lat: number;
  arcs?: GlobeArc[];
  nodes?: GlobeNode[];
  dotColor?: string;
  dotOpacity?: number;
  glow?: string;
  /** 0..1 – tints the whole sphere (used when the losses take over) */
  alarm?: number;
}> = ({ cx, cy, r, lon, lat, arcs = [], nodes = [], dotColor = C.paper, dotOpacity = 0.62, glow = "rgba(239,233,220,.20)", alarm = 0 }) => {
  const id = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");
  // land: one path of zero-length round-capped segments = thousands of dots in a single element
  let front = "";
  let edge = "";
  for (const d of DOTS) {
    const p = view(d, lon, lat);
    if (p[2] <= 0.02) continue;
    const s = `M${(cx + p[0] * r).toFixed(1)} ${(cy - p[1] * r).toFixed(1)}h0`;
    if (p[2] > 0.42) front += s;
    else edge += s;
  }
  // graticule
  const grat: string[] = [];
  for (let m = -180; m < 180; m += 30) {
    let d = "";
    let pen = false;
    for (let la = -84; la <= 84; la += 4) {
      const p = view(vec(m, la), lon, lat);
      if (p[2] > 0) {
        d += `${pen ? "L" : "M"}${(cx + p[0] * r).toFixed(1)} ${(cy - p[1] * r).toFixed(1)}`;
        pen = true;
      } else pen = false;
    }
    grat.push(d);
  }
  for (let la = -60; la <= 60; la += 30) {
    let d = "";
    let pen = false;
    for (let m = -180; m <= 180; m += 5) {
      const p = view(vec(m, la), lon, lat);
      if (p[2] > 0) {
        d += `${pen ? "L" : "M"}${(cx + p[0] * r).toFixed(1)} ${(cy - p[1] * r).toFixed(1)}`;
        pen = true;
      } else pen = false;
    }
    grat.push(d);
  }

  const arcEls = arcs.map((a, i) => {
    if (a.p <= 0) return null;
    const A = vec(CITIES[a.from][0], CITIES[a.from][1]);
    const B = vec(CITIES[a.to][0], CITIES[a.to][1]);
    const om = Math.acos(clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1));
    const lift = a.lift ?? 0.1 + om * 0.13;
    const N = 44;
    const upto = clamp(a.p) * N;
    let d = "";
    let pen = false;
    let head: [number, number] | null = null;
    for (let j = 0; j <= Math.ceil(upto); j++) {
      const k = Math.min(j, upto) / N;
      const s0 = Math.sin((1 - k) * om) / Math.sin(om);
      const s1 = Math.sin(k * om) / Math.sin(om);
      const w: V3 = [A[0] * s0 + B[0] * s1, A[1] * s0 + B[1] * s1, A[2] * s0 + B[2] * s1];
      const p = view(w, lon, lat);
      const rr = 1 + lift * Math.sin(Math.PI * k);
      const vis = p[2] > 0 || Math.hypot(p[0], p[1]) * rr > 1.0;
      if (vis) {
        const x = cx + p[0] * r * rr;
        const y = cy - p[1] * r * rr;
        d += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
        pen = true;
        head = [x, y];
      } else {
        pen = false;
        head = null;
      }
    }
    const col = a.color ?? C.green;
    const w = a.width ?? 3.2;
    return (
      <g key={i}>
        <path d={d} fill="none" stroke={col} strokeWidth={w * 3.2} strokeOpacity={0.16} strokeLinecap="round" />
        <path d={d} fill="none" stroke={col} strokeWidth={w} strokeOpacity={0.95} strokeLinecap="round" />
        {head && a.p < 1 ? <circle cx={head[0]} cy={head[1]} r={w * 2.1} fill="#fff" /> : null}
      </g>
    );
  });

  const placed = nodes
    .map((n) => {
      if (n.a <= 0) return null;
      const p = view(vec(CITIES[n.city][0], CITIES[n.city][1]), lon, lat);
      if (p[2] <= 0.03) return null;
      return { n, x: cx + p[0] * r, y: cy - p[1] * r, z: p[2], sz: (n.size ?? 9) * (0.75 + 0.25 * p[2]), fade: n.a * clamp(p[2] * 5) };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  const nodeEls = placed.map(({ n, x, y, sz, fade }, i) => {
    const col = n.color ?? C.green;
    const pulse = n.pulse ?? 0;
    return (
      <g key={i} opacity={fade}>
        {pulse > 0 && pulse < 1 ? <circle cx={x} cy={y} r={sz + pulse * 46} fill="none" stroke={col} strokeWidth={3} opacity={(1 - pulse) * 0.9} /> : null}
        <circle cx={x} cy={y} r={sz * 2.1} fill={col} opacity={0.25} />
        <circle cx={x} cy={y} r={sz} fill={col} />
        <circle cx={x} cy={y} r={sz * 0.42} fill="#fff" opacity={0.9} />
      </g>
    );
  });

  const labelEls = placed.map(({ n, x, y, sz, fade }, i) => {
    if (!n.label) return null;
    const right = (n.labelSide ?? "r") === "r";
    const big = n.labelSize ?? 23;
    return (
      <g key={i} opacity={fade}>
        {n.dy ? <line x1={x} y1={y} x2={x + (right ? sz + 8 : -sz - 8) + (n.dx ?? 0)} y2={y + n.dy} stroke="#fff" strokeOpacity={0.55} strokeWidth={1.6} /> : null}
        <text
          x={x + (right ? sz + 12 : -sz - 12) + (n.dx ?? 0)}
          y={y + big * 0.36 + (n.dy ?? 0)}
          textAnchor={right ? "start" : "end"}
          style={{ fontFamily: n.labelFont ?? F.sans, fontWeight: 800, fontSize: big, letterSpacing: n.labelFont ? 1 : 2, fill: n.labelColor ?? "#fff", paintOrder: "stroke", stroke: "rgba(8,8,9,.88)", strokeWidth: 7 }}
        >
          {n.label}
        </text>
        {n.sub ? (
          <text
            x={x + (right ? sz + 12 : -sz - 12) + (n.dx ?? 0)}
            y={y + big * 0.36 + (n.dy ?? 0) + 24}
            textAnchor={right ? "start" : "end"}
            style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 17, letterSpacing: 2, fill: "#fff", opacity: 0.8, paintOrder: "stroke", stroke: "rgba(8,8,9,.88)", strokeWidth: 6 }}
          >
            {n.sub}
          </text>
        ) : null}
      </g>
    );
  });

  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <radialGradient id={id + "s"} cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#2b2b2f" />
          <stop offset="62%" stopColor="#17171a" />
          <stop offset="100%" stopColor="#0b0b0d" />
        </radialGradient>
        <radialGradient id={id + "a"} cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor={glow} stopOpacity={0} />
          <stop offset="91%" stopColor={glow} stopOpacity={1} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id + "r"} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.red} stopOpacity={0.5} />
          <stop offset="100%" stopColor={C.redDeep} stopOpacity={0.12} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.1} fill={`url(#${id}a)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}s)`} />
      {alarm > 0 ? <circle cx={cx} cy={cy} r={r} fill={`url(#${id}r)`} opacity={alarm} /> : null}
      <g fill="none" stroke={C.paper} strokeOpacity={0.07} strokeWidth={1.2}>
        {grat.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path d={edge} stroke={dotColor} strokeOpacity={dotOpacity * 0.45} strokeWidth={r * 0.0105} strokeLinecap="round" fill="none" />
      <path d={front} stroke={dotColor} strokeOpacity={dotOpacity} strokeWidth={r * 0.013} strokeLinecap="round" fill="none" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.paper} strokeOpacity={0.22} strokeWidth={1.5} />
      {arcEls}
      {nodeEls}
      {labelEls}
    </svg>
  );
};
