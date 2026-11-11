import React, { useId } from "react";
import { Img, staticFile } from "remotion";
import { H, W } from "../theme";

const IW = 1296; // prepared photographs are 1296x2304 (20 % overscan around the 1080x1920 frame)
const IH = 2304;
const FIT = W / IW;

export type Cam = {
  /** 1 = the photograph exactly fills the frame */
  zoom?: number;
  x?: number;
  y?: number;
  rot?: number;
  /** depth-based lateral camera move, px of parallax between nearest and farthest point */
  truckX?: number;
  truckY?: number;
  /** depth-based push-in: near objects grow faster than far ones */
  dolly?: number;
  blur?: number;
  brightness?: number;
  saturate?: number;
  contrast?: number;
};

const Displace: React.FC<{ id: string; name: string; cam: Cam }> = ({ id, name, cam }) => {
  const { truckX = 0, truckY = 0, dolly = 0 } = cam;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <defs>
        <filter id={id} x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={staticFile(`img/${name}_map1.png`)} x={0} y={0} width={IW} height={IH} preserveAspectRatio="none" result="m1" />
          <feImage href={staticFile(`img/${name}_map2.png`)} x={0} y={0} width={IW} height={IH} preserveAspectRatio="none" result="m2" />
          <feDisplacementMap in="SourceGraphic" in2="m1" scale={truckX} xChannelSelector="R" yChannelSelector="G" result="a" />
          <feDisplacementMap in="a" in2="m1" scale={truckY} xChannelSelector="G" yChannelSelector="R" result="b" />
          <feDisplacementMap in="b" in2="m2" scale={-dolly} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
};

const cssFilter = (cam: Cam) => {
  const f: string[] = [];
  if (cam.blur) f.push(`blur(${cam.blur}px)`);
  if (cam.brightness !== undefined && cam.brightness !== 1) f.push(`brightness(${cam.brightness})`);
  if (cam.contrast !== undefined && cam.contrast !== 1) f.push(`contrast(${cam.contrast})`);
  if (cam.saturate !== undefined && cam.saturate !== 1) f.push(`saturate(${cam.saturate})`);
  return f.length ? f.join(" ") : undefined;
};

const frame = (cam: Cam): React.CSSProperties => ({
  position: "absolute",
  left: (W - IW) / 2,
  top: (H - IH) / 2,
  width: IW,
  height: IH,
  transformOrigin: "50% 50%",
  transform: `translate(${cam.x ?? 0}px, ${cam.y ?? 0}px) rotate(${cam.rot ?? 0}deg) scale(${(cam.zoom ?? 1) * FIT})`,
});

/**
 * A still photograph given real camera movement. The depth map (Depth-Anything-V2) drives an SVG
 * displacement filter, so near objects move further than far ones when the camera trucks or pushes in.
 */
export const ParallaxPhoto: React.FC<{ name: string; cam: Cam; style?: React.CSSProperties }> = ({ name, cam, style }) => {
  const id = "px" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const moving = (cam.truckX ?? 0) !== 0 || (cam.truckY ?? 0) !== 0 || (cam.dolly ?? 0) !== 0;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      {moving ? <Displace id={id} name={name} cam={cam} /> : null}
      <div style={{ ...frame(cam), filter: cssFilter(cam) }}>
        <div style={{ width: IW, height: IH, filter: moving ? `url(#${id})` : undefined }}>
          <Img src={staticFile(`img/${name}.jpg`)} style={{ width: IW, height: IH, display: "block" }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Two-plane version for pictures with a clear foreground subject (cut out with the depth map, background
 * painted in behind it). The planes move independently, so the parallax is clean even for larger moves.
 */
export const ParallaxLayers: React.FC<{
  name: string;
  cam: Cam;
  /** extra foreground movement relative to the background */
  fg: { x?: number; y?: number; zoom?: number; blur?: number; brightness?: number };
  bgBlur?: number;
  style?: React.CSSProperties;
}> = ({ name, cam, fg, bgBlur = 0, style }) => {
  const id = "pl" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const moving = (cam.truckX ?? 0) !== 0 || (cam.truckY ?? 0) !== 0 || (cam.dolly ?? 0) !== 0;
  const fgCam: Cam = { ...cam, x: (cam.x ?? 0) + (fg.x ?? 0), y: (cam.y ?? 0) + (fg.y ?? 0), zoom: (cam.zoom ?? 1) * (fg.zoom ?? 1) };
  const fgFilter = [fg.blur ? `blur(${fg.blur}px)` : "", `brightness(${(cam.brightness ?? 1) * (fg.brightness ?? 1)})`].join(" ").trim();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      {moving ? <Displace id={id} name={`${name}_bg`} cam={cam} /> : null}
      <div style={{ ...frame(cam), filter: cssFilter({ ...cam, blur: (cam.blur ?? 0) + bgBlur }) }}>
        <div style={{ width: IW, height: IH, filter: moving ? `url(#${id})` : undefined }}>
          <Img src={staticFile(`img/${name}_bg.jpg`)} style={{ width: IW, height: IH, display: "block" }} />
        </div>
      </div>
      <div style={{ ...frame(fgCam), transformOrigin: "30% 85%", filter: fgFilter || undefined }}>
        <Img src={staticFile(`img/${name}_fg.webp`)} style={{ width: IW, height: IH, display: "block" }} />
      </div>
    </div>
  );
};
