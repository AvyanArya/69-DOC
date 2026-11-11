import React from "react";
import { Img, staticFile } from "remotion";
import { C, F } from "../theme";
import { PAGE_H, PAGE_W, PaperSpec, WIKI_H } from "./specs";

const INK = "#1a1917";
const M = 34; // page margin
const MEASURE = PAGE_W - M * 2;

/** One headline line, forced to the full measure like a banner headline. */
const HeadLine: React.FC<{ text: string; size: number; font: PaperSpec["headFont"] }> = ({ text, size, font }) => {
  const fam = font === "impact" ? F.impact : font === "news" ? F.news : F.serif;
  const weight = font === "impact" ? 400 : font === "news" ? 800 : 900;
  return (
    <svg width={MEASURE} height={size * 0.86} viewBox={`0 0 ${MEASURE} ${size * 0.86}`} style={{ display: "block", overflow: "visible" }}>
      <text
        x={0}
        y={size * 0.8}
        textLength={MEASURE}
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: fam, fontWeight: weight, fontSize: size, fill: INK, letterSpacing: font === "impact" ? 1 : -0.5 }}
      >
        {text}
      </text>
    </svg>
  );
};

const Rule: React.FC<{ thick?: number; gap?: number }> = ({ thick = 1, gap = 0 }) => (
  <div style={{ height: thick, background: INK, margin: `${gap}px 0`, opacity: 0.92 }} />
);

const bodyStyle: React.CSSProperties = {
  fontFamily: F.news,
  fontSize: 10.4,
  lineHeight: 1.27,
  color: INK,
  textAlign: "justify",
  hyphens: "auto",
};

const Columns: React.FC<{ paras: string[]; cols: number; repeat?: number }> = ({ paras, cols, repeat = 3 }) => {
  const all = Array.from({ length: repeat }, () => paras).flat();
  return (
    <div style={{ ...bodyStyle, columnCount: cols, columnGap: 13, columnRule: `0.5px solid rgba(26,25,23,.35)`, height: "100%", overflow: "hidden" }}>
      {all.map((p, i) => (
        <p key={i} style={{ margin: 0, textIndent: i === 0 ? 0 : 10 }}>
          {i === 0 ? <span style={{ fontWeight: 700 }}>{p.split("—")[0]}—</span> : null}
          {i === 0 ? p.split("—").slice(1).join("—") : p}
        </p>
      ))}
    </div>
  );
};

const Photo: React.FC<{ src: string; h: number; caption: string }> = ({ src, h, caption }) => (
  <div>
    <div style={{ height: h, overflow: "hidden", border: `0.75px solid ${INK}` }}>
      <Img src={staticFile(`img/${src}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "multiply" }} />
    </div>
    <div style={{ fontFamily: F.sans, fontSize: 8.2, lineHeight: 1.25, color: INK, marginTop: 4, opacity: 0.86 }}>{caption}</div>
  </div>
);

export const FrontPage: React.FC<{ spec: PaperSpec }> = ({ spec }) => {
  const mastFont =
    spec.mast === "gothic" ? F.gothic : spec.mast === "slab" ? F.impact : spec.mast === "caps" ? F.serif : F.serif;
  return (
    <div
      style={{
        width: PAGE_W,
        height: PAGE_H,
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url(${staticFile(`textures/newsprint_${spec.texture}.jpg`)})`,
        backgroundSize: "100% 100%",
        color: INK,
      }}
    >
      <div style={{ position: "absolute", left: M, top: 22, width: MEASURE }}>
        {/* ears + masthead */}
        <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {spec.mast === "gothic" ? (
            <div style={{ position: "absolute", left: 0, top: 26, width: 96, fontFamily: F.news, fontSize: 8.6, lineHeight: 1.25, border: `0.75px solid ${INK}`, padding: "5px 6px", textAlign: "center" }}>
              LATE CITY
              <br />
              EDITION
            </div>
          ) : null}
          <div
            style={{
              fontFamily: mastFont,
              fontWeight: spec.mast === "gothic" ? 700 : 900,
              fontSize: spec.mastSize,
              letterSpacing: spec.mast === "caps" ? 5 : spec.mast === "slab" ? 2 : 0,
              lineHeight: 1,
              whiteSpace: "nowrap",
              color: spec.mast === "slab" ? C.redDeep : INK,
            }}
          >
            {spec.masthead}
          </div>
          {spec.mast === "gothic" ? (
            <div style={{ position: "absolute", right: 0, top: 26, width: 96, fontFamily: F.news, fontSize: 8.6, lineHeight: 1.25, border: `0.75px solid ${INK}`, padding: "5px 6px", textAlign: "center" }}>
              MARKETS
              <br />
              SPECIAL
            </div>
          ) : null}
        </div>
        <Rule thick={2.5} />
        <div style={{ height: 23, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: F.sans, fontWeight: 600, fontSize: 9.4, letterSpacing: 1.1 }}>
          <span>VOL. CLVIII · No. 54,437</span>
          <span>{spec.date} · ILLUSTRATIVE EDITION</span>
          <span>$1.25</span>
        </div>
        <Rule thick={1} />
        <div style={{ height: 3 }} />
        <Rule thick={0.5} />

        {/* kicker */}
        <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {spec.kicker ? (
            <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 12.5, letterSpacing: 4.5, color: C.redDeep }}>{spec.kicker}</span>
          ) : null}
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {spec.headline.map((l, i) => (
            <HeadLine key={i} text={l.text} size={l.size} font={spec.headFont} />
          ))}
        </div>

        {/* deck */}
        <div
          style={{
            fontFamily: spec.layout === "tabloid" ? F.serif : F.news,
            fontStyle: spec.layout === "tabloid" ? "normal" : "italic",
            fontWeight: spec.layout === "tabloid" ? 800 : 500,
            fontSize: spec.layout === "tabloid" ? 34 : 19.5,
            lineHeight: 1.18,
            textAlign: "center",
            margin: "14px 18px 12px",
          }}
        >
          {spec.deck}
        </div>
        <Rule thick={1} />
        <div style={{ height: 10 }} />

        {/* story area */}
        {spec.layout === "split" ? (
          <div style={{ display: "flex", gap: 14, height: 760 }}>
            <div style={{ width: 486, display: "flex", flexDirection: "column", gap: 9 }}>
              <Photo src={spec.photo} h={spec.photoH} caption={spec.caption} />
              <div style={{ flex: 1, minHeight: 0 }}>
                <Columns paras={spec.body} cols={3} />
              </div>
            </div>
            <div style={{ width: 0.75, background: INK, opacity: 0.6 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
              {spec.side.map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 19, lineHeight: 1.1, marginBottom: 6 }}>{s.head}</div>
                  <div style={{ ...bodyStyle }}>{s.text} {s.text}</div>
                  <div style={{ height: 9 }} />
                  <Rule thick={0.6} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, height: 760 }}>
            <Photo src={spec.photo} h={spec.photoH} caption={spec.caption} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <Columns paras={spec.body} cols={spec.layout === "tabloid" ? 4 : 5} />
            </div>
          </div>
        )}
      </div>
      {/* ink density / light falloff so the sheet is not perfectly flat */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(255,255,255,.10) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,.10) 100%)" }} />
    </div>
  );
};

/** A genuine Wikinews Print Edition page, shown as a black-and-white print on newsprint. */
export const WikinewsPage: React.FC<{ id: string; texture?: "a" | "b" | "c" }> = ({ id, texture = "c" }) => (
  <div
    style={{
      width: PAGE_W,
      height: WIKI_H,
      position: "relative",
      overflow: "hidden",
      backgroundImage: `url(${staticFile(`textures/newsprint_${texture}.jpg`)})`,
      backgroundSize: "100% 100%",
    }}
  >
    <Img
      src={staticFile(`img/wikinews_${id}.jpg`)}
      style={{ position: "absolute", inset: 0, width: PAGE_W, height: WIKI_H, mixBlendMode: "multiply", filter: "grayscale(1) contrast(1.12)" }}
    />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(255,255,255,.08) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,.09) 100%)" }} />
  </div>
);
