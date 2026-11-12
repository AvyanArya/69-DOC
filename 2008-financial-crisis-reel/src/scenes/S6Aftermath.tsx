import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { Globe, GlobeNode } from "../components/Globe";
import { ArchiveTag, Credit, Flash } from "../components/Overlays";
import { ParallaxPhoto } from "../components/Parallax";
import { Label } from "../components/Props";
import market from "../data/market.json";
import { E, clamp, drift, lerp, prog, shake, win } from "../lib/anim";
import { useT } from "../lib/time";
import { cue, scene } from "../lib/timeline";
import { C, F, H, W } from "../theme";

const NUM: React.CSSProperties = { fontFeatureSettings: '"lnum" 1, "tnum" 1' };

/* ───────── A · "Markets crashed." – S&P 500, daily closes, 2007-2009 ───────── */

const SP = market.sp500.series as { d: string; v: number }[];
const iPeak = SP.findIndex((p) => p.d === market.sp500.peak.d);
const iLow = SP.findIndex((p) => p.d === market.sp500.trough.d);
const iLeh = SP.findIndex((p) => p.d === "2008-09-15");
const CH = { x0: 86, x1: 994, y0: 610, y1: 1150, vMin: 640, vMax: 1600 };
const sx = (i: number) => lerp(CH.x0, CH.x1, i / (SP.length - 1));
const sy = (v: number) => lerp(CH.y1, CH.y0, (v - CH.vMin) / (CH.vMax - CH.vMin));
const line = (a: number, b: number) => {
  let d = "";
  for (let i = Math.floor(a); i <= Math.min(Math.ceil(b), SP.length - 1); i++) d += `${d ? "L" : "M"}${sx(i).toFixed(1)} ${sy(SP[i].v).toFixed(1)}`;
  return d;
};

const Crash: React.FC<{ t: number }> = ({ t }) => {
  const s = scene("s6");
  const crashed = cue("s6.crashed");
  const out = cue("s6.credit");
  if (t >= out + 0.12) return null;
  const p = prog(t, s.start, out);
  const pre = E.outCubic(prog(t, s.start + 0.05, s.start + 0.42));
  const fall = E.inOutQuad(prog(t, s.start + 0.4, crashed + 0.42));
  const head = lerp(iPeak, iLow, fall);
  const hv = SP[Math.round(head)].v;
  const k = shake(t, crashed + 0.42, 24, 7, 34, 13);
  const big = E.outExpo(prog(t, crashed + 0.3, crashed + 0.62));
  const pct = Math.round((hv / SP[iPeak].v - 1) * 100);
  const d = drift(t, 2.5, 0.5, 61);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
        <ParallaxPhoto name="nyse_floor" cam={{ zoom: 1.05 + 0.1 * p, dolly: 22 * p, truckY: lerp(-10, 10, p), brightness: 0.36, blur: 2.2, saturate: 0.55 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,8,9,.75) 0%, rgba(8,8,9,.35) 40%, rgba(8,8,9,.8) 100%)" }} />
      <AbsoluteFill style={{ transform: `translate(${k.x}px, ${k.y}px) rotate(${k.r}deg)` }}>
        <div style={{ position: "absolute", left: CH.x0, top: 292 }}>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.redBright }}>S&amp;P 500 · 2007–2009</div>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 104, lineHeight: 1.0, color: C.paper, marginTop: 10, letterSpacing: -1 }}>
            Markets
            <br />
            crashed.
          </div>
        </div>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {[800, 1000, 1200, 1400].map((v) => (
            <g key={v}>
              <line x1={CH.x0} x2={CH.x1} y1={sy(v)} y2={sy(v)} stroke={C.paper} strokeOpacity={0.14} strokeWidth={1.5} strokeDasharray="3 9" />
              <text x={CH.x1} y={sy(v) - 9} textAnchor="end" style={{ fontFamily: F.mono, fontSize: 20, fill: C.paper, opacity: 0.45, ...NUM }}>
                {v.toLocaleString("en-US")}
              </text>
            </g>
          ))}
          <path d={line(0, lerp(0, iPeak, pre))} fill="none" stroke={C.paper} strokeOpacity={0.75} strokeWidth={4.5} strokeLinejoin="round" />
          {fall > 0 ? (
            <>
              <path d={`${line(iPeak, head)} L${sx(head).toFixed(1)} ${CH.y1} L${sx(iPeak).toFixed(1)} ${CH.y1} Z`} fill={C.red} opacity={0.2} />
              <path d={line(iPeak, head)} fill="none" stroke={C.redBright} strokeWidth={6.5} strokeLinejoin="round" />
              <circle cx={sx(head)} cy={sy(hv)} r={13} fill={C.redBright} />
            </>
          ) : null}
          {head >= iLeh ? (
            <g opacity={prog(head, iLeh, iLeh + 12)}>
              <line x1={sx(iLeh)} x2={sx(iLeh)} y1={CH.y0 - 6} y2={CH.y1} stroke={C.paper} strokeWidth={2} strokeDasharray="6 7" opacity={0.8} />
              <text x={sx(iLeh) - 12} y={CH.y0 + 16} textAnchor="end" style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 21, letterSpacing: 2, fill: C.paper }}>
                LEHMAN FAILS
              </text>
              <text x={sx(iLeh) - 12} y={CH.y0 + 42} textAnchor="end" style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 19, letterSpacing: 1, fill: C.paper, opacity: 0.7, ...NUM }}>
                15 SEP 2008
              </text>
            </g>
          ) : null}
          <line x1={CH.x0} x2={CH.x1} y1={CH.y1 + 2} y2={CH.y1 + 2} stroke={C.paper} strokeOpacity={0.6} strokeWidth={2.5} />
          {["2007", "2008", "2009"].map((y) => {
            const i = SP.findIndex((q) => q.d.startsWith(y));
            return (
              <text key={y} x={sx(i) + 4} y={CH.y1 + 40} style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 23, fill: C.paper, opacity: 0.7, ...NUM }}>
                {y}
              </text>
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: CH.x0 - 4, top: 1212, display: "flex", alignItems: "flex-end", gap: 24, opacity: clamp(prog(t, s.start + 0.55, s.start + 0.7)) }}>
          <div style={{ fontFamily: F.impact, fontSize: 176, lineHeight: 0.92, color: C.redBright, transform: `scale(${lerp(1.16, 1, big)})`, transformOrigin: "0 0", ...NUM, textShadow: "0 0 60px rgba(212,34,46,.45)" }}>{pct}%</div>
          <div style={{ paddingBottom: 10, opacity: big }}>
            <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 27, letterSpacing: 2.6, color: C.paper }}>PEAK TO TROUGH</div>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 23, letterSpacing: 1.2, color: C.paper, opacity: 0.7, marginTop: 4, ...NUM }}>OCT 2007 → MAR 2009</div>
          </div>
        </div>
      </AbsoluteFill>
      <Credit a={win(t, s.start + 0.2, out, 0.2, 0.15)} text="Data: S&P 500 daily close (Yahoo Finance) · Photo: Carol M. Highsmith / Library of Congress" bottom={1920 - 1508} />
      <Flash a={t >= crashed + 0.42 ? 0.4 * (1 - prog(t, crashed + 0.42, crashed + 0.56)) : 0} color={C.red} />
    </AbsoluteFill>
  );
};

/* ───────── B · "Credit froze." – the Northern Rock bank run ───────── */

const Print: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties; filter?: string; children?: React.ReactNode }> = ({ src, w, h, style, filter, children }) => (
  <div style={{ position: "absolute", width: w, height: h, background: "#F4F0E6", padding: 14, boxSizing: "border-box", boxShadow: "0 40px 90px rgba(0,0,0,.7), 0 4px 14px rgba(0,0,0,.5)", ...style }}>
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      <Img src={staticFile(`img/${src}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter }} />
      {children}
    </div>
  </div>
);

const Frozen: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s6.credit");
  const fz = cue("s6.froze");
  const out = cue("s6.millions");
  if (t < t0 || t >= out + 0.1) return null;
  const inn = E.outQuart(prog(t, t0, t0 + 0.4));
  const ice = E.outCubic(prog(t, fz, fz + 0.5));
  const k = shake(t, fz, 14, 9, 34, 21);
  const w1 = E.outExpo(prog(t, t0 + 0.08, t0 + 0.4));
  const w2 = E.outExpo(prog(t, fz, fz + 0.3));
  const PW = 940;
  const PH = 705;
  const cracks = [
    "M0,0 L160,120 L210,260 L340,330 L380,470",
    "M940,0 L800,90 L760,230 L640,270 L600,420",
    "M0,705 L140,600 L260,590 L330,470",
    "M940,705 L820,640 L700,560 L680,440",
    "M160,120 L300,90 L420,150",
    "M800,90 L680,60 L560,130",
  ];
  return (
    <AbsoluteFill style={{ background: "#0d0e10" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 50% at 50% 46%, rgba(190,200,210,.14) 0%, rgba(190,200,210,0) 100%)" }} />
      <AbsoluteFill style={{ perspective: 1800, transform: `translate(${k.x}px, ${k.y}px)` }}>
        <Print
          src="p_northern_rock"
          w={PW}
          h={PH}
          filter={`grayscale(${0.35 + 0.65 * ice}) brightness(${1 + 0.18 * ice}) contrast(${1 + 0.1 * ice})`}
          style={{ left: (W - PW) / 2, top: 560 + (1 - inn) * 900, transform: `rotateZ(${lerp(-10, -2.2, inn)}deg) rotateX(${(1 - inn) * 40}deg) scale(${1 + 0.035 * prog(t, t0, out)})` }}
        >
          {/* frost creeping in from the edges, then cracking */}
          <div style={{ position: "absolute", inset: 0, opacity: ice, boxShadow: "inset 0 0 130px 46px rgba(236,243,248,.95)", background: "rgba(214,226,236,.16)" }} />
          <svg width="100%" height="100%" viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
            <g fill="none" stroke="#fff" strokeWidth={2.4} strokeOpacity={0.9} strokeLinejoin="bevel" strokeDasharray={700} strokeDashoffset={700 * (1 - E.outCubic(prog(t, fz + 0.02, fz + 0.5)))}>
              {cracks.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </svg>
        </Print>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, width: W, top: 286, textAlign: "center", transform: `translate(${k.x}px, ${k.y}px)` }}>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 130, lineHeight: 1, color: C.paper, opacity: w1, letterSpacing: lerp(22, 0, w1) }}>CREDIT</div>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 130, lineHeight: 1.04, color: "#DCE8F0", opacity: w2, letterSpacing: lerp(40, 6, w2), transform: `scale(${lerp(1.3, 1, w2)})`, textShadow: "0 0 50px rgba(220,232,240,.6)" }}>FROZE</div>
      </div>
      <div style={{ position: "absolute", left: 84, top: 1296, opacity: prog(t, t0 + 0.35, t0 + 0.6) }}>
        <Label size={25}>A RUN ON NORTHERN ROCK · UK · SEPT 2007</Label>
        <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 17, color: "#fff", opacity: 0.6, marginTop: 8 }}>ARCHIVE · Photo: Dominic Alves · CC BY 2.0</div>
      </div>
      <Flash a={t >= fz ? 0.5 * (1 - prog(t, fz, fz + 0.12)) : 0} color="#EAF2F7" />
    </AbsoluteFill>
  );
};

/* ───────── C · "Millions lost their jobs and homes." ───────── */

const lost = market.labour.jobsLostThousands / 1000;

const Stat: React.FC<{ a: number; big: string; unit: string; line: string; src: string; top?: number }> = ({ a, big, unit, line, src, top = 936 }) => (
  <div style={{ position: "absolute", left: 76, top, width: 930, opacity: clamp(a * 3) }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 18, transform: `scale(${lerp(1.25, 1, a)})`, transformOrigin: "0 100%" }}>
      <span style={{ fontFamily: F.impact, fontSize: 250, lineHeight: 0.95, color: C.paper, ...NUM, textShadow: "0 10px 60px rgba(0,0,0,.9)" }}>{big}</span>
      <span style={{ fontFamily: F.impact, fontSize: 104, color: C.redBright, textShadow: "0 10px 50px rgba(0,0,0,.9)" }}>{unit}</span>
    </div>
    <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 43, letterSpacing: 2.5, color: C.paper, marginTop: 4, textShadow: "0 4px 26px rgba(0,0,0,.95)" }}>{line}</div>
    <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 17, color: "#fff", opacity: 0.62, marginTop: 12, textShadow: "0 2px 10px rgba(0,0,0,.95)" }}>{src}</div>
  </div>
);

const Human: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s6.millions");
  const jobs = cue("s6.jobs");
  const homes = cue("s6.homes");
  const out = cue("s6.governments");
  if (t < t0 || t >= out + 0.1) return null;
  const which = t < jobs ? 0 : t < homes ? 1 : 2;
  const starts = [t0, jobs, homes];
  const ends = [jobs, homes, out + 0.1];
  const p = prog(t, starts[which], ends[which] + 0.3);
  const k = shake(t, starts[which], 12, 10, 34, which + 30);
  const d = drift(t, 2.5, 0.5, 71 + which);
  const pop = E.outExpo(prog(t, starts[which] + 0.04, starts[which] + 0.34));
  const shade = "linear-gradient(180deg, rgba(8,8,9,.6) 0%, rgba(8,8,9,.05) 30%, rgba(8,8,9,.35) 52%, rgba(8,8,9,.92) 78%, rgba(8,8,9,.95) 100%)";
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ transform: `translate(${k.x + d.x}px, ${k.y + d.y}px)` }}>
        {which === 0 ? <ParallaxPhoto name="empty_office" cam={{ zoom: 1.05 + 0.14 * p, dolly: 34 * p, brightness: 0.8, saturate: 0.5 }} /> : null}
        {which === 1 ? <ParallaxPhoto name="job_fair" cam={{ zoom: 1.04 + 0.1 * p, truckX: lerp(-18, 18, p), dolly: 16 * p, y: -40, brightness: 0.86, saturate: 0.55 }} /> : null}
        {which === 2 ? <ParallaxPhoto name="foreclosure_house" cam={{ zoom: 1.05 + 0.1 * p, truckX: lerp(16, -16, p), dolly: 20 * p, brightness: 0.86, saturate: 0.7 }} /> : null}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: shade }} />
      {which === 0 ? (
        <div style={{ position: "absolute", left: 76, top: 980, opacity: clamp(pop * 3) }}>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 200, lineHeight: 1, color: C.paper, letterSpacing: lerp(20, -2, pop), textShadow: "0 10px 60px rgba(0,0,0,.9)" }}>Millions</div>
          <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 43, letterSpacing: 2.5, color: C.redBright, marginTop: 6 }}>PAID THE PRICE</div>
        </div>
      ) : null}
      {which === 1 ? <Stat a={pop} big={lost.toFixed(1)} unit="MILLION" line="U.S. JOBS LOST · 2008–2010" src="Source: U.S. Bureau of Labor Statistics (nonfarm payrolls, Dec 2007 – Feb 2010)" /> : null}
      {which === 2 ? <Stat a={pop} big="2.8" unit="MILLION" line="FORECLOSURE FILINGS IN 2009 ALONE" src="Source: RealtyTrac, U.S. properties receiving a foreclosure filing in 2009" /> : null}
      {which === 0 ? <ArchiveTag a={clamp(p * 6)} place="EMPTY OFFICES" date="" credit="Carl Lender · CC BY 2.0" kind="PHOTO" /> : null}
      {which === 1 ? <ArchiveTag a={clamp(p * 6)} place="JOB FAIR" date="MARCH 2009" credit="Photo: arvind grover · CC BY-SA 2.0" /> : null}
      {which === 2 ? <ArchiveTag a={clamp(p * 6)} place="FORECLOSED HOME" date="UNITED STATES · AUGUST 2008" credit="Photo: Joguldi · CC BY 2.0" /> : null}
      <Flash a={0.7 * (1 - prog(t, starts[which], starts[which] + 0.09))} />
    </AbsoluteFill>
  );
};

/* ───────── D · "Governments had to step in…" ───────── */

const Rescue: React.FC<{ t: number }> = ({ t }) => {
  const t0 = cue("s6.governments");
  const step = cue("s6.stepIn");
  const stop = cue("s6.stop");
  const coll = cue("s6.collapsing");
  const end = scene("s6").end;
  const { fps } = useVideoConfig();
  if (t < t0) return null;

  // 1 · the White House, 19 September 2008 (public-domain photograph, shown as a print)
  const a1 = t < stop + 0.15;
  const inn = E.outQuart(prog(t, t0, t0 + 0.4));
  const kS = shake(t, step, 22, 7, 34, 41);
  const amt = E.outExpo(prog(t, step, step + 0.35));
  // 2 · rescue packages on the globe
  const g0 = stop - 0.1;
  const a2 = t >= g0 && t < coll + 0.2;
  const rise = E.outCubic(prog(t, g0, g0 + 0.55));
  const PACK: [GlobeNode["city"], string, string, "l" | "r", number, number, number][] = [
    ["washington", "$700B", "UNITED STATES", "l", -10, 30, 0.1],
    ["london", "£500B", "UNITED KINGDOM", "l", -16, -74, 0.42],
    ["berlin", "€480B", "GERMANY", "r", 24, -66, 0.7],
    ["paris", "€360B", "FRANCE", "r", 30, 70, 0.98],
  ];
  const nodes: GlobeNode[] = PACK.map(([city, amount, country, side, dx, dy, d]) => ({
    city,
    a: prog(t, g0 + 0.3 + d, g0 + 0.5 + d),
    color: C.green,
    label: amount,
    sub: country,
    labelSide: side,
    dx,
    dy,
    labelSize: 50,
    labelFont: F.impact,
    size: 12,
    pulse: prog((t - g0 - 0.3 - d) % 1.1, 0, 1.1),
  }));
  // 3 · genuine footage: Congress, 6 October 2008
  const v0 = coll - 0.12;
  const a3 = t >= v0;
  const vin = E.outQuart(prog(t, v0, v0 + 0.4));
  const VW = 980;
  const VH = 735;
  const out = E.inCubic(prog(t, end - 0.3, end));
  return (
    <AbsoluteFill style={{ background: C.coal }}>
      {a1 ? (
        <AbsoluteFill style={{ transform: `translate(${kS.x}px, ${kS.y}px)`, opacity: 1 - prog(t, stop - 0.05, stop + 0.15) }}>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 50% at 50% 44%, rgba(47,158,92,.13) 0%, rgba(47,158,92,0) 100%)" }} />
          <AbsoluteFill style={{ perspective: 1800 }}>
            <Print src="p_bush" w={900} h={630} filter="contrast(1.06)" style={{ left: 90, top: 318 + (1 - inn) * -900, transform: `rotateZ(${lerp(9, 2, inn)}deg) rotateX(${(1 - inn) * -40}deg) scale(${1 + 0.03 * prog(t, t0, stop)})` }} />
          </AbsoluteFill>
          <div style={{ position: "absolute", left: 84, top: 978, opacity: prog(t, t0 + 0.3, t0 + 0.55) }}>
            <Label size={24}>THE WHITE HOUSE · 19 SEPTEMBER 2008</Label>
            <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 17, color: "#fff", opacity: 0.6, marginTop: 8 }}>ARCHIVE · President Bush with Paulson, Bernanke and Cox · White House photo: Joyce N. Boghosian</div>
          </div>
          <div style={{ position: "absolute", left: 76, top: 1066, opacity: clamp(amt * 3) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, transform: `scale(${lerp(1.3, 1, amt)})`, transformOrigin: "0 100%" }}>
              <span style={{ fontFamily: F.impact, fontSize: 226, lineHeight: 0.98, color: C.green, ...NUM, textShadow: "0 0 70px rgba(47,158,92,.4)" }}>$700</span>
              <span style={{ fontFamily: F.impact, fontSize: 100, color: C.paper }}>BILLION</span>
            </div>
            <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 34, letterSpacing: 2.2, color: C.paper, marginTop: 2 }}>U.S. BANK RESCUE · SIGNED 3 OCT 2008</div>
          </div>
        </AbsoluteFill>
      ) : null}

      {a2 ? (
        <AbsoluteFill style={{ opacity: prog(t, g0, g0 + 0.25) * (1 - prog(t, coll - 0.05, coll + 0.2)) }}>
          <AbsoluteFill style={{ transform: `translateY(${(1 - rise) * 380}px) scale(${lerp(0.84, 1, rise) + 0.03 * prog(t, g0, coll)})`, transformOrigin: "50% 45%" }}>
            <Globe cx={540} cy={950} r={410} lon={lerp(-52, -30, E.inOutQuad(prog(t, g0, coll + 0.2)))} lat={32} nodes={nodes} glow="rgba(47,158,92,.26)" />
          </AbsoluteFill>
          <div style={{ position: "absolute", left: 0, width: W, top: 286, textAlign: "center" }}>
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.green }}>OCTOBER 2008</div>
            <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 76, lineHeight: 1.05, color: C.paper, marginTop: 8 }}>Governments step in.</div>
          </div>
          <div style={{ position: "absolute", left: 0, width: W, top: 1386, textAlign: "center", fontFamily: F.sans, fontWeight: 500, fontSize: 17, color: "#fff", opacity: 0.55 }}>Headline size of the bank rescue packages announced in October 2008</div>
        </AbsoluteFill>
      ) : null}

      {a3 ? (
        <AbsoluteFill style={{ opacity: clamp(prog(t, v0, v0 + 0.12)) * (1 - out) }}>
          <AbsoluteFill style={{ background: C.black, opacity: 0.94 }} />
          <div
            style={{
              position: "absolute",
              left: (W - VW) / 2,
              top: 420,
              width: VW,
              height: VH,
              overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0,0,0,.8)",
              border: "2px solid rgba(239,233,220,.3)",
              transform: `scale(${lerp(1.12, 1, vin) + 0.03 * prog(t, v0, end)})`,
            }}
          >
            <Sequence from={Math.round(v0 * fps)} layout="none">
              <OffthreadVideo src={staticFile("video/hearing_wide.mp4")} muted style={{ width: VW, height: VH, objectFit: "cover" }} />
            </Sequence>
            {/* broadcast scan-lines */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 1.5px, transparent 1.5px, transparent 4px)" }} />
            <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 120px 30px rgba(0,0,0,.6)" }} />
            <div style={{ position: "absolute", left: 22, top: 18, display: "flex", alignItems: "center", gap: 10, fontFamily: F.mono, fontWeight: 700, fontSize: 22, letterSpacing: 2, color: "#fff", textShadow: "0 2px 8px #000" }}>
              <span style={{ width: 13, height: 13, borderRadius: 7, background: C.redBright, opacity: Math.sin(t * 7) > 0 ? 1 : 0.25 }} />
              ARCHIVE FOOTAGE
            </div>
          </div>
          <div style={{ position: "absolute", left: (W - VW) / 2, top: 286, width: VW }}>
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 6, color: C.red }}>WASHINGTON · 6 OCTOBER 2008</div>
            <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 62, lineHeight: 1.06, color: C.paper, marginTop: 8 }}>Congress demands answers.</div>
          </div>
          <div style={{ position: "absolute", left: (W - VW) / 2, top: 420 + VH + 46, width: VW }}>
            <Label size={23}>U.S. HOUSE OVERSIGHT COMMITTEE</Label>
            <div style={{ fontFamily: F.news, fontStyle: "italic", fontWeight: 500, fontSize: 34, lineHeight: 1.22, color: C.paper, marginTop: 8 }}>Hearing: “Causes and Effects of the Lehman Brothers Bankruptcy”</div>
            <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 17, color: "#fff", opacity: 0.6, marginTop: 10 }}>FOOTAGE · U.S. House of Representatives, public domain (via Internet Archive)</div>
          </div>
        </AbsoluteFill>
      ) : null}
      <Flash a={t >= step && t < stop ? 0.3 * (1 - prog(t, step, step + 0.12)) : 0} color={C.green} />
      <AbsoluteFill style={{ background: C.black, opacity: out }} />
    </AbsoluteFill>
  );
};

export const S6Aftermath: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Crash t={t} />
      <Frozen t={t} />
      <Human t={t} />
      <Rescue t={t} />
    </AbsoluteFill>
  );
};
