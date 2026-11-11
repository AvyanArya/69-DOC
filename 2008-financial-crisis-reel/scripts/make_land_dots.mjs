// Pre-compute a dot grid covering the world's land (Natural Earth 1:110m, public domain, via world-atlas).
// The <Globe> component draws the continents as dots, which is far cheaper than testing land per frame.
// usage: node scripts/make_land_dots.mjs
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { readFileSync, writeFileSync } from "node:fs";

const topo = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/land-110m.json", import.meta.url)));
const land = feature(topo, topo.objects.land);
const STEP = 1.7; // degrees of latitude between rows
const dots = [];
for (let lat = -58; lat <= 82; lat += STEP) {
  const n = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / STEP));
  const off = (Math.round((lat + 58) / STEP) % 2) * 0.5;
  for (let i = 0; i < n; i++) {
    const lon = -180 + ((i + off) * 360) / n;
    if (geoContains(land, [lon, lat])) dots.push([+lon.toFixed(2), +lat.toFixed(2)]);
  }
}
writeFileSync(new URL("../src/data/landDots.json", import.meta.url), JSON.stringify(dots));
console.log(dots.length, "land dots");
