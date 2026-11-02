/* The bookshelf: every section of every subject as a worn textbook standing spine-out on an endless shelf.
   The active book turns in 3D to show its cover; opening it grows a sheet of paper out of the cover that becomes
   the section's lesson list, with the cover bleeding in as ink. One requestAnimationFrame loop drives the shelf,
   the Web Animations API drives the reveals. Book art is drawn here as SVG, so there are no image files. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;

  const COL = { physics: '#1F3FB0', maths: '#0E6B55', further: '#5B3AA8', economics: '#C8442A' };
  const ABBR = { physics: 'PHY', maths: 'MATHS', further: 'F.MATHS', economics: 'ECON' };
  const abbr = (sub) => ABBR[sub.id] || sub.tag || sub.name.slice(0, 4).toUpperCase();
  const INK = '#141414', CREAM = '#F1E9D6', VERM = '#E0522B';
  const SERIF = 'Newsreader, Georgia, serif', SANS = 'Inter, system-ui, sans-serif';
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)', SHEET_EASE = 'cubic-bezier(.76,0,.18,1)';
  const BLOBS = [[150, 330, 0], [340, 600, 120], [250, 120, 220], [90, 760, 300], [400, 250, 360], [260, 860, 420], [230, 470, 180]];

  // ---------- The books ----------
  function bookList(s) {
    const out = [];
    M.subjects.forEach(function (sub) {
      M.compsFor(s, sub, true).forEach(function (c, j) {
        out.push({ i: out.length, sub: sub, c: c, n: M.sectionNum(s, c), title: M.title(c.name), col: COL[sub.id] || sub.color || '#555', variant: (j + (sub.id === 'maths' ? 1 : sub.id === 'economics' ? 2 : 0)) % 3 });
      });
    });
    return out;
  }
  // Three print variants keep the shelf from looking uniform: colour cloth, cream board, ink board.
  function inks(b) {
    if (b.variant === 1) return { bg: CREAM, fg: INK, acc: b.col, alt: VERM };
    if (b.variant === 2) return { bg: INK, fg: CREAM, acc: b.col === '#1F3FB0' ? '#5E7DF0' : b.col, alt: VERM };
    return { bg: b.col, fg: CREAM, acc: INK, alt: VERM };
  }
  function rng(seed) { let x = (seed * 9301 + 49297) % 233280; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
  function wrap(text, max) {
    const lines = [];
    let cur = '';
    text.split(' ').forEach(function (w) { if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) lines.push(cur);
    return lines;
  }

  function spineSVG(b) {
    const k = inks(b), len = b.title.length * 44 * 0.47;
    const motif = {
      physics: '<circle cx="71" cy="176" r="20" fill="none" stroke="' + k.fg + '" stroke-width="3"/><circle cx="71" cy="176" r="6" fill="' + k.alt + '"/>',
      maths: '<path d="M47 196 Q71 140 95 196" fill="none" stroke="' + k.fg + '" stroke-width="3"/><circle cx="71" cy="168" r="5" fill="' + k.alt + '"/>',
      further: '<path d="M71 176 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12 a16 16 0 1 1 16 16" fill="none" stroke="' + k.fg + '" stroke-width="3"/>',
      economics: '<path d="M50 156 L92 198 M50 198 L92 156" stroke="' + k.fg + '" stroke-width="3"/><circle cx="71" cy="177" r="5" fill="' + k.alt + '"/>'
    }[b.sub.id] || '<circle cx="71" cy="176" r="18" fill="none" stroke="' + k.fg + '" stroke-width="3"/><circle cx="71" cy="176" r="6" fill="' + k.alt + '"/>';
    return '<svg viewBox="0 0 142 840" aria-hidden="true"><rect width="142" height="840" fill="' + k.bg + '"/>' +
      '<rect width="9" height="840" fill="#000" opacity=".13"/><rect x="133" width="9" height="840" fill="#000" opacity=".2"/>' +
      '<rect y="30" width="142" height="3" fill="' + k.fg + '" opacity=".85"/><rect y="806" width="142" height="3" fill="' + k.fg + '" opacity=".85"/>' +
      '<rect x="41" y="56" width="60" height="60" fill="none" stroke="' + k.fg + '" stroke-width="2"/><text x="71" y="98" text-anchor="middle" font-family="' + SERIF + '" font-size="32" fill="' + k.fg + '">' + esc(b.n) + '</text>' + motif +
      '<text transform="translate(56 232) rotate(90)" font-family="' + SERIF + '" font-size="44" fill="' + k.fg + '"' + (len > 500 ? ' textLength="500" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(b.title) + '</text>' +
      '<text x="71" y="772" text-anchor="middle" font-family="' + SANS + '" font-weight="700" font-size="' + (abbr(b.sub).length > 5 ? 15 : 19) + '" letter-spacing="2" fill="' + k.fg + '">' + esc(abbr(b.sub)) + '</text></svg>';
  }

  function illustration(b, k, w, h) {
    const r = rng(b.i + 3), P = k.acc === INK ? CREAM : k.acc, A = k.alt, F = k.fg;
    let g = '';
    if (b.sub.id === 'physics') {
      const cx = w * (0.3 + r() * 0.4), cy = h * 0.45, R = Math.min(w, h) * 0.18;
      for (let i = 4; i >= 1; i--) g += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (R + i * 34) + '" ry="' + (R * 0.55 + i * 20) + '" fill="none" stroke="' + F + '" stroke-width="2" opacity="' + (0.35 + 0.15 * i) + '" transform="rotate(' + (-18 + r() * 10) + ' ' + cx + ' ' + cy + ')"/>';
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + A + '"/>';
      for (let i = 0; i < 4; i++) g += '<circle cx="' + (cx + Math.cos(i * 1.7 + r()) * (R + 34 + i * 34)) + '" cy="' + (cy + Math.sin(i * 1.7) * (R * 0.55 + 20 + i * 20)) + '" r="' + (6 + r() * 6) + '" fill="' + F + '"/>';
      let d = 'M0 ' + (h * 0.88);
      const f = 2 + Math.floor(r() * 3);
      for (let x = 0; x <= w; x += 6) d += ' L' + x + ' ' + (h * 0.88 + Math.sin(x / w * Math.PI * 2 * f) * 18).toFixed(1);
      g += '<path d="' + d + '" fill="none" stroke="' + P + '" stroke-width="5"/>';
    } else if (b.sub.id === 'maths') {
      for (let x = 0; x <= w; x += 34) g += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '" stroke="' + F + '" stroke-width="1" opacity=".22"/>';
      for (let y = 0; y <= h; y += 34) g += '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="' + F + '" stroke-width="1" opacity=".22"/>';
      const a = 0.004 + r() * 0.006, vx = w * (0.35 + r() * 0.3), vy = h * (0.75 + r() * 0.15);
      let d = '';
      for (let x = 0; x <= w; x += 6) { const y = vy - a * (x - vx) * (x - vx) * -1 - 0; const yy = Math.max(-20, vy - (h * 0.7) + a * (x - vx) * (x - vx)); d += (d ? ' L' : 'M') + x + ' ' + yy.toFixed(1); }
      g += '<path d="' + d + '" fill="none" stroke="' + P + '" stroke-width="6"/>';
      const tx = vx + w * 0.22, ty = vy - h * 0.7 + a * (tx - vx) * (tx - vx), m = 2 * a * (tx - vx);
      g += '<line x1="' + (tx - 160) + '" y1="' + (ty - 160 * m) + '" x2="' + (tx + 160) + '" y2="' + (ty + 160 * m) + '" stroke="' + A + '" stroke-width="4"/><circle cx="' + tx + '" cy="' + ty + '" r="10" fill="' + F + '"/>';
      g += '<rect x="' + (w * 0.08) + '" y="' + (h * 0.62) + '" width="' + (w * 0.22) + '" height="' + (w * 0.22) + '" fill="' + A + '" opacity=".9"/>';
    } else if (b.sub.id === 'further') {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38, n = 5 + Math.floor(r() * 4);
      let d = '';
      for (let t = 0; t < 26; t += 0.15) { const rr = 4 + t * R / 26; d += (d ? ' L' : 'M') + (cx + Math.cos(t) * rr).toFixed(1) + ' ' + (cy + Math.sin(t) * rr).toFixed(1); }
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + F + '" stroke-width="2" opacity=".5"/><path d="' + d + '" fill="none" stroke="' + P + '" stroke-width="4"/>';
      let poly = '';
      for (let i = 0; i < n; i++) { const x = cx + Math.cos(i * 2 * Math.PI / n - Math.PI / 2) * R, y = cy + Math.sin(i * 2 * Math.PI / n - Math.PI / 2) * R; poly += x.toFixed(1) + ',' + y.toFixed(1) + ' '; g += '<circle cx="' + x + '" cy="' + y + '" r="9" fill="' + A + '"/>'; }
      g = '<polygon points="' + poly + '" fill="none" stroke="' + F + '" stroke-width="2"/>' + g;
      g += '<line x1="0" y1="' + cy + '" x2="' + w + '" y2="' + cy + '" stroke="' + F + '" stroke-width="1.5" opacity=".5"/><line x1="' + cx + '" y1="0" x2="' + cx + '" y2="' + h + '" stroke="' + F + '" stroke-width="1.5" opacity=".5"/>';
    } else if (b.sub.id === 'chemistry') {
      for (let i = 0; i < 5; i++) {
        const cx = w * (0.18 + 0.16 * i + (i % 2 ? 0 : 0.02)), cy = h * (i % 2 ? 0.62 : 0.38), R = Math.min(w, h) * (0.1 + r() * 0.05); let d = '';
        for (let j = 0; j <= 6; j++) { const a = Math.PI / 3 * j + Math.PI / 6; d += (j ? ' L' : 'M') + (cx + Math.cos(a) * R).toFixed(1) + ' ' + (cy + Math.sin(a) * R).toFixed(1); }
        g += '<path d="' + d + '" fill="none" stroke="' + (i % 2 ? A : F) + '" stroke-width="4"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (R * 0.5) + '" fill="none" stroke="' + P + '" stroke-width="3"/>';
      }
    } else if (b.sub.id === 'biology') {
      let d1 = '', d2 = '';
      for (let y = 0; y <= h; y += 6) { const x = w / 2 + Math.sin(y / h * Math.PI * 4) * w * 0.28, x2 = w / 2 - Math.sin(y / h * Math.PI * 4) * w * 0.28; d1 += (y ? ' L' : 'M') + x.toFixed(1) + ' ' + y; d2 += (y ? ' L' : 'M') + x2.toFixed(1) + ' ' + y; }
      for (let y = 10; y < h; y += 22) { const x = w / 2 + Math.sin(y / h * Math.PI * 4) * w * 0.28, x2 = w / 2 - Math.sin(y / h * Math.PI * 4) * w * 0.28; g += '<line x1="' + x + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + (y % 44 < 22 ? A : P) + '" stroke-width="4"/>'; }
      g += '<path d="' + d1 + '" fill="none" stroke="' + F + '" stroke-width="5"/><path d="' + d2 + '" fill="none" stroke="' + F + '" stroke-width="5"/>';
    } else if (b.sub.id === 'compsci') {
      for (let i = 0; i < 7; i++) { const y = h * (0.1 + i * 0.13); g += '<path d="M0 ' + y + ' H' + (w * (0.3 + r() * 0.4)) + ' V' + (y + 20) + ' H' + w + '" fill="none" stroke="' + (i % 3 ? F : A) + '" stroke-width="3"/>'; g += '<circle cx="' + (w * (0.3 + r() * 0.4)) + '" cy="' + y + '" r="6" fill="' + P + '"/>'; }
      g += '<rect x="' + (w * 0.35) + '" y="' + (h * 0.35) + '" width="' + (w * 0.3) + '" height="' + (h * 0.3) + '" fill="' + A + '"/>';
    } else if (b.sub.id === 'geography') {
      const cx = w * (0.4 + r() * 0.2), cy = h * 0.5;
      for (let i = 7; i >= 1; i--) { let d = ''; for (let a = 0; a <= 6.3; a += 0.2) { const rr = i * Math.min(w, h) * 0.065 * (1 + 0.18 * Math.sin(a * 3 + i)); d += (a ? ' L' : 'M') + (cx + Math.cos(a) * rr * 1.3).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } g += '<path d="' + d + 'Z" fill="' + (i === 1 ? A : 'none') + '" stroke="' + (i % 2 ? F : P) + '" stroke-width="3"/>'; }
    } else if (b.sub.id !== 'economics') {
      for (let i = 0; i < 6; i++) { const cx = w * (0.2 + r() * 0.6), cy = h * (0.2 + r() * 0.6), R = Math.min(w, h) * (0.1 + r() * 0.18); g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + (i % 3 === 0 ? A : 'none') + '" stroke="' + (i % 2 ? F : P) + '" stroke-width="4" opacity="' + (i % 3 === 0 ? 0.85 : 1) + '"/>'; }
    } else {
      const ox = 30, oy = h - 26, ex = w * (0.42 + r() * 0.16), ey = h * (0.38 + r() * 0.16);
      g += '<polygon points="' + ox + ',' + (h * 0.12) + ' ' + ex + ',' + ey + ' ' + ox + ',' + ey + '" fill="' + P + '" opacity=".85"/>';
      g += '<line x1="' + ox + '" y1="10" x2="' + ox + '" y2="' + oy + '" stroke="' + F + '" stroke-width="3"/><line x1="' + ox + '" y1="' + oy + '" x2="' + (w - 10) + '" y2="' + oy + '" stroke="' + F + '" stroke-width="3"/>';
      g += '<line x1="' + ox + '" y1="' + (h * 0.12) + '" x2="' + (w - 20) + '" y2="' + (h * 0.82) + '" stroke="' + F + '" stroke-width="5"/>';
      g += '<line x1="' + (ox + 20) + '" y1="' + (h * 0.8) + '" x2="' + (w - 30) + '" y2="' + (h * 0.08) + '" stroke="' + A + '" stroke-width="5"/>';
      g += '<line x1="' + ex + '" y1="' + ey + '" x2="' + ex + '" y2="' + oy + '" stroke="' + F + '" stroke-width="2" stroke-dasharray="8 7"/><circle cx="' + ex + '" cy="' + ey + '" r="11" fill="' + F + '"/>';
      for (let i = 0; i < 4; i++) { const bh = 30 + r() * 70; g += '<rect x="' + (w - 150 + i * 30) + '" y="' + (oy - bh) + '" width="20" height="' + bh + '" fill="' + F + '" opacity=".75"/>'; }
    }
    return g;
  }

  // The cover's contents in a 474 × 900 box: reused on the book and as the detail poster.
  function coverInner(b) {
    const k = inks(b);
    let lines = wrap(b.title.toUpperCase(), 12), fs = 54, lh = 58;
    if (lines.length > 3) { lines = wrap(b.title.toUpperCase(), 16); fs = 40; lh = 44; }
    const ty = 186, iy = ty + lines.length * lh + 6, ih = 790 - iy;
    const lessons = b.c.topics.length;
    return '<rect width="474" height="900" fill="' + k.bg + '"/><rect width="12" height="900" fill="#000" opacity=".12"/>' +
      '<text x="36" y="56" font-family="' + SANS + '" font-weight="600" font-size="13" letter-spacing="3" fill="' + k.fg + '">PREPPR · A LEVEL</text>' +
      '<text x="440" y="56" text-anchor="end" font-family="' + SANS + '" font-weight="600" font-size="13" letter-spacing="2" fill="' + k.fg + '">' + esc(b.sub.spec) + '</text>' +
      '<rect x="36" y="72" width="404" height="2" fill="' + k.fg + '"/>' +
      '<text x="36" y="108" font-family="' + SANS + '" font-weight="700" font-size="15" letter-spacing="3" fill="' + (k.acc === INK ? CREAM : k.acc) + '">' + esc(b.sub.name.toUpperCase()) + '</text>' +
      '<text x="440" y="108" text-anchor="end" font-family="' + SERIF + '" font-style="italic" font-size="18" fill="' + k.fg + '">Section ' + esc(b.n) + '</text>' +
      lines.map((l, i) => '<text x="34" y="' + (ty + i * lh) + '" font-family="' + SERIF + '" font-size="' + fs + '" letter-spacing="-1" fill="' + k.fg + '"' + (l.length * fs * 0.64 > 404 ? ' textLength="404" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(l) + '</text>').join('') +
      '<svg x="36" y="' + iy + '" width="402" height="' + ih + '" viewBox="0 0 402 ' + ih + '">' + illustration(b, k, 402, ih) + '</svg>' +
      '<rect x="36" y="808" width="404" height="2" fill="' + k.fg + '"/>' +
      '<text x="36" y="852" font-family="' + SANS + '" font-weight="600" font-size="14" letter-spacing="2" fill="' + k.fg + '">' + lessons + ' LESSON' + (lessons === 1 ? '' : 'S') + '</text>' +
      '<rect x="356" y="830" width="84" height="32" fill="none" stroke="' + k.fg + '" stroke-width="2"/><text x="398" y="852" text-anchor="middle" font-family="' + SANS + '" font-weight="700" font-size="14" letter-spacing="2" fill="' + k.fg + '">A LVL</text>';
  }

  // ---------- Page ----------
  let books = [], N = 0;
  let s = null, T = null, active = -1;
  function startIndex(s0) {
    const today = U.today();
    const sess = s0.plan.sessions.find((x) => x.d >= today && !x.done && x.t && M.topic[x.t]);
    const comp = sess ? M.topic[sess.t].comp : null;
    const i = comp ? books.findIndex((b) => b.c === comp) : -1;
    return i < 0 ? 0 : i;
  }
  function done(b) { return M.courseProgress(st(), b.c.topics); }

  V.study = function () {
    const s0 = st();
    books = bookList(s0); N = books.length;
    if (T == null || T >= N * 4 || T <= -N * 4) { T = s = startIndex(s0); }
    const all = M.activeTopics(s0), p = M.courseProgress(s0, all);
    let html = '<div class="shelf-hero" id="shelf" tabindex="-1">';
    html += '<div class="sh-top"><a class="sh-lbl sh-box" href="#subjects">List view</a><span class="sh-lbl">' + p.done + ' of ' + p.total + ' lessons done</span></div>';
    html += '<nav class="sh-tabs" aria-label="Subjects"><span class="sh-ind" aria-hidden="true"></span>' +
      [['all', 'All']].concat(M.subjects.map((x) => [x.id, x.name])).map((t) => '<button type="button" class="sh-lbl sh-tab" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>').join('') + '</nav>';
    html += '<section class="sh-shelf" aria-label="Textbook shelf"><div class="sh-stage">' + books.map((b) =>
      '<div class="bk" data-v="' + b.i + '" role="button" tabindex="-1" aria-label="' + esc(b.sub.name + ', section ' + b.n + ': ' + b.title) + '"><div class="bk-f sp">' + spineSVG(b) + '</div><div class="bk-f cv">' + '<svg viewBox="0 0 474 900" aria-hidden="true">' + coverInner(b) + '</svg></div></div>').join('') + '</div></section>';
    html += '<button type="button" class="sh-play" aria-label="Open this book"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5 L10.5 6 L3 10.5Z"/></svg></button>';
    html += '<div class="sh-cap" aria-live="polite"><div class="sh-m sh-mt"></div><div class="sh-m sh-ms"></div><div class="sh-m sh-mm"></div></div>';
    html += '<button type="button" class="sh-arrow prev" aria-label="Previous book"><svg viewBox="0 0 18 10" aria-hidden="true"><path d="M5 1 L1 5 L5 9 M1 5 H17"/></svg></button><button type="button" class="sh-arrow next" aria-label="Next book"><svg viewBox="0 0 18 10" aria-hidden="true"><path d="M13 1 L17 5 L13 9 M17 5 H1"/></svg></button>';
    html += '<div class="sh-foot"><span class="sh-lbl">Scroll, drag or use ← → to browse · Enter to open</span><span class="sh-lbl"><a href="#guide">How to revise</a> / <a href="#library">Resources</a></span></div>';
    html += '<div class="sh-grain" aria-hidden="true"></div><span class="sh-probe" aria-hidden="true"></span>';
    html += '<div class="sh-cur" aria-hidden="true"><span class="sh-ring"></span><span class="sh-dot"></span><span class="sh-open">Open</span></div>';
    html += '<div class="sh-detail" role="dialog" aria-modal="true" aria-labelledby="shd-title"><button type="button" class="sh-lbl sh-box sh-close">Close</button><div class="shd-grid"><div class="shd-text"></div><div class="shd-poster"><svg viewBox="0 0 474 900" aria-hidden="true"><defs>' +
      '<filter id="sh-inkf" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="120" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<mask id="sh-ink" maskUnits="userSpaceOnUse" x="-200" y="-200" width="874" height="1300"><g filter="url(#sh-inkf)">' + BLOBS.map((b) => '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="0" fill="#fff"/>').join('') + '</g></mask></defs><g mask="url(#sh-ink)" class="shd-art"></g></svg></div></div></div>';
    return html + '</div>';
  };

  // ---------- Engine ----------
  let root = null, stage = null, tapes = [], raf = 0, last = 0;
  let H = 0, ws = 0, dd = 0, gap = 0, VW = 0;
  let mx = -1e4, my = -1e4, cx = -1e4, cy = -1e4, tiltX = 0, tiltY = 0, onCover = false, isOpen = false;
  let hover = -1, dragging = false, drag = null, suppress = false, wheelT = 0, curIn = false;
  const lifts = [];
  const sm = (x) => x * x * (3 - 2 * x);
  const mod = (a, n) => ((a % n) + n) % n;
  const Bf = (r) => Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : (r > 0 ? 0.5 : -0.5);
  const Fx = (r) => r * (ws + gap) + (dd - ws + 1.6 * gap) * Bf(r);
  const rel = (v) => mod(v - s + N / 2, N) - N / 2;

  function measure() {
    const probe = root.querySelector('.sh-probe');
    H = probe.getBoundingClientRect().height;
    ws = H * 142 / 840; dd = H * 474 / 900; gap = H * 0.03;
    stage.style.setProperty('--ws', ws + 'px');
    stage.style.setProperty('--d', dd + 'px');
    stage.style.setProperty('--h', H + 'px');
    VW = root.clientWidth;
  }
  function centre() { const r = root.querySelector('.sh-shelf').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  // Caption: each line slides through its mask.
  function swap(mask, html, dir) {
    const span = document.createElement('span');
    span.innerHTML = html;
    const old = Array.prototype.filter.call(mask.children, (x) => !x.dataset.leaving);
    mask.appendChild(span);
    if (reduce() || !old.length) { old.forEach((x) => x.remove()); return; }
    span.animate([{ transform: 'translateY(' + dir * 105 + '%)' }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE, fill: 'both' });
    old.forEach(function (x) {
      x.dataset.leaving = '1';
      const cur = getComputedStyle(x).transform;
      x.animate([{ transform: cur === 'none' ? 'translateY(0)' : cur }, { transform: 'translateY(' + (-dir * 105) + '%)' }], { duration: 650, easing: EASE, fill: 'both' }).onfinish = () => x.remove();
    });
  }
  function setActive(i, dir) {
    active = i;
    const b = books[i], p = done(b);
    swap(root.querySelector('.sh-mt'), esc(b.title), dir);
    swap(root.querySelector('.sh-ms'), '<span style="color:' + b.col + '">' + esc(b.sub.name) + ' / Section ' + esc(b.n) + '</span>', dir);
    swap(root.querySelector('.sh-mm'), U.plural(b.c.topics.length, 'lesson') + ' · ' + p.done + ' done · ' + b.c.papers.map((x) => esc(b.sub.paper[x].code)).join(', '), dir);
    const tab = root.querySelector('.sh-tab[data-tab="' + b.sub.id + '"]'), ind = root.querySelector('.sh-ind');
    root.querySelectorAll('.sh-tab').forEach((t) => t.classList.toggle('on', t === tab));
    ind.style.width = tab.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    ind.style.background = b.col;
  }

  function frame(now) {
    if (!root || !document.body.contains(root)) { unmount(); return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const rm = reduce();
    const k = dragging ? 18 : 5.2;
    s = rm ? T : s + (T - s) * (1 - Math.exp(-k * dt));
    if (Math.abs(T - s) < 1e-4) s = T;
    if (Math.abs(s) > N * 4) { const sh = Math.round(s / N) * N; s -= sh; T -= sh; }
    const a = mod(Math.round(s), N);
    if (a !== active) setActive(a, Math.sign(T - s) || 1);

    const c = centre(), rr = root.getBoundingClientRect();
    cx += (mx - cx) * (1 - Math.exp(-16 * dt)); cy += (my - cy) * (1 - Math.exp(-16 * dt));
    onCover = !isOpen && Math.abs(mx - c.x) < 0.55 * dd && Math.abs(my - c.y) < 0.55 * H && Math.abs(T - s) < 0.3;
    const tyT = onCover ? (mx - c.x) / (0.55 * dd) * 9 : (mx - c.x) / (VW || 1) * 5;
    const txT = onCover ? -(my - c.y) / (H / 2) * 6 : 0;
    tiltY += (Math.max(-12, Math.min(12, tyT)) - tiltY) * (1 - Math.exp(-7 * dt));
    tiltX += (txT - tiltX) * (1 - Math.exp(-7 * dt));

    const lim = VW / 2 + 1.5 * dd;
    for (let j = 0; j < tapes.length; j++) {
      const el = tapes[j], r = rel(j), x = Fx(r);
      if (Math.abs(x) > lim) { if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'; continue; }
      if (el.style.visibility) el.style.visibility = '';
      const o = sm(Math.max(0, 1 - Math.abs(r)));
      const want = hover === j && Math.abs(r) > 0.5 ? 1 : 0;
      lifts[j] = rm ? want : (lifts[j] || 0) + (want - (lifts[j] || 0)) * (1 - Math.exp(-12 * dt));
      const y = -o * 0.025 * H - lifts[j] * 0.045 * H;
      el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,' + (o * 0.2 * H).toFixed(2) + 'px) rotateZ(' + (-4.5 * o).toFixed(3) + 'deg) rotateX(' + (tiltX * o).toFixed(3) + 'deg) rotateY(' + (-90 * o + tiltY * o).toFixed(3) + 'deg)';
      el.style.zIndex = Math.round(100 - Math.abs(r) * 4);
      el.style.setProperty('--ss', (o * 0.55).toFixed(3));
      el.style.setProperty('--cs', ((1 - o) * 0.5).toFixed(3));
    }
    const play = root.querySelector('.sh-play');
    const ps = isOpen ? 0 : sm(Math.max(0, 1 - Math.abs(T - s) * 3));
    play.style.transform = 'translate(' + (c.x - rr.left - 0.5 * dd - 6 - 21) + 'px,' + (c.y - rr.top + 0.36 * H - 21) + 'px) scale(' + ps.toFixed(3) + ')';

    const cur = root.querySelector('.sh-cur');
    cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
    const overTape = !isOpen && hover >= 0 && Math.abs(rel(hover)) > 0.5;
    cur.classList.toggle('open', onCover);
    cur.classList.toggle('spine', !onCover && overTape);
  }

  function go(t) { T = t; }
  function jumpTo(i) { const c = Math.round(T); go(c + mod(i - mod(c, N) + N / 2, N) - N / 2); }

  // ---------- Opening a book ----------
  function activeTape() { return tapes[mod(Math.round(T), N)]; }
  function openDetail() {
    if (isOpen) return;
    T = Math.round(T);
    const b = books[mod(T, N)], s0 = st(), p = done(b), nx = M.nextLesson(s0, b.sub, b.c.topics);
    const det = root.querySelector('.sh-detail');
    det.style.setProperty('--bk', b.col);
    const lines = [
      '<p class="sh-lbl" style="color:' + b.col + '">' + esc(b.sub.name) + ' / Section ' + esc(b.n) + '</p>',
      '<h2 id="shd-title">' + esc(b.title) + '</h2>',
      '<p class="sh-lbl shd-meta">' + U.plural(b.c.topics.length, 'lesson') + ' / ' + p.done + ' done / ' + b.c.papers.map((x) => esc(b.sub.paper[x].code)).join(', ') + '</p>'
    ].concat(b.c.topics.map((t) => '<a class="shd-l" href="#t-' + t.gid + '">' + V.statusIcon(s0, t) + '<span class="num">' + M.lessonNum(s0, t) + '</span><span>' + esc(M.title(t.name)) + '</span></a>'))
      .concat(['<p class="shd-credit">' + esc(b.sub.board) + ' ' + esc(b.sub.spec) + ' · work through it in order, one lesson at a time.</p>',
        '<div class="shd-acts">' + (nx ? '<a class="sh-lbl sh-btn" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': lesson ' + M.lessonNum(s0, nx) + '</a>' : '') + '<a class="sh-lbl sh-box" href="#c-' + b.c.gid + '">Section page</a></div>']);
    det.querySelector('.shd-text').innerHTML = lines.map((l) => '<div class="shd-m"><div class="shd-r">' + l + '</div></div>').join('');
    det.querySelector('.shd-art').innerHTML = coverInner(b);
    const circles = det.querySelectorAll('mask circle');
    circles.forEach((c) => c.setAttribute('r', 0));
    const rect = activeTape().querySelector('.cv').getBoundingClientRect();
    isOpen = true;
    det.style.visibility = 'visible';
    det.style.transformOrigin = (rect.left + rect.width / 2) + 'px ' + (rect.top + rect.height / 2) + 'px';
    const rm = reduce();
    det.getAnimations().forEach((x) => x.cancel());
    det.animate([{ clipPath: inset(rect) + ' round 3px)', transform: 'rotate(-4.5deg)' }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' }], { duration: rm ? 1 : 1050, easing: SHEET_EASE, fill: 'both' });
    det.querySelectorAll('.shd-r').forEach((x, i) => x.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: rm ? 1 : 900, delay: rm ? 0 : 620 + i * 75, easing: EASE, fill: 'both' }));
    const t0 = performance.now() + (rm ? -5000 : 520);
    (function ink(now) {
      const t = now - t0;
      circles.forEach(function (c, i) { const q = Math.max(0, Math.min(1, (t - BLOBS[i][2]) / 1250)); c.setAttribute('r', (720 * (1 - Math.pow(1 - q, 3))).toFixed(1)); });
      if (t < 2400 && isOpen) requestAnimationFrame(ink);
    })(performance.now());
    det.querySelector('.sh-close').focus({ preventScroll: true });
  }
  const inset = (r) => 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, window.innerWidth - r.right) + 'px ' + Math.max(0, window.innerHeight - r.bottom) + 'px ' + Math.max(0, r.left) + 'px';
  function closeDetail() {
    if (!isOpen) return;
    const det = root.querySelector('.sh-detail');
    const rect = activeTape().querySelector('.cv').getBoundingClientRect();
    isOpen = false;
    det.getAnimations().forEach((x) => { if (x.effect && x.effect.target === det) x.cancel(); });
    const an = det.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' }, { clipPath: inset(rect) + ' round 3px)', transform: 'rotate(-4.5deg)' }], { duration: reduce() ? 1 : 850, easing: SHEET_EASE, fill: 'both' });
    an.onfinish = function () { det.style.visibility = 'hidden'; det.getAnimations({ subtree: true }).forEach((x) => x.cancel()); };
    root.focus({ preventScroll: true });
  }

  // ---------- Mounting ----------
  function onKey(e) {
    if (!root || RH.c.modalOpen()) return;
    if (e.key === 'Escape' && isOpen) { closeDetail(); return; }
    if (isOpen || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') { go(Math.round(T) - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(Math.round(T) + 1); e.preventDefault(); }
    else if (e.key === 'Enter' && (document.activeElement === document.body || document.activeElement === root)) { openDetail(); e.preventDefault(); }
  }
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    if (drag && Math.abs(e.clientX - drag.x) > 5) dragging = true;
    if (dragging) T = drag.T - (e.clientX - drag.x) / (ws + gap);
  }
  function onUp() { if (dragging) { suppress = true; setTimeout(() => { suppress = false; }, 0); T = Math.round(T); } drag = null; dragging = false; }
  function onResize() { if (root) measure(); }

  function mount() {
    root = document.getElementById('shelf');
    stage = root.querySelector('.sh-stage');
    tapes = Array.prototype.slice.call(stage.querySelectorAll('.bk'));
    measure();
    active = -1; last = 0; isOpen = false;
    if (curIn) root.classList.add('cur-in');
    tapes.forEach(function (el, j) {
      el.addEventListener('pointerenter', () => { hover = j; });
      el.addEventListener('pointerleave', () => { if (hover === j) hover = -1; });
      el.addEventListener('click', function () {
        if (suppress) return;
        const r = rel(j);
        if (Math.abs(r) < 0.5) openDetail(); else go(Math.round(T + r));
      });
    });
    const shelf = root.querySelector('.sh-shelf');
    shelf.addEventListener('pointerdown', (e) => { if (e.button === 0 && !isOpen) drag = { x: e.clientX, T: T }; });
    shelf.addEventListener('wheel', function (e) {
      if (isOpen) return;
      e.preventDefault();
      const dlt = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      T += dlt / (ws + gap) * 0.5;
      clearTimeout(wheelT);
      wheelT = setTimeout(() => { T = Math.round(T); }, 160);
    }, { passive: false });
    root.addEventListener('pointerenter', () => { curIn = true; root.classList.add('cur-in'); });
    root.addEventListener('pointerleave', () => { curIn = false; root.classList.remove('cur-in'); });
    root.addEventListener('pointerover', (e) => { root.querySelector('.sh-cur').classList.toggle('btn', !!e.target.closest('button, a') && !e.target.closest('.bk')); });
    root.querySelector('.sh-arrow.prev').addEventListener('click', () => go(Math.round(T) - 1));
    root.querySelector('.sh-arrow.next').addEventListener('click', () => go(Math.round(T) + 1));
    root.querySelector('.sh-play').addEventListener('click', openDetail);
    root.querySelector('.sh-close').addEventListener('click', closeDetail);
    root.querySelectorAll('.sh-tab').forEach((t) => t.addEventListener('click', function () {
      const id = t.dataset.tab;
      jumpTo(id === 'all' ? 0 : books.findIndex((b) => b.sub.id === id));
    }));
    root.querySelector('.sh-detail').addEventListener('click', function (e) {
      const a = e.target.closest('a[href^="#t-"], a[href^="#c-"]');
      if (a) { isOpen = false; }
    });
    if (!SH.wired) {
      SH.wired = true;
      window.addEventListener('keydown', onKey);
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      window.addEventListener('resize', onResize);
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function unmount() { cancelAnimationFrame(raf); raf = 0; root = null; stage = null; tapes = []; hover = -1; isOpen = false; }
  const SH = RH.shelf = { mount: mount, open: () => openDetail(), close: () => closeDetail(), state: () => ({ s: s, T: T, active: active, isOpen: isOpen, N: N }), go: (t) => go(t) };

  // Preload nothing: the art is SVG. Mount whenever the shelf page is drawn.
  RH.afterRender.push(function (r) { if (typeof r !== 'string') return; if (r === 'study' && document.getElementById('shelf')) mount(); else if (root) unmount(); });
})(window.RH = window.RH || {});
