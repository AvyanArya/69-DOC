/* Study: subjects, sections and sub-topics, plus the resource library and the revision guide. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;

  // ---------- Subjects ----------
  V.study = function () {
    const s = st();
    let html = C.subnav('study', 'study') + C.page({ eyebrow: 'Study', title: 'Subjects', lede: 'Each subject is split into sections, and each section into sub-topics with videos, notes, questions, flashcards and a checklist.' });
    html += '<div class="subj-grid">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub), comps = M.compsFor(s, sub);
      const ex = M.upcomingExams(s).filter((e) => e.subject === sub.id);
      const vids = topics.reduce((a, t) => a + M.videos(t).length, 0);
      return '<a class="card subj link" href="#s-' + sub.id + '" data-subj="' + sub.id + '"><span class="subj-top">' + C.stag(sub.id) + '<span class="muted small num">' + esc(sub.spec) + '</span></span>' +
        '<span class="subj-name">' + esc(sub.name) + '</span>' + C.stack(M.ragCounts(s, topics), sub.name) +
        '<span class="subj-meta small"><span><b class="num">' + U.pct(M.readiness(s, topics)) + '</b> confident</span><span>' + comps.length + ' sections</span><span>' + topics.length + ' sub-topics</span><span>' + vids + ' videos</span></span>' +
        '<span class="muted small">' + (ex.length ? 'First paper ' + esc(U.fmt(ex[0].date)) + ', ' + U.countdown(C.daysTo(ex[0].date)) : 'No upcoming papers') + '</span></a>';
    }).join('') + '</div>';
    const recent = Object.keys(s.topics).filter((g) => M.topic[g] && s.topics[g].last).sort((a, b) => s.topics[b].last.localeCompare(s.topics[a].last)).slice(0, 6);
    if (recent.length) html += '<section class="card"><div class="card-head"><h2>Recently revised</h2></div><ul class="list compact">' + recent.map((g) => { const t = M.topic[g]; return '<li><a class="row link" href="#t-' + g + '" data-subj="' + t.subject.id + '">' + C.stag(t.subject.id) + '<span class="row-main"><b>' + esc(t.name) + '</b><span class="muted small">' + esc(t.comp.name) + ' · ' + esc(U.fmtShort(s.topics[g].last)) + '</span></span>' + C.ragDots(g, s.topics[g].c || 0) + '</a></li>'; }).join('') + '</ul></section>';
    return html;
  };

  V.subject = function (sid) {
    const s = st(), sub = M.subject[sid];
    if (!sub) return V.notFound();
    const topics = M.subjectTopics(s, sub);
    const exams = M.upcomingExams(s).filter((e) => e.subject === sid);
    const papers = sub.papers.filter((p) => !p.option || (s.profile.fmOptions && RH.FM_OPTIONS.some((o) => o.paper === p.id && s.profile.fmOptions.indexOf(o.id) !== -1)));
    const tab = C.tab('subj-' + sid, 'sections');
    const decks = Object.keys(s.decks).map((k) => s.decks[k]).filter((d) => d.subject === sid);
    const extra = RH.SUBJECT_VIDEOS[sid] || [];
    let html = C.subnav('study', 'study') + '<div data-subj="' + sid + '">' + C.crumbs([['Subjects', 'study'], [sub.name]]) +
      C.page({ eyebrow: C.stag(sid) + ' ' + esc(sub.board) + ' · ' + esc(sub.spec), title: esc(sub.name), lede: U.plural(topics.length, 'sub-topic') + ' · <b>' + U.pct(M.readiness(s, topics)) + '</b> confident' }) +
      C.stack(M.ragCounts(s, topics), sub.name);
    html += '<div class="papers-row">' + papers.map(function (p) {
      const e = exams.find((x) => x.code === p.code);
      return '<div class="paper-chip"><span class="num label">' + esc(p.code) + '</span><b>' + esc(p.name.replace(/^Paper \w+: /, '')) + '</b><span class="muted small">' + (e ? esc(U.fmt(e.date)) + ' · ' + U.countdown(C.daysTo(e.date)) : 'Not on your timetable') + ' · ' + U.mins(p.dur) + '</span></div>';
    }).join('') + '</div>';
    if (sid === 'further' && !s.profile.fmOptions) html += V.fmOptionsCard();
    const tabs = [['sections', 'Sections', 'grid', M.compsFor(s, sub, true).length], ['resources', 'Papers & resources', 'link', sub.res.length]];
    if (extra.length) tabs.push(['technique', sid === 'economics' ? 'Exam technique' : 'Course videos', 'video', extra.length]);
    tabs.push(['cards', 'Flashcards', 'cards', decks.length]);
    html += C.tabs('subj-' + sid, tabs, tab);
    if (tab === 'resources') return html + '<div class="res-cols">' + C.resGroups(sub.res) + '</div></div>';
    if (tab === 'technique') return html + '<p class="muted">' + (sid === 'economics' ? 'EconplusDal on each Edexcel question type, and how to write analysis, evaluation and a judgement.' : 'Videos that cover the whole course.') + '</p>' + C.videoGrid(extra.map((v) => ({ ch: v[0], id: v[1], title: v[2] })), sid) + '</div>';
    if (tab === 'cards') return html + (decks.length ? '<section class="card"><ul class="deck-list">' + decks.map(RH.cards.deckRow).join('') + '</ul></section>' : '<p class="muted">No ' + esc(sub.name) + ' decks yet.</p>') +
      '<div class="row-actions"><button type="button" class="btn alt" data-action="cards-import">' + C.icon('upload') + 'Import from Quizlet or Gizmo</button>' +
      RH.STARTER_DECKS.filter((d) => d.subject === sid && !decks.some((x) => x.starter === d.id)).map((d) => '<button type="button" class="btn alt" data-action="starter-add" data-id="' + d.id + '">' + C.icon('plus') + esc(d.name) + '</button>').join('') + '</div></div>';
    let group = '';
    html += '<div class="sec-grid">';
    M.compsFor(s, sub, true).forEach(function (c) {
      if (c.group && c.group !== group) { html += '</div><h2 class="group-h">' + esc(c.group) + '</h2><div class="sec-grid">'; group = c.group; }
      const n = M.ragCounts(s, c.topics);
      const ticked = c.topics.reduce((a, t) => a + ((s.topics[t.gid] || {}).p || []).length, 0), pts = c.topics.reduce((a, t) => a + (t.pts || []).length, 0);
      html += '<a class="card sec link" href="#c-' + c.gid + '"><span class="sec-name">' + esc(c.name) + '</span><span class="muted small">' + U.plural(c.topics.length, 'sub-topic') + ' · ' + U.plural(M.compVideos(c), 'video') + ' · ' + c.papers.map((p) => sub.paper[p].code).join(', ') + '</span>' +
        C.stack(n, c.name) + '<span class="sec-foot small"><span><b class="num">' + U.pct(M.readiness(s, c.topics)) + '</b> confident</span><span class="muted num">' + ticked + '/' + pts + ' checklist</span></span></a>';
    });
    return html + '</div></div>';
  };

  // ---------- Section ----------
  V.section = function (cgid) {
    const s = st(), c = M.comp[cgid];
    if (!c) return V.notFound();
    const sub = c.subject, all = c.topics;
    const anyTaught = all.some((t) => !(s.topics[t.gid] || {}).nt);
    const res = M.compResources(c);
    const tab = C.tab('sec-' + cgid, 'topics');
    const comps = M.compsFor(s, sub, true), idx = comps.indexOf(c);
    let html = C.subnav('study', 'study') + '<div data-subj="' + sub.id + '">' + C.crumbs([['Subjects', 'study'], [sub.name, 's-' + sub.id], [c.name]]);
    html += C.page({ eyebrow: C.stag(sub.id) + ' ' + esc(c.group || sub.name), title: esc(c.name), lede: U.plural(all.length, 'sub-topic') + ' · ' + U.plural(M.compVideos(c), 'video') + ' · <b>' + U.pct(M.readiness(s, all)) + '</b> confident · ' + c.papers.map((p) => esc(sub.paper[p].code)).join(', ') }) + C.stack(M.ragCounts(s, all), c.name);
    html += C.tabs('sec-' + cgid, [['topics', 'Sub-topics', 'list', all.length], ['notes', 'Notes', 'notes', res.filter((r) => r.k === 'notes').length], ['practice', 'Practice & papers', 'qs', res.filter((r) => r.k === 'qs' || r.k === 'papers').length], ['more', 'More', 'link', res.filter((r) => r.k === 'cards' || r.k === 'other').length]], tab);
    if (tab === 'topics') {
      html += '<div class="bar-tools"><span class="muted small">Rate each sub-topic with the dots. Open one for videos, notes and questions.</span><button type="button" class="btn ghost sm" data-action="comp-nt" data-comp="' + c.gid + '" data-v="' + (anyTaught ? 1 : 0) + '">' + (anyTaught ? 'Mark all as not taught yet' : 'Mark all as taught') + '</button></div>';
      html += '<section class="card flush"><ol class="topic-list">' + all.map(function (t) {
        const ts = s.topics[t.gid] || {}, ticked = (ts.p || []).length, total = (t.pts || []).length, vids = M.videos(t).length;
        return '<li class="topic-row' + (ts.nt ? ' nt' : '') + '"><a href="#t-' + t.gid + '" class="tr-name"><b>' + esc(t.name) + '</b><span class="tr-meta small">' +
          (vids ? '<span class="pill">' + C.icon('video') + vids + '</span>' : '') + (total ? '<span class="pill">' + C.icon('list') + ticked + '/' + total + '</span>' : '') +
          (ts.nt ? '<span class="pill warn">Not taught yet</span>' : ts.last ? '<span class="muted">revised ' + esc(U.fmtShort(ts.last)) + '</span>' : '') + '</span></a>' + C.ragDots(t.gid, ts.c || 0) + '</li>';
      }).join('') + '</ol></section>';
    } else {
      const kinds = tab === 'notes' ? ['notes'] : tab === 'practice' ? ['qs', 'papers'] : ['cards', 'other'];
      const list = res.filter((r) => kinds.indexOf(r.k) !== -1);
      html += list.length ? '<div class="res-cols">' + C.resGroups(list, kinds) + '</div>' : '<p class="muted">Nothing for the whole section here. Each sub-topic has its own.</p>';
    }
    html += pager(comps[idx - 1] && ['c-' + comps[idx - 1].gid, 'Previous section', comps[idx - 1].name], comps[idx + 1] && ['c-' + comps[idx + 1].gid, 'Next section', comps[idx + 1].name]);
    return html + '</div>';
  };
  function pager(prev, next) {
    return '<nav class="pager">' + (prev ? '<a href="#' + prev[0] + '" class="card pg link">' + C.icon('left') + '<span><span class="muted small">' + prev[1] + '</span><b>' + esc(prev[2]) + '</b></span></a>' : '<span></span>') +
      (next ? '<a href="#' + next[0] + '" class="card pg link next"><span><span class="muted small">' + next[1] + '</span><b>' + esc(next[2]) + '</b></span>' + C.icon('right') + '</a>' : '<span></span>') + '</nav>';
  }

  // ---------- Sub-topic ----------
  V.topic = function (gid) {
    const s = st(), t = M.topic[gid];
    if (!t) return V.notFound();
    const ts = M.ts(s, gid), sub = t.subject, c = t.comp;
    const prev = c.topics[t.index - 1], next = c.topics[t.index + 1];
    const ticks = ts.p || [];
    const vids = M.videos(t), searches = M.videoSearches(t);
    const res = M.resources(t, s);
    const notes = res.filter((r) => r.k === 'notes' || r.k === 'mine'), practice = res.filter((r) => r.k === 'qs' || r.k === 'papers'), more = res.filter((r) => r.k === 'cards' || r.k === 'other');
    const decks = RH.cards.forTopic(gid);
    const checks = s.checks.filter((x) => x.topic === gid);
    const tab = RH.ui.tabs.topic || 'videos';
    let html = C.subnav('study', 'study') + '<div data-subj="' + sub.id + '">' + C.crumbs([['Subjects', 'study'], [sub.name, 's-' + sub.id], [c.name, 'c-' + c.gid], [t.name]]);
    html += C.page({ eyebrow: C.stag(sub.id) + ' ' + c.papers.map((p) => esc(sub.paper[p].code)).join(' · '), title: esc(t.name),
      actions: '<button type="button" class="btn" data-action="check-topic" data-id="' + gid + '">' + C.icon('check') + 'Check an answer</button><button type="button" class="btn alt" data-action="add-today" data-id="' + gid + '">' + C.icon('plus') + 'Add to today</button>' });
    html += '<section class="card status"><div class="status-l"><span class="label">How confident are you?</span>' + C.ragFull(gid, ts.c || 0) + '</div>' +
      '<div class="status-r"><button type="button" class="btn alt sm" data-action="mark-revised" data-id="' + gid + '">' + C.icon('tick') + 'Revised today</button><span class="muted small">' + (ts.n ? 'Revised ' + U.plural(ts.n, 'time') + (ts.last ? ', last ' + esc(U.fmtShort(ts.last)) : '') : 'Not revised yet') + '</span>' +
      C.toggle('data-action="toggle-nt" data-id="' + gid + '"', 'Not taught yet', ts.nt) + '</div></section>';
    html += C.tabs('topic', [['videos', 'Videos', 'video', vids.length], ['notes', 'Notes', 'notes', notes.length], ['practice', 'Practice', 'qs', practice.length + checks.length], ['cards', 'Flashcards', 'cards', decks.length], ['checklist', 'Checklist', 'list', ticks.length + '/' + (t.pts || []).length], ['mine', 'My notes', 'pen']], tab);
    html += '<div class="tab-panel">';
    if (tab === 'videos') {
      html += vids.length ? C.videoGrid(vids, sub.id) : '<p class="muted">No hand-picked videos for this sub-topic yet. Search the channels below.</p>';
      html += '<div class="search-more"><span class="label">Search for more on</span>' + searches.map((r) => '<a class="chip-link" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + C.icon('search') + esc(r.t) + '</a>').join('') + '</div>';
    } else if (tab === 'notes') {
      html += notes.length ? '<div class="res-cols">' + C.resGroups(notes, ['mine', 'notes']) + '</div>' : '<p class="muted">No notes linked yet.</p>';
      html += myLinks(gid);
    } else if (tab === 'practice') {
      html += '<section class="card soft cta"><div><h3>' + C.icon('spark') + 'Get an answer marked</h3><p class="muted small">Do a question from the links below, then let Claude mark it against the mark scheme and show you how to get full marks.</p></div><button type="button" class="btn" data-action="check-topic" data-id="' + gid + '">Check an answer</button></section>';
      if (checks.length) html += '<section class="card"><div class="card-head"><h2>Your checked answers</h2></div><ul class="list compact">' + checks.slice(0, 6).map((x) => '<li><a class="row link" href="#check-' + x.id + '"><span class="row-main"><b>' + esc((x.question || 'Question from a photo').slice(0, 80)) + '</b><span class="muted small">' + esc(U.fmtShort(x.date)) + '</span></span><span class="score-pill num">' + x.result.score + '/' + x.result.max + '</span></a></li>').join('') + '</ul></section>';
      html += practice.length ? '<div class="res-cols">' + C.resGroups(practice, ['qs', 'papers']) + '</div>' : '<p class="muted">No questions linked yet.</p>';
      if (more.length) html += '<div class="res-cols">' + C.resGroups(more, ['cards', 'other']) + '</div>';
    } else if (tab === 'cards') {
      html += RH.cards.topicPanel(t);
    } else if (tab === 'checklist') {
      if (t.pts && t.pts.length) html += '<section class="card"><div class="card-head"><h2>Spec checklist</h2><span class="num muted small">' + ticks.length + '/' + t.pts.length + '</span></div><p class="muted small">Tick a point when you could answer an exam question on it without notes.</p><ul class="checklist">' +
        t.pts.map((p, i) => '<li><label><input type="checkbox" data-action="pt-toggle" data-id="' + gid + '" data-i="' + i + '"' + (ticks.indexOf(i) !== -1 ? ' checked' : '') + '><span>' + esc(p) + '</span></label></li>').join('') + '</ul>' +
        '<div class="row-actions"><button type="button" class="btn alt sm" data-action="blurt" data-id="' + gid + '">' + C.icon('pen') + 'Blurt test: write it all from memory</button></div></section>';
      if (t.tip) html += '<aside class="tip-card card"><p class="label">' + C.icon('bulb') + 'Exam tip</p><p>' + esc(t.tip) + '</p></aside>';
    } else if (tab === 'mine') {
      html += '<section class="card"><div class="card-head"><h2><label for="notes-' + gid + '">My notes & mistakes log</label></h2><span class="muted small" id="notes-saved">Saves as you type</span></div>' +
        '<textarea id="notes-' + gid + '" class="notes" data-notes="' + gid + '" rows="10" placeholder="Key formulae, things you keep getting wrong, questions for your teacher…">' + esc(ts.notes || '') + '</textarea></section>' + myLinks(gid);
    }
    html += '</div>' + pager(prev && ['t-' + prev.gid, 'Previous', prev.name], next && ['t-' + next.gid, 'Next', next.name]) + '</div>';
    return html;
  };
  function myLinks(gid) {
    const links = (st().topics[gid] || {}).links || [];
    return '<section class="card"><div class="card-head"><h2>My links</h2></div><p class="muted small">Add your teacher’s resources or anything else you use. They appear at the top of Notes.</p>' +
      (links.length ? '<ul class="res-list">' + links.map((l, i) => '<li class="my-link"><a class="res" href="' + esc(l.u) + '" target="_blank" rel="noopener"><span class="res-t">' + esc(l.t) + '</span><span class="site">Mine</span>' + C.icon('ext', 'i-ext') + '</a><button type="button" class="icon-btn" data-action="link-del" data-id="' + gid + '" data-i="' + i + '" aria-label="Remove link">' + C.icon('x') + '</button></li>').join('') + '</ul>' : '') +
      '<form id="linkForm" class="inline-form" data-topic="' + gid + '"><input name="t" placeholder="Name, e.g. Mr Gale worksheet" aria-label="Link name" required><input name="u" type="url" placeholder="https://…" aria-label="Link address" required><button type="submit" class="btn alt">' + C.icon('plus') + 'Add</button></form></section>';
  }

  V.blurt = function (gid) {
    const t = M.topic[gid];
    C.openModal('Blurt: ' + esc(t.name), '<p class="muted">Write everything you remember about this topic without looking. Then reveal the checklist and see what you missed.</p>' +
      '<textarea id="blurt-text" rows="9" placeholder="Start writing…"></textarea>' +
      '<div class="row-actions"><button type="button" class="btn" data-action="blurt-reveal">Reveal the checklist</button><span class="num muted" id="blurt-clock">10:00</span></div><ul class="checklist plain" id="blurt-list" hidden>' + (t.pts || []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>', { wide: true, subj: t.subject.id });
    const end = Date.now() + 600000;
    const iv = setInterval(function () { const el = document.getElementById('blurt-clock'); if (!el) { clearInterval(iv); return; } el.textContent = RH.timer.fmt((end - Date.now()) / 1000); if (Date.now() > end) { clearInterval(iv); el.textContent = 'Time is up'; } }, 500);
  };

  // ---------- Library & guide ----------
  V.library = function () {
    let html = C.subnav('study', 'library') + C.page({ eyebrow: 'Study', title: 'Resources', lede: 'Every site the hub links to, and each subject’s whole-course resources. Each sub-topic has the links for that topic.' });
    html += M.subjects.map((sub) => '<details class="card fold" data-subj="' + sub.id + '"><summary>' + C.stag(sub.id) + '<h2>' + esc(sub.name) + '</h2><span class="muted small">' + sub.res.length + ' links</span></summary><div class="fold-body res-cols">' + C.resGroups(sub.res) + '</div></details>').join('');
    html += '<h2 class="group-h">Sites</h2><div class="site-grid">' + Object.keys(RH.SITES).map(function (k) {
      const x = RH.SITES[k];
      return '<a class="card site-card link" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="site">' + esc(x.short) + '</span><b>' + esc(x.name) + '</b><span class="muted small">' + esc(x.blurb) + '</span></a>';
    }).join('') + '</div>';
    return html;
  };
  V.guide = function () {
    const today = U.today();
    let html = C.subnav('study', 'guide') + C.page({ eyebrow: 'Study', title: 'How to revise', lede: 'What works, how to revise each subject, and a plan for the year.' });
    html += '<section class="card"><div class="card-head"><h2>Your year, phase by phase</h2></div><ol class="phases">' + RH.GUIDE.phases.map(function (p) {
      const now = today >= p.from && today <= p.to, done = today > p.to;
      return '<li class="phase' + (now ? ' now' : '') + (done ? ' done' : '') + '"><span class="num small muted">' + esc(U.fmtShort(p.from)) + ' – ' + esc(U.fmtShort(p.to)) + '</span><b>' + esc(p.title) + (now ? ' ' + C.chip('You are here', 'info') : '') + '</b><p>' + esc(p.body) + '</p></li>';
    }).join('') + '</ol></section>';
    html += '<h2 class="group-h">Study skills that work</h2><div class="tech-grid">' + RH.GUIDE.techniques.map((x) => '<section class="card"><h3>' + esc(x.title) + '</h3><p class="muted">' + esc(x.body) + '</p><ul class="bullets small">' + x.how.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    html += '<h2 class="group-h">Subject by subject</h2><div class="tech-grid">' + M.subjects.map((sub) => '<section class="card" data-subj="' + sub.id + '"><h3>' + C.stag(sub.id) + ' ' + esc(sub.name) + '</h3><ul class="bullets small">' + RH.GUIDE.subjects[sub.id].map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    return html;
  };
})(window.RH = window.RH || {});
