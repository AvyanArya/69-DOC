import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ArchiveTag, Flash } from "../components/Overlays";
import { ParallaxLayers, ParallaxPhoto } from "../components/Parallax";
import { E, clamp, drift, lerp, prog, rnd, rndRange, shake, win } from "../lib/anim";
import { MotionBlur, useT } from "../lib/time";
import { cue } from "../lib/timeline";
import { HERO_HEAD, PAGE_H, PAGE_W, WIKI_H } from "../papers/specs";
import { C, F, H, W } from "../theme";

/* ───────────────────────────── the pile of newspapers ───────────────────────────── */

type Sheet = {
  img: string;
  h: number;
  x: number; // resting centre on screen
  y: number;
  rot: number; // resting rotation
  s: number; // resting scale
  t0: number; // launch time
  dur: number; // flight time
  hero?: boolean;
};

// [texture, x, y, rotation, scale]  — back of the pile first, the hero lands last.
const LAYOUT: [string, number, number, number, number][] = [
  ["city", 150, 210, -14, 0.8],
  ["wikinews_16sep2008", 930, 250, 11, 0.82],
  ["gazette", 180, 1650, 9, 0.84],
  ["ledger", 930, 1640, -12, 0.84],
  ["broadsheet", 560, 1010, 4, 0.9],
  ["wikinews_25sep2008", 90, 930, 17, 0.8],
  ["metro", 1000, 960, -8, 0.82],
  ["dispatch", 560, 120, -5, 0.84],
  ["wikinews_18sep2008", 560, 1830, -9, 0.84],
  ["courier", 250, 560, 8, 0.8],
  ["wikinews_26sep2008", 880, 520, -19, 0.74],
  ["city", 820, 1320, 15, 0.78],
  ["metro", 250, 1330, -10, 0.8],
  ["ledger", 40, 80, 24, 0.72],
  ["courier", 1010, 1870, -22, 0.76],
  ["gazette", 1040, 60, 16, 0.7],
  ["dispatch", 60, 1860, 13, 0.74],
  ["wikinews_17sep2008", 842, 1608, 7, 0.86],
  ["hero", 546, 846, -3.4, 1.02],
];

const SHEETS: Sheet[] = LAYOUT.map(([img, x, y, rot, s], i) => {
  const hero = img === "hero";
  const n = LAYOUT.length;
  return {
    img,
    h: img.startsWith("wikinews") ? WIKI_H : PAGE_H,
    x,
    y,
    rot,
    s,
    // launches are staggered over the first second; the hero is thrown in last
    t0: hero ? 1.1 : 0.1 + Math.pow(i / (n - 1), 1.55) * 0.98 + rndRange(i * 3.1, -0.03, 0.03),
    dur: hero ? 0.82 : rndRange(i * 7.7, 0.6, 0.92),
    hero,
  };
});
const HERO = SHEETS[SHEETS.length - 1];

/** Where a point of the hero page (page px) sits on screen once the page has landed. */
const heroPoint = (px: number, py: number) => {
  const dx = (px - PAGE_W / 2) * HERO.s;
  const dy = (py - PAGE_H / 2) * HERO.s;
  const a = (HERO.rot * Math.PI) / 180;
  return { x: HERO.x + dx * Math.cos(a) - dy * Math.sin(a), y: HERO.y + dx * Math.sin(a) + dy * Math.cos(a) };
};
const HEAD_C = heroPoint(HERO_HEAD.x + HERO_HEAD.w / 2, HERO_HEAD.y + HERO_HEAD.h / 2);
/** the camera dives into the paper between the two headline lines */
const DIVE = heroPoint(HERO_HEAD.x + HERO_HEAD.w * 0.5, HERO_HEAD.y + HERO_HEAD.h * 0.535);

/* hand-drawn circle: an ellipse with a wobbling radius that overshoots its own start */
const CIRCLE = (() => {
  const cx = HERO_HEAD.x + HERO_HEAD.w / 2;
  const cy = HERO_HEAD.y + HERO_HEAD.h / 2 + 2;
  const rx = HERO_HEAD.w / 2 + 18;
  const ry = HERO_HEAD.h / 2 + 34;
  const pts: string[] = [];
  const N = 96;
  const turns = 1.085;
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    const a = -2.55 + p * turns * Math.PI * 2; // start upper-left, clockwise
    const wob = 1 + 0.028 * Math.sin(a * 2.3 + 1.2) + 0.018 * Math.sin(a * 5.1) + p * 0.035;
    const x = cx + Math.cos(a) * rx * wob;
    const y = cy + Math.sin(a) * ry * (wob + 0.03 * Math.sin(a * 1.7));
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
})();
const CIRCLE_LEN = 2100;

const RedCircle: React.FC<{ p: number }> = ({ p }) => {
  if (p <= 0) return null;
  // the pen speeds up through the long sides and slows on the turns
  const d = E.inOutQuad(p);
  const dash = (extra: number) => ({ strokeDasharray: CIRCLE_LEN, strokeDashoffset: CIRCLE_LEN * (1 - clamp(d * (1 + extra))) });
  return (
    <svg width={PAGE_W} height={PAGE_H} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", mixBlendMode: "multiply" }}>
      <defs>
        <filter id="marker" x="-10%" y="-40%" width="120%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
        </filter>
      </defs>
      <g filter="url(#marker)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={CIRCLE} pathLength={CIRCLE_LEN} stroke={C.red} strokeWidth={11.5} opacity={0.9} {...dash(0)} />
        <path d={CIRCLE} pathLength={CIRCLE_LEN} stroke={C.redDeep} strokeWidth={4.2} opacity={0.5} transform="translate(1.4,1.1)" {...dash(0)} />
        <path d={CIRCLE} pathLength={CIRCLE_LEN} stroke={C.redBright} strokeWidth={2.6} opacity={0.5} transform="translate(-1.6,-1.3)" {...dash(0)} />
      </g>
    </svg>
  );
};

const Paper: React.FC<{ sh: Sheet; i: number; t: number; focus: number; circle: number }> = ({ sh, i, t, focus, circle }) => {
  const p = prog(t, sh.t0, sh.t0 + sh.dur);
  if (p <= 0) return null;
  const e = E.outQuart(p);
  const eRot = E.outCubic(p);
  // every sheet comes from its own direction, from close to the lens (large, soft) down onto the pile
  const ang = rnd(i * 12.9 + 4) * Math.PI * 2;
  const dist = rndRange(i * 5.3, 1500, 2300);
  const fromX = sh.x + Math.cos(ang) * dist;
  const fromY = sh.y + Math.sin(ang) * dist;
  const fromZ = sh.hero ? 760 : rndRange(i * 9.1, 300, 900) * (rnd(i * 2.2) > 0.22 ? 1 : -0.7);
  const restZ = i * 7;
  const x = lerp(fromX, sh.x, e);
  const y = lerp(fromY, sh.y, e);
  const z = lerp(fromZ, restZ, e);
  const spin = (sh.hero ? -38 : rndRange(i * 4.7, 50, 150) * (rnd(i * 8.8) > 0.5 ? 1 : -1)) * (1 - eRot);
  const rx = (sh.hero ? 34 : rndRange(i * 6.1, -62, 62)) * (1 - eRot) + rndRange(i * 1.9, -2.2, 2.2);
  const ry = (sh.hero ? -26 : rndRange(i * 3.3, -62, 62)) * (1 - eRot) + rndRange(i * 2.7, -2.2, 2.2);
  // the pile never quite freezes: a little residual slide
  const settle = sh.hero ? 0 : (t - sh.t0 - sh.dur) * rndRange(i * 13.7, -2.5, 2.5) * (p >= 1 ? 1 : 0);
  const depthBlur = Math.abs(z - restZ) / 85;
  const stackShade = sh.hero ? 1 : 0.7 + 0.24 * (i / SHEETS.length);
  const blur = depthBlur + (sh.hero ? 0 : focus * 7.5);
  const bright = stackShade * (sh.hero ? 1 : 1 - focus * 0.58);
  return (
    <div
      style={{
        position: "absolute",
        left: -PAGE_W / 2,
        top: -sh.h / 2,
        width: PAGE_W,
        height: sh.h,
        transform: `translate3d(${x + settle}px, ${y + settle * 0.6}px, ${z}px) rotateZ(${sh.rot + spin}deg) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sh.s})`,
        filter: `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})`,
        boxShadow: "0 26px 60px rgba(0,0,0,.62), 0 3px 9px rgba(0,0,0,.5)",
        backfaceVisibility: "hidden",
      }}
    >
      <Img src={staticFile(`papers/${sh.img}.jpg`)} style={{ width: PAGE_W, height: sh.h, display: "block" }} />
      {sh.hero ? <RedCircle p={circle} /> : null}
    </div>
  );
};

/* ───────────────────────────── camera for the opening ───────────────────────────── */

const useCamera = (t: number) => {
  const settle = cue("s1.settle");
  const zoomStart = cue("s1.zoomStart");
  const zoomEnd = cue("s1.zoomEnd");
  // 0–2 s: slight pull-back while the sheets rain in
  let scale = lerp(1.09, 1.0, E.outCubic(prog(t, 0, settle)));
  let rot = lerp(-1.8, 0, E.outCubic(prog(t, 0, settle)));
  let fx = W / 2;
  let fy = H / 2;
  let px = W / 2;
  let py = H / 2;
  // 2–3.2 s: the camera finds the headline
  const f = E.inOutCubic(prog(t, settle, settle + 1.15));
  scale *= lerp(1, 1.13, f);
  rot += -HERO.rot * f;
  fx = lerp(fx, HEAD_C.x, f);
  fy = lerp(fy, HEAD_C.y, f);
  py = lerp(py, 820, f);
  // slow creep while the circle is drawn
  scale *= 1 + 0.04 * prog(t, settle + 0.9, zoomStart);
  // 4.0 s: dive through the paper
  const tau = prog(t, zoomStart, zoomEnd);
  if (tau > 0) {
    const d = E.inOutCubic(prog(tau, 0, 0.14));
    fx = lerp(fx, DIVE.x, d);
    fy = lerp(fy, DIVE.y, d);
    py = lerp(py, 900, d);
    const anticip = -0.05 * Math.sin(Math.PI * prog(tau, 0, 0.16)); // tiny pull back before the push
    scale *= Math.exp(anticip + 5.6 * E.inCubic(prog(tau, 0.04, 0.5)));
  }
  // jolts: each sheet landing nudges the camera, the hero hits hardest
  let sx = 0;
  let sy = 0;
  let sr = 0;
  for (const sh of SHEETS) {
    const k = shake(t, sh.t0 + sh.dur * 0.72, sh.hero ? 15 : 3.2, 7, 30, sh.x);
    sx += k.x;
    sy += k.y;
    sr += k.r;
  }
  return { scale, rot: rot + sr, fx, fy, px: px + sx, py: py + sy, focus: f, tau };
};

const Storm: React.FC = () => {
  const t = useT();
  const cam = useCamera(t);
  const circle = prog(t, cue("s1.circleStart"), cue("s1.circleEnd"));
  const out = 1 - prog(cam.tau, 0.36, 0.5);
  if (out <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ perspective: 1500, perspectiveOrigin: "50% 50%" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: W,
            height: H,
            transformStyle: "preserve-3d",
            transformOrigin: `${cam.fx}px ${cam.fy}px`,
            transform: `translate(${cam.px - cam.fx}px, ${cam.py - cam.fy}px) rotate(${cam.rot}deg) scale(${cam.scale})`,
          }}
        >
          {SHEETS.map((sh, i) => (
            <Paper key={i} sh={sh} i={i} t={t} focus={cam.focus} circle={circle} />
          ))}
        </div>
      </AbsoluteFill>
      {/* pool of light on the headline once the camera has found it */}
      <AbsoluteFill
        style={{
          opacity: cam.focus * (1 - prog(cam.tau, 0, 0.3)),
          background: "radial-gradient(ellipse 80% 30% at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ─────────────── the zoom-through: paper fibres → halftone print → Wall Street ─────────────── */

const WALL_CREDIT = "Photo: elbpresse.de / Wikimedia Commons · CC BY-SA 4.0";
const LEHMAN_CREDIT = "Photo: Robert Scoble · CC BY 2.0";

const wallZoom = (t: number) => {
  const tau = prog(t, cue("s1.zoomStart"), cue("s1.zoomEnd"));
  const u = prog(tau, 0.4, 1);
  return 0.2 + 0.86 * E.outCubic(u) + 0.05 * Math.max(0, t - (cue("s1.zoomEnd") - 0.45));
};

const Through: React.FC = () => {
  const t = useT();
  const zoomStart = cue("s1.zoomStart");
  const zoomEnd = cue("s1.zoomEnd");
  const cut = cue("s1.cutLehman");
  const tau = prog(t, zoomStart, zoomEnd);
  if (tau <= 0.26 || t >= cut) return null;

  // 1 · macro paper: we are inside the sheet, fibres streaming past
  const macroA = Math.min(prog(tau, 0.28, 0.42), 1 - prog(tau, 0.58, 0.8));
  const macroS = 0.85 * Math.exp(2.9 * Math.pow(prog(tau, 0.28, 0.8), 1.35));

  // 2 · the printed picture rushes up out of the paper, 3 · and becomes the real street
  const z = wallZoom(t);
  const printA = prog(tau, 0.42, 0.56);
  const real = E.inOutCubic(prog(tau, 0.62, 0.9));
  const land = shake(t, zoomStart + (zoomEnd - zoomStart) * 0.74, 9, 6, 26, 5);
  const d = drift(t, 3.2, 0.5, 3);
  const settle = E.outCubic(prog(tau, 0.5, 1));
  const tagA = win(t, zoomEnd + 0.1, cut - 0.02, 0.35, 0.12);
  const maskR = lerp(30, 140, prog(tau, 0.42, 0.72));

  return (
    <AbsoluteFill>
      {macroA > 0 ? (
        <AbsoluteFill style={{ opacity: macroA, overflow: "hidden", background: C.paper }}>
          <div
            style={{
              position: "absolute",
              left: -W,
              top: -H,
              width: W * 3,
              height: H * 3,
              backgroundImage: `url(${staticFile("textures/paper_macro.jpg")})`,
              backgroundSize: `${W}px ${H}px`,
              transformOrigin: "50% 47%",
              transform: `scale(${macroS}) rotate(${-HERO.rot * 0 + tau * 2}deg)`,
            }}
          />
        </AbsoluteFill>
      ) : null}

      {printA > 0 ? (
        <AbsoluteFill style={{ opacity: printA, transform: `translate(${land.x + d.x}px, ${land.y + d.y}px)` }}>
          {/* halftone print, multiplied into the paper and feathered so it grows out of the sheet */}
          {real < 1 ? (
            <AbsoluteFill
              style={{
                mixBlendMode: "multiply",
                WebkitMaskImage: `radial-gradient(ellipse ${maskR * 0.62}% ${maskR * 0.5}% at 50% 47%, #000 55%, transparent 100%)`,
                maskImage: `radial-gradient(ellipse ${maskR * 0.62}% ${maskR * 0.5}% at 50% 47%, #000 55%, transparent 100%)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: (W - 1296) / 2,
                  top: (H - 2304) / 2,
                  width: 1296,
                  height: 2304,
                  transformOrigin: "50% 47%",
                  transform: `scale(${z * (W / 1296)})`,
                }}
              >
                <Img src={staticFile("img/wall_street_halftone.jpg")} style={{ width: 1296, height: 2304, display: "block" }} />
              </div>
            </AbsoluteFill>
          ) : null}
          {real > 0 ? (
            <AbsoluteFill style={{ opacity: real }}>
              <ParallaxLayers
                name="wall_street"
                cam={{ zoom: z, y: lerp(60, 0, settle) * 0 + (z - 1) * 60, brightness: lerp(1.25, 1, prog(tau, 0.7, 1)), dolly: lerp(0, 26, prog(t, zoomEnd - 0.3, cut)) }}
                fg={{
                  zoom: lerp(1.32, 1.07, settle) + 0.03 * prog(t, zoomEnd, cut),
                  x: lerp(-96, -16, settle) - 16 * prog(t, zoomEnd, cut),
                  y: lerp(96, 22, settle),
                  blur: lerp(7, 0.6, settle),
                  brightness: 0.86,
                }}
                bgBlur={lerp(3, 0, prog(tau, 0.75, 1))}
              />
            </AbsoluteFill>
          ) : null}
        </AbsoluteFill>
      ) : null}

      {/* the instant we break through the sheet */}
      <Flash a={0.5 * win(tau, 0.38, 0.6, 0.08, 0.14)} color={C.paper} />
      <ArchiveTag a={tagA} place="WALL STREET, NEW YORK" date="16 SEPTEMBER 2008" credit={WALL_CREDIT} />
    </AbsoluteFill>
  );
};

/* ───────────────────────── Lehman HQ on the night of the filing + title ───────────────────────── */

const LehmanAndTitle: React.FC = () => {
  const t = useT();
  const cut = cue("s1.cutLehman");
  const title = cue("s1.title");
  const out = cue("s1.titleOut");
  if (t < cut) return null;
  const p = prog(t, cut, out + 0.3);
  const hit = prog(t, title, title + 0.5);
  const dim = E.outCubic(prog(t, title - 0.02, title + 0.18));
  const k = shake(t, title, 26, 6.5, 32, 9);
  const d = drift(t, 3, 0.45, 8);
  const tagA = win(t, cut + 0.12, title - 0.05, 0.3, 0.1);
  // "SEPTEMBER" and "2008" slam in one after the other
  const s1 = E.outExpo(prog(t, title, title + 0.34));
  const s2 = E.outExpo(prog(t, title + 0.09, title + 0.45));
  const exit = E.inCubic(prog(t, out, out + 0.2));
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ transform: `translate(${k.x + d.x}px, ${k.y + d.y}px) rotate(${k.r}deg)` }}>
        <ParallaxPhoto
          name="lehman_night"
          cam={{
            zoom: 1.03 + 0.1 * p + 0.05 * dim,
            y: lerp(34, -30, E.outQuad(p)),
            dolly: 30 * p,
            truckX: lerp(-10, 12, p),
            brightness: lerp(1.12, 0.36, dim),
            blur: 5 * dim,
            saturate: lerp(1, 0.5, dim),
          }}
        />
      </AbsoluteFill>
      <Flash a={0.85 * (1 - prog(t, cut, cut + 0.09))} />
      <ArchiveTag a={tagA} place="LEHMAN BROTHERS HQ" date="NEW YORK · 15 SEPTEMBER 2008" credit={LEHMAN_CREDIT} />

      {t >= title ? (
        <AbsoluteFill style={{ transform: `translate(${k.x * 1.3}px, ${k.y * 1.3}px) rotate(${k.r * 1.2}deg)`, opacity: 1 - exit * 0 }}>
          <div style={{ position: "absolute", left: 0, top: 640, width: W, textAlign: "center" }}>
            <div
              style={{
                fontFamily: F.mono,
                fontWeight: 600,
                fontSize: 25,
                lineHeight: "30px",
                letterSpacing: 9,
                color: C.red,
                opacity: prog(t, title + 0.28, title + 0.6) * (1 - exit),
                marginBottom: 26,
              }}
            >
              NEW YORK CITY
            </div>
            <div
              style={{
                fontFamily: F.serif,
                fontWeight: 900,
                fontSize: 138,
                lineHeight: 1,
                letterSpacing: lerp(26, 3, s1),
                color: C.paper,
                opacity: s1 * (1 - exit),
                transform: `scale(${lerp(1.5, 1, s1)})`,
                filter: `blur(${(1 - s1) * 14}px)`,
                textShadow: "0 10px 50px rgba(0,0,0,.8)",
              }}
            >
              SEPTEMBER
            </div>
            <div
              style={{
                fontFamily: F.serif,
                fontWeight: 900,
                fontSize: 372,
                fontFeatureSettings: '"lnum" 1, "tnum" 1',
                lineHeight: 0.98,
                letterSpacing: lerp(40, -4, s2),
                color: C.paper,
                opacity: s2,
                transform: `scale(${lerp(1.7, 1, s2)})`,
                filter: `blur(${(1 - s2) * 22}px)`,
                textShadow: "0 14px 70px rgba(0,0,0,.85)",
                marginTop: 4,
              }}
            >
              2008
            </div>
            <div style={{ width: lerp(0, 760, E.outCubic(prog(t, title + 0.3, title + 0.85))), height: 6, background: C.red, margin: "30px auto 0", opacity: 1 - exit }} />
          </div>
        </AbsoluteFill>
      ) : null}
      <Flash a={t >= title ? 0.75 * (1 - hit * 6) : 0} />
    </AbsoluteFill>
  );
};

export const S1Hook: React.FC = () => {
  const t = useT();
  const zoomStart = cue("s1.zoomStart");
  const zoomEnd = cue("s1.zoomEnd");
  // real temporal motion blur while things move fast; none once the moves are slow
  const samples = t < 2.25 ? 8 : t >= zoomStart - 0.04 && t < zoomStart + (zoomEnd - zoomStart) * 0.86 ? 12 : 1;
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <MotionBlur samples={samples} shutter={0.62}>
        <AbsoluteFill>
          <Storm />
          <Through />
        </AbsoluteFill>
      </MotionBlur>
      <LehmanAndTitle />
    </AbsoluteFill>
  );
};
