/* Focus: Pomodoro, countdown, exam timer and stopwatch, plus a webcam focus tracker.
   The tracker runs face detection in the browser (nothing is recorded or uploaded). When you leave your desk
   the timer pauses and the time stops counting; it starts again when you sit back down.
   Focused minutes are logged and count towards your weekly deliverables. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const store = RH.store;

  const T = RH.timer = {
    mode: 'pomo', phase: 'focus', cycle: 0, running: false,
    total: 25 * 60, left: 25 * 60, endsAt: 0, elapsed: 0, startedAt: 0, laps: [],
    session: null, examPaper: '', extra: 0, warned: {}, tick: null,
    acc: 0, lastTick: 0, away: 0, awayMs: 0, runStart: 0
  };
  const PHASE = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  const fmt = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
  };
  T.fmt = fmt;
  const pomo = () => st().prefs.pomo;
  const phaseLen = (p) => (p === 'focus' ? pomo().focus : p === 'short' ? pomo().short : pomo().long) * 60;
  const counting = () => T.mode !== 'pomo' || T.phase === 'focus';

  function setTotal(sec) { T.running = false; T.total = T.left = Math.max(1, Math.round(sec)); T.warned = {}; }

  // Write the focused time from the current run to the log.
  function flush() {
    const mins = T.acc / 60;
    if (mins >= 1) {
      const entry = { id: U.uid(), date: U.today(), at: Date.now(), focused: Math.round(mins * 10) / 10, mode: T.mode, session: T.session || null, tracked: F.on, away: T.away, awayMins: Math.round(T.awayMs / 6000) / 10 };
      store.update(function (s) { s.focus.log.push(entry); if (s.focus.log.length > 600) s.focus.log = s.focus.log.slice(-600); s.activity[entry.date] = (s.activity[entry.date] || 0) + 1; }, { silent: true });
    }
    T.acc = 0; T.away = 0; T.awayMs = 0;
  }
  T.flush = flush;

  T.setMode = function (mode) {
    if (T.mode === mode) return;
    flush();
    T.mode = mode; T.running = false; T.elapsed = 0; T.laps = [];
    if (mode === 'pomo') { T.phase = 'focus'; setTotal(phaseLen('focus')); }
    else if (mode === 'exam') setTotal(examSeconds());
    else if (mode === 'countdown') setTotal(T.lastCountdown || 30 * 60);
    paint();
  };
  function examPapers() {
    const out = [];
    M.subjects.forEach((s) => s.papers.forEach((p) => out.push({ id: s.id + '-' + p.id, name: s.name + ' ' + p.code + ' ' + p.name.replace(/^Paper \w+: /, ''), dur: p.dur })));
    return out;
  }
  function examSeconds() {
    const p = examPapers().find((x) => x.id === T.examPaper);
    return Math.round((p ? p.dur : (T.examCustom || 120)) * 60 * (1 + (T.extra || 0) / 100));
  }

  T.start = function () {
    if (T.running) return;
    if (T.mode === 'stopwatch') T.startedAt = Date.now() - T.elapsed * 1000;
    else { if (T.left <= 0) T.left = T.total; T.endsAt = Date.now() + T.left * 1000; }
    T.running = true; T.lastTick = Date.now();
    if (!T.runStart) T.runStart = Date.now();
    loop(); paint();
  };
  T.pause = function () {
    if (!T.running) return;
    if (T.mode === 'stopwatch') T.elapsed = (Date.now() - T.startedAt) / 1000;
    else T.left = (T.endsAt - Date.now()) / 1000;
    T.running = false;
    paint();
  };
  T.reset = function () {
    flush();
    T.running = false; T.runStart = 0;
    if (T.mode === 'stopwatch') { T.elapsed = 0; T.laps = []; }
    else if (T.mode === 'pomo') setTotal(phaseLen(T.phase));
    else setTotal(T.total);
    T.warned = {};
    paint();
  };
  T.skip = function () { if (T.mode === 'pomo') nextPhase(false); };
  function nextPhase(finished) {
    if (T.phase === 'focus') { flush(); if (finished) T.cycle++; T.phase = T.cycle && T.cycle % pomo().cycles === 0 ? 'long' : 'short'; }
    else T.phase = 'focus';
    setTotal(phaseLen(T.phase));
    if (finished && pomo().auto) T.start(); else paint();
  }
  function finish() {
    T.running = false; T.left = 0;
    if (pomo().sound) C.chime('end');
    if (T.mode === 'pomo') {
      const was = T.phase;
      C.toast(was === 'focus' ? 'Focus block done. Take a ' + ((T.cycle + 1) % pomo().cycles === 0 ? 'long' : 'short') + ' break.' : 'Break over. Back to it.');
      nextPhase(true);
      return;
    }
    flush(); T.runStart = 0;
    const x = T.session && RH.findSession && RH.findSession(T.session);
    if (x && !x.done) C.toast('Time is up for "' + RH.views.sessTitle(x) + '".', { action: 'Mark done', fn: () => RH.actions['sess-done']({ dataset: { id: x.id } }) });
    else C.toast(T.mode === 'exam' ? 'Time is up. Pens down.' : 'Time is up.');
    paint();
  }
  function loop() {
    clearInterval(T.tick);
    T.tick = setInterval(function () {
      if (!T.running) return;
      const now = Date.now();
      const dt = (now - T.lastTick) / 1000;
      T.lastTick = now;
      if (counting() && !(F.on && F.status === 'away') && !(F.on && F.status === 'distracted' && st().focus.prefs.sideways)) T.acc += dt;
      if (T.mode === 'stopwatch') { T.elapsed = (now - T.startedAt) / 1000; paint(); return; }
      T.left = (T.endsAt - now) / 1000;
      if (T.mode === 'exam') [30, 10, 5].forEach(function (m) {
        if (T.left <= m * 60 && T.total > m * 60 && !T.warned[m]) { T.warned[m] = 1; if (pomo().sound) C.chime('warn'); C.toast(m + ' minutes left'); }
      });
      if (T.left <= 0) finish();
      paint();
    }, 250);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && T.acc >= 60) flush(); });

  // ---------- Painting ----------
  function current() { return T.mode === 'stopwatch' ? T.elapsed : T.left; }
  function paint() {
    const pill = $('#timerBtn');
    if (pill) {
      const active = T.running || (T.mode === 'stopwatch' ? T.elapsed > 0 : T.left !== T.total);
      pill.classList.toggle('running', T.running);
      $('#timerLabel').textContent = active ? (T.mode === 'pomo' ? PHASE[T.phase] + ' ' : '') + fmt(current()) : 'Focus';
    }
    const clock = $('#fx-clock');
    if (!clock) return;
    clock.textContent = fmt(current());
    const ring = $('#fx-ring');
    if (ring) {
      const f = T.mode === 'stopwatch' ? (T.elapsed % 60) / 60 : 1 - T.left / T.total;
      const c = 2 * Math.PI * 46;
      ring.setAttribute('stroke-dasharray', (c * f).toFixed(1) + ' ' + c.toFixed(1));
    }
    const play = $('#fx-play');
    if (play) play.innerHTML = T.running ? C.icon('pause') + 'Pause' : C.icon('play') + ((T.mode === 'stopwatch' ? T.elapsed : T.total - T.left) > 0.5 ? 'Resume' : 'Start');
    const ph = $('#fx-phase');
    if (ph) ph.textContent = T.mode === 'pomo' ? PHASE[T.phase] + ' · block ' + (T.cycle % pomo().cycles + (T.phase === 'focus' ? 1 : 0)) + ' of ' + pomo().cycles : T.mode === 'exam' ? (!T.running && T.left === T.total ? 'Ready when you are' : !T.running ? 'Paused' : T.left < 300 ? 'Final minutes' : 'Exam in progress') : T.mode === 'countdown' ? (T.running ? 'Counting down' : 'Countdown') : 'Stopwatch';
    const acc = $('#fx-acc');
    if (acc) acc.textContent = U.dur(T.acc / 60);
    const laps = $('#fx-laps');
    if (laps) laps.innerHTML = T.laps.map((l, i) => '<li><span class="muted">Lap ' + (i + 1) + '</span><span class="num">' + fmt(l) + '</span></li>').join('');
  }
  T.paint = paint;

  T.forSession = function (x) {
    T.session = x.id;
    if (!T.running) { flush(); T.mode = 'countdown'; T.lastCountdown = x.m * 60; setTotal(x.m * 60); }
  };

  // ---------- Webcam focus tracker ----------
  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
  const F = RH.face = { on: false, status: 'off', msg: '', lastSeen: 0, awayStart: 0, sideSince: 0, autoPaused: false, stream: null, detect: null, iv: null, engine: '', today: { away: 0 } };
  const STATUS = { off: ['Off', ''], loading: ['Starting camera…', ''], present: ['At your desk', 'ok'], distracted: ['Looking away', 'warn'], away: ['Away from desk', 'bad'], error: ['Not available', 'bad'] };

  async function mediapipe() {
    const vision = await import(MP + '/vision_bundle.mjs');
    const files = await vision.FilesetResolver.forVisionTasks(MP + '/wasm');
    const det = await vision.FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', minDetectionConfidence: 0.6 });
    F.engine = 'MediaPipe face detection';
    return function (video) {
      const r = det.detectForVideo(video, performance.now());
      return (r.detections || []).map((d) => ({ score: d.categories && d.categories[0] ? d.categories[0].score : 1, kp: d.keypoints || [] }));
    };
  }
  async function nativeDetector() {
    if (!('FaceDetector' in window)) throw new Error('no detector');
    const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    F.engine = 'Built-in face detection';
    return async (video) => (await fd.detect(video)).map(() => ({ score: 1, kp: [] }));
  }

  // How far the head is turned: 0 facing the screen, about 0.5 or more turned to the side.
  function yaw(kp) {
    if (!kp || kp.length < 3) return 0;
    const re = kp[0], le = kp[1], nose = kp[2];
    const span = Math.abs(re.x - le.x);
    return span > 0.01 ? Math.abs(nose.x - (re.x + le.x) / 2) / span : 0;
  }

  function setStatus(s, msg) {
    const was = F.status;
    F.status = s; F.msg = msg || '';
    const now = Date.now();
    if (was !== 'away' && s === 'away') {
      F.awayStart = now; T.away++; F.today.away++;
      const p = st().focus.prefs;
      if (p.chime) C.chime('away');
      if (p.pauseAway && T.running && T.mode !== 'exam' && counting()) { T.pause(); F.autoPaused = true; C.toast('Timer paused: you left your desk.'); }
    }
    if (was === 'away' && s !== 'away') {
      T.awayMs += now - F.awayStart;
      if (F.autoPaused) { F.autoPaused = false; T.start(); C.toast('Welcome back. Timer resumed.'); }
    }
    paintCam();
  }

  F.start = async function () {
    if (F.on) return;
    if (RH.ai.inClaude) { F.on = false; setStatus('error', 'The camera can’t be used inside claude.ai. Open preview.html in Chrome, Edge, Firefox or Safari to use the focus tracker.'); RH.render({ keepScroll: true }); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus('error', 'This browser can’t use a camera here.'); RH.render({ keepScroll: true }); return; }
    F.on = true; setStatus('loading');
    RH.render({ keepScroll: true });
    try {
      F.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      F.on = false; setStatus('error', e && e.name === 'NotAllowedError' ? 'Camera permission was refused. Allow the camera for this page in your browser settings.' : 'No camera was found.');
      RH.render({ keepScroll: true });
      return;
    }
    const video = $('#camVideo');
    video.srcObject = F.stream;
    try { await video.play(); } catch (e) { /* plays once metadata loads */ }
    try { F.detect = await mediapipe(); }
    catch (e) {
      try { F.detect = await nativeDetector(); }
      catch (e2) { F.stop(); setStatus('error', 'Face detection could not load. It needs an internet connection the first time.'); RH.render({ keepScroll: true }); return; }
    }
    F.lastSeen = Date.now();
    setStatus('present');
    F.iv = setInterval(tick, 400);
    RH.render({ keepScroll: true });
  };
  F.stop = function () {
    clearInterval(F.iv); F.iv = null;
    if (F.stream) F.stream.getTracks().forEach((t) => t.stop());
    F.stream = null; F.on = false; F.detect = null;
    const video = $('#camVideo'); if (video) video.srcObject = null;
    if (F.autoPaused) { F.autoPaused = false; }
    setStatus('off');
  };
  let busy = false;
  async function tick() {
    const video = $('#camVideo');
    if (!F.detect || busy || !video || video.readyState < 2) return;
    busy = true;
    try {
      const faces = await F.detect(video);
      const now = Date.now(), secs = (Number(st().focus.prefs.awaySecs) || 20) * 1000;
      const best = faces.filter((f) => f.score >= 0.7)[0];
      if (best) {
        F.lastSeen = now;
        const turned = yaw(best.kp) > 0.42;
        if (turned) { if (!F.sideSince) F.sideSince = now; } else F.sideSince = 0;
        setStatus(F.sideSince && now - F.sideSince > secs ? 'distracted' : 'present');
      } else if (now - F.lastSeen > secs) setStatus('away');
    } catch (e) { /* skip a frame */ }
    busy = false;
  }
  function paintCam() {
    const dock = $('#camDock');
    if (dock) {
      dock.hidden = !F.on;
      dock.dataset.status = F.status;
      const l = $('#camLabel'); if (l) l.textContent = STATUS[F.status][0];
    }
    const s = $('#fx-cam-status');
    if (s) { s.className = 'chip ' + STATUS[F.status][1]; s.textContent = STATUS[F.status][0]; }
  }
  F.paint = paintCam;

  // ---------- Page ----------
  function todayFocus() {
    const t = U.today();
    return st().focus.log.filter((x) => x.date === t).reduce((a, x) => a + (x.focused || 0), 0);
  }
  function weekFocus() {
    const ws = U.weekStart(U.today()), we = U.addDays(ws, 6);
    return st().focus.log.filter((x) => x.date >= ws && x.date <= we).reduce((a, x) => a + (x.focused || 0), 0);
  }

  RH.views.focus = function () {
    const mode = T.mode, p = pomo(), s = st(), fp = s.focus.prefs;
    const x = T.session && RH.findSession && RH.findSession(T.session);
    const w = RH.deliv.week();
    const fItem = w && w.items.find((it) => it.kind === 'focus');
    const wk = weekFocus();
    let html = C.page({ eyebrow: 'Focus', title: 'Focus', lede: 'Time a session, and turn on the focus tracker so only time at your desk counts.' });
    html += '<div class="fx">';
    // Timer
    html += '<section class="card fx-timer">' + C.seg([['pomo', 'Pomodoro'], ['countdown', 'Countdown'], ['exam', 'Exam timer'], ['stopwatch', 'Stopwatch']], mode, 'data-action="fx-mode"') +
      (x ? '<p class="fx-for">' + C.stag(x.s) + '<b>' + esc(RH.views.sessTitle(x)) + '</b><span class="muted">' + esc(RH.KIND[x.k].label) + ' · ' + U.mins(x.m) + '</span></p>' : '') +
      '<p class="fx-phase" id="fx-phase"></p>' +
      '<div class="fx-dial"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="fx-track" cx="50" cy="50" r="46"/><circle class="fx-arc" id="fx-ring" cx="50" cy="50" r="46" stroke-dasharray="0 289"/></svg><span class="fx-clock num" id="fx-clock">' + fmt(current()) + '</span></div>';
    if (mode === 'countdown') html += C.seg([10, 15, 20, 25, 30, 45, 60, 90].map((m) => [m, m + 'm']), T.total / 60, 'data-action="fx-len"');
    if (mode === 'exam') html += '<div class="form-grid fx-exam"><label class="field"><span>Paper</span><select data-timer="paper"><option value="">Custom length</option>' + C.opts(examPapers().map((q) => [q.id, q.name + ' (' + U.mins(q.dur) + ')']), T.examPaper) + '</select></label>' +
      '<label class="field"><span>Extra time</span><select data-timer="extra">' + C.opts([[0, 'None'], [10, '10%'], [25, '25%'], [50, '50%']], T.extra) + '</select></label>' +
      (T.examPaper ? '' : '<label class="field"><span>Minutes</span><input type="number" min="5" max="300" step="5" data-timer="custom" value="' + (T.examCustom || 120) + '"></label>') + '</div>';
    html += '<div class="row-actions center"><button type="button" class="btn lg" id="fx-play" data-action="timer-play"></button>' +
      (mode === 'stopwatch' ? '<button type="button" class="btn alt" data-action="timer-lap">' + C.icon('flag') + 'Lap</button>' : '') +
      (mode === 'pomo' ? '<button type="button" class="btn alt" data-action="timer-skip">' + C.icon('later') + 'Skip to ' + (T.phase === 'focus' ? 'break' : 'focus') + '</button>' : '') +
      '<button type="button" class="btn ghost" data-action="timer-reset">Reset</button>' +
      (x && !x.done ? '<button type="button" class="btn ghost" data-action="sess-done" data-id="' + x.id + '">' + C.icon('tick') + 'Mark session done</button>' : '') + '</div>' +
      '<p class="muted small center">Focused time this run: <b class="num" id="fx-acc">' + U.dur(T.acc / 60) + '</b></p>' +
      (mode === 'stopwatch' ? '<ol class="laps" id="fx-laps"></ol>' : '') + '</section>';

    // Tracker + stats
    html += '<div class="fx-side"><section class="card fx-cam"><div class="card-head"><h2>' + C.icon('camera') + 'Focus tracker</h2><span id="fx-cam-status" class="chip ' + STATUS[F.status][1] + '">' + STATUS[F.status][0] + '</span></div>' +
      '<p class="muted small">Uses your webcam to check you are at your desk. If you walk away for ' + (fp.awaySecs || 20) + ' seconds the timer pauses and the time stops counting. Video is analysed on this device and never saved or sent anywhere.</p>' +
      (F.status === 'error' && F.msg ? '<p class="note bad-n">' + esc(F.msg) + '</p>' : '') +
      (RH.ai.inClaude ? '<p class="note">The camera is blocked inside claude.ai. Download or open <b>preview.html</b> in your browser to use the tracker.</p>' : '') +
      '<div class="row-actions">' + (F.on ? '<button type="button" class="btn alt" data-action="cam-stop">' + C.icon('stop') + 'Turn off</button>' : '<button type="button" class="btn" data-action="cam-start"' + (RH.ai.inClaude ? ' disabled' : '') + '>' + C.icon('camera') + 'Turn on the tracker</button>') + (F.engine && F.on ? '<span class="muted small">' + esc(F.engine) + '</span>' : '') + '</div>' +
      '<div class="form-grid">' + '<label class="field"><span>Away after</span><select data-fpref="awaySecs">' + C.opts([[10, '10 seconds'], [20, '20 seconds'], [45, '45 seconds'], [90, '90 seconds']], fp.awaySecs) + '</select></label></div>' +
      C.toggle('data-fpref="pauseAway"', 'Pause the timer when I leave', fp.pauseAway, 'Exam timers keep running, like a real exam.') +
      C.toggle('data-fpref="sideways"', 'Don’t count time looking sideways', fp.sideways, 'For example at your phone. Looking down at paper is fine.') +
      C.toggle('data-fpref="chime"', 'Sound when I leave', fp.chime) + '</section>';

    html += '<section class="card"><div class="card-head"><h2>Your focus</h2></div><div class="stats"><div class="stat"><span class="stat-n num">' + U.dur(todayFocus()) + '</span><span class="stat-l">today</span></div><div class="stat"><span class="stat-n num">' + U.dur(wk) + '</span><span class="stat-l">this week' + (fItem ? ' of ' + U.dur(fItem.target) : '') + '</span></div><div class="stat"><span class="stat-n num">' + F.today.away + '</span><span class="stat-l">times away today</span></div></div>' +
      (fItem ? C.bar(wk / fItem.target, wk >= fItem.target ? 'ok' : '', 'Weekly focus target') + '<p class="muted small">Weekly deliverable: ' + esc(fItem.title) + '</p>' : '') +
      '<ul class="list compact">' + s.focus.log.slice(-6).reverse().map((e) => '<li class="row"><span class="row-main"><b class="num">' + U.dur(e.focused) + '</b><span class="muted small">' + esc(U.fmtShort(e.date)) + ' · ' + esc({ pomo: 'Pomodoro', countdown: 'Countdown', exam: 'Exam timer', stopwatch: 'Stopwatch' }[e.mode] || e.mode) + (e.tracked ? ' · tracked' + (e.away ? ', away ' + e.away + '×' : '') : '') + '</span></span></li>').join('') + '</ul>' +
      (s.focus.log.length ? '' : '<p class="muted small">Sessions you time appear here.</p>') + '</section>';
    if (mode === 'pomo') html += '<details class="card fold"><summary><h2>Pomodoro settings</h2></summary><div class="fold-body"><div class="form-grid">' +
      [['focus', 'Focus (min)', 5, 120], ['short', 'Short break', 1, 30], ['long', 'Long break', 5, 60], ['cycles', 'Blocks before a long break', 2, 8]].map((f) => '<label class="field"><span>' + f[1] + '</span><input type="number" min="' + f[2] + '" max="' + f[3] + '" data-pomo="' + f[0] + '" value="' + p[f[0]] + '"></label>').join('') + '</div>' +
      C.toggle('data-pomo="auto"', 'Start the next block automatically', p.auto) + C.toggle('data-pomo="sound"', 'Sound at the end', p.sound) + '</div></details>';
    html += '</div></div>';
    setTimeout(paint, 0);
    return html;
  };

  // ---------- Actions ----------
  RH.actions['fx-mode'] = (el) => { T.setMode(el.dataset.v); RH.render({ keepScroll: true }); };
  RH.actions['fx-len'] = function (el) { T.lastCountdown = Number(el.dataset.v) * 60; flush(); setTotal(T.lastCountdown); RH.render({ keepScroll: true }); };
  RH.actions['timer-play'] = () => { if (T.running) { T.pause(); F.autoPaused = false; } else { C.primeAudio(); T.start(); } };
  RH.actions['timer-reset'] = () => T.reset();
  RH.actions['timer-skip'] = () => T.skip();
  RH.actions['timer-lap'] = () => { if (T.mode === 'stopwatch') { const now = T.running ? (Date.now() - T.startedAt) / 1000 : T.elapsed; T.laps.push(now - T.laps.reduce((a, l) => a + l, 0)); paint(); } };
  RH.actions['timer-open'] = function (el) {
    const x = el.dataset && el.dataset.id && RH.findSession(el.dataset.id);
    if (x) T.forSession(x);
    if (location.hash === '#focus') RH.render({ keepScroll: true }); else location.hash = 'focus';
  };
  RH.actions['cam-start'] = () => { C.primeAudio(); F.start(); };
  RH.actions['cam-stop'] = () => { F.stop(); RH.render({ keepScroll: true }); };

  RH.onChange.push(function (el) {
    if (el.dataset.timer === 'paper') { T.examPaper = el.value; flush(); setTotal(examSeconds()); RH.render({ keepScroll: true }); return true; }
    if (el.dataset.timer === 'extra') { T.extra = Number(el.value); setTotal(examSeconds()); paint(); return true; }
    if (el.dataset.timer === 'custom') { T.examCustom = U.clamp(Number(el.value) || 120, 5, 300); setTotal(examSeconds()); paint(); return true; }
    if (el.dataset.pomo) {
      const k = el.dataset.pomo;
      store.update(function (s) { s.prefs.pomo[k] = el.type === 'checkbox' ? el.checked : U.clamp(Number(el.value) || 1, 1, 180); }, { silent: true });
      if (T.mode === 'pomo' && !T.running && k !== 'auto' && k !== 'sound') setTotal(phaseLen(T.phase));
      paint();
      return true;
    }
    if (el.dataset.fpref) {
      const k = el.dataset.fpref;
      store.update(function (s) { s.focus.prefs[k] = el.type === 'checkbox' ? el.checked : Number(el.value); }, { silent: true });
      return true;
    }
    return false;
  });
})(window.RH = window.RH || {});
