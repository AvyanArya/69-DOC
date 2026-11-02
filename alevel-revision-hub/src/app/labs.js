/* Labs: interactive physics experiments in the style of PhET. Each lab is a small simulation of the real equations
   with sliders for its variables, live readouts, graphs and a list of experiments to try.
   This file is the frame: the Labs pages, the controls, the canvas loop and the graph drawing. The labs themselves
   are in labs-sims.js and register with RH.labs.add(). */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const V = RH.views;
  const LB = RH.labs = { defs: [], byId: {} };
  LB.add = function (def) { LB.defs.push(def); LB.byId[def.id] = def; };

  // ---------- Numbers and colours ----------
  LB.fmt = function (x, dp) {
    if (x == null || !isFinite(x)) return '–';
    const a = Math.abs(x);
    if (dp == null) dp = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
    return x.toFixed(dp);
  };
  LB.sci = function (x, sf) {
    if (!isFinite(x) || x === 0) return x === 0 ? '0' : '–';
    const e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    return m.toFixed((sf || 3) - 1) + ' × 10' + String(e).split('').map((ch) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] || (ch === '-' ? '⁻' : ch)).join('');
  };
  // Colours from the page's theme, read on each mount and when the theme changes.
  LB.theme = function () {
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    return { ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), line: v('--line'), line2: v('--line-2'), bg: v('--surface'), bg2: v('--surface-2'), bg3: v('--surface-3'), primary: v('--primary'), bad: v('--bad'), ok: v('--ok'), warn: v('--c2'), accent: v('--eco'), purple: v('--fm'), green: v('--mat'), dark: /dark/.test(cs.getPropertyValue('color-scheme')) };
  };
  // Visible light as a colour; ultraviolet and infrared shown as dim violet and dim red.
  LB.waveColour = function (nm, alpha) {
    let r = 0, g = 0, b = 0;
    if (nm < 380) { r = 0.45; g = 0.3; b = 0.75; }
    else if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 780) { r = 1; }
    else { r = 0.5; g = 0.1; b = 0.1; }
    let f = 1;
    if (nm >= 380 && nm < 420) f = 0.4 + 0.6 * (nm - 380) / 40; else if (nm > 700 && nm <= 780) f = 0.4 + 0.6 * (780 - nm) / 80;
    const c = (x) => Math.round(255 * Math.pow(Math.max(0, x) * f, 0.8));
    return 'rgba(' + c(r) + ',' + c(g) + ',' + c(b) + ',' + (alpha == null ? 1 : alpha) + ')';
  };

  // ---------- Drawing helpers ----------
  LB.arrow = function (g, x1, y1, x2, y2, col, w) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), hd = Math.min(10, L * 0.4);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w || 2;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); g.stroke();
    if (L < 2) return;
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - hd * Math.cos(a - 0.4), y2 - hd * Math.sin(a - 0.4)); g.lineTo(x2 - hd * Math.cos(a + 0.4), y2 - hd * Math.sin(a + 0.4)); g.closePath(); g.fill();
  };
  LB.text = function (g, s, x, y, o) {
    o = o || {};
    g.font = (o.weight || 500) + ' ' + (o.size || 12) + 'px Inter, system-ui, sans-serif';
    g.fillStyle = o.col; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    g.fillText(s, x, y);
  };
  function nice(span, n) {
    const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  LB.nice = nice;
  // A graph with axes, ticks, labels and any number of series: {pts: [[x,y]...], col, dash, dots, width}.
  LB.plot = function (g, th, o) {
    const x = o.x, y = o.y, w = o.w, h = o.h, pl = 46, pb = 30, pt = 14, pr = 12;
    const X0 = x + pl, X1 = x + w - pr, Y0 = y + h - pb, Y1 = y + pt;
    const sx = (v) => X0 + (v - o.x0) / (o.x1 - o.x0) * (X1 - X0), sy = (v) => Y0 - (v - o.y0) / (o.y1 - o.y0) * (Y0 - Y1);
    g.save();
    g.lineWidth = 1;
    const tx = nice(o.x1 - o.x0, Math.max(3, Math.floor(w / 90))), ty = nice(o.y1 - o.y0, Math.max(3, Math.floor(h / 50)));
    g.strokeStyle = th.line; g.beginPath();
    for (let v = Math.ceil(o.x0 / tx) * tx; v <= o.x1 + 1e-9; v += tx) { g.moveTo(sx(v), Y0); g.lineTo(sx(v), Y1); }
    for (let v = Math.ceil(o.y0 / ty) * ty; v <= o.y1 + 1e-9; v += ty) { g.moveTo(X0, sy(v)); g.lineTo(X1, sy(v)); }
    g.stroke();
    const lab = (v, t) => { const d = t < 1 ? Math.min(4, Math.ceil(-Math.log10(t))) : 0; return (Math.abs(v) < t / 1e6 ? 0 : v).toFixed(d); };
    for (let v = Math.ceil(o.x0 / tx) * tx; v <= o.x1 + 1e-9; v += tx) LB.text(g, lab(v, tx), sx(v), Y0 + 15, { col: th.ink3, size: 11, align: 'center' });
    for (let v = Math.ceil(o.y0 / ty) * ty; v <= o.y1 + 1e-9; v += ty) LB.text(g, lab(v, ty), X0 - 6, sy(v) + 4, { col: th.ink3, size: 11, align: 'right' });
    g.strokeStyle = th.ink2; g.lineWidth = 1.5; g.beginPath();
    const zx = o.x0 <= 0 && o.x1 >= 0 ? sx(0) : X0, zy = o.y0 <= 0 && o.y1 >= 0 ? sy(0) : Y0;
    g.moveTo(X0, zy); g.lineTo(X1, zy); g.moveTo(zx, Y0); g.lineTo(zx, Y1); g.stroke();
    if (o.xl) LB.text(g, o.xl, X1, Y0 + 27, { col: th.ink2, size: 11, align: 'right', weight: 600 });
    if (o.yl) LB.text(g, o.yl, X0 + 4, Y1 + 2, { col: th.ink2, size: 11, weight: 600, base: 'top' });
    g.beginPath(); g.rect(X0, Y1 - 2, X1 - X0, Y0 - Y1 + 4); g.clip();
    (o.series || []).forEach(function (s) {
      if (!s.pts || !s.pts.length) return;
      g.strokeStyle = s.col; g.fillStyle = s.col; g.lineWidth = s.width || 2; g.setLineDash(s.dash || []);
      if (s.dots) s.pts.forEach((p) => { g.beginPath(); g.arc(sx(p[0]), sy(p[1]), s.r || 4, 0, 7); g.fill(); });
      else { g.beginPath(); s.pts.forEach((p, i) => { const X = sx(p[0]), Y = sy(p[1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); }
      g.setLineDash([]);
    });
    (o.vlines || []).forEach(function (v) { g.strokeStyle = v.col || th.ink3; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(sx(v.x), Y0); g.lineTo(sx(v.x), Y1); g.stroke(); g.setLineDash([]); if (v.label) LB.text(g, v.label, sx(v.x) + 4, Y1 + 12, { col: v.col || th.ink3, size: 11, weight: 600 }); });
    (o.hlines || []).forEach(function (v) { g.strokeStyle = v.col || th.ink3; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(X0, sy(v.y)); g.lineTo(X1, sy(v.y)); g.stroke(); g.setLineDash([]); if (v.label) LB.text(g, v.label, X1 - 4, sy(v.y) - 5, { col: v.col || th.ink3, size: 11, weight: 600, align: 'right' }); });
    g.restore();
    return { sx: sx, sy: sy };
  };
  LB.legend = function (g, th, x, y, items) {
    let cx = x;
    items.forEach(function (it) {
      g.fillStyle = it[1]; g.fillRect(cx, y - 8, 14, 3);
      LB.text(g, it[0], cx + 19, y - 3, { col: th.ink2, size: 11, weight: 600 });
      g.font = '600 11px Inter, system-ui, sans-serif';
      cx += 34 + g.measureText(it[0]).width;
    });
  };

  // ---------- Pages ----------
  const subjOf = (gid) => M.topic[gid];
  V.labs = function () {
    let html = V.docHead('Labs', 'Physics labs', 'Interactive experiments built on the real equations. Change the variables, watch what happens, take readings and plot graphs, like the practicals in Paper 3.');
    html += '<div class="lab-cards">' + LB.defs.map(function (d) {
      const t = subjOf(d.topics[0]);
      return '<a class="lab-card" href="#lab-' + d.id + '"><span class="lab-ic" aria-hidden="true">' + (d.icon || '') + '</span><span class="lab-ct"><b>' + esc(d.name) + '</b><span class="muted small">' + esc(d.blurb) + '</span>' + (t ? '<span class="small lab-topic">' + esc(M.lessonNum(RH.store.state, t) + ' ' + M.title(t.name)) + '</span>' : '') + '</span></a>';
    }).join('') + '</div>';
    return html;
  };
  function control(c, p) {
    const hid = c.when && !c.when(p) ? ' hidden' : '';
    if (c.type === 'toggle') return '<div class="lc lc-t" data-lc="' + c.k + '"' + hid + '>' + C.toggle('data-lk="' + c.k + '"', c.label, p[c.k], c.help) + '</div>';
    if (c.type === 'seg') return '<div class="lc" data-lc="' + c.k + '"' + hid + '><span class="lc-h"><span>' + c.label + '</span></span><div class="seg lc-seg">' + c.options.map((o) => '<button type="button" data-lk="' + c.k + '" data-v="' + o[0] + '"' + (String(p[c.k]) === String(o[0]) ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + o[1] + '</button>').join('') + '</div></div>';
    if (c.type === 'select') return '<label class="lc" data-lc="' + c.k + '"' + hid + '><span class="lc-h"><span>' + c.label + '</span></span><select data-lk="' + c.k + '">' + c.options.map((o, i) => '<option value="' + i + '"' + (String(o[0]) === String(p[c.k]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>';
    return '<label class="lc" data-lc="' + c.k + '"' + hid + '><span class="lc-h"><span>' + c.label + '</span><output class="num" id="lo-' + c.k + '">' + showVal(c, p[c.k], p) + '</output></span><input type="range" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + p[c.k] + '" data-lk="' + c.k + '" aria-label="' + esc(c.label) + '"></label>';
  }
  const showVal = (c, v, p) => (c.show ? c.show(v, p) : LB.fmt(Number(v), c.dp)) + (c.unit ? ' ' + c.unit : '');

  V.lab = function (id) {
    const d = LB.byId[id];
    if (!d) return V.notFound();
    const cur = LB.cur && LB.cur.id === id ? LB.cur : null;
    const p = cur ? cur.p : defaults(d);
    const t = subjOf(d.topics[0]);
    let html = C.crumbs([['Labs', 'labs'], [d.name]]);
    html += V.docHead('Lab' + (t ? ' · ' + esc(t.subject.name) + ' ' + M.lessonNum(RH.store.state, t) : ''), esc(d.name), esc(d.blurb),
      d.topics.map((g) => subjOf(g) ? '<a class="btn alt sm" href="#t-' + g + '">Lesson: ' + esc(M.title(subjOf(g).name)) + '</a>' : '').join(''));
    html += '<div class="lab" data-lab="' + id + '"><div class="lab-main"><div class="lab-stage"><canvas class="lab-cv" aria-label="' + esc(d.name) + ' simulation"></canvas></div>' +
      '<div class="lab-bar"><button type="button" class="btn sm" data-lab-act="play">' + C.icon('pause') + '<span>Pause</span></button><button type="button" class="btn alt sm" data-lab-act="reset">' + C.icon('rebuild') + 'Reset</button>' +
      (d.actions || []).map((a) => '<button type="button" class="btn ' + (a.primary ? '' : 'alt ') + 'sm" data-lab-act="' + a.id + '">' + esc(a.label) + '</button>').join('') +
      '<span class="lab-speed"><span class="small muted">Speed</span>' + C.seg([[0.25, '¼×'], [0.5, '½×'], [1, '1×'], [2, '2×']].concat(d.fast ? [[d.fast, d.fast + '×']] : []), cur ? cur.speed : 1, 'data-lab-speed="1"') + '</span></div>' +
      (d.graph ? '<div class="lab-graph"><canvas class="lab-gc" aria-label="Graph"></canvas></div>' : '') + '</div>' +
      '<aside class="lab-panel"><h2>Variables</h2><div class="lab-ctrls">' + d.controls.map((c) => control(c, p)).join('') + '</div><h2>Readings</h2><p class="help">Green values are predicted by the equations; the others are measured in the simulation.</p><dl class="lab-read"></dl><div class="lab-extra"></div></aside></div>';
    html += '<div class="lab-notes"><section><h2 class="h-rule">Experiments to try</h2><ol class="lab-tasks">' + d.tasks.map((x) => '<li>' + x + '</li>').join('') + '</ol></section>' +
      '<section><h2 class="h-rule">The physics</h2><div class="lab-theory">' + d.theory + '</div></section></div>';
    return html;
  };
  function defaults(d) { const p = {}; d.controls.forEach((c) => { p[c.k] = c.v; }); return p; }

  // ---------- Running a lab ----------
  let raf = 0;
  function mount(id) {
    const d = LB.byId[id], root = document.querySelector('.lab[data-lab="' + id + '"]');
    if (!d || !root) return;
    let cur = LB.cur && LB.cur.id === id ? LB.cur : null;
    if (!cur) { const p = defaults(d); cur = LB.cur = { id: id, p: p, inst: d.create(p), speed: 1, playing: true }; }
    const p = cur.p, inst = cur.inst;
    const cv = root.querySelector('.lab-cv'), gc = root.querySelector('.lab-gc');
    const g = cv.getContext('2d'), gg = gc && gc.getContext('2d');
    let th = LB.theme(), W = 0, Hh = 0, GW = 0, GH = 0, frame = 0, lastRead = '', lastExtra = '';
    function size() {
      const dpr = window.devicePixelRatio || 1;
      W = cv.parentNode.clientWidth; Hh = Math.round(Math.min(W * (d.aspect || 0.56), d.maxH || 460));
      cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.height = Hh + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gc) { GW = gc.parentNode.clientWidth; GH = d.graphH || 220; gc.width = Math.round(GW * dpr); gc.height = Math.round(GH * dpr); gc.style.height = GH + 'px'; gg.setTransform(dpr, 0, 0, dpr, 0, 0); }
    }
    size();
    const ro = window.ResizeObserver ? new ResizeObserver(() => size()) : null;
    if (ro) ro.observe(root.querySelector('.lab-stage'));
    const playBtn = root.querySelector('[data-lab-act="play"]');
    const paintPlay = () => { playBtn.innerHTML = C.icon(cur.playing ? 'pause' : 'play') + '<span>' + (cur.playing ? 'Pause' : 'Play') + '</span>'; };
    paintPlay();
    function refreshVisibility() { d.controls.forEach((c) => { if (c.when) { const el = root.querySelector('[data-lc="' + c.k + '"]'); if (el) el.hidden = !c.when(p); } }); }
    function set(k, v) {
      const c = d.controls.find((x) => x.k === k);
      p[k] = v;
      d.controls.forEach(function (x) { const o = root.querySelector('#lo-' + x.k); if (o && (x.k === k || x.show)) o.textContent = showVal(x, p[x.k], p); });
      refreshVisibility();
      if (inst.change) inst.change(k, p);
    }
    root.querySelector('.lab-ctrls').addEventListener('input', function (e) {
      const el = e.target, k = el.dataset.lk;
      if (!k || el.type === 'checkbox' || el.tagName === 'SELECT') return;
      set(k, Number(el.value));
    });
    root.querySelector('.lab-ctrls').addEventListener('change', function (e) {
      const el = e.target, k = el.dataset.lk;
      if (!k) return;
      if (el.type === 'checkbox') set(k, el.checked);
      else if (el.tagName === 'SELECT') { const c = d.controls.find((x) => x.k === k); set(k, c.options[Number(el.value)][0]); }
    });
    root.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.lk && b.dataset.v != null) {
        const c = d.controls.find((x) => x.k === b.dataset.lk), raw = b.dataset.v, v = isNaN(Number(raw)) ? raw : Number(raw);
        b.parentNode.querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
        set(c.k, v);
      } else if (b.dataset.labSpeed) {
        cur.speed = Number(b.dataset.v);
        b.parentNode.querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      } else if (b.dataset.labAct === 'play') { cur.playing = !cur.playing; paintPlay(); }
      else if (b.dataset.labAct === 'reset') { cur.inst.reset(p); cur.playing = true; paintPlay(); }
      else if (b.dataset.labAct && inst.action) { inst.action(b.dataset.labAct, p); if (!cur.playing) { cur.playing = true; paintPlay(); } }
    });
    if (d.onCanvas) {
      const toWorld = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', (e) => { const q = toWorld(e); if (inst.pointer && inst.pointer('down', q[0], q[1], p)) { cv.setPointerCapture(e.pointerId); e.preventDefault(); } });
      cv.addEventListener('pointermove', (e) => { const q = toWorld(e); if (inst.pointer) inst.pointer('move', q[0], q[1], p); });
      cv.addEventListener('pointerup', (e) => { const q = toWorld(e); if (inst.pointer) inst.pointer('up', q[0], q[1], p); });
    }
    let last = 0;
    cancelAnimationFrame(raf);
    function loop(now) {
      if (!document.body.contains(cv)) { if (ro) ro.disconnect(); return; }
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (++frame % 30 === 0) th = LB.theme();
      if (cur.playing) inst.step(dt * cur.speed, p);
      g.clearRect(0, 0, W, Hh);
      inst.draw(g, W, Hh, p, th);
      if (gg) { gg.clearRect(0, 0, GW, GH); inst.graph(gg, GW, GH, p, th); }
      if (frame % 6 === 1) {
        const read = (inst.readouts(p) || []).map((r) => '<div' + (r[2] ? ' class="' + r[2] + '"' : '') + '><dt>' + r[0] + '</dt><dd class="num">' + r[1] + '</dd></div>').join('');
        if (read !== lastRead) { root.querySelector('.lab-read').innerHTML = read; lastRead = read; }
        const ex = inst.extra ? inst.extra(p) : '';
        if (ex !== lastExtra) { root.querySelector('.lab-extra').innerHTML = ex; lastExtra = ex; }
      }
    }
    raf = requestAnimationFrame(loop);
  }
  RH.afterRender.push(function (r) { if (typeof r === 'string' && r.indexOf('lab-') === 0) mount(r.slice(4)); });
})(window.RH = window.RH || {});
