import React from "react";
import { E, prog } from "../lib/anim";
import { useT } from "../lib/time";
import { TL } from "../lib/timeline";
import { F } from "../theme";

const ALL = Object.values(TL.captions).flat() as unknown as { text: string; s: number; e: number }[];

/**
 * Burned-in subtitles: one short phrase at a time, sitting just above the Instagram UI zone.
 * Most Reels are watched muted – this keeps the story readable without sound.
 * Set `show={false}` on <Captions> in Reel.tsx for a clean (text-free) master.
 */
export const Captions: React.FC<{ show?: boolean; y?: number }> = ({ show = true, y = 1418 }) => {
  const t = useT();
  if (!show) return null;
  const c = ALL.find((p) => t >= p.s - 0.04 && t < p.e);
  if (!c) return null;
  const a = E.outCubic(prog(t, c.s - 0.04, c.s + 0.1)) * (1 - prog(t, c.e - 0.07, c.e));
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1080, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          opacity: a,
          transform: `translateY(${(1 - a) * 8}px)`,
          background: "rgba(9,9,10,.74)",
          padding: "9px 24px 11px",
          borderRadius: 5,
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 41,
          letterSpacing: -0.3,
          color: "#F4F0E6",
          whiteSpace: "nowrap",
        }}
      >
        {c.text}
      </div>
    </div>
  );
};
