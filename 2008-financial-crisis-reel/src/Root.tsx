import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { Fonts } from "./Fonts";
import { FrontPage, WikinewsPage } from "./papers/FrontPage";
import { PAGE_H, PAGE_W, PAPERS, WIKI_H, WIKINEWS } from "./papers/specs";
import { Reel } from "./Reel";
import { TL } from "./lib/timeline";

/** Bake targets: one front page per frame (see scripts/bake_papers.sh). */
const FrontPages: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fonts>
      <AbsoluteFill>
        <FrontPage spec={PAPERS[Math.min(f, PAPERS.length - 1)]} />
      </AbsoluteFill>
    </Fonts>
  );
};
const WikinewsPages: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <WikinewsPage id={WIKINEWS[Math.min(f, WIKINEWS.length - 1)]} texture={(["c", "a", "b", "c", "a"] as const)[f % 5]} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1080} height={1920} />
    <Composition id="FrontPages" component={FrontPages} durationInFrames={PAPERS.length} fps={30} width={PAGE_W} height={PAGE_H} />
    <Composition id="WikinewsPages" component={WikinewsPages} durationInFrames={WIKINEWS.length} fps={30} width={PAGE_W} height={WIKI_H} />
  </>
);
