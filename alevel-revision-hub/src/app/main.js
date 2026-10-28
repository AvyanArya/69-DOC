/* Router, event handling, modals, focus timer and exports. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, V = RH.views, esc = U.esc;
  const store = RH.store;
  const st = () => store.state;
  const $ = (sel, root) => (root || document).querySelector(sel);

  RH.ui = { week: null, filter: {}, justDone: null, fmDraft: null, testSubj: 'physics', paperSubj: 'physics', libOpen: null };
  const ui = RH.ui;

  // ---------- Routing ----------
  const RESERVED = { settings: 'preferences', sidebar: 'today', customize: 'preferences', upgrade: 'today', downloads: 'preferences' };
  function route() {
    const h = (location.hash || '').replace(/^#/, '');
    return RESERVED[h] || h || 'today';
  }
  let lastRoute = null;

  function render(opts) {
    const r = route();
    const view = $('#view');
    let html;
    if (r === 'today') html = V.today();
    else if (r === 'planner') html = V.planner();
    else if (r === 'exams') html = V.exams();
    else if (r === 'subjects') html = V.subjects();
    else if (r.indexOf('s-') === 0) html = V.subject(r.slice(2));
    else if (r.indexOf('t-') === 0) html = V.topic(r.slice(2));
    else if (r === 'papers') html = V.papers();
    else if (r === 'library') html = V.library();
    else if (r === 'guide') html = V.guide();
    else if (r === 'preferences') html = V.prefs();
    else if (r === 'more') html = V.more();
    else html = V.notFound();

    const keepScroll = opts && opts.keepScroll && r === lastRoute;
    const y = window.scrollY;
    const focusId = document.activeElement && document.activeElement.id;
    view.innerHTML = html;
    $('#nav').innerHTML = V.nav(r);
    $('#tabbar').innerHTML = V.tabbar(r);
    const t = r.indexOf('t-') === 0 && M.topic[r.slice(2)];
    const s = r.indexOf('s-') === 0 && M.subject[r.slice(2)];
    document.title = (t ? t.name + ' · ' : s ? s.name + ' · ' : '') + 'A-Level Revision Hub';
    if (keepScroll) {
      window.scrollTo(0, y);
      if (focusId) { const el = document.getElementById(focusId); if (el && el.focus) el.focus({ preventScroll: true }); }
    } else if (r !== lastRoute) {
      window.scrollTo(0, 0);
      if (lastRoute !== null) view.focus({ preventScroll: true });
    }
    lastRoute = r;
    timerPaint();
  }
  RH.render = render;

  // ---------- Toasts & modals ----------
  function toast(msg) {
    const root = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2800);
  }
  RH.toast = toast;

  let modalCleanup = null, lastFocus = null;
  function openModal(title, body, opts) {
    closeModal();
    lastFocus = document.activeElement;
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-bg" data-action="modal-close"></div><div class="modal' + (opts && opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title"' + (opts && opts.subj ? ' data-subj="' + opts.subj + '"' : '') + '>' +
      '<div class="modal-head"><h2 id="modal-title">' + title + '</h2><button type="button" class="btn-icon" data-action="modal-close" aria-label="Close">' + V.icon('x') + '</button></div><div class="modal-body">' + body + '</div></div>';
    root.hidden = false;
    const first = root.querySelector('.modal button, .modal a, .modal input');
    if (first) first.focus();
    modalCleanup = opts && opts.onClose;
  }
  function closeModal() {
    const root = $('#modal-root');
    if (root.hidden) return;
    root.hidden = true;
    root.innerHTML = '';
    if (modalCleanup) { const f = modalCleanup; modalCleanup = null; f(); }
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  let pendingConfirm = null;
  function confirmBox(title, text, yesLabel, onYes) {
    pendingConfirm = onYes;
    openModal(esc(title), '<p>' + esc(text) + '</p><div class="row-actions"><button type="button" class="btn danger-fill" data-action="confirm-yes">' + esc(yesLabel) + '</button><button type="button" class="btn-ghost" data-action="modal-close">Cancel</button></div>');
  }

  // ---------- State helpers ----------
  function topicState(s, gid) {
    if (!s.topics[gid]) s.topics[gid] = { c: 0, p: [], notes: '', last: null, n: 0 };
    const t = s.topics[gid];
    if (!Array.isArray(t.p)) t.p = [];
    return t;
  }
  function logActivity(s, d) { s.activity = s.activity || {}; s.activity[d] = (s.activity[d] || 0) + 1; }

  function buildPlan(quiet) {
    store.update(function (s) {
      s.plan.sessions = RH.planner.generate(s);
      s.plan.builtAt = Date.now();
    }, { plan: true });
    if (!quiet) toast('Plan rebuilt: ' + RH.planner.summary(st()).sessions + ' sessions to go');
  }

  function findSession(id) { return st().plan.sessions.find((x) => x.id === id); }

  function sessionModal(id) {
    const x = findSession(id);
    if (!x) return;
    const t = x.t && M.topic[x.t];
    const kind = RH.KIND[x.k];
    let body = '<p class="modal-meta">' + V.stag(x.s) + '<span class="kind k-' + x.k + '">' + esc(kind.label) + '</span><span class="mono">' + esc(U.fmt(x.d)) + ' · ' + U.mins(x.m) + '</span></p>' +
      (t ? '<p class="muted small">' + esc(t.comp.name) + '</p>' : '') + (x.why ? '<p class="small">' + esc(x.why) + '</p>' : '') +
      '<p class="sess-how">' + esc(kind.how) + '</p>';
    if (t) {
      body += '<h3 class="label">Confidence</h3>' + V.ragFull(t.gid, M.conf(st(), t.gid)) +
        '<div class="modal-res">' + V.resGroups(M.resources(t).filter((r) => r.k !== 'other').slice(0, 8)) + '</div>';
    } else if (x.e) {
      body += '<div class="modal-res">' + V.resGroups(M.subject[x.s].res.filter((r) => r.k === 'papers')) + '</div>';
    }
    body += '<div class="row-actions">' +
      '<button type="button" class="btn" data-action="sess-done" data-id="' + x.id + '" data-close="1">' + V.icon('check') + (x.done ? 'Mark not done' : 'Mark done') + '</button>' +
      (x.done ? '' : '<button type="button" class="btn-ghost" data-action="timer-open" data-id="' + x.id + '">' + V.icon('timer') + 'Focus timer</button><button type="button" class="btn-ghost" data-action="sess-later" data-id="' + x.id + '" data-close="1">' + V.icon('later') + 'Move to next day</button>') +
      (t ? '<a class="btn-ghost" href="#t-' + t.gid + '">Open topic</a>' : '') +
      '<button type="button" class="btn-ghost danger" data-action="sess-del" data-id="' + x.id + '">' + V.icon('trash') + 'Delete</button></div>';
    openModal(esc(V.sessTitle(x)), body, { subj: x.s, wide: true });
  }

  // ---------- Focus timer ----------
  const timer = { total: 25 * 60, left: 25 * 60, running: false, endsAt: 0, session: null, tick: null };
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }
  function timerPaint() {
    const btn = $('#timerBtn');
    if (btn) {
      btn.classList.toggle('running', timer.running);
      $('#timerLabel').textContent = timer.running || timer.left !== timer.total ? fmtClock(timer.left) : 'Focus timer';
    }
    const clock = $('#tm-clock');
    if (clock) {
      clock.textContent = fmtClock(timer.left);
      const ring = $('#tm-ring');
      if (ring) ring.style.setProperty('--p', String(1 - timer.left / timer.total));
      const play = $('#tm-play');
      if (play) play.innerHTML = timer.running ? V.icon('pause') + 'Pause' : V.icon('play') + (timer.left === timer.total ? 'Start' : 'Resume');
    }
  }
  function chime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.25, 0.5].forEach(function (t, i) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = [660, 880, 990][i];
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
      });
    } catch (e) { /* sound is optional */ }
  }
  function timerLoop() {
    clearInterval(timer.tick);
    timer.tick = setInterval(function () {
      if (!timer.running) return;
      timer.left = (timer.endsAt - Date.now()) / 1000;
      if (timer.left <= 0) {
        timer.left = 0; timer.running = false; clearInterval(timer.tick);
        chime();
        const x = timer.session && findSession(timer.session);
        toast('Time is up. Take a ' + st().plan.settings.breakLen + '-minute break.');
        if (x && !x.done) timerModal();
      }
      timerPaint();
    }, 250);
  }
  function timerModal(sessionId) {
    if (sessionId && sessionId !== timer.session) {
      const x = findSession(sessionId);
      timer.session = sessionId;
      if (x && !timer.running) { timer.total = timer.left = Math.min(x.m, 120) * 60; }
    }
    const x = timer.session && findSession(timer.session);
    const lens = [25, 45, 60, 90];
    const body = '<div class="timer">' +
      (x ? '<p class="tm-for">' + V.stag(x.s) + esc(V.sessTitle(x)) + '</p><p class="sess-how">' + esc(RH.KIND[x.k].how) + '</p>' : '<p class="muted small">Work without distractions, then take a short break.</p>') +
      '<div class="tm-ring" id="tm-ring"><span class="tm-clock mono" id="tm-clock" aria-live="off">' + fmtClock(timer.left) + '</span></div>' +
      '<div class="seg-ctl tm-lens" role="group" aria-label="Length">' + lens.map((m) => '<button type="button" data-action="timer-len" data-v="' + m + '" class="' + (timer.total === m * 60 ? 'on' : '') + '">' + m + ' min</button>').join('') + '</div>' +
      '<div class="row-actions center"><button type="button" class="btn" id="tm-play" data-action="timer-play"></button><button type="button" class="btn-ghost" data-action="timer-reset">Reset</button>' +
      (x && !x.done ? '<button type="button" class="btn-ghost" data-action="sess-done" data-id="' + x.id + '" data-close="1">' + V.icon('check') + 'Mark session done</button>' : '') + '</div></div>';
    openModal('Focus timer', body);
    timerPaint();
  }

  // ---------- Exports ----------
  async function saveFile(name, text, mime) {
    const c = window.claude;
    const framed = window.top !== window;
    if (c && typeof c.use === 'function') {
      let dl = null;
      try { dl = await c.use('downloads'); } catch (e) { dl = null; }
      if (dl) {
        try { await dl.save({ filename: name, data: text }); toast('Saved ' + name); }
        catch (e) {
          if (e && e.code === 'declined') return;
          if (e && e.code === 'rate_limited') { toast('A save is already waiting for you to confirm.'); return; }
          copyText(text, 'This viewer cannot save ' + name.split('.').pop() + ' files, so the contents were copied. Paste them into a file named ' + name + '.');
        }
        return;
      }
      // Inside claude.ai without the download permission, plain download links do nothing.
      if (framed) { copyText(text, 'Copied. Paste into a file named ' + name + '.'); return; }
    }
    try {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      toast('Downloading ' + name);
    } catch (e) {
      copyText(text, 'Download was blocked, so the file contents were copied. Paste them into a file named ' + name + '.');
    }
  }
  function copyText(text, okMsg) {
    const done = () => toast(okMsg || 'Copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Select the text and copy it yourself.'); }
      ta.remove();
    }
  }

  function calendarItems() {
    const s = st(), today = U.today();
    const items = [];
    M.upcomingExams(s).forEach(function (e) {
      items.push({ kind: 'exam', date: e.date, time: e.time || '09:00', mins: e.dur, title: (e.official ? e.code + ' ' : '') + e.full.replace(/^Paper/, e.title.split(' Paper')[0] + ' Paper'), desc: e.official ? 'Pearson Edexcel. Check your centre for the room.' : 'Mock / test' });
    });
    const byDay = {};
    s.plan.sessions.filter((x) => x.d >= today && !x.done).forEach((x) => { (byDay[x.d] = byDay[x.d] || []).push(x); });
    Object.keys(byDay).sort().forEach(function (d) {
      const list = byDay[d];
      const total = list.reduce((a, x) => a + x.m, 0);
      items.push({ kind: 'day', date: d, title: 'Revision: ' + U.mins(total), desc: list.map((x) => '• ' + M.subject[x.s].name + ': ' + V.sessTitle(x) + ' (' + RH.KIND[x.k].label + ', ' + U.mins(x.m) + ')').join('\n') });
    });
    return items;
  }
  function exportICS() {
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const escI = (t) => String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//A-Level Revision Hub//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:A-Level revision'];
    calendarItems().forEach(function (it, i) {
      const d = it.date.replace(/-/g, '');
      lines.push('BEGIN:VEVENT', 'UID:alh-' + d + '-' + i + '@revision-hub', 'DTSTAMP:' + stamp);
      if (it.kind === 'exam') {
        const p = it.time.split(':').map(Number);
        const end = new Date(2000, 0, 1, p[0], p[1] + it.mins);
        lines.push('DTSTART;TZID=Europe/London:' + d + 'T' + pad(p[0]) + pad(p[1]) + '00', 'DTEND;TZID=Europe/London:' + d + 'T' + pad(end.getHours()) + pad(end.getMinutes()) + '00');
      } else {
        lines.push('DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + U.addDays(it.date, 1).replace(/-/g, ''), 'TRANSP:TRANSPARENT');
      }
      lines.push('SUMMARY:' + escI(it.title), 'DESCRIPTION:' + escI(it.desc), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    saveFile('a-level-revision.ics', lines.join('\r\n'), 'text/calendar');
  }
  function exportCSV() {
    const q = (t) => '"' + String(t).replace(/"/g, '""') + '"';
    const us = (d) => { const p = d.split('-'); return p[1] + '/' + p[2] + '/' + p[0]; };
    const rows = [['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description'].join(',')];
    calendarItems().forEach(function (it) {
      if (it.kind === 'exam') {
        const p = it.time.split(':').map(Number);
        const end = new Date(2000, 0, 1, p[0], p[1] + it.mins);
        const t12 = (h, m) => ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM');
        rows.push([q(it.title), us(it.date), t12(p[0], p[1]), us(it.date), t12(end.getHours(), end.getMinutes()), 'False', q(it.desc)].join(','));
      } else {
        rows.push([q(it.title), us(it.date), '', us(it.date), '', 'True', q(it.desc)].join(','));
      }
    });
    saveFile('a-level-revision.csv', rows.join('\r\n'), 'text/csv');
  }

  // ---------- Search ----------
  let searchSel = -1;
  function searchPaint() {
    const q = $('#q').value.trim();
    const box = $('#qres');
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    const hits = M.search(st(), q);
    searchSel = hits.length ? 0 : -1;
    box.innerHTML = hits.length ? hits.map((t, i) => '<a role="option" id="qr-' + i + '" href="#t-' + t.gid + '" class="qr' + (i === 0 ? ' sel' : '') + '" data-subj="' + t.subject.id + '">' + V.stag(t.subject.id) + '<span><b>' + esc(t.name) + '</b><span class="muted small">' + esc(t.comp.name) + '</span></span></a>').join('')
      : '<p class="qr-none muted small">No topics match "' + esc(q) + '".</p>';
    box.hidden = false;
  }
  function searchClose() { $('#qres').hidden = true; }

  // ---------- Actions ----------
  const actions = {
    'rate': function (el) {
      const gid = el.dataset.id; let v = Number(el.dataset.v);
      store.update(function (s) {
        const t = topicState(s, gid);
        if (el.dataset.toggle && t.c === v) v = 0;
        t.c = v; s.ratedAt = Date.now();
      });
    },
    'pt-toggle': function (el) {
      const gid = el.dataset.id, i = Number(el.dataset.i);
      store.update(function (s) {
        const t = topicState(s, gid);
        const at = t.p.indexOf(i);
        if (el.checked && at === -1) t.p.push(i);
        if (!el.checked && at !== -1) t.p.splice(at, 1);
      }, { silent: true });
      const head = el.closest('.sheet').querySelector('.sec-head .mono');
      if (head) head.textContent = topicState(st(), gid).p.length + '/' + M.topic[gid].pts.length;
    },
    'mark-revised': function (el) {
      const today = U.today();
      store.update(function (s) { const t = topicState(s, el.dataset.id); t.n = (t.n || 0) + 1; t.last = today; logActivity(s, today); });
      toast('Marked as revised today');
    },
    'toggle-nt': function (el) {
      store.update(function (s) { topicState(s, el.dataset.id).nt = el.checked; s.ratedAt = Date.now(); });
    },
    'comp-nt': function (el) {
      const c = M.subjects.map((s) => s.comps.find((x) => x.gid === el.dataset.comp)).find(Boolean);
      const v = el.dataset.v === '1';
      store.update(function (s) { c.topics.forEach((t) => { topicState(s, t.gid).nt = v; }); s.ratedAt = Date.now(); }, { keepScroll: true });
    },
    'add-today': function (el) {
      const t = M.topic[el.dataset.id];
      const S = st().plan.settings;
      store.update(function (s) {
        s.plan.sessions.push({ id: U.uid(), d: U.today(), k: M.conf(s, t.gid) >= 2 ? 'practice' : 'learn', s: t.subject.id, t: t.gid, m: S.sessionLen, why: 'Added by you' });
        s.plan.sessions.sort((a, b) => a.d.localeCompare(b.d));
      }, { plan: true });
      toast('Added "' + t.name + '" to today');
    },
    'sess-open': (el) => sessionModal(el.dataset.id),
    'sess-done': function (el) {
      const id = el.dataset.id;
      const x = findSession(id);
      if (!x) return;
      const today = U.today();
      store.update(function (s) {
        const y = s.plan.sessions.find((q) => q.id === id);
        y.done = !y.done;
        if (y.done) {
          logActivity(s, today);
          if (y.t) { const t = topicState(s, y.t); t.n = (t.n || 0) + 1; t.last = y.d < today ? y.d : today; }
        }
      }, { plan: true, silent: true });
      ui.justDone = findSession(id).done ? id : null;
      if (el.dataset.close) closeModal();
      if (findSession(id).done) toast(x.t ? 'Nice. Rate how confident you feel now.' : 'Session done');
      render({ keepScroll: true });
    },
    'sess-later': function (el) {
      const id = el.dataset.id;
      store.update(function (s) {
        const y = s.plan.sessions.find((q) => q.id === id);
        const base = y.d < U.today() ? U.today() : y.d;
        y.d = U.addDays(base, 1);
        s.plan.sessions.sort((a, b) => a.d.localeCompare(b.d));
      }, { plan: true });
      if (el.dataset.close) closeModal();
      toast('Moved to ' + U.fmt(findSession(id).d));
    },
    'sess-del': function (el) {
      const id = el.dataset.id;
      confirmBox('Delete this session?', 'It will be removed from your plan. Rebuilding the plan may schedule the topic again.', 'Delete session', function () {
        store.update(function (s) { s.plan.sessions = s.plan.sessions.filter((q) => q.id !== id); }, { plan: true });
      });
    },
    'timer-open': (el) => timerModal(el.dataset.id),
    'timer-play': function () {
      if (timer.running) { timer.running = false; timer.left = (timer.endsAt - Date.now()) / 1000; }
      else { if (timer.left <= 0) timer.left = timer.total; timer.running = true; timer.endsAt = Date.now() + timer.left * 1000; timerLoop(); }
      timerPaint();
    },
    'timer-reset': function () { timer.running = false; timer.left = timer.total; timerPaint(); },
    'timer-len': function (el) {
      timer.running = false; timer.total = timer.left = Number(el.dataset.v) * 60;
      document.querySelectorAll('.tm-lens button').forEach((b) => b.classList.toggle('on', b === el));
      timerPaint();
    },
    'plan-build': () => buildPlan(),
    'preset': function (el) {
      const p = RH.PRESETS[el.dataset.v];
      store.update(function (s) {
        const S = s.plan.settings;
        ['wWeak', 'wUrg', 'wCov', 'spacing', 'interleave', 'ppWeeks', 'focusNext'].forEach((k) => { S[k] = p[k]; });
        S.preset = el.dataset.v; s.plan.settingsAt = Date.now();
      });
      buildPlan(true);
      toast(p.label + ' plan built');
    },
    'week-prev': () => { ui.week = U.addDays(ui.week || U.weekStart(U.today()), -7); render({ keepScroll: true }); },
    'week-next': () => { ui.week = U.addDays(ui.week || U.weekStart(U.today()), 7); render({ keepScroll: true }); },
    'week-today': () => { ui.week = null; render({ keepScroll: true }); },
    'hol-add': function () {
      store.update(function (s) {
        const today = U.today();
        s.plan.settings.holidays.push({ id: 'h' + U.uid(), name: 'Busy week', from: today, to: U.addDays(today, 6), mins: 0 });
        s.plan.settingsAt = Date.now();
      }, { keepScroll: true });
    },
    'hol-del': function (el) {
      store.update(function (s) { s.plan.settings.holidays = s.plan.settings.holidays.filter((h) => h.id !== el.dataset.id); s.plan.settingsAt = Date.now(); });
    },
    'exam-toggle': function (el) {
      store.update(function (s) { if (el.checked) delete s.exams.off[el.dataset.id]; else s.exams.off[el.dataset.id] = true; s.plan.settingsAt = Date.now(); });
    },
    'test-del': function (el) {
      const c = st().exams.custom.find((x) => x.id === el.dataset.id);
      confirmBox('Delete "' + (c ? c.name : 'test') + '"?', 'The plan will stop revising for it after the next rebuild.', 'Delete test', function () {
        store.update(function (s) { s.exams.custom = s.exams.custom.filter((x) => x.id !== el.dataset.id); s.plan.settingsAt = Date.now(); });
      });
    },
    'fm-save': function () {
      const picked = Array.prototype.slice.call(document.querySelectorAll('[data-fmopt]:checked')).map((i) => i.dataset.fmopt);
      if (picked.length < 1) { toast('Tick at least one option.'); return; }
      if (picked.length > 2) { toast('Pick two options at most.'); return; }
      store.update(function (s) { s.profile.fmOptions = picked; s.plan.settingsAt = Date.now(); });
      ui.fmDraft = null;
      buildPlan(true);
      toast('Options saved and plan rebuilt');
    },
    'welcome-dismiss': () => store.update(function (s) { s.profile.welcomed = true; }),
    'filter': function (el) {
      const sid = el.dataset.subj;
      ui.filter[sid] = Object.assign({ c: 'all', paper: 'all' }, ui.filter[sid]);
      ui.filter[sid][el.dataset.k] = el.dataset.v;
      render({ keepScroll: true });
    },
    'filter-paper': function (el) {
      ui.filter[el.dataset.subj] = { c: 'all', paper: el.dataset.v };
      return true; // let the link navigate
    },
    'paper-del': function (el) {
      confirmBox('Delete this paper?', 'Its score will be removed from your log.', 'Delete', function () {
        store.update(function (s) { s.papers = s.papers.filter((p) => p.id !== el.dataset.id); });
      });
    },
    'theme': function (el) { store.update(function (s) { s.profile.theme = el.dataset.v; }); applyTheme(); },
    'export-json': () => saveFile('revision-hub-backup-' + U.today() + '.json', store.exportJSON(), 'application/json'),
    'import-text': function () {
      const text = $('#importText').value.trim();
      if (!text) { toast('Paste a backup first.'); return; }
      importBackup(text);
    },
    'reset-all': function () {
      confirmBox('Reset everything?', 'This deletes all ratings, notes, tests, paper scores and your plan on this device and in your account. Export a backup first if you might want it back.', 'Reset everything', function () {
        store.reset(); applyTheme(); buildPlan(true); toast('Everything was reset');
      });
    },
    'export-ics': exportICS,
    'export-csv': exportCSV,
    'modal-close': closeModal,
    'confirm-yes': function () { const f = pendingConfirm; pendingConfirm = null; closeModal(); if (f) f(); }
  };

  function importBackup(text) {
    try { store.importJSON(text); applyTheme(); toast('Backup imported'); }
    catch (e) { toast(e.message && e.message.indexOf('Revision Hub') !== -1 ? e.message : 'That file could not be read. Choose a .json backup from this hub.'); }
  }

  // ---------- Theme ----------
  const hostTheme = document.documentElement.getAttribute('data-theme');
  function applyTheme() {
    const t = st().profile.theme;
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else if (hostTheme) root.setAttribute('data-theme', hostTheme);
    else root.removeAttribute('data-theme');
  }

  // ---------- Wiring ----------
  document.addEventListener('click', function (ev) {
    const el = ev.target.closest('[data-action]');
    if (!el) {
      if (!ev.target.closest('.search')) searchClose();
      return;
    }
    const fn = actions[el.dataset.action];
    if (!fn) return;
    if (el.tagName === 'INPUT') return; // checkboxes are handled on change
    const allowDefault = fn(el, ev);
    if (!allowDefault && el.tagName === 'A') ev.preventDefault();
  });

  document.addEventListener('change', function (ev) {
    const el = ev.target;
    if (el.matches('input[data-action]')) { const fn = actions[el.dataset.action]; if (fn) fn(el, ev); return; }
    if (el.matches('[data-action="filter-select"]')) {
      const sid = el.dataset.subj;
      ui.filter[sid] = Object.assign({ c: 'all', paper: 'all' }, ui.filter[sid], { paper: el.value });
      render({ keepScroll: true });
      return;
    }
    if (el.dataset.set) {
      const key = el.dataset.set;
      const val = el.type === 'checkbox' ? el.checked : el.dataset.num ? Number(el.value) : el.value;
      store.update(function (s) { s.plan.settings[key] = val; s.plan.settings.preset = ['wWeak', 'wUrg', 'wCov', 'ppWeeks', 'spacing', 'interleave', 'focusNext'].indexOf(key) !== -1 ? 'custom' : s.plan.settings.preset; s.plan.settingsAt = Date.now(); }, { keepScroll: true });
      return;
    }
    if (el.dataset.week != null) {
      const i = Number(el.dataset.week);
      store.update(function (s) { s.plan.settings.week[i] = Math.round(U.clamp(Number(el.value) || 0, 0, 16) * 60); s.plan.settingsAt = Date.now(); }, { keepScroll: true });
      return;
    }
    if (el.dataset.subjw) {
      store.update(function (s) { s.plan.settings.subj[el.dataset.subjw] = Number(el.value); s.plan.settingsAt = Date.now(); }, { keepScroll: true });
      return;
    }
    if (el.dataset.hol) {
      store.update(function (s) {
        const h = s.plan.settings.holidays.find((x) => x.id === el.dataset.hol);
        if (!h) return;
        h[el.dataset.f] = el.dataset.f === 'mins' ? Math.round(U.clamp(Number(el.value) || 0, 0, 16) * 60) : el.value;
        s.plan.settingsAt = Date.now();
      }, { keepScroll: true });
      return;
    }
    if (el.dataset.fmopt) {
      ui.fmDraft = Array.prototype.slice.call(document.querySelectorAll('[data-fmopt]:checked')).map((i) => i.dataset.fmopt);
      return;
    }
    if (el.id === 'importFile' && el.files && el.files[0]) {
      const reader = new FileReader();
      reader.onload = () => importBackup(String(reader.result));
      reader.readAsText(el.files[0]);
      return;
    }
    if (el.id === 't-subj') { ui.testSubj = el.value; $('#t-comps').innerHTML = V.compPicks(el.value); return; }
    if (el.id === 'p-subj') { ui.paperSubj = el.value; render({ keepScroll: true }); }
  });

  let notesTimer = null;
  document.addEventListener('input', function (ev) {
    const el = ev.target;
    if (el.type === 'range') {
      const out = el.dataset.set ? $('#o-' + el.dataset.set) : el.dataset.subjw ? $('#o-subj-' + el.dataset.subjw) : null;
      if (out) out.textContent = el.value + (el.dataset.subjw ? '×' : '');
    }
    if (el.dataset.notes) {
      const gid = el.dataset.notes, val = el.value;
      clearTimeout(notesTimer);
      $('#notes-saved').textContent = 'Saving…';
      notesTimer = setTimeout(function () {
        store.update(function (s) { topicState(s, gid).notes = val; }, { silent: true });
        const tag = $('#notes-saved'); if (tag) tag.textContent = 'Saved';
      }, 500);
    }
    if (el.dataset.pref) {
      store.update(function (s) { s.profile[el.dataset.pref] = el.value.slice(0, 40); }, { silent: true });
    }
    if (el.id === 'q') searchPaint();
  });

  document.addEventListener('submit', function (ev) {
    const f = ev.target;
    if (f.id === 'testForm') {
      ev.preventDefault();
      const d = new FormData(f);
      const name = String(d.get('name') || '').trim(), date = String(d.get('date') || '');
      if (!name || !date) { toast('Give the test a name and a date.'); return; }
      store.update(function (s) {
        s.exams.custom.push({ id: 'c' + U.uid(), name: name, subject: String(d.get('subject')), date: date, time: String(d.get('time') || ''), dur: Number(d.get('dur')) || 60, comps: d.getAll('comps').map(String) });
        s.plan.settingsAt = Date.now();
      });
      toast('Test added. Rebuild the plan to revise for it.');
    }
    if (f.id === 'paperForm') {
      ev.preventDefault();
      const d = new FormData(f);
      const score = Number(d.get('score')), max = Number(d.get('max'));
      if (!(max > 0) || !(score >= 0) || score > max) { toast('Check the score: it must be between 0 and the total.'); return; }
      store.update(function (s) {
        s.papers.push({ id: 'p' + U.uid(), subject: String(d.get('subject')), paper: String(d.get('paper')), series: String(d.get('series') || '').trim(), score: score, max: max, date: String(d.get('date') || U.today()), notes: String(d.get('notes') || '').trim() });
        logActivity(s, U.today());
      });
      toast('Paper logged: ' + U.pct(score / max));
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { if (!$('#modal-root').hidden) closeModal(); else searchClose(); return; }
    if (ev.target.id === 'q') {
      const hits = document.querySelectorAll('#qres .qr');
      if (!hits.length) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        searchSel = (searchSel + (ev.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
        hits.forEach((h, i) => h.classList.toggle('sel', i === searchSel));
      } else if (ev.key === 'Enter' && searchSel >= 0) {
        ev.preventDefault();
        location.hash = hits[searchSel].getAttribute('href');
        ev.target.value = ''; searchClose(); ev.target.blur();
      }
    }
    if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { ev.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('focusin', function (ev) { if (ev.target.id === 'q' && ev.target.value) searchPaint(); });
  $('#qres').addEventListener('click', function (ev) { if (ev.target.closest('.qr')) { $('#q').value = ''; searchClose(); } });

  window.addEventListener('hashchange', function () { closeModal(); searchClose(); ui.justDone = null; render(); });

  store.on(function (why) {
    if (why === 'sync') { if (route() === 'preferences') render({ keepScroll: true }); return; }
    if (why === 'remote') applyTheme();
    render({ keepScroll: true });
  });

  // ---------- Boot ----------
  store.load();
  applyTheme();
  // A first visit opens with a starter plan, so Today shows real sessions straight away.
  if (!st().plan.builtAt) {
    st().plan.sessions = RH.planner.generate(st());
    st().plan.builtAt = Date.now();
  }
  render();
  store.connect().then(function () {
    if (!st().plan.builtAt) buildPlan(true);
  });
})(window.RH = window.RH || {});
