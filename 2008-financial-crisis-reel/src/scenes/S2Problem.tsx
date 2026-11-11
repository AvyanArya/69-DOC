import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { ArchiveTag, Flash } from "../components/Overlays";
import { ParallaxPhoto } from "../components/Parallax";
import { BankIcon, HouseIcon, Label, MortgageDoc, Stamp, Typewriter } from "../components/Props";
import { E, clamp, drift, lerp, prog, shake, win } from "../lib/anim";
import { useT } from "../lib/time";
import { cue, scene } from "../lib/timeline";
import { C, F, H, W } from "../theme";

export const YEAR_TOP = 838; // matches the "2008" of the title card so the cut is seamless
const NUM: React.CSSProperties = { fontFeatureSettings: '"lnum" 1, "tnum" 1' };

/* ───────────── 1 · "we need to go back a few years": the year rolls back on newsprint ───────────── */

const Rewind: React.FC = () => {
  const t = useT();
  const s = scene("s2");
  const r0 = cue("s2.rewind");
  const r1 = cue("s2.rewindEnd");
  const out = cue("s2.banks");
  if (t >= out + 0.4) return null;
  // the last digit rolls 8 → 7 → 6 → 5, snapping on each year like a mechanical counter
  const steps = 3;
  const raw = prog(t, r0, r1 - 0.25) * steps;
  const idx = Math.min(Math.floor(raw), steps);
  const frac = idx >= steps ? 0 : E.inOutQuart(clamp((raw - idx) * 1.15));
  const roll = idx + frac;
  const speed = idx >= steps ? 0 : Math.sin(Math.PI * clamp((raw - idx) * 1.15));
  const DH = 372;
  const DW = 236;
  const year = 2008 - Math.round(roll);
  const k = shake(t, r1 - 0.25, 7, 8, 30, 3);
  const push = 1 + 0.035 * prog(t, s.start, out);
  const ruler = roll * 190;
  const labelA = win(t, s.start + 0.25, r0 - 0.05, 0.25, 0.2);
  const rewA = win(t, r0, r1 + 0.1, 0.12, 0.2);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("textures/newsprint_c.jpg")})`,
          backgroundSize: "cover",
          transform: `scale(${1.08 + 0.04 * prog(t, s.start, out)})`,
        }}
      />
      <AbsoluteFill style={{ transform: `translate(${k.x}px, ${k.y}px) scale(${push})` }}>
        {/* a clock running backwards */}
        <svg width={W} height={700} style={{ position: "absolute", left: 0, top: 0, opacity: 0.2 * prog(t, s.start + 0.1, s.start + 0.6) }}>
          <g transform="translate(540 452)" fill="none" stroke={C.ink} strokeLinecap="round">
            <circle r={178} strokeWidth={5} />
            <circle r={164} strokeWidth={1.5} />
            {Array.from({ length: 60 }, (_, i) => (
              <line key={i} x1={0} y1={i % 5 === 0 ? -140 : -152} x2={0} y2={-160} strokeWidth={i % 5 === 0 ? 5 : 2} transform={`rotate(${i * 6})`} />
            ))}
            <line x1={0} y1={18} x2={0} y2={-92} strokeWidth={9} transform={`rotate(${300 - roll * 90 - (t - s.start) * 4})`} />
            <line x1={0} y1={24} x2={0} y2={-134} strokeWidth={5} transform={`rotate(${40 - roll * 720 - (t - s.start) * 50})`} />
            <circle r={9} fill={C.ink} />
          </g>
        </svg>
        {/* kicker */}
        <div style={{ position: "absolute", left: 0, width: W, top: 706, textAlign: "center", fontFamily: F.mono, fontWeight: 700, fontSize: 30, letterSpacing: 10, color: C.red }}>
          <span style={{ opacity: labelA, position: "absolute", left: 0, width: W }}>TO UNDERSTAND WHY</span>
          <span style={{ opacity: rewAStep(rewA, t), position: "absolute", left: 0, width: W }}>◀◀ REWIND</span>
        </div>
        {/* the year */}
        <div style={{ position: "absolute", left: (W - DW * 4) / 2, top: YEAR_TOP, height: DH, display: "flex", fontFamily: F.serif, fontWeight: 900, fontSize: DH, lineHeight: `${DH}px`, color: C.ink, ...NUM }}>
          {["2", "0", "0"].map((d, i) => (
            <div key={i} style={{ width: DW, textAlign: "center" }}>
              {d}
            </div>
          ))}
          <div style={{ width: DW, height: DH, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: DW, transform: `translateY(${(roll - 3) * DH}px)`, filter: `blur(${speed * 5}px)` }}>
              {["5", "6", "7", "8"].map((d) => (
                <div key={d} style={{ height: DH, textAlign: "center" }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* timeline ruler sliding under a fixed red marker */}
        <div style={{ position: "absolute", left: 0, top: 1262, width: W, height: 130, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 30, height: 3, background: C.ink, opacity: 0.85 }} />
          {Array.from({ length: 13 }, (_, i) => {
            const y = 2001 + i;
            const x = W / 2 + (y - 2008) * 190 + ruler;
            return (
              <div key={y} style={{ position: "absolute", left: x - 60, top: 12, width: 120, textAlign: "center" }}>
                <div style={{ width: 3, height: 36, background: C.ink, margin: "0 auto", opacity: 0.85 }} />
                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 27, color: C.ink, marginTop: 8, opacity: y === year ? 1 : 0.42, ...NUM }}>{y}</div>
              </div>
            );
          })}
          {Array.from({ length: 52 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: W / 2 + (i - 28) * 47.5 + ruler, top: 30, width: 1.5, height: 14, background: C.ink, opacity: 0.45 }} />
          ))}
        </div>
        <svg width={40} height={30} style={{ position: "absolute", left: W / 2 - 20, top: 1236 }}>
          <path d="M2,2 L38,2 L20,28 Z" fill={C.red} />
        </svg>
      </AbsoluteFill>
      {/* the cut from the black title card arrives as a paper-white flash */}
      <Flash a={0.9 * (1 - prog(t, s.start, s.start + 0.22))} color="#fff" />
    </AbsoluteFill>
  );
};
const rewAStep = (a: number, t: number) => a * (0.55 + 0.45 * (Math.sin(t * 22) > 0 ? 1 : 0.35));

/* ───────────── 2 · suburbia, easy money and the contracts ───────────── */

const Bill: React.FC<{ p: number; from: [number, number]; to: [number, number]; lift: number; coin?: boolean }> = ({ p, from, to, lift, coin }) => {
  if (p <= 0 || p >= 1) return null;
  const e = E.inOutQuad(p);
  const x = lerp(from[0], to[0], e);
  const y = lerp(from[1], to[1], e) - Math.sin(Math.PI * e) * lift;
  const dx = to[0] - from[0];
  const ang = (Math.atan2(-Math.cos(Math.PI * e) * lift * Math.PI, dx) * 180) / Math.PI;
  const a = Math.min(p * 8, (1 - p) * 8, 1);
  return coin ? (
    <div style={{ position: "absolute", left: x - 17, top: y - 17, width: 34, height: 34, borderRadius: 17, border: `3px solid ${C.paper}`, opacity: a * 0.9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans, fontWeight: 800, fontSize: 19, color: C.paper }}>
      $
    </div>
  ) : (
    <div
      style={{
        position: "absolute",
        left: x - 44,
        top: y - 23,
        width: 88,
        height: 46,
        borderRadius: 5,
        background: C.green,
        border: "2.5px solid #BDE7CD",
        boxShadow: "0 6px 18px rgba(0,0,0,.45)",
        opacity: a,
        transform: `rotate(${ang * 0.6}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F.serif,
        fontWeight: 900,
        fontSize: 30,
        color: "#EAF8EF",
      }}
    >
      $
    </div>
  );
};

const MoneyFlow: React.FC<{ t: number; t0: number; t1: number }> = ({ t, t0, t1 }) => {
  const a = win(t, t0, t1, 0.3, 0.22);
  if (a <= 0) return null;
  const bank: [number, number] = [232, 930];
  const home: [number, number] = [848, 930];
  const pop = (d: number) => E.outBack(prog(t, t0 + d, t0 + d + 0.35));
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {/* darken the picture behind the diagram so the line-work reads */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 34% at 50% 48%, rgba(8,8,9,.78) 0%, rgba(8,8,9,.55) 60%, rgba(8,8,9,0) 100%)" }} />
      {/* loans arc over the top, repayments trickle back underneath */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${bank[0] + 70},${bank[1] - 70} Q540,${bank[1] - 420} ${home[0] - 70},${home[1] - 70}`} fill="none" stroke={C.paper} strokeOpacity={0.35} strokeWidth={2.5} strokeDasharray="4 12" />
        <path d={`M${home[0] - 70},${home[1] + 90} Q540,${home[1] + 300} ${bank[0] + 70},${bank[1] + 90}`} fill="none" stroke={C.paper} strokeOpacity={0.25} strokeWidth={2.5} strokeDasharray="4 12" />
      </svg>
      {Array.from({ length: 9 }, (_, i) => (
        <Bill key={i} p={prog(t, t0 + 0.12 + i * 0.16, t0 + 0.95 + i * 0.16)} from={[bank[0] + 70, bank[1] - 70]} to={[home[0] - 70, home[1] - 70]} lift={176} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Bill key={i} coin p={prog(t, t0 + 0.55 + i * 0.26, t0 + 1.75 + i * 0.26)} from={[home[0] - 70, home[1] + 90]} to={[bank[0] + 70, bank[1] + 90]} lift={-105} />
      ))}
      <div style={{ position: "absolute", left: bank[0] - 105, top: bank[1] - 105, transform: `scale(${pop(0)})` }}>
        <BankIcon size={210} />
        <Label style={{ textAlign: "center", marginTop: 20 }} size={30}>
          BANK
        </Label>
      </div>
      <div style={{ position: "absolute", left: home[0] - 105, top: home[1] - 105, transform: `scale(${pop(0.12)})` }}>
        <HouseIcon size={210} />
        <Label style={{ textAlign: "center", marginTop: 20 }} size={30}>
          BORROWER
        </Label>
      </div>
      <Label style={{ position: "absolute", left: 0, width: W, top: 560, textAlign: "center", opacity: prog(t, t0 + 0.3, t0 + 0.6) }} size={27} color={C.green}>
        MORTGAGE LOANS →
      </Label>
      <Label style={{ position: "absolute", left: 0, width: W, top: 1262, textAlign: "center", opacity: 0.7 * prog(t, t0 + 0.7, t0 + 1.0) }} size={23}>
        ← MONTHLY REPAYMENTS
      </Label>
    </AbsoluteFill>
  );
};

const Suburb: React.FC = () => {
  const t = useT();
  const s = scene("s2");
  const t0 = cue("s2.banks") - 0.32;
  const out = cue("s2.term");
  if (t < t0 || t >= out + 0.3) return null;
  const p = prog(t, t0, out);
  const wipe = E.inOutCubic(prog(t, t0, t0 + 0.4));
  const docs = cue("s2.contracts");
  const dim = E.outCubic(prog(t, docs - 0.25, docs + 0.35));
  const d = drift(t, 2.5, 0.4, 21);
  const exit = E.inCubic(prog(t, out - 0.12, out + 0.18));
  const mark = prog(t, cue("s2.barely") + 0.22, cue("s2.barely") + 1.15);

  // three contracts thrown onto the frame; each is stamped as it lands
  const D = [
    { at: docs, x: 420, y: 850, rot: -8.5, w: 640, from: [-520, -700], stamp: cue("s2.stamp1"), sx: 330, sy: 500 },
    { at: docs + 0.55, x: 668, y: 912, rot: 6.5, w: 640, from: [640, -820], stamp: cue("s2.stamp2"), sx: 310, sy: 520 },
    { at: cue("s2.stamp2") + 0.2, x: 540, y: 872, rot: -1.6, w: 760, from: [60, 1500], stamp: cue("s2.stamp3"), sx: 392, sy: 664 },
  ];
  let kx = 0;
  let ky = 0;
  for (const dd of D) {
    const k = shake(t, dd.stamp, 13, 9, 34, dd.x);
    kx += k.x;
    ky += k.y;
  }
  return (
    <AbsoluteFill style={{ clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)` }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y + (1 - wipe) * 120}px)` }}>
        <ParallaxPhoto
          name="suburb_aerial"
          cam={{ zoom: 1.04 + 0.13 * p, truckX: lerp(-16, 16, p), dolly: 26 * p, y: lerp(20, -18, p), brightness: lerp(0.96, 0.42, dim), blur: 4.5 * dim, saturate: lerp(1, 0.7, dim) }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,8,9,.55) 0%, rgba(8,8,9,0) 28%, rgba(8,8,9,0) 60%, rgba(8,8,9,.55) 100%)" }} />
      <ArchiveTag a={win(t, t0 + 0.35, docs - 0.1, 0.3, 0.2)} place="AMERICAN SUBURBIA" date="THE HOUSING BOOM · 2000s" credit="Photo: Carol M. Highsmith / Library of Congress" kind="PHOTO" />
      <MoneyFlow t={t} t0={t0 + 0.3} t1={docs + 0.12} />

      <AbsoluteFill style={{ perspective: 1700, transform: `translate(${kx}px, ${ky}px)` }}>
        {D.map((dd, i) => {
          const q = prog(t, dd.at, dd.at + 0.42);
          if (q <= 0) return null;
          const e = E.outQuart(q);
          const big = i === 2;
          const h = dd.w * 1.3;
          const fall = exit * (1300 + i * 260);
          const creep = big ? 1 + 0.05 * prog(t, dd.at + 0.4, out) : 1;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: lerp(dd.x + dd.from[0], dd.x, e) - dd.w / 2,
                top: lerp(dd.y + dd.from[1], dd.y, e) - h / 2 - fall,
                transform: `rotateZ(${dd.rot + (1 - e) * (i === 1 ? 34 : -30) + exit * (i - 1) * 16}deg) rotateX(${(1 - e) * 46}deg) scale(${(1 + (1 - e) * 0.3) * creep})`,
                filter: `brightness(${big ? 1 : lerp(1, 0.74, prog(t, D[2].at, D[2].at + 0.4))}) blur(${(1 - e) * 5 + exit * 6}px)`,
              }}
            >
              <MortgageDoc n={i + 1} w={dd.w} mark={big ? mark : 0} />
              <div style={{ position: "absolute", left: dd.sx, top: dd.sy }}>
                <Stamp text="APPROVED" p={prog(t, dd.stamp, dd.stamp + 0.5)} rot={-12 + i * 5} size={big ? 78 : 66} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      {D.map((dd, i) => (
        <Flash key={i} a={0.16 * (1 - prog(t, dd.stamp, dd.stamp + 0.12)) * (t >= dd.stamp ? 1 : 0)} color={C.paper} />
      ))}
      <AbsoluteFill style={{ background: C.coal, opacity: exit }} />
      {/* keep `s` referenced for clarity of scene bounds */}
      {s.start < 0 ? null : null}
    </AbsoluteFill>
  );
};

/* ───────────── 3 · "These were called subprime mortgages." ───────────── */

const Term: React.FC = () => {
  const t = useT();
  const t0 = cue("s2.term");
  const sub = cue("s2.subprime");
  const mor = cue("s2.mortgagesWord");
  const end = scene("s2").end;
  if (t < t0 - 0.1) return null;
  const k = shake(t, sub, 20, 7, 34, 12);
  const bar = E.outExpo(prog(t, sub - 0.02, sub + 0.3));
  const word = E.outExpo(prog(t, sub, sub + 0.36));
  const defP = prog(t, mor + 0.42, end - 0.22);
  const out = E.inCubic(prog(t, end - 0.2, end + 0.05));
  const LET = "MORTGAGES".split("");
  return (
    <AbsoluteFill style={{ background: C.coal, opacity: prog(t, t0 - 0.1, t0 + 0.08) }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("textures/newsprint_b.jpg")})`, backgroundSize: "cover", mixBlendMode: "overlay", opacity: 0.22 }} />
      <AbsoluteFill style={{ transform: `translate(${k.x}px, ${k.y}px) rotate(${k.r}deg) scale(${1 + 0.03 * prog(t, t0, end) + out * 0.5})`, opacity: 1 - out, filter: out > 0 ? `blur(${out * 14}px)` : undefined }}>
        <div style={{ position: "absolute", left: 0, width: W, top: 676, textAlign: "center", fontFamily: F.mono, fontWeight: 600, fontSize: 30, letterSpacing: 11, color: C.grey, opacity: prog(t, t0 + 0.05, t0 + 0.4) }}>
          THESE WERE CALLED
        </div>
        {/* the word, struck through with a red highlighter */}
        <div style={{ position: "absolute", left: 0, width: W, top: 742, height: 220 }}>
          <div
            style={{
              position: "absolute",
              left: 74,
              top: 34,
              width: 932,
              height: 172,
              background: C.red,
              transformOrigin: "0 50%",
              transform: `scaleX(${bar}) rotate(-1.2deg) skewX(-4deg)`,
              borderRadius: 4,
              boxShadow: "0 0 60px rgba(176,20,30,.45)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              width: W,
              top: 22,
              textAlign: "center",
              fontFamily: F.serif,
              fontWeight: 900,
              fontSize: 172,
              lineHeight: "196px",
              letterSpacing: lerp(22, 1, word),
              color: C.paper,
              opacity: word,
              transform: `scale(${lerp(1.35, 1, word)})`,
              filter: `blur(${(1 - word) * 12}px)`,
            }}
          >
            SUBPRIME
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, width: W, top: 988, display: "flex", justifyContent: "center", gap: 15 }}>
          {LET.map((ch, i) => {
            const q = E.outBack(prog(t, mor + i * 0.028, mor + 0.26 + i * 0.028));
            return (
              <span key={i} style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 86, color: C.paper, opacity: clamp(q * 2), transform: `translateY(${(1 - q) * 46}px)`, display: "inline-block" }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 108, width: 864, top: 1134, height: 2, background: C.greyDark, transformOrigin: "0 0", transform: `scaleX(${prog(t, mor + 0.3, mor + 0.6)})` }} />
        <div style={{ position: "absolute", left: 108, width: 880, top: 1162, fontFamily: F.type, fontSize: 33, lineHeight: 1.42, color: C.paper, opacity: 0.88 }}>
          <Typewriter text="sub·prime (adj.) — home loans made to borrowers with weak credit and a high risk of default." p={defP} />
        </div>
      </AbsoluteFill>
      <Flash a={0.5 * (1 - prog(t, sub, sub + 0.14)) * (t >= sub ? 1 : 0)} color={C.red} />
    </AbsoluteFill>
  );
};

export const S2Problem: React.FC = () => (
  <AbsoluteFill style={{ background: C.coal }}>
    <Rewind />
    <Suburb />
    <Term />
  </AbsoluteFill>
);
