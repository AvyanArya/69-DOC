/* My Subjects: a bookshelf with one book per subject. Click a book and it flies to the middle of the screen,
   the cover swings open, a few pages flip, and the chapters (the subject's sections) appear on the right-hand page.
   The covers are drawn here as SVG, so there are no image files. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rng(seed) { let x = (seed * 9301 + 49297) % 233280; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
  const ART = { fg: 'rgba(255,255,255,0.92)', acc: 'rgba(255,255,255,0.55)', alt: '#FFE29A' };

  function illustration(b, k, w, h) {
    const r = rng(b.i + 3), P = k.acc, A = k.alt, F = k.fg;
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


  function art(sub, i) { return '<svg class="bk-art" viewBox="0 0 252 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + illustration({ i: i, sub: sub }, ART, 252, 200) + '</svg>'; }
  function cover(sub, i, s) {
    const p = M.courseProgress(s, M.subjectTopics(s, sub));
    return '<span class="bk-face" style="--c:' + C.scol(sub) + '"><span class="bk-top"><span class="bk-board">' + esc(sub.board) + ' · ' + esc(sub.spec.split(' ')[0]) + '</span><b class="bk-name">' + esc(sub.name) + '</b></span>' + art(sub, i) +
      '<span class="bk-foot"><span class="bk-bar"><i style="width:' + Math.round(100 * p.frac) + '%"></i></span><span>' + p.done + ' of ' + p.total + ' lessons</span></span></span>';
  }

  // ---------- The shelf ----------
  V.study = function () {
    const s = st(), list = M.subjects, rows = [];
    for (let i = 0; i < list.length; i += 4) rows.push(list.slice(i, i + 4));
    let html = '<header class="page-h"><div><h1>My Subjects</h1><p class="lede">Pick a book to open it.</p></div><a class="btn alt" href="#subjects">' + C.icon('plus') + 'Add or remove subjects</a></header>';
    html += '<div class="shelf">' + rows.map((row, r) => '<div class="shelf-row"><div class="shelf-books">' + row.map(function (sub, j) {
      const i = r * 4 + j;
      return '<button type="button" class="bk" data-action="book-open" data-id="' + sub.id + '" data-i="' + i + '" aria-label="Open ' + esc(sub.name) + '" style="--c:' + C.scol(sub) + '"><span class="bk-spine"></span>' + cover(sub, i, s) + '</button>';
    }).join('') + '</div><div class="plank"></div></div>').join('') + '</div>';
    html += '<div class="book-stage" id="bookStage" hidden></div>';
    return html;
  };

  // ---------- The open book ----------
  function inside(sub, s) {
    const topics = M.subjectTopics(s, sub), p = M.courseProgress(s, topics), nx = M.nextLesson(s, sub, topics);
    const ex = M.upcomingExams(s).filter((e) => e.subject === sub.id)[0];
    return '<div class="ob-in"><p class="label">' + esc(sub.board.replace('Pearson ', '')) + ' · ' + esc(sub.spec) + '</p><h2>' + esc(sub.name) + '</h2>' +
      '<div class="ob-ring">' + C.ring(p.frac, '<b>' + Math.round(100 * p.frac) + '</b>%', 96) + '<span><b>' + p.done + ' of ' + p.total + '</b> lessons done' + (ex ? '<br><span class="muted">First paper ' + esc(U.fmt(ex.date)) + '</span>' : '') + '</span></div>' +
      (nx ? '<a class="btn block" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': ' + esc(M.lessonNum(s, nx) + ' ' + M.title(nx.name)) + '</a>' : '<p class="ok-t"><b>Every lesson done.</b></p>') +
      '<a class="btn alt block" href="#s-' + sub.id + '">See every lesson</a></div>';
  }
  // On a phone only one page shows, so the right-hand page starts with the subject's name and the next lesson.
  function mini(sub, s) {
    const nx = M.nextLesson(s, sub), p = M.courseProgress(s, M.subjectTopics(s, sub));
    return '<div class="ob-mini"><h2>' + esc(sub.name) + '</h2><p class="muted small">' + p.done + ' of ' + p.total + ' lessons done</p>' + (nx ? '<a class="btn sm" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': ' + esc(M.lessonNum(s, nx)) + '</a>' : '') + '</div>';
  }
  function contents(sub, s) {
    const course = M.course(s, sub);
    return '<div class="ob-toc"><p class="label">Contents</p><ol class="toc">' + course.map(function (u) {
      const up = M.courseProgress(s, u.c.topics);
      return '<li><a href="#c-' + u.c.gid + '"><span class="toc-n num">' + esc(u.n) + '</span><span class="toc-t">' + esc(M.title(u.c.name)) + '</span><span class="toc-d num' + (up.done === up.total ? ' all' : '') + '">' + up.done + '/' + up.total + '</span></a></li>';
    }).join('') + '</ol></div>';
  }
  let cur = null;
  function open(sid, fromEl) {
    const s = st(), sub = M.subject[sid], stage = document.getElementById('bookStage');
    if (!sub || !stage) return;
    const i = fromEl ? Number(fromEl.dataset.i) : M.subjects.indexOf(sub);
    stage.innerHTML = '<div class="stage-bg" data-action="book-close"></div><div class="ob" style="--c:' + C.scol(sub) + '" data-subj="' + sub.id + '" role="dialog" aria-modal="true" aria-label="' + esc(sub.name) + '">' +
      '<div class="ob-page ob-left"></div><div class="ob-page ob-right">' + mini(sub, s) + contents(sub, s) + '</div>' +
      '<div class="ob-leaf"></div><div class="ob-leaf"></div><div class="ob-leaf"></div>' +
      '<div class="ob-cover"><div class="ob-front">' + cover(sub, i, s) + '</div><div class="ob-back">' + inside(sub, s) + '</div></div></div>' +
      '<button type="button" class="ob-x icon-btn" data-action="book-close" aria-label="Close the book">' + C.icon('x') + '</button>';
    stage.hidden = false;
    document.body.classList.add('book-open');
    const ob = stage.querySelector('.ob'), cv = ob.querySelector('.ob-cover'), leaves = ob.querySelectorAll('.ob-leaf');
    const narrow = window.innerWidth < 760;
    ob.classList.toggle('one', narrow);
    const P = ob.querySelector('.ob-right').getBoundingClientRect().width;
    const box = ob.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const rest = narrow ? 'translate(0px, 0px) scale(1)' : 'translate(' + (-P / 2) + 'px, 0px) scale(1)';
    let from = rest;
    if (fromEl) {
      const b = fromEl.getBoundingClientRect(), sc = b.width / P;
      const dx = b.left + b.width / 2 - cx - (narrow ? 0 : sc * P / 2), dy = b.top + b.height / 2 - cy;
      from = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + sc + ')';
      fromEl.classList.add('lifted');
    }
    cur = { el: fromEl, anims: [] };
    if (reduce() || !ob.animate) { ob.classList.add('static'); return; }
    const D = 1300, E = 'cubic-bezier(.65,0,.2,1)';
    cur.anims.push(ob.animate([{ transform: from }, { transform: rest, offset: 0.34 }, { transform: rest, offset: 0.42 }, { transform: 'translate(0px, 0px) scale(1)' }], { duration: D, easing: E, fill: 'both' }));
    cur.anims.push(cv.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(0deg)', offset: 0.4 }, narrow ? { transform: 'rotateY(-180deg)', opacity: 0 } : { transform: 'rotateY(-180deg)' }], { duration: D, easing: E, fill: 'both' }));
    leaves.forEach(function (lf, k) {
      cur.anims.push(lf.animate([{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(0deg)', opacity: 1, offset: 0.45 + k * 0.08 }, { transform: 'rotateY(-175deg)', opacity: 0.9, offset: 0.92 }, { transform: 'rotateY(-180deg)', opacity: 0 }], { duration: D + 120, easing: E, fill: 'both' }));
    });
    ob.querySelectorAll('.ob-toc, .ob-in').forEach((x) => cur.anims.push(x.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: D, fill: 'both' })));
    const first = ob.querySelector('.toc a');
    cur.anims[0].finished.then(() => { if (first) first.focus({ preventScroll: true }); }).catch(() => {});
  }
  function close() {
    const stage = document.getElementById('bookStage');
    if (!stage || stage.hidden) return;
    const done = () => { stage.hidden = true; stage.innerHTML = ''; document.body.classList.remove('book-open'); if (cur && cur.el) { cur.el.classList.remove('lifted'); cur.el.focus({ preventScroll: true }); } cur = null; };
    if (cur && cur.anims.length && !reduce()) {
      cur.anims.forEach((a) => { a.playbackRate = 1.6; a.reverse(); });
      cur.anims[0].finished.then(done).catch(done);
    } else done();
  }
  RH.shelf = { open: open, close: close, isOpen: () => !!cur };
  RH.actions['book-open'] = (el) => open(el.dataset.id, el);
  RH.actions['book-close'] = () => close();
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) close(); });
  window.addEventListener('hashchange', function () { cur = null; document.body.classList.remove('book-open'); });
})(window.RH = window.RH || {});
