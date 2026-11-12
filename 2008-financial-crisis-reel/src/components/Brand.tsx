import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Logo } from "../Branding";
import { E, clamp, lerp, prog } from "../lib/anim";
import { useT } from "../lib/time";
import { cue } from "../lib/timeline";
import { C, F, W } from "../theme";

/** Channel watermark (logo B), bottom right, for the whole film until the outro card takes over. */
export const Watermark: React.FC = () => {
  const t = useT();
  const a = prog(t, 0.35, 0.9) * (1 - prog(t, cue("outro.start") - 0.6, cue("outro.start") - 0.1));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 38, bottom: 300, opacity: 0.74 * a, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.85))", pointerEvents: "none" }}>
      <Logo id="B" compact size={0.78} />
    </div>
  );
};

/** Closing brand card. */
export const Outro: React.FC = () => {
  const t = useT();
  const t0 = cue("outro.start");
  const t1 = cue("outro.end");
  if (t < t0) return null;
  const word = E.outExpo(prog(t, t0 + 0.1, t0 + 0.7));
  const bar = E.inOutCubic(prog(t, t0 + 0.45, t0 + 0.95));
  const sub = E.outCubic(prog(t, t0 + 1.0, t0 + 1.5));
  const out = E.inCubic(prog(t, t1 - 0.45, t1));
  return (
    <AbsoluteFill style={{ background: C.black, opacity: clamp(prog(t, t0, t0 + 0.15)) }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("textures/newsprint_b.jpg")})`, backgroundSize: "cover", mixBlendMode: "overlay", opacity: 0.16 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 30% at 50% 48%, rgba(176,20,30,.18) 0%, rgba(176,20,30,0) 100%)" }} />
      <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${1 + 0.04 * prog(t, t0, t1)})` }}>
        <div style={{ position: "absolute", left: 0, width: W, top: 760, textAlign: "center" }}>
          <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 142, lineHeight: 1, color: C.paper, letterSpacing: lerp(30, 3, word), opacity: word, filter: `blur(${(1 - word) * 12}px)` }}>CAPITAL</div>
          <div style={{ display: "inline-block", marginTop: 18, position: "relative", transform: "rotate(-1.2deg)" }}>
            <div style={{ position: "absolute", inset: 0, background: C.red, transformOrigin: "0 50%", transform: `scaleX(${bar})`, boxShadow: "0 0 60px rgba(212,34,46,.45)" }} />
            <div style={{ position: "relative", fontFamily: F.sans, fontWeight: 900, fontSize: 74, letterSpacing: 22, padding: "10px 16px 10px 38px", color: C.paper, opacity: clamp(bar * 1.6 - 0.3) }}>DECODED</div>
          </div>
          <div style={{ marginTop: 64, opacity: sub, transform: `translateY(${(1 - sub) * 18}px)` }}>
            <div style={{ fontFamily: F.news, fontStyle: "italic", fontSize: 38, color: C.paper, opacity: 0.85 }}>The stories behind the money.</div>
            <div style={{ display: "inline-block", marginTop: 34, border: `2px solid ${C.paper}`, borderRadius: 40, padding: "12px 34px", fontFamily: F.sans, fontWeight: 800, fontSize: 28, letterSpacing: 5, color: C.paper }}>
              <span style={{ color: C.redBright }}>▶</span>&nbsp; SUBSCRIBE
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
