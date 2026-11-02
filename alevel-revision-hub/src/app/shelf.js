/* My Subjects: a shelf of textbooks, one subject at a time. Each chapter is a book standing spine-out on an
   endless shelf; the book in the middle turns to show its cover. Drag, scroll, use the arrows or ← →. Click the
   cover and the book comes off the shelf and opens: the cover swings over, a few pages turn and settle, and the
   chapter's lessons are on the right-hand page. Covers and spines are drawn here as SVG, so there are no images. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;

  const COL = { physics: '#2F5BD8', maths: '#0E8A6E', further: '#7A4FD0', economics: '#E0662F' };
  const ABBR = { physics: 'PHY', maths: 'MATHS', further: 'F.MATHS', economics: 'ECON' };
  const abbr = (sub) => ABBR[sub.id] || sub.tag || sub.name.slice(0, 4).toUpperCase();
  const INK = '#221B45', CREAM = '#FBF6EC', VERM = '#F08A5D';
  const SERIF = 'Onest, system-ui, sans-serif', SANS = 'Onest, system-ui, sans-serif';
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  // ---------- The books: the chapters of one subject ----------
  function curSub(s) {
    let id = RH.ui.shelfSub;
    if (!id || !M.subject[id] || !M.isMine(M.subject[id])) {
      const today = U.today(), sess = s.plan.sessions.find((x) => x.d >= today && !x.done && x.t && M.topic[x.t]);
      id = sess && M.isMine(M.topic[sess.t].subject) ? M.topic[sess.t].subject.id : M.subjects[0].id;
    }
    RH.ui.shelfSub = id;
    return M.subject[id];
  }
  function bookList(s) {
    const sub = curSub(s);
    return M.compsFor(s, sub, true).map((c, j) => ({ i: j, sub: sub, c: c, n: M.sectionNum(s, c), title: M.title(c.name), col: COL[sub.id] || sub.color || '#555', variant: j % 3 }));
  }
  // Three print variants keep the shelf from looking uniform: colour cloth, cream board, ink board.
  function inks(b) {
    if (b.variant === 1) return { bg: CREAM, fg: INK, acc: b.col, alt: VERM };
    if (b.variant === 2) return { bg: INK, fg: CREAM, acc: b.col, alt: VERM };
    return { bg: b.col, fg: CREAM, acc: INK, alt: '#FFD58A' };
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
      '<rect x="41" y="56" width="60" height="60" fill="none" stroke="' + k.fg + '" stroke-width="2"/><text x="71" y="98" text-anchor="middle" font-family="' + SERIF + '" font-weight="700" font-size="30" fill="' + k.fg + '">' + esc(b.n) + '</text>' + motif +
      '<text transform="translate(56 232) rotate(90)" font-family="' + SERIF + '" font-weight="600" font-size="40" fill="' + k.fg + '"' + (len > 500 ? ' textLength="500" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(b.title) + '</text>' +
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
      '<text x="440" y="108" text-anchor="end" font-family="' + SERIF + '" font-weight="600" font-size="16" fill="' + k.fg + '">Chapter ' + esc(b.n) + '</text>' +
      lines.map((l, i) => '<text x="34" y="' + (ty + i * lh) + '" font-family="' + SERIF + '" font-weight="700" font-size="' + fs + '" letter-spacing="-1.5" fill="' + k.fg + '"' + (l.length * fs * 0.64 > 404 ? ' textLength="404" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(l) + '</text>').join('') +
      '<svg x="36" y="' + iy + '" width="402" height="' + ih + '" viewBox="0 0 402 ' + ih + '">' + illustration(b, k, 402, ih) + '</svg>' +
      '<rect x="36" y="808" width="404" height="2" fill="' + k.fg + '"/>' +
      '<text x="36" y="852" font-family="' + SANS + '" font-weight="600" font-size="14" letter-spacing="2" fill="' + k.fg + '">' + lessons + ' LESSON' + (lessons === 1 ? '' : 'S') + '</text>' +
      '<rect x="356" y="830" width="84" height="32" fill="none" stroke="' + k.fg + '" stroke-width="2"/><text x="398" y="852" text-anchor="middle" font-family="' + SANS + '" font-weight="700" font-size="14" letter-spacing="2" fill="' + k.fg + '">A LVL</text>';
  }

  // ---------- Page ----------
  let books = [], N = 0;
  let s = null, T = null, active = -1, shownSub = null;
  function startIndex(s0) {
    const today = U.today();
    const sess = s0.plan.sessions.find((x) => x.d >= today && !x.done && x.t && M.topic[x.t] && M.topic[x.t].subject.id === RH.ui.shelfSub);
    const comp = sess ? M.topic[sess.t].comp : null;
    const i = comp ? books.findIndex((b) => b.c === comp) : -1;
    return i < 0 ? 0 : i;
  }
  function done(b) { return M.courseProgress(st(), b.c.topics); }

  V.study = function () {
    const s0 = st();
    books = bookList(s0); N = books.length;
    const sub = M.subject[RH.ui.shelfSub];
    if (shownSub !== sub.id || T == null || T >= N * 4 || T <= -N * 4) { T = s = startIndex(s0); shownSub = sub.id; }
    const p = M.courseProgress(s0, M.subjectTopics(s0, sub));
    let html = '<div class="shelf-hero" id="shelf" tabindex="-1" data-subj="' + sub.id + '">';
    html += '<nav class="sh-tabs" aria-label="Subjects">' + M.subjects.map((x) => '<button type="button" class="sh-tab' + (x.id === sub.id ? ' on' : '') + '" data-tab="' + x.id + '" data-subj="' + x.id + '" aria-pressed="' + (x.id === sub.id) + '">' + esc(x.name) + '</button>').join('') + '</nav>';
    html += '<p class="sh-sum"><b>' + esc(sub.name) + '</b> · ' + p.done + ' of ' + p.total + ' lessons done</p>';
    html += '<section class="sh-shelf" aria-label="' + esc(sub.name) + ' textbooks"><div class="sh-stage">' + books.map((b) =>
      '<div class="bk" data-v="' + b.i + '" role="button" tabindex="-1" aria-label="' + esc('Chapter ' + b.n + ': ' + b.title) + '"><div class="bk-f spn">' + spineSVG(b) + '</div><div class="bk-f cv">' + '<svg viewBox="0 0 474 900" aria-hidden="true">' + coverInner(b) + '</svg></div></div>').join('') + '</div><div class="sh-plank" aria-hidden="true"></div></section>';
    html += '<button type="button" class="sh-play" aria-label="Open this book"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5 L10.5 6 L3 10.5Z"/></svg></button>';
    html += '<div class="sh-cap" aria-live="polite"><div class="sh-m sh-ms"></div><div class="sh-m sh-mt"></div><div class="sh-m sh-mm"></div></div>';
    html += '<button type="button" class="sh-arrow prev" aria-label="Previous book">' + C.icon('left') + '</button><button type="button" class="sh-arrow next" aria-label="Next book">' + C.icon('right') + '</button>';
    html += '<span class="sh-probe" aria-hidden="true"></span>';
    html += '<div class="sh-cur" aria-hidden="true"><span class="sh-ring"></span><span class="sh-dot"></span><span class="sh-open">Open</span></div>';
    html += '<div class="book-stage" id="bookStage" hidden></div>';
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
    VW = root.clientWidth;
    ws = H * 142 / 840; dd = H * 474 / 900; gap = H * (VW < 700 ? 0.11 : 0.03);
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
    swap(root.querySelector('.sh-ms'), '<span style="color:' + b.col + '">Chapter ' + esc(b.n) + '</span>', dir);
    swap(root.querySelector('.sh-mm'), U.plural(b.c.topics.length, 'lesson') + (p.done ? ' · ' + p.done + ' done' : ''), dir);
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
    onCover = !isOpen && !BK.busy() && Math.abs(mx - c.x) < 0.55 * dd && Math.abs(my - c.y) < 0.55 * H && Math.abs(T - s) < 0.3;
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
  // The open book is a scene of its own: two pages, a cover and three leaves. Each piece is animated with the
  // Web Animations API, and the leaves settle in a stack on the left so nothing has to fade away.
  function activeTape() { return tapes[mod(Math.round(T), N)]; }
  function lessonsPage(b, s0) {
    return '<div class="ob-toc"><p class="ob-k">Contents</p><ol class="toc">' + b.c.topics.map((t) => '<li><a href="#t-' + t.gid + '">' + V.statusIcon(s0, t) + '<span class="toc-n num">' + esc(M.lessonNum(s0, t)) + '</span><span class="toc-t">' + esc(M.title(t.name)) + '</span></a></li>').join('') + '</ol></div>';
  }
  function insidePage(b, s0) {
    const p = done(b), nx = M.nextLesson(s0, b.sub, b.c.topics);
    return '<div class="ob-in"><p class="ob-k">' + esc(b.sub.name) + ' · Chapter ' + esc(b.n) + '</p><h2>' + esc(b.title) + '</h2>' +
      '<div class="ob-ring">' + C.ring(p.frac, '<b>' + p.done + '</b>/' + p.total, 84) + '<span>' + (p.done === p.total ? 'Every lesson done' : U.plural(p.total - p.done, 'lesson') + ' to go') + '</span></div>' +
      '<div class="ob-acts">' + (nx ? '<a class="btn block" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ' lesson ' + esc(M.lessonNum(s0, nx)) + C.icon('right') + '</a>' : '') + '<a class="btn alt block" href="#c-' + b.c.gid + '">Chapter page</a></div></div>';
  }
  const BK = { anims: [], open: false, busy: () => BK.open };
  function openDetail() {
    if (BK.open || !root) return;
    T = Math.round(T);
    const b = books[mod(T, N)], s0 = st(), stg = root.querySelector('#bookStage'), k = inks(b);
    const cover = '<svg viewBox="0 0 474 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + coverInner(b) + '</svg>';
    stg.innerHTML = '<div class="stage-bg" data-action="book-close"></div>' +
      '<div class="ob" style="--c:' + b.col + ';--cb:' + k.bg + '" role="dialog" aria-modal="true" aria-label="' + esc(b.title) + '">' +
      '<div class="ob-shadow"></div><span class="ob-edge"></span><div class="ob-page ob-left"></div><div class="ob-page ob-right"><div class="ob-mini">' + insidePage(b, s0) + '</div>' + lessonsPage(b, s0) + '</div>' +
      '<div class="ob-leaf l0"><div class="lf f"></div><div class="lf b"></div></div><div class="ob-leaf l1"><div class="lf f"></div><div class="lf b"></div></div>' +
      '<div class="ob-leaf l2"><div class="lf f"></div><div class="lf b">' + insidePage(b, s0) + '</div></div>' +
      '<div class="ob-cover"><div class="cf f">' + cover + '<i class="shade"></i></div><div class="cf b"><i class="shade"></i></div></div></div>' +
      '<button type="button" class="ob-x icon-btn" data-action="book-close" aria-label="Close the book">' + C.icon('x') + '</button>';
    stg.hidden = false;
    BK.open = true; isOpen = true;
    document.body.classList.add('book-open');
    const ob = stg.querySelector('.ob'), narrow = window.innerWidth < 760;
    ob.classList.toggle('one', narrow);
    const P = ob.querySelector('.ob-right').getBoundingClientRect().width;
    const box = ob.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const closedX = narrow ? 0 : -P / 2;
    const rest = 'translate(' + closedX + 'px, 0px) scale(1)';
    const r = activeTape().querySelector('.cv').getBoundingClientRect(), sc = r.width / P;
    const from = 'translate(' + (r.left + r.width / 2 - cx - (narrow ? 0 : sc * P / 2)) + 'px, ' + (r.top + r.height / 2 - cy) + 'px) scale(' + sc + ') rotate(-4deg)';
    activeTape().classList.add('lifted');
    BK.anims = [];
    if (reduce() || !ob.animate) { ob.classList.add('static'); return; }
    const E = 'cubic-bezier(.6,0,.2,1)', D = 1700;
    const anim = (el, frames, o) => { const a = el.animate(frames, Object.assign({ duration: D, easing: E, fill: 'both' }, o || {})); BK.anims.push(a); return a; };
    // 1. Off the shelf and into the middle, closed. 2. Slide right as it opens so the spread is centred.
    anim(ob, [{ transform: from }, { transform: rest, offset: 0.28 }, { transform: rest, offset: 0.36 }, { transform: 'translate(0px, 0px) scale(1)', offset: 0.8 }, { transform: 'translate(0px, 0px) scale(1)' }]);
    // The left-hand page only exists once the cover has swung past upright.
    anim(ob.querySelector('.ob-left'), [{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1, offset: 0.58 }, { opacity: 1 }], { easing: 'linear' });
    anim(ob.querySelector('.ob-shadow'), [{ opacity: 0 }, { opacity: 0.5, offset: 0.28 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }]);
    // The cover swings over first, then the three leaves, each a little later and settling slightly higher in the stack.
    // Stacking: the cover starts on top on the right and ends at the bottom of the pile on the left, under the pages.
    const swing = (z0, z1, a, b2) => [{ transform: 'rotateY(0deg) translateZ(' + z0 + 'px)' }, { transform: 'rotateY(0deg) translateZ(' + z0 + 'px)', offset: a }, { transform: 'rotateY(-92deg) translateZ(' + ((z0 - z1) / 2) + 'px) skewY(-2deg)', offset: (a + b2) / 2 }, { transform: 'rotateY(-180deg) translateZ(' + (-z1) + 'px)', offset: b2 }, { transform: 'rotateY(-180deg) translateZ(' + (-z1) + 'px)' }];
    anim(ob.querySelector('.ob-cover'), narrow ? [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(0deg)', opacity: 1, offset: 0.36 }, { transform: 'rotateY(-180deg)', opacity: 0, offset: 0.78 }, { transform: 'rotateY(-180deg)', opacity: 0 }] : swing(6, 0.5, 0.36, 0.76));
    ob.querySelectorAll('.ob-cover .shade').forEach((sh, i) => anim(sh, [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: i ? 0 : 0.5, offset: 0.56 }, { opacity: i ? 0.45 : 0, offset: 0.6 }, { opacity: 0, offset: 0.78 }, { opacity: 0 }]));
    ob.querySelectorAll('.ob-leaf').forEach(function (lf, i) {
      const st0 = 0.46 + i * 0.07, end = Math.min(0.97, 0.8 + i * 0.07);
      const fr = narrow
        ? [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(0deg)', opacity: 1, offset: st0 }, { transform: 'rotateY(-180deg)', opacity: 0, offset: end }, { transform: 'rotateY(-180deg)', opacity: 0 }]
        : swing(4.5 - 1.5 * i, 1.5 + 1.5 * i, st0, end);
      anim(lf, fr);
    });
    // The contents write themselves in, line by line.
    ob.querySelectorAll('.ob-toc li, .ob-toc .ob-k').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: D * 0.82 + i * 45, easing: EASE }));
    ob.querySelectorAll('.ob-in > *').forEach((x, i) => anim(x, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: D * 0.88 + i * 70, easing: EASE }));
    const first = ob.querySelector('.toc a');
    BK.anims[0].finished.then(() => { if (first && BK.open) first.focus({ preventScroll: true }); }).catch(() => {});
  }
  function closeDetail() {
    if (!BK.open || !root) return;
    const stg = root.querySelector('#bookStage');
    const fin = () => { stg.hidden = true; stg.innerHTML = ''; document.body.classList.remove('book-open'); tapes.forEach((t) => t.classList.remove('lifted')); BK.open = false; isOpen = false; if (root) root.focus({ preventScroll: true }); };
    BK.open = false;
    const main = BK.anims.filter((a) => (a.effect.getTiming().delay || 0) === 0);
    if (main.length && !reduce()) {
      BK.anims.forEach((a) => { if ((a.effect.getTiming().delay || 0) > 0) a.cancel(); });
      main.forEach((a) => { a.playbackRate = 1.7; a.reverse(); });
      main[0].finished.then(fin).catch(fin);
    } else fin();
  }

  // ---------- Mounting ----------
  function onKey(e) {
    if (!root || RH.c.modalOpen()) return;
    if (e.key === 'Escape' && BK.open) { closeDetail(); return; }
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
    root.querySelectorAll('.sh-tab').forEach((t) => t.addEventListener('click', function () {
      if (RH.ui.shelfSub === t.dataset.tab) return;
      RH.ui.shelfSub = t.dataset.tab;
      RH.render();
    }));
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
  function unmount() { cancelAnimationFrame(raf); raf = 0; root = null; stage = null; tapes = []; hover = -1; isOpen = false; BK.open = false; document.body.classList.remove('book-open'); }
  const SH = RH.shelf = { mount: mount, open: () => openDetail(), close: () => closeDetail(), state: () => ({ s: s, T: T, active: active, isOpen: BK.open, N: N, sub: RH.ui.shelfSub }), go: (t) => go(t) };
  RH.actions['book-close'] = () => closeDetail();

  // Preload nothing: the art is SVG. Mount whenever the shelf page is drawn.
  RH.afterRender.push(function (r) { if (typeof r !== 'string') return; if (r === 'study' && document.getElementById('shelf')) mount(); else if (root) unmount(); });
})(window.RH = window.RH || {});
