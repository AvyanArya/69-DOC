import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { CityId, Globe, GlobeArc, GlobeNode } from "../components/Globe";
import { ArchiveTag, Flash } from "../components/Overlays";
import { ParallaxPhoto } from "../components/Parallax";
import { Label, MiniDoc, Stamp } from "../components/Props";
import market from "../data/market.json";
import { E, clamp, drift, lerp, prog, rnd, rndRange, shake, win } from "../lib/anim";
import { useT } from "../lib/time";
import { cue, scene } from "../lib/timeline";
import { C, F, H, W } from "../theme";
import { GLOBE } from "./S3Bundle";

const NUM: React.CSSProperties = { fontFeatureSettings: '"lnum" 1, "tnum" 1' };

/* ───────────── A · "Then homeowners started defaulting." ───────────── */

const Defaults: React.FC<{ t: number }> = ({ t }) => {
  const s = scene("s4");
  const hit = cue("s4.defaulting");
  const out = cue("s4.house");
  if (t >= out + 0.25) return null;
  const p = prog(t, s.start, out + 0.25);
  const k = shake(t, hit, 24, 7, 34, 2);
  const d = drift(t, 3, 0.5, 31);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ transform: `translate(${k.x + d.x}px, ${k.y + d.y}px) rotate(${k.r}deg)` }}>
        <ParallaxPhoto
          name="foreclosure_sign"
          cam={{ zoom: 1.04 + 0.12 * p, x: lerp(50, -40, p), truckX: lerp(-22, 22, p), dolly: 20 * p, brightness: lerp(1, 0.72, prog(t, hit, hit + 0.2)), saturate: lerp(1, 0.75, prog(t, hit, hit + 0.3)) }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,8,9,.6) 0%, rgba(8,8,9,0) 30%, rgba(8,8,9,0) 62%, rgba(8,8,9,.6) 100%)" }} />
      <ArchiveTag a={win(t, s.start + 0.25, out, 0.3, 0.15)} place="FORECLOSURE" date="UNITED STATES · MAY 2008" credit="Photo: respres · CC BY 2.0" />
      <div style={{ position: "absolute", left: 0, width: W, top: 1010, display: "flex", justifyContent: "center", transform: `translate(${k.x * 1.4}px, ${k.y * 1.4}px)` }}>
        <div style={{ background: "rgba(239,233,220,.94)", padding: "26px 40px 18px", boxShadow: "0 30px 80px rgba(0,0,0,.6)", opacity: clamp(prog(t, hit, hit + 0.06)), transform: `rotate(-4deg) scale(${lerp(1.5, 1, E.outExpo(prog(t, hit, hit + 0.3)))})` }}>
          <Stamp text="IN DEFAULT" p={prog(t, hit, hit + 0.5)} color={C.red} rot={0} size={118} />
        </div>
      </div>
      <Flash a={t >= hit ? 0.5 * (1 - prog(t, hit, hit + 0.12)) : 0} color={C.red} />
    </AbsoluteFill>
  );
};

/* ───────────── B · "House prices fell." – real Case-Shiller data ───────────── */

const CS = market.caseShiller.series as { d: string; v: number }[];
const PEAK_I = CS.findIndex((p) => p.d === market.caseShiller.peak.d);
const TROUGH_I = CS.findIndex((p) => p.d === market.caseShiller.trough.d);
const CH = { x0: 96, x1: 984, y0: 668, y1: 1092, vMin: 95, vMax: 192 };
const cx = (i: number) => lerp(CH.x0, CH.x1, i / (CS.length - 1));
const cy = (v: number) => lerp(CH.y1, CH.y0, (v - CH.vMin) / (CH.vMax - CH.vMin));
const seg = (a: number, b: number) => {
  let d = "";
  const i0 = Math.floor(a);
  for (let i = i0; i <= Math.ceil(b); i++) {
    const j = clamp(i, a, b);
    const lo = Math.floor(j);
    const hi = Math.min(lo + 1, CS.length - 1);
    const v = lerp(CS[lo].v, CS[hi].v, j - lo);
    d += `${d ? "L" : "M"}${cx(j).toFixed(1)} ${cy(v).toFixed(1)}`;
  }
  return d;
};

const HousePrices: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s4.house");
  const fell = cue("s4.fell");
  const out = cue("s4.suddenly");
  if (t < t0 || t >= out + 0.2) return null;
  const wipe = E.inOutCubic(prog(t, t0, t0 + 0.3));
  const rise = E.inOutCubic(prog(t, t0 + 0.12, fell - 0.1));
  const drop = E.inQuad(prog(t, fell, fell + 0.62));
  const head = lerp(PEAK_I, TROUGH_I, drop);
  const headV = lerp(CS[Math.floor(head)].v, CS[Math.min(Math.floor(head) + 1, CS.length - 1)].v, head - Math.floor(head));
  const k = shake(t, fell + 0.62, 22, 7, 34, 5);
  const big = E.outExpo(prog(t, fell + 0.5, fell + 0.86));
  const pct = Math.round(lerp(0, market.caseShiller.changePct, clamp(drop * 1.02)));
  const exit = E.inCubic(prog(t, out - 0.08, out + 0.2));
  const years = [2000, 2002, 2004, 2006, 2008, 2010, 2012];
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 0 ${(1 - wipe) * 100}% 0)`, background: C.paper }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("textures/newsprint_a.jpg")})`, backgroundSize: "cover", transform: "scale(1.06)" }} />
      <AbsoluteFill style={{ transform: `translate(${k.x}px, ${k.y}px) scale(${1 + 0.03 * prog(t, t0, out) + exit * 0.25})`, opacity: 1 - exit }}>
        <div style={{ position: "absolute", left: CH.x0, top: 300 }}>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.red }}>THE BUBBLE BURSTS</div>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 98, lineHeight: 1.02, color: C.ink, marginTop: 10, letterSpacing: -1 }}>
            U.S. home
            <br />
            prices
          </div>
        </div>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {[100, 125, 150, 175].map((v) => (
            <g key={v}>
              <line x1={CH.x0} x2={CH.x1} y1={cy(v)} y2={cy(v)} stroke={C.ink} strokeOpacity={0.16} strokeWidth={1.5} strokeDasharray="3 9" />
              <text x={CH.x1} y={cy(v) - 10} textAnchor="end" style={{ fontFamily: F.mono, fontSize: 21, fill: C.ink, opacity: 0.5, ...NUM }}>
                {v}
              </text>
            </g>
          ))}
          <line x1={CH.x0} x2={CH.x1} y1={CH.y1 + 18} y2={CH.y1 + 18} stroke={C.ink} strokeWidth={3} />
          {years.map((y) => {
            const i = (y - 2000) * 12;
            return (
              <g key={y}>
                <line x1={cx(i)} x2={cx(i)} y1={CH.y1 + 18} y2={CH.y1 + 34} stroke={C.ink} strokeWidth={3} />
                <text x={cx(i)} y={CH.y1 + 68} textAnchor="middle" style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 25, fill: C.ink, ...NUM }}>
                  {y}
                </text>
              </g>
            );
          })}
          {/* the boom */}
          <path d={seg(0, lerp(0, PEAK_I, rise))} fill="none" stroke={C.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          {/* the bust */}
          {drop > 0 ? (
            <>
              <path d={`${seg(PEAK_I, head)} L${cx(head).toFixed(1)} ${CH.y1 + 16} L${cx(PEAK_I).toFixed(1)} ${CH.y1 + 16} Z`} fill={C.red} opacity={0.14} />
              <path d={seg(PEAK_I, head)} fill="none" stroke={C.red} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={cx(head)} cy={cy(headV)} r={15} fill={C.red} />
              <circle cx={cx(head)} cy={cy(headV)} r={15 + 26 * ((t * 2.2) % 1)} fill="none" stroke={C.red} strokeWidth={3} opacity={1 - ((t * 2.2) % 1)} />
            </>
          ) : null}
          {rise >= 1 ? (
            <g opacity={prog(t, fell - 0.12, fell + 0.05)}>
              <circle cx={cx(PEAK_I)} cy={cy(CS[PEAK_I].v)} r={11} fill={C.ink} />
              <text x={cx(PEAK_I)} y={cy(CS[PEAK_I].v) - 30} textAnchor="middle" style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 24, letterSpacing: 2.5, fill: C.ink }}>
                PEAK · JULY 2006
              </text>
            </g>
          ) : null}
        </svg>
        {/* the number */}
        <div style={{ position: "absolute", left: CH.x0 - 6, top: 1200, display: "flex", alignItems: "flex-end", gap: 26, opacity: clamp(prog(t, fell + 0.1, fell + 0.3)) }}>
          <div style={{ fontFamily: F.impact, fontSize: 178, lineHeight: 0.92, color: C.red, transform: `scale(${lerp(1.16, 1, big)})`, transformOrigin: "0 0", ...NUM }}>{pct}%</div>
          <div style={{ paddingBottom: 12, opacity: big }}>
            <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 28, letterSpacing: 2.6, color: C.ink }}>PEAK TO TROUGH</div>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 24, letterSpacing: 1.5, color: C.ink, opacity: 0.7, marginTop: 4, ...NUM }}>JULY 2006 → FEB 2012</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: CH.x0, top: 562, width: 880, fontFamily: F.sans, fontWeight: 500, fontSize: 17, letterSpacing: 0.4, color: C.ink, opacity: 0.55 }}>
          Data: S&amp;P CoreLogic Case-Shiller U.S. National Home Price Index (Jan 2000 = 100), via FRED, Federal Reserve Bank of St. Louis
        </div>
      </AbsoluteFill>
      <Flash a={t >= fell + 0.62 ? 0.35 * (1 - prog(t, fell + 0.62, fell + 0.76)) : 0} color={C.red} />
    </AbsoluteFill>
  );
};

/* ───────────── C · the "supposedly valuable" product falls apart ───────────── */

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const O = { x: 540, y: 1030 };
const iso = (x: number, y: number, z: number): [number, number] => [O.x + (x - y) * COS, O.y + (x + y) * SIN - z];
const RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC"];

const Product: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s4.suddenly");
  const worth = cue("s4.worth");
  const out = cue("s4.losses");
  if (t < t0 - 0.1 || t >= out + 0.5) return null;
  const inn = E.outExpo(prog(t, t0 - 0.05, t0 + 0.4));
  // downgrade ladder
  const step = clamp(prog(t, t0 + 0.55, worth - 0.12)) * (RATINGS.length - 1);
  const idx = Math.floor(step);
  const flip = step - idx;
  const junk = t >= worth;
  const heat = junk ? 1 : idx / (RATINGS.length - 1);
  const badgeCol = heat < 0.34 ? C.green : heat < 0.67 ? "#B78A2B" : C.red;
  const kStep = shake(t, t0 + 0.55 + (idx * (worth - 0.12 - t0 - 0.55)) / (RATINGS.length - 1), 5 + idx * 1.6, 12, 34, idx);
  const kJunk = shake(t, worth, 30, 6, 36, 14);
  const crack = prog(t, worth - 0.3, worth);
  const burst = prog(t, worth, worth + 2.6);
  const blockA = 1 - prog(t, worth, worth + 0.1);
  const a = 111;
  const b = 142;
  const hB = 400;
  const P = (x: number, y: number, z: number) => iso(x, y, z).map((v) => v.toFixed(1)).join(",");
  const lA = iso(-a, b, hB);
  // schematic value line (no units – it only shows direction)
  const VAL = { x0: 110, x1: 970, y0: 390, y1: 560 };
  const valPts: string[] = [];
  const total = junk ? RATINGS.length + 2 : step;
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const pos = u * (RATINGS.length + 2);
    if (pos > total + 0.001 && i > 0) break;
    const level = pos <= RATINGS.length - 1 ? 1 - 0.07 * Math.floor(pos) - 0.07 * E.inOutCubic(pos - Math.floor(pos)) * (pos < RATINGS.length - 1 ? 1 : 0) : lerp(0.58, 0.06, E.outCubic(clamp((pos - (RATINGS.length - 1)) / 3) * clamp(prog(t, worth, worth + 0.7))));
    valPts.push(`${lerp(VAL.x0, VAL.x1, u).toFixed(1)},${lerp(VAL.y1, VAL.y0, level).toFixed(1)}`);
  }
  const word = E.outExpo(prog(t, worth + 0.05, worth + 0.4));
  const exit = E.inCubic(prog(t, out - 0.05, out + 0.4));
  return (
    <AbsoluteFill style={{ background: C.coal, opacity: clamp(prog(t, t0 - 0.1, t0 + 0.06)) }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 42% at 50% 52%, rgba(176,20,30,${0.05 + 0.2 * heat}) 0%, rgba(176,20,30,0) 100%)` }} />
      <AbsoluteFill style={{ transform: `translate(${kStep.x + kJunk.x}px, ${kStep.y + kJunk.y}px) rotate(${kJunk.r}deg)`, opacity: 1 - exit }}>
        {/* value line */}
        <div style={{ position: "absolute", left: VAL.x0, top: 300, opacity: inn }}>
          <Label size={24} style={{ opacity: 0.6 }}>
            WHAT THE MARKET WOULD PAY
          </Label>
        </div>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: inn }}>
          <line x1={VAL.x0} x2={VAL.x1} y1={VAL.y1 + 8} y2={VAL.y1 + 8} stroke={C.paper} strokeOpacity={0.25} strokeWidth={2} />
          <line x1={VAL.x0} x2={VAL.x1} y1={VAL.y0} y2={VAL.y0} stroke={C.paper} strokeOpacity={0.18} strokeWidth={1.5} strokeDasharray="3 9" />
          <text x={VAL.x1} y={VAL.y0 - 12} textAnchor="end" style={{ fontFamily: F.mono, fontSize: 20, fill: C.paper, opacity: 0.5, letterSpacing: 2 }}>
            FACE VALUE
          </text>
          <polyline points={valPts.join(" ")} fill="none" stroke={heat < 0.34 ? C.green : C.redBright} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* the block, cracking */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: blockA * inn, transform: `scale(${lerp(0.6, 1, inn)})`, transformOrigin: "50% 55%" }}>
          <ellipse cx={O.x} cy={O.y + 16} rx={300} ry={104} fill="#000" opacity={0.5} />
          <polygon points={`${P(-a, b, hB)} ${P(a, b, hB)} ${P(a, b, 0)} ${P(-a, b, 0)}`} fill="#D5CEBC" />
          <polygon points={`${P(a, -b, hB)} ${P(a, b, hB)} ${P(a, b, 0)} ${P(a, -b, 0)}`} fill="#A8A190" />
          <polygon points={`${P(-a, -b, hB)} ${P(a, -b, hB)} ${P(a, b, hB)} ${P(-a, b, hB)}`} fill="#F4EFE3" />
          <polygon points={`${P(-a, b, hB * 0.6)} ${P(a, b, hB * 0.6)} ${P(a, b, hB * 0.46)} ${P(-a, b, hB * 0.46)}`} fill={C.red} />
          <polygon points={`${P(a, -b, hB * 0.6)} ${P(a, b, hB * 0.6)} ${P(a, b, hB * 0.46)} ${P(a, -b, hB * 0.46)}`} fill={C.redDeep} />
          <g transform={`matrix(${COS},${SIN},0,1,${lA[0]},${lA[1]})`}>
            <text x={a} y={hB * 0.27} textAnchor="middle" style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 74, fill: C.ink }}>
              MBS
            </text>
          </g>
          {/* cracks spreading across the faces */}
          <g fill="none" stroke={C.coal} strokeWidth={5} strokeLinejoin="bevel" strokeDasharray={900} strokeDashoffset={900 * (1 - crack)}>
            <polyline points={`${P(-40, b, hB)} ${P(-10, b, hB * 0.82)} ${P(-58, b, hB * 0.66)} ${P(0, b, hB * 0.47)} ${P(-30, b, hB * 0.28)} ${P(22, b, 0)}`} />
            <polyline points={`${P(a, 20, hB)} ${P(a, -14, hB * 0.78)} ${P(a, 36, hB * 0.55)} ${P(a, -6, hB * 0.3)} ${P(a, 30, 0)}`} />
            <polyline points={`${P(-40, b, hB)} ${P(10, 40, hB)} ${P(-20, -30, hB)} ${P(a, 20, hB)}`} />
          </g>
        </svg>

        {/* the sheets it was made of, tumbling out */}
        {burst > 0
          ? Array.from({ length: 64 }, (_, i) => {
              const tau = (t - worth) * (0.85 + rnd(i * 3.3) * 0.5);
              const ang = rndRange(i * 2.1, -Math.PI, 0);
              const sp = rndRange(i * 6.7, 240, 1050);
              const x = O.x + rndRange(i * 4.2, -100, 100) + Math.cos(ang) * sp * tau * 0.72;
              const y = O.y - 60 - rnd(i * 9.4) * 360 + Math.sin(ang) * sp * tau * 0.5 + 1500 * tau * tau * 0.5;
              if (y > 2100) return null;
              const tint = i % 5 === 0 ? "#E9B4B6" : i % 3 === 0 ? "#CFC8B8" : "#F1ECDF";
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x - 45,
                    top: y - 58,
                    transform: `perspective(900px) rotateZ(${rnd(i) * 360 + tau * rndRange(i * 8, -260, 260)}deg) rotateX(${tau * rndRange(i * 5, 120, 420)}deg) rotateY(${tau * rndRange(i * 7, -300, 300)}deg)`,
                    opacity: clamp(tau * 14) * (1 - prog(y, 1700, 2100)),
                  }}
                >
                  <MiniDoc w={90} tint={tint} />
                </div>
              );
            })
          : null}

        {/* rating plate */}
        <div style={{ position: "absolute", left: 640, top: 566, transform: `rotate(${junk ? -7 : 9}deg) scale(${inn * (junk ? lerp(1.9, 1.12, E.outExpo(prog(t, worth, worth + 0.3))) : 1)})`, opacity: prog(t, t0 + 0.25, t0 + 0.45) }}>
          <div style={{ border: `9px solid ${badgeCol}`, borderRadius: 14, padding: "4px 26px 0", background: "rgba(12,12,13,.86)", textAlign: "center", minWidth: 200 }}>
            <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 21, letterSpacing: 5, color: badgeCol, marginTop: 8 }}>RATING</div>
            <div style={{ height: 112, overflow: "hidden", position: "relative" }}>
              {junk ? (
                <div style={{ fontFamily: F.impact, fontSize: 104, lineHeight: "112px", color: C.redBright, letterSpacing: 3 }}>JUNK</div>
              ) : (
                <div style={{ transform: `translateY(${-E.inOutCubic(clamp(flip * 1.6)) * 112}px)` }}>
                  <div style={{ fontFamily: F.impact, fontSize: 104, lineHeight: "112px", color: badgeCol, letterSpacing: 3 }}>{RATINGS[idx]}</div>
                  <div style={{ fontFamily: F.impact, fontSize: 104, lineHeight: "112px", color: badgeCol, letterSpacing: 3 }}>{RATINGS[Math.min(idx + 1, RATINGS.length - 1)]}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* words */}
        <div style={{ position: "absolute", left: 0, width: W, top: 1176, textAlign: "center", opacity: word }}>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 116, lineHeight: 1, color: C.paper, letterSpacing: lerp(20, 0, word), transform: `scale(${lerp(1.3, 1, word)})` }}>WORTH</div>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 116, lineHeight: 1.04, color: C.redBright, letterSpacing: lerp(20, 0, word), transform: `scale(${lerp(1.3, 1, E.outExpo(prog(t, worth + 0.3, worth + 0.65)))})`, opacity: prog(t, worth + 0.3, worth + 0.42) }}>
            FAR LESS
          </div>
        </div>
      </AbsoluteFill>
      <Flash a={junk ? 0.55 * (1 - prog(t, worth, worth + 0.14)) : 0} color={C.red} />
    </AbsoluteFill>
  );
};

/* ───────────── D · contagion ───────────── */

// [city, delay, label, side] – every name is an institution that failed or was rescued in 2007-08
const HITS: [CityId, number, string?, ("l" | "r")?, number?, number?][] = [
  ["london", 0.0, "NORTHERN ROCK", "l", -6, 26],
  ["toronto", 0.05],
  ["reykjavik", 0.12, "ICELAND'S BANKS", "l"],
  ["dublin", 0.2],
  ["amsterdam", 0.26, "FORTIS", "r", 14, -52],
  ["frankfurt", 0.36, "HYPO REAL ESTATE", "r", 26, -8],
  ["zurich", 0.44, "UBS", "r", 22, 46],
  ["paris", 0.5],
  ["madrid", 0.55],
  ["saopaulo", 0.58],
  ["moscow", 0.66],
  ["dubai", 0.74],
  ["mumbai", 0.8],
  ["hongkong", 0.88],
  ["singapore", 0.92],
  ["tokyo", 0.96],
  ["sydney", 1.0],
];
const IMF: [string, string][] = [
  ["$945 BILLION", "APRIL 2008"],
  ["$1.4 TRILLION", "OCTOBER 2008"],
  ["$4.1 TRILLION", "APRIL 2009"],
];

const Contagion: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s4.losses");
  const end = scene("s4").end;
  if (t < t0) return null;
  const rise = E.outCubic(prog(t, t0, t0 + 0.6));
  const p = prog(t, t0, end);
  const spin = lerp(-62, 16, E.inOutQuad(prog(t, t0 + 0.1, end + 0.4)));
  const arcs: GlobeArc[] = [];
  const nodes: GlobeNode[] = [{ city: "nyc", a: rise, color: C.redBright, label: "NEW YORK", labelSide: "l", size: 13, pulse: prog((t - t0) % 0.6, 0, 0.6) }];
  for (const [city, d, label, side, dx, dy] of HITS) {
    const s = t0 + 0.25 + d * 1.9;
    arcs.push({ from: "nyc", to: city, p: E.outCubic(prog(t, s, s + 0.6)), color: C.redBright, width: 3.6 });
    nodes.push({ city, a: prog(t, s + 0.45, s + 0.6), color: C.redBright, label, labelSide: side, dx, dy, pulse: prog((t - s - 0.5) % 0.8, 0, 0.8), size: 10 });
  }
  // second-order links: the losses bounce between centres, not just out of New York
  const LINKS: [CityId, CityId, number][] = [
    ["london", "frankfurt", 1.0],
    ["london", "dubai", 1.25],
    ["zurich", "moscow", 1.4],
    ["frankfurt", "mumbai", 1.6],
    ["london", "hongkong", 1.8],
    ["hongkong", "tokyo", 2.0],
    ["hongkong", "sydney", 2.15],
  ];
  for (const [a, b, d] of LINKS) arcs.push({ from: a, to: b, p: E.outCubic(prog(t, t0 + d, t0 + d + 0.55)), color: C.red, width: 2.6, lift: 0.12 });
  const amp = 2 + 13 * p * p;
  const kx = amp * Math.sin(t * 61) * Math.sin(t * 17.3);
  const ky = amp * Math.cos(t * 53) * Math.sin(t * 23.1);
  const stage = Math.min(IMF.length - 1, Math.floor(prog(t, t0 + 0.5, end - 0.25) * IMF.length));
  const stageT = t0 + 0.5 + (stage * (end - 0.25 - t0 - 0.5)) / IMF.length;
  const pop = E.outExpo(prog(t, stageT, stageT + 0.28));
  return (
    <AbsoluteFill style={{ background: C.coal, opacity: prog(t, t0, t0 + 0.25) }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 50% 46%, rgba(176,20,30,${0.1 + 0.3 * p}) 0%, rgba(176,20,30,0) 100%)` }} />
      <AbsoluteFill style={{ transform: `translate(${kx}px, ${ky + (1 - rise) * 300}px) scale(${lerp(0.88, 1.03, E.outCubic(p))})`, transformOrigin: "50% 52%" }}>
        <Globe cx={GLOBE.cx} cy={1000} r={380} lon={spin} lat={26} arcs={arcs} nodes={nodes} alarm={0.25 + 0.75 * p} glow="rgba(212,34,46,.34)" dotColor="#F0D9D2" maxLift={0.2} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, width: W, top: 290, textAlign: "center", transform: `translate(${kx * 0.5}px, ${ky * 0.5}px)` }}>
        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.redBright, opacity: rise }}>CONTAGION</div>
      </div>
      {/* loss counter – IMF estimates, each larger than the last */}
      <div style={{ position: "absolute", left: 0, width: W, top: 352, textAlign: "center", opacity: prog(t, t0 + 0.5, t0 + 0.7), transform: `translate(${kx * 0.7}px, ${ky * 0.7}px)` }}>
        <Label size={23} style={{ opacity: 0.7 }}>
          ESTIMATED LOSSES · IMF
        </Label>
        <div style={{ fontFamily: F.impact, fontSize: 112, lineHeight: 1.06, color: C.redBright, transform: `scale(${lerp(1.35, 1, pop)})`, ...NUM, textShadow: "0 0 50px rgba(212,34,46,.5)" }}>{IMF[stage][0]}</div>
        <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 24, letterSpacing: 4, color: C.paper, opacity: 0.8 * pop, ...NUM }}>{IMF[stage][1]}</div>
      </div>
      <Flash a={0.22 * (1 - pop) * (stage > 0 ? 1 : 0)} color={C.red} />
      <AbsoluteFill style={{ background: C.black, opacity: E.inCubic(prog(t, end - 0.14, end)) }} />
    </AbsoluteFill>
  );
};

export const S4Collapse: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Defaults t={t} />
      <HousePrices t={t} />
      <Product t={t} />
      <Contagion t={t} />
    </AbsoluteFill>
  );
};
