/* Small helpers: local dates as YYYY-MM-DD strings, escaping, formatting. */
(function (RH) {
  'use strict';
  const pad = (n) => String(n).padStart(2, '0');
  const U = RH.util = {};

  U.iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  U.today = () => U.iso(new Date());
  U.parse = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  U.addDays = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
  // Whole days from a to b (negative if b is earlier).
  U.diff = (a, b) => {
    const x = a.split('-').map(Number), y = b.split('-').map(Number);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 864e5);
  };
  U.dow = (s) => (U.parse(s).getDay() + 6) % 7; // Monday = 0
  U.weekStart = (s) => U.addDays(s, -U.dow(s));
  U.fmt = (s, opts) => U.parse(s).toLocaleDateString('en-GB', opts || { weekday: 'short', day: 'numeric', month: 'short' });
  U.fmtLong = (s) => U.fmt(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  U.fmtShort = (s) => U.fmt(s, { day: 'numeric', month: 'short' });
  U.DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  U.plural = (n, word, many) => n + ' ' + (n === 1 ? word : (many || word + 's'));
  U.mins = (m) => {
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    return h + 'h' + (r ? ' ' + r + 'm' : '');
  };
  U.hours = (m) => (Math.round(m / 6) / 10) + 'h';
  U.pct = (x) => Math.round(x * 100) + '%';
  U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // Stable 0..1 pseudo-random number from a string, used to break ties without reshuffling plans.
  U.hash01 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
  // Clock times: "08:40" <-> minutes after midnight. Times past midnight (bed at 00:30) come back as 1470.
  U.tm = (s) => { if (typeof s === 'number') return s; const p = String(s || '0:0').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
  U.hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  U.dur = (m) => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? h + 'h' + (r ? ' ' + pad(r) : '') : r + 'm'; };
  U.countdown = (days) => days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 0 ? U.plural(-days, 'day') + ' ago' : 'in ' + U.plural(days, 'day');
})(window.RH = window.RH || {});
