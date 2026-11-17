/**
 * "The Week Wall Street Broke" – 16:9 cut (1920x1080).
 * Fast-cut documentary style: a new picture every ~1 s, word-by-word captions, big type on key words,
 * archive photos with push-ins, public-domain paintings as metaphors, pinned photo boards, white flash frames.
 * Everything is timed from src/data/timeline2.json (built from the narration's word timings).
 */
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { Logo } from "../Branding";
import { Fonts } from "../Fonts";
import { Globe, GlobeArc, GlobeNode, CityId } from "../components/Globe";
import { MiniDoc, MortgageDoc, Stamp } from "../components/Props";
import market from "../data/market.json";
import data from "../data/timeline2.json";
import { E, clamp, lerp, noise1, prog, rnd, rndRange, shake } from "../lib/anim";
import { useT } from "../lib/time";
import { C, F } from "../theme";

export const FW = 1920;
export const FH = 1080;
const YELLOW = "#F5C84B";

type Tok = { w: string; hit: boolean; s: number; e: number; scene: string };
const TL = data as unknown as { duration: number; durationInFrames: number; tokens: Tok[]; scenes: Record<string, { start: number; end: number }>; cues: Record<string, number> };
const TOKENS = TL.tokens;
const tokAt = (scene: string, i: number) => TOKENS.filter((x) => x.scene === scene)[i];
const at = (scene: string, i: number) => tokAt(scene, i).s - 0.04;

/* ─────────────────────────────── shot list ─────────────────────────────── */

type Kind = "photo" | "video" | "white" | "black" | "pinned" | "doc" | "pile" | "chart" | "globe" | "ticker" | "paper" | "lever";
type Shot = { t: number; kind: Kind; src?: string; bw?: boolean; ink?: "dark"; dir?: number; flash?: boolean; opt?: Record<string, unknown> };
const S = (scene: string, i: number, kind: Kind, src?: string, extra: Partial<Shot> = {}): Shot => ({ t: i < 0 ? TL.scenes[scene].start : at(scene, i), kind, src, ...extra });

const SHOTS: Shot[] = [
  { t: 0, kind: "paper", src: "papers/hero.jpg", opt: { focus: [0.5, 0.205], z0: 1.75, z1: 2.05, ratio: 1.525 } },
  S("a_hook", 3, "photo", "lehman_ticker", { flash: true }),
  S("a_hook", 5, "photo", "lehman_crews", { dir: -1 }),
  S("a_hook", 7, "photo", "lehman_day", { bw: true }),
  S("a_hook", 9, "photo", "nyse_night", { dir: 1 }),
  S("a_hook", 13, "black", undefined, { flash: true }),

  S("b_houses", 0, "white", undefined, { ink: "dark" }),
  S("b_houses", 3, "photo", "suburb_bw", { opt: { sepia: true } }),
  S("b_houses", 8, "photo", "suburb_aerial", { dir: -1 }),
  S("b_houses", 12, "photo", "suburb_street"),
  S("b_houses", 14, "photo", "suburb_house", { flash: true, dir: -1 }),

  S("c_subprime", 0, "photo", "suburb_aerial2"),
  S("c_subprime", 4, "doc", undefined, { opt: { stampAt: -1 } }),
  S("c_subprime", 8, "white", undefined, { ink: "dark" }),
  S("c_subprime", 10, "photo", "paint_moneylender", { opt: { painting: "Quentin Matsys, The Moneylender and His Wife, 1514" } }),
  S("c_subprime", 12, "doc", undefined, { opt: { stampAt: at("c_subprime", 15) } }),
  S("c_subprime", 16, "black"),
  S("c_subprime", 19, "photo", "for_sale_owner", { flash: true }),

  S("d_mbs", 0, "photo", "nyse_feb", { dir: -1 }),
  S("d_mbs", 4, "photo", "nyse_floor_b", { bw: true, dir: 1 }),
  S("d_mbs", 6, "pile"),
  S("d_mbs", 11, "black", undefined, { flash: true }),
  S("d_mbs", 15, "doc", undefined, { opt: { stampAt: at("d_mbs", 19), stamp: "AAA" } }),
  S("d_mbs", 20, "photo", "nyse_flag", { dir: 1 }),
  S("d_mbs", 25, "pinned", undefined, { opt: { pics: ["lehman_london", "northern_rock", "nyse_night"] } }),
  S("d_mbs", 35, "globe", undefined, { opt: { mood: "sell" } }),

  S("e_leverage", 0, "photo", "wall_street", { dir: -1 }),
  S("e_leverage", 6, "photo", "lehman_day"),
  S("e_leverage", 9, "lever"),

  S("f_fall", 0, "chart"),
  S("f_fall", 4, "photo", "foreclosure_sign", { flash: true }),
  S("f_fall", 7, "photo", "foreclosure_house", { dir: -1 }),
  S("f_fall", 11, "black"),
  S("f_fall", 15, "photo", "paint_belshazzar", { opt: { painting: "Rembrandt, Belshazzar's Feast, c. 1635" } }),

  S("g_panic", 0, "photo", "paint_medusa", { flash: true, opt: { painting: "Théodore Géricault, The Raft of the Medusa, 1818–19" } }),
  S("g_panic", 1, "photo", "nypd", { bw: true }),
  S("g_panic", 4, "ticker", undefined, { opt: { red: true } }),
  S("g_panic", 9, "photo", "bush", { opt: { credit: "White House photo: Joyce N. Boghosian · 19 Sept 2008" } }),

  S("h_weekend", -1, "photo", "lehman_night", { flash: true }),
  S("h_weekend", 2, "white", undefined, { ink: "dark" }),
  S("h_weekend", 4, "photo", "wall_street", { bw: true, dir: 1 }),
  S("h_weekend", 7, "photo", "nyse_feb", { bw: true, dir: -1 }),
  S("h_weekend", 13, "black"),

  S("i_bankrupt", 0, "photo", "lehman_crews", { flash: true }),
  S("i_bankrupt", 2, "paper", "papers/wikinews_17sep2008.jpg", { opt: { focus: [0.19, 0.245], z0: 2.2, z1: 2.6, ratio: 1.294, genuine: true } }),
  S("i_bankrupt", 6, "black", undefined, { flash: true, opt: { red: true } }),
  S("i_bankrupt", 7, "ticker", undefined, { opt: { red: true } }),
  S("i_bankrupt", 9, "photo", "paint_babel", { opt: { painting: "Pieter Bruegel the Elder, The Tower of Babel, 1563" } }),

  S("j_contagion", 0, "globe", undefined, { opt: { mood: "fear" } }),
  S("j_contagion", 3, "photo", "nyse_floor", { flash: true }),
  S("j_contagion", 10, "photo", "northern_rock", { bw: true }),
  S("j_contagion", 16, "ticker", undefined, { opt: { red: true } }),
  S("j_contagion", 18, "white", undefined, { ink: "dark", opt: { frost: true } }),

  S("k_cost", 0, "photo", "job_fair", { flash: true }),
  S("k_cost", 7, "photo", "foreclosure_house", { bw: true, dir: 1 }),
  S("k_cost", 12, "video", "hearing_wide"),
  S("k_cost", 14, "video", "hearing_witness"),
  S("k_cost", 18, "video", "hearing_chair"),

  S("l_end", -1, "photo", "suburb_bw", { opt: { dim: 0.5 } }),
  S("l_end", 5, "photo", "paint_babel", { dir: -1, opt: { painting: "Pieter Bruegel the Elder, The Tower of Babel, 1563" } }),
  S("l_end", 9, "photo", "suburb_street", { opt: { dim: 0.55 } }),
  S("l_end", 13, "black"),
  { t: TL.cues["wrong"] - 0.05, kind: "black", flash: true, opt: { wrong: true } },
];
SHOTS.sort((a, b) => a.t - b.t);

/** Where each genuine archive picture came from (shown small, bottom-left, as the licence requires). */
const CREDITS: Record<string, string> = {
  lehman_ticker: "Lehman Brothers HQ, 15 Sept 2008 · Robert Scoble · CC BY 2.0",
  lehman_night: "Lehman Brothers HQ, 15 Sept 2008 · Robert Scoble · CC BY 2.0",
  lehman_crews: "Outside Lehman Brothers, 15 Sept 2008 · Robert Scoble · CC BY 2.0",
  lehman_day: "Lehman Brothers HQ · David Shankbone · CC BY-SA 3.0",
  nyse_night: "NYSE, Dec 2008 · Massimo Catarinella · CC BY-SA 3.0",
  nyse_flag: "NYSE, Sept 2008 · Roland Weber · CC BY 3.0",
  nyse_feb: "Wall Street, Feb 2008 · Phillip Capper · CC BY 2.0",
  nyse_floor: "NYSE trading floor · Carol M. Highsmith / Library of Congress",
  nyse_floor_b: "NYSE trading floor · Carol M. Highsmith / Library of Congress",
  wall_street: "Wall Street, 16 Sept 2008 · elbpresse.de · CC BY-SA 4.0",
  nypd: "Outside the NYSE, Oct 2008 · Andy C · CC BY-SA 3.0",
  foreclosure_sign: "Foreclosure, 2008 · respres · CC BY 2.0",
  foreclosure_house: "Foreclosed house, 2008 · Joguldi · CC BY 2.0",
  for_sale_owner: "Sacramento, 2006 · Casey Serin · CC BY 2.0",
  northern_rock: "Northern Rock bank run, Sept 2007 · Dominic Alves · CC BY 2.0",
  job_fair: "Job fair, March 2009 · arvind grover · CC BY-SA 2.0",
  suburb_aerial: "Carol M. Highsmith / Library of Congress",
  suburb_aerial2: "Carol M. Highsmith / Library of Congress",
  suburb_street: "Carol M. Highsmith / Library of Congress",
  suburb_house: "Carol M. Highsmith / Library of Congress",
  suburb_bw: "Carol M. Highsmith / Library of Congress",
  lehman_london: "Lehman Brothers, London, 16 Sept 2008 · conorwithonen · CC BY 2.0",
  hearing_wide: "U.S. House Oversight Committee hearing on Lehman Brothers, 6 Oct 2008 · public domain",
  hearing_witness: "U.S. House Oversight Committee hearing on Lehman Brothers, 6 Oct 2008 · public domain",
  hearing_chair: "U.S. House Oversight Committee hearing on Lehman Brothers, 6 Oct 2008 · public domain",
};

/* ─────────────────────────────── shot renderers ─────────────────────────────── */

const Cover: React.FC<{ src: string; p: number; dir?: number; bw?: boolean; sepia?: boolean; dim?: number }> = ({ src, p, dir = 1, bw, sepia, dim = 1 }) => {
  const z = 1.0 + 0.09 * E.outQuad(p);
  const x = dir * 30 * (p - 0.5);
  const f = [bw ? "grayscale(1) contrast(1.15)" : "", sepia ? "sepia(.55) contrast(1.1)" : "", dim !== 1 ? `brightness(${dim})` : ""].join(" ").trim();
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <Img src={staticFile(`img16/${src}.jpg`)} style={{ position: "absolute", left: -96, top: -54, width: 2112, height: 1188, transform: `translateX(${x}px) scale(${z})`, filter: f || undefined }} />
    </AbsoluteFill>
  );
};

const Pinned: React.FC<{ pics: string[]; t0: number; t: number }> = ({ pics, t0, t }) => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg,#9cc6ea,#7fb2de)" }}>
    {pics.map((p, i) => {
      const q = E.outBack(prog(t, t0 + i * 0.22, t0 + i * 0.22 + 0.35));
      const x = 260 + i * 560;
      return (
        <div key={p} style={{ position: "absolute", left: x, top: 270 + (i % 2) * 60, width: 520, height: 390, background: "#fff", padding: 14, boxSizing: "border-box", boxShadow: "0 30px 60px rgba(0,0,0,.35)", transform: `translateY(${(1 - q) * 700}px) rotate(${[-4, 3, -2][i]}deg)`, opacity: clamp(q * 3) }}>
          <Img src={staticFile(`img16/${p}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", left: "50%", top: -12, width: 26, height: 26, borderRadius: 13, background: "radial-gradient(circle at 35% 35%, #ff6b6b, #b0141e)", boxShadow: "0 4px 6px rgba(0,0,0,.4)", transform: "translateX(-50%)" }} />
        </div>
      );
    })}
  </AbsoluteFill>
);

const Paper: React.FC<{ src: string; p: number; focus: number[]; z0: number; z1: number; ratio: number }> = ({ src, p, focus, z0, z1, ratio }) => {
  const z = lerp(z0, z1, E.outCubic(p));
  const w = 1080; // the page is fitted to this width at zoom 1
  return (
    <AbsoluteFill style={{ background: "#151515", overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{ position: "absolute", left: FW / 2 - focus[0] * w * z, top: FH / 2 - focus[1] * w * ratio * z, width: w * z, transform: `rotate(${lerp(-2, -0.6, p)}deg)`, boxShadow: "0 40px 90px rgba(0,0,0,.6)" }}
      />
    </AbsoluteFill>
  );
};

const Pile: React.FC<{ t0: number; t: number }> = ({ t0, t }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, #2a2a2e, #0c0c0d)" }}>
    {Array.from({ length: 70 }, (_, i) => {
      const s = t0 + i * 0.022;
      const q = E.outQuart(prog(t, s, s + 0.3));
      if (q <= 0) return null;
      return (
        <div key={i} style={{ position: "absolute", left: FW / 2 - 60 + rndRange(i * 3, -18, 18) + (1 - q) * rndRange(i * 5, -900, 900), top: 640 - i * 6.5 + (1 - q) * -700, transform: `rotate(${rndRange(i * 7, -9, 9) + (1 - q) * rndRange(i, -90, 90)}deg)` }}>
          <MiniDoc w={120} />
        </div>
      );
    })}
  </AbsoluteFill>
);

const Doc: React.FC<{ t: number; t0: number; stampAt: number; stamp?: string }> = ({ t, t0, stampAt, stamp = "APPROVED" }) => {
  const q = E.outQuart(prog(t, t0, t0 + 0.3));
  return (
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("textures/manila.jpg")})`, backgroundSize: "cover" }}>
      <AbsoluteFill style={{ background: "rgba(0,0,0,.35)" }} />
      <div style={{ position: "absolute", left: FW / 2 - 330, top: 70 + (1 - q) * 500, transform: `rotate(${lerp(-12, -3, q)}deg) scale(0.86)`, transformOrigin: "50% 0" }}>
        <MortgageDoc w={760} mark={stamp === "APPROVED" ? prog(t, t0 + 0.4, t0 + 1.4) : 0} />
        <div style={{ position: "absolute", left: 300, top: 560 }}>
          <Stamp text={stamp} sub={stamp === "AAA" ? "RATED" : undefined} p={stampAt > 0 ? prog(t, stampAt, stampAt + 0.5) : 0} color={C.green} size={stamp === "AAA" ? 150 : 100} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Ticker: React.FC<{ t: number; red?: boolean }> = ({ t, red }) => {
  const rows = ["LEH  -94.9%  0.21", "AIG  -60.8%  4.76", "WM   -77.6%  0.16", "MER  -26.8% 17.05", "C    -15.1% 15.07", "GS   -12.1% 133.0", "MS   -10.9% 28.70", "BAC  -21.0% 26.55", "DJIA -504.48  10917", "S&P  -58.74  1192.7"];
  const off = (t * 220) % 360;
  return (
    <AbsoluteFill style={{ background: "#050505", overflow: "hidden" }}>
      {Array.from({ length: 7 }, (_, r) => (
        <div key={r} style={{ position: "absolute", top: 40 + r * 150 - (r % 2 ? off * 0.3 : 0), left: -off * (r % 2 ? -1 : 1) - 400, whiteSpace: "nowrap", fontFamily: F.mono, fontWeight: 800, fontSize: 92, letterSpacing: 6, color: red && r % 3 !== 1 ? "#ff3b3b" : "#3cff7a", textShadow: `0 0 18px ${red && r % 3 !== 1 ? "rgba(255,40,40,.8)" : "rgba(60,255,120,.7)"}`, opacity: 0.9 }}>
          {Array.from({ length: 4 }, (_, k) => rows[(r * 3 + k) % rows.length]).join("   ▼ ")}
        </div>
      ))}
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,0) 1.6px, rgba(0,0,0,.85) 2.6px)", backgroundSize: "7px 7px" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,.85) 100%)" }} />
    </AbsoluteFill>
  );
};

const CS = market.caseShiller.series as { d: string; v: number }[];
const Chart: React.FC<{ t: number; t0: number; fallAt: number }> = ({ t, t0, fallAt }) => {
  const iPeak = CS.findIndex((p) => p.d === market.caseShiller.peak.d);
  const iLow = CS.findIndex((p) => p.d === market.caseShiller.trough.d);
  const X = (i: number) => lerp(160, 1760, i / (CS.length - 1));
  const Y = (v: number) => lerp(920, 200, (v - 95) / 95);
  const up = E.inOutCubic(prog(t, t0, fallAt));
  const dn = E.inQuad(prog(t, fallAt, fallAt + 0.6));
  const head = up < 1 ? iPeak * up : lerp(iPeak, iLow, dn);
  let d = "";
  for (let i = 0; i <= head; i++) d += `${d ? "L" : "M"}${X(i).toFixed(1)} ${Y(CS[i].v).toFixed(1)}`;
  return (
    <AbsoluteFill style={{ background: "#0c0c0d" }}>
      <svg width={FW} height={FH}>
        {[2000, 2004, 2008, 2012].map((y) => (
          <text key={y} x={X((y - 2000) * 12)} y={990} textAnchor="middle" style={{ fontFamily: F.mono, fontSize: 30, fill: "#777" }}>
            {y}
          </text>
        ))}
        <path d={d} fill="none" stroke={head > iPeak ? C.redBright : C.paper} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: 160, top: 90, fontFamily: F.mono, fontSize: 28, letterSpacing: 6, color: "#999" }}>U.S. HOME PRICES · CASE-SHILLER INDEX</div>
    </AbsoluteFill>
  );
};

const Lever: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => (
  <AbsoluteFill style={{ background: "#0c0c0d" }}>
    {Array.from({ length: 30 }, (_, i) => {
      const q = E.outBack(prog(t, t0 + i * 0.035, t0 + i * 0.035 + 0.25));
      return <div key={i} style={{ position: "absolute", left: 300 + (i % 10) * 92, top: 640 + Math.floor(i / 10) * 130, width: 70, height: 110, background: C.red, opacity: clamp(q * 2), transform: `scale(${q})`, boxShadow: "0 0 30px rgba(212,34,46,.4)" }} />;
    })}
    <div style={{ position: "absolute", left: 1500, top: 770, width: 70, height: 110, background: C.green, transform: `scale(${E.outBack(prog(t, t0 + 1.2, t0 + 1.5))})` }} />
    <div style={{ position: "absolute", left: 300, top: 1030, fontFamily: F.sans, fontWeight: 800, fontSize: 30, letterSpacing: 4, color: "#aaa" }}>BORROWED</div>
    <div style={{ position: "absolute", left: 1440, top: 900, fontFamily: F.sans, fontWeight: 800, fontSize: 30, letterSpacing: 4, color: "#aaa" }}>THEIR OWN</div>
  </AbsoluteFill>
);

const GlobeShot: React.FC<{ t: number; t0: number; mood: string }> = ({ t, t0, mood }) => {
  const fear = mood === "fear";
  const col = fear ? C.redBright : C.green;
  const dests: CityId[] = ["london", "frankfurt", "zurich", "reykjavik", "paris", "dubai", "moscow", "mumbai", "hongkong", "tokyo", "saopaulo", "sydney"];
  const arcs: GlobeArc[] = dests.map((c, i) => ({ from: "nyc", to: c, p: E.outCubic(prog(t, t0 + 0.15 + i * 0.12, t0 + 0.75 + i * 0.12)), color: col }));
  const nodes: GlobeNode[] = [{ city: "nyc", a: 1, color: fear ? C.redBright : C.paper, size: 12 }, ...dests.map((c, i) => ({ city: c, a: prog(t, t0 + 0.6 + i * 0.12, t0 + 0.8 + i * 0.12), color: col }))];
  return (
    <AbsoluteFill style={{ background: fear ? "radial-gradient(ellipse at 50% 55%, #3a0d10, #0a0506)" : "radial-gradient(ellipse at 50% 55%, #18221c, #070908)" }}>
      <Globe w={FW} h={FH} cx={FW / 2} cy={600} r={400} lon={lerp(-60, 10, prog(t, t0, t0 + 4))} lat={24} arcs={arcs} nodes={nodes} maxLift={0.15} alarm={fear ? 0.6 : 0} glow={fear ? "rgba(212,34,46,.34)" : undefined} />
    </AbsoluteFill>
  );
};

/* ─────────────────────────────── captions ─────────────────────────────── */

type Chunk = { toks: Tok[]; hit: boolean; s: number; e: number };
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Tok[] = [];
  const push = () => {
    if (cur.length) out.push({ toks: cur, hit: cur[0].hit, s: cur[0].s, e: cur[cur.length - 1].e });
    cur = [];
  };
  TOKENS.forEach((tk, i) => {
    if (cur.length && (cur[0].hit !== tk.hit || cur[0].scene !== tk.scene)) push();
    cur.push(tk);
    const endPunct = /[.,?:]$/.test(tk.w);
    if (!tk.hit && (endPunct || cur.length >= 3)) push();
    if (tk.hit && endPunct) push();
    if (i === TOKENS.length - 1) push();
  });
  for (let i = 0; i < out.length - 1; i++) out[i].e = Math.min(out[i + 1].s - 0.02, out[i].e + 0.6);
  out[out.length - 1].e += 0.5;
  return out;
})();

const Captions: React.FC<{ t: number; ink?: "dark"; plate?: boolean }> = ({ t, ink, plate }) => {
  const c = CHUNKS.find((x) => t >= x.s - 0.03 && t < x.e);
  if (!c) return null;
  const idx = CHUNKS.indexOf(c);
  const hitN = CHUNKS.slice(0, idx).filter((x) => x.hit).length;
  const text = c.toks.map((x) => x.w.replace(/[.,?:]$/, (m) => (m === "?" ? "?" : m === ":" ? "" : ""))).join(" ");
  if (c.hit) {
    const serif = hitN % 2 === 0;
    const len = text.length;
    const size = Math.min(serif ? 230 : 210, 1650 / (len * (serif ? 0.6 : 0.74)));
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: FW, height: FH, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ display: "flex", gap: size * 0.25, fontFamily: serif ? F.serif : F.sans, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: serif ? -2 : 1, textTransform: serif ? "none" : "uppercase", color: serif ? (ink === "dark" ? C.ink : "#fff") : YELLOW, textShadow: ink === "dark" ? undefined : "0 8px 40px rgba(0,0,0,.75)" }}>
          {c.toks.map((x, i) => {
            const q = E.outExpo(prog(t, x.s - 0.03, x.s + 0.18));
            return (
              <span key={i} style={{ opacity: q, transform: `scale(${lerp(1.25, 1, q)})`, filter: `blur(${(1 - q) * 8}px)`, display: "inline-block" }}>
                {x.w.replace(/[.,:]$/, "")}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: FW, height: FH, display: "flex", alignItems: plate ? "flex-end" : "center", paddingBottom: plate ? 150 : 0, boxSizing: "border-box", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: 16, background: plate ? "rgba(8,8,9,.82)" : undefined, padding: plate ? "10px 26px 12px" : undefined, borderRadius: 6, fontFamily: F.sans, fontWeight: 700, fontSize: 54, color: ink === "dark" ? C.ink : "#fff", textShadow: ink === "dark" ? undefined : "0 2px 16px rgba(0,0,0,.95), 0 0 4px rgba(0,0,0,.8)" }}>
        {c.toks.map((x, i) => (
          <span key={i} style={{ opacity: t >= x.s - 0.03 ? 1 : 0 }}>
            {x.w.replace(/[,:]$/, "")}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────── film ─────────────────────────────── */

const ShotView: React.FC<{ s: Shot; next: number; t: number }> = ({ s, next, t }) => {
  const { fps } = useVideoConfig();
  const p = prog(t, s.t, next);
  const o = s.opt ?? {};
  switch (s.kind) {
    case "photo":
      return <Cover src={s.src!} p={p} dir={s.dir} bw={s.bw} sepia={!!o.sepia} dim={(o.dim as number) ?? 1} />;
    case "video":
      return (
        <AbsoluteFill style={{ background: "#000" }}>
          <Sequence from={Math.round(s.t * fps)} layout="none">
            <OffthreadVideo src={staticFile(`video16/${s.src}.mp4`)} muted style={{ width: FW, height: FH, transform: `scale(${1 + 0.05 * p})` }} />
          </Sequence>
        </AbsoluteFill>
      );
    case "white":
      return (
        <AbsoluteFill style={{ background: o.frost ? "radial-gradient(ellipse, #ffffff, #d7e6f1)" : "#f4f1ea" }}>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile("textures/paper_white.jpg")})`, backgroundSize: "cover", opacity: 0.6, mixBlendMode: "multiply" }} />
        </AbsoluteFill>
      );
    case "black":
      return <AbsoluteFill style={{ background: o.red ? "radial-gradient(ellipse, #5a0a10, #0a0203)" : "radial-gradient(ellipse, #1b1b1d, #050505)" }} />;
    case "pinned":
      return <Pinned pics={o.pics as string[]} t0={s.t} t={t} />;
    case "doc":
      return <Doc t={t} t0={s.t} stampAt={o.stampAt as number} stamp={o.stamp as string | undefined} />;
    case "pile":
      return <Pile t0={s.t} t={t} />;
    case "chart":
      return <Chart t={t} t0={s.t} fallAt={at("f_fall", 3)} />;
    case "globe":
      return <GlobeShot t={t} t0={s.t} mood={o.mood as string} />;
    case "ticker":
      return <Ticker t={t} red={!!o.red} />;
    case "lever":
      return <Lever t={t} t0={s.t} />;
    case "paper": {
      const f = o.focus as number[];
      return <Paper src={s.src!} p={p} focus={f} z0={o.z0 as number} z1={o.z1 as number} ratio={o.ratio as number} />;
    }
  }
  return null;
};

const Wrong: React.FC<{ t: number }> = ({ t }) => {
  const t0 = TL.cues["wrong"];
  if (t < t0 || t >= TL.cues["outro.start"]) return null;
  const a = E.outExpo(prog(t, t0, t0 + 0.3));
  const b = E.outExpo(prog(t, t0 + 0.15, t0 + 0.5));
  const k = shake(t, t0, 18, 5, 30, 3);
  const out = prog(t, TL.cues["outro.start"] - 0.5, TL.cues["outro.start"] - 0.05);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${k.x}px, ${k.y}px)`, opacity: 1 - out }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 120, color: "#fff", opacity: a, letterSpacing: lerp(20, 2, a) }}>They were</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 250, lineHeight: 1, color: YELLOW, opacity: b, transform: `scale(${lerp(1.4, 1, b)})` }}>WRONG.</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ t: number }> = ({ t }) => {
  const t0 = TL.cues["outro.start"];
  const t1 = TL.cues["outro.end"];
  if (t < t0) return null;
  const w = E.outExpo(prog(t, t0 + 0.1, t0 + 0.7));
  const sub = E.outCubic(prog(t, t0 + 1.0, t0 + 1.5));
  const out = E.inCubic(prog(t, t1 - 0.45, t1));
  return (
    <AbsoluteFill style={{ background: "#070708", alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 50% 40% at 50% 48%, rgba(176,20,30,.2), rgba(0,0,0,0))" }} />
      <div style={{ textAlign: "center", opacity: (1 - out) * w, transform: `scale(${lerp(1.15, 1, w) + 0.03 * prog(t, t0, t1)})`, filter: `blur(${(1 - w) * 10}px)` }}>
        <Logo id="B" size={1.6} />
        <div style={{ marginTop: 44, opacity: sub }}>
          <div style={{ fontFamily: F.news, fontStyle: "italic", fontSize: 40, color: C.paper, opacity: 0.85 }}>The stories behind the money.</div>
          <div style={{ display: "inline-block", marginTop: 30, border: `2px solid ${C.paper}`, borderRadius: 40, padding: "12px 34px", fontFamily: F.sans, fontWeight: 800, fontSize: 28, letterSpacing: 5, color: C.paper }}>
            <span style={{ color: C.redBright }}>▶</span>&nbsp; SUBSCRIBE
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => {
  const t = useT();
  let i = SHOTS.findIndex((s, k) => t >= s.t && (k === SHOTS.length - 1 || t < SHOTS[k + 1].t));
  if (i < 0) i = 0;
  const s = SHOTS[i];
  const next = i < SHOTS.length - 1 ? SHOTS[i + 1].t : TL.cues["outro.start"];
  const flash = s.flash ? 1 - prog(t, s.t, s.t + 0.1) : 0;
  const credit = s.src && CREDITS[s.src] ? CREDITS[s.src] : (s.opt?.painting as string) || (s.opt?.credit as string) || (s.opt?.genuine ? "Wikinews Print Edition, 17 Sept 2008 · CC BY 2.5" : s.kind === "paper" ? "Illustrative recreation" : "");
  const inOutro = t >= TL.cues["outro.start"];
  const wm = prog(t, 0.3, 0.8) * (1 - prog(t, TL.cues["outro.start"] - 0.5, TL.cues["outro.start"] - 0.1));
  return (
    <Fonts>
      <AbsoluteFill style={{ background: "#000" }}>
        {!inOutro ? <ShotView s={s} next={next} t={t} /> : null}
        {/* film look */}
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)", pointerEvents: "none" }} />
        {!inOutro && t < TL.cues["wrong"] - 0.05 ? <Captions t={t} ink={s.ink} plate={s.kind === "paper" || s.kind === "doc" || s.kind === "pinned"} /> : null}
        <Wrong t={t} />
        <Outro t={t} />
        {flash > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: flash }} /> : null}
        {credit && !inOutro ? (
          <div style={{ position: "absolute", left: 40, bottom: 30, fontFamily: F.sans, fontWeight: 500, fontSize: 17, color: s.ink === "dark" ? "#333" : "#fff", opacity: 0.6, textShadow: s.ink === "dark" ? undefined : "0 1px 6px rgba(0,0,0,.9)" }}>{credit}</div>
        ) : null}
        {wm > 0 ? (
          <div style={{ position: "absolute", right: 40, bottom: 34, opacity: 0.8 * wm, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.85))" }}>
            <Logo id="B" compact size={1.0} />
          </div>
        ) : null}
      </AbsoluteFill>
    </Fonts>
  );
};

export const FILM_FRAMES = TL.durationInFrames;
// keep tree-shaken helpers referenced
void noise1;
void rnd;
