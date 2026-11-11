import React from "react";
import { AbsoluteFill } from "remotion";
import { CityId, Globe, GlobeArc, GlobeNode } from "../components/Globe";
import { Flash } from "../components/Overlays";
import { BankIcon, Label, MiniDoc, Stamp } from "../components/Props";
import { E, clamp, fmtInt, lerp, prog, rnd, rndRange, shake, win } from "../lib/anim";
import { useT } from "../lib/time";
import { cue, scene } from "../lib/timeline";
import { C, F, W } from "../theme";

/* ───────────── persistent tracker: MORTGAGES → SECURITIES → GLOBAL INVESTORS ───────────── */

export const Tracker: React.FC<{ step: number; a?: number; top?: number }> = ({ step, a = 1, top = 262 }) => {
  const items = ["MORTGAGES", "SECURITIES", "GLOBAL INVESTORS"];
  return (
    <div style={{ position: "absolute", left: 0, width: W, top, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, opacity: a }}>
      {items.map((it, i) => {
        const on = clamp(step - i);
        const cur = clamp(1 - Math.abs(step - 1 - i));
        return (
          <React.Fragment key={it}>
            {i > 0 ? <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 30, color: on > 0.5 ? C.red : C.greyDark }}>→</span> : null}
            <span style={{ position: "relative", fontFamily: F.sans, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: C.paper, opacity: lerp(0.3, 1, on), transform: `scale(${1 + 0.07 * cur})` }}>
              {it}
              <span style={{ position: "absolute", left: 0, right: 0, bottom: -12, height: 5, background: C.red, transformOrigin: "0 50%", transform: `scaleX(${cur})` }} />
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Backdrop: React.FC<{ glow?: number }> = ({ glow = 1 }) => (
  <AbsoluteFill style={{ background: C.coal }}>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 42% at 50% 50%, rgba(239,233,220,${0.085 * glow}) 0%, rgba(239,233,220,0) 100%)` }} />
    <AbsoluteFill
      style={{
        backgroundImage: "linear-gradient(rgba(239,233,220,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(239,233,220,.035) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    />
  </AbsoluteFill>
);

/* ───────────── A · the bank and the loans it "didn't just keep" ───────────── */

const BankBeat: React.FC<{ t: number }> = ({ t }) => {
  const s = scene("s3");
  const keep = cue("s3.keep");
  const out = cue("s3.bundled");
  const a = 1 - E.inCubic(prog(t, out - 0.2, out + 0.12));
  if (a <= 0) return null;
  const pop = E.outBack(prog(t, s.start + 0.05, s.start + 0.5));
  const strike = E.outCubic(prog(t, keep + 0.42, keep + 0.7));
  const word = E.outExpo(prog(t, keep - 0.08, keep + 0.26));
  const k = shake(t, keep + 0.42, 10, 9, 32, 4);
  const leave = E.inCubic(prog(t, out - 0.45, out + 0.1));
  return (
    <AbsoluteFill style={{ opacity: a, transform: `translate(${k.x}px, ${k.y}px)` }}>
      <div style={{ position: "absolute", left: W / 2 - 150, top: 440 - leave * 120, transform: `scale(${pop})`, opacity: 1 - leave }}>
        <BankIcon size={300} />
      </div>
      {/* the loans sitting on the bank's books */}
      {Array.from({ length: 9 }, (_, i) => {
        const q = E.outBack(prog(t, s.start + 0.3 + i * 0.05, s.start + 0.7 + i * 0.05));
        const fly = E.inCubic(prog(t, out - 0.5 + i * 0.03, out + 0.05 + i * 0.03));
        return (
          <div key={i} style={{ position: "absolute", left: 138 + i * 92, top: 820 + (i % 2) * 14 - fly * 900, transform: `scale(${q}) rotate(${rndRange(i, -7, 7) + fly * 80}deg)`, opacity: clamp(q * 2) }}>
            <MiniDoc w={74} />
          </div>
        );
      })}
      <Label style={{ position: "absolute", left: 0, width: W, top: 952, textAlign: "center", opacity: 0.55 * prog(t, s.start + 0.5, s.start + 0.9) * (1 - leave) }} size={24}>
        MORTGAGES ON THE BANK'S BOOKS
      </Label>
      {/* "KEEP", struck out */}
      <div style={{ position: "absolute", left: 0, width: W, top: 1030, textAlign: "center", opacity: word * (1 - leave) }}>
        <span style={{ position: "relative", display: "inline-block", fontFamily: F.serif, fontWeight: 900, fontSize: 210, lineHeight: 1, color: C.paper, letterSpacing: lerp(30, 4, word), transform: `scale(${lerp(1.3, 1, word)})` }}>
          KEEP
          <span style={{ position: "absolute", left: -34, right: -34, top: "47%", height: 20, background: C.red, transformOrigin: "0 50%", transform: `scaleX(${strike}) rotate(-4deg)`, borderRadius: 4 }} />
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── B · thousands of loans stacked, pressed into one product ───────────── */

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const ISO = { x: 540, y: 1068 };
const iso = (x: number, y: number, z: number): [number, number] => [ISO.x + (x - y) * COS, ISO.y + (x + y) * SIN - z];
const DA = 214; // document footprint
const DB = 276;
const N = 150;
const PITCH = 3.3;

const quad = (cx: number, cy: number, z: number, a: number, b: number, th: number, ox = 0, oy = 0, w = 1, h = 1) => {
  // rectangle (ox,oy,w,h) in unit doc coords → screen polygon
  const c = Math.cos(th);
  const s = Math.sin(th);
  const pts: [number, number][] = [
    [ox, oy],
    [ox + w, oy],
    [ox + w, oy + h],
    [ox, oy + h],
  ];
  return pts
    .map(([u, v]) => {
      const lx = (u - 0.5) * a;
      const ly = (v - 0.5) * b;
      const p = iso(cx + lx * c - ly * s, cy + lx * s + ly * c, z);
      return `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    })
    .join(" ");
};

const StackBeat: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s3.bundled");
  const tog = cue("s3.together");
  const prod = cue("s3.products");
  const mbs = cue("s3.mbs");
  const sec = cue("s3.securities");
  const out = cue("s3.sold");
  if (t < t0 - 0.2) return null;
  const exit = E.inOutCubic(prog(t, out - 0.1, out + 0.55));
  if (exit >= 1) return null;

  const squeeze = E.inOutCubic(prog(t, tog - 0.05, tog + 0.45));
  const morph = E.inOutCubic(prog(t, prod - 0.02, prod + 0.5));
  const pitch = lerp(PITCH, 2.55, squeeze);
  const height = N * pitch;
  const bob = Math.sin((t - prod) * 2.1) * 7 * morph;
  const k1 = shake(t, tog + 0.4, 10, 8, 30, 7);
  const k2 = shake(t, sec, 18, 8, 34, 9);

  const docs: React.ReactNode[] = [];
  let landed = 0;
  if (morph < 1) {
    for (let i = 0; i < N; i++) {
      const start = t0 + Math.pow(i / N, 0.82) * 1.28;
      const q = prog(t, start, start + 0.46);
      if (q <= 0) continue;
      if (q >= 1) landed++;
      const e = E.outQuart(q);
      const jit = 1 - squeeze;
      const fx = rndRange(i * 3.7, -11, 11) * jit;
      const fy = rndRange(i * 5.1, -11, 11) * jit;
      const fth = rndRange(i * 2.3, -0.075, 0.075) * jit;
      const x = lerp(rndRange(i * 9.9, -520, 520), fx, e);
      const y = lerp(rndRange(i * 7.3, -520, 520), fy, e);
      const z = lerp(i * pitch + 1250, i * pitch, e);
      const th = lerp(rndRange(i * 4.4, -2.4, 2.4), fth, e);
      const shade = Math.round(lerp(176, 243, i / N));
      const fill = `rgb(${shade},${shade - 5},${shade - 16})`;
      const top = i >= N - 7 || q < 1;
      docs.push(
        <g key={i} opacity={Math.min(1, q * 5)}>
          <polygon points={quad(x, y, z, DA, DB, th)} fill={fill} stroke="rgba(20,19,18,.42)" strokeWidth={0.9} />
          {top ? (
            <g fill={C.ink}>
              <polygon points={quad(x, y, z, DA, DB, th, 0.12, 0.1, 0.5, 0.07)} opacity={0.82} />
              {[0.27, 0.38, 0.49, 0.6, 0.71].map((v, j) => (
                <polygon key={j} points={quad(x, y, z, DA, DB, th, 0.12, v, j === 4 ? 0.42 : 0.76, 0.03)} opacity={0.28} />
              ))}
            </g>
          ) : null}
        </g>,
      );
    }
  }
  const count = Math.round(4499 * Math.pow(clamp(prog(t, t0 + 0.15, t0 + 1.75)), 1.25));

  // the product: one clean block where the pile used to be
  const hBox = height * lerp(1, 0.9, morph);
  const a = DA / 2 + 4;
  const b = DB / 2 + 4;
  const P = (x: number, y: number, z: number) => iso(x, y, z + bob).map((v) => v.toFixed(1)).join(",");
  const topF = `${P(-a, -b, hBox)} ${P(a, -b, hBox)} ${P(a, b, hBox)} ${P(-a, b, hBox)}`;
  const leftF = `${P(-a, b, hBox)} ${P(a, b, hBox)} ${P(a, b, 0)} ${P(-a, b, 0)}`; // faces the viewer's left
  const rightF = `${P(a, -b, hBox)} ${P(a, b, hBox)} ${P(a, b, 0)} ${P(a, -b, 0)}`;
  const glint = prog(t, prod + 0.55, prod + 1.5);
  const lA = iso(-a, b, hBox + bob);
  const rA = iso(a, b, hBox + bob);
  const titleA = E.outExpo(prog(t, mbs, mbs + 0.4));
  const subA = E.outExpo(prog(t, mbs + 0.5, mbs + 0.9));

  return (
    <AbsoluteFill style={{ transform: `translate(${k1.x + k2.x}px, ${k1.y + k2.y - exit * 150}px) scale(${lerp(1, 0.16, exit)})`, transformOrigin: "50% 62%", opacity: 1 - prog(exit, 0.72, 1) }}>
      {/* counter */}
      <div style={{ position: "absolute", left: 0, width: W, top: 1206, textAlign: "center", opacity: win(t, t0 + 0.1, mbs - 0.12, 0.25, 0.25) }}>
        <div style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 112, lineHeight: 1, color: C.paper, fontFeatureSettings: '"tnum" 1' }}>{fmtInt(count)}</div>
        <Label size={24} style={{ marginTop: 8, opacity: 0.7 }}>
          MORTGAGES IN ONE POOL
        </Label>
      </div>

      <svg width={W} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="s3glint" x1="0" y1="0" x2="1" y2="1">
            <stop offset={`${clamp(glint - 0.12) * 100}%`} stopColor="#fff" stopOpacity={0} />
            <stop offset={`${glint * 100}%`} stopColor="#fff" stopOpacity={0.55} />
            <stop offset={`${clamp(glint + 0.12) * 100}%`} stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* contact shadow */}
        <ellipse cx={ISO.x} cy={ISO.y + 16} rx={300} ry={104} fill="#000" opacity={0.5 * prog(landed + (morph >= 1 ? N : 0), 0, 30)} />
        <g opacity={1 - morph}>{docs}</g>
        {morph > 0 ? (
          <g opacity={morph}>
            <polygon points={leftF} fill="#D5CEBC" />
            <polygon points={rightF} fill="#A8A190" />
            <polygon points={topF} fill="#F4EFE3" />
            <polygon points={leftF} fill="url(#s3glint)" />
            <polygon points={topF} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2} />
            {/* a red band, like the wrapper round a bundle of notes */}
            <polygon points={`${P(-a, b, hBox * 0.6)} ${P(a, b, hBox * 0.6)} ${P(a, b, hBox * 0.46)} ${P(-a, b, hBox * 0.46)}`} fill={C.red} />
            <polygon points={`${P(a, -b, hBox * 0.6)} ${P(a, b, hBox * 0.6)} ${P(a, b, hBox * 0.46)} ${P(a, -b, hBox * 0.46)}`} fill={C.redDeep} />
            {/* lettering set into the left face */}
            <g transform={`matrix(${COS},${-SIN},0,1,${lA[0]},${lA[1]})`}>
              <text x={22} y={hBox * 0.27} style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 96, fill: C.ink }}>
                MBS
              </text>
              <text x={24} y={hBox * 0.5} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 22, letterSpacing: 3, fill: "#fff" }}>
                4,499 LOANS · 1 SECURITY
              </text>
              <text x={24} y={hBox * 0.78} style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 21, letterSpacing: 1.5, fill: C.ink, opacity: 0.7 }}>
                SERIES 2006-NC2
              </text>
            </g>
            <g transform={`matrix(${COS},${SIN},0,1,${rA[0]},${rA[1]})`} opacity={0}>
              <text x={-10} y={0} />
            </g>
          </g>
        ) : null}
      </svg>
      {/* the rating that made it sellable */}
      <div style={{ position: "absolute", left: 610, top: 500 + bob * -1 }}>
        <Stamp text="AAA" sub="RATED" p={prog(t, sec, sec + 0.5)} color={C.green} rot={11} size={104} />
      </div>
      <Flash a={0.3 * (1 - prog(t, prod + 0.3, prod + 0.5)) * (t >= prod + 0.3 ? 1 : 0)} color={C.paper} />

      {/* name of the product */}
      <div style={{ position: "absolute", left: 0, width: W, top: 1226, textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 86, lineHeight: 1, color: C.paper, opacity: titleA, letterSpacing: lerp(14, 0, titleA), transform: `translateY(${(1 - titleA) * 30}px)` }}>
          MORTGAGE-BACKED
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 58, letterSpacing: lerp(40, 19, subA), color: C.red, opacity: subA, marginTop: 8 }}>SECURITIES</div>
      </div>
      <div style={{ position: "absolute", left: 76, top: 1372, width: 928, textAlign: "center", fontFamily: F.sans, fontWeight: 500, fontSize: 17, letterSpacing: 0.5, color: C.paper, opacity: 0.5 * win(t, t0 + 0.6, mbs - 0.1, 0.3, 0.3) }}>
        Real example: one 2006 deal, CMLTI 2006-NC2, pooled 4,499 loans · Source: Financial Crisis Inquiry Commission
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── C · sold to investors around the world ───────────── */

const ROUTES: [CityId, number, string?, ("l" | "r")?][] = [
  ["london", 0.0, "LONDON", "l"],
  ["toronto", 0.08],
  ["frankfurt", 0.16, "FRANKFURT", "r"],
  ["saopaulo", 0.22],
  ["zurich", 0.3],
  ["reykjavik", 0.36, "REYKJAVIK", "l"],
  ["paris", 0.42],
  ["dubai", 0.52, "DUBAI", "r"],
  ["moscow", 0.58],
  ["mumbai", 0.66],
  ["hongkong", 0.76, "HONG KONG", "l"],
  ["singapore", 0.84],
  ["tokyo", 0.92, "TOKYO", "r"],
  ["sydney", 1.0],
];
export const GLOBE = { cx: 540, cy: 890, r: 452 };

const WorldBeat: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s3.sold");
  const end = scene("s3").end;
  if (t < t0) return null;
  const rise = E.outCubic(prog(t, t0, t0 + 0.75));
  const spin = lerp(-58, 42, E.inOutQuad(prog(t, t0 + 0.2, end + 0.3)));
  const arcs: GlobeArc[] = [];
  const nodes: GlobeNode[] = [{ city: "nyc", a: rise, color: C.paper, label: "NEW YORK", labelSide: "l", size: 12, pulse: prog((t - t0) % 0.9, 0, 0.9) }];
  for (const [city, d, label, side] of ROUTES) {
    const s = t0 + 0.32 + d * 1.25;
    const p = E.outCubic(prog(t, s, s + 0.72));
    arcs.push({ from: "nyc", to: city, p });
    nodes.push({ city, a: prog(t, s + 0.55, s + 0.75), label, labelSide: side, pulse: prog(t, s + 0.62, s + 1.3) });
  }
  const BUYERS = ["PENSION FUNDS", "BANKS", "INSURERS", "HEDGE FUNDS"];
  return (
    <AbsoluteFill style={{ opacity: prog(t, t0, t0 + 0.3) }}>
      <AbsoluteFill style={{ transform: `translateY(${(1 - rise) * 420}px) scale(${lerp(0.82, 1, rise)})`, transformOrigin: "50% 50%" }}>
        <Globe {...GLOBE} lon={spin} lat={24} arcs={arcs} nodes={nodes} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, width: W, top: 372, textAlign: "center", fontFamily: F.serif, fontWeight: 900, fontStyle: "italic", fontSize: 58, color: C.paper, opacity: prog(t, t0 + 0.35, t0 + 0.75), letterSpacing: 0.5 }}>
        Sold around the world.
      </div>
      <div style={{ position: "absolute", left: 60, width: 960, top: 1322, display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        {BUYERS.map((bname, i) => {
          const q = E.outBack(prog(t, t0 + 0.9 + i * 0.16, t0 + 1.2 + i * 0.16));
          return (
            <div key={bname} style={{ border: `2px solid ${C.green}`, color: C.paper, fontFamily: F.sans, fontWeight: 800, fontSize: 23, letterSpacing: 2.2, padding: "9px 16px 8px", borderRadius: 4, opacity: clamp(q * 2), transform: `scale(${q})`, background: "rgba(47,158,92,.14)" }}>
              {bname}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const S3Bundle: React.FC = () => {
  const t = useT();
  const s = scene("s3");
  const prod = cue("s3.products");
  const sold = cue("s3.sold");
  const step = 1 + E.inOutCubic(prog(t, prod, prod + 0.4)) + E.inOutCubic(prog(t, sold, sold + 0.4));
  const fadeIn = prog(t, s.start, s.start + 0.2);
  const fadeOut = 1 - E.inCubic(prog(t, s.end - 0.16, s.end + 0.02));
  // a few loose sheets drift past in the background of the stacking beat for depth
  const dust = Array.from({ length: 10 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Backdrop />
      <AbsoluteFill style={{ opacity: fadeOut }}>
        {dust.map((i) => {
          const a = win(t, cue("s3.bundled") + i * 0.1, cue("s3.products"), 0.2, 0.3);
          const y = ((t * (60 + rnd(i) * 80) + i * 310) % 2300) - 200;
          return a > 0 ? (
            <div key={i} style={{ position: "absolute", left: 40 + rnd(i * 3) * 980, top: y, opacity: a * 0.16, transform: `rotate(${rnd(i * 7) * 360 + t * 40}deg)`, filter: "blur(3px)" }}>
              <MiniDoc w={54} />
            </div>
          ) : null;
        })}
        <BankBeat t={t} />
        <StackBeat t={t} />
        <WorldBeat t={t} />
        <Tracker step={step} a={prog(t, s.start + 0.15, s.start + 0.6)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
