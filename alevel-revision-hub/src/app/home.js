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

  V.home = function () {
    const s = st(), today = U.today();
    const h = new Date().getHours();
    const greet = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (s.profile.name ? ', ' + esc(s.profile.name) : '');
    const exams = M.upcomingExams(s), next = exams[0];
    let html = C.page({ eyebrow: esc(U.fmtLong(today)), title: greet, lede: next ? esc(next.title) + ' is ' + U.countdown(C.daysTo(next.date)) + '. ' + U.plural(exams.length, 'paper') + ' to go.' : 'No exams coming up.' });

    const review = D.needsReview();
    if (review && s.deliv.settings.strict) {
      const w = s.deliv.weeks[review];
      const left = w.items.filter((it) => !D.isDone(D.statusOf(it, review)) && it.status !== 'missed' && it.status !== 'excused').length;
      return html + '<section class="card gate">' + C.icon('lock', 'gate-ic') + '<div><h2>Close last week first</h2><p>The deadline for the week of ' + esc(U.fmtShort(review)) + ' has passed and ' + U.plural(left, 'deliverable is', 'deliverables are') + ' still open. Hand them in late or mark them missed, then this week opens up.</p>' +
        '<div class="row-actions"><a class="btn" href="#deliverables">Close the week</a><span class="muted small">Strict mode is on. You can turn it off in Deliverables → Rules.</span></div></div></section>' +
        '<section class="card"><div class="card-head"><h2>Today</h2></div>' + V.timeline(today, { compact: true }) + '</section>';
    }

    html += setupCard(s) + V.staleBanner();

    // Summary row
    const sum = D.summary();
    const todays = s.plan.sessions.filter((x) => x.d === today);
    const planned = todays.reduce((a, x) => a + x.m, 0), done = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const fItem = (D.week() || { items: [] }).items.find((it) => it.kind === 'focus');
    const wf = weekFocus();
    const dl = D.deadline(D.currentWs());
    html += '<div class="summary">' +
      '<a class="card tile link" href="#deliverables">' + C.ring(sum ? sum.done / (sum.total || 1) : 0, '<b class="num">' + (sum ? sum.done + '/' + sum.total : '–') + '</b>', 64, sum && sum.overdue ? 'bad' : '') +
      '<span class="tile-t"><span class="label">Due this week</span><b>' + (sum ? (sum.done === sum.total ? 'All handed in' : U.plural(sum.total - sum.done, 'deliverable') + ' left') : '') + '</b><span class="muted small">' + esc(U.fmt(dl.date, { weekday: 'short' })) + ' ' + esc(dl.time) + ' · ' + esc(sum ? sum.left : '') + '</span></span></a>' +
      '<a class="card tile link" href="#plan">' + C.ring(planned ? done / planned : 0, '<b class="num">' + U.dur(planned - done) + '</b>', 64) +
      '<span class="tile-t"><span class="label">Today</span><b>' + (planned ? U.dur(done) + ' of ' + U.dur(planned) + ' done' : 'Nothing planned') + '</b><span class="muted small">' + C.icon('flame', 'i-sm') + ' ' + U.plural(streakDays(), 'day') + ' streak</span></span></a>' +
      '<a class="card tile link" href="#focus">' + C.ring(fItem ? wf / fItem.target : 0, '<b class="num">' + U.dur(wf) + '</b>', 64, fItem && wf >= fItem.target ? 'ok' : '') +
      '<span class="tile-t"><span class="label">Focus this week</span><b>' + (fItem ? U.dur(Math.max(0, fItem.target - wf)) + ' to go' : U.dur(wf)) + '</b><span class="muted small">' + (RH.face.on ? 'Tracker on' : 'Tracker off') + '</span></span></a></div>';

    html += '<div class="cols"><div class="col-main">';
    // Next up
    const nx = nextSession(s);
    if (nx) {
      const t = nx.t && M.topic[nx.t], k = RH.KIND[nx.k];
      const vids = t ? M.videos(t).length : 0;
      html += '<section class="card next" data-subj="' + nx.s + '"><p class="label">' + (nx.d === today ? 'Next up' : 'Next session · ' + esc(U.fmt(nx.d))) + '</p>' +
        '<div class="next-row"><span class="next-time num">' + (nx.t0 != null ? U.hm(nx.t0) : '--:--') + '<span>' + U.mins(nx.m) + '</span></span><div class="next-main">' +
        '<p class="next-tags">' + C.stag(nx.s, true) + C.chip(esc(k.label)) + '</p><h2>' + (t ? '<a href="#t-' + t.gid + '">' + esc(t.name) + '</a>' : esc(V.sessTitle(nx))) + '</h2>' +
        '<p class="muted">' + esc(k.how) + '</p>' + (nx.why ? '<p class="small muted">' + esc(nx.why) + '</p>' : '') + '</div></div>' +
        '<div class="row-actions"><button type="button" class="btn" data-action="timer-open" data-id="' + nx.id + '">' + C.icon('play') + 'Start focus timer</button>' +
        '<button type="button" class="btn alt" data-action="sess-done" data-id="' + nx.id + '">' + C.icon('tick') + 'Mark done</button>' +
        (t && vids ? '<a class="btn ghost" href="#t-' + t.gid + '" data-action="topic-tab" data-v="videos">' + C.icon('video') + U.plural(vids, 'video') + '</a>' : '') +
        (t ? '<button type="button" class="btn ghost" data-action="check-topic" data-id="' + t.gid + '">' + C.icon('check') + 'Check an answer</button>' : '') + '</div></section>';
    }
    // Today's timeline
    html += '<section class="card"><div class="card-head"><h2>Today</h2><a class="small" href="#plan">Week view</a></div>' + V.timeline(today) + '</section>';
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
    // Confidence
    html += '<section class="card"><div class="card-head"><h2>Confidence</h2><a class="small" href="#study">Subjects</a></div><ul class="list compact">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub);
      return '<li><a class="row link col" href="#s-' + sub.id + '" data-subj="' + sub.id + '"><span class="row-top">' + C.stag(sub.id) + '<b>' + esc(sub.name) + '</b><span class="num muted">' + U.pct(M.readiness(s, topics)) + '</span></span>' + C.stack(M.ragCounts(s, topics), sub.name) + '</a></li>';
    }).join('') + '</ul></section>';
    html += '</aside></div>';
    return html;
  };
})(window.RH = window.RH || {});
