/* Core pages: Today, subjects → sections → sub-topics, planner, library, guide, settings and navigation. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;
  const icon = C.icon, stag = C.stag, stack = C.stack;

  function pastPaperLinks(subject) { return M.subject[subject].res.filter((r) => r.k === 'papers'); }

  // ---------- Session cards ----------
  V.sessTitle = function (s) {
    const t = s.t && M.topic[s.t];
    if (t) return t.name;
    const e = s.e && M.examById(st(), s.e);
    if (e) return (s.k === 'pp' ? 'Past paper: ' : 'Review for ') + e.title;
    return RH.KIND[s.k] ? RH.KIND[s.k].label : 'Session';
  };

  V.sessCard = function (s) {
    const t = s.t && M.topic[s.t];
    const subj = M.subject[s.s];
    const justDone = RH.ui.justDone === s.id && t;
    const ctx = t ? t.comp.name : (s.e ? (M.examById(st(), s.e) || {}).code || '' : '');
    const kind = RH.KIND[s.k] || { label: s.k, how: '' };
    let links = '';
    if (t) {
      const vids = M.videos(t);
      const res = M.resources(t, st());
      links = (vids.length ? '<a class="mini-res" href="#t-' + t.gid + '" data-action="topic-tab" data-v="videos">' + icon('video') + U.plural(vids.length, 'video') + '</a>' : '') +
        ['notes', 'qs'].map((k) => res.find((r) => r.k === k)).filter(Boolean).map((r) => '<a class="mini-res" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + C.site(r) + esc(RH.KINDS[r.k].split(' ')[0]) + '</a>').join('');
    } else if (s.e) {
      links = '<a class="mini-res" href="#portal">' + icon('portal') + 'Sit it in the exam portal</a>' + pastPaperLinks(s.s).slice(0, 2).map((r) => '<a class="mini-res" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + C.site(r) + 'Past papers</a>').join('');
    }
    return '<article class="sess' + (s.done ? ' done' : '') + '" data-subj="' + s.s + '">' +
      '<div class="sess-main">' +
        '<div class="sess-top">' + stag(s.s) + '<span class="kind k-' + s.k + '">' + esc(kind.label) + '</span><span class="mono muted">' + U.mins(s.m) + '</span></div>' +
        '<h3 class="sess-title">' + (t ? '<a href="#t-' + t.gid + '">' + esc(t.name) + '</a>' : esc(V.sessTitle(s))) + '</h3>' +
        '<p class="sess-meta">' + esc(subj ? subj.name : '') + (ctx ? ' · ' + esc(ctx) : '') + (s.why ? ' · ' + esc(s.why) : '') + '</p>' +
        '<p class="sess-how">' + esc(kind.how) + '</p>' +
        (links ? '<div class="sess-links">' + links + '</div>' : '') +
        (justDone ? '<div class="sess-rate"><span class="label">How confident are you now?</span>' + C.ragDots(t.gid, M.conf(st(), t.gid)) + '</div>' : '') +
      '</div>' +
      '<div class="sess-actions">' +
        '<button type="button" class="btn btn-done" data-action="sess-done" data-id="' + s.id + '" aria-pressed="' + !!s.done + '">' + icon('check') + '<span>' + (s.done ? 'Done' : 'Mark done') + '</span></button>' +
        (s.done ? '' : '<button type="button" class="btn-icon" data-action="timer-open" data-id="' + s.id + '" title="Start a timer for this session" aria-label="Start a timer for this session">' + icon('timer') + '</button>' +
        '<button type="button" class="btn-icon" data-action="sess-later" data-id="' + s.id + '" title="Move to tomorrow" aria-label="Move to tomorrow">' + icon('later') + '</button>') +
      '</div></article>';
  };

  // ---------- Shared cards ----------
  V.fmOptionsCard = function (compact) {
    const chosen = st().profile.fmOptions || RH.ui.fmDraft || ['fs1', 'fm1'];
    return '<section class="note-card" id="fmopts"><div class="nc-text"><h2>Your Further Maths options</h2><p>Pick the two option modules you sit for Papers 3 and 4. Mr Gale\'s resources cover <b>Further Statistics 1</b> and <b>Further Mechanics 1</b>, so those are ticked to start with.</p></div>' +
      '<div class="opt-grid">' + RH.FM_OPTIONS.map((o) => {
        const p = M.subject.further.paper[o.paper];
        return '<label class="opt"><input type="checkbox" data-fmopt="' + o.id + '"' + (chosen.indexOf(o.id) !== -1 ? ' checked' : '') + '><span><b>' + esc(o.name) + '</b><span class="mono muted">' + esc(p.code) + '</span></span></label>';
      }).join('') + '</div>' +
      '<div class="row-actions"><button type="button" class="btn" data-action="fm-save">Save options</button>' + (compact ? '' : '<span class="muted small">You can change this any time in Settings.</span>') + '</div></section>';
  };

  V.staleBanner = function () {
    const p = st().plan;
    const stale = p.builtAt && (p.settingsAt > p.builtAt || st().ratedAt > p.builtAt);
    const missed = p.sessions.filter((s) => !s.done && s.d < U.today()).length;
    if (!stale && !missed) return '';
    const why = [];
    if (missed) why.push(U.plural(missed, 'past session') + ' not done');
    if (stale) why.push(p.settingsAt > p.builtAt ? 'criteria changed' : 'ratings changed');
    return '<div class="banner"><p><b>Your plan can be updated:</b> ' + esc(why.join(', ')) + ' since it was built.</p><button type="button" class="btn btn-sm" data-action="plan-build">' + icon('rebuild') + 'Rebuild from today</button></div>';
  };

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
    const exams = M.upcomingExams(s);
    const next = exams[0];
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const planned = todays.reduce((a, x) => a + x.m, 0), done = todays.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const lede = next ? '<mark>' + esc(next.title) + '</mark> is ' + U.countdown(C.daysTo(next.date)) + '. ' + U.plural(exams.length, 'paper') + ' to go.' : 'No exams coming up. Add a mock or test in the Planner.';
    let html = C.head(esc(U.fmtLong(today)), greet + (s.profile.name ? ', ' + esc(s.profile.name) : ''), lede);

    if (!s.profile.welcomed) {
      const rated = M.activeTopics(s).filter((t) => (s.topics[t.gid] || {}).c).length, all = M.activeTopics(s).length;
      const step = (ok, n, title, body, action) => '<li class="step' + (ok ? ' ok' : '') + '"><span class="step-n mono">' + (ok ? '✓' : n) + '</span><span class="step-t"><b>' + title + '</b><span class="muted small">' + body + '</span></span>' + action + '</li>';
      html += '<section class="setup"><div class="sec-head"><h2>Set up in three steps</h2><button type="button" class="btn-link" data-action="welcome-dismiss">Hide</button></div><ol class="steps">' +
        step(!!s.profile.fmOptions, 1, 'Choose your Further Maths options', s.profile.fmOptions ? 'Saved: ' + s.profile.fmOptions.map((id) => RH.FM_OPTIONS.find((o) => o.id === id).name).join(' and ') : 'So the plan and exam dates match your papers.', s.profile.fmOptions ? '' : '<a class="btn btn-sm" href="#preferences">Choose</a>') +
        step(rated >= 20, 2, 'Rate your topics red, amber or green', rated + ' of ' + all + ' rated. Start with the subject you feel worst about.', '<a class="btn-ghost btn-sm" href="#subjects">Open subjects</a>') +
        step(s.plan.settingsAt > 0, 3, 'Set your hours and rebuild the plan', 'A starter plan is already below. Tell it when you can revise.', '<a class="btn-ghost btn-sm" href="#planner" data-action="planner-tab" data-v="criteria">Planner criteria</a>') +
        '</ol></section>';
    }
    html += V.staleBanner();

    html += '<div class="cols-today"><section class="col-main">' +
      '<div class="sec-head"><h2>Today’s plan</h2>' + (todays.length ? '<span class="mono muted">' + U.mins(done) + ' / ' + U.mins(planned) + ' done</span>' : '') + '</div>' +
      (todays.length ? '<div class="sess-list">' + todays.map(V.sessCard).join('') + '</div>'
        : C.empty('Nothing planned today.', s.plan.builtAt ? 'Have a rest, or pick something from the list below.' : 'Build a plan to fill this in.', s.plan.builtAt ? '' : '<button type="button" class="btn" data-action="plan-build">Build my plan</button>'));
    const sug = suggestions(5);
    if (sug.length) {
      html += '<div class="sec-head"><h2>Worth revising next</h2><span class="muted small">Weakest topics with the soonest papers</span></div><ul class="sug-list">' +
        sug.map((x) => '<li class="sug" data-subj="' + x.t.subject.id + '">' + stag(x.t.subject.id) + '<a href="#t-' + x.t.gid + '" class="sug-name">' + esc(x.t.name) + '<span class="muted small">' + esc(x.t.comp.name) + ' · ' + esc(x.e.code) + ' ' + U.countdown(C.daysTo(x.e.date)) + '</span></a>' + C.ragDots(x.t.gid, M.conf(s, x.t.gid)) +
          '<button type="button" class="btn-icon" data-action="add-today" data-id="' + x.t.gid + '" title="Add to today" aria-label="Add to today">' + icon('plus') + '</button></li>').join('') + '</ul>';
    }
    html += '</section><aside class="col-side">';

    const due = RH.cards.totalDue(), deckN = Object.keys(s.decks).length;
    html += '<section class="panel quick"><div class="sec-head"><h2>Flashcards</h2><a class="small" href="#cards">Terminal</a></div>' +
      (deckN ? '<p class="quick-n"><span class="stat-n mono">' + due + '</span><span class="muted small">cards due today</span></p>' + (due ? '<button type="button" class="btn btn-block" data-action="study" data-deck="all" data-mode="leitner">' + icon('cards') + 'Review due cards</button>' : '<p class="muted small">All caught up.</p>')
        : '<p class="muted small">No decks yet. Import from Quizlet or Gizmo, or add a starter deck.</p><a class="btn-ghost btn-block" href="#cards">' + icon('cards') + 'Set up flashcards</a>') + '</section>';

    html += '<section class="panel"><div class="sec-head"><h2>Countdown</h2><a class="small" href="#exams">All exams</a></div><ol class="cd-list">' +
      exams.slice(0, 5).map((e) => '<li data-subj="' + e.subject + '">' + stag(e.subject) + '<span class="cd-t"><b>' + esc(e.title) + '</b><span class="muted small">' + esc(U.fmt(e.date)) + (e.time ? ' · ' + e.time : '') + '</span></span>' + C.countdownBadge(e.date) + '</li>').join('') +
      (exams.length ? '' : '<li class="muted">No upcoming exams.</li>') + '</ol></section>';

    html += '<section class="panel"><div class="sec-head"><h2>Confidence</h2><a class="small" href="#subjects">Subjects</a></div><ul class="prog-list">' +
      M.subjects.map(function (sub) {
        const topics = M.subjectTopics(s, sub);
        return '<li><a href="#s-' + sub.id + '" class="prog-row" data-subj="' + sub.id + '"><span class="prog-name">' + stag(sub.id) + esc(sub.name) + '</span><span class="mono muted">' + U.pct(M.readiness(s, topics)) + '</span></a>' + stack(M.ragCounts(s, topics), sub.name) + '</li>';
      }).join('') + '</ul></section>';

    const ws = U.weekStart(today), we = U.addDays(ws, 6);
    const week = s.plan.sessions.filter((x) => x.d >= ws && x.d <= we);
    const wDone = week.filter((x) => x.done).reduce((a, x) => a + x.m, 0), wAll = week.reduce((a, x) => a + x.m, 0);
    html += '<section class="panel"><div class="sec-head"><h2>This week</h2><a class="small" href="#planner">Planner</a></div>' +
      '<div class="stat-row"><div class="stat"><span class="stat-n mono">' + U.hours(wDone) + '</span><span class="muted small">of ' + U.hours(wAll) + ' planned</span></div>' +
      '<div class="stat">' + icon('flame', 'i-flame') + '<span class="stat-n mono">' + streak() + '</span><span class="muted small">day streak</span></div></div>' +
      '<div class="meter"><span style="width:' + (wAll ? Math.round(100 * wDone / wAll) : 0) + '%"></span></div></section>';
    html += '</aside></div>';
    return html;
  };

  // ---------- Subjects ----------
  V.subjects = function () {
    const s = st();
    let html = C.head('Learn', 'Subjects', 'Each subject is split into sections, and each section into sub-topics. Every sub-topic has videos, notes, practice questions, flashcards and a checklist.');
    html += '<div class="subj-grid">' + M.subjects.map(function (sub) {
      const topics = M.subjectTopics(s, sub);
      const comps = M.compsFor(s, sub);
      const ex = M.upcomingExams(s).filter((e) => e.subject === sub.id);
      const vids = topics.reduce((a, t) => a + M.videos(t).length, 0);
      return '<a class="subj-card" href="#s-' + sub.id + '" data-subj="' + sub.id + '"><span class="sc-tab"></span>' +
        '<span class="sc-top">' + stag(sub.id) + '<span class="mono muted small">' + esc(sub.board) + ' · ' + esc(sub.spec) + '</span></span>' +
        '<span class="sc-name">' + esc(sub.name) + '</span>' +
        '<span class="sc-counts"><span><b class="mono">' + comps.length + '</b> sections</span><span><b class="mono">' + topics.length + '</b> sub-topics</span><span><b class="mono">' + vids + '</b> videos</span></span>' +
        stack(M.ragCounts(s, topics), sub.name) +
        '<span class="sc-next small">' + U.pct(M.readiness(s, topics)) + ' confident · ' + (ex.length ? 'first paper ' + esc(U.fmt(ex[0].date)) : 'no upcoming papers') + '</span></a>';
    }).join('') + '</div>';
    return html;
  };

  function compStats(s, c) {
    const n = M.ragCounts(s, c.topics);
    return { n: n, vids: M.compVideos(c) };
  }

  V.subject = function (sid) {
    const s = st(), sub = M.subject[sid];
    if (!sub) return V.notFound();
    const topics = M.subjectTopics(s, sub);
    const exams = M.upcomingExams(s).filter((e) => e.subject === sid);
    const papers = sub.papers.filter((p) => !p.option || (s.profile.fmOptions && RH.FM_OPTIONS.some((o) => o.paper === p.id && s.profile.fmOptions.indexOf(o.id) !== -1)));
    const tab = C.tab('subj-' + sid, 'sections');
    const decks = Object.keys(s.decks).map((k) => s.decks[k]).filter((d) => d.subject === sid);

    let html = '<div class="subj-page" data-subj="' + sid + '">' + C.crumbs([['Subjects', 'subjects'], [sub.name]]) +
      C.head(stag(sid) + ' ' + esc(sub.board) + ' · ' + esc(sub.spec), esc(sub.name), U.plural(topics.length, 'sub-topic') + ' · <b>' + U.pct(M.readiness(s, topics)) + '</b> confident') + stack(M.ragCounts(s, topics), sub.name);
    html += '<div class="paper-row">' + papers.map(function (p) {
      const e = exams.find((x) => x.code === p.code);
      return '<div class="paper"><span class="mono">' + esc(p.code) + '</span><b>' + esc(p.name.replace(/^Paper \w+: /, '')) + '</b><span class="muted small">' + (e ? esc(U.fmt(e.date)) + ' · ' + U.countdown(C.daysTo(e.date)) : 'Not on your timetable') + ' · ' + U.mins(p.dur) + '</span></div>';
    }).join('') + '</div>';
    if (sid === 'further' && !s.profile.fmOptions) html += V.fmOptionsCard(true);

    const extraVids = RH.SUBJECT_VIDEOS[sid] || [];
    const tabs = [['sections', 'Sections', 'grid', M.compsFor(s, sub, true).length], ['resources', 'Past papers & resources', 'link', sub.res.length]];
    if (extraVids.length) tabs.push(['technique', sid === 'economics' ? 'Exam technique videos' : 'Whole-course videos', 'video', extraVids.length]);
    tabs.push(['cards', 'Flashcards', 'cards', decks.length]);
    html += C.tabs('subj-' + sid, tabs, tab);

    if (tab === 'resources') return html + '<div class="res-cols">' + C.resGroups(sub.res) + '</div></div>';
    if (tab === 'technique') return html + '<p class="help">' + (sid === 'economics' ? 'EconplusDal on how to answer each question type on the Edexcel A papers, and how to write analysis, evaluation and judgement.' : 'Big-picture videos that cover the whole course.') + '</p>' + C.videoGrid(extraVids.map((v) => ({ ch: v[0], id: v[1], title: v[2] })), sid) + '</div>';
    if (tab === 'cards') {
      return html + (decks.length ? '<ul class="deck-list">' + decks.map(RH.cards.deckRow).join('') + '</ul>' : '<p class="muted">No ' + esc(sub.name) + ' decks yet.</p>') +
        '<div class="row-actions"><button type="button" class="btn-ghost" data-action="cards-import">' + icon('upload') + 'Import from Quizlet / Gizmo</button>' +
        RH.STARTER_DECKS.filter((d) => d.subject === sid && !decks.some((x) => x.starter === d.id)).map((d) => '<button type="button" class="btn-ghost" data-action="starter-add" data-id="' + d.id + '">' + icon('plus') + esc(d.name) + '</button>').join('') + '</div></div>';
    }

    let group = '';
    html += '<div class="sec-list">';
    M.compsFor(s, sub, true).forEach(function (c) {
      if (c.group && c.group !== group) { html += '</div><h2 class="group-h">' + esc(c.group) + '</h2><div class="sec-list">'; group = c.group; }
      const cs = compStats(s, c);
      const ticked = c.topics.reduce((a, t) => a + ((s.topics[t.gid] || {}).p || []).length, 0), pts = c.topics.reduce((a, t) => a + (t.pts || []).length, 0);
      html += '<a class="sec-card" href="#c-' + c.gid + '"><span class="sec-name">' + esc(c.name) + '</span>' +
        '<span class="sec-meta muted small">' + U.plural(c.topics.length, 'sub-topic') + ' · ' + U.plural(cs.vids, 'video') + ' · ' + c.papers.map((p) => sub.paper[p].code).join(', ') + '</span>' +
        stack(cs.n, c.name) + '<span class="sec-foot small"><span>' + U.pct(M.readiness(s, c.topics)) + ' confident</span><span class="muted">' + ticked + '/' + pts + ' checklist</span></span></a>';
    });
    html += '</div></div>';
    return html;
  };

  // ---------- Section ----------
  V.section = function (cgid) {
    const s = st(), c = M.comp[cgid];
    if (!c) return V.notFound();
    const sub = c.subject;
    const all = c.topics;
    const anyTaught = all.some((t) => !(s.topics[t.gid] || {}).nt);
    const res = M.compResources(c);
    const tab = C.tab('sec-' + cgid, 'topics');
    const comps = M.compsFor(s, sub, true), idx = comps.indexOf(c);
    let html = '<div class="sec-page" data-subj="' + sub.id + '">' + C.crumbs([['Subjects', 'subjects'], [sub.name, 's-' + sub.id], [c.name]]);
    html += C.head(stag(sub.id) + ' ' + esc(c.group || sub.name), esc(c.name), U.plural(all.length, 'sub-topic') + ' · ' + U.plural(M.compVideos(c), 'video') + ' · <b>' + U.pct(M.readiness(s, all)) + '</b> confident · ' + c.papers.map((p) => esc(sub.paper[p].code)).join(', ')) + stack(M.ragCounts(s, all), c.name);
    html += C.tabs('sec-' + cgid, [['topics', 'Sub-topics', 'list', all.length], ['notes', 'Notes', 'notes', res.filter((r) => r.k === 'notes').length], ['practice', 'Practice & papers', 'qs', res.filter((r) => r.k === 'qs' || r.k === 'papers').length], ['more', 'More', 'link', res.filter((r) => r.k === 'cards' || r.k === 'other').length]], tab);
    if (tab === 'topics') {
      html += '<div class="sec-tools"><span class="muted small">Tap a dot to rate a sub-topic. Open it for videos, notes and questions.</span><button type="button" class="btn-link small" data-action="comp-nt" data-comp="' + c.gid + '" data-v="' + (anyTaught ? 1 : 0) + '">' + (anyTaught ? 'Mark all as not taught yet' : 'Mark all as taught') + '</button></div>';
      html += '<ol class="topic-list">' + all.map(function (t) {
        const ts = s.topics[t.gid] || {};
        const ticked = (ts.p || []).length, total = (t.pts || []).length;
        const vids = M.videos(t).length;
        return '<li class="topic-row' + (ts.nt ? ' nt' : '') + '"><a href="#t-' + t.gid + '" class="tr-name"><span>' + esc(t.name) + '</span><span class="tr-meta small">' +
          (vids ? '<span class="pill">' + icon('video') + vids + '</span>' : '') + (total ? '<span class="pill">' + icon('list') + ticked + '/' + total + '</span>' : '') +
          (ts.nt ? '<span class="pill warn">Not taught yet</span>' : ts.last ? '<span class="muted">revised ' + esc(U.fmtShort(ts.last)) + '</span>' : '') + '</span></a>' + C.ragDots(t.gid, ts.c || 0) + '</li>';
      }).join('') + '</ol>';
    } else {
      const kinds = tab === 'notes' ? ['notes'] : tab === 'practice' ? ['qs', 'papers'] : ['cards', 'other'];
      const list = res.filter((r) => kinds.indexOf(r.k) !== -1);
      html += list.length ? '<div class="res-cols">' + C.resGroups(list, kinds) + '</div>' : '<p class="muted">Nothing here for the whole section. Each sub-topic has its own ' + (tab === 'notes' ? 'notes' : 'questions') + '.</p>';
    }
    html += '<nav class="pager">' + (comps[idx - 1] ? '<a href="#c-' + comps[idx - 1].gid + '" class="pg prev">' + icon('left') + '<span><span class="muted small">Previous section</span>' + esc(comps[idx - 1].name) + '</span></a>' : '<span></span>') +
      (comps[idx + 1] ? '<a href="#c-' + comps[idx + 1].gid + '" class="pg next"><span><span class="muted small">Next section</span>' + esc(comps[idx + 1].name) + '</span>' + icon('right') + '</a>' : '<span></span>') + '</nav></div>';
    return html;
  };

  // ---------- Sub-topic ----------
  V.topic = function (gid) {
    const s = st(), t = M.topic[gid];
    if (!t) return V.notFound();
    const ts = M.ts(s, gid);
    const sub = t.subject, c = t.comp;
    const prev = c.topics[t.index - 1], next = c.topics[t.index + 1];
    const ticks = ts.p || [];
    const vids = M.videos(t), searches = M.videoSearches(t);
    const res = M.resources(t, s);
    const notes = res.filter((r) => r.k === 'notes' || r.k === 'mine'), practice = res.filter((r) => r.k === 'qs' || r.k === 'papers'), more = res.filter((r) => r.k === 'cards' || r.k === 'other');
    const decks = RH.cards.forTopic(gid);
    const tab = RH.ui.tabs.topic || 'videos';

    let html = '<div class="topic-page" data-subj="' + sub.id + '">' + C.crumbs([['Subjects', 'subjects'], [sub.name, 's-' + sub.id], [c.name, 'c-' + c.gid], [t.name]]);
    html += '<header class="topic-head"><h1>' + esc(t.name) + '</h1><div class="pbadges">' + c.papers.map((p) => '<span class="pbadge mono">' + esc(sub.paper[p].code) + '</span>').join('') + '</div></header>';
    html += '<section class="status-bar">' + C.ragFull(gid, ts.c || 0, true) +
      '<div class="status-row"><button type="button" class="btn btn-sm" data-action="mark-revised" data-id="' + gid + '">' + icon('check') + 'Mark revised today</button>' +
      '<span class="muted small">' + (ts.n ? 'Revised ' + U.plural(ts.n, 'time') + (ts.last ? ', last ' + esc(U.fmtShort(ts.last)) : '') : 'Not revised yet') + '</span>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="add-today" data-id="' + gid + '">' + icon('plus') + 'Add to today</button>' +
      '<label class="toggle toggle-sm"><input type="checkbox" data-action="toggle-nt" data-id="' + gid + '"' + (ts.nt ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text small">Not taught yet</span></label></div></section>';

    html += C.tabs('topic', [['videos', 'Videos', 'video', vids.length], ['notes', 'Notes', 'notes', notes.length], ['practice', 'Practice', 'qs', practice.length], ['cards', 'Flashcards', 'cards', decks.length], ['checklist', 'Checklist', 'list', ticks.length + '/' + (t.pts || []).length], ['mine', 'My notes', 'pen']], tab);
    html += '<div class="tab-panel">';
    if (tab === 'videos') {
      html += vids.length ? C.videoGrid(vids, sub.id) : '<p class="muted">No hand-picked videos for this sub-topic yet. Search the channels below.</p>';
      html += '<div class="search-more"><span class="label">Search for more on</span>' + searches.map((r) => '<a class="chip-link" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + icon('search') + esc(r.t) + '</a>').join('') + '</div>';
    } else if (tab === 'notes') {
      html += notes.length ? C.resGroups(notes, ['mine', 'notes']) : '<p class="muted">No notes linked yet.</p>';
      html += myLinksForm(gid);
    } else if (tab === 'practice') {
      html += practice.length ? C.resGroups(practice, ['qs', 'papers']) : '<p class="muted">No questions linked yet.</p>';
      if (more.length) html += C.resGroups(more, ['cards', 'other']);
      html += '<div class="tip"><span class="label">Timed practice</span><p>Upload a past paper to the <a href="#portal">Exam portal</a> to sit it against the clock, question by question, and mark it against the mark scheme.</p></div>';
    } else if (tab === 'cards') {
      html += RH.cards.topicPanel(t);
    } else if (tab === 'checklist') {
      if (t.pts && t.pts.length) {
        html += '<section class="sheet ruled"><div class="sec-head"><h2>Spec checklist</h2><span class="mono muted small">' + ticks.length + '/' + t.pts.length + '</span></div><p class="help">Tick a point when you could answer an exam question on it without notes.</p><ul class="checklist">' +
          t.pts.map((p, i) => '<li><label><input type="checkbox" data-action="pt-toggle" data-id="' + gid + '" data-i="' + i + '"' + (ticks.indexOf(i) !== -1 ? ' checked' : '') + '><span>' + esc(p) + '</span></label></li>').join('') + '</ul>' +
          '<div class="row-actions"><button type="button" class="btn-ghost btn-sm" data-action="blurt" data-id="' + gid + '">' + icon('pen') + 'Blurt test: write it all from memory</button></div></section>';
      }
      if (t.tip) html += '<aside class="tip"><span class="label">Exam tip</span><p>' + esc(t.tip) + '</p></aside>';
    } else if (tab === 'mine') {
      html += '<section class="sheet ruled"><div class="sec-head"><h2><label for="notes-' + gid + '">My notes & mistakes log</label></h2><span class="muted small" id="notes-saved">Saves as you type</span></div>' +
        '<textarea id="notes-' + gid + '" class="notes" data-notes="' + gid + '" rows="10" placeholder="Key formulae, things you keep getting wrong, questions to ask your teacher…">' + esc(ts.notes || '') + '</textarea></section>' + myLinksForm(gid);
    }
    html += '</div>';
    html += '<nav class="pager">' + (prev ? '<a href="#t-' + prev.gid + '" class="pg prev">' + icon('left') + '<span><span class="muted small">Previous</span>' + esc(prev.name) + '</span></a>' : '<span></span>') +
      (next ? '<a href="#t-' + next.gid + '" class="pg next"><span><span class="muted small">Next</span>' + esc(next.name) + '</span>' + icon('right') + '</a>' : '<span></span>') + '</nav></div>';
    return html;
  };

  function myLinksForm(gid) {
    const links = (st().topics[gid] || {}).links || [];
    return '<section class="panel my-links"><h3>My links</h3><p class="help">Add your teacher\'s resources or anything else you use for this topic. They appear at the top of the Notes tab.</p>' +
      (links.length ? '<ul class="res-list">' + links.map((l, i) => '<li class="my-link"><a class="res" href="' + esc(l.u) + '" target="_blank" rel="noopener"><span class="site" data-site="mine">Mine</span><span class="res-t">' + esc(l.t) + '</span>' + icon('ext', 'i-ext') + '</a><button type="button" class="btn-icon" data-action="link-del" data-id="' + gid + '" data-i="' + i + '" aria-label="Remove link">' + icon('x') + '</button></li>').join('') + '</ul>' : '') +
      '<form id="linkForm" class="link-form" data-topic="' + gid + '"><input name="t" placeholder="Name, e.g. Mr Gale worksheet" aria-label="Link name" required><input name="u" type="url" placeholder="https://…" aria-label="Link address" required><button type="submit" class="btn-ghost">' + icon('plus') + 'Add link</button></form></section>';
  }

  V.blurt = function (gid) {
    const t = M.topic[gid];
    C.openModal('Blurt: ' + esc(t.name), '<p class="help">Write down everything you remember about this topic without looking. Then reveal the checklist and see what you missed.</p>' +
      '<textarea id="blurt-text" rows="9" placeholder="Start writing…"></textarea>' +
      '<div class="row-actions"><button type="button" class="btn" data-action="blurt-reveal">Reveal the checklist</button><span class="mono muted small" id="blurt-clock">10:00</span></div><ul class="checklist blurt-list" id="blurt-list" hidden>' + (t.pts || []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>', { wide: true });
    const end = Date.now() + 600000;
    const iv = setInterval(function () { const el = document.getElementById('blurt-clock'); if (!el) { clearInterval(iv); return; } el.textContent = RH.timer.fmt((end - Date.now()) / 1000); if (Date.now() > end) { clearInterval(iv); el.textContent = 'Time is up'; } }, 500);
  };

  // ---------- Planner ----------
  function chipFor(x) {
    const t = x.t && M.topic[x.t];
    const label = t ? t.name.replace(/^[\d.]+ /, '') : V.sessTitle(x);
    return '<button type="button" class="chip-sess' + (x.done ? ' done' : '') + '" data-subj="' + x.s + '" data-action="sess-open" data-id="' + x.id + '">' +
      '<span class="cs-k k-' + x.k + '">' + esc(RH.KIND[x.k].label.split(' ')[0]) + '</span><span class="cs-t">' + esc(label) + '</span><span class="cs-m mono">' + x.m + '</span></button>';
  }

  V.planner = function () {
    const s = st(), S = s.plan.settings, today = U.today();
    const sum = RH.planner.summary(s);
    const tab = C.tab('plan', 'calendar');
    const built = s.plan.builtAt ? 'built ' + new Date(s.plan.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'not built yet';
    let html = C.head('Plan', 'Planner', U.plural(sum.sessions, 'session') + ' left · ' + U.hours(sum.total) + ' · ' + sum.covered + ' of ' + sum.topics + ' sub-topics covered · ' + built,
      '<button type="button" class="btn" data-action="plan-build">' + icon('rebuild') + 'Rebuild plan</button>');
    html += C.tabs('plan', [['calendar', 'Calendar', 'plan'], ['criteria', 'Criteria', 'prefs'], ['exams', 'Exams & tests', 'exams', M.upcomingExams(s).length]], tab);
    html += V.staleBanner();
    if (tab === 'criteria') return html + V.criteria();
    if (tab === 'exams') return html + V.exams();
    if (!s.profile.fmOptions) html += '<div class="banner"><p><b>Further Maths options are not in your plan yet.</b> Choose your two options to add them.</p><a class="btn btn-sm" href="#preferences">Choose options</a></div>';
    const nt = M.activeTopics(s).filter((t) => (s.topics[t.gid] || {}).nt).length;
    if (nt && S.skipUntaught) html += '<p class="hint">' + U.plural(nt, 'sub-topic') + ' marked "not taught yet" are left out of the plan.</p>';
    html += '<div class="split" role="img" aria-label="Planned hours by subject">' + M.subjects.map((sub) => {
      const m = sum.mins[sub.id] || 0;
      return m ? '<span class="split-seg" data-subj="' + sub.id + '" style="flex-grow:' + m + '"><b>' + C.TAG[sub.id] + '</b> ' + U.hours(m) + '</span>' : '';
    }).join('') + '</div>';
    const ws = RH.ui.week || U.weekStart(today);
    const exams = M.exams(s);
    const days = [];
    for (let i = 0; i < 7; i++) days.push(U.addDays(ws, i));
    html += '<section class="cal"><div class="cal-nav"><button type="button" class="btn-icon" data-action="week-prev" aria-label="Previous week">' + icon('left') + '</button>' +
      '<h2>' + esc(U.fmtShort(ws)) + ' – ' + esc(U.fmtShort(days[6])) + '</h2>' +
      '<button type="button" class="btn-icon" data-action="week-next" aria-label="Next week">' + icon('right') + '</button>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="week-today">This week</button>' +
      '<span class="cal-strategy muted small">Strategy: <b>' + esc((RH.PRESETS[S.preset] || { label: 'Custom' }).label) + '</b> · <a href="#planner" data-action="planner-tab" data-v="criteria">change</a></span></div>' +
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
      '<button type="button" class="btn-ghost btn-sm" data-action="export-csv">' + icon('download') + '.csv (Google Calendar)</button></div></div></section>';
    return html;
  };

  V.criteria = function () {
    const S = st().plan.settings;
    const range = (key, label, help, min, max, step) => '<div class="field"><label for="f-' + key + '"><span>' + label + '</span><output class="mono" id="o-' + key + '">' + S[key] + '</output></label>' +
      '<input type="range" id="f-' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '" data-set="' + key + '" data-num="1">' + (help ? '<p class="help">' + help + '</p>' : '') + '</div>';
    const toggle = (key, label, help) => '<label class="toggle"><input type="checkbox" id="f-' + key + '" data-set="' + key + '"' + (S[key] ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text"><b>' + label + '</b>' + (help ? '<span class="help">' + help + '</span>' : '') + '</span></label>';
    const opts = (list, val) => list.map((o) => '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + o[1] + '</option>').join('');

    return '<form class="crit" id="critForm" onsubmit="return false"><div class="crit-grid">' +
      '<section class="panel"><h2>1. Strategy</h2><p class="help">A preset sets the sliders under step 4. Pick one, then fine-tune.</p><div class="presets">' + Object.keys(RH.PRESETS).map((k) => {
        const p = RH.PRESETS[k];
        return '<button type="button" class="preset' + (S.preset === k ? ' on' : '') + '" data-action="preset" data-v="' + k + '" aria-pressed="' + (S.preset === k) + '"><b>' + p.label + '</b><span>' + p.note + '</span></button>';
      }).join('') + '</div></section>' +

      '<section class="panel"><h2>2. When you can revise</h2><div class="week-hours">' + U.DAYS.map((d, i) =>
        '<label class="wh"><span>' + d + '</span><input type="number" min="0" max="16" step="0.25" inputmode="decimal" id="f-week-' + i + '" data-week="' + i + '" value="' + (S.week[i] / 60) + '"></label>').join('') + '</div>' +
      '<p class="help">Hours per day in a normal school week.</p><h3 class="label">Holidays & busy periods</h3>' +
      '<div class="hols">' + (S.holidays || []).map((h) =>
        '<div class="hol"><input type="text" aria-label="Name" id="hn-' + h.id + '" data-hol="' + h.id + '" data-f="name" value="' + esc(h.name) + '">' +
        '<input type="date" aria-label="From" id="hf-' + h.id + '" data-hol="' + h.id + '" data-f="from" value="' + esc(h.from) + '">' +
        '<input type="date" aria-label="To" id="ht-' + h.id + '" data-hol="' + h.id + '" data-f="to" value="' + esc(h.to) + '">' +
        '<label class="hol-h"><input type="number" min="0" max="16" step="0.5" aria-label="Hours per day" id="hm-' + h.id + '" data-hol="' + h.id + '" data-f="mins" value="' + (h.mins / 60) + '"><span>h/day</span></label>' +
        '<button type="button" class="btn-icon" data-action="hol-del" data-id="' + h.id + '" aria-label="Remove ' + esc(h.name) + '">' + icon('x') + '</button></div>').join('') +
      '</div><button type="button" class="btn-ghost btn-sm" data-action="hol-add">' + icon('plus') + 'Add holiday or busy period</button>' +
      '<p class="help">Holidays replace the normal week. These are typical dates; edit them to match your school. Use 0 h for a trip or busy week.</p></section>' +

      '<section class="panel"><h2>3. Sessions</h2><div class="two">' +
      '<div class="field"><label for="f-sessionLen">Session length</label><select id="f-sessionLen" data-set="sessionLen" data-num="1">' + opts([[25, '25 min (Pomodoro)'], [45, '45 min'], [60, '60 min'], [90, '90 min']], S.sessionLen) + '</select></div>' +
      '<div class="field"><label for="f-breakLen">Break between</label><select id="f-breakLen" data-set="breakLen" data-num="1">' + opts([[5, '5 min'], [10, '10 min'], [15, '15 min']], S.breakLen) + '</select></div></div>' +
      '<div class="two"><div class="field"><label for="f-start">Start</label><input type="date" id="f-start" data-set="start" value="' + esc(S.start) + '"></div>' +
      '<div class="field"><label for="f-end">End</label><input type="date" id="f-end" data-set="end" value="' + esc(S.end) + '"></div></div>' +
      '<p class="help">Leave the dates blank to plan from today to your last exam.</p>' +
      '<div class="field"><label for="f-examDay">On exam days</label><select id="f-examDay" data-set="examDay">' + opts([['light', 'Half the usual time'], ['normal', 'Normal time'], ['off', 'No revision']], S.examDay) + '</select></div></section>' +

      '<section class="panel"><h2>4. What matters most</h2>' +
      range('wWeak', 'Weak topics', 'Red and not-started topics first.', 0, 3, 0.25) +
      range('wUrg', 'Exam urgency', 'Topics in sooner papers first.', 0, 3, 0.25) +
      range('wCov', 'Cover untouched topics', 'Reach every topic at least once.', 0, 3, 0.25) +
      range('ppWeeks', 'Past papers: weeks before each exam', 'Timed full papers start this many weeks out. 0 turns them off.', 0, 12, 1) + '</section>' +

      '<section class="panel"><h2>5. Subject share of time</h2>' + M.subjects.map((sub) =>
        '<div class="field field-inline" data-subj="' + sub.id + '"><label for="f-subj-' + sub.id + '">' + stag(sub.id) + esc(sub.name) + '</label><input type="range" min="0" max="3" step="0.5" id="f-subj-' + sub.id + '" data-subjw="' + sub.id + '" value="' + (S.subj[sub.id] == null ? 1 : S.subj[sub.id]) + '"><output class="mono" id="o-subj-' + sub.id + '">' + (S.subj[sub.id] == null ? 1 : S.subj[sub.id]) + '×</output></div>').join('') +
      '<p class="help">1× is an equal share. 0 leaves a subject out.</p></section>' +

      '<section class="panel"><h2>6. Rules</h2>' +
      toggle('spacing', 'Spaced repetition', 'Bring topics back after 2, 5, 10, 21 and 35 days.') +
      toggle('interleave', 'Mix subjects within a day', 'Off gives each day one main subject.') +
      toggle('eveReview', 'Exam-eve review', 'The day before a paper is a light review of it.') +
      toggle('skipUntaught', 'Skip topics not taught yet', 'Leave out topics you have flagged.') +
      toggle('focusNext', 'Only my next exam or test', 'Every session goes to the next paper on the list.') + '</section>' +
      '</div><div class="crit-foot"><button type="button" class="btn btn-lg" data-action="plan-build">' + icon('rebuild') + 'Rebuild plan with these criteria</button></div>' +
      '<details class="how panel"><summary>How the planner decides</summary><dl>' + RH.GUIDE.planner.map((p) => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl></details></form>';
  };

  // ---------- Exams ----------
  V.exams = function () {
    const s = st(), today = U.today();
    const all = M.officialFor(s);
    let html = '<p class="help">Official dates from the <a href="' + RH.EXAM_SOURCE.url + '" target="_blank" rel="noopener">Pearson Edexcel Summer 2027 final timetable</a>. Morning papers start at 9:00am, afternoon papers at 1:30pm. Always check with your exams officer.</p>';
    if (!s.profile.fmOptions) html += V.fmOptionsCard(true);
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
        '<div class="exam-ready"><span class="label">Readiness ' + U.pct(M.readiness(s, topics)) + ' · ' + U.plural(topics.length, 'sub-topic') + '</span>' + stack(M.ragCounts(s, topics), p.code) + '</div></div>' +
        '<div class="exam-side">' + (past ? '<span class="muted small">Sat</span>' : C.countdownBadge(o.date)) +
        '<label class="toggle toggle-sm"><input type="checkbox" data-action="exam-toggle" data-id="' + o.id + '"' + (on ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text small">Sitting</span></label>' +
        '<a class="small" href="#s-' + o.subject + '">Topics</a></div></article>';
    });
    html += '</section>';
    html += '<section class="panel tests"><div class="sec-head"><h2>Mocks & class tests</h2></div>' +
      (s.exams.custom.length ? '<ul class="test-list">' + s.exams.custom.slice().sort((a, b) => a.date.localeCompare(b.date)).map(function (c) {
        const sub = M.subject[c.subject];
        const comps = (c.comps && c.comps.length) ? c.comps.map((id) => (sub.comps.find((x) => x.id === id) || {}).name).filter(Boolean).join(', ') : 'Whole subject';
        return '<li data-subj="' + c.subject + '">' + stag(c.subject) + '<span class="tl-main"><b>' + esc(c.name) + '</b><span class="muted small">' + esc(U.fmt(c.date)) + (c.time ? ' · ' + esc(c.time) : '') + ' · ' + U.mins(c.dur || 60) + ' · ' + esc(comps) + '</span></span>' + (c.date >= today ? C.countdownBadge(c.date) : '<span class="muted small">Done</span>') +
          '<button type="button" class="btn-icon" data-action="test-del" data-id="' + c.id + '" aria-label="Delete ' + esc(c.name) + '">' + icon('trash') + '</button></li>';
      }).join('') + '</ul>' : '<p class="muted">No mocks or tests yet. Add them so the plan revises the right sections before each one.</p>') +
      '<form id="testForm" class="test-form"><div class="two">' +
      '<div class="field"><label for="t-name">Name</label><input id="t-name" name="name" required placeholder="e.g. Physics mock, Paper 1"></div>' +
      '<div class="field"><label for="t-subj">Subject</label><select id="t-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (RH.ui.testSubj === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div></div>' +
      '<div class="three"><div class="field"><label for="t-date">Date</label><input id="t-date" name="date" type="date" required min="' + today + '"></div>' +
      '<div class="field"><label for="t-time">Start time</label><input id="t-time" name="time" type="time" value="09:00"></div>' +
      '<div class="field"><label for="t-dur">Minutes</label><input id="t-dur" name="dur" type="number" min="10" max="300" step="5" value="60"></div></div>' +
      '<fieldset class="field"><legend>Sections it covers <span class="muted small">(leave all unticked for the whole subject)</span></legend><div class="comp-picks" id="t-comps">' + V.compPicks(RH.ui.testSubj || 'physics') + '</div></fieldset>' +
      '<button type="submit" class="btn">' + icon('plus') + 'Add test</button></form></section>';
    return html;
  };
  V.compPicks = function (sid) {
    return M.compsFor(st(), M.subject[sid]).map((c) => '<label class="pick"><input type="checkbox" name="comps" value="' + c.id + '"><span>' + esc(c.name) + '</span></label>').join('');
  };

  // ---------- Practise hub ----------
  V.practise = function () {
    const s = st();
    const due = RH.cards.totalDue();
    const live = s.portal.live;
    const tile = (href, ic, title, body, stat) => '<a class="hub-tile" href="#' + href + '">' + icon(ic) + '<b>' + title + '</b><span class="muted small">' + body + '</span>' + (stat ? '<span class="hub-stat mono">' + stat + '</span>' : '') + '</a>';
    return C.head('Practise', 'Practise', 'Timed past papers, flashcards and focus timers.') +
      (live ? '<div class="banner"><p><b>An exam is in progress.</b> ' + esc((s.portal.papers[live.paper] || {}).title || '') + '</p><a class="btn btn-sm" href="#exam">Back to the exam</a></div>' : '') +
      '<div class="hub-grid">' +
      tile('portal', 'portal', 'Exam portal', 'Upload a past paper PDF, sit it question by question against the clock, then mark it.', U.plural(Object.keys(s.portal.papers).length, 'paper')) +
      tile('cards', 'cards', 'Flashcard terminal', 'Leitner flashcards: import from Quizlet or Gizmo, or use the starter decks.', due + ' due') +
      tile('timers', 'timer', 'Timers', 'Pomodoro with breaks, exam timer with warnings, countdown and stopwatch.', RH.timer.running ? 'running' : '') +
      tile('portal', 'log', 'Results', 'Every paper score and your trend in each subject.', U.plural(s.papers.length, 'score')) + '</div>';
  };

  // ---------- Library ----------
  V.library = function () {
    let html = C.head('Tools', 'Resource library', 'Every site the hub links to, plus each subject\'s whole-course resources. Each sub-topic page has the links for that topic.');
    html += '<div class="lib-subjects">' + M.subjects.map((sub) => '<details class="panel lib" data-subj="' + sub.id + '"><summary>' + stag(sub.id) + '<h2>' + esc(sub.name) + '</h2><span class="muted small">' + sub.res.length + ' links</span></summary><div class="res-cols">' + C.resGroups(sub.res) + '</div></details>').join('') + '</div>';
    html += '<h2 class="group-h">Sites</h2><div class="site-grid">' + Object.keys(RH.SITES).map(function (k) {
      const x = RH.SITES[k];
      return '<a class="site-card" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="site" data-site="' + k + '">' + esc(x.short) + '</span><b>' + esc(x.name) + '</b><span class="muted small">' + esc(x.blurb) + '</span></a>';
    }).join('') + '</div>';
    return html;
  };

  // ---------- Guide ----------
  V.guide = function () {
    const today = U.today();
    let html = C.head('Tools', 'How to revise', 'What works, how to revise each subject, and a plan for the year.');
    html += '<section class="panel"><h2>Your year, phase by phase</h2><ol class="phases">' + RH.GUIDE.phases.map(function (p) {
      const now = today >= p.from && today <= p.to, done = today > p.to;
      return '<li class="phase' + (now ? ' now' : '') + (done ? ' done' : '') + '"><span class="ph-dates mono small">' + esc(U.fmtShort(p.from)) + ' – ' + esc(U.fmtShort(p.to)) + '</span><b>' + esc(p.title) + (now ? ' <mark>you are here</mark>' : '') + '</b><p>' + esc(p.body) + '</p></li>';
    }).join('') + '</ol></section>';
    html += '<h2 class="group-h">Study skills that work</h2><div class="tech-grid">' + RH.GUIDE.techniques.map((x) => '<section class="sheet tech"><h3>' + esc(x.title) + '</h3><p>' + esc(x.body) + '</p><ul>' + x.how.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    html += '<h2 class="group-h">Subject by subject</h2><div class="tech-grid">' + M.subjects.map((sub) => '<section class="sheet tech" data-subj="' + sub.id + '"><h3>' + stag(sub.id) + ' ' + esc(sub.name) + '</h3><ul>' + RH.GUIDE.subjects[sub.id].map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></section>').join('') + '</div>';
    html += '<section class="panel"><h2>How the planner decides</h2><dl class="crit-dl">' + RH.GUIDE.planner.map((p) => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl></section>';
    return html;
  };

  // ---------- Settings ----------
  V.prefs = function () {
    const s = st();
    const sync = RH.store.sync;
    const syncText = sync === 'cloud' ? 'Saved to your Claude account. Progress follows you to any device where you open this page.'
      : sync === 'cloud-full' ? 'Saved in this browser. Some data is too big to sync; export a backup regularly.'
      : sync === 'cloud-error' ? 'Saved in this browser. Syncing to your account failed this time and will retry on your next change.'
      : 'Saved in this browser on this device. Export a backup to move it to another device.';
    let html = C.head('Tools', 'Settings', '');
    html += '<section class="panel"><h2>You</h2><div class="two"><div class="field"><label for="pref-name">First name (for the greeting)</label><input id="pref-name" data-pref="name" value="' + esc(s.profile.name) + '" autocomplete="given-name"></div>' +
      '<div class="field"><label for="pref-cards">Most flashcards per review</label><input id="pref-cards" type="number" min="5" max="500" data-prefnum="cardsDaily" value="' + (s.prefs.cardsDaily || 50) + '"></div></div>' +
      '<div class="field"><span class="label-text">Theme</span><div class="seg-ctl" role="radiogroup" aria-label="Theme">' + [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map((o) => '<button type="button" role="radio" aria-checked="' + (s.profile.theme === o[0]) + '" class="' + (s.profile.theme === o[0] ? 'on' : '') + '" data-action="theme" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div></section>';
    html += V.fmOptionsCard(true);
    html += '<section class="panel"><h2>Your data</h2><p class="sync sync-' + sync + '">' + esc(syncText) + '</p><p class="help">Uploaded exam PDFs stay in this browser only. Ratings, notes, plans, flashcards and scores are included in backups.</p>' +
      '<div class="row-actions"><button type="button" class="btn-ghost" data-action="export-json">' + icon('download') + 'Export backup (.json)</button>' +
      '<label class="btn-ghost file-btn">' + icon('upload') + 'Import backup<input type="file" accept=".json,application/json" id="importFile"></label>' +
      '<button type="button" class="btn-ghost danger" data-action="reset-all">' + icon('trash') + 'Reset everything</button></div>' +
      '<details class="how"><summary>Paste a backup instead</summary><textarea id="importText" rows="4" placeholder="Paste the contents of a backup file"></textarea><button type="button" class="btn btn-sm" data-action="import-text">Import pasted backup</button></details></section>';
    html += '<section class="panel"><h2>About</h2><p class="small">Topics follow the Pearson Edexcel specifications: Physics 9PH0, Mathematics 9MA0, Further Mathematics 9FM0 and Economics A 9EC0. Videos and resources come from Mr Gale\'s Resources, Physics & Maths Tutor, Mad Asmaths, Bicen Maths, 1st Class Maths, TLMaths, ExamSolutions, EconplusDal, Physics Online, Physics With Mr Gill, Cognito, Save My Exams, tutor2u and others.</p></section>';
    return html;
  };

  V.more = function () {
    const items = [['portal', 'portal', 'Exam portal'], ['cards', 'cards', 'Flashcard terminal'], ['timer', 'timers', 'Timers'], ['exams', 'exams', 'Exams & tests'], ['link', 'library', 'Resource library'], ['bulb', 'guide', 'How to revise'], ['prefs', 'preferences', 'Settings']];
    return C.head('', 'More', '') + '<ul class="more-list">' + items.map((x) => '<li><a href="#' + x[1] + '">' + icon(x[0]) + '<span>' + x[2] + '</span>' + icon('right') + '</a></li>').join('') + '</ul>';
  };

  V.notFound = () => C.head('', 'Page not found', 'That link does not match a page in the hub.') + '<a class="btn" href="#today">Go to Today</a>';

  // ---------- Navigation ----------
  const GROUP = { practise: ['practise', 'portal', 'paper-', 'exam', 'mark', 'cards', 'deck-', 'study', 'timers'] };
  V.section_of = function (route) {
    if (route === 'today') return 'today';
    if (route === 'subjects' || /^(s|c|t)-/.test(route)) return 'learn';
    if (route === 'planner' || route === 'exams') return 'plan';
    if (GROUP.practise.some((p) => route === p || (p.slice(-1) === '-' && route.indexOf(p) === 0))) return 'practise';
    return 'more';
  };
  V.nav = function (route) {
    const s = st();
    const examTab = route === 'planner' && RH.ui.tabs.plan === 'exams';
    const on = (r) => r === 'exams' ? examTab : r === 'planner' ? route === r && !examTab : route === r || (r === 'portal' && /^(paper-|exam$|mark$)/.test(route)) || (r === 'cards' && /^(deck-|study$)/.test(route));
    const item = (href, ic, label, extra, attrs) => '<a href="#' + href + '" class="nav-i' + (on(href) ? ' on' : '') + '"' + (on(href) ? ' aria-current="page"' : '') + (attrs || '') + '>' + icon(ic) + '<span>' + label + '</span>' + (extra || '') + '</a>';
    const todayCount = s.plan.sessions.filter((x) => x.d === U.today() && !x.done).length;
    const due = RH.cards.totalDue();
    return item('today', 'home', 'Today', todayCount ? '<span class="count mono">' + todayCount + '</span>' : '') +
      '<p class="nav-h label">Learn</p>' +
      M.subjects.map(function (sub) {
        const here = route === 's-' + sub.id || route.indexOf('c-' + sub.short + '-') === 0 || route.indexOf('t-' + sub.short + '-') === 0;
        return '<a href="#s-' + sub.id + '" class="nav-i nav-subj' + (here ? ' on' : '') + '" data-subj="' + sub.id + '"' + (here ? ' aria-current="page"' : '') + '>' + stag(sub.id) + '<span>' + esc(sub.name) + '</span><span class="nav-pct mono">' + U.pct(M.readiness(s, M.subjectTopics(s, sub))) + '</span></a>';
      }).join('') +
      '<p class="nav-h label">Plan</p>' + item('planner', 'plan', 'Planner', '', ' data-action="planner-tab" data-v="calendar"') + item('exams', 'exams', 'Exams & tests') +
      '<p class="nav-h label">Practise</p>' + item('portal', 'portal', 'Exam portal', s.portal.live ? '<span class="count mono">live</span>' : '') + item('cards', 'cards', 'Flashcards', due ? '<span class="count mono">' + due + '</span>' : '') + item('timers', 'timer', 'Timers') +
      '<p class="nav-h label">Tools</p>' + item('library', 'link', 'Resource library') + item('guide', 'bulb', 'How to revise') + item('preferences', 'prefs', 'Settings');
  };
  V.tabbar = function (route) {
    const sec = V.section_of(route);
    const tab = (href, ic, label, key) => '<a href="#' + href + '" class="tab' + (sec === key ? ' on' : '') + '"' + (sec === key ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span></a>';
    return tab('today', 'home', 'Today', 'today') + tab('subjects', 'book', 'Learn', 'learn') + tab('planner', 'plan', 'Plan', 'plan') + tab('practise', 'portal', 'Practise', 'practise') + tab('more', 'more', 'More', 'more');
  };
})(window.RH = window.RH || {});
