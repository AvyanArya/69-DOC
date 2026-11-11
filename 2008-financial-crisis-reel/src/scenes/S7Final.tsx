import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Credit } from "../components/Overlays";
import { ParallaxPhoto } from "../components/Parallax";
import { HouseIcon } from "../components/Props";
import market from "../data/market.json";
import { E, clamp, drift, lerp, prog, rndRange, shake, win } from "../lib/anim";
import { useT } from "../lib/time";
import { cue, scene } from "../lib/timeline";
import { C, F, H, W } from "../theme";

/* The whole system as an inverted pyramid: every layer rests on the one below, and all of it on house prices. */
const LAYERS = [
  { label: "GLOBAL MARKETS", w: 860 },
  { label: "BANKS & INVESTORS", w: 690 },
  { label: "SECURITIES", w: 520 },
  { label: "MORTGAGES", w: 350 },
];
const BASE = { w: 190, h: 150 };
const LH = 112;
const GAP = 12;
const BASE_Y = 1150; // top of the base block

const Tower: React.FC<{ t: number; fall: number; dim?: number }> = ({ t, fall, dim = 1 }) => {
  const built = cue("s7.entire");
  const assume = cue("s7.assumption");
  // it sways a little more with every second it stands
  const sway = fall > 0 ? 0 : Math.sin(t * 1.9) * (0.5 + 1.3 * prog(t, assume, cue("s7.silence")));
  const baseIn = E.outBack(prog(t, built - 0.15, built + 0.25));
  const hot = prog(t, assume - 0.05, assume + 0.25);
  const g = fall * fall;
  return (
    <AbsoluteFill style={{ opacity: dim }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${BASE_Y + BASE.h}px`, transform: `rotate(${sway}deg)` }}>
        {LAYERS.map((L, i) => {
          const n = LAYERS.length - 1 - i; // 0 = lowest layer
          const at = built + 0.42 + n * 0.36;
          const q = E.outBack(prog(t, at, at + 0.34), 1.2);
          if (q <= 0) return null;
          const y = BASE_Y - (n + 1) * (LH + GAP);
          const dirn = i % 2 === 0 ? 1 : -1;
          const fx = dirn * (120 + n * 150) * g;
          const fy = (700 + n * 260) * g + (1 - q) * -160;
          const fr = dirn * (24 + n * 22) * g + rndRange(i * 3.1, -1.1, 1.1);
          return (
            <div
              key={L.label}
              style={{
                position: "absolute",
                left: (W - L.w) / 2 + fx,
                top: y + fy,
                width: L.w,
                height: LH,
                opacity: clamp(q * 3),
                transform: `rotate(${fr}deg) scale(${lerp(0.8, 1, clamp(q))})`,
                backgroundImage: `url(${staticFile("textures/newsprint_c.jpg")})`,
                backgroundSize: "cover",
                boxShadow: "0 18px 40px rgba(0,0,0,.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: F.sans,
                fontWeight: 900,
                fontSize: 43,
                letterSpacing: 5,
                color: C.ink,
              }}
            >
              {L.label}
            </div>
          );
        })}
        {/* the single block everything stands on */}
        <div
          style={{
            position: "absolute",
            left: (W - BASE.w) / 2 - 260 * g,
            top: BASE_Y + 500 * g,
            width: BASE.w,
            height: BASE.h,
            transform: `scale(${baseIn}) rotate(${-50 * g}deg)`,
            background: lerp(0, 1, hot) > 0.5 ? C.red : C.paper,
            boxShadow: hot > 0.5 ? "0 0 80px rgba(212,34,46,.75)" : "0 18px 40px rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HouseIcon size={104} color={hot > 0.5 ? C.paper : C.ink} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const S7Final: React.FC = () => {
  const t = useT();
  const s = scene("s7");
  const entire = cue("s7.entire");
  const assume = cue("s7.assumption");
  const that = cue("s7.that");
  const fallW = cue("s7.fall");
  const silence = cue("s7.silence");
  const wrong = cue("s7.wrong");
  const fadeOut = cue("s7.fadeOut");
  const p = prog(t, s.start, silence);
  const d = drift(t, 2, 0.35, 81);
  const dark = t >= silence + 0.2;
  const kA = shake(t, assume, 10, 8, 30, 3);
  const kW = shake(t, wrong, 34, 4.2, 34, 9);

  // the assumption, drawn as the chart everyone believed in: up, and then up for ever
  const CS = market.caseShiller.series as { d: string; v: number }[];
  const iPeak = CS.findIndex((q) => q.d === market.caseShiller.peak.d);
  const X0 = 110;
  const X1 = 970;
  const Y0 = 440;
  const Y1 = 622;
  const px = (i: number) => lerp(X0, X0 + (X1 - X0) * 0.6, i / iPeak);
  const py = (v: number) => lerp(Y1, Y0 + 70, (v - 100) / 85);
  const drawn = E.inOutCubic(prog(t, that - 0.1, that + 0.7));
  let path = "";
  for (let i = 0; i <= iPeak * drawn; i++) path += `${path ? "L" : "M"}${px(i).toFixed(1)} ${py(CS[i].v).toFixed(1)}`;
  const dream = E.outCubic(prog(t, that + 0.6, fallW + 0.3));
  const quote = E.outExpo(prog(t, that + 0.05, that + 0.5));

  const w1 = E.outExpo(prog(t, wrong, wrong + 0.3));
  const w2 = E.outExpo(prog(t, wrong + 0.12, wrong + 0.45));
  const end = E.inOutQuad(prog(t, fadeOut, s.end - 0.12));
  return (
    <AbsoluteFill style={{ background: C.black }}>
      {!dark ? (
        <AbsoluteFill style={{ opacity: prog(t, s.start + 0.1, s.start + 1.3) * (1 - prog(t, silence, silence + 0.2)) }}>
          {/* a quiet street, almost in the dark */}
          <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
            <ParallaxPhoto name="suburb_bw" cam={{ zoom: 1.04 + 0.12 * p, dolly: 24 * p, truckX: lerp(-10, 10, p), y: lerp(40, 0, p), brightness: lerp(0.5, 0.2, prog(t, entire - 0.3, entire + 0.5)), contrast: 1.15, blur: 3.5 * prog(t, entire - 0.3, entire + 0.5) }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 40% at 50% 54%, rgba(0,0,0,0) 0%, rgba(0,0,0,.8) 100%)" }} />
          <Credit a={win(t, s.start + 0.6, entire - 0.2, 0.4, 0.3)} text="PHOTO · Carol M. Highsmith / Library of Congress" bottom={1920 - 1392} />

          <AbsoluteFill style={{ transform: `translate(${kA.x}px, ${kA.y}px)` }}>
            {/* headline for the thought */}
            <div style={{ position: "absolute", left: 0, width: W, top: 286, textAlign: "center", opacity: win(t, entire, that + 0.1, 0.35, 0.3) }}>
              <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.red }}>THE ENTIRE CRISIS</div>
              <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 88, lineHeight: 1.05, color: C.paper, marginTop: 10 }}>
                was built on
                <br />
                <span style={{ color: prog(t, assume - 0.05, assume + 0.2) > 0.5 ? C.redBright : C.paper }}>one assumption.</span>
              </div>
            </div>

            {/* …and the assumption itself */}
            <div style={{ position: "absolute", left: 0, width: W, top: 286, textAlign: "center", opacity: quote }}>
              <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 25, letterSpacing: 7, color: C.green }}>THE ASSUMPTION</div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontWeight: 800, fontSize: 66, lineHeight: 1.08, color: C.paper, marginTop: 12, whiteSpace: "nowrap", transform: `translateY(${(1 - quote) * 24}px)` }}>“House prices will never fall.”</div>
            </div>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: quote }}>
              <path d={path} fill="none" stroke={C.green} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
              {dream > 0 ? (
                <>
                  <line x1={px(iPeak)} y1={py(CS[iPeak].v)} x2={lerp(px(iPeak), X1, dream)} y2={lerp(py(CS[iPeak].v), Y0 - 20, dream)} stroke={C.green} strokeWidth={6} strokeDasharray="5 15" strokeLinecap="round" />
                  <path d={`M-22,-14 L8,0 L-22,14 Z`} fill={C.green} transform={`translate(${lerp(px(iPeak), X1, dream)},${lerp(py(CS[iPeak].v), Y0 - 20, dream)}) rotate(-36)`} />
                </>
              ) : null}
            </svg>
            <Tower t={t} fall={0} />
            <div style={{ position: "absolute", left: 0, width: W, top: BASE_Y + BASE.h + 24, textAlign: "center", fontFamily: F.sans, fontWeight: 900, fontSize: 34, letterSpacing: 6, color: C.redBright, opacity: prog(t, assume, assume + 0.3) }}>HOUSE PRICES</div>
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {/* a beat of black, then the verdict */}
      {t >= wrong ? (
        <AbsoluteFill style={{ opacity: 1 - end }}>
          <Tower t={cue("s7.silence")} fall={prog(t, wrong, wrong + 1.5)} dim={0.15 * (1 - prog(t, wrong + 0.9, wrong + 1.5))} />
          <AbsoluteFill style={{ transform: `translate(${kW.x}px, ${kW.y}px) rotate(${kW.r}deg) scale(${1 + 0.035 * prog(t, wrong, s.end)})` }}>
            <div style={{ position: "absolute", left: 0, width: W, top: 716, textAlign: "center" }}>
              <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 132, lineHeight: 1, color: C.paper, opacity: w1, letterSpacing: lerp(30, 4, w1), transform: `scale(${lerp(1.4, 1, w1)})`, filter: `blur(${(1 - w1) * 12}px)` }}>THEY WERE</div>
              <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 204, lineHeight: 1.04, color: C.paper, opacity: w2, letterSpacing: lerp(40, 0, w2), transform: `scale(${lerp(1.6, 1, w2)})`, filter: `blur(${(1 - w2) * 18}px)`, marginTop: 6 }}>
                WRONG<span style={{ color: C.redBright }}>.</span>
              </div>
              <div style={{ width: 860 * E.outCubic(prog(t, wrong + 0.4, wrong + 1.1)), height: 7, background: C.red, margin: "26px auto 0" }} />
            </div>
          </AbsoluteFill>
          <div style={{ position: "absolute", left: 90, width: 900, top: 1402, textAlign: "center", fontFamily: F.sans, fontWeight: 500, fontSize: 17, lineHeight: 1.5, color: C.paper, opacity: 0.42 * prog(t, wrong + 0.9, wrong + 1.4) }}>
            Archive: Wikimedia Commons · Flickr · Library of Congress · The White House · U.S. House of Representatives · Wikinews
            <br />
            Data: S&amp;P CoreLogic Case-Shiller · S&amp;P 500 · U.S. Bureau of Labor Statistics · IMF · FCIC
          </div>
        </AbsoluteFill>
      ) : null}
      {t >= wrong ? <AbsoluteFill style={{ background: "#fff", opacity: 0.8 * (1 - prog(t, wrong, wrong + 0.14)) }} /> : null}
    </AbsoluteFill>
  );
};
