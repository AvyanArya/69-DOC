/* Page renderers. Each returns an HTML string for the main view. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, esc = U.esc;
  const st = () => RH.store.state;
  const ui = () => RH.ui;
  const V = RH.views = {};

  // ---------- Icons ----------
  const P = {
    today: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    plan: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    exams: '<path d="M6.5 3h8l4 4v14h-12z"/><path d="M14 3v5h4.5M9.5 12.5h6M9.5 16.5h4"/>',
    book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5z"/><path d="M5 19.5A2.5 2.5 0 0 0 7.5 22H19v-5"/>',
    log: '<path d="M5 20v-7M11 20V6M17 20v-4M3 20h18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    prefs: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.5M9.5 2.5h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    later: '<path d="M4 12h11M11 7l5 5-5 5M20 5v14"/>',
    trash: '<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13h9l1-13"/>',
    flame: '<path d="M12 3c.8 3.4 5 5.4 5 10a5 5 0 0 1-10 0c0-2.1 1-3.6 2-4.6.1 1.8.9 2.9 2 3.1-.1-3.2-.6-5.6 1-8.5z"/>',
    rebuild: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'
  };
  const icon = (n, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>';
  V.icon = icon;

  const TAG = { physics: 'PHY', maths: 'MAT', further: 'FM', economics: 'ECO' };
  const stag = (sid) => '<span class="stag" data-subj="' + sid + '">' + TAG[sid] + '</span>';
  V.stag = stag;

  // ---------- Small components ----------
  function stack(n, label) {
    const total = n[0] + n[1] + n[2] + n[3];
    const segs = [3, 2, 1, 0].map((c) => n[c] ? '<span class="seg c' + c + '" style="flex-grow:' + n[c] + '"></span>' : '').join('');
    const aria = (label ? label + ': ' : '') + n[3] + ' green, ' + n[2] + ' amber, ' + n[1] + ' red, ' + n[0] + ' not started';
    return '<div class="stack" role="img" aria-label="' + esc(aria) + '">' + (total ? segs : '<span class="seg c0" style="flex-grow:1"></span>') + '</div>';
  }
  V.stack = stack;

  function ragDots(gid, c) {
    return '<div class="rag-dots" role="group" aria-label="Confidence">' + [1, 2, 3].map((v) =>
      '<button type="button" class="rd c' + v + (c === v ? ' on' : '') + '" data-action="rate" data-id="' + gid + '" data-v="' + v + '" data-toggle="1" aria-pressed="' + (c === v) + '" title="' + M.CONF[v].label + ': ' + M.CONF[v].hint + '"><span class="sr">' + M.CONF[v].label + '</span></button>').join('') + '</div>';
  }
  function ragFull(gid, c) {
    return '<div class="rag-full" role="radiogroup" aria-label="How confident are you?">' + [0, 1, 2, 3].map((v) =>
      '<button type="button" class="rf c' + v + (c === v ? ' on' : '') + '" role="radio" aria-checked="' + (c === v) + '" data-action="rate" data-id="' + gid + '" data-v="' + v + '"><span class="rf-dot"></span><span class="rf-l">' + M.CONF[v].label + '</span>' + (v ? '<span class="rf-h">' + M.CONF[v].hint + '</span>' : '<span class="rf-h">Not rated yet</span>') + '</button>').join('') + '</div>';
  }
  V.ragFull = ragFull;

  function site(r) {
    const s = RH.SITES[r.s] || { short: r.s };
    return '<span class="site" data-site="' + r.s + '">' + esc(s.short) + '</span>';
  }
  function resLink(r) {
    return '<li><a class="res" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + site(r) + '<span class="res-t">' + esc(r.t) + '</span>' + icon('ext', 'i-ext') + '</a></li>';
  }
  function resGroups(list) {
    const groups = {};
    list.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
    return Object.keys(RH.KINDS).filter((k) => groups[k]).map((k) =>
      '<section class="res-group"><h3 class="label">' + RH.KINDS[k] + ' <span class="muted">' + groups[k].length + '</span></h3><ul class="res-list">' + groups[k].map(resLink).join('') + '</ul></section>').join('');
  }
  V.resGroups = resGroups;

  function head(eyebrow, title, lede, right) {
    return '<header class="page-head"><div class="ph-text">' + (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') + '<h1>' + title + '</h1>' + (lede ? '<p class="lede">' + lede + '</p>' : '') + '</div>' + (right ? '<div class="ph-right">' + right + '</div>' : '') + '</header>';
  }

  const daysTo = (d) => U.diff(U.today(), d);
  function countdownBadge(d) {
    const n = daysTo(d);
    return '<span class="cd mono' + (n <= 7 ? ' soon' : '') + '">' + (n === 0 ? 'Today' : n === 1 ? '1 day' : n + ' days') + '</span>';
  }

  function pastPaperLinks(subject) {
    const s = M.subject[subject];
    return s.res.filter((r) => r.k === 'papers');
  }

  // ---------- Session cards ----------
  function sessTitle(s) {
    const t = s.t && M.topic[s.t];
    if (t) return t.name;
    const e = s.e && M.examById(st(), s.e);
    if (e) return (s.k === 'pp' ? 'Past paper: ' : 'Review for ') + e.title;
    return RH.KIND[s.k] ? RH.KIND[s.k].label : 'Session';
  }
  V.sessTitle = sessTitle;

  function sessCard(s) {
    const t = s.t && M.topic[s.t];
    const subj = M.subject[s.s];
    const justDone = ui().justDone === s.id && t;
    const ctx = t ? t.comp.name : (s.e ? (M.examById(st(), s.e) || {}).code || '' : '');
    const kind = RH.KIND[s.k] || { label: s.k, how: '' };
    let links = '';
    if (t) {
      const res = M.resources(t);
      const pick = ['notes', 'video', 'qs'].map((k) => res.find((r) => r.k === k)).filter(Boolean);
      links = pick.map((r) => '<a class="mini-res" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + site(r) + esc(RH.KINDS[r.k].split(' ')[0]) + '</a>').join('');
    } else if (s.e) {
      links = pastPaperLinks(s.s).slice(0, 2).map((r) => '<a class="mini-res" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + site(r) + 'Past papers</a>').join('');
    }
    return '<article class="sess' + (s.done ? ' done' : '') + '" data-subj="' + s.s + '">' +
      '<div class="sess-main">' +
        '<div class="sess-top">' + stag(s.s) + '<span class="kind k-' + s.k + '">' + esc(kind.label) + '</span><span class="mono muted">' + U.mins(s.m) + '</span></div>' +
        '<h3 class="sess-title">' + (t ? '<a href="#t-' + t.gid + '">' + esc(t.name) + '</a>' : esc(sessTitle(s))) + '</h3>' +
        '<p class="sess-meta">' + esc(subj ? subj.name : '') + (ctx ? ' · ' + esc(ctx) : '') + (s.why ? ' · ' + esc(s.why) : '') + '</p>' +
        '<p class="sess-how">' + esc(kind.how) + '</p>' +
        (links ? '<div class="sess-links">' + links + '</div>' : '') +
        (justDone ? '<div class="sess-rate"><span class="label">How confident are you now?</span>' + ragDots(t.gid, M.conf(st(), t.gid)) + '</div>' : '') +
      '</div>' +
      '<div class="sess-actions">' +
        '<button type="button" class="btn btn-done" data-action="sess-done" data-id="' + s.id + '" aria-pressed="' + !!s.done + '">' + icon('check') + '<span>' + (s.done ? 'Done' : 'Mark done') + '</span></button>' +
        (s.done ? '' : '<button type="button" class="btn-icon" data-action="timer-open" data-id="' + s.id + '" title="Start focus timer" aria-label="Start focus timer">' + icon('timer') + '</button>' +
        '<button type="button" class="btn-icon" data-action="sess-later" data-id="' + s.id + '" title="Move to tomorrow" aria-label="Move to tomorrow">' + icon('later') + '</button>') +
      '</div></article>';
  }
  V.sessCard = sessCard;

  // ---------- Shared cards ----------
  function fmOptionsCard(compact) {
    const chosen = st().profile.fmOptions || ui().fmDraft || [];
    return '<section class="note-card" id="fmopts"><div class="nc-text"><h2>Which Further Maths options do you take?</h2><p>Pick the two option modules you sit for Papers 3 and 4. Your plan, exams and topic lists use only these. You can change them later in Preferences.</p></div>' +
      '<div class="opt-grid">' + RH.FM_OPTIONS.map((o) => {
        const p = M.subject.further.paper[o.paper];
        return '<label class="opt"><input type="checkbox" data-fmopt="' + o.id + '"' + (chosen.indexOf(o.id) !== -1 ? ' checked' : '') + '><span><b>' + esc(o.name) + '</b><span class="mono muted">' + esc(p.code) + '</span></span></label>';
      }).join('') + '</div>' +
      '<div class="row-actions"><button type="button" class="btn" data-action="fm-save">Save options</button>' + (compact ? '' : '<span class="muted small">Not sure? Check with your teacher. FS1 + FM1 and FP1 + FS1 are common pairs.</span>') + '</div></section>';
  }
  V.fmOptionsCard = fmOptionsCard;

  function staleBanner() {
    const p = st().plan;
    const stale = p.builtAt && (p.settingsAt > p.builtAt || st().ratedAt > p.builtAt);
    const missed = p.sessions.filter((s) => !s.done && s.d < U.today()).length;
    if (!stale && !missed) return '';
    const why = [];
    if (missed) why.push(U.plural(missed, 'past session') + ' not done');
    if (stale) why.push(p.settingsAt > p.builtAt ? 'criteria changed' : 'ratings changed');
    return '<div class="banner"><p><b>Your plan can be updated:</b> ' + esc(why.join(', ')) + ' since it was built.</p><button type="button" class="btn btn-sm" data-action="plan-build">' + icon('rebuild') + 'Rebuild from today</button></div>';
  }
  V.staleBanner = staleBanner;

  function suggestions(limit) {
    const s = st(), today = U.today();
    const exams = M.upcomingExams(s);
    const todayIds = {};
    s.plan.sessions.forEach((x) => { if (x.d === today && x.t) todayIds[x.t] = 1; });
    const nextFor = {};
    exams.forEach((e) => e.topicIds.forEach((id) => { if (!nextFor[id]) nextFor[id] = e; }));
    return M.activeTopics(s).filter((t) => nextFor[t.gid] && !todayIds[t.gid] && !(s.topics[t.gid] || {}).nt).map(function (t) {
      const c = M.conf(s, t.gid), e = nextFor[t.gid];
      const w = c === 0 ? 0.8 : c === 1 ? 1 : c === 2 ? 0.45 : 0.1;
      return { t: t, e: e, score: w / (1 + U.diff(today, e.date) / 30) };
    }).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function streak() {
    const act = st().activity || {};
    let d = U.today(), n = 0;
    if (!act[d]) d = U.addDays(d, -1);
    while (act[d]) { n++; d = U.addDays(d, -1); }
    return n;
  }

  // ---------- Today ----------
  V.today = function () {
    const s = st(), today = U.today();
    const todays = s.plan.sessions.filter((x) => x.d === today);
    const tomorrow = s.plan.sessions.filter((x) => x.d === U.addDays(today, 1));
    const exams = M.upcomingExams(s);
    const next = exams[0];
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const planned = todays.reduce((a, x) => a + x.m, 0), done = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const lede = next ? '<mark>' + esc(next.title) + '</mark> is ' + U.countdown(daysTo(next.date)) + '. ' + U.plural(exams.length, 'paper') + ' to go.' : 'No exams coming up. Add a mock or test on the Exams page.';

    let html = head(esc(U.fmtLong(today)), greet + (s.profile.name ? ', ' + esc(s.profile.name) : ''), lede);
    if (!s.profile.welcomed) {
      html += '<section class="note-card welcome"><div class="nc-text"><h2>Start here</h2><ol class="steps">' +
        '<li><b>Rate your topics.</b> Open each subject and tap red, amber or green for every topic. Mark anything you have not been taught yet.</li>' +
        '<li><b>Check your exams.</b> Your real Summer 2027 Edexcel dates are loaded. Add mocks and class tests on the Exams page.</li>' +
        '<li><b>Tune the plan.</b> Set your hours and criteria in the Planner, then rebuild. A starter plan is already below.</li></ol></div>' +
        '<div class="row-actions"><a class="btn" href="#s-physics">Rate Physics topics</a><a class="btn-ghost" href="#planner">Open the planner</a><button type="button" class="btn-link" data-action="welcome-dismiss">Hide this</button></div></section>';
    }
    if (!s.profile.fmOptions) html += fmOptionsCard();
    html += staleBanner();

    html += '<div class="cols-today"><section class="col-main">' +
      '<div class="sec-head"><h2>Today’s sessions</h2>' + (todays.length ? '<span class="mono muted">' + U.mins(done) + ' / ' + U.mins(planned) + ' done</span>' : '') + '</div>' +
      (todays.length ? '<div class="sess-list">' + todays.map(sessCard).join('') + '</div>'
        : '<div class="empty"><p><b>Nothing planned today.</b> ' + (s.plan.builtAt ? 'Enjoy the rest, or add a topic from the suggestions.' : 'Build a plan to fill this in.') + '</p>' + (s.plan.builtAt ? '' : '<button type="button" class="btn" data-action="plan-build">Build my plan</button>') + '</div>');

    const sug = suggestions(5);
    if (sug.length) {
      html += '<div class="sec-head"><h2>Worth revising next</h2><span class="muted small">Weakest topics with the soonest papers</span></div><ul class="sug-list">' +
        sug.map((x) => '<li class="sug" data-subj="' + x.t.subject.id + '">' + stag(x.t.subject.id) + '<a href="#t-' + x.t.gid + '" class="sug-name">' + esc(x.t.name) + '<span class="muted small">' + esc(x.t.comp.name) + ' · ' + esc(x.e.code) + ' ' + U.countdown(daysTo(x.e.date)) + '</span></a>' + ragDots(x.t.gid, M.conf(s, x.t.gid)) +
          '<button type="button" class="btn-icon" data-action="add-today" data-id="' + x.t.gid + '" title="Add to today" aria-label="Add to today">' + icon('plus') + '</button></li>').join('') + '</ul>';
    }
    if (tomorrow.length) {
      html += '<div class="sec-head"><h2>Tomorrow</h2><span class="mono muted">' + U.mins(tomorrow.reduce((a, x) => a + x.m, 0)) + '</span></div><ul class="mini-list">' +
        tomorrow.map((x) => '<li data-subj="' + x.s + '">' + stag(x.s) + '<span>' + esc(sessTitle(x)) + '</span><span class="kind k-' + x.k + '">' + esc(RH.KIND[x.k].label) + '</span></li>').join('') + '</ul>';
    }
    html += '</section><aside class="col-side">';

    // Countdown
    html += '<section class="panel"><div class="sec-head"><h2>Countdown</h2><a class="small" href="#exams">All exams</a></div><ol class="cd-list">' +
      exams.slice(0, 6).map((e) => '<li data-subj="' + e.subject + '">' + stag(e.subject) + '<span class="cd-t"><b>' + esc(e.title) + '</b><span class="muted small">' + esc(U.fmt(e.date)) + (e.time ? ' · ' + e.time : '') + '</span></span>' + countdownBadge(e.date) + '</li>').join('') +
      (exams.length ? '' : '<li class="muted">No upcoming exams.</li>') + '</ol></section>';

    // Progress
    html += '<section class="panel"><div class="sec-head"><h2>Confidence</h2><a class="small" href="#subjects">Subjects</a></div><ul class="prog-list">' +
      M.subjects.map(function (sub) {
        const topics = M.subjectTopics(s, sub);
        const n = M.ragCounts(s, topics);
        return '<li><a href="#s-' + sub.id + '" class="prog-row" data-subj="' + sub.id + '"><span class="prog-name">' + stag(sub.id) + esc(sub.name) + '</span><span class="mono muted">' + U.pct(M.readiness(s, topics)) + '</span></a>' + stack(n, sub.name) + '</li>';
      }).join('') + '</ul><p class="legend"><span class="lg c3">Green</span><span class="lg c2">Amber</span><span class="lg c1">Red</span><span class="lg c0">Not started</span></p></section>';

    // This week
    const ws = U.weekStart(today), we = U.addDays(ws, 6);
    const week = s.plan.sessions.filter((x) => x.d >= ws && x.d <= we);
    const wDone = week.filter((x) => x.done).reduce((a, x) => a + x.m, 0), wAll = week.reduce((a, x) => a + x.m, 0);
    const sk = streak();
    html += '<section class="panel"><div class="sec-head"><h2>This week</h2><a class="small" href="#planner">Planner</a></div>' +
      '<div class="stat-row"><div class="stat"><span class="stat-n mono">' + U.hours(wDone) + '</span><span class="muted small">of ' + U.hours(wAll) + ' planned</span></div>' +
      '<div class="stat">' + icon('flame', 'i-flame') + '<span class="stat-n mono">' + sk + '</span><span class="muted small">day streak</span></div></div>' +
      '<div class="meter"><span style="width:' + (wAll ? Math.round(100 * wDone / wAll) : 0) + '%"></span></div></section>';

    html += '</aside></div>';
    return html;
  };

  // ---------- Planner ----------
  function chipFor(x) {
    const t = x.t && M.topic[x.t];
    const label = t ? t.name.replace(/^[\d.]+ /, '') : sessTitle(x);
    return '<button type="button" class="chip-sess' + (x.done ? ' done' : '') + '" data-subj="' + x.s + '" data-action="sess-open" data-id="' + x.id + '">' +
      '<span class="cs-k k-' + x.k + '">' + esc(RH.KIND[x.k].label.split(' ')[0]) + '</span><span class="cs-t">' + esc(label) + '</span><span class="cs-m mono">' + x.m + '</span></button>';
  }

  V.planner = function () {
    const s = st(), S = s.plan.settings, today = U.today();
    const sum = RH.planner.summary(s);
    const ws = ui().week || U.weekStart(today);
    const exams = M.exams(s);
    const built = s.plan.builtAt ? 'Built ' + new Date(s.plan.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not built yet';
    let html = head('Planner', 'Revision plan',
      U.plural(sum.sessions, 'session') + ' left · ' + U.hours(sum.total) + ' · ' + sum.covered + ' of ' + sum.topics + ' topics covered · ' + built,
      '<button type="button" class="btn" data-action="plan-build">' + icon('rebuild') + 'Rebuild plan</button>');
    html += staleBanner();
    if (!s.profile.fmOptions) html += '<div class="banner"><p><b>Further Maths options are not in your plan yet.</b> Choose your two options to add them.</p><a class="btn btn-sm" href="#preferences">Choose options</a></div>';
    const nt = M.activeTopics(s).filter((t) => (s.topics[t.gid] || {}).nt).length;
    if (nt && S.skipUntaught) html += '<p class="hint">' + U.plural(nt, 'topic') + ' marked "not taught yet" are left out of the plan.</p>';

    // Subject split
    html += '<div class="split" role="img" aria-label="Planned hours by subject">' + M.subjects.map((sub) => {
      const m = sum.mins[sub.id] || 0;
      return m ? '<span class="split-seg" data-subj="' + sub.id + '" style="flex-grow:' + m + '"><b>' + TAG[sub.id] + '</b> ' + U.hours(m) + '</span>' : '';
    }).join('') + '</div>';

    // Week calendar
    const days = [];
    for (let i = 0; i < 7; i++) days.push(U.addDays(ws, i));
    html += '<div class="cal-layout"><section class="cal">' +
      '<div class="cal-nav"><button type="button" class="btn-icon" data-action="week-prev" aria-label="Previous week">' + icon('left') + '</button>' +
      '<h2>' + esc(U.fmtShort(ws)) + ' – ' + esc(U.fmtShort(days[6])) + '</h2>' +
      '<button type="button" class="btn-icon" data-action="week-next" aria-label="Next week">' + icon('right') + '</button>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="week-today">This week</button></div>' +
      '<div class="week">' + days.map(function (d) {
        const items = s.plan.sessions.filter((x) => x.d === d);
        const ex = exams.filter((e) => e.date === d);
        const cap = RH.planner.capacity(S, d);
        const used = items.reduce((a, x) => a + x.m, 0);
        return '<div class="day' + (d === today ? ' is-today' : '') + (d < today ? ' is-past' : '') + '">' +
          '<div class="day-head"><span class="day-name">' + U.DAYS[U.dow(d)] + '</span><span class="day-num">' + U.parse(d).getDate() + '</span><span class="day-cap mono muted" title="Planned / available">' + U.hours(used) + '/' + U.hours(cap) + '</span></div>' +
          ex.map((e) => '<div class="exam-badge" data-subj="' + e.subject + '">' + icon('exams') + '<span><b>' + esc(e.code) + '</b> ' + esc(e.time || '') + '</span></div>').join('') +
          '<div class="day-items">' + (items.length ? items.map(chipFor).join('') : '<span class="muted small day-free">' + (cap ? 'Free' : 'Rest day') + '</span>') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="cal-foot"><div class="export"><span class="label">Add to your calendar</span>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="export-ics">' + icon('download') + '.ics (Apple, Outlook)</button>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="export-csv">' + icon('download') + '.csv (Google Calendar)</button></div></div>' +
      '</section>';
    html += '<aside class="criteria">' + V.criteria() + '</aside></div>';
    return html;
  };

  V.criteria = function () {
    const S = st().plan.settings;
    const range = (key, label, help, min, max, step) => '<div class="field"><label for="f-' + key + '"><span>' + label + '</span><output class="mono" id="o-' + key + '">' + S[key] + '</output></label>' +
      '<input type="range" id="f-' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '" data-set="' + key + '" data-num="1">' + (help ? '<p class="help">' + help + '</p>' : '') + '</div>';
    const toggle = (key, label, help) => '<label class="toggle"><input type="checkbox" id="f-' + key + '" data-set="' + key + '"' + (S[key] ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text"><b>' + label + '</b>' + (help ? '<span class="help">' + help + '</span>' : '') + '</span></label>';
    const opts = (list, val) => list.map((o) => '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + o[1] + '</option>').join('');

    return '<form class="crit" id="critForm" onsubmit="return false">' +
      '<h2>Criteria</h2><p class="help">Change anything, then press <b>Rebuild plan</b>. Finished sessions are kept.</p>' +
      '<fieldset><legend class="label">Strategy</legend><div class="presets">' + Object.keys(RH.PRESETS).map((k) => {
        const p = RH.PRESETS[k];
        return '<button type="button" class="preset' + (S.preset === k ? ' on' : '') + '" data-action="preset" data-v="' + k + '" aria-pressed="' + (S.preset === k) + '"><b>' + p.label + '</b><span>' + p.note + '</span></button>';
      }).join('') + '</div></fieldset>' +

      '<fieldset><legend class="label">Hours you can revise</legend><div class="week-hours">' + U.DAYS.map((d, i) =>
        '<label class="wh"><span>' + d + '</span><input type="number" min="0" max="16" step="0.25" inputmode="decimal" id="f-week-' + i + '" data-week="' + i + '" value="' + (S.week[i] / 60) + '"></label>').join('') + '</div>' +
      '<p class="help">Hours per day in a normal school week.</p>' +
      '<div class="hols">' + (S.holidays || []).map((h) =>
        '<div class="hol"><input type="text" aria-label="Name" id="hn-' + h.id + '" data-hol="' + h.id + '" data-f="name" value="' + esc(h.name) + '">' +
        '<input type="date" aria-label="From" id="hf-' + h.id + '" data-hol="' + h.id + '" data-f="from" value="' + esc(h.from) + '">' +
        '<input type="date" aria-label="To" id="ht-' + h.id + '" data-hol="' + h.id + '" data-f="to" value="' + esc(h.to) + '">' +
        '<label class="hol-h"><input type="number" min="0" max="16" step="0.5" aria-label="Hours per day" id="hm-' + h.id + '" data-hol="' + h.id + '" data-f="mins" value="' + (h.mins / 60) + '"><span>h/day</span></label>' +
        '<button type="button" class="btn-icon" data-action="hol-del" data-id="' + h.id + '" aria-label="Remove ' + esc(h.name) + '">' + icon('x') + '</button></div>').join('') +
      '</div><button type="button" class="btn-ghost btn-sm" data-action="hol-add">' + icon('plus') + 'Add holiday or busy period</button>' +
      '<p class="help">Holidays override the normal week. These are typical dates, so edit them to match your school. Set 0 h for a trip or busy week.</p></fieldset>' +

      '<fieldset><legend class="label">Sessions</legend><div class="two">' +
      '<div class="field"><label for="f-sessionLen">Session length</label><select id="f-sessionLen" data-set="sessionLen" data-num="1">' + opts([[25, '25 min (Pomodoro)'], [45, '45 min'], [60, '60 min'], [90, '90 min']], S.sessionLen) + '</select></div>' +
      '<div class="field"><label for="f-breakLen">Break between</label><select id="f-breakLen" data-set="breakLen" data-num="1">' + opts([[5, '5 min'], [10, '10 min'], [15, '15 min']], S.breakLen) + '</select></div></div>' +
      '<div class="two"><div class="field"><label for="f-start">Start</label><input type="date" id="f-start" data-set="start" value="' + esc(S.start) + '"></div>' +
      '<div class="field"><label for="f-end">End</label><input type="date" id="f-end" data-set="end" value="' + esc(S.end) + '"></div></div>' +
      '<p class="help">Leave blank to plan from today until your last exam.</p></fieldset>' +

      '<fieldset><legend class="label">What matters most</legend>' +
      range('wWeak', 'Weak topics', 'Red and not-started topics first.', 0, 3, 0.25) +
      range('wUrg', 'Exam urgency', 'Topics in sooner papers first.', 0, 3, 0.25) +
      range('wCov', 'Cover untouched topics', 'Reach every topic at least once.', 0, 3, 0.25) +
      range('ppWeeks', 'Past papers: weeks before each exam', 'Timed full papers start this many weeks out. 0 turns them off.', 0, 12, 1) +
      '</fieldset>' +

      '<fieldset><legend class="label">Subject share of time</legend>' + M.subjects.map((sub) =>
        '<div class="field field-inline" data-subj="' + sub.id + '"><label for="f-subj-' + sub.id + '">' + stag(sub.id) + esc(sub.name) + '</label><input type="range" min="0" max="3" step="0.5" id="f-subj-' + sub.id + '" data-subjw="' + sub.id + '" value="' + (S.subj[sub.id] == null ? 1 : S.subj[sub.id]) + '"><output class="mono" id="o-subj-' + sub.id + '">' + (S.subj[sub.id] == null ? 1 : S.subj[sub.id]) + '×</output></div>').join('') +
      '<p class="help">1× is an equal share. 0 leaves a subject out.</p></fieldset>' +

      '<fieldset><legend class="label">Rules</legend>' +
      toggle('spacing', 'Spaced repetition', 'Bring topics back after 2, 5, 10, 21 and 35 days.') +
      toggle('interleave', 'Mix subjects within a day', 'Off gives each day one main subject.') +
      toggle('eveReview', 'Exam-eve review', 'The day before a paper is a light review of it.') +
      toggle('skipUntaught', 'Skip topics not taught yet', 'Leave out topics you have flagged.') +
      toggle('focusNext', 'Only my next exam or test', 'Every session goes to the next paper on the list.') +
      '<div class="field"><label for="f-examDay">On exam days</label><select id="f-examDay" data-set="examDay">' + opts([['light', 'Half the usual time'], ['normal', 'Normal time'], ['off', 'No revision']], S.examDay) + '</select></div>' +
      '</fieldset>' +
      '<button type="button" class="btn btn-block" data-action="plan-build">' + icon('rebuild') + 'Rebuild plan</button>' +
      '<details class="how"><summary>How the planner decides</summary><dl>' + RH.GUIDE.planner.map((p) => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl></details>' +
      '</form>';
  };

  // ---------- Exams ----------
  V.exams = function () {
    const s = st(), today = U.today();
    const all = M.officialFor(s);
    let html = head('Exams', 'Exams & tests', 'Official dates from the <a href="' + RH.EXAM_SOURCE.url + '" target="_blank" rel="noopener">Pearson Edexcel Summer 2027 final timetable</a>. Morning papers start at 9:00am, afternoon papers at 1:30pm.');
    if (!s.profile.fmOptions) html += fmOptionsCard(true);

    html += '<section class="exam-list">';
    let month = '';
    all.forEach(function (o) {
      const sub = M.subject[o.subject], p = sub.paper[o.paper];
      const on = !s.exams.off[o.id];
      const m = U.fmt(o.date, { month: 'long', year: 'numeric' });
      if (m !== month) { html += '<h2 class="month">' + esc(m) + '</h2>'; month = m; }
      const topics = M.paperTopics(s, sub, o.paper);
      const past = o.date < today;
      html += '<article class="exam' + (on ? '' : ' off') + (past ? ' is-past' : '') + '" data-subj="' + o.subject + '">' +
        '<div class="exam-date"><span class="ed-d">' + U.parse(o.date).getDate() + '</span><span class="ed-m">' + esc(U.fmt(o.date, { month: 'short' })) + '</span><span class="ed-w">' + esc(U.fmt(o.date, { weekday: 'short' })) + '</span></div>' +
        '<div class="exam-main"><div class="exam-top">' + stag(o.subject) + '<span class="mono">' + esc(p.code) + '</span><span class="muted small">' + (o.session === 'AM' ? 'Morning, 9:00' : 'Afternoon, 1:30') + ' · ' + U.mins(p.dur) + ' · ' + p.marks + ' marks · ' + p.weight + '</span></div>' +
        '<h3>' + esc(sub.name) + ' ' + esc(p.name) + '</h3><p class="muted small">' + esc(p.what) + '</p>' +
        '<div class="exam-ready"><span class="label">Readiness ' + U.pct(M.readiness(s, topics)) + ' · ' + U.plural(topics.length, 'topic') + '</span>' + stack(M.ragCounts(s, topics), p.code) + '</div></div>' +
        '<div class="exam-side">' + (past ? '<span class="muted small">Sat</span>' : countdownBadge(o.date)) +
        '<label class="toggle toggle-sm"><input type="checkbox" data-action="exam-toggle" data-id="' + o.id + '"' + (on ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text small">Sitting</span></label>' +
        '<a class="small" href="#s-' + o.subject + '" data-action="filter-paper" data-subj="' + o.subject + '" data-v="' + o.paper + '">Topics</a></div></article>';
    });
    html += '</section>';

    // Custom tests
    html += '<section class="panel tests"><div class="sec-head"><h2>Mocks & class tests</h2></div>' +
      (s.exams.custom.length ? '<ul class="test-list">' + s.exams.custom.slice().sort((a, b) => a.date.localeCompare(b.date)).map(function (c) {
        const sub = M.subject[c.subject];
        const comps = (c.comps && c.comps.length) ? c.comps.map((id) => (sub.comps.find((x) => x.id === id) || {}).name).filter(Boolean).join(', ') : 'Whole subject';
        return '<li data-subj="' + c.subject + '">' + stag(c.subject) + '<span class="tl-main"><b>' + esc(c.name) + '</b><span class="muted small">' + esc(U.fmt(c.date)) + (c.time ? ' · ' + esc(c.time) : '') + ' · ' + U.mins(c.dur || 60) + ' · ' + esc(comps) + '</span></span>' + (c.date >= today ? countdownBadge(c.date) : '<span class="muted small">Done</span>') +
          '<button type="button" class="btn-icon" data-action="test-del" data-id="' + c.id + '" aria-label="Delete ' + esc(c.name) + '">' + icon('trash') + '</button></li>';
      }).join('') + '</ul>' : '<p class="muted">No mocks or tests yet. Add them so the plan revises the right topics before each one.</p>') +
      '<form id="testForm" class="test-form"><div class="two">' +
      '<div class="field"><label for="t-name">Name</label><input id="t-name" name="name" required placeholder="e.g. Physics mock, Paper 1"></div>' +
      '<div class="field"><label for="t-subj">Subject</label><select id="t-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (ui().testSubj === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div></div>' +
      '<div class="three"><div class="field"><label for="t-date">Date</label><input id="t-date" name="date" type="date" required min="' + today + '"></div>' +
      '<div class="field"><label for="t-time">Start time</label><input id="t-time" name="time" type="time" value="09:00"></div>' +
      '<div class="field"><label for="t-dur">Minutes</label><input id="t-dur" name="dur" type="number" min="10" max="300" step="5" value="60"></div></div>' +
      '<fieldset class="field"><legend>What it covers <span class="muted small">(leave all unticked for the whole subject)</span></legend><div class="comp-picks" id="t-comps">' + V.compPicks(ui().testSubj || 'physics') + '</div></fieldset>' +
      '<button type="submit" class="btn">' + icon('plus') + 'Add test</button></form></section>';
    return html;
  };

  V.compPicks = function (sid) {
    const sub = M.subject[sid];
    return M.compsFor(st(), sub).map((c) => '<label class="pick"><input type="checkbox" name="comps" value="' + c.id + '"><span>' + esc(c.name) + '</span></label>').join('');
  };

  // ---------- Subjects ----------
  V.subjects = function () {
    const s = st();
    let html = head('Subjects', 'Your four A-levels', 'Pick a subject to rate topics and open resources.');
    html += '<div class="subj-grid">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub);
      const n = M.ragCounts(s, topics);
      const ex = M.upcomingExams(s).filter((e) => e.subject === sub.id);
      return '<a class="subj-card" href="#s-' + sub.id + '" data-subj="' + sub.id + '"><span class="sc-tab"></span>' +
        '<span class="sc-top">' + stag(sub.id) + '<span class="mono muted small">' + esc(sub.board) + ' · ' + esc(sub.spec) + '</span></span>' +
        '<span class="sc-name">' + esc(sub.name) + '</span>' +
        '<span class="sc-meta muted small">' + U.plural(topics.length, 'topic') + ' · ' + U.pct(M.readiness(s, topics)) + ' confident</span>' + stack(n, sub.name) +
        '<span class="sc-next small">' + (ex.length ? 'First paper ' + esc(U.fmt(ex[0].date)) + ' · ' + U.countdown(daysTo(ex[0].date)) : 'No upcoming papers') + '</span></a>';
    }).join('') + '</div>';
    return html;
  };

  V.subject = function (sid) {
    const s = st(), sub = M.subject[sid];
    if (!sub) return V.notFound();
    const f = ui().filter[sid] || { c: 'all', paper: 'all' };
    const topics = M.subjectTopics(s, sub);
    const exams = M.upcomingExams(s).filter((e) => e.subject === sid);
    const papers = sub.papers.filter((p) => !p.option || (s.profile.fmOptions && RH.FM_OPTIONS.some((o) => o.paper === p.id && s.profile.fmOptions.indexOf(o.id) !== -1)));

    let html = '<div class="subj-page" data-subj="' + sid + '">' + head(stag(sid) + ' ' + esc(sub.board) + ' · ' + esc(sub.spec), esc(sub.name),
      U.plural(topics.length, 'topic') + ' · <b>' + U.pct(M.readiness(s, topics)) + '</b> confident', '') +
      stack(M.ragCounts(s, topics), sub.name);

    html += '<div class="paper-row">' + papers.map(function (p) {
      const e = exams.find((x) => x.code === p.code);
      return '<div class="paper"><span class="mono">' + esc(p.code) + '</span><b>' + esc(p.name.replace(/^Paper \w+: /, '')) + '</b><span class="muted small">' + (e ? esc(U.fmt(e.date)) + ' · ' + U.countdown(daysTo(e.date)) : 'Not on your timetable') + '</span></div>';
    }).join('') + '</div>';

    if (sid === 'further' && !s.profile.fmOptions) html += fmOptionsCard(true);

    // Filters
    const counts = M.ragCounts(s, topics);
    const ntCount = topics.filter((t) => (s.topics[t.gid] || {}).nt).length;
    const fchip = (v, label, n) => '<button type="button" class="fchip' + (f.c === v ? ' on' : '') + '" data-action="filter" data-subj="' + sid + '" data-k="c" data-v="' + v + '" aria-pressed="' + (f.c === v) + '">' + label + (n != null ? ' <span class="mono">' + n + '</span>' : '') + '</button>';
    html += '<div class="filters">' + fchip('all', 'All', topics.length) + fchip('0', 'Not started', counts[0]) + fchip('1', 'Red', counts[1]) + fchip('2', 'Amber', counts[2]) + fchip('3', 'Green', counts[3]) + (ntCount ? fchip('nt', 'Not taught yet', ntCount) : '') +
      '<label class="paper-filter"><span class="sr">Paper</span><select data-action="filter-select" data-subj="' + sid + '" id="pf-' + sid + '"><option value="all">All papers</option>' + papers.map((p) => '<option value="' + p.id + '"' + (f.paper === p.id ? ' selected' : '') + '>' + esc(p.code) + '</option>').join('') + '</select></label></div>';

    let group = '';
    M.compsFor(s, sub, true).forEach(function (c) {
      if (f.paper !== 'all' && c.papers.indexOf(f.paper) === -1) return;
      const list = c.topics.filter(function (t) {
        const ts = s.topics[t.gid] || {};
        if (f.c === 'nt') return ts.nt;
        return f.c === 'all' || String(ts.c || 0) === f.c;
      });
      if (!list.length) return;
      if (c.group && c.group !== group) { html += '<h2 class="group-h">' + esc(c.group) + '</h2>'; group = c.group; }
      const all = c.topics;
      const anyTaught = all.some((t) => !(s.topics[t.gid] || {}).nt);
      html += '<section class="comp"><div class="comp-head"><h3>' + esc(c.name) + '</h3><span class="mono muted small">' + c.papers.map((p) => sub.paper[p].code.split('/')[1]).join(' · ') + '</span>' + stack(M.ragCounts(s, all), c.name) +
        '<button type="button" class="btn-link small" data-action="comp-nt" data-comp="' + c.gid + '" data-v="' + (anyTaught ? 1 : 0) + '">' + (anyTaught ? 'Mark all not taught' : 'Mark all taught') + '</button></div>' +
        '<ul class="topic-list">' + list.map(function (t) {
          const ts = s.topics[t.gid] || {};
          const ticked = (ts.p || []).length, total = (t.pts || []).length;
          return '<li class="topic-row' + (ts.nt ? ' nt' : '') + '"><a href="#t-' + t.gid + '" class="tr-name"><span>' + esc(t.name) + '</span><span class="muted small">' +
            (ts.nt ? 'Not taught yet' : (total ? ticked + '/' + total + ' points' : '') + (ts.last ? ' · revised ' + esc(U.fmtShort(ts.last)) : '')) + '</span></a>' + ragDots(t.gid, ts.c || 0) + '</li>';
        }).join('') + '</ul></section>';
    });
    html += '<details class="panel sub-res"><summary><h2>Subject-wide resources</h2><span class="muted small">' + sub.res.length + ' links: past papers, specification, full courses</span></summary><div class="res-cols">' + resGroups(sub.res) + '</div></details>';
    html += '</div>';
    return html;
  };

  // ---------- Topic ----------
  V.topic = function (gid) {
    const s = st(), t = M.topic[gid];
    if (!t) return V.notFound();
    const ts = M.ts(s, gid);
    const sub = t.subject, c = t.comp;
    const siblings = c.topics;
    const prev = siblings[t.index - 1], next = siblings[t.index + 1];
    const papers = c.papers.map((p) => '<span class="pbadge mono">' + esc(sub.paper[p].code) + '</span>').join('');
    const ticks = ts.p || [];
    const res = M.resources(t);

    let html = '<div class="topic-page" data-subj="' + sub.id + '">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="#s-' + sub.id + '">' + esc(sub.name) + '</a><span>/</span><span>' + esc(c.name) + '</span></nav>' +
      '<header class="topic-head"><h1>' + esc(t.name) + '</h1><div class="pbadges">' + papers + '</div></header>' +
      '<section class="sheet status"><h2 class="label">How confident are you?</h2>' + ragFull(gid, ts.c || 0) +
      '<div class="status-row"><button type="button" class="btn" data-action="mark-revised" data-id="' + gid + '">' + icon('check') + 'Mark revised today</button>' +
      '<span class="muted small">' + (ts.n ? 'Revised ' + U.plural(ts.n, 'time') + (ts.last ? ', last on ' + esc(U.fmt(ts.last)) : '') : 'Not revised yet') + '</span>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="add-today" data-id="' + gid + '">' + icon('plus') + 'Add to today</button>' +
      '<label class="toggle toggle-sm"><input type="checkbox" data-action="toggle-nt" data-id="' + gid + '"' + (ts.nt ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text small">Not taught yet</span></label></div></section>';

    html += '<div class="topic-cols"><div class="tc-main">';
    if (t.pts && t.pts.length) {
      html += '<section class="sheet ruled"><div class="sec-head"><h2>Checklist</h2><span class="mono muted small">' + ticks.length + '/' + t.pts.length + '</span></div><p class="help">Tick a point when you could answer an exam question on it without notes.</p><ul class="checklist">' +
        t.pts.map((p, i) => '<li><label><input type="checkbox" data-action="pt-toggle" data-id="' + gid + '" data-i="' + i + '"' + (ticks.indexOf(i) !== -1 ? ' checked' : '') + '><span>' + esc(p) + '</span></label></li>').join('') + '</ul></section>';
    }
    if (t.tip) html += '<aside class="tip"><span class="label">Exam tip</span><p>' + esc(t.tip) + '</p></aside>';
    html += '<section class="sheet ruled"><div class="sec-head"><h2><label for="notes-' + gid + '">My notes & mistakes log</label></h2><span class="muted small" id="notes-saved">Saves as you type</span></div>' +
      '<textarea id="notes-' + gid + '" class="notes" data-notes="' + gid + '" rows="8" placeholder="Key formulae, things you keep getting wrong, questions to ask your teacher…">' + esc(ts.notes || '') + '</textarea></section>';
    html += '</div><div class="tc-side"><section class="sheet"><h2>Resources</h2><p class="help">Links open in a new tab. Video links search that channel for this topic.</p>' + resGroups(res) + '</section></div></div>';

    html += '<nav class="pager">' + (prev ? '<a href="#t-' + prev.gid + '" class="pg prev">' + icon('left') + '<span><span class="muted small">Previous</span>' + esc(prev.name) + '</span></a>' : '<span></span>') +
      (next ? '<a href="#t-' + next.gid + '" class="pg next"><span><span class="muted small">Next</span>' + esc(next.name) + '</span>' + icon('right') + '</a>' : '<span></span>') + '</nav></div>';
    return html;
  };

  // ---------- Paper log ----------
  function spark(points) {
    if (points.length < 2) return '';
    const w = 160, h = 40, pad = 4;
    const xs = (i) => pad + i * (w - 2 * pad) / (points.length - 1);
    const ys = (v) => h - pad - v * (h - 2 * pad);
    const d = points.map((v, i) => (i ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(v).toFixed(1)).join(' ');
    const lastI = points.length - 1;
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Score trend"><path class="sp-grid" d="M' + pad + ' ' + ys(0.5) + 'H' + (w - pad) + '"/><path class="sp-line" d="' + d + '"/><circle class="sp-end" cx="' + xs(lastI) + '" cy="' + ys(points[lastI]) + '" r="3"/></svg>';
  }

  V.papers = function () {
    const s = st(), today = U.today();
    const list = s.papers.slice().sort((a, b) => b.date.localeCompare(a.date));
    let html = head('Paper log', 'Past paper scores', 'Log every timed paper. Your trend in each subject shows whether revision is working.');
    html += '<div class="trend-grid">' + M.subjects.map(function (sub) {
      const mine = s.papers.filter((p) => p.subject === sub.id).sort((a, b) => a.date.localeCompare(b.date));
      const pcts = mine.map((p) => p.score / p.max);
      const last3 = pcts.slice(-3);
      const avg = last3.length ? last3.reduce((a, x) => a + x, 0) / last3.length : null;
      return '<div class="trend" data-subj="' + sub.id + '">' + stag(sub.id) + '<span class="tr-n mono">' + (avg == null ? '–' : U.pct(avg)) + '</span><span class="muted small">' + (mine.length ? 'average of last ' + last3.length : 'no papers yet') + '</span>' + spark(pcts) + '</div>';
    }).join('') + '</div>';

    const sid = ui().paperSubj || 'physics';
    const sub = M.subject[sid];
    html += '<section class="panel"><h2>Add a paper</h2><form id="paperForm" class="paper-form">' +
      '<div class="three"><div class="field"><label for="p-subj">Subject</label><select id="p-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="p-paper">Paper</label><select id="p-paper" name="paper">' + sub.papers.map((p) => '<option value="' + esc(p.code) + '">' + esc(p.code + ' ' + p.name.replace(/^Paper \w+: /, '')) + '</option>').join('') + '<option value="Other">Other / practice paper</option></select></div>' +
      '<div class="field"><label for="p-series">Series</label><input id="p-series" name="series" placeholder="e.g. June 2023"></div></div>' +
      '<div class="three"><div class="field"><label for="p-score">Score</label><input id="p-score" name="score" type="number" min="0" step="1" required></div>' +
      '<div class="field"><label for="p-max">Out of</label><input id="p-max" name="max" type="number" min="1" step="1" required value="' + (sub.papers[0] ? sub.papers[0].marks : 100) + '"></div>' +
      '<div class="field"><label for="p-date">Date</label><input id="p-date" name="date" type="date" value="' + today + '"></div></div>' +
      '<div class="field"><label for="p-notes">What went wrong?</label><input id="p-notes" name="notes" placeholder="Topics to fix"></div>' +
      '<button type="submit" class="btn">' + icon('plus') + 'Log paper</button></form></section>';

    html += '<section class="panel"><h2>History</h2>' + (list.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Subject</th><th>Paper</th><th class="num">Score</th><th class="num">%</th><th>Notes</th><th></th></tr></thead><tbody>' +
      list.map((p) => '<tr data-subj="' + p.subject + '"><td class="mono">' + esc(U.fmtShort(p.date)) + '</td><td>' + stag(p.subject) + '</td><td>' + esc(p.paper) + (p.series ? ' <span class="muted">' + esc(p.series) + '</span>' : '') + '</td><td class="num mono">' + p.score + '/' + p.max + '</td><td class="num mono"><b>' + U.pct(p.score / p.max) + '</b></td><td class="small">' + esc(p.notes || '') + '</td>' +
        '<td><button type="button" class="btn-icon" data-action="paper-del" data-id="' + p.id + '" aria-label="Delete">' + icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No papers logged yet. The planner books timed papers in the weeks before each exam.</p>') + '</section>';
    return html;
  };

  // ---------- Library ----------
  V.library = function () {
    let html = head('Library', 'Resource library', 'Every site the hub links to, plus the subject-wide resources for each A-level. Topic pages have the links for that topic.');
    html += '<div class="lib-subjects">' + M.subjects.map((sub) => '<details class="panel lib" data-subj="' + sub.id + '"' + (ui().libOpen === sub.id ? ' open' : '') + '><summary>' + stag(sub.id) + '<h2>' + esc(sub.name) + '</h2><span class="muted small">' + sub.res.length + ' links</span></summary><div class="res-cols">' + resGroups(sub.res) + '</div></details>').join('') + '</div>';
    html += '<h2 class="group-h">Sites</h2><div class="site-grid">' + Object.keys(RH.SITES).map(function (k) {
      const x = RH.SITES[k];
      return '<a class="site-card" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="site" data-site="' + k + '">' + esc(x.short) + '</span><b>' + esc(x.name) + '</b><span class="muted small">' + esc(x.blurb) + '</span></a>';
    }).join('') + '</div>';
    return html;
  };

  // ---------- Guide ----------
  V.guide = function () {
    const today = U.today();
    let html = head('How to revise', 'Revision guide', 'What works, how to revise each subject, and a plan for the year.');
    html += '<section class="panel"><h2>Your year, phase by phase</h2><ol class="phases">' + RH.GUIDE.phases.map(function (p) {
      const now = today >= p.from && today <= p.to, done = today > p.to;
      return '<li class="phase' + (now ? ' now' : '') + (done ? ' done' : '') + '"><span class="ph-dates mono small">' + esc(U.fmtShort(p.from)) + ' – ' + esc(U.fmtShort(p.to)) + '</span><b>' + esc(p.title) + (now ? ' <mark>you are here</mark>' : '') + '</b><p>' + esc(p.body) + '</p></li>';
    }).join('') + '</ol></section>';
    html += '<h2 class="group-h">Techniques that work</h2><div class="tech-grid">' + RH.GUIDE.techniques.map((x) => '<section class="sheet tech"><h3>' + esc(x.title) + '</h3><p>' + esc(x.body) + '</p><ul>' + x.how.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    html += '<h2 class="group-h">Subject by subject</h2><div class="tech-grid">' + M.subjects.map((sub) => '<section class="sheet tech" data-subj="' + sub.id + '"><h3>' + stag(sub.id) + ' ' + esc(sub.name) + '</h3><ul>' + RH.GUIDE.subjects[sub.id].map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    html += '<section class="panel"><h2>How the planner decides</h2><dl class="crit-dl">' + RH.GUIDE.planner.map((p) => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl><a class="btn-ghost btn-sm" href="#planner">Open the planner</a></section>';
    return html;
  };

  // ---------- Preferences ----------
  V.prefs = function () {
    const s = st();
    const sync = RH.store.sync;
    const syncText = sync === 'cloud' ? 'Saved to your Claude account. Progress follows you to any device where you open this page.'
      : sync === 'cloud-full' ? 'Saved in this browser. Your data is too big to sync; export a backup regularly.'
      : sync === 'cloud-error' ? 'Saved in this browser. Syncing to your account failed this time and will retry on your next change.'
      : 'Saved in this browser on this device. Export a backup to move it to another device.';
    let html = head('Preferences', 'Preferences', '');
    html += '<section class="panel"><h2>You</h2><div class="field"><label for="pref-name">First name (for the greeting)</label><input id="pref-name" data-pref="name" value="' + esc(s.profile.name) + '" autocomplete="given-name"></div>' +
      '<div class="field"><span class="label-text">Theme</span><div class="seg-ctl" role="radiogroup" aria-label="Theme">' + [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map((o) => '<button type="button" role="radio" aria-checked="' + (s.profile.theme === o[0]) + '" class="' + (s.profile.theme === o[0] ? 'on' : '') + '" data-action="theme" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div></section>';
    html += fmOptionsCard(true);
    html += '<section class="panel"><h2>Your data</h2><p class="sync sync-' + sync + '">' + esc(syncText) + '</p>' +
      '<div class="row-actions"><button type="button" class="btn-ghost" data-action="export-json">' + icon('download') + 'Export backup (.json)</button>' +
      '<label class="btn-ghost file-btn">' + icon('plus') + 'Import backup<input type="file" accept=".json,application/json" id="importFile"></label>' +
      '<button type="button" class="btn-ghost danger" data-action="reset-all">' + icon('trash') + 'Reset everything</button></div>' +
      '<details class="how"><summary>Paste a backup instead</summary><textarea id="importText" rows="4" placeholder="Paste the contents of a backup file"></textarea><button type="button" class="btn btn-sm" data-action="import-text">Import pasted backup</button></details></section>';
    html += '<section class="panel"><h2>About</h2><p class="small">Topics follow the Pearson Edexcel specifications: Physics 9PH0, Mathematics 9MA0, Further Mathematics 9FM0 and Economics A 9EC0. Links go to free resources on Physics & Maths Tutor, Mad Asmaths, 1st Class Maths, TLMaths, ExamSolutions, Bicen Maths, Cognito, Save My Exams, Physics Online, Isaac Physics, EconplusDal, tutor2u and others. Always check exam dates with your exams officer.</p></section>';
    return html;
  };

  V.more = function () {
    const items = [['exams', 'exams', 'Exams & tests'], ['log', 'papers', 'Paper log'], ['link', 'library', 'Resource library'], ['bulb', 'guide', 'How to revise'], ['prefs', 'preferences', 'Preferences']];
    return head('', 'More', '') + '<ul class="more-list">' + items.map((x) => '<li><a href="#' + x[1] + '">' + icon(x[0]) + '<span>' + x[2] + '</span>' + icon('right') + '</a></li>').join('') + '</ul>';
  };

  V.notFound = () => head('', 'Page not found', 'That link does not match a page in the hub.') + '<a class="btn" href="#today">Go to Today</a>';

  // ---------- Navigation ----------
  V.nav = function (route) {
    const s = st();
    const item = (href, ic, label, extra) => '<a href="#' + href + '" class="nav-i' + (route === href ? ' on' : '') + '"' + (route === href ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span>' + (extra || '') + '</a>';
    const todayCount = s.plan.sessions.filter((x) => x.d === U.today() && !x.done).length;
    return item('today', 'today', 'Today', todayCount ? '<span class="count mono">' + todayCount + '</span>' : '') +
      item('planner', 'plan', 'Planner') + item('exams', 'exams', 'Exams & tests') +
      '<p class="nav-h label">Subjects</p>' +
      M.subjects.map(function (sub) {
        const on = route === 's-' + sub.id || (route.indexOf('t-' + sub.short + '-') === 0);
        const topics = M.subjectTopics(s, sub);
        return '<a href="#s-' + sub.id + '" class="nav-i nav-subj' + (on ? ' on' : '') + '" data-subj="' + sub.id + '"' + (on ? ' aria-current="page"' : '') + '>' + stag(sub.id) + '<span>' + esc(sub.name) + '</span><span class="nav-pct mono">' + U.pct(M.readiness(s, topics)) + '</span></a>';
      }).join('') +
      '<p class="nav-h label">Tools</p>' + item('papers', 'log', 'Paper log') + item('library', 'link', 'Resource library') + item('guide', 'bulb', 'How to revise') + item('preferences', 'prefs', 'Preferences');
  };

  V.tabbar = function (route) {
    const sub = route.indexOf('s-') === 0 || route.indexOf('t-') === 0 || route === 'subjects';
    const more = ['more', 'papers', 'library', 'guide', 'preferences'].indexOf(route) !== -1;
    const tab = (href, ic, label, on) => '<a href="#' + href + '" class="tab' + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span></a>';
    return tab('today', 'today', 'Today', route === 'today') + tab('planner', 'plan', 'Planner', route === 'planner') + tab('subjects', 'book', 'Subjects', sub) + tab('exams', 'exams', 'Exams', route === 'exams') + tab('more', 'more', 'More', more);
  };
})(window.RH = window.RH || {});
