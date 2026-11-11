import data from "../data/timeline.json";

export type Word = { w: string; s: number; e: number };
type Scene = { start: number; end: number; voStart: number; voEnd: number; voFile: string };

export const TL = data as unknown as {
  fps: number;
  duration: number;
  durationInFrames: number;
  scenes: Record<string, Scene>;
  words: Record<string, Word[]>;
  captions: Record<string, { s: number; e: number; text: string; words: Word[] }[]>;
  cues: Record<string, number>;
};

/** Absolute time (seconds) of a named sync point. Throws on typos so a bad cue never fails silently. */
export const cue = (name: string): number => {
  const v = TL.cues[name];
  if (v === undefined) throw new Error(`Unknown cue "${name}"`);
  return v;
};

export const scene = (name: string): Scene => {
  const s = TL.scenes[name];
  if (!s) throw new Error(`Unknown scene "${name}"`);
  return s;
};
