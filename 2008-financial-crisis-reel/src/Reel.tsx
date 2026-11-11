import React from "react";
import { AbsoluteFill } from "remotion";
import { Vignette } from "./components/Overlays";
import { Fonts } from "./Fonts";
import { useT } from "./lib/time";
import { TL } from "./lib/timeline";
import { Captions } from "./components/Captions";
import { S1Hook } from "./scenes/S1Hook";
import { S2Problem } from "./scenes/S2Problem";
import { S3Bundle } from "./scenes/S3Bundle";
import { S4Collapse } from "./scenes/S4Collapse";
import { S5Lehman } from "./scenes/S5Lehman";
import { S6Aftermath } from "./scenes/S6Aftermath";
import { S7Final } from "./scenes/S7Final";
import { C } from "./theme";

const SCENES: [string, React.FC][] = [
  ["s1", S1Hook],
  ["s2", S2Problem],
  ["s3", S3Bundle],
  ["s4", S4Collapse],
  ["s5", S5Lehman],
  ["s6", S6Aftermath],
  ["s7", S7Final],
];

/** Scenes overlap by a few frames at each boundary so transitions can reach across the cut. */
const PRE = 0.0;
const POST = 0.0;

export const Reel: React.FC = () => {
  const t = useT();
  return (
    <Fonts>
      <AbsoluteFill style={{ background: C.black }}>
        {SCENES.map(([key, Scene]) => {
          const sc = TL.scenes[key];
          return t >= sc.start - PRE && t < sc.end + POST ? <Scene key={key} /> : null;
        })}
        <Vignette />
        <Captions />
      </AbsoluteFill>
    </Fonts>
  );
};
