/* Home: a welcome banner with the lesson to carry on with, three counters, today's sessions and your subjects. */
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

  function hero(s, resume, greet) {
    const top = '<p class="hero-hi">' + greet + ' · ' + esc(U.fmt(U.today(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</p>';
    if (!resume) return '<section class="hero">' + top + '<h1>Everything’s done.</h1><p class="hero-meta">Pick a subject to revise, or try a lab.</p><div class="hero-acts"><a class="btn white" href="#study">Open My Subjects</a></div><span class="orb o1"></span><span class="orb o2"></span></section>';
    const t = resume.t, steps = M.lessonSteps(s, t.gid);
    return '<section class="hero" data-subj="' + t.subject.id + '">' + top +
      '<div class="hero-row"><div class="hero-txt"><p class="hero-tag">' + esc(resume.why) + ' · ' + esc(t.subject.name) + '</p><h1>' + esc(M.title(t.name)) + '</h1>' +
      '<p class="hero-meta">Lesson ' + M.lessonNum(s, t) + ' · ' + (steps ? 'step ' + Math.min(5, steps + 1) + ' of 5' : 'not started') + '</p><span class="hero-bar"><i style="width:' + (steps * 20) + '%"></i></span></div>' +
      '<a class="btn white lg" href="#t-' + t.gid + '">' + (steps ? 'Continue lesson' : 'Start lesson') + C.icon('right') + '</a></div><span class="orb o1"></span><span class="orb o2"></span></section>';
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
        '<div class="row-actions"><a class="btn" href="#deliverables">Close the week</a><span class="muted small">Strict mode is on. You can turn it off in Weekly tasks.</span></div></div></section>' + todayCard(s, today);
    }
    html += hero(s, resume, greet);
    if (!s.profile.setupDone) html += '<div class="nudge">' + C.icon('spark') + '<p><b>Finish setting up.</b> Choose your subjects and tell Preppr about your week, so the plan fits you.</p><a class="btn sm" href="#setup">Continue setup</a><button type="button" class="icon-btn" data-action="setup-hide" aria-label="Hide">' + C.icon('x') + '</button></div>';
    html += V.staleBanner();

    // Three counters
    const sum = D.summary(), streak = streakDays();
    html += '<div class="hstats">' +
      '<a class="hstat" href="#focus"><span class="hs-ic s1">' + C.icon('flame') + '</span><b class="num">' + streak + '</b><span>day streak</span></a>' +
      '<a class="hstat" href="#deliverables"><span class="hs-ic s2">' + C.icon('list') + '</span><b class="num">' + (sum ? sum.done + '/' + sum.total : '0') + '</b><span>this week’s tasks</span></a>' +
      '<a class="hstat" href="#exams"><span class="hs-ic s3">' + C.icon('flag') + '</span><b class="num">' + (next ? C.daysTo(next.date) : '–') + '</b><span>' + (next ? 'days to ' + esc(next.title.split(' Paper')[0]) : 'no exams yet') + '</span></a></div>';

    html += '<div class="home-grid">' + todayCard(s, today) + subjectsCard(s) + '</div>';
    return html;
  };

  function todayCard(s, today) {
    const todays = s.plan.sessions.filter((x) => x.d === today).sort((a, b) => (a.t0 == null ? 9999 : a.t0) - (b.t0 == null ? 9999 : b.t0));
    const due = RH.cards.totalDue();
    let rows = todays.map(function (x) {
      const k = RH.KIND[x.k];
      return '<li class="trow' + (x.done ? ' done' : '') + '" data-subj="' + x.s + '"><time class="num">' + (x.t0 != null ? U.hm(x.t0) : '—') + '</time><span class="tdot"></span>' +
        '<button type="button" class="trow-main" data-action="sess-open" data-id="' + x.id + '"><b>' + esc(V.sessTitle(x)) + '</b><span>' + esc(M.subject[x.s] ? M.subject[x.s].name : '') + ' · ' + U.mins(x.m) + ' · ' + esc(k ? k.label : '') + '</span></button>' +
        '<button type="button" class="check-b' + (x.done ? ' on' : '') + '" data-action="sess-done" data-id="' + x.id + '" aria-pressed="' + !!x.done + '" aria-label="' + (x.done ? 'Done' : 'Mark done') + '">' + C.icon('tick') + '</button></li>';
    }).join('');
    if (!rows) rows = '<li class="t-empty"><p><b>Nothing planned today.</b></p><p class="muted">Take the break, or open a lesson from My Subjects.</p></li>';
    const doneM = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0), allM = todays.reduce((a, x) => a + x.m, 0);
    return '<section class="card today"><div class="card-head"><h2>Today</h2><a href="#routine">Edit my schedule</a></div>' +
      (allM ? '<p class="muted small">' + U.dur(doneM) + ' of ' + U.dur(allM) + ' done</p>' : '') + '<ul class="tlist">' + rows + '</ul>' +
      '<div class="card-foot"><a href="#plan">See the whole week' + C.icon('right', 'i-sm') + '</a>' + (due ? '<button type="button" class="btn link" data-action="study" data-deck="all" data-mode="leitner">' + U.plural(due, 'flashcard') + ' due</button>' : '') + '</div></section>';
  }

  function subjectsCard(s) {
    const list = M.subjects;
    const show = list.slice(0, 6);
    return '<section class="card subs"><div class="card-head"><h2>My Subjects</h2><a href="#subjects">Change</a></div><div class="stiles">' + show.map(function (sub) {
      const p = M.courseProgress(s, M.subjectTopics(s, sub));
      return '<a class="stile" href="#s-' + sub.id + '" data-subj="' + sub.id + '"><span class="st-top"><b>' + esc(sub.name) + '</b><em class="num">' + Math.round(100 * p.frac) + '%</em></span><span class="sbar"><i style="width:' + Math.round(100 * p.frac) + '%"></i></span></a>';
    }).join('') + '</div>' + (list.length > show.length ? '<div class="card-foot"><a href="#study">All ' + list.length + ' subjects' + C.icon('right', 'i-sm') + '</a></div>' : '') + '</section>';
  }

  RH.actions['setup-hide'] = () => RH.store.update(function (s) { s.profile.setupDone = true; });
})(window.RH = window.RH || {});
