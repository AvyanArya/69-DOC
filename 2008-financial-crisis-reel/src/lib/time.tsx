import React, { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Every animation in this project is a pure function of *time in seconds*, read with useT().
 * That lets <MotionBlur> re-render its children at several instants inside the shutter interval
 * and average them — real temporal motion blur rather than a filter.
 */
const TimeOffset = createContext(0);

export const useT = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps + useContext(TimeOffset);
};

export const MotionBlur: React.FC<{ samples: number; shutter?: number; children: React.ReactNode }> = ({
  samples,
  shutter = 0.5,
  children,
}) => {
  const { fps } = useVideoConfig();
  const parent = useContext(TimeOffset);
  if (samples <= 1) return <>{children}</>;
  return (
    <AbsoluteFill>
      {Array.from({ length: samples }, (_, i) => {
        // sample i is taken (i / samples) of the way back through the open shutter
        const dt = -((i / samples) * shutter) / fps;
        return (
          // stacking opacities 1, 1/2, 1/3 … yields an equal-weight average of all samples
          <AbsoluteFill key={i} style={{ opacity: 1 / (i + 1) }}>
            <TimeOffset.Provider value={parent + dt}>{children}</TimeOffset.Provider>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
