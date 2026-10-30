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
      [M.activeTopics(s).filter((t) => (s.topics[t.gid] || {}).c).length >= 20, 'Rate 20 topics', 'Red, amber or green, so the plan knows your weak spots.', '#study', 'Open subjects'],
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
    let html = V.docHead(esc(U.fmtLong(today)), greet, next ? esc(next.title) + ' is ' + U.countdown(C.daysTo(next.date)) + '. ' + U.plural(exams.length, 'paper') + ' to go.' : 'No exams coming up.');

    const review = D.needsReview();
    if (review && s.deliv.settings.strict) {
      const w = s.deliv.weeks[review];
      const left = w.items.filter((it) => !D.isDone(D.statusOf(it, review)) && it.status !== 'missed' && it.status !== 'excused').length;
      return html + '<section class="card gate">' + C.icon('lock', 'gate-ic') + '<div><h2>Close last week first</h2><p>The deadline for the week of ' + esc(U.fmtShort(review)) + ' has passed and ' + U.plural(left, 'deliverable is', 'deliverables are') + ' still open. Hand them in late or mark them missed, then this week opens up.</p>' +
        '<div class="row-actions"><a class="btn" href="#deliverables">Close the week</a><span class="muted small">Strict mode is on. You can turn it off in Deliverables → Rules.</span></div></div></section>' +
        '<h2 class="h-rule">Today</h2>' + V.timeline(today, { compact: true });
    }
    html += setupCard(s) + V.staleBanner();

    if (resume) {
      const t = resume.t, steps = M.lessonSteps(s, t.gid);
      html += '<a class="resume" href="#t-' + t.gid + '" data-subj="' + t.subject.id + '"><span class="rs-l"><span class="small muted">' + esc(resume.why) + ' · ' + esc(t.subject.name) + ' · Lesson ' + M.lessonNum(s, t) + '</span><b>' + esc(M.title(t.name)) + '</b><span class="small muted">' + (steps ? steps + ' of 5 steps done' : 'Not started') + '</span></span><span class="btn">' + (steps ? 'Continue' : 'Start') + ' lesson</span></a>';
    }

    html += '<div class="cols"><div class="col-main">';
    // Today
    const todays = s.plan.sessions.filter((x) => x.d === today);
    const planned = todays.reduce((a, x) => a + x.m, 0), done = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    html += '<section><div class="sec-head"><h2>Today</h2><span class="muted small">' + (planned ? U.dur(done) + ' of ' + U.dur(planned) + ' revision done' : 'No revision planned') + ' · <a href="#plan">Week</a></span></div>';
    if (nx && nx.d === today) {
      const t = nx.t && M.topic[nx.t];
      html += '<div class="next-line" data-subj="' + nx.s + '"><span class="num next-t">' + (nx.t0 != null ? U.hm(nx.t0) : '') + '</span><span class="next-m"><span class="small muted">Next up · ' + esc(RH.KIND[nx.k].label) + ' · ' + U.mins(nx.m) + '</span><b>' + esc(V.sessTitle(nx)) + '</b></span>' +
        '<span class="row-actions">' + (t ? '<a class="btn sm" href="#t-' + t.gid + '">Open lesson</a>' : '') + '<button type="button" class="btn alt sm" data-action="timer-open" data-id="' + nx.id + '">' + C.icon('play') + 'Start timer</button></span></div>';
    }
    html += V.timeline(today) + '</section>';
    html += '</div><aside class="col-side">';
    // This week's deliverables
    const w = D.week(), sum = D.summary(), dl = D.deadline(D.currentWs());
    if (w) html += '<section><div class="sec-head"><h2>Due this week</h2><a class="small" href="#deliverables">All</a></div><p class="small muted">' + (sum ? sum.done + ' of ' + sum.total + ' handed in' : '') + ' · deadline ' + esc(U.fmt(dl.date, { weekday: 'short' })) + ' ' + esc(dl.time) + '</p>' +
      (!w.committedAt ? '<p class="small"><a href="#deliverables">Commit to this week’s work</a></p>' : '') +
      '<ul class="dv-list compact">' + w.items.map((it) => D.itemRow(it, w.ws, { compact: true })).join('') + '</ul></section>';
    // Exams
    html += '<section><div class="sec-head"><h2>Exams</h2><a class="small" href="#exams">Timetable</a></div><ul class="plain-list">' +
      exams.slice(0, 4).map((e) => '<li data-subj="' + e.subject + '"><span><b>' + esc(e.title) + '</b><span class="muted small">' + esc(U.fmt(e.date)) + (e.time ? ' · ' + e.time : '') + '</span></span><span class="small num">' + U.plural(C.daysTo(e.date), 'day') + '</span></li>').join('') +
      (exams.length ? '' : '<li class="muted">No upcoming exams.</li>') + '</ul></section>';
    const due = RH.cards.totalDue();
    if (due) html += '<section><div class="sec-head"><h2>Flashcards</h2></div><p><b class="num">' + due + '</b> cards due today. <button type="button" class="btn link" data-action="study" data-deck="all" data-mode="leitner">Review them</button></p></section>';
    html += '</aside></div>';
    return html;
  };
})(window.RH = window.RH || {});
