import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FACES: [string, string, string, string][] = [
  // family, file, weight range, style
  ["Playfair Display", "PlayfairDisplay.ttf", "400 900", "normal"],
  ["Playfair Display", "PlayfairDisplay-Italic.ttf", "400 900", "italic"],
  ["Newsreader", "Newsreader.ttf", "200 800", "normal"],
  ["Newsreader", "Newsreader-Italic.ttf", "200 800", "italic"],
  ["Inter", "Inter.ttf", "100 900", "normal"],
  ["Oswald", "Oswald.ttf", "200 700", "normal"],
  ["Anton", "Anton-Regular.ttf", "400", "normal"],
  ["JetBrains Mono", "JetBrainsMono.ttf", "100 800", "normal"],
  ["Special Elite", "SpecialElite-Regular.ttf", "400", "normal"],
  ["Permanent Marker", "PermanentMarker-Regular.ttf", "400", "normal"],
  ["UnifrakturCook", "UnifrakturCook-Bold.ttf", "700", "normal"],
];

/** Loads the bundled fonts (public/fonts) and holds the render until every face is ready. */
export const Fonts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(
      FACES.map(([family, file, weight, style]) => {
        const face = new FontFace(family, `url(${staticFile("fonts/" + file)})`, { weight, style });
        return face.load().then((f) => (document.fonts as unknown as { add: (x: FontFace) => void }).add(f));
      }),
    )
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        throw new Error("Font failed to load: " + err);
      });
  }, [handle]);
  return ready ? <>{children}</> : null;
};
