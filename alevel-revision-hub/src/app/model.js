/* Indexes the syllabus data and answers questions about it given the saved state. */
(function (RH) {
  'use strict';
  const U = RH.util, L = RH.link;

  const M = RH.model = {};
  M.subjects = RH.SUBJECT_LIST;
  M.subject = {};
  M.topic = {};
  M.topics = [];

  M.subjects.forEach(function (s) {
    M.subject[s.id] = s;
    s.paper = {};
    s.papers.forEach((p) => { s.paper[p.id] = p; });
    s.comps.forEach(function (c) {
      c.subject = s;
      c.gid = s.short + '-' + c.id;
      c.topics.forEach(function (t, i) {
        t.gid = s.short + '-' + c.id + '-' + t.id;
        t.comp = c; t.subject = s; t.index = i;
        M.topic[t.gid] = t;
        M.topics.push(t);
      });
    });
  });

  const optionChosen = (state, c) => !c.option || (state.profile.fmOptions || []).indexOf(c.option) !== -1;
  // Option modules show on the Further Maths page until options are picked, but only chosen ones count anywhere else.
  M.compsFor = (state, s, forDisplay) => s.comps.filter((c) => !c.option || (forDisplay && !state.profile.fmOptions) || optionChosen(state, c));
  M.activeTopics = (state) => M.topics.filter((t) => optionChosen(state, t.comp));
  M.subjectTopics = (state, s) => M.activeTopics(state).filter((t) => t.subject === s);

  M.ts = (state, gid) => state.topics[gid] || { c: 0, p: [], notes: '', last: null, n: 0 };
  M.conf = (state, gid) => (state.topics[gid] && state.topics[gid].c) || 0;

  M.CONF = [
    { label: 'Not started', short: '—' },
    { label: 'Red', short: 'R', hint: "I can't do this yet" },
    { label: 'Amber', short: 'A', hint: 'I can do some of it' },
    { label: 'Green', short: 'G', hint: 'I can do exam questions on it' }
  ];

  // Counts of topics at each confidence level.
  M.ragCounts = function (state, topics) {
    const n = [0, 0, 0, 0];
    topics.forEach((t) => { n[M.conf(state, t.gid)]++; });
    return n;
  };
  M.readiness = function (state, topics) {
    if (!topics.length) return 0;
    return topics.reduce((a, t) => a + M.conf(state, t.gid), 0) / (3 * topics.length);
  };

  const ytId = (u) => { const m = /(?:v=|youtu\.be\/)([\w-]{11})/.exec(u || ''); return m ? m[1] : null; };
  const galeRes = (list) => (list || []).map((g) => L.r('gale', g[0] === 'page' ? 'notes' : g[0], g[1], g[2]));

  // Direct videos for a topic: Mr Gale's picks first, then the channels mapped to it, then any direct links in the data.
  M.videos = function (t) {
    const out = [], seen = {};
    const add = (ch, id, title) => { if (id && !seen[id]) { seen[id] = 1; out.push({ ch: ch, id: id, title: title }); } };
    (RH.VIDEOS[t.gid] || []).forEach((v) => add(v[0], v[1], v[2]));
    (t.res || []).forEach((r) => { if (r.k === 'video') add(r.s, ytId(r.u), r.t.replace(/^[^:]+: /, '')); });
    (RH.GALE[t.gid] || []).forEach((g) => { if (g[0] === 'video') add('gale', ytId(g[2]), g[1].replace(/^Mr Gale video: /, '')); });
    return out;
  };
  // Channel searches for more videos on the topic.
  M.videoSearches = (t) => (t.subject.video || []).map((site) => L.r(site, 'video', RH.SITES[site].name, L.ytSearch(site, t.q)));

  // Every non-video resource for a topic, grouped by kind: the topic's own, Mr Gale's, then the section's.
  M.resources = function (t, state) {
    const seen = {}, list = [];
    const add = (r) => { if (r && r.u && r.k !== 'video' && !seen[r.u]) { seen[r.u] = 1; list.push(r); } };
    const mine = state && state.topics[t.gid] && state.topics[t.gid].links;
    (mine || []).forEach((x) => add(L.r('mine', 'mine', x.t, x.u)));
    galeRes(RH.GALE[t.gid]).forEach(add);
    (t.res || []).forEach(add);
    galeRes(RH.GALE_COMP[t.comp.gid]).forEach(add);
    (t.comp.res || []).forEach(add);
    const order = Object.keys(RH.KINDS);
    return list.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
  };
  M.compResources = function (c) {
    const seen = {}, list = [];
    const add = (r) => { if (r && r.u && !seen[r.u]) { seen[r.u] = 1; list.push(r); } };
    galeRes(RH.GALE_COMP[c.gid]).forEach(add);
    (c.res || []).forEach(add);
    return list;
  };
  M.compVideos = (c) => c.topics.reduce((a, t) => a + M.videos(t).length, 0);
  M.comp = {};
  M.subjects.forEach((s) => s.comps.forEach((c) => { M.comp[c.gid] = c; }));

  M.paperTopics = (state, s, paperId) => M.subjectTopics(state, s).filter((t) => t.comp.papers.indexOf(paperId) !== -1);

  // All exams and tests the student is sitting, soonest first.
  M.exams = function (state) {
    const out = [];
    RH.OFFICIAL_EXAMS.forEach(function (e) {
      const s = M.subject[e.subject], p = s.paper[e.paper];
      if (p.option) {
        const opt = RH.FM_OPTIONS.find((o) => o.paper === e.paper);
        if (!state.profile.fmOptions || state.profile.fmOptions.indexOf(opt.id) === -1) return;
      }
      if (state.exams.off[e.id]) return;
      out.push({ id: e.id, official: true, subject: e.subject, code: p.code, title: s.name + ' ' + p.name.split(':')[0], full: p.name, date: e.date, time: e.time, dur: p.dur,
        topicIds: M.paperTopics(state, s, e.paper).map((t) => t.gid) });
    });
    state.exams.custom.forEach(function (c) {
      const s = M.subject[c.subject];
      if (!s) return;
      const comps = c.comps && c.comps.length ? c.comps : null;
      const topics = M.subjectTopics(state, s).filter((t) => !comps || comps.indexOf(t.comp.id) !== -1);
      out.push({ id: c.id, official: false, subject: c.subject, code: c.name, title: c.name, full: c.name, date: c.date, time: c.time || '', dur: c.dur || 60, topicIds: topics.map((t) => t.gid) });
    });
    return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  };
  M.upcomingExams = (state, from) => M.exams(state).filter((e) => e.date >= (from || U.today()));
  M.examById = (state, id) => M.exams(state).find((e) => e.id === id);

  // Officially timetabled exams the student could sit, including ones switched off.
  M.officialFor = function (state) {
    return RH.OFFICIAL_EXAMS.filter(function (e) {
      const p = M.subject[e.subject].paper[e.paper];
      if (!p.option) return true;
      const opt = RH.FM_OPTIONS.find((o) => o.paper === e.paper);
      return state.profile.fmOptions && state.profile.fmOptions.indexOf(opt.id) !== -1;
    });
  };

  M.search = function (state, q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return M.activeTopics(state).map(function (t) {
      const hay = (t.name + ' ' + t.comp.name + ' ' + t.subject.name + ' ' + (t.pts || []).join(' ')).toLowerCase();
      if (!words.every((w) => hay.indexOf(w) !== -1)) return null;
      const name = t.name.toLowerCase();
      return { t: t, score: words.reduce((a, w) => a + (name.indexOf(w) !== -1 ? 2 : 0), 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 12).map((x) => x.t);
  };
})(window.RH = window.RH || {});
