/* Home: one banner (the lesson to carry on with, today's progress ring and three counters as chips), today's
   sessions as cards you tick off, three quick starts and your shelf of subject books. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views, D = RH.deliv;

  function nextSession(s) {
    const today = U.today(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    const todays = s.plan.sessions.filter((x) => x.d === today && !x.done).sort((a, b) => (a.t0 == null ? 9999 : a.t0) - (b.t0 == null ? 9999 : b.t0));
    return todays.find((x) => x.t0 != null && x.t0 + x.m > nowM) || todays[0] || s.plan.sessions.find((x) => x.d > today && !x.done) || null;
  }
  function streakDays() {
    const act = st().activity || {};
    let d = U.today(), n = 0;
    if (!act[d]) d = U.addDays(d, -1);
    while (act[d]) { n++; d = U.addDays(d, -1); }
    return n;
  }
  // The lesson to open from Home: the next planned session's topic, else the next lesson in the course studied most recently.
  function resumeLesson(s, nx) {
    if (nx && nx.t && M.topic[nx.t]) return { t: M.topic[nx.t], why: nx.d === U.today() ? 'Up next today' : 'Next in your plan' };
    const last = Object.keys(s.topics).filter((g) => M.topic[g] && s.topics[g].last && M.isMine(M.topic[g].subject)).sort((x, y) => s.topics[y].last.localeCompare(s.topics[x].last))[0];
    const sub = last ? M.topic[last].subject : M.subjects[0];
    const t = sub && M.nextLesson(s, sub);
    return t ? { t: t, why: last ? 'Carry on' : 'Start here' } : null;
  }
  V.resumeLesson = resumeLesson;

  // The lab of the day: one from your subjects, changing each day.
  function labOfDay() {
    const mine = RH.labs.defs.filter((d) => (d.topics || []).some((g) => M.topic[g] && M.isMine(M.topic[g].subject)));
    const list = mine.length ? mine : RH.labs.defs;
    if (!list.length) return null;
    const n = Math.floor(new Date(U.today() + 'T12:00:00').getTime() / 864e5);
    return list[n % list.length];
  }

  function hero(s, resume, greet, chips, ring) {
    const top = '<p class="hero-hi">' + greet + ' <span>· ' + esc(U.fmt(U.today(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</span></p>';
    let main;
    if (!resume) main = '<div class="hero-txt"><p class="hero-tag">All caught up</p><h1>Everything’s done.</h1><p class="hero-meta">Pick a book from your shelf, or try a lab.</p></div><a class="btn white lg" href="#study">Open my shelf' + C.icon('right') + '</a>';
    else {
      const t = resume.t, steps = M.lessonSteps(s, t.gid);
      main = '<div class="hero-txt"><p class="hero-tag">' + esc(resume.why) + ' · ' + esc(t.subject.name) + '</p><h1>' + esc(M.title(t.name)) + '</h1>' +
        '<div class="hero-steps" aria-label="Step ' + Math.min(5, steps + 1) + ' of 5">' + [0, 1, 2, 3, 4].map((i) => '<i class="' + (i < steps ? 'on' : i === steps ? 'now' : '') + '"></i>').join('') + '<span>' + (steps ? 'Step ' + Math.min(5, steps + 1) + ' of 5' : 'Lesson ' + esc(M.lessonNum(s, t))) + '</span></div>' +
        '<a class="btn white lg" href="#t-' + t.gid + '">' + (steps ? 'Continue' : 'Start lesson') + C.icon('right') + '</a></div>';
    }
    return '<section class="hero home-hero"' + (resume ? ' data-subj="' + resume.t.subject.id + '"' : '') + '>' + top + '<div class="hero-row">' + main + ring + '</div><div class="hero-chips">' + chips + '</div><span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span></section>';
  }

  V.home = function () {
    const s = st(), today = U.today();
    const h = new Date().getHours();
    const greet = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (s.profile.name ? ', ' + esc(s.profile.name) : '');
    const exams = M.upcomingExams(s), next = exams[0];
    const nx = nextSession(s), resume = resumeLesson(s, nx);
    let html = '';

    // Strict weekly tasks: last week has to be closed before this one opens.
    const review = D.needsReview();
    if (review && s.deliv.settings.strict) {
      const w = s.deliv.weeks[review];
      const left = w.items.filter((it) => !D.isDone(D.statusOf(it, review)) && it.status !== 'missed' && it.status !== 'excused').length;
      return '<section class="card gate">' + C.icon('lock', 'gate-ic') + '<div><h2>Close last week first</h2><p>The deadline for the week of ' + esc(U.fmtShort(review)) + ' has passed and ' + U.plural(left, 'task is', 'tasks are') + ' still open. Hand them in late or mark them missed, then this week opens up.</p>' +
        '<div class="row-actions"><a class="btn" href="#deliverables">Close the week</a><span class="muted small">Strict mode is on. You can turn it off in Weekly tasks.</span></div></div></section>' + todayRibbon(s, today);
    }
    const todays = s.plan.sessions.filter((x) => x.d === today);
    const doneM = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0), allM = todays.reduce((a, x) => a + x.m, 0);
    const ring = '<a class="hero-ring" href="#plan" aria-label="Today: ' + U.dur(doneM) + ' of ' + U.dur(allM) + ' done">' + C.ring(allM ? doneM / allM : 0, allM ? '<b>' + Math.round(100 * doneM / allM) + '%</b><span>today</span>' : '<b>–</b><span>today</span>', 112) + '</a>';
    const sum = D.summary(), streak = streakDays();
    const chips = '<a class="hchip" href="#focus">' + C.icon('flame') + '<b class="num">' + streak + '</b> day streak</a>' +
      '<a class="hchip" href="#deliverables">' + C.icon('list') + '<b class="num">' + (sum ? sum.done + '/' + sum.total : '0') + '</b> tasks this week</a>' +
      (next ? '<a class="hchip" href="#exams">' + C.icon('flag') + '<b class="num">' + C.daysTo(next.date) + '</b> days to ' + esc(next.title.split(' Paper')[0]) + '</a>' : '');
    html += hero(s, resume, greet, chips, ring);
    if (!s.profile.setupDone) html += '<div class="nudge">' + C.icon('spark') + '<p><b>Finish setting up</b> so the plan fits your week.</p><a class="btn sm" href="#setup">Continue</a><button type="button" class="icon-btn" data-action="setup-hide" aria-label="Hide">' + C.icon('x') + '</button></div>';
    html += V.staleBanner();
    html += todayRibbon(s, today);
    html += quickTiles(s);
    html += shelfStrip(s);
    return html;
  };

  // Today's sessions as a row of cards you can tick off.
  function todayRibbon(s, today) {
    const todays = s.plan.sessions.filter((x) => x.d === today).sort((a, b) => (a.t0 == null ? 9999 : a.t0) - (b.t0 == null ? 9999 : b.t0));
    const left = todays.filter((x) => !x.done).length;
    let body;
    if (!todays.length) body = '<div class="rb-empty">' + C.icon('sun') + '<div><b>Nothing planned today.</b><p class="muted">Take the break, or pick a book from your shelf.</p></div><a class="btn alt sm" href="#plan">Open the planner</a></div>';
    else body = '<ol class="ribbon">' + todays.map(function (x) {
      const k = RH.KIND[x.k], sub = M.subject[x.s];
      return '<li class="rcard' + (x.done ? ' done' : '') + '" style="--c:' + (sub ? C.scol(sub) : 'var(--primary)') + '"><button type="button" class="rc-main" data-action="sess-open" data-id="' + x.id + '"><time class="num">' + (x.t0 != null ? U.hm(x.t0) : 'Any time') + '</time><b>' + esc(V.sessTitle(x)) + '</b><span>' + esc(sub ? sub.name : '') + ' · ' + U.mins(x.m) + (k ? ' · ' + esc(k.label) : '') + '</span></button>' +
        '<button type="button" class="rc-tick check-b' + (x.done ? ' on' : '') + '" data-action="sess-done" data-id="' + x.id + '" aria-pressed="' + !!x.done + '" aria-label="' + (x.done ? 'Done' : 'Mark done') + '">' + C.icon('tick') + '</button></li>';
    }).join('') + '</ol>';
    return '<section class="home-sec"><div class="sec-h"><h2>Today</h2><span class="muted small">' + (todays.length ? (left ? U.plural(left, 'session') + ' left' : 'All done. Nice work.') : '') + '</span><a href="#plan">Planner' + C.icon('right', 'i-sm') + '</a></div>' + body + '</section>';
  }

  function quickTiles(s) {
    const due = RH.cards.totalDue(), lab = labOfDay();
    const labSub = lab && (lab.topics || []).map((g) => M.topic[g]).filter(Boolean)[0];
    return '<section class="home-sec"><div class="sec-h"><h2>Quick start</h2></div><div class="qtiles">' +
      '<button type="button" class="qtile qt-cards" data-action="' + (due ? 'study' : 'go') + '" data-deck="all" data-mode="leitner" data-href="cards"><span class="qt-art" aria-hidden="true"><i></i><i></i><i></i></span><b>' + (due ? U.plural(due, 'flashcard') + ' due' : 'Flashcards') + '</b><span>' + (due ? 'Clear them in a few minutes' : 'Make a deck or import one') + '</span></button>' +
      '<a class="qtile qt-focus" href="#focus"><span class="qt-art" aria-hidden="true"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24"/><path d="M30 30 L30 12"/><path d="M30 30 L42 36"/></svg></span><b>Focus session</b><span>25 minutes, phone away</span></a>' +
      (lab ? '<a class="qtile qt-lab" href="#lab-' + lab.id + '"><span class="qt-art"><canvas data-labthumb="' + lab.id + '" width="4" height="3" aria-hidden="true"></canvas></span><b>' + esc(lab.name) + '</b><span>Lab of the day' + (labSub ? ' · ' + esc(labSub.subject.name) : '') + '</span></a>' : '') +
      '</div></section>';
  }

  // Your shelf: the subject books, which open right here.
  function shelfStrip(s) {
    if (!M.subjects.length) return '';
    return '<section class="home-sec"><div class="sec-h"><h2>Your shelf</h2><a href="#study">Bookshelf' + C.icon('right', 'i-sm') + '</a></div><div class="mini-shelf">' + M.subjects.map(function (sub, i) {
      const p = M.courseProgress(s, M.subjectTopics(s, sub));
      return '<button type="button" class="mbk" data-action="shelf-open" data-sub="' + sub.id + '" aria-label="Open ' + esc(sub.name) + '"><span class="mbk-c">' + RH.shelf.cover(sub, i) + '</span><span class="mbk-t"><b>' + esc(sub.name) + '</b><span class="num">' + Math.round(100 * p.frac) + '%</span></span></button>';
    }).join('') + '</div></section>';
  }
  RH.actions.go = (el) => { location.hash = el.dataset.href; };

  RH.actions['setup-hide'] = () => RH.store.update(function (s) { s.profile.setupDone = true; });
})(window.RH = window.RH || {});
