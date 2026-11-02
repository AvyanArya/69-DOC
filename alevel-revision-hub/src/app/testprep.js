/* Revising for a test: add a school test with its topics and get a day-by-day plan from today until the test.
   Weakest topics are learned first, everything is then practised with exam questions, and the last day is a
   timed mixed set and a review of every mark lost. The amount of work fits the revision time in your schedule. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, R = RH.routine;
  const st = () => RH.store.state;
  const store = RH.store;
  const V = RH.views, A = RH.actions;
  const TP = RH.testPrep = {};

  TP.topics = function (s, test) {
    const sub = M.subject[test.subject];
    if (!sub) return [];
    const comps = test.comps && test.comps.length ? sub.comps.filter((c) => test.comps.indexOf(c.id) !== -1) : M.compsFor(s, sub, true);
    let list = [];
    comps.forEach((c) => { list = list.concat(c.topics); });
    // A whole subject is too much for a few days: keep the weakest 24.
    if (list.length > 24) list = list.slice().sort((a, b) => M.conf(s, a.gid) - M.conf(s, b.gid)).slice(0, 24);
    return list;
  };

  TP.build = function (s, test) {
    const today = U.today(), topics = TP.topics(s, test);
    const days = [];
    for (let d = today; d < test.date; d = U.addDays(d, 1)) days.push(d);
    if (!days.length) days.push(today);
    const cap = days.map((d) => { const info = R.day(s, d); return Math.max(45, info.target || info.cap || 90); });
    const byConf = topics.slice().sort((a, b) => M.conf(s, a.gid) - M.conf(s, b.gid));
    const learn = byConf.map(function (t) {
      const c = M.conf(s, t.gid);
      return c <= 1 ? { k: 'learn', t: t, m: 35, why: c ? 'Red: relearn it' : 'Not started yet' } : { k: 'recall', t: t, m: c === 2 ? 25 : 15, why: c === 2 ? 'Amber: firm it up' : 'Green: quick check' };
    });
    const practice = byConf.map((t) => ({ k: 'practice', t: t, m: 20, why: 'Exam questions, timed' }));
    const finish = [{ k: 'mixed', m: 40, title: 'Timed mixed questions on every topic', why: 'Like the real test' }, { k: 'mistakes', m: 20, title: 'Go back over every mark you lost', why: 'Fix the gaps' }];
    const need = learn.concat(practice).concat(finish).reduce((a, x) => a + x.m, 0), have = cap.reduce((a, x) => a + x, 0);
    const k = need > have ? have / need : 1;
    const scale = (x) => Object.assign({}, x, { m: Math.max(10, Math.round(x.m * k / 5) * 5) });
    const queue = learn.concat(practice).map(scale), last = finish.map(scale);
    const plan = days.map((d, i) => ({ d: d, cap: cap[i], items: [], used: 0 }));
    // The last day keeps room for the mixed set and the review; everything else fills days in order.
    const lastDay = plan[plan.length - 1];
    lastDay.reserve = last.reduce((a, x) => a + x.m, 0);
    let di = 0;
    queue.forEach(function (x) {
      while (di < plan.length - 1 && plan[di].used + x.m > plan[di].cap) di++;
      plan[di].items.push(x); plan[di].used += x.m;
    });
    last.forEach((x) => { lastDay.items.push(x); lastDay.used += x.m; });
    plan.forEach((p) => p.items.forEach((x, j) => { x.key = p.d + ':' + j + ':' + x.k + ':' + (x.t ? x.t.gid : ''); }));
    return { days: plan, topics: topics, need: need, have: have, tight: need > have * 1.05 };
  };

  const KLABEL = { learn: 'Learn and condense', recall: 'Active recall', practice: 'Exam questions', mixed: 'Mixed practice', mistakes: 'Review' };
  const KICON = { learn: 'book', recall: 'pen', practice: 'timer', mixed: 'paper', mistakes: 'flag' };
  function itemRow(test, x) {
    const done = test.prep && test.prep[x.key];
    const t = x.t, title = t ? M.title(t.name) : x.title;
    const go = t ? (x.k === 'practice' ? '#t-' + t.gid + '?' : '#t-' + t.gid) : '#papers';
    return '<li class="pi' + (done ? ' done' : '') + '"><button type="button" class="check-b' + (done ? ' on' : '') + '" data-action="prep-tick" data-id="' + test.id + '" data-k="' + esc(x.key) + '" aria-pressed="' + !!done + '" aria-label="Done">' + C.icon('tick') + '</button>' +
      '<span class="pi-ic">' + C.icon(KICON[x.k]) + '</span><a class="pi-main" href="' + go.replace('?', '') + '"><b>' + esc(title) + '</b><span>' + KLABEL[x.k] + ' · ' + U.mins(x.m) + ' · ' + esc(x.why) + '</span></a></li>';
  }

  V.prep = function (id) {
    const s = st(), test = s.exams.custom.find((c) => c.id === id);
    if (!test) return C.empty('Test not found.', '', '<a class="btn" href="#exams">Exams and tests</a>');
    const sub = M.subject[test.subject], pl = TP.build(s, test), today = U.today();
    const n = C.daysTo(test.date);
    const all = pl.days.reduce((a, d) => a + d.items.length, 0), ticked = Object.keys(test.prep || {}).length;
    let html = C.crumbs([['Exams and tests', 'exams'], [test.name]]);
    html += '<section class="prep-hero" data-subj="' + test.subject + '"><div><p class="kicker">' + esc(sub ? sub.name : '') + ' · ' + esc(U.fmt(test.date, { weekday: 'long', day: 'numeric', month: 'long' })) + '</p><h1>' + esc(test.name) + '</h1>' +
      '<p class="meta">' + (n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days') + ' · ' + U.plural(pl.topics.length, 'topic') + ' · ' + U.dur(pl.need) + ' of revision</p></div>' +
      '<div class="prep-ring">' + C.ring(all ? ticked / all : 0, '<b>' + ticked + '</b>/' + all, 92) + '</div></section>';
    if (pl.tight) html += '<p class="note row-note"><span><b>It’s tight.</b> This needs ' + U.dur(pl.need) + ' but your schedule has ' + U.dur(pl.have) + ' before the test, so each step is shorter. Free up time in <a href="#routine">My schedule</a> if you can.</span></p>';
    if (!pl.topics.length) html += C.empty('No topics picked.', 'Delete this test and add it again with the chapters it covers.');
    html += '<div class="prep-days">' + pl.days.map(function (d, i) {
      const lab = d.d === today ? 'Today' : d.d === U.addDays(today, 1) ? 'Tomorrow' : U.fmt(d.d, { weekday: 'long', day: 'numeric', month: 'short' });
      return '<section class="prep-day"><header><span class="pd-n">' + (i + 1) + '</span><div><h2>' + esc(lab) + '</h2><span class="muted small">' + U.dur(d.items.reduce((a, x) => a + x.m, 0)) + '</span></div></header><ul class="plist">' + d.items.map((x) => itemRow(test, x)).join('') + '</ul></section>';
    }).join('') +
      '<section class="prep-day on-day"><header><span class="pd-n">' + C.icon('flag') + '</span><div><h2>On the day</h2><span class="muted small">15 minutes before</span></div></header><ul class="tips"><li>Read your key points and formulae once. No new topics.</li><li>Look at your list of lost marks from the review.</li><li>Sleep well the night before; it helps more than late cramming.</li></ul></section></div>';
    html += '<div class="save-bar"><span class="muted small">' + (test.inPlan ? 'In your weekly plan.' : 'Add the steps to your weekly plan to get them at real times.') + '</span><button type="button" class="btn lg" data-action="prep-add" data-id="' + test.id + '">' + C.icon('plan') + (test.inPlan ? 'Update my plan' : 'Put it in my plan') + '</button></div>';
    return html;
  };

  A['prep-tick'] = function (el) {
    store.update(function (s) {
      const t = s.exams.custom.find((c) => c.id === el.dataset.id);
      t.prep = t.prep || {};
      if (t.prep[el.dataset.k]) delete t.prep[el.dataset.k]; else t.prep[el.dataset.k] = 1;
    });
  };
  A['prep-add'] = function (el) {
    const id = el.dataset.id;
    store.update(function (s) {
      const test = s.exams.custom.find((c) => c.id === id), pl = TP.build(s, test);
      const KIND = { learn: 'learn', recall: 'recall', practice: 'practice', mixed: 'practice', mistakes: 'recall' };
      s.plan.sessions = s.plan.sessions.filter((x) => x.prep !== id);
      const touched = {};
      pl.days.forEach((d) => d.items.forEach(function (x) {
        s.plan.sessions.push({ id: U.uid(), d: d.d, k: KIND[x.k], s: test.subject, t: x.t ? x.t.gid : null, m: x.m, why: 'For ' + test.name, prep: id, label: x.t ? null : x.title });
        touched[d.d] = 1;
      }));
      s.plan.sessions.sort((a, b) => a.d.localeCompare(b.d));
      Object.keys(touched).forEach((d) => R.placeDay(s, d, s.plan.sessions.filter((q) => q.d === d)));
      test.inPlan = true;
    }, { plan: true });
    C.toast('Added to your plan');
  };
})(window.RH = window.RH || {});
