/* My Subjects: a bookshelf with one textbook per subject. Click a book and it comes off the shelf, the cover
   swings open and a cascade of pages turns over to the contents: that subject's chapters. Pick a chapter and the
   page turns to its topics; the back button turns it back. Covers are drawn here as SVG, so there are no images.
   The open book lives on document.body (outside the glassy page), so it is fixed to the window and sized to fit. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;

  const ABBR = { physics: 'PHY', maths: 'MATHS', further: 'F.MATHS', economics: 'ECON' };
  const abbr = (sub) => ABBR[sub.id] || sub.tag || sub.name.slice(0, 4).toUpperCase();
  const INK = '#221B45', CREAM = '#FBF6EC', VERM = '#F08A5D';
  const SERIF = 'Onest, system-ui, sans-serif', SANS = 'Onest, system-ui, sans-serif';
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

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
    const lessons = b.lessons;
    return '<rect width="474" height="900" fill="' + k.bg + '"/><rect width="12" height="900" fill="#000" opacity=".12"/>' +
      '<text x="36" y="56" font-family="' + SANS + '" font-weight="600" font-size="13" letter-spacing="3" fill="' + k.fg + '">PREPPR · A LEVEL</text>' +
      '<text x="440" y="56" text-anchor="end" font-family="' + SANS + '" font-weight="600" font-size="13" letter-spacing="2" fill="' + k.fg + '">' + esc(b.sub.spec) + '</text>' +
      '<rect x="36" y="72" width="404" height="2" fill="' + k.fg + '"/>' +
      '<text x="36" y="108" font-family="' + SANS + '" font-weight="700" font-size="15" letter-spacing="3" fill="' + (k.acc === INK ? CREAM : k.acc) + '">' + b.chapters + ' CHAPTERS</text>' +
      '<text x="440" y="108" text-anchor="end" font-family="' + SERIF + '" font-weight="600" font-size="16" fill="' + k.fg + '">' + esc(b.sub.board.replace('Pearson ', '')) + '</text>' +
      lines.map((l, i) => '<text x="34" y="' + (ty + i * lh) + '" font-family="' + SERIF + '" font-weight="700" font-size="' + fs + '" letter-spacing="-1.5" fill="' + k.fg + '"' + (l.length * fs * 0.64 > 404 ? ' textLength="404" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(l) + '</text>').join('') +
      '<svg x="36" y="' + iy + '" width="402" height="' + ih + '" viewBox="0 0 402 ' + ih + '">' + illustration(b, k, 402, ih) + '</svg>' +
      '<rect x="36" y="808" width="404" height="2" fill="' + k.fg + '"/>' +
      '<text x="36" y="852" font-family="' + SANS + '" font-weight="600" font-size="14" letter-spacing="2" fill="' + k.fg + '">' + lessons + ' LESSON' + (lessons === 1 ? '' : 'S') + '</text>' +
      '<rect x="356" y="830" width="84" height="32" fill="none" stroke="' + k.fg + '" stroke-width="2"/><text x="398" y="852" text-anchor="middle" font-family="' + SANS + '" font-weight="700" font-size="14" letter-spacing="2" fill="' + k.fg + '">A LVL</text>';
  }


  // ---------- The books: one per subject ----------
  function bookFor(sub, i) {
    const s0 = st(), comps = M.compsFor(s0, sub, true);
    return { i: i, sub: sub, title: sub.name, n: '', col: C.scol(sub), variant: i % 3, lessons: M.subjectTopics(s0, sub).length, chapters: comps.length, comps: comps };
  }
  const books = () => M.subjects.map(bookFor);
  const coverSVG = (b) => '<svg viewBox="0 0 474 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + coverInner(b) + '</svg>';

  V.study = function () {
    const s0 = st(), list = books();
    let html = '<section class="lib">';
    html += '<header class="lib-head"><div><p class="kicker">My Subjects</p><h1>Your bookshelf</h1><p class="meta">One book for each subject. Open one to pick a chapter.</p></div><a class="btn alt" href="#subjects">' + C.icon('plus') + 'Change subjects</a></header>';
    if (!list.length) return html + C.empty('No subjects yet.', 'Pick the subjects you take and they appear here as books.', '<a class="btn" href="#subjects">Choose subjects</a>') + '</section>';
    html += '<div class="lib-shelf" role="list">' + list.map(function (b) {
      const p = M.courseProgress(s0, M.subjectTopics(s0, b.sub));
      return '<div class="slot" role="listitem"><button type="button" class="sbk" data-sub="' + b.sub.id + '" style="--c:' + b.col + '" aria-label="Open ' + esc(b.sub.name) + ': ' + p.done + ' of ' + p.total + ' lessons done">' +
        '<span class="sbk-3d"><span class="sbk-spine" style="background:' + inks(b).bg + '"></span><span class="sbk-pages"></span><span class="sbk-cover">' + coverSVG(b) + '<i class="sbk-gloss"></i></span></span></button>' +
        '<span class="slot-cap"><b>' + esc(b.sub.name) + '</b><span class="slot-bar"><i style="width:' + Math.round(p.frac * 100) + '%;background:' + b.col + '"></i></span><span class="muted small">' + p.done + ' / ' + p.total + ' lessons</span></span></div>';
    }).join('') + '</div></section>';
    return html;
  };

  // ---------- Pages inside the book ----------
  function introPage(b) {
    const s0 = st(), p = M.courseProgress(s0, M.subjectTopics(s0, b.sub)), nx = M.nextLesson(s0, b.sub);
    return '<div class="pg-in"><p class="ob-k">' + esc(b.sub.board) + ' · ' + esc(b.sub.spec) + '</p><h2>' + esc(b.sub.name) + '</h2>' +
      '<div class="ob-ring">' + C.ring(p.frac, '<b>' + p.done + '</b>/' + p.total, 84) + '<span>' + U.plural(b.comps.length, 'chapter') + '<br>' + (p.done === p.total && p.total ? 'Every lesson done' : U.plural(p.total - p.done, 'lesson') + ' to go') + '</span></div>' +
      '<div class="ob-acts">' + (nx ? '<a class="btn block" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': ' + esc(M.title(nx.name)) + C.icon('right') + '</a>' : '') + '<a class="btn alt block" href="#s-' + b.sub.id + '">Subject page</a></div></div>';
  }
  function chaptersPage(b) {
    const s0 = st();
    return '<div class="pg-list"><p class="ob-k">Contents</p><h3>Chapters</h3><ol class="toc chs">' + b.comps.map(function (c, j) {
      const p = M.courseProgress(s0, c.topics);
      return '<li><button type="button" class="ch-b" data-ch="' + j + '"><span class="toc-n num">' + esc(M.sectionNum(s0, c)) + '</span><span class="toc-t">' + esc(M.title(c.name)) + '<span class="ch-m">' + U.plural(c.topics.length, 'topic') + (p.done ? ' · ' + p.done + ' done' : '') + '</span></span><span class="ch-bar"><i style="width:' + Math.round(p.frac * 100) + '%"></i></span></button></li>';
    }).join('') + '</ol></div>';
  }
  function chapterIntro(b, j) {
    const s0 = st(), c = b.comps[j], p = M.courseProgress(s0, c.topics), nx = M.nextLesson(s0, b.sub, c.topics);
    return '<div class="pg-in"><button type="button" class="pg-back" data-bk="back">' + C.icon('left') + 'Chapters</button><p class="ob-k">' + esc(b.sub.name) + ' · Chapter ' + esc(M.sectionNum(s0, c)) + '</p><h2>' + esc(M.title(c.name)) + '</h2>' +
      '<div class="ob-ring">' + C.ring(p.frac, '<b>' + p.done + '</b>/' + p.total, 84) + '<span>' + (p.done === p.total ? 'Every topic done' : U.plural(p.total - p.done, 'topic') + ' to go') + '</span></div>' +
      '<div class="ob-acts">' + (nx ? '<a class="btn block" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ' topic ' + esc(M.lessonNum(s0, nx)) + C.icon('right') + '</a>' : '') + '<a class="btn alt block" href="#c-' + c.gid + '">Chapter page</a></div></div>';
  }
  function topicsPage(b, j) {
    const s0 = st(), c = b.comps[j];
    return '<div class="pg-list"><button type="button" class="pg-back only-one" data-bk="back">' + C.icon('left') + 'Chapters</button><p class="ob-k">Chapter ' + esc(M.sectionNum(s0, c)) + '</p><h3>' + esc(M.title(c.name)) + '</h3><ol class="toc">' + c.topics.map((t) => '<li><a href="#t-' + t.gid + '">' + V.statusIcon(s0, t) + '<span class="toc-n num">' + esc(M.lessonNum(s0, t)) + '</span><span class="toc-t">' + esc(M.title(t.name)) + '</span></a></li>').join('') + '</ol></div>';
  }
  // On a phone only the right-hand page shows, so it carries a short heading of its own.
  function mini(b, j) {
    if (j != null) return '';
    const s0 = st(), p = M.courseProgress(s0, M.subjectTopics(s0, b.sub)), nx = M.nextLesson(s0, b.sub);
    return '<div class="ob-mini"><p class="ob-k">' + esc(b.sub.board) + '</p><h2>' + esc(b.sub.name) + '</h2><p class="small">' + p.done + ' of ' + p.total + ' lessons done</p>' + (nx ? '<a class="btn sm" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + C.icon('right') + '</a>' : '') + '</div>';
  }

  // ---------- The open book ----------
  const BK = { b: null, ch: null, anims: [], busy: false, open: false, stage: null, from: null };
  function stage() {
    if (!BK.stage) {
      BK.stage = document.createElement('div');
      BK.stage.className = 'book-stage'; BK.stage.id = 'bookStage'; BK.stage.hidden = true;
      document.body.appendChild(BK.stage);
      BK.stage.addEventListener('click', function (e) {
        const back = e.target.closest('[data-bk="back"]'), ch = e.target.closest('[data-ch]');
        if (e.target.closest('[data-bk="close"]')) { closeBook(); return; }
        if (back) { showChapters(); return; }
        if (ch) { showChapter(Number(ch.dataset.ch)); return; }
        if (e.target.closest('a[href^="#"]')) { finishClose(); }
      });
    }
    return BK.stage;
  }
  const narrow = () => window.innerWidth < 760;

  function openBook(subId, fromEl) {
    const sub = M.subject[subId];
    if (!sub || BK.busy) return;
    const b = bookFor(sub, Math.max(0, M.subjects.indexOf(sub)));
    BK.b = b; BK.ch = null; BK.open = true; BK.busy = true; BK.from = fromEl || null;
    const k = inks(b), one = narrow();
    const stg = stage();
    const leaves = [0, 1, 2, 3, 4].map((i) => '<div class="ob-leaf" style="--i:' + i + '"><div class="lf f"></div><div class="lf b">' + (i === 4 ? introPage(b) : '') + '</div></div>').join('');
    stg.innerHTML = '<div class="stage-bg" data-bk="close"></div>' +
      '<div class="ob' + (one ? ' one' : '') + '" style="--c:' + b.col + ';--cb:' + k.bg + '" role="dialog" aria-modal="true" aria-label="' + esc(sub.name) + '">' +
      '<div class="ob-shadow"></div><span class="ob-edge"></span><div class="ob-page ob-left">' + introPage(b) + '</div><div class="ob-page ob-right">' + mini(b) + chaptersPage(b) + '</div>' +
      leaves + '<div class="ob-cover"><div class="cf f">' + coverSVG(b) + '<i class="shade"></i></div><div class="cf b"><i class="shade"></i></div></div></div>' +
      '<button type="button" class="ob-x icon-btn" data-bk="close" aria-label="Close the book">' + C.icon('x') + '</button>';
    stg.hidden = false;
    document.body.classList.add('book-open');
    if (fromEl) fromEl.classList.add('lifted');
    const ob = stg.querySelector('.ob');
    BK.anims = [];
    const done = () => { BK.busy = false; ob.classList.add('opened'); BK.anims.forEach((a) => { if (!(a.effect.getTiming().delay > 0)) a.cancel(); }); const f = ob.querySelector('.ob-right .ch-b'); if (f) f.focus({ preventScroll: true }); };
    if (reduce() || !ob.animate) { ob.classList.add('static'); done(); return; }
    const P = ob.querySelector('.ob-right').getBoundingClientRect().width;
    const box = ob.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const closedX = one ? 0 : -P / 2, rest = 'translate(' + closedX + 'px,0) scale(1)';
    let from = 'translate(' + closedX + 'px,40px) scale(.6)';
    if (fromEl) {
      const r = fromEl.getBoundingClientRect(), sc = r.width / P;
      from = 'translate(' + (r.left + r.width / 2 - cx - (one ? 0 : sc * P / 2)) + 'px,' + (r.top + r.height / 2 - cy) + 'px) scale(' + sc.toFixed(3) + ') rotate(-3deg)';
    }
    const D = 2000, E = 'cubic-bezier(.6,0,.2,1)';
    const anim = (el, frames, o) => { const a = el.animate(frames, Object.assign({ duration: D, easing: E, fill: 'both' }, o || {})); BK.anims.push(a); return a; };
    // 1. Off the shelf into the middle, closed. 2. It slides right as the cover opens so the spread ends up centred.
    anim(ob, [{ transform: from }, { transform: rest, offset: 0.26 }, { transform: rest, offset: 0.32 }, { transform: 'translate(0,0) scale(1)', offset: 0.62 }, { transform: 'translate(0,0) scale(1)' }]);
    anim(ob.querySelector('.ob-shadow'), [{ opacity: 0 }, { opacity: 0.5, offset: 0.26 }, { opacity: 1, offset: 0.62 }, { opacity: 1 }]);
    anim(ob.querySelector('.ob-left'), [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.42 }, { opacity: 1 }], { easing: 'linear' });
    const swing = (z0, z1, a, b2) => [{ transform: 'rotateY(0deg) translateZ(' + z0 + 'px)' }, { transform: 'rotateY(0deg) translateZ(' + z0 + 'px)', offset: a }, { transform: 'rotateY(-90deg) translateZ(' + ((z0 - z1) / 2) + 'px) skewY(-1.5deg)', offset: (a + b2) / 2 }, { transform: 'rotateY(-180deg) translateZ(' + (-z1) + 'px)', offset: b2 }, { transform: 'rotateY(-180deg) translateZ(' + (-z1) + 'px)' }];
    const fade = (a, b2) => [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(0deg)', opacity: 1, offset: a }, { transform: 'rotateY(-180deg)', opacity: 0, offset: b2 }, { transform: 'rotateY(-180deg)', opacity: 0 }];
    anim(ob.querySelector('.ob-cover'), one ? fade(0.3, 0.6) : swing(8, 0.5, 0.3, 0.6));
    ob.querySelectorAll('.ob-cover .shade').forEach((sh, i) => anim(sh, [{ opacity: 0 }, { opacity: 0, offset: 0.34 }, { opacity: i ? 0 : 0.5, offset: 0.44 }, { opacity: i ? 0.45 : 0, offset: 0.47 }, { opacity: 0, offset: 0.6 }, { opacity: 0 }]));
    // The cascade: five pages flick over one after another, each settling a little higher on the left.
    ob.querySelectorAll('.ob-leaf').forEach(function (lf, i) {
      const a = 0.4 + i * 0.07, e = Math.min(0.97, a + 0.24);
      anim(lf, one ? fade(a, e) : swing(6.5 - 1.2 * i, 1.5 + 1.2 * i, a, e));
    });
    ob.querySelectorAll('.ob-right .pg-list > *, .ob-right .toc li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: D * 0.86 + Math.min(i, 14) * 40, easing: EASE }));
    BK.anims[0].finished.then(() => { if (BK.open) done(); }).catch(() => {});
  }

  // Turn one page: forward (right page over to the left) or back (left page over to the right).
  function turn(dir, newLeft, newRight) {
    const ob = BK.stage && BK.stage.querySelector('.ob');
    if (!ob || BK.busy) return;
    const L = ob.querySelector('.ob-left'), R = ob.querySelector('.ob-right');
    const focusFirst = () => { const f = R.querySelector('.ch-b, .toc a'); if (f) f.focus({ preventScroll: true }); };
    if (reduce() || !ob.animate) { L.innerHTML = newLeft; R.innerHTML = newRight; focusFirst(); return; }
    if (ob.classList.contains('one')) {
      // A phone shows one page: slide the new one in.
      BK.busy = true;
      const out = R.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(' + (dir > 0 ? -30 : 30) + 'px)', opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'both' });
      out.finished.then(function () {
        out.cancel(); L.innerHTML = newLeft; R.innerHTML = newRight; R.scrollTop = 0;
        R.animate([{ transform: 'translateX(' + (dir > 0 ? 30 : -30) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: EASE }).finished.then(() => { BK.busy = false; focusFirst(); });
      });
      return;
    }
    BK.busy = true;
    const leaf = document.createElement('div');
    leaf.className = 'ob-turn ' + (dir > 0 ? 'fwd' : 'bwd');
    if (dir > 0) { leaf.innerHTML = '<div class="lf f">' + R.innerHTML + '</div><div class="lf b">' + newLeft + '</div>'; R.innerHTML = newRight; }
    else { leaf.innerHTML = '<div class="lf f">' + L.innerHTML + '</div><div class="lf b">' + newRight + '</div>'; L.innerHTML = newLeft; }
    ob.appendChild(leaf);
    const shade = (side) => { const sh = document.createElement('i'); sh.className = 'shade'; leaf.querySelector('.lf.' + side).appendChild(sh); return sh; };
    const s1 = shade('f'), s2 = shade('b');
    const T = 900, E = 'cubic-bezier(.45,.05,.25,1)';
    const end = dir > 0 ? -180 : 180;
    const a = leaf.animate([{ transform: 'rotateY(0deg) translateZ(2px)' }, { transform: 'rotateY(' + end / 2 + 'deg) translateZ(30px) skewY(' + (dir > 0 ? -1.5 : 1.5) + 'deg)', offset: 0.5 }, { transform: 'rotateY(' + end + 'deg) translateZ(2px)' }], { duration: T, easing: E, fill: 'both' });
    s1.animate([{ opacity: 0 }, { opacity: 0.45 }], { duration: T / 2, easing: 'ease-in', fill: 'both' });
    s2.animate([{ opacity: 0.45 }, { opacity: 0.45, offset: 0.5 }, { opacity: 0 }], { duration: T, easing: 'ease-out', fill: 'both' });
    a.finished.then(function () {
      if (dir > 0) L.innerHTML = newLeft; else R.innerHTML = newRight;
      leaf.remove(); BK.busy = false; focusFirst();
    }).catch(() => { leaf.remove(); BK.busy = false; });
    R.querySelectorAll('.toc li').forEach((li, i) => li.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: T + Math.min(i, 12) * 40, easing: 'linear' }));
  }
  function showChapter(j) {
    const b = BK.b; if (!b || !b.comps[j]) return;
    BK.ch = j;
    turn(1, chapterIntro(b, j), mini(b, j) + topicsPage(b, j));
  }
  function showChapters() {
    const b = BK.b; if (!b || BK.ch == null) return;
    BK.ch = null;
    turn(-1, introPage(b), mini(b) + chaptersPage(b));
  }
  function finishClose() {
    const stg = BK.stage; if (!stg) return;
    BK.anims.forEach((a) => a.cancel()); BK.anims = [];
    stg.hidden = true; stg.innerHTML = '';
    document.body.classList.remove('book-open');
    document.querySelectorAll('.sbk.lifted').forEach((x) => x.classList.remove('lifted'));
    BK.open = false; BK.busy = false;
  }
  function closeBook() {
    if (!BK.open) return;
    const stg = BK.stage, ob = stg && stg.querySelector('.ob'), from = BK.from;
    BK.open = false;
    if (!ob || reduce() || !ob.animate) { finishClose(); if (from) from.focus({ preventScroll: true }); return; }
    BK.anims.forEach((a) => a.cancel()); BK.anims = [];
    ob.classList.add('static');
    const out = ob.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(24px) scale(.92)', opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'both' });
    stg.querySelector('.stage-bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'both' });
    out.finished.then(() => { finishClose(); if (from && document.body.contains(from)) from.focus({ preventScroll: true }); });
  }

  window.addEventListener('keydown', function (e) {
    if (!BK.open || RH.c.modalOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); if (BK.ch != null) showChapters(); else closeBook(); }
  });
  window.addEventListener('hashchange', function () { if (BK.open) finishClose(); });

  // ---------- Shelf wiring ----------
  function mount() {
    document.querySelectorAll('.sbk').forEach(function (el) {
      el.addEventListener('click', () => openBook(el.dataset.sub, el));
      el.addEventListener('pointermove', function (e) {
        if (reduce() || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 16).toFixed(1) + 'deg'); el.style.setProperty('--rx', (-y * 10).toFixed(1) + 'deg');
        el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(0) + '%'); el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(0) + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); });
    });
    const want = RH.ui.openBook; RH.ui.openBook = null;
    if (want) { const el = document.querySelector('.sbk[data-sub="' + want + '"]'); setTimeout(() => openBook(want, el), 60); }
  }
  RH.shelf = {
    mount: mount, openSubject: (id) => openBook(id, document.querySelector('.sbk[data-sub="' + id + '"]')), close: closeBook,
    chapter: showChapter, chapters: showChapters, state: () => ({ open: BK.open, busy: BK.busy, sub: BK.b && BK.b.sub.id, ch: BK.ch })
  };
  RH.actions['shelf-open'] = function (el) {
    if (location.hash === '#study') { RH.shelf.openSubject(el.dataset.sub); return; }
    RH.ui.openBook = el.dataset.sub; location.hash = 'study';
  };
  RH.afterRender.push(function (r) { if (typeof r !== 'string') return; if (r === 'study') mount(); else if (BK.open) finishClose(); });
  RH.shelf.cover = function (sub, i) { return coverSVG(bookFor(sub, i == null ? Math.max(0, M.subjects.indexOf(sub)) : i)); };
  RH.shelf.inks = (sub) => inks(bookFor(sub, Math.max(0, M.subjects.indexOf(sub))));
})(window.RH = window.RH || {});
