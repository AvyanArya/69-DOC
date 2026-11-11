/** Small, dependency-free animation helpers. Everything is a pure function of time in seconds. */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Normalised progress of t between a and b (0 before, 1 after). */
export const prog = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
/** 1 while a <= t < b, with soft in/out ramps. */
export const win = (t: number, a: number, b: number, fadeIn = 0.15, fadeOut = 0.15) =>
  Math.min(prog(t, a, a + fadeIn), 1 - prog(t, b - fadeOut, b));

export const E = {
  lin: (p: number) => p,
  inQuad: (p: number) => p * p,
  outQuad: (p: number) => 1 - (1 - p) * (1 - p),
  inOutQuad: (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  inCubic: (p: number) => p * p * p,
  outCubic: (p: number) => 1 - Math.pow(1 - p, 3),
  inOutCubic: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inQuart: (p: number) => p * p * p * p,
  outQuart: (p: number) => 1 - Math.pow(1 - p, 4),
  inOutQuart: (p: number) => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
  outQuint: (p: number) => 1 - Math.pow(1 - p, 5),
  inExpo: (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
  outExpo: (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inOutExpo: (p: number) =>
    p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
  outBack: (p: number, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  inBack: (p: number, s = 1.70158) => (s + 1) * p * p * p - s * p * p,
  /** Damped spring that settles on 1 – good for slams and stamps. */
  spring: (p: number, damping = 6, freq = 2.2) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-damping * p) * Math.cos(freq * Math.PI * 2 * p)),
};

/** Deterministic pseudo-random in [0,1) from a numeric seed. */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
export const rndRange = (seed: number, a: number, b: number) => a + rnd(seed) * (b - a);

/** Smooth 1-D value noise in [-1,1]; used for handheld drift, flicker and shake. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i + seed * 57.3), rnd(i + 1 + seed * 57.3), u) * 2 - 1;
};

/** Camera shake offset: `amp` px at time t, decaying from an impact at t0. */
export const shake = (t: number, t0: number, amp: number, decay = 5, freq = 34, seed = 1) => {
  const dt = t - t0;
  if (dt < 0) return { x: 0, y: 0, r: 0 };
  const k = amp * Math.exp(-decay * dt);
  return {
    x: k * noise1(dt * freq, seed),
    y: k * noise1(dt * freq + 91.7, seed + 3),
    r: k * 0.012 * noise1(dt * freq * 0.7 + 17.3, seed + 7),
  };
};

/** Handheld-style continuous drift (px). */
export const drift = (t: number, amp: number, speed = 0.35, seed = 0) => ({
  x: amp * (noise1(t * speed, seed) + 0.4 * noise1(t * speed * 2.7, seed + 11)),
  y: amp * (noise1(t * speed + 40, seed + 5) + 0.4 * noise1(t * speed * 2.3 + 9, seed + 17)),
});

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
