import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ArchiveTag, Credit, Flash } from "../components/Overlays";
import { ParallaxPhoto } from "../components/Parallax";
import { Label, Typewriter } from "../components/Props";
import { E, clamp, drift, lerp, prog, shake, win } from "../lib/anim";
import { useT } from "../lib/time";
import { cue, scene } from "../lib/timeline";
import { C, F, W } from "../theme";

const NUM: React.CSSProperties = { fontFeatureSettings: '"lnum" 1, "tnum" 1' };

/* ───────── A+B · the night of 15 September, and the three words ───────── */

// where the building's own ticker reads "SEP 15" in the prepared frame (zoom = 1)
const TICKER = { x: 697, y: 958 };

const Night: React.FC<{ t: number }> = ({ t }) => {
  const s = scene("s5");
  const leh = cue("s5.lehman");
  const bk = cue("s5.bankruptcy");
  const out = cue("s5.old");
  if (t >= out + 0.12) return null;
  const p = prog(t, s.start, out);
  // start tight on the ticker, then let the building reveal itself
  const pull = E.inOutCubic(prog(t, s.start + 0.2, leh - 0.1));
  const zoom = lerp(2.25, 1.12, pull) + 0.05 * prog(t, leh, out);
  const fx = (540 - TICKER.x) * zoom * lerp(1, 0.2, pull);
  const fy = (900 - TICKER.y) * zoom * lerp(1, 0.2, pull);
  const dim = E.outCubic(prog(t, leh - 0.12, leh + 0.2));
  const kL = shake(t, leh, 16, 7, 32, 3);
  const kD = shake(t, leh + 0.52, 9, 9, 32, 5);
  const kB = shake(t, bk, 46, 4.6, 38, 8);
  const d = drift(t, 2.6, 0.5, 41);
  const l1 = E.outExpo(prog(t, leh, leh + 0.3));
  const l2 = E.outExpo(prog(t, leh + 0.18, leh + 0.5));
  const dateP = prog(t, leh + 0.52, bk - 0.2);
  const b = E.outExpo(prog(t, bk, bk + 0.26));
  const bracket = E.outCubic(prog(t, s.start + 0.55, s.start + 1.0)) * (1 - prog(t, leh - 0.7, leh - 0.3));
  const bx = 540 + (TICKER.x - 540) * zoom + fx;
  const by = 960 + (TICKER.y - 960) * zoom + fy;
  const bw = 150 * zoom;
  const bh = 62 * zoom;
  const exit = prog(t, out - 0.06, out + 0.1);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ opacity: prog(t, s.start, s.start + 0.5), transform: `translate(${kL.x + kD.x + kB.x * 0.6 + d.x}px, ${kL.y + kD.y + kB.y * 0.6 + d.y}px) rotate(${kB.r}deg)` }}>
        <ParallaxPhoto
          name="lehman_night"
          cam={{ zoom, x: fx, y: fy, dolly: 22 * p, truckX: lerp(-8, 10, p), brightness: lerp(1.2, 0.26, dim) * lerp(1, 0.75, b), blur: 6 * dim, saturate: lerp(0.95, 0.4, dim) }}
        />
      </AbsoluteFill>
      {/* a viewfinder bracket picks out the date on the building's own ticker */}
      {bracket > 0 ? (
        <svg width={W} height={1920} style={{ position: "absolute", inset: 0, opacity: bracket }}>
          <g fill="none" stroke={C.redBright} strokeWidth={5}>
            <path d={`M${bx - bw},${by - bh + 34} V${by - bh} H${bx - bw + 34}`} />
            <path d={`M${bx + bw - 34},${by - bh} H${bx + bw} V${by - bh + 34}`} />
            <path d={`M${bx + bw},${by + bh - 34} V${by + bh} H${bx + bw - 34}`} />
            <path d={`M${bx - bw + 34},${by + bh} H${bx - bw} V${by + bh - 34}`} />
          </g>
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: 64, top: 246, opacity: win(t, s.start + 0.4, leh - 0.15, 0.3, 0.2) }}>
        <div style={{ fontFamily: F.type, fontSize: 36, color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,.9)", letterSpacing: 1 }}>
          <Typewriter text="NEW YORK CITY" p={prog(t, s.start + 0.45, s.start + 0.95)} />
        </div>
        <div style={{ fontFamily: F.type, fontSize: 30, color: C.paper, textShadow: "0 2px 14px rgba(0,0,0,.9)", marginTop: 8, letterSpacing: 1 }}>
          <Typewriter text="Monday, 15 September 2008" p={prog(t, s.start + 1.0, s.start + 1.9)} />
        </div>
      </div>
      <Credit a={win(t, s.start + 0.5, leh, 0.3, 0.2)} text="ARCHIVE · Lehman Brothers HQ, 15 Sept 2008 · Photo: Robert Scoble · CC BY 2.0" bottom={1920 - 1392} />

      {/* LEHMAN BROTHERS / 15 SEPTEMBER 2008 / BANKRUPTCY */}
      <AbsoluteFill style={{ transform: `translate(${kL.x + kD.x + kB.x}px, ${kL.y + kD.y + kB.y}px) rotate(${kB.r * 1.3}deg) scale(${1 + 0.03 * prog(t, leh, out) + exit * 0.2})`, opacity: 1 - exit }}>
        <div style={{ position: "absolute", left: 0, width: W, top: 520, textAlign: "center" }}>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 196, lineHeight: "186px", color: C.paper, opacity: l1, letterSpacing: lerp(30, 2, l1), transform: `scale(${lerp(1.5, 1, l1)})`, filter: `blur(${(1 - l1) * 14}px)`, textShadow: "0 12px 60px rgba(0,0,0,.8)" }}>
            LEHMAN
          </div>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 150, lineHeight: "150px", color: C.paper, opacity: l2, letterSpacing: lerp(30, 2, l2), transform: `scale(${lerp(1.5, 1, l2)})`, filter: `blur(${(1 - l2) * 14}px)`, textShadow: "0 12px 60px rgba(0,0,0,.8)" }}>
            BROTHERS
          </div>
          <div style={{ height: 78, display: "flex", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 22 }}>
            <div style={{ height: 3, width: 150 * clamp(dateP * 2), background: C.paper, opacity: 0.6 }} />
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 44, letterSpacing: 5, color: C.paper, ...NUM }}>
              <Typewriter text="15 SEPTEMBER 2008" p={dateP} cursor={false} />
            </div>
            <div style={{ height: 3, width: 150 * clamp(dateP * 2), background: C.paper, opacity: 0.6 }} />
          </div>
          {t >= bk ? (
            <div style={{ marginTop: 26, position: "relative", height: 250 }}>
              <div style={{ position: "absolute", left: 30, right: 30, top: 6, height: 232, background: C.red, transformOrigin: "50% 50%", transform: `scaleX(${b}) skewX(-3deg)`, boxShadow: "0 0 120px rgba(212,34,46,.6)" }} />
              <div style={{ position: "absolute", left: 0, width: W, top: 0, fontFamily: F.impact, fontSize: 212, lineHeight: "246px", color: C.paper, letterSpacing: lerp(40, 4, b), transform: `scale(${lerp(2.1, 1, b)})`, opacity: clamp(b * 3) }}>BANKRUPTCY</div>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      <Flash a={t >= leh ? 0.4 * (1 - prog(t, leh, leh + 0.1)) : 0} />
      <Flash a={t >= bk ? 0.95 * (1 - prog(t, bk, bk + 0.16)) : 0} />
      <Flash a={t >= bk ? 0.3 * (1 - prog(t, bk + 0.16, bk + 0.7)) : 0} color={C.red} />
    </AbsoluteFill>
  );
};

/* ───────── C · "A 158-year-old financial institution was gone." ───────── */

const Gone: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s5.old");
  const n158 = cue("s5.158");
  const gone = cue("s5.gone");
  const out = cue("s5.largest");
  if (t < t0 || t >= out + 0.15) return null;
  const p = prog(t, t0, out);
  const off = E.outCubic(prog(t, gone, gone + 0.28));
  const k = shake(t, gone, 16, 6, 30, 6);
  const d = drift(t, 2.4, 0.45, 51);
  const years = Math.round(158 * E.outCubic(prog(t, n158 - 0.05, n158 + 0.85)));
  const clipIn = E.outCubic(prog(t, n158 + 1.35, n158 + 1.85));
  const mark = prog(t, n158 + 1.9, n158 + 2.5);
  // the genuine Wikinews clipping: show the column that carries the headline
  const Z = 3.34;
  const CL = { x: 12, y: 196, w: 292, h: 196 };
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ transform: `translate(${k.x + d.x}px, ${k.y + d.y}px)` }}>
        <ParallaxPhoto name="lehman_day" cam={{ zoom: 1.06 + 0.1 * p, y: lerp(30, -20, p), dolly: 26 * p, truckX: lerp(12, -12, p), brightness: lerp(0.82, 0.1, off), saturate: 0.25, contrast: 1.12 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,8,9,.72) 0%, rgba(8,8,9,.15) 34%, rgba(8,8,9,.25) 60%, rgba(8,8,9,.85) 100%)" }} />
      <Credit a={win(t, t0 + 0.2, n158 + 1.3, 0.3, 0.2)} text="ARCHIVE · Lehman Brothers HQ, Times Square · Photo: David Shankbone · CC BY-SA 3.0" bottom={1920 - 1392} />

      {/* 1850 — 2008 */}
      <div style={{ position: "absolute", left: 0, width: W, top: 272, textAlign: "center", opacity: lerp(1, 0.25, off) }}>
        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 26, letterSpacing: 9, color: C.red, opacity: prog(t, t0 + 0.05, t0 + 0.35) }}>LEHMAN BROTHERS</div>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 122, lineHeight: 1.06, color: C.paper, marginTop: 6, letterSpacing: 1, opacity: prog(t, t0 + 0.1, t0 + 0.4), ...NUM, textShadow: "0 8px 40px rgba(0,0,0,.8)" }}>
          1850 <span style={{ color: C.red }}>—</span> 2008
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18, marginTop: 2, opacity: prog(t, n158 - 0.1, n158 + 0.1) }}>
          <span style={{ fontFamily: F.impact, fontSize: 168, lineHeight: 1, color: C.paper, ...NUM, textShadow: "0 8px 40px rgba(0,0,0,.8)" }}>{years}</span>
          <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 56, letterSpacing: 6, color: C.paper }}>YEARS</span>
        </div>
      </div>

      {/* "the newspaper headline returns briefly" – this one is the real thing */}
      {clipIn > 0 ? (
        <AbsoluteFill style={{ perspective: 1800 }}>
          <div
            style={{
              position: "absolute",
              left: (W - CL.w * Z) / 2,
              top: 742 + (1 - clipIn) * 900,
              width: CL.w * Z,
              height: CL.h * Z,
              overflow: "hidden",
              transform: `rotateZ(${lerp(9, -2.6, clipIn)}deg) rotateX(${(1 - clipIn) * 40}deg) scale(${1 + 0.03 * prog(t, n158 + 1.5, out)})`,
              boxShadow: "0 40px 90px rgba(0,0,0,.75), 0 4px 14px rgba(0,0,0,.5)",
              filter: `brightness(${lerp(1, 0.2, off)})`,
            }}
          >
            <Img src={staticFile("papers/wikinews_17sep2008.jpg")} style={{ position: "absolute", left: -CL.x * Z, top: -CL.y * Z, width: 800 * Z, height: 1035 * Z }} />
            {/* marker under the two headline lines */}
            <div style={{ position: "absolute", left: 14 * Z, top: (249 - CL.y) * Z, width: 201 * Z * clamp(mark * 2), height: 9, background: C.redBright, opacity: 0.82, mixBlendMode: "multiply", borderRadius: 4, transform: "rotate(-0.5deg)" }} />
            <div style={{ position: "absolute", left: 14 * Z, top: (265.5 - CL.y) * Z, width: 86 * Z * clamp(mark * 2 - 1), height: 9, background: C.redBright, opacity: 0.82, mixBlendMode: "multiply", borderRadius: 4, transform: "rotate(-0.8deg)" }} />
          </div>
        </AbsoluteFill>
      ) : null}
      <Credit a={clipIn * (1 - off)} text="GENUINE PAGE · Wikinews Print Edition, 17 Sept 2008 · Wikinews contributors · CC BY 2.5" bottom={1920 - 1484} />
      <Flash a={t >= gone ? 0.25 * (1 - prog(t, gone, gone + 0.1)) : 0} />
      <AbsoluteFill style={{ background: C.black, opacity: prog(t, gone + 0.25, out + 0.1) * 0.9 }} />
    </AbsoluteFill>
  );
};

/* ───────── D · "the largest bankruptcy in American history at the time" ───────── */

const Largest: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s5.largest");
  const lw = cue("s5.largestWord");
  const end = scene("s5").end;
  if (t < t0) return null;
  const grow1 = E.outCubic(prog(t, t0 + 0.25, t0 + 0.7));
  const grow2 = E.outQuart(prog(t, lw - 0.02, lw + 0.75));
  const amount = Math.round(639 * grow2);
  const k = shake(t, lw + 0.7, 20, 7, 34, 11);
  const exit = E.inCubic(prog(t, end - 0.22, end));
  const BAR_W = 900;
  const chips: [string, string][] = [
    ["$613 BILLION", "IN DEBTS"],
    ["25,000", "EMPLOYEES"],
  ];
  return (
    <AbsoluteFill style={{ background: C.coal, opacity: prog(t, t0, t0 + 0.2) }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 45% at 50% 46%, rgba(176,20,30,.16) 0%, rgba(176,20,30,0) 100%)" }} />
      <AbsoluteFill style={{ transform: `translate(${k.x}px, ${k.y}px) scale(${1 + 0.025 * prog(t, t0, end) + exit * 0.3})`, opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 12}px)` : undefined }}>
        <div style={{ position: "absolute", left: 90, top: 300, width: 900 }}>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.red }}>ASSETS AT FILING</div>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 88, lineHeight: 1.04, color: C.paper, marginTop: 12, letterSpacing: -0.5 }}>
            The largest
            <br />
            bankruptcy in
            <br />
            U.S. history
          </div>
        </div>
        {/* previous record */}
        <div style={{ position: "absolute", left: 90, top: 760, opacity: prog(t, t0 + 0.2, t0 + 0.4) }}>
          <Label size={24} style={{ opacity: 0.7 }}>
            PREVIOUS RECORD · WORLDCOM, 2002
          </Label>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
            <div style={{ height: 58, width: (BAR_W * 107) / 639 * grow1, background: C.grey }} />
            <div style={{ fontFamily: F.impact, fontSize: 56, color: C.grey, opacity: grow1, ...NUM }}>≈ $107 BILLION</div>
          </div>
        </div>
        {/* Lehman */}
        <div style={{ position: "absolute", left: 90, top: 920, opacity: prog(t, lw - 0.1, lw + 0.05) }}>
          <Label size={24}>LEHMAN BROTHERS, 2008</Label>
          <div style={{ height: 118, width: BAR_W * grow2, background: C.red, marginTop: 12, boxShadow: "0 0 70px rgba(212,34,46,.45)" }} />
          <div style={{ fontFamily: F.impact, fontSize: 214, lineHeight: 1.04, color: C.paper, marginTop: 10, ...NUM }}>
            ${amount}
            <span style={{ fontSize: 104, marginLeft: 20, color: C.redBright }}>BILLION</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 90, top: 1316, display: "flex", gap: 16 }}>
          {chips.map(([a, b], i) => {
            const q = E.outBack(prog(t, lw + 1.0 + i * 0.22, lw + 1.3 + i * 0.22));
            return (
              <div key={a} style={{ border: `2px solid ${C.greyDark}`, padding: "9px 18px 8px", opacity: clamp(q * 2), transform: `scale(${q})`, transformOrigin: "0 50%", display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: F.impact, fontSize: 38, color: C.paper, ...NUM }}>{a}</span>
                <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 19, letterSpacing: 2, color: C.grey }}>{b}</span>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 90, top: 1492, width: 900, fontFamily: F.sans, fontWeight: 500, fontSize: 16.5, color: C.paper, opacity: 0.45 }}>Figures as listed in the companies' bankruptcy filings.</div>
      </AbsoluteFill>
      <Flash a={t >= lw + 0.7 ? 0.3 * (1 - prog(t, lw + 0.7, lw + 0.85)) : 0} color={C.red} />
    </AbsoluteFill>
  );
};

export const S5Lehman: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Night t={t} />
      <Gone t={t} />
      <Largest t={t} />
      <ArchiveTag a={0} place="" date="" credit="" />
    </AbsoluteFill>
  );
};
