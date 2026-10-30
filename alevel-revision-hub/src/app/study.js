/* Learn: each subject is a course of numbered lessons. A lesson is one page you work down in order:
   watch, learn the key points, test yourself, exam questions, finish. Plus the resource library and the revision guide. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;

  // ---------- Small pieces ----------
  function statusIcon(s, t) {
    const ts = s.topics[t.gid] || {};
    if (M.lessonDone(s, t.gid)) return '<span class="ls-ic done" title="Done">' + C.icon('tick') + '</span>';
    if (M.lessonStarted(s, t.gid)) return '<span class="ls-ic part" title="Started"></span>';
    return '<span class="ls-ic' + (ts.nt ? ' nt' : '') + '" title="' + (ts.nt ? 'Not taught yet' : 'Not started') + '"></span>';
  }
  const confMark = (c) => c ? '<span class="ls-conf c' + c + '" title="' + M.CONF[c].label + '"><span class="sr">' + M.CONF[c].label + '</span></span>' : '';
  function lessonRow(s, l, cur, liAttr) {
    const t = l.t, ts = s.topics[t.gid] || {}, vids = M.videos(t).length, pts = (t.pts || []).length;
    return '<li' + (liAttr || '') + '><a class="lesson-row' + (t.gid === cur ? ' cur' : '') + (M.lessonDone(s, t.gid) ? ' is-done' : '') + '" href="#t-' + t.gid + '"' + (t.gid === cur ? ' aria-current="page"' : '') + '>' + statusIcon(s, t) +
      '<span class="ls-num num">' + l.num + '</span><span class="ls-main"><span class="ls-name">' + esc(M.title(t.name)) + '</span><span class="ls-meta">' +
      (vids ? C.icon('video') + U.plural(vids, 'video') : 'Notes only') + (pts ? ' · ' + U.plural(pts, 'key point') : '') + (ts.nt ? ' · <span class="warn-t">Not taught yet</span>' : '') + '</span></span>' + confMark(ts.c) + '</a></li>';
  }
  const progressLine = (p, what) => '<div class="prog"><div class="prog-bar"><span style="width:' + Math.round(100 * p.frac) + '%"></span></div><span class="small"><b class="num">' + p.done + '</b> of <span class="num">' + p.total + '</span> ' + (what || 'lessons') + ' done</span></div>';
  function pager(prev, next) {
    return '<nav class="pager" aria-label="Previous and next">' + (prev ? '<a href="#' + prev[0] + '" class="pg">' + C.icon('left') + '<span><span class="muted small">' + prev[1] + '</span><b>' + esc(prev[2]) + '</b></span></a>' : '<span></span>') +
      (next ? '<a href="#' + next[0] + '" class="pg next"><span><span class="muted small">' + next[1] + '</span><b>' + esc(next[2]) + '</b></span>' + C.icon('right') + '</a>' : '<span></span>') + '</nav>';
  }
  function examLine(s, sid) {
    const ex = M.upcomingExams(s).filter((e) => e.subject === sid);
    return ex.length ? 'First paper ' + esc(U.fmt(ex[0].date)) + ' · ' + U.countdown(C.daysTo(ex[0].date)) : 'No papers on your timetable';
  }

  // ---------- All courses ----------
  V.study = function () {
    const s = st();
    let html = C.page({ eyebrow: 'Learn', title: 'Your courses', lede: 'Pick a subject and work through it lesson by lesson. Every lesson goes in the same order: watch the video, learn the key points, test yourself, then try exam questions.' });
    html += '<div class="course-grid">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub), p = M.courseProgress(s, topics), nx = M.nextLesson(s, sub, topics);
      return '<article class="course-card" data-subj="' + sub.id + '"><a class="cc-band" href="#s-' + sub.id + '"><span class="cc-code num">' + esc(sub.spec) + '</span><h2>' + esc(sub.name) + '</h2><span class="cc-sub">' + esc(sub.board) + ' · ' + U.plural(M.compsFor(s, sub).length, 'section') + ' · ' + U.plural(topics.length, 'lesson') + '</span></a>' +
        '<div class="cc-body">' + progressLine(p) +
        (nx ? '<p class="cc-next"><span class="label">Up next</span><a href="#t-' + nx.gid + '"><span class="num">' + M.lessonNum(s, nx) + '</span> ' + esc(M.title(nx.name)) + '</a></p>' : '<p class="cc-next"><span class="label">Course complete</span>Every lesson is done. Keep revising from the plan.</p>') +
        '<p class="muted small">' + examLine(s, sub.id) + '</p>' +
        '<div class="row-actions">' + (nx ? '<a class="btn" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start course') + C.icon('right') + '</a>' : '') + '<a class="btn alt" href="#s-' + sub.id + '">Contents</a></div></div></article>';
    }).join('') + '</div>';
    const recent = Object.keys(s.topics).filter((g) => M.topic[g] && s.topics[g].last).sort((a, b) => s.topics[b].last.localeCompare(s.topics[a].last)).slice(0, 6);
    if (recent.length) html += '<section class="card"><div class="card-head"><h2>Recently studied</h2></div><ul class="lessons">' + recent.map((g) => { const t = M.topic[g]; return lessonRow(s, { t: t, num: M.lessonNum(s, t) }, null, ' data-subj="' + t.subject.id + '"'); }).join('') + '</ul></section>';
    return html;
  };

  // ---------- One course: its contents ----------
  V.subject = function (sid) {
    const s = st(), sub = M.subject[sid];
    if (!sub) return V.notFound();
    const topics = M.subjectTopics(s, sub), p = M.courseProgress(s, topics), nx = M.nextLesson(s, sub, topics);
    const exams = M.upcomingExams(s).filter((e) => e.subject === sid);
    const papers = sub.papers.filter((x) => !x.option || (s.profile.fmOptions && RH.FM_OPTIONS.some((o) => o.paper === x.id && s.profile.fmOptions.indexOf(o.id) !== -1)));
    const course = M.course(s, sub);
    const openUnit = nx ? nx.comp : null;
    let html = '<div data-subj="' + sid + '">' + C.crumbs([['Learn', 'study'], [sub.name]]);
    html += '<header class="course-hero"><div class="ch-text"><p class="eyebrow"><span class="num">' + esc(sub.spec) + '</span> · ' + esc(sub.board) + '</p><h1>' + esc(sub.name) + '</h1>' +
      '<p class="lede">' + U.plural(course.length, 'section') + ', ' + U.plural(topics.length, 'lesson') + '. Work down the list in order, or jump to whatever you need.</p>' + progressLine(p) + '</div>' +
      (nx ? '<a class="up-next" href="#t-' + nx.gid + '"><span class="label">' + (p.done ? 'Continue where you left off' : 'Start here') + '</span><span class="un-num num">Lesson ' + M.lessonNum(s, nx) + '</span><b>' + esc(M.title(nx.name)) + '</b><span class="un-go">' + (p.done ? 'Continue' : 'Start') + C.icon('right') + '</span></a>'
        : '<div class="up-next done"><span class="label">Course complete</span><b>All ' + topics.length + ' lessons done</b><span class="muted small">Your plan keeps bringing topics back for review.</span></div>') + '</header>';
    html += '<div class="papers-row">' + papers.map(function (x) {
      const e = exams.find((y) => y.code === x.code);
      return '<div class="paper-chip"><span class="num small muted">' + esc(x.code) + '</span><b>' + esc(x.name.replace(/^Paper \w+: /, '')) + '</b><span class="muted small">' + (e ? esc(U.fmt(e.date)) + ' · ' + U.countdown(C.daysTo(e.date)) : 'Not on your timetable') + ' · ' + U.mins(x.dur) + '</span></div>';
    }).join('') + '</div>';
    if (sid === 'further' && !s.profile.fmOptions) html += V.fmOptionsCard();

    html += '<div class="contents-head"><h2>Course contents</h2><button type="button" class="btn ghost sm" data-action="units-all">' + C.icon('expand') + 'Open all</button></div><div class="units">';
    let group = '';
    course.forEach(function (u) {
      const c = u.c;
      if (c.group && c.group !== group) { html += '<h3 class="unit-group">' + esc(c.group) + '</h3>'; group = c.group; }
      const up = M.courseProgress(s, c.topics);
      const chosen = !c.option || (s.profile.fmOptions || []).indexOf(c.option) !== -1;
      html += '<details class="unit' + (up.done === up.total ? ' all-done' : '') + '"' + (c === openUnit ? ' open' : '') + '><summary><span class="unit-n num">' + u.n + '</span><span class="unit-t"><b>' + esc(M.title(c.name)) + '</b><span class="muted small">' + U.plural(c.topics.length, 'lesson') + ' · ' + c.papers.map((x) => esc(sub.paper[x].code)).join(', ') + (c.option && !chosen ? ' · option' : '') + '</span></span>' +
        '<span class="unit-p"><span class="num small">' + up.done + '/' + up.total + '</span><span class="mini-bar"><span style="width:' + Math.round(100 * up.frac) + '%"></span></span></span></summary>' +
        '<ol class="lessons">' + u.lessons.map((l) => lessonRow(s, l)).join('') + '</ol><p class="unit-foot"><a href="#c-' + c.gid + '">Section overview and resources' + C.icon('right', 'i-sm') + '</a></p></details>';
    });
    html += '</div>';

    // Whole-course extras, one after another.
    const extra = RH.SUBJECT_VIDEOS[sid] || [];
    const decks = Object.keys(s.decks).map((k) => s.decks[k]).filter((d) => d.subject === sid);
    html += '<h2 class="after-h">More for the whole course</h2>';
    if (extra.length) html += '<details class="card fold"><summary>' + C.icon('video') + '<h3>' + (sid === 'economics' ? 'Exam technique videos' : 'Whole-course videos') + '</h3><span class="muted small">' + extra.length + '</span></summary><div class="fold-body">' +
      (sid === 'economics' ? '<p class="muted small">EconplusDal on each Edexcel question type, and how to write analysis, evaluation and a judgement.</p>' : '') + C.videoGrid(extra.map((v) => ({ ch: v[0], id: v[1], title: v[2] })), sid) + '</div></details>';
    html += '<details class="card fold"><summary>' + C.icon('cards') + '<h3>Flashcard decks</h3><span class="muted small">' + decks.length + '</span></summary><div class="fold-body">' +
      (decks.length ? '<ul class="deck-list">' + decks.map(RH.cards.deckRow).join('') + '</ul>' : '<p class="muted small">No ' + esc(sub.name) + ' decks yet.</p>') +
      '<div class="row-actions"><button type="button" class="btn alt sm" data-action="cards-import">' + C.icon('upload') + 'Import from Quizlet or Gizmo</button>' +
      RH.STARTER_DECKS.filter((d) => d.subject === sid && !decks.some((x) => x.starter === d.id)).map((d) => '<button type="button" class="btn alt sm" data-action="starter-add" data-id="' + d.id + '">' + C.icon('plus') + esc(d.name) + '</button>').join('') + '</div></div></details>';
    html += '<details class="card fold"><summary>' + C.icon('paper') + '<h3>Past papers and course resources</h3><span class="muted small">' + sub.res.length + '</span></summary><div class="fold-body res-cols">' + C.resGroups(sub.res) + '</div></details>';
    return html + '</div>';
  };

  // ---------- One section ----------
  V.section = function (cgid) {
    const s = st(), c = M.comp[cgid];
    if (!c) return V.notFound();
    const sub = c.subject, n = M.sectionNum(s, c);
    const comps = M.compsFor(s, sub, true), idx = comps.indexOf(c);
    const p = M.courseProgress(s, c.topics), nx = M.nextLesson(s, sub, c.topics);
    const anyTaught = c.topics.some((t) => !(s.topics[t.gid] || {}).nt);
    const res = M.compResources(c);
    let html = '<div data-subj="' + sub.id + '">' + C.crumbs([['Learn', 'study'], [sub.name, 's-' + sub.id], [n + '. ' + M.title(c.name)]]);
    html += C.page({ eyebrow: 'Section ' + n + (c.group ? ' · ' + esc(c.group) : '') + ' · ' + c.papers.map((x) => esc(sub.paper[x].code)).join(', '), title: esc(M.title(c.name)),
      actions: nx ? '<a class="btn" href="#t-' + nx.gid + '">' + (p.done ? 'Continue: ' : 'Start: ') + M.lessonNum(s, nx) + C.icon('right') + '</a>' : '' });
    html += progressLine(p);
    html += '<section class="card flush"><ol class="lessons">' + c.topics.map((t) => lessonRow(s, { t: t, num: M.lessonNum(s, t) })).join('') + '</ol></section>';
    html += '<div class="bar-tools"><span class="muted small">Not covered this in class yet? Mark it so the planner leaves it until later.</span><button type="button" class="btn ghost sm" data-action="comp-nt" data-comp="' + c.gid + '" data-v="' + (anyTaught ? 1 : 0) + '">' + (anyTaught ? 'Mark the whole section as not taught yet' : 'Mark the whole section as taught') + '</button></div>';
    const groups = [[['notes'], 'Notes for the whole section'], [['qs', 'papers'], 'Questions and papers'], [['cards', 'other'], 'More']];
    groups.forEach(function (g) {
      const list = res.filter((r) => g[0].indexOf(r.k) !== -1);
      if (list.length) html += '<section class="card"><h2>' + g[1] + '</h2>' + C.resList(list) + '</section>';
    });
    html += pager(comps[idx - 1] && ['c-' + comps[idx - 1].gid, 'Previous section', M.sectionNum(s, comps[idx - 1]) + '. ' + M.title(comps[idx - 1].name)], comps[idx + 1] && ['c-' + comps[idx + 1].gid, 'Next section', M.sectionNum(s, comps[idx + 1]) + '. ' + M.title(comps[idx + 1].name)]);
    return html + '</div>';
  };

  // ---------- One lesson ----------
  function toc(s, t) {
    const sub = t.subject, p = M.courseProgress(s, M.subjectTopics(s, sub));
    const wide = window.innerWidth >= 1080;
    return '<details class="toc"' + (wide ? ' open' : '') + '><summary><span class="toc-t"><span class="label">Course contents</span><b>' + esc(sub.name) + '</b></span><span class="num small muted">' + p.done + '/' + p.total + '</span></summary><div class="toc-body">' +
      M.course(s, sub).map(function (u) {
        const here = u.c === t.comp, up = M.courseProgress(s, u.c.topics);
        return '<details class="toc-u"' + (here ? ' open' : '') + '><summary><span class="num">' + u.n + '</span><span class="toc-un">' + esc(M.title(u.c.name)) + '</span><span class="num small muted">' + up.done + '/' + up.total + '</span></summary><ol>' +
          u.lessons.map((l) => '<li><a href="#t-' + l.t.gid + '"' + (l.t === t ? ' class="cur" aria-current="page"' : '') + '>' + statusIcon(s, l.t) + '<span class="num">' + l.num + '</span><span>' + esc(M.title(l.t.name)) + '</span></a></li>').join('') + '</ol></details>';
      }).join('') + '</div></details>';
  }

  function step(key, n, title, why, body, done, gid, nextLabel) {
    return '<li class="fstep' + (done ? ' done' : '') + '" id="step-' + key + '"><div class="fs-rail"><span class="fs-n">' + (done ? C.icon('tick') : n) + '</span></div><div class="fs-main">' +
      '<header class="fs-head"><h2>' + title + '</h2>' + (why ? '<p class="muted">' + why + '</p>' : '') + '</header><div class="fs-body">' + body + '</div>' +
      (key === 'finish' ? '' : '<div class="fs-foot"><button type="button" class="btn ' + (done ? 'alt' : 'go') + '" data-action="lesson-step" data-id="' + gid + '" data-k="' + key + '" aria-pressed="' + done + '">' + (done ? C.icon('tick') + 'Done' : 'Done, next: ' + nextLabel + C.icon('down')) + '</button></div>') + '</div></li>';
  }
  function videoBlock(t) {
    const vids = M.videos(t), sid = t.subject.id;
    const more = '<details class="fold-lite"><summary>Find more videos on this</summary><div class="chip-row">' + M.videoSearches(t).map((r) => '<a class="chip-link" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + C.icon('search') + esc(r.t) + '</a>').join('') + '</div></details>';
    if (!vids.length) return '<p class="note">No hand-picked video for this lesson. Search one of these channels, or go straight to the key points.</p><div class="chip-row">' + M.videoSearches(t).map((r) => '<a class="chip-link" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + C.icon('search') + esc(r.t) + '</a>').join('') + '</div>';
    const v = vids[0];
    let html = '<a class="vfeat" href="https://www.youtube.com/watch?v=' + v.id + '" target="_blank" rel="noopener" data-subj="' + sid + '"><span class="vthumb">' + (C.canThumb ? '<img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" onerror="this.remove()">' : '') + '<span class="vplay">' + C.icon('play') + '</span></span>' +
      '<span class="vf-meta"><span class="vch">' + esc(C.channel(v.ch)) + '</span><b>' + esc(v.title) + '</b><span class="muted small">Opens on YouTube</span></span></a>';
    if (vids.length > 1) html += '<p class="label">Also worth watching</p><ul class="vrows">' + vids.slice(1).map((x) => '<li><a href="https://www.youtube.com/watch?v=' + x.id + '" target="_blank" rel="noopener">' + C.icon('pcircle') + '<span><b>' + esc(x.title) + '</b><span class="muted small">' + esc(C.channel(x.ch)) + '</span></span></a></li>').join('') + '</ul>';
    return html + more;
  }
  function resRows(list, show) {
    if (!list.length) return '';
    const head = list.slice(0, show), rest = list.slice(show);
    return C.resList(head) + (rest.length ? '<details class="fold-lite"><summary>' + U.plural(rest.length, 'more link') + '</summary>' + C.resList(rest) + '</details>' : '');
  }

  V.topic = function (gid) {
    const s = st(), t = M.topic[gid];
    if (!t) return V.notFound();
    const ts = M.ts(s, gid), sub = t.subject, c = t.comp, sd = ts.sd || {};
    const num = M.lessonNum(s, t), sn = M.sectionNum(s, c);
    const prev = M.lessonAfter(s, t, -1), next = M.lessonAfter(s, t, 1);
    const ticks = ts.p || [], pts = t.pts || [];
    const res = M.resources(t, s);
    const notes = res.filter((r) => r.k === 'notes' || r.k === 'mine'), practice = res.filter((r) => r.k === 'qs' || r.k === 'papers'), cardRes = res.filter((r) => r.k === 'cards'), other = res.filter((r) => r.k === 'other');
    const decks = RH.cards.forTopic(gid);
    const checks = s.checks.filter((x) => x.topic === gid);
    const done = M.lessonDone(s, gid), steps = M.lessonSteps(s, gid);

    let html = '<div class="lesson" data-subj="' + sub.id + '"><aside class="lesson-side">' + toc(s, t) + '</aside><article class="lesson-main">';
    html += C.crumbs([['Learn', 'study'], [sub.name, 's-' + sub.id], [sn + '. ' + M.title(c.name), 'c-' + c.gid]]);
    html += '<header class="lesson-head"><p class="eyebrow"><span class="lesson-num num">Lesson ' + num + '</span>' + c.papers.map((x) => '<span class="num">' + esc(sub.paper[x].code) + '</span>').join('') + (ts.nt ? C.chip('Not taught yet', 'warn') : '') + (done ? C.chip('Done', 'ok', 'tick') : '') + '</p>' +
      '<h1>' + esc(M.title(t.name)) + '</h1>' +
      '<div class="lesson-prog"><ol class="pips" aria-label="' + steps + ' of 5 steps done">' + M.STEPS.map((x, i) => '<li class="' + ((x[0] === 'finish' ? done : sd[x[0]]) ? 'on' : '') + '"><a href="#step-' + x[0] + '" data-action="to-step" data-k="' + x[0] + '" title="' + x[1] + '">' + (i + 1) + '</a></li>').join('') + '</ol><span class="small muted"><b class="num">' + steps + '</b> of 5 steps</span>' +
      '<span class="lesson-acts"><button type="button" class="btn ghost sm" data-action="add-today" data-id="' + gid + '">' + C.icon('plus') + 'Add to today</button></span></div></header>';

    html += '<ol class="flow">';
    // 1. Watch
    html += step('watch', 1, 'Watch', 'Start with a video. It makes the notes much easier to follow.', videoBlock(t), sd.watch, gid, 'key points');
    // 2. Learn the key points
    let learn = '';
    if (pts.length) learn += '<div class="kp"><p class="kp-h"><b>What you need to know</b><span class="num small muted" id="kp-n">' + ticks.length + '/' + pts.length + '</span></p><p class="muted small">From the specification. Tick a point once you could explain it without notes.</p><ul class="checklist">' +
      pts.map((x, i) => '<li><label><input type="checkbox" data-action="pt-toggle" data-id="' + gid + '" data-i="' + i + '"' + (ticks.indexOf(i) !== -1 ? ' checked' : '') + '><span>' + esc(x) + '</span></label></li>').join('') + '</ul></div>';
    if (t.tip) learn += '<aside class="tip-box"><p class="label">' + C.icon('bulb') + 'Exam tip</p><p>' + esc(t.tip) + '</p></aside>';
    if (notes.length) learn += '<p class="label">Read the notes</p>' + resRows(notes, 4);
    learn += '<details class="fold-lite"' + (ts.notes ? ' open' : '') + '><summary>Your own notes</summary><textarea id="notes-' + gid + '" class="notes" data-notes="' + gid + '" rows="6" placeholder="Key formulae, things you keep getting wrong, questions for your teacher…" aria-label="Your notes">' + esc(ts.notes || '') + '</textarea><span class="muted small" id="notes-saved">Saves as you type</span>' + myLinks(gid) + '</details>';
    html += step('learn', 2, 'Learn the key points', 'Read the notes and make sure you can do each point on the list.', learn, sd.learn, gid, 'test yourself');
    // 3. Test yourself
    let recall = '<div class="try-grid"><div class="try"><h3>' + C.icon('pen') + 'Blurt it</h3><p class="muted small">Close your notes. Write down everything you remember in 10 minutes, then check it against the key points.</p><button type="button" class="btn alt sm" data-action="blurt" data-id="' + gid + '">Start a blurt</button></div>' +
      '<div class="try"><h3>' + C.icon('cards') + 'Flashcards</h3>' + (decks.length ? '<ul class="deck-list">' + decks.map(RH.cards.deckRow).join('') + '</ul>' : '<p class="muted small">Make cards for the things you keep forgetting, or use the ready-made ones below.</p>') +
      '<div class="row-actions"><button type="button" class="btn alt sm" data-action="deck-new" data-topic="' + gid + '">' + C.icon('plus') + 'New deck</button><button type="button" class="btn ghost sm" data-action="cards-import" data-topic="' + gid + '">' + C.icon('upload') + 'Import</button></div>' +
      (cardRes.length ? C.resList(cardRes) : '') + '</div></div>';
    html += step('recall', 3, 'Test yourself', 'Pull it back out of your memory. That is what makes it stick.', recall, sd.recall, gid, 'exam questions');
    // 4. Exam questions
    let exam = practice.length ? '<p class="label">Questions with mark schemes</p>' + resRows(practice, 4) : '<p class="muted">No question pack linked for this lesson. Use a past paper from the course page.</p>';
    exam += '<div class="ai-cta"><span class="ai-ic">' + C.icon('spark') + '</span><div><b>Get your answer marked</b><p class="muted small">Type or photograph a question and your answer. Claude marks it like an Edexcel examiner and shows how to get full marks.</p></div><button type="button" class="btn" data-action="check-topic" data-id="' + gid + '">Check an answer</button></div>';
    if (checks.length) exam += '<p class="label">Your marked answers</p><ul class="list compact">' + checks.slice(0, 5).map((x) => '<li><a class="row link" href="#check-' + x.id + '"><span class="row-main"><b>' + esc((x.question || 'Question from a photo').slice(0, 80)) + '</b><span class="muted small">' + esc(U.fmtShort(x.date)) + '</span></span><span class="score-pill num">' + x.result.score + '/' + x.result.max + '</span></a></li>').join('') + '</ul>';
    html += step('exam', 4, 'Exam questions', 'Do a few real questions, then mark them against the mark scheme.', exam, sd.exam, gid, 'finish');
    // 5. Finish
    let fin = '<p class="label">How confident are you now?</p>' + C.ragFull(gid, ts.c || 0) +
      '<div class="fin-row">' + C.toggle('data-action="toggle-nt" data-id="' + gid + '"', 'Not taught yet', ts.nt, 'The planner leaves it until later.') + '</div>';
    if (other.length) fin += '<details class="fold-lite"><summary>Other links for this lesson</summary>' + C.resList(other) + '</details>';
    fin += done ? '<div class="fin-done"><p>' + C.icon('tick') + '<b>Lesson done</b>' + (ts.last ? ' · last revised ' + esc(U.fmtShort(ts.last)) : '') + '</p>' + (next ? '<a class="btn go lg" href="#t-' + next.gid + '">Next lesson: ' + M.lessonNum(s, next) + ' ' + esc(M.title(next.name)) + C.icon('right') + '</a>' : '<a class="btn lg" href="#s-' + sub.id + '">Back to the course</a>') + '</div>'
      : '<button type="button" class="btn go lg block" data-action="lesson-done" data-id="' + gid + '">' + C.icon('tick') + 'Complete lesson' + (next ? ' and go to ' + M.lessonNum(s, next) : '') + '</button>';
    html += step('finish', 5, 'Finish the lesson', 'Rate yourself honestly. The planner brings weaker lessons back sooner.', fin, done, gid);
    html += '</ol>';
    html += pager(prev && ['t-' + prev.gid, 'Previous lesson', M.lessonNum(s, prev) + ' ' + M.title(prev.name)], next && ['t-' + next.gid, 'Next lesson', M.lessonNum(s, next) + ' ' + M.title(next.name)]);
    return html + '</article></div>';
  };
  function myLinks(gid) {
    const links = (st().topics[gid] || {}).links || [];
    return '<div class="my-links"><p class="label">Your links</p>' +
      (links.length ? '<ul class="res-list">' + links.map((l, i) => '<li class="my-link"><a class="res" href="' + esc(l.u) + '" target="_blank" rel="noopener"><span class="res-t">' + esc(l.t) + '</span><span class="site">Mine</span>' + C.icon('ext', 'i-ext') + '</a><button type="button" class="icon-btn" data-action="link-del" data-id="' + gid + '" data-i="' + i + '" aria-label="Remove link">' + C.icon('x') + '</button></li>').join('') + '</ul>' : '') +
      '<form id="linkForm" class="inline-form" data-topic="' + gid + '"><input name="t" placeholder="Name, e.g. teacher worksheet" aria-label="Link name" required><input name="u" type="url" placeholder="https://…" aria-label="Link address" required><button type="submit" class="btn alt">' + C.icon('plus') + 'Add</button></form></div>';
  }

  V.blurt = function (gid) {
    const t = M.topic[gid];
    C.openModal('Blurt: ' + esc(M.title(t.name)), '<p class="muted">Write everything you remember about this topic without looking. Then reveal the key points and see what you missed.</p>' +
      '<textarea id="blurt-text" rows="9" placeholder="Start writing…"></textarea>' +
      '<div class="row-actions"><button type="button" class="btn" data-action="blurt-reveal">Reveal the key points</button><span class="num muted" id="blurt-clock">10:00</span></div><ul class="checklist plain" id="blurt-list" hidden>' + (t.pts || []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>', { wide: true, subj: t.subject.id });
    const end = Date.now() + 600000;
    const iv = setInterval(function () { const el = document.getElementById('blurt-clock'); if (!el) { clearInterval(iv); return; } el.textContent = RH.timer.fmt((end - Date.now()) / 1000); if (Date.now() > end) { clearInterval(iv); el.textContent = 'Time is up'; } }, 500);
  };

  // ---------- Library & guide ----------
  V.library = function () {
    let html = C.page({ eyebrow: 'Learn', title: 'Resources', lede: 'Every site the hub links to, and each subject’s whole-course resources. Each lesson has the links for that topic.' });
    html += M.subjects.map((sub) => '<details class="card fold" data-subj="' + sub.id + '"><summary>' + C.stag(sub.id) + '<h2>' + esc(sub.name) + '</h2><span class="muted small">' + sub.res.length + ' links</span></summary><div class="fold-body res-cols">' + C.resGroups(sub.res) + '</div></details>').join('');
    html += '<h2 class="after-h">Sites</h2><div class="site-grid">' + Object.keys(RH.SITES).map(function (k) {
      const x = RH.SITES[k];
      return '<a class="card site-card link" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="site">' + esc(x.short) + '</span><b>' + esc(x.name) + '</b><span class="muted small">' + esc(x.blurb) + '</span></a>';
    }).join('') + '</div>';
    return html;
  };
  V.guide = function () {
    const today = U.today();
    let html = C.page({ eyebrow: 'Learn', title: 'How to revise', lede: 'What works, how to revise each subject, and a plan for the year.' });
    html += '<section class="card"><div class="card-head"><h2>Your year, phase by phase</h2></div><ol class="phases">' + RH.GUIDE.phases.map(function (p) {
      const now = today >= p.from && today <= p.to, done = today > p.to;
      return '<li class="phase' + (now ? ' now' : '') + (done ? ' done' : '') + '"><span class="num small muted">' + esc(U.fmtShort(p.from)) + ' – ' + esc(U.fmtShort(p.to)) + '</span><b>' + esc(p.title) + (now ? ' ' + C.chip('You are here', 'info') : '') + '</b><p>' + esc(p.body) + '</p></li>';
    }).join('') + '</ol></section>';
    html += '<h2 class="after-h">Study skills that work</h2><div class="tech-grid">' + RH.GUIDE.techniques.map((x) => '<section class="card"><h3>' + esc(x.title) + '</h3><p class="muted">' + esc(x.body) + '</p><ul class="bullets small">' + x.how.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    html += '<h2 class="after-h">Subject by subject</h2><div class="tech-grid">' + M.subjects.map((sub) => '<section class="card" data-subj="' + sub.id + '"><h3>' + C.stag(sub.id) + ' ' + esc(sub.name) + '</h3><ul class="bullets small">' + RH.GUIDE.subjects[sub.id].map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    return html;
  };
})(window.RH = window.RH || {});
