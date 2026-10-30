/* Home: this week's deliverables, today's timeline, what to do next. */
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
  function weekFocus() {
    const ws = U.weekStart(U.today()), we = U.addDays(ws, 6);
    return st().focus.log.filter((x) => x.date >= ws && x.date <= we).reduce((a, x) => a + (x.focused || 0), 0);
  }

  function setupCard(s) {
    const steps = [
      [!!s.routine.setupAt, 'Set your routine', 'School times, sleep, activities and how many hours you want to revise.', '#routine', 'Set routine'],
      [!!s.profile.fmOptions, 'Pick your Further Maths options', s.profile.fmOptions ? 'Saved' : 'So your exams and topics match your papers.', '#preferences', 'Choose'],
      [M.activeTopics(s).filter((t) => (s.topics[t.gid] || {}).c).length >= 20, 'Rate 20 topics', 'Red, amber or green, so the plan knows your weak spots.', '#study', 'Open courses'],
      [!!(D.week() || {}).committedAt, 'Commit to this week', 'Sign up to your deliverables.', '#deliverables', 'See deliverables']
    ];
    const done = steps.filter((x) => x[0]).length;
    if (done === steps.length || s.profile.welcomed) return '';
    return '<section class="card setup"><div class="card-head"><h2>Get set up</h2><span class="muted small">' + done + ' of ' + steps.length + ' done</span><button type="button" class="btn ghost sm" data-action="welcome-dismiss">Hide</button></div><ol class="steps">' +
      steps.map((x, i) => '<li class="step' + (x[0] ? ' ok' : '') + '"><span class="step-n">' + (x[0] ? C.icon('tick') : i + 1) + '</span><span class="step-t"><b>' + x[1] + '</b><span class="muted small">' + x[2] + '</span></span>' + (x[0] ? '' : '<a class="btn alt sm" href="' + x[3] + '">' + x[4] + '</a>') + '</li>').join('') + '</ol></section>';
  }

  // The lesson to open from Home: the next planned session's topic, else the next lesson in the course studied most recently.
  function resumeLesson(s, nx) {
    if (nx && nx.t && M.topic[nx.t]) return { t: M.topic[nx.t], why: nx.d === U.today() ? 'In today’s plan' : 'Next in your plan' };
    const last = Object.keys(s.topics).filter((g) => M.topic[g] && s.topics[g].last).sort((x, y) => s.topics[y].last.localeCompare(s.topics[x].last))[0];
    const sub = last ? M.topic[last].subject : M.subjects[0];
    const t = M.nextLesson(s, sub);
    return t ? { t: t, why: last ? 'Next in ' + sub.name : 'Start here' } : null;
  }

  V.home = function () {
    const s = st(), today = U.today();
    const h = new Date().getHours();
    const greet = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (s.profile.name ? ', ' + esc(s.profile.name) : '');
    const exams = M.upcomingExams(s), next = exams[0];
    const nx = nextSession(s), resume = resumeLesson(s, nx);
    let html = '<header class="home-hero"><div class="hh-text"><p class="eyebrow">' + esc(U.fmtLong(today)) + '</p><h1>' + greet + '</h1><p class="lede">' + (next ? esc(next.title) + ' is ' + U.countdown(C.daysTo(next.date)) + '. ' + U.plural(exams.length, 'paper') + ' to go.' : 'No exams coming up.') + '</p></div>';
    if (resume) {
      const t = resume.t, steps = M.lessonSteps(s, t.gid);
      html += '<a class="resume" href="#t-' + t.gid + '" data-subj="' + t.subject.id + '"><span class="label">' + esc(resume.why) + '</span><span class="rs-sub">' + C.stag(t.subject.id, true) + '<span class="num muted small">Lesson ' + M.lessonNum(s, t) + '</span></span><b>' + esc(M.title(t.name)) + '</b>' +
        '<span class="rs-foot"><span class="mini-bar"><span style="width:' + (steps * 20) + '%"></span></span><span class="small muted">' + steps + ' of 5 steps</span><span class="rs-go">' + (steps ? 'Continue' : 'Start') + C.icon('right') + '</span></span></a>';
    }
    html += '</header>';

    const review = D.needsReview();
    if (review && s.deliv.settings.strict) {
      const w = s.deliv.weeks[review];
      const left = w.items.filter((it) => !D.isDone(D.statusOf(it, review)) && it.status !== 'missed' && it.status !== 'excused').length;
      return html + '<section class="card gate">' + C.icon('lock', 'gate-ic') + '<div><h2>Close last week first</h2><p>The deadline for the week of ' + esc(U.fmtShort(review)) + ' has passed and ' + U.plural(left, 'deliverable is', 'deliverables are') + ' still open. Hand them in late or mark them missed, then this week opens up.</p>' +
        '<div class="row-actions"><a class="btn" href="#deliverables">Close the week</a><span class="muted small">Strict mode is on. You can turn it off in Deliverables → Rules.</span></div></div></section>' +
        '<section class="card"><div class="card-head"><h2>Today</h2></div>' + V.timeline(today, { compact: true }) + '</section>';
    }
    html += setupCard(s) + V.staleBanner();

    // Three numbers for the week
    const sum = D.summary();
    const todays = s.plan.sessions.filter((x) => x.d === today);
    const planned = todays.reduce((a, x) => a + x.m, 0), done = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const fItem = (D.week() || { items: [] }).items.find((it) => it.kind === 'focus');
    const wf = weekFocus();
    const dl = D.deadline(D.currentWs());
    html += '<div class="summary">' +
      '<a class="tile" href="#plan">' + C.ring(planned ? done / planned : 0, '<b class="num">' + U.dur(planned - done) + '</b>', 58) +
      '<span class="tile-t"><span class="label">Today</span><b>' + (planned ? U.dur(done) + ' of ' + U.dur(planned) + ' done' : 'Nothing planned') + '</b><span class="muted small">' + C.icon('flame', 'i-sm') + ' ' + U.plural(streakDays(), 'day') + ' streak</span></span></a>' +
      '<a class="tile" href="#deliverables">' + C.ring(sum ? sum.done / (sum.total || 1) : 0, '<b class="num">' + (sum ? sum.done + '/' + sum.total : '–') + '</b>', 58, sum && sum.overdue ? 'bad' : '') +
      '<span class="tile-t"><span class="label">Due this week</span><b>' + (sum ? (sum.done === sum.total ? 'All handed in' : U.plural(sum.total - sum.done, 'deliverable') + ' left') : '') + '</b><span class="muted small">' + esc(U.fmt(dl.date, { weekday: 'short' })) + ' ' + esc(dl.time) + ' · ' + esc(sum ? sum.left : '') + '</span></span></a>' +
      '<a class="tile" href="#focus">' + C.ring(fItem ? wf / fItem.target : 0, '<b class="num">' + U.dur(wf) + '</b>', 58, fItem && wf >= fItem.target ? 'ok' : '') +
      '<span class="tile-t"><span class="label">Focus this week</span><b>' + (fItem ? U.dur(Math.max(0, fItem.target - wf)) + ' to go' : U.dur(wf)) + '</b><span class="muted small">' + (RH.face.on ? 'Tracker on' : 'Tracker off') + '</span></span></a></div>';

    html += '<div class="cols"><div class="col-main">';
    // Next session
    if (nx) {
      const t = nx.t && M.topic[nx.t], k = RH.KIND[nx.k];
      html += '<section class="card next" data-subj="' + nx.s + '"><div class="card-head"><h2>' + (nx.d === today ? 'Next up' : 'Next session · ' + esc(U.fmt(nx.d))) + '</h2><a class="small" href="#plan">Week view</a></div>' +
        '<div class="next-row"><span class="next-time num">' + (nx.t0 != null ? U.hm(nx.t0) : '--:--') + '<span>' + U.mins(nx.m) + '</span></span><div class="next-main">' +
        '<p class="next-tags">' + C.stag(nx.s, true) + C.chip(esc(k.label)) + '</p><h3>' + esc(V.sessTitle(nx)) + '</h3>' +
        '<p class="muted small">' + esc(k.how) + '</p></div></div>' +
        '<div class="row-actions">' + (t ? '<a class="btn" href="#t-' + t.gid + '">' + C.icon('study') + 'Open the lesson</a>' : '') + '<button type="button" class="btn ' + (t ? 'alt' : '') + '" data-action="timer-open" data-id="' + nx.id + '">' + C.icon('play') + 'Start focus timer</button>' +
        '<button type="button" class="btn ghost" data-action="sess-done" data-id="' + nx.id + '">' + C.icon('tick') + 'Mark done</button></div></section>';
    }
    html += '<section class="card"><div class="card-head"><h2>Today</h2></div>' + V.timeline(today) + '</section>';
    // Courses
    html += '<section class="card"><div class="card-head"><h2>Your courses</h2><a class="small" href="#study">All courses</a></div><ul class="course-mini">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub), p = M.courseProgress(s, topics), t = M.nextLesson(s, sub, topics);
      return '<li data-subj="' + sub.id + '"><a href="#s-' + sub.id + '" class="cm-name"><i class="sdot"></i><b>' + esc(sub.name) + '</b><span class="num small muted">' + p.done + '/' + p.total + '</span></a><span class="mini-bar"><span style="width:' + Math.round(100 * p.frac) + '%"></span></span>' +
        (t ? '<a class="cm-next small" href="#t-' + t.gid + '">Next: <span class="num">' + M.lessonNum(s, t) + '</span> ' + esc(M.title(t.name)) + '</a>' : '<span class="small muted">Course complete</span>') + '</li>';
    }).join('') + '</ul></section>';
    html += '</div><aside class="col-side">';

    // Deliverables
    const w = D.week();
    if (w) html += '<section class="card"><div class="card-head"><h2>This week’s deliverables</h2><a class="small" href="#deliverables">All</a></div>' +
      (!w.committedAt ? '<p class="note small">' + C.icon('pen', 'i-sm') + ' You haven’t committed to this week yet. <a href="#deliverables">Sign up</a></p>' : '') +
      '<ul class="dv-list compact">' + w.items.map((it) => D.itemRow(it, w.ws, { compact: true })).join('') + '</ul></section>';
    // Flashcards
    const due = RH.cards.totalDue(), deckN = Object.keys(s.decks).length;
    html += '<section class="card"><div class="card-head"><h2>Flashcards</h2><a class="small" href="#cards">Decks</a></div>' +
      (deckN ? '<p class="big-line"><b class="num">' + due + '</b> cards due today</p>' + (due ? '<button type="button" class="btn block" data-action="study" data-deck="all" data-mode="leitner">' + C.icon('cards') + 'Review due cards</button>' : '<p class="muted small">All caught up.</p>')
        : '<p class="muted small">No decks yet. Import from Quizlet or Gizmo, or add a starter deck.</p><a class="btn alt block" href="#cards">Set up flashcards</a>') + '</section>';
    // Countdown
    html += '<section class="card"><div class="card-head"><h2>Exams</h2><a class="small" href="#exams">Timetable</a></div><ul class="list compact">' +
      exams.slice(0, 5).map((e) => '<li class="row" data-subj="' + e.subject + '">' + C.stag(e.subject) + '<span class="row-main"><b>' + esc(e.title) + '</b><span class="muted small">' + esc(U.fmt(e.date)) + (e.time ? ' · ' + e.time : '') + '</span></span>' + C.countdownChip(e.date) + '</li>').join('') +
      (exams.length ? '' : '<li class="muted">No upcoming exams.</li>') + '</ul></section>';
    html += '</aside></div>';
    return html;
  };
})(window.RH = window.RH || {});
