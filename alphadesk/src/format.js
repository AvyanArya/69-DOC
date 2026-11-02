export const money = (x, dp) => {
  if (x == null || Number.isNaN(x)) return '—';
  const d = dp ?? (Math.abs(x) >= 1000 ? 0 : Math.abs(x) < 1 ? 4 : 2);
  return x.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d });
};
export const price = (x) => {
  if (x == null || Number.isNaN(x)) return '—';
  const d = Math.abs(x) >= 1000 ? 2 : Math.abs(x) < 1 ? 4 : 2;
  return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
/** fraction -> "+12.3%" */
export const pct = (x, dp = 1) => (x == null || Number.isNaN(x) ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(dp)}%`);
/** already-percent number -> "+1.23%" */
export const pctRaw = (x, dp = 2) => (x == null || Number.isNaN(x) ? '—' : `${x >= 0 ? '+' : ''}${Number(x).toFixed(dp)}%`);
export const tone = (x) => (x == null ? '' : x > 0 ? 'up' : x < 0 ? 'down' : '');
export const compactNum = (x) => (x == null ? '—' : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(x));
export const ago = (iso) => {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const niceDate = (d = new Date()) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
