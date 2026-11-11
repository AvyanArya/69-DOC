import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Fonts } from "./Fonts";
import { C, F } from "./theme";

/** Logo concepts for the channel. `size` scales the whole lock-up; `compact` is the watermark version. */
export type LogoId = "A" | "B" | "C" | "D";

export const Logo: React.FC<{ id: LogoId; size?: number; compact?: boolean; color?: string }> = ({ id, size = 1, compact, color = C.paper }) => {
  const u = size;
  if (id === "A") {
    return compact ? (
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 * u, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 30 * u, color, letterSpacing: 1 }}>CAPITAL</span>
        <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 24 * u, color }}>
          <span style={{ color: C.redBright }}>[</span>DECODED<span style={{ color: C.redBright }}>]</span>
        </span>
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 96 * u, lineHeight: 1, color, letterSpacing: 2 }}>CAPITAL</div>
        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 62 * u, lineHeight: 1.25, color, letterSpacing: 6 * u }}>
          <span style={{ color: C.redBright }}>[</span>DECODED<span style={{ color: C.redBright }}>]</span>
        </div>
      </div>
    );
  }
  if (id === "B") {
    return compact ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8 * u, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 30 * u, color }}>CAPITAL</span>
        <span style={{ background: C.red, color: C.paper, fontFamily: F.sans, fontWeight: 900, fontSize: 21 * u, letterSpacing: 3 * u, padding: `${4 * u}px ${9 * u}px` }}>DECODED</span>
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 96 * u, lineHeight: 1, color }}>CAPITAL</div>
        <div style={{ display: "inline-block", marginTop: 12 * u, background: C.red, color: C.paper, fontFamily: F.sans, fontWeight: 900, fontSize: 50 * u, letterSpacing: 15 * u, padding: `${8 * u}px ${12 * u}px ${8 * u}px ${27 * u}px`, transform: "rotate(-1.2deg)" }}>DECODED</div>
      </div>
    );
  }
  if (id === "C") {
    const R = (compact ? 28 : 150) * u;
    const dial = (
      <svg width={R * 2} height={R * 2} viewBox="-100 -100 200 200" style={{ display: "block" }}>
        <circle r={96} fill="none" stroke={color} strokeWidth={compact ? 6 : 3} />
        {Array.from({ length: 40 }, (_, i) => (
          <line key={i} x1={0} y1={i % 5 === 0 ? -80 : -86} x2={0} y2={-92} stroke={i === 0 ? C.redBright : color} strokeWidth={i % 5 === 0 ? 3.5 : 1.5} transform={`rotate(${i * 9})`} />
        ))}
        {!compact ? (
          <>
            <path id="arc" d="M -66 0 A 66 66 0 1 1 66 0" fill="none" />
            <text style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 13.5, letterSpacing: 4.6, fill: color }}>
              <textPath href="#arc" startOffset="50%" textAnchor="middle">CAPITAL · DECODED</textPath>
            </text>
          </>
        ) : null}
        <text x={0} y={compact ? 24 : 30} textAnchor="middle" style={{ fontFamily: F.serif, fontWeight: 900, fontSize: compact ? 70 : 64, fill: color }}>
          C<tspan fill={C.redBright}>D</tspan>
        </text>
      </svg>
    );
    return compact ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10 * u, whiteSpace: "nowrap" }}>
        {dial}
        <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 21 * u, letterSpacing: 3 * u, color, lineHeight: 1.15 }}>
          CAPITAL
          <br />
          DECODED
        </span>
      </div>
    ) : (
      dial
    );
  }
  const candle = (h: number) => (
    <span style={{ display: "inline-block", position: "relative", width: h * 0.34, height: h, margin: `0 ${h * 0.05}px`, verticalAlign: "baseline" }}>
      <span style={{ position: "absolute", left: "50%", top: -h * 0.16, width: Math.max(2, h * 0.035), height: h * 1.3, background: C.green, transform: "translateX(-50%)" }} />
      <span style={{ position: "absolute", left: 0, right: 0, top: h * 0.14, height: h * 0.72, background: C.green }} />
    </span>
  );
  return compact ? (
    <div style={{ whiteSpace: "nowrap", fontFamily: F.serif, fontWeight: 900, fontSize: 30 * u, color, display: "flex", alignItems: "baseline", gap: 9 * u }}>
      <span>CAP{candle(22 * u)}TAL</span>
      <span style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 21 * u, letterSpacing: 2 * u }}>DECODED</span>
    </div>
  ) : (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 96 * u, lineHeight: 1.1, color }}>CAP{candle(70 * u)}TAL</div>
      <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 44 * u, letterSpacing: 20 * u, color, marginTop: 6 * u, paddingLeft: 20 * u }}>DECODED</div>
    </div>
  );
};

const NAMES: Record<LogoId, [string, string]> = {
  A: ["A · BRACKET", "Editorial serif + code brackets: finance, parsed like code."],
  B: ["B · HIGHLIGHT", "The red marker bar from the film becomes the brand."],
  C: ["C · DIAL", "A safe dial / coin: cracking the combination."],
  D: ["D · CANDLESTICK", "The “I” is a market candle; clean and financial."],
};

/** One sheet with all four concepts and how each sits in the film (watermark + outro). */
export const BrandingSheet: React.FC = () => (
  <Fonts>
    <AbsoluteFill style={{ background: "#0e0e10", padding: 40, fontFamily: F.sans }}>
      <div style={{ color: C.paper, fontWeight: 800, fontSize: 30, letterSpacing: 6 }}>CAPITAL DECODED — LOGO CONCEPTS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, marginTop: 22 }}>
        {(["A", "B", "C", "D"] as LogoId[]).map((id) => (
          <div key={id}>
            <div style={{ height: 360, background: C.coal, border: "1px solid #2c2c30", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Logo id={id} size={0.82} />
            </div>
            <div style={{ color: C.redBright, fontWeight: 800, fontSize: 21, letterSpacing: 3, marginTop: 12 }}>{NAMES[id][0]}</div>
            <div style={{ color: C.paper, opacity: 0.75, fontSize: 18, marginTop: 4, height: 46 }}>{NAMES[id][1]}</div>
            {/* watermark as it would sit over a frame of the film */}
            <div style={{ position: "relative", height: 410, overflow: "hidden", marginTop: 6 }}>
              <Img src={staticFile("img/wall_street.jpg")} style={{ position: "absolute", width: "100%", top: -260 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.5) 100%)" }} />
              <div style={{ position: "absolute", left: 10, top: 8, color: "#fff", opacity: 0.6, fontSize: 14, letterSpacing: 2 }}>WATERMARK, BOTTOM RIGHT</div>
              <div style={{ position: "absolute", right: 16, bottom: 16, opacity: 0.72, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))" }}>
                <Logo id={id} compact size={0.86} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  </Fonts>
);
