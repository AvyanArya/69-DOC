/* Focus timers: Pomodoro with breaks, exam timer with warnings, countdown and stopwatch.
   One timer runs at a time and keeps going while you move around the site. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;

  const T = RH.timer = {
    mode: 'pomo', phase: 'focus', cycle: 0, running: false,
    total: 25 * 60, left: 25 * 60, endsAt: 0,
    elapsed: 0, startedAt: 0, laps: [],
    session: null, examPaper: '', extra: 0, warned: {}, tick: null
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

  function setTotal(sec) { T.running = false; T.total = T.left = Math.max(1, Math.round(sec)); T.warned = {}; }

  T.setMode = function (mode) {
    if (T.mode === mode) return;
    T.mode = mode; T.running = false; T.elapsed = 0; T.laps = [];
    if (mode === 'pomo') { T.phase = 'focus'; setTotal(phaseLen('focus')); }
    else if (mode === 'exam') setTotal(examSeconds());
    else if (mode === 'countdown') setTotal(T.lastCountdown || 30 * 60);
    paint();
  };

  function examSeconds() {
    const p = examPapers().find((x) => x.id === T.examPaper);
    const mins = p ? p.dur : (T.examCustom || 120);
    return Math.round(mins * 60 * (1 + (T.extra || 0) / 100));
  }
  function examPapers() {
    const out = [];
    M.subjects.forEach((s) => s.papers.forEach((p) => out.push({ id: s.id + '-' + p.id, name: s.name + ' ' + p.code + ' ' + p.name.replace(/^Paper \w+: /, ''), dur: p.dur })));
    return out;
  }

  T.start = function () {
    if (T.running) return;
    if (T.mode === 'stopwatch') { T.startedAt = Date.now() - T.elapsed * 1000; }
    else { if (T.left <= 0) T.left = T.total; T.endsAt = Date.now() + T.left * 1000; }
    T.running = true;
    loop();
    paint();
  };
  T.pause = function () {
    if (!T.running) return;
    if (T.mode === 'stopwatch') T.elapsed = (Date.now() - T.startedAt) / 1000;
    else T.left = (T.endsAt - Date.now()) / 1000;
    T.running = false;
    paint();
  };
  T.reset = function () {
    T.running = false;
    if (T.mode === 'stopwatch') { T.elapsed = 0; T.laps = []; }
    else if (T.mode === 'pomo') setTotal(phaseLen(T.phase));
    else setTotal(T.total);
    T.warned = {};
    paint();
  };
  T.skip = function () { if (T.mode === 'pomo') nextPhase(false); };

  function nextPhase(finished) {
    if (T.phase === 'focus') {
      if (finished) T.cycle++;
      T.phase = T.cycle && T.cycle % pomo().cycles === 0 ? 'long' : 'short';
    } else T.phase = 'focus';
    setTotal(phaseLen(T.phase));
    if (finished && pomo().auto) T.start(); else paint();
  }

  function finish() {
    T.running = false; T.left = 0;
    if (pomo().sound) C.chime('end');
    if (T.mode === 'pomo') {
      const was = T.phase;
      C.toast(was === 'focus' ? 'Focus block done. Time for a ' + (((T.cycle + 1) % pomo().cycles === 0) ? 'long' : 'short') + ' break.' : 'Break over. Back to it.');
      nextPhase(true);
      return;
    }
    if (T.mode === 'exam') C.toast('Time is up. Pens down.');
    else C.toast('Time is up.');
    const x = T.session && RH.findSession && RH.findSession(T.session);
    if (x && !x.done) C.toast('Mark "' + RH.views.sessTitle(x) + '" as done from Today.');
    paint();
  }

  function loop() {
    clearInterval(T.tick);
    T.tick = setInterval(function () {
      if (!T.running) return;
      if (T.mode === 'stopwatch') { T.elapsed = (Date.now() - T.startedAt) / 1000; paint(); return; }
      T.left = (T.endsAt - Date.now()) / 1000;
      if (T.mode === 'exam') {
        [30, 10, 5].forEach(function (m) {
          if (T.left <= m * 60 && T.total > m * 60 && !T.warned[m]) { T.warned[m] = 1; if (pomo().sound) C.chime('warn'); C.toast(m + ' minutes left'); }
        });
      }
      if (T.left <= 0) finish();
      paint();
    }, 250);
  }

  // Display bits: the top bar pill, and the big clock on the Timers page.
  function current() { return T.mode === 'stopwatch' ? T.elapsed : T.left; }
  function paint() {
    const btn = $('#timerBtn');
    if (btn) {
      const active = T.running || (T.mode === 'stopwatch' ? T.elapsed > 0 : T.left !== T.total);
      btn.classList.toggle('running', T.running);
      $('#timerLabel').textContent = active ? (T.mode === 'pomo' ? PHASE[T.phase] + ' ' : '') + fmt(current()) : 'Timers';
    }
    const clock = $('#tm-clock');
    if (!clock) return;
    clock.textContent = fmt(current());
    const ring = $('#tm-ring');
    if (ring) ring.style.setProperty('--p', T.mode === 'stopwatch' ? String((T.elapsed % 60) / 60) : String(1 - T.left / T.total));
    const play = $('#tm-play');
    if (play) play.innerHTML = T.running ? C.icon('pause') + 'Pause' : C.icon('play') + ((T.mode === 'stopwatch' ? T.elapsed : T.total - T.left) > 0.5 ? 'Resume' : 'Start');
    const ph = $('#tm-phase');
    if (ph) ph.textContent = T.mode === 'pomo' ? PHASE[T.phase] + ' · block ' + (T.cycle % pomo().cycles + (T.phase === 'focus' ? 1 : 0)) + ' of ' + pomo().cycles : T.mode === 'exam' ? (!T.running && T.left === T.total ? 'Ready when you are' : !T.running ? 'Paused' : T.left < 300 ? 'Final minutes' : 'Exam in progress') : '';
    const laps = $('#tm-laps');
    if (laps) laps.innerHTML = T.laps.map((l, i) => '<li><span class="muted">Lap ' + (i + 1) + '</span><span class="mono">' + fmt(l) + '</span></li>').join('');
  }
  T.paint = paint;

  T.forSession = function (x) {
    T.session = x.id;
    if (!T.running) { T.mode = 'countdown'; T.lastCountdown = x.m * 60; setTotal(x.m * 60); }
  };

  // ---------- Page ----------
  RH.views.timers = function () {
    const mode = T.mode;
    const p = pomo();
    const x = T.session && RH.findSession && RH.findSession(T.session);
    let html = C.head('Tools', 'Timers', 'Pomodoro for focus blocks, an exam timer for timed papers, plus a countdown and stopwatch. The timer keeps running while you use the rest of the site.');
    html += C.tabs('timer', [['pomo', 'Pomodoro', 'timer'], ['exam', 'Exam timer', 'exams'], ['countdown', 'Countdown', 'today'], ['stopwatch', 'Stopwatch', 'flag']], mode);
    html += '<div class="timer-layout"><section class="sheet timer-main">';
    if (x) html += '<p class="tm-for">' + C.stag(x.s) + esc(RH.views.sessTitle(x)) + '</p><p class="help center">' + esc(RH.KIND[x.k].how) + '</p>';
    html += '<p class="tm-phase mono" id="tm-phase"></p><div class="tm-ring" id="tm-ring"><span class="tm-clock mono" id="tm-clock">' + fmt(current()) + '</span></div>';
    if (mode === 'countdown') html += '<div class="seg-ctl tm-lens" role="group" aria-label="Length">' + [10, 15, 20, 25, 30, 45, 60, 90].map((m) => '<button type="button" data-action="timer-len" data-v="' + m + '" class="' + (T.total === m * 60 ? 'on' : '') + '">' + m + '</button>').join('') + '</div>';
    if (mode === 'exam') {
      html += '<div class="two exam-pick"><div class="field"><label for="tm-paper">Paper</label><select id="tm-paper" data-timer="paper"><option value="">Custom length</option>' + examPapers().map((q) => '<option value="' + q.id + '"' + (q.id === T.examPaper ? ' selected' : '') + '>' + esc(q.name) + ' (' + U.mins(q.dur) + ')</option>').join('') + '</select></div>' +
        '<div class="field"><label for="tm-extra">Extra time</label><select id="tm-extra" data-timer="extra">' + [[0, 'None'], [10, '10%'], [25, '25%'], [50, '50%']].map((o) => '<option value="' + o[0] + '"' + (Number(T.extra) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div></div>' +
        (T.examPaper ? '' : '<div class="field narrow"><label for="tm-custom">Minutes</label><input type="number" id="tm-custom" min="5" max="300" step="5" data-timer="custom" value="' + (T.examCustom || 120) + '"></div>') +
        '<p class="help center">Warnings at 30, 10 and 5 minutes left. For a PDF paper with questions on screen, use the <a href="#portal">Exam portal</a>.</p>';
    }
    html += '<div class="row-actions center"><button type="button" class="btn btn-lg" id="tm-play" data-action="timer-play"></button>' +
      (mode === 'stopwatch' ? '<button type="button" class="btn-ghost" data-action="timer-lap">' + C.icon('flag') + 'Lap</button>' : '') +
      (mode === 'pomo' ? '<button type="button" class="btn-ghost" data-action="timer-skip">' + C.icon('later') + 'Skip to ' + (T.phase === 'focus' ? 'break' : 'focus') + '</button>' : '') +
      '<button type="button" class="btn-ghost" data-action="timer-reset">Reset</button>' +
      (x && !x.done ? '<button type="button" class="btn-ghost" data-action="sess-done" data-id="' + x.id + '">' + C.icon('check') + 'Mark session done</button>' : '') + '</div>';
    if (mode === 'stopwatch') html += '<ol class="laps" id="tm-laps"></ol>';
    html += '</section><aside class="timer-side">';
    if (mode === 'pomo') {
      html += '<section class="panel"><h2>Pomodoro settings</h2><div class="two">' +
        [['focus', 'Focus (min)', 5, 120], ['short', 'Short break', 1, 30], ['long', 'Long break', 5, 60], ['cycles', 'Blocks before long break', 2, 8]].map((f) =>
          '<div class="field"><label for="pm-' + f[0] + '">' + f[1] + '</label><input type="number" id="pm-' + f[0] + '" min="' + f[2] + '" max="' + f[3] + '" data-pomo="' + f[0] + '" value="' + p[f[0]] + '"></div>').join('') + '</div>' +
        '<label class="toggle"><input type="checkbox" data-pomo="auto"' + (p.auto ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text"><b>Start the next block automatically</b></span></label>' +
        '<label class="toggle"><input type="checkbox" data-pomo="sound"' + (p.sound ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text"><b>Sound at the end</b></span></label>' +
        '<p class="help">Completed focus blocks this visit: <b class="mono">' + T.cycle + '</b></p></section>';
    }
    html += '<section class="panel"><h2>Using timers well</h2><ul class="tips">' +
      '<li><b>Decide the task first.</b> "Do PMT capacitors questions 1–6" beats "revise physics".</li>' +
      '<li><b>Phone in another room.</b> Even face-down, it pulls your attention.</li>' +
      '<li><b>Breaks are off-screen.</b> Walk, stretch, drink water. Don\'t start a video.</li>' +
      '<li><b>Time your papers for real.</b> Use the exam timer with the real length so pacing becomes automatic.</li>' +
      '<li><b>Log what you finished</b> by marking the session done on Today.</li></ul></section>';
    html += '</aside></div>';
    setTimeout(paint, 0);
    return html;
  };

  RH.actions['timer-play'] = () => { if (T.running) T.pause(); else { C.primeAudio(); T.start(); } };
  RH.actions['timer-reset'] = () => T.reset();
  RH.actions['timer-skip'] = () => T.skip();
  RH.actions['timer-lap'] = () => { if (T.mode === 'stopwatch') { const now = T.running ? (Date.now() - T.startedAt) / 1000 : T.elapsed; const prev = T.laps.reduce((a, l) => a + l, 0); T.laps.push(now - prev); paint(); } };
  RH.actions['timer-len'] = function (el) {
    T.lastCountdown = Number(el.dataset.v) * 60;
    setTotal(T.lastCountdown);
    document.querySelectorAll('.tm-lens button').forEach((b) => b.classList.toggle('on', b === el));
    paint();
  };
  RH.actions['timer-open'] = function (el) {
    const x = el.dataset.id && RH.findSession(el.dataset.id);
    if (x) T.forSession(x);
    RH.ui.tabs.timer = T.mode;
    if (location.hash === '#timers') RH.render({ keepScroll: true }); else location.hash = 'timers';
  };
  RH.onTab.timer = (v) => T.setMode(v);

  RH.onChange.push(function (el) {
    if (el.dataset.timer === 'paper') { T.examPaper = el.value; setTotal(examSeconds()); RH.render({ keepScroll: true }); return true; }
    if (el.dataset.timer === 'extra') { T.extra = Number(el.value); setTotal(examSeconds()); paint(); return true; }
    if (el.dataset.timer === 'custom') { T.examCustom = U.clamp(Number(el.value) || 120, 5, 300); setTotal(examSeconds()); paint(); return true; }
    if (el.dataset.pomo) {
      const k = el.dataset.pomo;
      RH.store.update(function (s) { s.prefs.pomo[k] = el.type === 'checkbox' ? el.checked : U.clamp(Number(el.value) || 1, 1, 180); }, { silent: true });
      if (T.mode === 'pomo' && !T.running && k !== 'auto' && k !== 'sound') setTotal(phaseLen(T.phase));
      paint();
      return true;
    }
    return false;
  });
})(window.RH = window.RH || {});
