/* Learn: each subject is a course of numbered sections and lessons. A lesson is one page you read down in order:
   watch, key points, test yourself, exam questions, finish. Plus the resource library and the revision guide. */
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
  V.statusIcon = statusIcon;
  const confMark = (c) => c ? '<span class="ls-conf c' + c + '" title="Confidence: ' + M.CONF[c].label + '"><span class="sr">' + M.CONF[c].label + '</span></span>' : '';
  function lessonRow(s, t, liAttr) {
    const ts = s.topics[t.gid] || {}, vids = M.videos(t).length;
    return '<li' + (liAttr || '') + '><a class="lrow' + (M.lessonDone(s, t.gid) ? ' is-done' : '') + '" href="#t-' + t.gid + '">' + statusIcon(s, t) +
      '<span class="lnum num">' + M.lessonNum(s, t) + '</span><span class="lname">' + esc(M.title(t.name)) + (ts.nt ? ' <span class="muted small">· not taught yet</span>' : '') + '</span>' +
      '<span class="lmeta small">' + (vids ? U.plural(vids, 'video') : '') + '</span>' + confMark(ts.c) + '</a></li>';
  }
  const progBar = (p) => '<span class="pbar" role="img" aria-label="' + p.done + ' of ' + p.total + ' done"><span style="width:' + Math.round(100 * p.frac) + '%"></span></span>';
  function pager(prev, next) {
    return '<nav class="pager" aria-label="Previous and next">' + (prev ? '<a href="#' + prev[0] + '" class="pg">' + C.icon('left') + '<span><span class="muted small">' + prev[1] + '</span><b>' + esc(prev[2]) + '</b></span></a>' : '<span></span>') +
      (next ? '<a href="#' + next[0] + '" class="pg next"><span><span class="muted small">' + next[1] + '</span><b>' + esc(next[2]) + '</b></span>' + C.icon('right') + '</a>' : '<span></span>') + '</nav>';
  }
  const docHead = (kicker, title, meta, actions) => '<header class="doc-head"><div>' + (kicker ? '<p class="kicker">' + kicker + '</p>' : '') + '<h1>' + title + '</h1>' + (meta ? '<p class="meta">' + meta + '</p>' : '') + '</div>' + (actions ? '<div class="doc-acts">' + actions + '</div>' : '') + '</header>';
  V.docHead = docHead;

  // ---------- All subjects ----------
  V.study = function () {
    const s = st();
    let html = docHead('Learn', 'Your subjects', 'Each subject is a list of lessons. Open one and work down the page: watch, learn the key points, test yourself, then exam questions.');
    html += '<ul class="subj-list">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub), p = M.courseProgress(s, topics), nx = M.nextLesson(s, sub, topics);
      const ex = M.upcomingExams(s).filter((e) => e.subject === sub.id)[0];
      return '<li data-subj="' + sub.id + '"><div class="sl-main"><a class="sl-name" href="#s-' + sub.id + '">' + esc(sub.name) + '</a><span class="muted small">' + esc(sub.board) + ' ' + esc(sub.spec) + ' · ' + U.plural(topics.length, 'lesson') + (ex ? ' · first paper ' + esc(U.fmt(ex.date)) : '') + '</span>' +
        '<span class="sl-prog">' + progBar(p) + '<span class="small muted">' + p.done + ' of ' + p.total + ' done</span></span></div>' +
        (nx ? '<a class="btn alt" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': ' + M.lessonNum(s, nx) + '</a>' : '<span class="muted small">All done</span>') + '</li>';
    }).join('') + '</ul>';
    const recent = Object.keys(s.topics).filter((g) => M.topic[g] && s.topics[g].last).sort((a, b) => s.topics[b].last.localeCompare(s.topics[a].last)).slice(0, 6);
    if (recent.length) html += '<h2 class="h-rule">Recently studied</h2><ul class="lessons">' + recent.map((g) => lessonRow(s, M.topic[g], ' data-subj="' + M.topic[g].subject.id + '"')).join('') + '</ul>';
    return html;
  };

  // ---------- One subject: its lessons ----------
  V.subject = function (sid) {
    const s = st(), sub = M.subject[sid];
    if (!sub) return V.notFound();
    const topics = M.subjectTopics(s, sub), p = M.courseProgress(s, topics), nx = M.nextLesson(s, sub, topics);
    const course = M.course(s, sub);
    let html = '<div data-subj="' + sid + '">';
    html += docHead(esc(sub.board) + ' · ' + esc(sub.spec), esc(sub.name), U.plural(course.length, 'section') + ' · ' + U.plural(topics.length, 'lesson') + ' · <b>' + p.done + ' done</b> ' + progBar(p),
      nx ? '<a class="btn" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': ' + M.lessonNum(s, nx) + ' ' + esc(M.title(nx.name)) + '</a>' : '');
    if (sid === 'further' && !s.profile.fmOptions) html += V.fmOptionsCard();
    let group = '';
    course.forEach(function (u) {
      const c = u.c, up = M.courseProgress(s, c.topics);
      if (c.group && c.group !== group) { html += '<p class="grp">' + esc(c.group) + '</p>'; group = c.group; }
      const chosen = !c.option || (s.profile.fmOptions || []).indexOf(c.option) !== -1;
      html += '<section class="sec"><h2 class="sec-h"><span class="sec-n num">' + u.n + '</span><a href="#c-' + c.gid + '">' + esc(M.title(c.name)) + '</a>' + (c.option && !chosen ? '<span class="muted small">option</span>' : '') + '<span class="sec-c small muted">' + up.done + '/' + up.total + '</span></h2>' +
        '<ol class="lessons">' + c.topics.map((t) => lessonRow(s, t)).join('') + '</ol></section>';
    });

    // Papers and whole-course extras.
    const exams = M.upcomingExams(s).filter((e) => e.subject === sid);
    const papers = sub.papers.filter((x) => !x.option || (s.profile.fmOptions && RH.FM_OPTIONS.some((o) => o.paper === x.id && s.profile.fmOptions.indexOf(o.id) !== -1)));
    html += '<h2 class="h-rule">Exam papers</h2><div class="table-wrap"><table class="tbl"><thead><tr><th>Paper</th><th>Name</th><th>Date</th><th>Length</th></tr></thead><tbody>' + papers.map(function (x) {
      const e = exams.find((y) => y.code === x.code);
      return '<tr><td class="num">' + esc(x.code) + '</td><td>' + esc(x.name.replace(/^Paper \w+: /, '')) + '</td><td>' + (e ? esc(U.fmt(e.date)) + ' <span class="muted small">(' + U.countdown(C.daysTo(e.date)) + ')</span>' : '<span class="muted">Not on your timetable</span>') + '</td><td>' + U.mins(x.dur) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    const extra = RH.SUBJECT_VIDEOS[sid] || [];
    const decks = Object.keys(s.decks).map((k) => s.decks[k]).filter((d) => d.subject === sid);
    html += '<h2 class="h-rule">More for the whole subject</h2>';
    if (extra.length) html += '<details class="fold"><summary>' + (sid === 'economics' ? 'Exam technique videos' : 'Whole-course videos') + ' <span class="muted small">' + extra.length + '</span></summary><div class="fold-body">' + C.videoGrid(extra.map((v) => ({ ch: v[0], id: v[1], title: v[2] })), sid) + '</div></details>';
    html += '<details class="fold"><summary>Flashcard decks <span class="muted small">' + decks.length + '</span></summary><div class="fold-body">' +
      (decks.length ? '<ul class="deck-list">' + decks.map(RH.cards.deckRow).join('') + '</ul>' : '<p class="muted small">No ' + esc(sub.name) + ' decks yet.</p>') +
      '<div class="row-actions"><button type="button" class="btn alt sm" data-action="cards-import">' + C.icon('upload') + 'Import from Quizlet or Gizmo</button>' +
      RH.STARTER_DECKS.filter((d) => d.subject === sid && !decks.some((x) => x.starter === d.id)).map((d) => '<button type="button" class="btn alt sm" data-action="starter-add" data-id="' + d.id + '">' + C.icon('plus') + esc(d.name) + '</button>').join('') + '</div></div></details>';
    html += '<details class="fold"><summary>Past papers and resources <span class="muted small">' + sub.res.length + '</span></summary><div class="fold-body res-cols">' + C.resGroups(sub.res) + '</div></details>';
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
    let html = '<div data-subj="' + sub.id + '">' + C.crumbs([[sub.name, 's-' + sub.id], [n + ' ' + M.title(c.name)]]);
    html += docHead('Section ' + n + ' · ' + c.papers.map((x) => esc(sub.paper[x].code)).join(', '), esc(M.title(c.name)), U.plural(c.topics.length, 'lesson') + ' · <b>' + p.done + ' done</b> ' + progBar(p),
      nx ? '<a class="btn" href="#t-' + nx.gid + '">' + (p.done ? 'Continue' : 'Start') + ': ' + M.lessonNum(s, nx) + '</a>' : '');
    html += '<ol class="lessons">' + c.topics.map((t) => lessonRow(s, t)).join('') + '</ol>';
    html += '<p class="small"><button type="button" class="btn link" data-action="comp-nt" data-comp="' + c.gid + '" data-v="' + (anyTaught ? 1 : 0) + '">' + (anyTaught ? 'Mark this section as not taught yet' : 'Mark this section as taught') + '</button> <span class="muted">The planner leaves untaught lessons until later.</span></p>';
    [[['notes'], 'Notes for the whole section'], [['qs', 'papers'], 'Questions and papers'], [['cards', 'other'], 'More']].forEach(function (g) {
      const list = res.filter((r) => g[0].indexOf(r.k) !== -1);
      if (list.length) html += '<h2 class="h-rule">' + g[1] + '</h2>' + C.resList(list);
    });
    html += pager(comps[idx - 1] && ['c-' + comps[idx - 1].gid, 'Previous section', M.sectionNum(s, comps[idx - 1]) + ' ' + M.title(comps[idx - 1].name)], comps[idx + 1] && ['c-' + comps[idx + 1].gid, 'Next section', M.sectionNum(s, comps[idx + 1]) + ' ' + M.title(comps[idx + 1].name)]);
    return html + '</div>';
  };

  // ---------- One lesson ----------
  function block(key, n, title, body, done, gid) {
    return '<section class="lsec' + (done ? ' done' : '') + '" id="step-' + key + '"><div class="lsec-h"><h2><span class="sn">' + (done ? C.icon('tick') : n) + '</span>' + title + '</h2>' +
      (key === 'finish' ? '' : '<button type="button" class="mark' + (done ? ' on' : '') + '" data-action="lesson-step" data-id="' + gid + '" data-k="' + key + '" aria-pressed="' + !!done + '"><span class="box">' + C.icon('tick') + '</span>' + (done ? 'Done' : 'Mark as done') + '</button>') + '</div>' +
      '<div class="lsec-b">' + body + '</div></section>';
  }
  const searchLinks = (t) => M.videoSearches(t).map((r) => '<a href="' + esc(r.u) + '" target="_blank" rel="noopener">' + esc(r.t) + '</a>').join(' · ');
  function videoBlock(t) {
    const vids = M.videos(t);
    if (!vids.length) return '<p>No video picked for this lesson yet. Search: ' + searchLinks(t) + '</p>';
    const v = vids[0];
    let html = '<a class="vmain" href="https://www.youtube.com/watch?v=' + v.id + '" target="_blank" rel="noopener"><span class="vthumb">' + (C.canThumb ? '<img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg" onerror="this.remove()">' : '') + '<span class="vplay">' + C.icon('play') + '</span></span>' +
      '<span class="vm-t"><b>' + esc(v.title) + '</b><span class="muted small">' + esc(C.channel(v.ch)) + ' · YouTube</span></span></a>';
    if (vids.length > 1) html += '<p class="sub-l">More videos</p><ul class="links">' + vids.slice(1).map((x) => '<li><a href="https://www.youtube.com/watch?v=' + x.id + '" target="_blank" rel="noopener">' + esc(x.title) + '</a> <span class="muted small">' + esc(C.channel(x.ch)) + '</span></li>').join('') + '</ul>';
    return html + '<p class="small muted">Search for more: ' + searchLinks(t) + '</p>';
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
    const prev = M.lessonAfter(s, t, -1), next = M.lessonAfter(s, t, 1);
    const ticks = ts.p || [], pts = t.pts || [];
    const res = M.resources(t, s);
    const notes = res.filter((r) => r.k === 'notes' || r.k === 'mine'), practice = res.filter((r) => r.k === 'qs' || r.k === 'papers'), cardRes = res.filter((r) => r.k === 'cards'), other = res.filter((r) => r.k === 'other');
    const decks = RH.cards.forTopic(gid);
    const checks = s.checks.filter((x) => x.topic === gid);
    const done = M.lessonDone(s, gid), steps = M.lessonSteps(s, gid);

    let html = '<div class="lesson" data-subj="' + sub.id + '">' + C.crumbs([[sub.name, 's-' + sub.id], [M.sectionNum(s, c) + ' ' + M.title(c.name), 'c-' + c.gid]]);
    html += docHead('Lesson ' + M.lessonNum(s, t) + ' · ' + c.papers.map((x) => esc(sub.paper[x].code)).join(', '), esc(M.title(t.name)),
      (done ? '<b class="ok-t">Done</b>' : steps ? steps + ' of 5 steps done' : 'Not started') + (ts.nt ? ' · not taught yet' : ''),
      '<button type="button" class="btn alt sm" data-action="add-today" data-id="' + gid + '">' + C.icon('plus') + 'Add to today</button>');
    html += '<nav class="jump" aria-label="On this page"><span class="muted">On this page:</span>' + M.STEPS.map((x, i) => '<a href="#step-' + x[0] + '" data-action="to-step" data-k="' + x[0] + '"' + ((x[0] === 'finish' ? done : sd[x[0]]) ? ' class="on"' : '') + '>' + (i + 1) + '. ' + ['Watch', 'Key points', 'Test yourself', 'Exam questions', 'Finish'][i] + '</a>').join('') + '</nav>';

    // 1. Watch
    html += block('watch', 1, 'Watch', videoBlock(t), sd.watch, gid);
    // 2. Key points
    let learn = '';
    if (pts.length) learn += '<p class="sub-l">What you need to know <span class="muted num" id="kp-n">' + ticks.length + '/' + pts.length + '</span></p><ul class="checklist">' +
      pts.map((x, i) => '<li><label><input type="checkbox" data-action="pt-toggle" data-id="' + gid + '" data-i="' + i + '"' + (ticks.indexOf(i) !== -1 ? ' checked' : '') + '><span>' + esc(x) + '</span></label></li>').join('') + '</ul><p class="help">Tick a point once you could explain it without your notes.</p>';
    if (t.tip) learn += '<p class="tip-line"><b>Exam tip:</b> ' + esc(t.tip) + '</p>';
    if (notes.length) learn += '<p class="sub-l">Notes to read</p>' + resRows(notes, 4);
    learn += '<details class="fold-lite"' + (ts.notes ? ' open' : '') + '><summary>Your own notes</summary><textarea id="notes-' + gid + '" class="notes" data-notes="' + gid + '" rows="5" placeholder="Key formulae, things you keep getting wrong, questions for your teacher…" aria-label="Your notes">' + esc(ts.notes || '') + '</textarea><span class="muted small" id="notes-saved">Saves as you type</span>' + myLinks(gid) + '</details>';
    html += block('learn', 2, 'Key points', learn, sd.learn, gid);
    // 3. Test yourself
    let recall = '<p><b>Blurt test.</b> Close your notes, write down everything you remember in 10 minutes, then compare it with the key points. <button type="button" class="btn alt sm" data-action="blurt" data-id="' + gid + '">Start</button></p>';
    recall += '<p><b>Flashcards.</b> ' + (decks.length ? 'Your decks for this lesson:' : 'Make cards for the things you keep forgetting.') + ' <button type="button" class="btn link" data-action="deck-new" data-topic="' + gid + '">New deck</button> · <button type="button" class="btn link" data-action="cards-import" data-topic="' + gid + '">Import from Quizlet</button></p>';
    if (decks.length) recall += '<ul class="deck-list">' + decks.map(RH.cards.deckRow).join('') + '</ul>';
    if (cardRes.length) recall += C.resList(cardRes);
    html += block('recall', 3, 'Test yourself', recall, sd.recall, gid);
    // 4. Exam questions
    let exam = practice.length ? resRows(practice, 4) : '<p class="muted">No question pack for this lesson. Use a past paper from the subject page.</p>';
    exam += '<p><b>Get an answer marked.</b> Type or photograph a question and your answer, and Claude marks it like an Edexcel examiner. <button type="button" class="btn alt sm" data-action="check-topic" data-id="' + gid + '">' + C.icon('check') + 'Check an answer</button></p>';
    if (checks.length) exam += '<ul class="links">' + checks.slice(0, 5).map((x) => '<li><a href="#check-' + x.id + '">' + esc((x.question || 'Question from a photo').slice(0, 80)) + '</a> <span class="num small">' + x.result.score + '/' + x.result.max + '</span> <span class="muted small">' + esc(U.fmtShort(x.date)) + '</span></li>').join('') + '</ul>';
    html += block('exam', 4, 'Exam questions', exam, sd.exam, gid);
    // 5. Finish
    let fin = '<p class="sub-l">How confident are you now?</p>' + C.ragFull(gid, ts.c || 0) + C.toggle('data-action="toggle-nt" data-id="' + gid + '"', 'Not taught yet', ts.nt, 'The planner leaves it until later.');
    if (other.length) fin += '<details class="fold-lite"><summary>Other links</summary>' + C.resList(other) + '</details>';
    fin += done ? '<p class="ok-t"><b>' + C.icon('tick', 'i-sm') + ' Lesson done.</b> <span class="muted">' + (ts.last ? 'Last revised ' + esc(U.fmtShort(ts.last)) : '') + '</span></p>' + (next ? '<p><a class="btn" href="#t-' + next.gid + '">Next lesson: ' + M.lessonNum(s, next) + ' ' + esc(M.title(next.name)) + '</a></p>' : '')
      : '<p><button type="button" class="btn" data-action="lesson-done" data-id="' + gid + '">' + C.icon('tick') + 'Complete lesson' + (next ? ' and go to ' + M.lessonNum(s, next) : '') + '</button></p>';
    html += block('finish', 5, 'Finish', fin, done, gid);
    html += pager(prev && ['t-' + prev.gid, 'Previous lesson', M.lessonNum(s, prev) + ' ' + M.title(prev.name)], next && ['t-' + next.gid, 'Next lesson', M.lessonNum(s, next) + ' ' + M.title(next.name)]);
    return html + '</div>';
  };
  function myLinks(gid) {
    const links = (st().topics[gid] || {}).links || [];
    return '<div class="my-links"><p class="sub-l">Your links</p>' +
      (links.length ? '<ul class="res-list">' + links.map((l, i) => '<li class="my-link"><a class="res" href="' + esc(l.u) + '" target="_blank" rel="noopener"><span class="res-t">' + esc(l.t) + '</span><span class="site">Mine</span>' + C.icon('ext', 'i-ext') + '</a><button type="button" class="icon-btn" data-action="link-del" data-id="' + gid + '" data-i="' + i + '" aria-label="Remove link">' + C.icon('x') + '</button></li>').join('') + '</ul>' : '') +
      '<form id="linkForm" class="inline-form" data-topic="' + gid + '"><input name="t" placeholder="Name, e.g. teacher worksheet" aria-label="Link name" required><input name="u" type="url" placeholder="https://…" aria-label="Link address" required><button type="submit" class="btn alt">Add</button></form></div>';
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
    let html = docHead('Learn', 'Resources', 'Every site the hub links to, and each subject’s whole-course resources. Each lesson has the links for its own topic.');
    html += M.subjects.map((sub) => '<details class="fold" data-subj="' + sub.id + '"><summary>' + esc(sub.name) + ' <span class="muted small">' + sub.res.length + ' links</span></summary><div class="fold-body res-cols">' + C.resGroups(sub.res) + '</div></details>').join('');
    html += '<h2 class="h-rule">Sites</h2><ul class="links">' + Object.keys(RH.SITES).map(function (k) {
      const x = RH.SITES[k];
      return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name) + '</a> <span class="muted small">' + esc(x.blurb) + '</span></li>';
    }).join('') + '</ul>';
    return html;
  };
  V.guide = function () {
    const today = U.today();
    let html = docHead('Learn', 'How to revise', 'What works, how to revise each subject, and a plan for the year.');
    html += '<h2 class="h-rule">Your year, phase by phase</h2><ol class="phases">' + RH.GUIDE.phases.map(function (p) {
      const now = today >= p.from && today <= p.to, done = today > p.to;
      return '<li class="phase' + (now ? ' now' : '') + (done ? ' done' : '') + '"><span class="small muted">' + esc(U.fmtShort(p.from)) + ' – ' + esc(U.fmtShort(p.to)) + '</span><b>' + esc(p.title) + (now ? ' ' + C.chip('You are here', 'info') : '') + '</b><p>' + esc(p.body) + '</p></li>';
    }).join('') + '</ol>';
    html += '<h2 class="h-rule">Study skills that work</h2>' + RH.GUIDE.techniques.map((x) => '<h3>' + esc(x.title) + '</h3><p class="muted">' + esc(x.body) + '</p><ul class="bullets">' + x.how.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul>').join('');
    html += '<h2 class="h-rule">Subject by subject</h2>' + M.subjects.map((sub) => '<h3>' + esc(sub.name) + '</h3><ul class="bullets">' + RH.GUIDE.subjects[sub.id].map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul>').join('');
    return html;
  };
})(window.RH = window.RH || {});
