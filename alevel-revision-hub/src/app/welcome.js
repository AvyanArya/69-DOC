/* Sign in and set up. On claude.ai the page knows who you are from your Claude account, and saves your progress
   there; anywhere else it saves in this browser. The setup is three short steps: subjects, your week, done. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const store = RH.store;
  const V = RH.views, A = RH.actions;

  // ---------- Who is signed in ----------
  const AC = RH.account = { me: null, inClaude: !!(window.claude && typeof window.claude.use === 'function'), ready: false };
  AC.load = async function () {
    if (!AC.inClaude) { AC.ready = true; return; }
    try {
      const u = await window.claude.use('user');
      if (u) AC.me = await u.me();
    } catch (e) { AC.me = null; }
    AC.ready = true;
    if (RH.render) RH.render({ keepScroll: true });
  };
  AC.first = () => ((AC.me && AC.me.name) || '').trim().split(/\s+/)[0] || '';
  AC.load();

  const LOGO = () => document.querySelector('.brand-logo') ? document.querySelector('.brand-logo').outerHTML : 'preppr.';
  const POINTS = [
    ['book', 'Every A-level, lesson by lesson', '21 subjects laid out as short lessons you work through in order.'],
    ['plan', 'A plan that fits your week', 'Revision is booked around school, clubs and the free time you want to keep.'],
    ['flask', 'Labs to try things out', 'Interactive experiments and diagrams for the sciences, economics and more.'],
    ['spark', 'Answers marked by Claude', 'Get exam answers marked like an examiner, with how to get full marks.']
  ];

  // ---------- Sign in ----------
  V.welcome = function () {
    const s = st(), me = AC.me, first = AC.first();
    const name = s.profile.name || first;
    let card = '<div class="wel-head"><h1>Sign in</h1><p class="muted">' + (s.profile.started ? 'You’re already set up. You can change your name here.' : 'Welcome to Preppr. It takes a minute to get started.') + '</p></div>';
    if (AC.inClaude) {
      const pic = me && me.avatarUrl ? '<img src="' + esc(me.avatarUrl) + '" alt="">' : C.icon('spark');
      card += '<div class="wel-acct"><span class="av lg">' + pic + '</span><span class="acct-t"><b>' + (me && me.name ? esc(me.name) : 'Your Claude account') + '</b><span>' + (AC.ready ? 'Signed in to claude.ai' : 'Checking your account…') + '</span></span>' + C.icon('tick', 'wel-ok') + '</div>';
    }
    card += '<label class="field"><span>What should we call you?</span><input id="w-name" maxlength="40" autocomplete="given-name" placeholder="Your first name" value="' + esc(name) + '"></label>';
    card += '<button type="button" class="btn lg block" data-action="wel-go">' + (AC.inClaude ? 'Continue' + (name ? ' as ' + esc(name) : '') : 'Continue') + C.icon('right') + '</button>';
    card += '<p class="help">' + (AC.inClaude
      ? 'Your progress is saved to your Claude account, so it follows you to any device where you open Preppr.'
      : 'Preppr saves your progress in this browser. To use it on more than one device, open Preppr on claude.ai, where it signs you in with your Claude account, or move your progress with Settings → Export backup.') + '</p>';
    if (!s.profile.started) card += '<div class="or"><span>or</span></div><button type="button" class="btn alt block" data-action="wel-skip">Look around first</button>';
    return '<div class="wel"><section class="wel-art"><div class="wel-logo">' + LOGO() + '</div><div class="wel-copy"><h2>Revision that plans itself.</h2><p>Open a lesson, work down the page, and Preppr keeps your week on track.</p></div>' +
      '<ul class="wel-points">' + POINTS.map((p) => '<li><span class="wp-ic">' + C.icon(p[0]) + '</span><span><b>' + p[1] + '</b><span>' + p[2] + '</span></span></li>').join('') + '</ul><span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span></section>' +
      '<section class="wel-card">' + card + '</section></div>';
  };
  function saveName() {
    const el = document.getElementById('w-name');
    const v = el ? el.value.trim().slice(0, 40) : '';
    store.update(function (s) { if (v) s.profile.name = v; }, { silent: true });
  }
  A['wel-go'] = function () {
    saveName();
    const again = st().profile.started;
    store.update(function (s) { s.profile.started = true; }, { silent: true });
    RH.ui.setupStep = 0;
    location.hash = again && st().profile.setupDone ? '#home' : '#setup';
  };
  A['wel-skip'] = function () {
    store.update(function (s) { s.profile.started = true; }, { silent: true });
    location.hash = '#home';
  };

  // ---------- Set up ----------
  const GROUPS = [
    ['Maths and sciences', ['maths', 'further', 'physics', 'chemistry', 'biology', 'compsci']],
    ['Humanities and social sciences', ['economics', 'psychology', 'geography', 'history', 'politics', 'englit']],
    ['Languages', ['french', 'spanish', 'arabic', 'latin']],
    ['Creative and active', ['art', 'dt', 'drama', 'music', 'pe']]
  ];
  const steps = () => ['subjects', 'week'].concat(M.isMine(M.subject.further) ? ['fm'] : []).concat(['done']);
  const hoursOpts = (max) => { const o = []; for (let h = 0; h <= max; h += 0.5) o.push([h * 60, h === 0 ? 'None' : (h % 1 ? h : h) + (h === 1 ? ' hour' : ' hours')]); return o; };
  const near = (v, step) => Math.round((Number(v) || 0) / step) * step;
  function subjCard(sub, act) {
    const on = M.isMine(sub), n = sub.comps.reduce((a, c) => a + c.topics.length, 0);
    return '<button type="button" class="sp' + (on ? ' on' : '') + '" data-subj="' + sub.id + '" data-action="' + (act || 'setup-subj') + '" data-id="' + sub.id + '" aria-pressed="' + on + '"><span class="sp-ic">' + esc((sub.tag || C.TAG[sub.id] || sub.name).slice(0, 3)) + '</span><span class="sp-t"><b>' + esc(sub.name) + '</b><span>' + esc(sub.board.replace('Pearson ', '')) + ' · ' + U.plural(n, 'lesson') + '</span></span><span class="sp-tick">' + C.icon('tick') + '</span></button>';
  }
  V.subjectPicker = function (act) {
    const seen = {};
    let html = '';
    GROUPS.forEach(function (g) {
      const list = g[1].map((id) => M.subject[id]).filter(Boolean);
      list.forEach((x) => { seen[x.id] = 1; });
      html += '<div class="sp-group"><p class="label">' + g[0] + '</p><div class="sp-grid">' + list.map((x) => subjCard(x, act)).join('') + '</div></div>';
    });
    const rest = M.all.filter((x) => !seen[x.id]);
    if (rest.length) html += '<div class="sp-group"><p class="label">More</p><div class="sp-grid">' + rest.map((x) => subjCard(x, act)).join('') + '</div></div>';
    return html;
  };
  V.setup = function () {
    const s = st(), list = steps();
    let i = U.clamp(RH.ui.setupStep || 0, 0, list.length - 1);
    const step = list[i], r = s.routine, wd = r.days[0], we = r.days[5];
    let body = '';
    if (step === 'subjects') {
      body = '<h1>Which subjects do you take?</h1><p class="lede">Pick as many as you like. You can change them any time in My Subjects.</p>' +
        '<p class="sp-count"><b>' + M.subjects.length + '</b> chosen: ' + M.subjects.map((x) => esc(x.name)).join(', ') + '</p>' + V.subjectPicker();
    } else if (step === 'week') {
      body = '<h1>What does your week look like?</h1><p class="lede">So every revision session fits around school. You can fine-tune each day later in Planner → My schedule.</p>' +
        '<div class="setup-grid">' +
        '<label class="field"><span>School starts</span><input type="time" data-setup="start" value="' + esc(wd.start) + '"></label>' +
        '<label class="field"><span>School ends</span><input type="time" data-setup="end" value="' + esc(wd.end) + '"></label>' +
        '<label class="field"><span>Bedtime on school nights</span><input type="time" data-setup="bed" value="' + esc(wd.bed) + '"></label>' +
        '<label class="field"><span>Revision on school days</span><select data-setup="wkStudy">' + C.opts(hoursOpts(5), near(wd.study, 30)) + '</select></label>' +
        '<label class="field"><span>Revision on Saturday and Sunday</span><select data-setup="weStudy">' + C.opts(hoursOpts(8), near(we.study, 30)) + '</select></label>' +
        '</div><p class="help">School days are Monday to Friday. Clubs, sport, travel time and holidays can be added in My schedule.</p>';
    } else if (step === 'fm') {
      body = '<h1>Your Further Maths options</h1><p class="lede">Pick the two options you sit for Papers 3 and 4, so your lessons and exams match.</p><div class="opt-grid">' + RH.FM_OPTIONS.map((o) => {
        const chosen = s.profile.fmOptions || RH.ui.fmDraft || ['fs1', 'fm1'];
        return '<label class="opt"><input type="checkbox" data-fmopt="' + o.id + '"' + (chosen.indexOf(o.id) !== -1 ? ' checked' : '') + '><span><b>' + esc(o.name) + '</b><span class="muted small num">' + esc(M.subject.further.paper[o.paper].code) + '</span></span></label>';
      }).join('') + '</div>';
    } else {
      const h = (m) => U.dur(Number(m) || 0);
      body = '<div class="done-ic">' + C.icon('tick') + '</div><h1>You’re all set' + (s.profile.name ? ', ' + esc(s.profile.name) : '') + '</h1><p class="lede">Preppr will plan your revision from today to your exams. Here’s what it’s working with:</p>' +
        '<ul class="sum-list"><li><span>Subjects</span><b>' + M.subjects.map((x) => esc(x.name)).join(', ') + '</b></li><li><span>School</span><b>' + esc(wd.start) + '–' + esc(wd.end) + ', Monday to Friday</b></li>' +
        '<li><span>Revision</span><b>' + h(wd.study) + ' on school days, ' + h(we.study) + ' at weekends</b></li></ul>';
    }
    const last = i === list.length - 1;
    return '<div class="setup"><header class="setup-top"><span class="setup-logo">' + LOGO() + '</span><ol class="setup-dots" aria-label="Step ' + (i + 1) + ' of ' + list.length + '">' + list.map((x, j) => '<li class="' + (j < i ? 'done' : j === i ? 'on' : '') + '"></li>').join('') + '</ol><a class="btn ghost sm" href="#home" data-action="setup-later">Finish later</a></header>' +
      '<section class="setup-card" data-step="' + step + '">' + body + '</section>' +
      '<footer class="setup-foot">' + (i ? '<button type="button" class="btn alt" data-action="setup-back">' + C.icon('left') + 'Back</button>' : '<span></span>') +
      (last ? '<button type="button" class="btn lg" data-action="setup-finish">Build my plan' + C.icon('right') + '</button>' : '<button type="button" class="btn lg" data-action="setup-next">Next' + C.icon('right') + '</button>') + '</footer></div>';
  };
  A['setup-subj'] = function (el) {
    const id = el.dataset.id;
    store.update(function (s) {
      const cur = (s.profile.subjects && s.profile.subjects.length ? s.profile.subjects : M.DEFAULT_MINE).slice();
      const i = cur.indexOf(id);
      if (i === -1) cur.push(id); else if (cur.length > 1) cur.splice(i, 1); else C.toast('Keep at least one subject.');
      s.profile.subjects = cur; s.plan.settingsAt = Date.now();
    });
  };
  A['setup-back'] = function () { RH.ui.setupStep = Math.max(0, (RH.ui.setupStep || 0) - 1); RH.render(); };
  A['setup-next'] = function () {
    const list = steps(), i = RH.ui.setupStep || 0;
    if (list[i] === 'fm' && !saveFm()) return;
    RH.ui.setupStep = i + 1;
    RH.render();
  };
  A['setup-later'] = function () { store.update(function (s) { s.profile.started = true; }, { silent: true }); return true; };
  function saveFm() {
    const picked = Array.prototype.slice.call(document.querySelectorAll('[data-fmopt]:checked')).map((x) => x.dataset.fmopt);
    if (picked.length < 1 || picked.length > 2) { C.toast('Pick one or two options.'); return false; }
    store.update(function (s) { s.profile.fmOptions = picked; s.plan.settingsAt = Date.now(); }, { silent: true });
    return true;
  }
  A['setup-finish'] = function () {
    store.update(function (s) {
      s.profile.started = true; s.profile.setupDone = true; s.profile.welcomed = true;
      s.routine.setupAt = s.routine.setupAt || Date.now(); s.plan.settingsAt = Date.now();
    }, { silent: true });
    A['plan-build']();
    RH.ui.setupStep = 0;
    location.hash = '#home';
  };
  RH.onChange.push(function (el) {
    const k = el.dataset.setup;
    if (!k) return false;
    store.update(function (s) {
      const d = s.routine.days;
      if (k === 'start' || k === 'end') { if (el.value) [0, 1, 2, 3, 4].forEach((i) => { d[i][k] = el.value; }); }
      else if (k === 'bed') { if (el.value) [0, 1, 2, 3].forEach((i) => { d[i].bed = el.value; }); }
      else if (k === 'wkStudy') [0, 1, 2, 3, 4].forEach((i) => { d[i].study = Number(el.value); });
      else if (k === 'weStudy') [5, 6].forEach((i) => { d[i].study = Number(el.value); });
      s.routine.setupAt = s.routine.setupAt || Date.now(); s.plan.settingsAt = Date.now();
    }, { silent: true });
    return true;
  });
})(window.RH = window.RH || {});
