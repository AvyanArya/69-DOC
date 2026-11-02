// Plain technical indicators over arrays of numbers. No dependencies.

export const last = (a) => a[a.length - 1];

export function sma(values, n) {
  if (values.length < n) return null;
  let s = 0;
  for (let i = values.length - n; i < values.length; i++) s += values[i];
  return s / n;
}

/** Full SMA line (null until enough data) - used for charts. */
export function smaLine(values, n) {
  const out = new Array(values.length).fill(null);
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    s += values[i];
    if (i >= n) s -= values[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

/** Return over the last n bars, as a fraction (0.12 = +12%). */
export function ret(values, n) {
  if (values.length <= n) return values.length > 1 ? last(values) / values[0] - 1 : 0;
  return last(values) / values[values.length - 1 - n] - 1;
}

export function rsi(values, n = 14) {
  if (values.length <= n) return 50;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

/** Average True Range. Uses highs/lows when present, else a close-to-close proxy. */
export function atr(c, h, l, n = 14) {
  if (c.length < 2) return 0;
  const trs = [];
  const hasHL = h && l && h.length === c.length;
  for (let i = 1; i < c.length; i++) {
    if (hasHL && h[i] != null && l[i] != null) {
      trs.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
    } else {
      trs.push(Math.abs(c[i] - c[i - 1]) * 1.25);
    }
  }
  const window = trs.slice(-n);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

/** Annualised volatility of daily returns over the last n bars. */
export function volatility(c, n = 63) {
  const slice = c.slice(-(n + 1));
  const rets = [];
  for (let i = 1; i < slice.length; i++) rets.push(Math.log(slice[i] / slice[i - 1]));
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

export function maxDrawdown(c, n = 126) {
  const slice = c.slice(-n);
  let peak = slice[0], mdd = 0;
  for (const x of slice) {
    peak = Math.max(peak, x);
    mdd = Math.min(mdd, x / peak - 1);
  }
  return mdd;
}

export function avg(values, n) {
  const s = values.slice(-n).filter((x) => x != null);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
}
