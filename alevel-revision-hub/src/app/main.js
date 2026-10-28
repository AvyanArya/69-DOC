/* Router, event wiring, the core actions (ratings, sessions, planner, settings) and calendar exports.
   Feature modules (portal, cards, timers) register their own pages and actions through RH.views / RH.actions. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, V = RH.views, C = RH.c, esc = U.esc;
  const store = RH.store;
  const st = () => store.state;
  const $ = RH.$;
  const ui = RH.ui;
  const A = RH.actions;

  // ---------- Routing ----------
  // Some names are reserved by the claude.ai viewer, so they map to other pages.
  const RESERVED = { settings: 'preferences', sidebar: 'today', customize: 'preferences', upgrade: 'today', downloads: 'preferences' };
  // Old links that are now tabs inside another page.
  const ALIAS = { exams: ['planner', 'plan', 'exams'], papers: ['portal', 'portal', 'results'], results: ['portal', 'portal', 'results'] };
  function route() {
    let h = (location.hash || '').replace(/^#/, '');
    h = RESERVED[h] || h || 'today';
    if (ALIAS[h]) {
      const a = ALIAS[h];
      ui.tabs[a[1]] = a[2];
      try { history.replaceState(null, '', '#' + a[0]); } catch (e) { /* file:// in some browsers */ }
      h = a[0];
    }
    return h;
  }
  RH.route = route;

  function pageFor(r) {
    const pre = (p) => r.indexOf(p) === 0 ? r.slice(p.length) : null;
    const simple = { today: V.today, planner: V.planner, subjects: V.subjects, portal: V.portal, exam: V.exam, mark: V.mark, cards: V.cards, study: V.study, timers: V.timers, practise: V.practise, library: V.library, guide: V.guide, preferences: V.prefs, more: V.more };
    if (simple[r]) return simple[r]();
    let x;
    if ((x = pre('s-')) !== null) return V.subject(x);
    if ((x = pre('c-')) !== null) return V.section(x);
    if ((x = pre('t-')) !== null) return V.topic(x);
    if ((x = pre('paper-')) !== null) return V.paper(x);
    if ((x = pre('deck-')) !== null) return V.deck(x);
    return V.notFound();
  }

  function titleFor(r) {
    const t = r.indexOf('t-') === 0 && M.topic[r.slice(2)];
    const c = r.indexOf('c-') === 0 && M.comp[r.slice(2)];
    const s = r.indexOf('s-') === 0 && M.subject[r.slice(2)];
    const names = { planner: 'Planner', portal: 'Exam portal', exam: 'Exam in progress', mark: 'Marking', cards: 'Flashcards', study: 'Studying', timers: 'Timers', practise: 'Practise', library: 'Resource library', guide: 'How to revise', preferences: 'Settings' };
    const name = t ? t.name : c ? c.name : s ? s.name : names[r];
    return (name ? name + ' · ' : '') + 'A-Level Revision Hub';
  }

  let lastRoute = null;
  function render(opts) {
    const r = route();
    const view = $('#view');
    let html;
    try { html = pageFor(r); }
    catch (e) {
      console.error(e);
      html = C.head('', 'Something went wrong', 'This page hit an error. Your saved data is safe.') + '<p class="mono small">' + esc(e && e.message) + '</p><a class="btn" href="#today">Go to Today</a>';
    }
    const keepScroll = opts && opts.keepScroll && r === lastRoute;
    const y = window.scrollY;
    const active = document.activeElement;
    const focusId = active && active.id && view.contains(active) ? active.id : null;
    view.innerHTML = html;
    $('#nav').innerHTML = V.nav(r);
    $('#tabbar').innerHTML = V.tabbar(r);
    document.title = titleFor(r);
    document.body.dataset.route = r.replace(/-.*/, '');
    if (keepScroll) {
      window.scrollTo(0, y);
      if (focusId) { const el = document.getElementById(focusId); if (el && el.focus) el.focus({ preventScroll: true }); }
    } else if (r !== lastRoute) {
      window.scrollTo(0, 0);
      if (lastRoute !== null) view.focus({ preventScroll: true });
    }
    lastRoute = r;
    RH.afterRender.forEach((fn) => { try { fn(r); } catch (e) { console.error(e); } });
    if (RH.timer) RH.timer.paint();
  }
  RH.render = render;

  // ---------- State helpers ----------
  function topicState(s, gid) {
    if (!s.topics[gid]) s.topics[gid] = { c: 0, p: [], notes: '', last: null, n: 0 };
    const t = s.topics[gid];
    if (!Array.isArray(t.p)) t.p = [];
    return t;
  }
  RH.topicState = topicState;
  function logActivity(s, d) { s.activity = s.activity || {}; s.activity[d] = (s.activity[d] || 0) + 1; }
  RH.logActivity = logActivity;

  function buildPlan(quiet) {
    store.update(function (s) {
      s.plan.sessions = RH.planner.generate(s);
      s.plan.builtAt = Date.now();
    }, { plan: true });
    if (!quiet) C.toast('Plan rebuilt: ' + RH.planner.summary(st()).sessions + ' sessions to go');
  }

  const findSession = (id) => st().plan.sessions.find((x) => x.id === id);
  RH.findSession = findSession;

  function sessionModal(id) {
    const x = findSession(id);
    if (!x) return;
    const t = x.t && M.topic[x.t];
    const kind = RH.KIND[x.k];
    let body = '<p class="modal-meta">' + C.stag(x.s) + '<span class="kind k-' + x.k + '">' + esc(kind.label) + '</span><span class="mono">' + esc(U.fmt(x.d)) + ' · ' + U.mins(x.m) + '</span></p>' +
      (t ? '<p class="muted small">' + esc(t.comp.name) + '</p>' : '') + (x.why ? '<p class="small">' + esc(x.why) + '</p>' : '') +
      '<p class="sess-how">' + esc(kind.how) + '</p>';
    if (t) {
      const vids = M.videos(t).slice(0, 4);
      body += '<h3 class="label">Confidence</h3>' + C.ragFull(t.gid, M.conf(st(), t.gid)) +
        (vids.length ? '<h3 class="label">Videos</h3>' + C.videoGrid(vids, t.subject.id) : '') +
        '<div class="modal-res">' + C.resGroups(M.resources(t, st()).filter((r) => r.k !== 'other').slice(0, 8)) + '</div>';
    } else if (x.e) {
      body += '<p class="small">Sit it in the <a href="#portal">Exam portal</a> to time it question by question, or download a paper:</p><div class="modal-res">' + C.resGroups(M.subject[x.s].res.filter((r) => r.k === 'papers')) + '</div>';
    }
    body += '<div class="row-actions">' +
      '<button type="button" class="btn" data-action="sess-done" data-id="' + x.id + '" data-close="1">' + C.icon('check') + (x.done ? 'Mark not done' : 'Mark done') + '</button>' +
      (x.done ? '' : '<button type="button" class="btn-ghost" data-action="timer-open" data-id="' + x.id + '">' + C.icon('timer') + 'Start a timer</button><button type="button" class="btn-ghost" data-action="sess-later" data-id="' + x.id + '" data-close="1">' + C.icon('later') + 'Move to next day</button>') +
      (t ? '<a class="btn-ghost" href="#t-' + t.gid + '">Open sub-topic</a>' : '') +
      '<button type="button" class="btn-ghost danger" data-action="sess-del" data-id="' + x.id + '">' + C.icon('trash') + 'Delete</button></div>';
    C.openModal(esc(V.sessTitle(x)), body, { subj: x.s, wide: true });
  }

  // ---------- Calendar exports ----------
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
    C.saveFile('a-level-revision.ics', lines.join('\r\n'), 'text/calendar');
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
    C.saveFile('a-level-revision.csv', rows.join('\r\n'), 'text/csv');
  }

  // ---------- Search ----------
  let searchSel = -1;
  function searchPaint() {
    const q = $('#q').value.trim();
    const box = $('#qres');
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    const hits = M.search(st(), q);
    searchSel = hits.length ? 0 : -1;
    box.innerHTML = hits.length ? hits.map((t, i) => '<a role="option" id="qr-' + i + '" href="#t-' + t.gid + '" class="qr' + (i === 0 ? ' sel' : '') + '" data-subj="' + t.subject.id + '">' + C.stag(t.subject.id) + '<span><b>' + esc(t.name) + '</b><span class="muted small">' + esc(t.comp.name) + '</span></span></a>').join('')
      : '<p class="qr-none muted small">No topics match "' + esc(q) + '".</p>';
    box.hidden = false;
  }
  function searchClose() { $('#qres').hidden = true; }

  // ---------- Actions ----------
  // Ratings and topics
  A.rate = function (el) {
    const gid = el.dataset.id; let v = Number(el.dataset.v);
    store.update(function (s) {
      const t = topicState(s, gid);
      if (el.dataset.toggle && t.c === v) v = 0;
      t.c = v; s.ratedAt = Date.now();
    });
    // A rating inside a dialog: the page behind re-renders, so update the dialog's buttons in place.
    document.querySelectorAll('#modal-root [data-action="rate"][data-id="' + gid + '"]').forEach(function (b) {
      const on = Number(b.dataset.v) === v;
      b.classList.toggle('on', on);
      b.setAttribute(b.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed', String(on));
    });
  };
  A['pt-toggle'] = function (el) {
    const gid = el.dataset.id, i = Number(el.dataset.i);
    store.update(function (s) {
      const t = topicState(s, gid);
      const at = t.p.indexOf(i);
      if (el.checked && at === -1) t.p.push(i);
      if (!el.checked && at !== -1) t.p.splice(at, 1);
    }, { silent: true });
    const n = topicState(st(), gid).p.length + '/' + M.topic[gid].pts.length;
    const head = el.closest('.sheet') && el.closest('.sheet').querySelector('.sec-head .mono');
    if (head) head.textContent = n;
    const tabN = document.querySelector('.tab-b[data-v="checklist"] .tab-n');
    if (tabN) tabN.textContent = n;
  };
  A['mark-revised'] = function (el) {
    const today = U.today();
    store.update(function (s) { const t = topicState(s, el.dataset.id); t.n = (t.n || 0) + 1; t.last = today; logActivity(s, today); });
    C.toast('Marked as revised today');
  };
  A['toggle-nt'] = function (el) {
    store.update(function (s) { topicState(s, el.dataset.id).nt = el.checked; s.ratedAt = Date.now(); });
  };
  A['comp-nt'] = function (el) {
    const c = M.comp[el.dataset.comp];
    const v = el.dataset.v === '1';
    store.update(function (s) { c.topics.forEach((t) => { topicState(s, t.gid).nt = v; }); s.ratedAt = Date.now(); });
  };
  A['add-today'] = function (el) {
    const t = M.topic[el.dataset.id];
    const S = st().plan.settings;
    store.update(function (s) {
      s.plan.sessions.push({ id: U.uid(), d: U.today(), k: M.conf(s, t.gid) >= 2 ? 'practice' : 'learn', s: t.subject.id, t: t.gid, m: S.sessionLen, why: 'Added by you' });
      s.plan.sessions.sort((a, b) => a.d.localeCompare(b.d));
    }, { plan: true });
    C.toast('Added "' + t.name + '" to today');
  };
  A['link-del'] = function (el) {
    const gid = el.dataset.id, i = Number(el.dataset.i);
    store.update(function (s) { const t = topicState(s, gid); (t.links || []).splice(i, 1); });
  };
  A.blurt = (el) => V.blurt(el.dataset.id);
  A['blurt-reveal'] = function () {
    const list = $('#blurt-list');
    if (list) { list.hidden = false; list.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  };

  // Tabs inside a page
  A.tab = function (el) {
    const group = el.dataset.group, v = el.dataset.v;
    ui.tabs[group] = v;
    if (RH.onTab[group]) RH.onTab[group](v);
    render({ keepScroll: true });
    const btn = document.querySelector('.tab-b[data-group="' + group + '"][data-v="' + v + '"]');
    if (btn) btn.focus({ preventScroll: true });
  };
  // Links that open a page on a given tab.
  function linkToTab(group, el) {
    ui.tabs[group] = el.dataset.v;
    if (el.getAttribute('href') === location.hash) { render(); return false; }
    return true;
  }
  A['topic-tab'] = (el) => linkToTab('topic', el);
  A['planner-tab'] = (el) => linkToTab('plan', el);

  // Sessions
  A['sess-open'] = (el) => sessionModal(el.dataset.id);
  A['sess-done'] = function (el) {
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
    if (el.dataset.close) C.closeModal();
    if (findSession(id).done) C.toast(x.t ? 'Nice. Rate how confident you feel now.' : 'Session done');
    render({ keepScroll: true });
  };
  A['sess-later'] = function (el) {
    const id = el.dataset.id;
    store.update(function (s) {
      const y = s.plan.sessions.find((q) => q.id === id);
      const base = y.d < U.today() ? U.today() : y.d;
      y.d = U.addDays(base, 1);
      s.plan.sessions.sort((a, b) => a.d.localeCompare(b.d));
    }, { plan: true });
    if (el.dataset.close) C.closeModal();
    C.toast('Moved to ' + U.fmt(findSession(id).d));
  };
  A['sess-del'] = function (el) {
    const id = el.dataset.id;
    C.confirm('Delete this session?', 'It will be removed from your plan. Rebuilding the plan may schedule the topic again.', 'Delete session', function () {
      store.update(function (s) { s.plan.sessions = s.plan.sessions.filter((q) => q.id !== id); }, { plan: true });
    });
  };

  // Planner
  A['plan-build'] = () => buildPlan();
  A.preset = function (el) {
    const p = RH.PRESETS[el.dataset.v];
    store.update(function (s) {
      const S = s.plan.settings;
      ['wWeak', 'wUrg', 'wCov', 'spacing', 'interleave', 'ppWeeks', 'focusNext'].forEach((k) => { S[k] = p[k]; });
      S.preset = el.dataset.v; s.plan.settingsAt = Date.now();
    }, { silent: true });
    buildPlan(true);
    C.toast(p.label + ' plan built');
  };
  A['week-prev'] = () => { ui.week = U.addDays(ui.week || U.weekStart(U.today()), -7); render({ keepScroll: true }); };
  A['week-next'] = () => { ui.week = U.addDays(ui.week || U.weekStart(U.today()), 7); render({ keepScroll: true }); };
  A['week-today'] = () => { ui.week = null; render({ keepScroll: true }); };
  A['hol-add'] = function () {
    store.update(function (s) {
      const today = U.today();
      s.plan.settings.holidays.push({ id: 'h' + U.uid(), name: 'Busy week', from: today, to: U.addDays(today, 6), mins: 0 });
      s.plan.settingsAt = Date.now();
    });
  };
  A['hol-del'] = function (el) {
    store.update(function (s) { s.plan.settings.holidays = s.plan.settings.holidays.filter((h) => h.id !== el.dataset.id); s.plan.settingsAt = Date.now(); });
  };
  A['exam-toggle'] = function (el) {
    store.update(function (s) { if (el.checked) delete s.exams.off[el.dataset.id]; else s.exams.off[el.dataset.id] = true; s.plan.settingsAt = Date.now(); });
  };
  A['test-del'] = function (el) {
    const c = st().exams.custom.find((x) => x.id === el.dataset.id);
    C.confirm('Delete "' + (c ? c.name : 'test') + '"?', 'The plan will stop revising for it after the next rebuild.', 'Delete test', function () {
      store.update(function (s) { s.exams.custom = s.exams.custom.filter((x) => x.id !== el.dataset.id); s.plan.settingsAt = Date.now(); });
    });
  };

  // Setup and settings
  A['fm-save'] = function () {
    const picked = Array.prototype.slice.call(document.querySelectorAll('[data-fmopt]:checked')).map((i) => i.dataset.fmopt);
    if (picked.length < 1) { C.toast('Tick at least one option.'); return; }
    if (picked.length > 2) { C.toast('Pick two options at most.'); return; }
    store.update(function (s) { s.profile.fmOptions = picked; s.plan.settingsAt = Date.now(); }, { silent: true });
    ui.fmDraft = null;
    buildPlan(true);
    C.toast('Options saved and plan rebuilt');
  };
  A['welcome-dismiss'] = () => store.update(function (s) { s.profile.welcomed = true; });
  A['paper-del'] = function (el) {
    C.confirm('Delete this paper?', 'Its score will be removed from your log.', 'Delete', function () {
      store.update(function (s) { s.papers = s.papers.filter((p) => p.id !== el.dataset.id); });
    });
  };
  A.theme = function (el) { store.update(function (s) { s.profile.theme = el.dataset.v; }); applyTheme(); };
  A['export-json'] = () => C.saveFile('revision-hub-backup-' + U.today() + '.json', store.exportJSON(), 'application/json');
  A['import-text'] = function () {
    const text = $('#importText').value.trim();
    if (!text) { C.toast('Paste a backup first.'); return; }
    importBackup(text);
  };
  A['reset-all'] = function () {
    C.confirm('Reset everything?', 'This deletes all ratings, notes, tests, flashcards, paper scores and your plan on this device and in your account. Export a backup first if you might want it back.', 'Reset everything', function () {
      store.reset(); applyTheme(); buildPlan(true); C.toast('Everything was reset');
    });
  };
  A['export-ics'] = exportICS;
  A['export-csv'] = exportCSV;
  A['modal-close'] = C.closeModal;
  A['confirm-yes'] = C.confirmYes;

  function importBackup(text) {
    try { store.importJSON(text); applyTheme(); C.toast('Backup imported'); }
    catch (e) { C.toast(e.message && e.message.indexOf('Revision Hub') !== -1 ? e.message : 'That file could not be read. Choose a .json backup from this hub.'); }
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
  const planKeys = ['wWeak', 'wUrg', 'wCov', 'ppWeeks', 'spacing', 'interleave', 'focusNext'];

  document.addEventListener('click', function (ev) {
    const el = ev.target.closest('[data-action]');
    if (!el) {
      if (!ev.target.closest('.search')) searchClose();
      return;
    }
    const fn = A[el.dataset.action];
    if (!fn) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return; // handled on change
    if (el.disabled) return;
    let allowDefault = false;
    try { allowDefault = fn(el, ev); }
    catch (e) { console.error(e); C.toast('That did not work: ' + (e && e.message || 'unknown error')); }
    if (allowDefault !== true && el.tagName === 'A') ev.preventDefault();
  });

  document.addEventListener('change', function (ev) {
    const el = ev.target;
    for (let i = 0; i < RH.onChange.length; i++) { if (RH.onChange[i](el, ev)) return; }
    if (el.matches('input[data-action]')) { const fn = A[el.dataset.action]; if (fn) fn(el, ev); return; }
    if (el.dataset.set) {
      const key = el.dataset.set;
      const val = el.type === 'checkbox' ? el.checked : el.dataset.num ? Number(el.value) : el.value;
      store.update(function (s) {
        const S = s.plan.settings;
        S[key] = val;
        if (planKeys.indexOf(key) !== -1) S.preset = 'custom';
        s.plan.settingsAt = Date.now();
      });
      return;
    }
    if (el.dataset.week != null) {
      const i = Number(el.dataset.week);
      store.update(function (s) { s.plan.settings.week[i] = Math.round(U.clamp(Number(el.value) || 0, 0, 16) * 60); s.plan.settingsAt = Date.now(); });
      return;
    }
    if (el.dataset.subjw) {
      store.update(function (s) { s.plan.settings.subj[el.dataset.subjw] = Number(el.value); s.plan.settingsAt = Date.now(); });
      return;
    }
    if (el.dataset.hol) {
      store.update(function (s) {
        const h = s.plan.settings.holidays.find((x) => x.id === el.dataset.hol);
        if (!h) return;
        h[el.dataset.f] = el.dataset.f === 'mins' ? Math.round(U.clamp(Number(el.value) || 0, 0, 16) * 60) : el.value;
        s.plan.settingsAt = Date.now();
      });
      return;
    }
    if (el.dataset.fmopt) {
      ui.fmDraft = Array.prototype.slice.call(document.querySelectorAll('[data-fmopt]:checked')).map((i) => i.dataset.fmopt);
      return;
    }
    if (el.dataset.prefnum) {
      const v = Math.round(U.clamp(Number(el.value) || 0, Number(el.min) || 0, Number(el.max) || 1000));
      store.update(function (s) { s.prefs[el.dataset.prefnum] = v; }, { silent: true });
      el.value = v;
      return;
    }
    if (el.id === 'importFile' && el.files && el.files[0]) {
      const reader = new FileReader();
      reader.onload = () => importBackup(String(reader.result));
      reader.readAsText(el.files[0]);
      el.value = '';
      return;
    }
    if (el.id === 't-subj') { ui.testSubj = el.value; $('#t-comps').innerHTML = V.compPicks(el.value); return; }
    if (el.id === 'p-subj') { ui.paperSubj = el.value; render({ keepScroll: true }); }
  });

  let notesTimer = null;
  document.addEventListener('input', function (ev) {
    const el = ev.target;
    for (let i = 0; i < RH.onInput.length; i++) { if (RH.onInput[i](el, ev)) return; }
    if (el.type === 'range') {
      const out = el.dataset.set ? $('#o-' + el.dataset.set) : el.dataset.subjw ? $('#o-subj-' + el.dataset.subjw) : null;
      if (out) out.textContent = el.value + (el.dataset.subjw ? '×' : '');
    }
    if (el.dataset.notes) {
      const gid = el.dataset.notes, val = el.value;
      clearTimeout(notesTimer);
      const tag = $('#notes-saved');
      if (tag) tag.textContent = 'Saving…';
      notesTimer = setTimeout(function () {
        store.update(function (s) { topicState(s, gid).notes = val; }, { silent: true });
        const t2 = $('#notes-saved'); if (t2) t2.textContent = 'Saved';
      }, 500);
    }
    if (el.dataset.pref) {
      store.update(function (s) { s.profile[el.dataset.pref] = el.value.slice(0, 40); }, { silent: true });
    }
    if (el.id === 'q') searchPaint();
  });

  document.addEventListener('submit', function (ev) {
    const f = ev.target;
    const hook = RH.onSubmit[f.id];
    if (hook) {
      ev.preventDefault();
      Promise.resolve().then(() => hook(f, ev)).catch(function (e) { console.error(e); C.toast(e && e.message || 'That did not work.'); });
      return;
    }
    if (f.id === 'testForm') {
      ev.preventDefault();
      const d = new FormData(f);
      const name = String(d.get('name') || '').trim(), date = String(d.get('date') || '');
      if (!name || !date) { C.toast('Give the test a name and a date.'); return; }
      store.update(function (s) {
        s.exams.custom.push({ id: 'c' + U.uid(), name: name, subject: String(d.get('subject')), date: date, time: String(d.get('time') || ''), dur: Number(d.get('dur')) || 60, comps: d.getAll('comps').map(String) });
        s.plan.settingsAt = Date.now();
      });
      C.toast('Test added. Rebuild the plan to revise for it.');
      return;
    }
    if (f.id === 'paperForm') {
      ev.preventDefault();
      const d = new FormData(f);
      const score = Number(d.get('score')), max = Number(d.get('max'));
      if (!(max > 0) || !(score >= 0) || score > max) { C.toast('Check the score: it must be between 0 and the total.'); return; }
      store.update(function (s) {
        s.papers.push({ id: 'p' + U.uid(), subject: String(d.get('subject')), paper: String(d.get('paper')), series: String(d.get('series') || '').trim(), score: score, max: max, date: String(d.get('date') || U.today()), notes: String(d.get('notes') || '').trim() });
        logActivity(s, U.today());
      });
      C.toast('Paper logged: ' + U.pct(score / max));
      return;
    }
    if (f.id === 'linkForm') {
      ev.preventDefault();
      const d = new FormData(f), gid = f.dataset.topic;
      const t = String(d.get('t') || '').trim().slice(0, 120);
      let u = String(d.get('u') || '').trim();
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      if (!t || u.length < 12) { C.toast('Give the link a name and an address.'); return; }
      store.update(function (s) { const ts = topicState(s, gid); ts.links = ts.links || []; ts.links.push({ t: t, u: u }); });
      C.toast('Link added');
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { if (C.modalOpen()) C.closeModal(); else searchClose(); return; }
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
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (RH.cards && RH.cards.key(ev)) return;
    if (RH.portal && RH.portal.key(ev)) return;
    if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { ev.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('focusin', function (ev) { if (ev.target.id === 'q' && ev.target.value) searchPaint(); });
  $('#qres').addEventListener('click', function (ev) { if (ev.target.closest('.qr')) { $('#q').value = ''; searchClose(); } });

  window.addEventListener('hashchange', function () { C.closeModal(); searchClose(); ui.justDone = null; render(); });

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
