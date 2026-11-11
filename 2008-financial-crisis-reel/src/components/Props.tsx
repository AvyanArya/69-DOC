import React from "react";
import { staticFile } from "remotion";
import { E, clamp, lerp } from "../lib/anim";
import { C, F } from "../theme";

/** A sheet of textured paper. */
export const Sheet: React.FC<{
  w: number;
  h: number;
  texture?: "paper_white" | "newsprint_a" | "newsprint_b" | "newsprint_c" | "manila";
  style?: React.CSSProperties;
  children?: React.ReactNode;
  shadow?: boolean;
}> = ({ w, h, texture = "paper_white", style, children, shadow = true }) => (
  <div
    style={{
      width: w,
      height: h,
      position: "relative",
      backgroundImage: `url(${staticFile(`textures/${texture}.jpg`)})`,
      backgroundSize: "100% 100%",
      boxShadow: shadow ? "0 30px 70px rgba(0,0,0,.55), 0 4px 12px rgba(0,0,0,.4)" : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

const Scribble: React.FC<{ w: number; color?: string }> = ({ w, color = "#1d2a55" }) => (
  <svg width={w} height={w * 0.3} viewBox="0 0 200 60" style={{ overflow: "visible" }}>
    <path
      d="M6,42 C18,8 30,6 32,30 C34,52 44,50 50,30 C56,10 66,14 64,34 C62,50 76,46 84,28 C92,12 100,20 98,36 C96,48 112,44 122,26 C130,14 140,22 150,30 C162,40 176,30 194,22"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
    />
  </svg>
);

/** Full-size mortgage contract. `mark` (0..1) draws the red marker under the two tell-tale fields. */
export const MortgageDoc: React.FC<{ n?: number; mark?: number; w?: number }> = ({ n = 1, mark = 0, w = 760 }) => {
  const h = Math.round(w * 1.3);
  const u = w / 760;
  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottom: "1.5px solid rgba(22,21,20,.55)",
    padding: `${15 * u}px 0 ${7 * u}px`,
    fontFamily: F.mono,
    fontSize: 25 * u,
    color: C.ink,
  };
  const label: React.CSSProperties = { fontFamily: F.sans, fontWeight: 700, fontSize: 17 * u, letterSpacing: 2.2 * u, opacity: 0.72 };
  const Mark: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => (
    <span style={{ position: "relative", fontWeight: 800 }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: -8 * u,
          right: -8 * u,
          bottom: -3 * u,
          height: 30 * u,
          background: C.redBright,
          opacity: 0.3,
          transformOrigin: "0 50%",
          transform: `scaleX(${clamp(p)}) rotate(-1deg)`,
          mixBlendMode: "multiply",
          borderRadius: 3,
        }}
      />
    </span>
  );
  return (
    <Sheet w={w} h={h}>
      <div style={{ position: "absolute", inset: `${46 * u}px ${52 * u}px` }}>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14.5 * u, letterSpacing: 3.4 * u, color: C.ink, opacity: 0.6, display: "flex", justifyContent: "space-between" }}>
          <span>FORM 3200-ARM</span>
          <span>LOAN No. 05-{String(48217 + n * 1931)}</span>
        </div>
        <div style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 47 * u, lineHeight: 1.04, color: C.ink, marginTop: 14 * u, letterSpacing: -0.5 }}>
          RESIDENTIAL
          <br />
          MORTGAGE AGREEMENT
        </div>
        <div style={{ height: 4 * u, background: C.ink, marginTop: 15 * u }} />
        <div style={{ height: 1.5 * u, background: C.ink, marginTop: 4 * u }} />
        <div style={{ marginTop: 12 * u }}>
          <div style={row}>
            <span style={label}>PROPERTY</span>
            <span>SINGLE-FAMILY HOME</span>
          </div>
          <div style={row}>
            <span style={label}>LOAN AMOUNT</span>
            <span style={{ fontWeight: 700 }}>$ 320,000</span>
          </div>
          <div style={row}>
            <span style={label}>DOWN PAYMENT</span>
            <Mark p={mark * 2}>$ 0</Mark>
          </div>
          <div style={row}>
            <span style={label}>INTEREST RATE</span>
            <span>ADJUSTABLE · 2/28</span>
          </div>
          <div style={row}>
            <span style={label}>INCOME VERIFIED</span>
            <Mark p={mark * 2 - 0.7}>NO</Mark>
          </div>
        </div>
        {/* fine print */}
        <div style={{ marginTop: 26 * u, display: "flex", flexDirection: "column", gap: 9 * u }}>
          {[1, 0.96, 0.99, 0.9, 0.97, 0.62].map((f, i) => (
            <div key={i} style={{ height: 5.5 * u, width: `${f * 100}%`, background: C.ink, opacity: 0.2 }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 6 * u, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <Scribble w={210 * u} />
            <div style={{ borderTop: `1.5px solid ${C.ink}`, width: 250 * u, marginTop: 2 }} />
            <div style={{ ...label, marginTop: 6 * u }}>BORROWER</div>
          </div>
          <div>
            <div style={{ borderTop: `1.5px solid ${C.ink}`, width: 190 * u }} />
            <div style={{ ...label, marginTop: 6 * u }}>DATE</div>
          </div>
        </div>
      </div>
    </Sheet>
  );
};

/** Small generic document used when hundreds are on screen at once. */
export const MiniDoc: React.FC<{ w: number; tint?: string; lines?: number; style?: React.CSSProperties }> = ({ w, tint = "#F3EFE6", lines = 5, style }) => {
  const h = w * 1.3;
  return (
    <div style={{ width: w, height: h, background: tint, boxShadow: "0 2px 5px rgba(0,0,0,.35)", position: "relative", ...style }}>
      <div style={{ position: "absolute", left: w * 0.12, top: h * 0.1, width: w * 0.5, height: h * 0.07, background: C.ink, opacity: 0.85 }} />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: w * 0.12, top: h * (0.26 + i * 0.11), width: w * (i === lines - 1 ? 0.45 : 0.76), height: h * 0.028, background: C.ink, opacity: 0.28 }} />
      ))}
    </div>
  );
};

/** Rubber stamp. `p` is 0..1 from the moment it hits. */
export const Stamp: React.FC<{ text: string; p: number; color?: string; rot?: number; size?: number; sub?: string }> = ({
  text,
  p,
  color = C.green,
  rot = -11,
  size = 84,
  sub,
}) => {
  if (p <= 0) return null;
  const s = lerp(2.6, 1, E.outExpo(clamp(p * 3.2))) * (1 + 0.035 * Math.exp(-p * 9) * Math.sin(p * 40));
  return (
    <div
      style={{
        display: "inline-block",
        transform: `rotate(${rot}deg) scale(${s})`,
        opacity: clamp(p * 9),
        border: `${size * 0.085}px solid ${color}`,
        borderRadius: size * 0.14,
        padding: `${size * 0.06}px ${size * 0.26}px ${size * 0.02}px`,
        color,
        fontFamily: F.impact,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: size * 0.05,
        textAlign: "center",
        mixBlendMode: "multiply",
        // worn-ink look: bite small holes out of the stamp
        WebkitMaskImage: "radial-gradient(circle at 22% 35%, transparent 0 2.5px, #000 3.5px), radial-gradient(circle at 71% 62%, transparent 0 3px, #000 4px), radial-gradient(circle at 48% 18%, transparent 0 2px, #000 3px)",
        WebkitMaskSize: "37px 31px, 53px 43px, 29px 47px",
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    >
      {text}
      {sub ? <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size * 0.2, letterSpacing: size * 0.05, marginTop: -size * 0.06, paddingBottom: size * 0.1 }}>{sub}</div> : null}
    </div>
  );
};

/** Types `text` out as p goes 0→1. */
export const Typewriter: React.FC<{ text: string; p: number; style?: React.CSSProperties; cursor?: boolean }> = ({ text, p, style, cursor = true }) => {
  const n = Math.floor(clamp(p) * text.length + 1e-6);
  return (
    <span style={style}>
      {text.slice(0, n)}
      {cursor && p > 0 && p < 1 ? <span style={{ opacity: 0.8 }}>▌</span> : null}
      <span style={{ opacity: 0 }}>{text.slice(n)}</span>
    </span>
  );
};

export const BankIcon: React.FC<{ size: number; color?: string; fill?: string }> = ({ size, color = C.paper, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: "visible" }}>
    <g fill={fill} stroke={color} strokeWidth={4.2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M8,44 L60,12 L112,44 Z" />
      <path d="M16,44 H104 V54 H16 Z" />
      {[26, 49, 72, 95].map((x) => (
        <path key={x} d={`M${x - 6},54 V92 M${x + 5},54 V92`} />
      ))}
      <path d="M12,92 H108 V102 H12 Z" />
      <path d="M4,102 H116 V112 H4 Z" />
    </g>
  </svg>
);

export const HouseIcon: React.FC<{ size: number; color?: string; fill?: string }> = ({ size, color = C.paper, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: "visible" }}>
    <g fill={fill} stroke={color} strokeWidth={4.2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M8,58 L60,14 L112,58" />
      <path d="M22,48 V108 H98 V48" />
      <path d="M50,108 V76 H70 V108" />
      <path d="M82,22 V36 M82,22 H92 V44" />
      <path d="M30,60 H44 V74 H30 Z M76,60 H90 V74 H76 Z" />
    </g>
  </svg>
);

/** Small uppercase label used for diagram captions, sources etc. */
export const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.paper, size = 22, style }) => (
  <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: size, letterSpacing: size * 0.16, color, ...style }}>{children}</div>
);
