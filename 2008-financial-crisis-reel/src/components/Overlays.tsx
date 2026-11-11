import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F, SAFE } from "../theme";

/** Lens vignette – darkens the corners so the eye stays in the middle of the frame. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.62 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse 78% 62% at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,${strength * 0.55}) 82%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

/** One- or two-frame flash (camera flashbulb / impact). `a` is opacity 0..1. */
export const Flash: React.FC<{ a: number; color?: string }> = ({ a, color = "#fff" }) =>
  a > 0.002 ? <AbsoluteFill style={{ background: color, opacity: a, pointerEvents: "none" }} /> : null;

/**
 * Documentary locator + archive credit. Every genuine archival image carries its own credit line on
 * screen (these are CC BY / CC BY-SA / public-domain works, so attribution travels with the picture).
 */
export const ArchiveTag: React.FC<{ a: number; place: string; date: string; credit: string; top?: number; kind?: "ARCHIVE" | "PHOTO" | "FOOTAGE" }> = ({
  a,
  place,
  date,
  credit,
  top = SAFE.top + 6,
  kind = "ARCHIVE",
}) =>
  a > 0.002 ? (
    <div
      style={{
        position: "absolute",
        left: SAFE.left - 18,
        top: top - 14,
        padding: "14px 70px 14px 18px",
        // soft dark plate so the credit stays legible over bright pictures
        background: "linear-gradient(90deg, rgba(8,8,9,.74) 0%, rgba(8,8,9,.56) 62%, rgba(8,8,9,0) 100%)",
        opacity: a,
        transform: `translateX(${(1 - a) * -18}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 5, height: 62, background: C.red }} />
        <div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 30, letterSpacing: 3.2, color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,.85)" }}>{place}</div>
          <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 22, letterSpacing: 2.4, color: C.paper, opacity: 0.92, marginTop: 4, textShadow: "0 2px 12px rgba(0,0,0,.9)" }}>{date}</div>
        </div>
      </div>
      <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 17, letterSpacing: 0.6, color: "#fff", opacity: 0.78, marginTop: 10, marginLeft: 19, textShadow: "0 1px 8px rgba(0,0,0,.9)" }}>
        {kind} · {credit}
      </div>
    </div>
  ) : null;

/** Tiny credit only (for shots where a locator would clutter the frame). */
export const Credit: React.FC<{ a: number; text: string; bottom?: number; align?: "left" | "right" }> = ({ a, text, bottom = 1920 - SAFE.bottom + 4, align = "left" }) =>
  a > 0.002 ? (
    <div
      style={{
        position: "absolute",
        left: align === "left" ? SAFE.left : undefined,
        right: align === "right" ? 1080 - SAFE.right : undefined,
        bottom,
        opacity: a * 0.6,
        fontFamily: F.sans,
        fontWeight: 500,
        fontSize: 16.5,
        letterSpacing: 0.5,
        color: "#fff",
        textShadow: "0 1px 8px rgba(0,0,0,.95)",
      }}
    >
      {text}
    </div>
  ) : null;
