/* Builds a day-by-day revision plan from exams, availability, confidence ratings and the chosen criteria. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model;

  // What each kind of session asks you to do. Order: what a first pass through a topic looks like.
  RH.KIND = {
    learn:    { label: 'Learn & condense', how: 'Read the notes or cheat sheet, watch one video, then write a one-page summary and 5 flashcards.' },
    practice: { label: 'Exam questions', how: 'Do topic questions under time pressure, mark them with the mark scheme, and log every mistake.' },
    recall:   { label: 'Active recall', how: 'Blurt everything you remember, check the gaps, run your flashcards, then do 3 exam questions.' },
    pp:       { label: 'Timed past paper', how: 'Full paper under exam conditions, then mark it with the mark scheme and log the marks.' },
    eve:      { label: 'Exam-eve review', how: 'Light review only: formulae, definitions, your mistakes log, and a few quick questions. Sleep early.' }
  };

  // Days to wait before reviewing a topic again, by how many times it has been revised.
  const INTERVALS = [2, 5, 10, 21, 35];

  RH.PRESETS = {
    balanced: { label: 'Balanced', note: 'Even mix of weak topics, upcoming exams and full coverage.', wWeak: 1.5, wUrg: 1.5, wCov: 1, spacing: true, interleave: true, ppWeeks: 8, focusNext: false },
    weakest:  { label: 'Weakest first', note: 'Red and not-started topics come first, wherever they sit on the timetable.', wWeak: 3, wUrg: 0.75, wCov: 0.75, spacing: true, interleave: true, ppWeeks: 6, focusNext: false },
    countdown:{ label: 'Exam countdown', note: 'The sooner a paper is, the more its topics are revised. More past papers near each exam.', wWeak: 1, wUrg: 3, wCov: 0.75, spacing: true, interleave: true, ppWeeks: 10, focusNext: false },
    coverage: { label: 'Cover everything', note: 'Touch every topic once before repeating any. Good for a first pass after finishing the course.', wWeak: 1, wUrg: 0.5, wCov: 3, spacing: false, interleave: true, ppWeeks: 4, focusNext: false },
    nexttest: { label: 'Next test only', note: 'Only revise what is in your next exam or mock, weakest first.', wWeak: 2, wUrg: 1, wCov: 1, spacing: true, interleave: false, ppWeeks: 3, focusNext: true }
  };

  RH.PLAN_DEFAULTS = function () {
    return {
      preset: 'balanced',
      start: '', end: '',
      week: [90, 90, 90, 90, 60, 180, 150],
      holidays: [
        { id: 'h1', name: 'Christmas holidays', from: '2026-12-19', to: '2027-01-03', mins: 240 },
        { id: 'h2', name: 'February half term', from: '2027-02-13', to: '2027-02-21', mins: 240 },
        { id: 'h3', name: 'Easter holidays', from: '2027-03-27', to: '2027-04-11', mins: 300 },
        { id: 'h4', name: 'Study leave & exam season', from: '2027-05-08', to: '2027-06-21', mins: 300 }
      ],
      sessionLen: 45, breakLen: 10,
      wWeak: 1.5, wUrg: 1.5, wCov: 1, spacing: true, interleave: true, ppWeeks: 8, focusNext: false,
      eveReview: true, examDay: 'light', skipUntaught: true,
      subj: { physics: 1, maths: 1, further: 1, economics: 1 }
    };
  };

  // Minutes of revision a date can hold, from the routine (school, activities, sleep, protected free time).
  function capacity(state, d) { return RH.routine.day(state, d).cap; }

  function weakness(conf) {
    // 0 = not started, 3 = green. Fractions appear while simulating repeated sessions.
    return conf <= 0 ? 1 : 0.1 + 0.9 * (1 - conf / 3) * 0.8;
  }

  RH.planner = {
    capacity: capacity,

    generate: function (state, today) {
      const S = state.plan.settings;
      today = today || U.today();
      const start = S.start && S.start > today ? S.start : today;
      const weightOf = (sid) => (S.subj[sid] == null ? 1 : Number(S.subj[sid]));
      const exams = M.exams(state).filter((e) => e.date >= start && weightOf(e.subject) > 0);
      const end = S.end && S.end > start ? S.end : (exams.length ? exams[exams.length - 1].date : U.addDays(start, 56));

      // Work in whole day numbers; convert back to dates only when writing sessions.
      const day0 = start, num = (iso) => U.diff(day0, iso), dateOf = (n) => U.addDays(day0, n);
      const ex = exams.map((e) => Object.assign({}, e, { n: num(e.date) }));
      const last = num(end);

      // Done sessions and anything before the start date stay as history.
      const kept = state.plan.sessions.filter((s) => s.d < start || s.done);
      const keptMins = {};
      kept.forEach((s) => { if (s.d >= start) { const k = num(s.d); keptMins[k] = (keptMins[k] || 0) + s.m; } });

      const topicExams = {};
      ex.forEach((e) => e.topicIds.forEach((id) => { (topicExams[id] = topicExams[id] || []).push(e); }));
      let pool = M.activeTopics(state).filter((t) => weightOf(t.subject.id) > 0 && !(S.skipUntaught && state.topics[t.gid] && state.topics[t.gid].nt));
      if (ex.length) pool = pool.filter((t) => topicExams[t.gid]);

      const sim = {};
      pool.forEach(function (t) {
        const ts = state.topics[t.gid] || {};
        sim[t.gid] = { conf: ts.c || 0, n: ts.n || 0, last: ts.last ? num(ts.last) : null, planned: null };
      });

      // Target share of time per subject, from the priority sliders.
      const subjIds = Object.keys(M.subject).filter((id) => weightOf(id) > 0 && pool.some((t) => t.subject.id === id));
      const wSum = subjIds.reduce((a, id) => a + weightOf(id), 0) || 1;
      const spent = {};
      let spentAll = 0;

      const capOf = [], winOf = [];
      for (let n = 0; n <= last; n++) { const info = RH.routine.day(state, dateOf(n)); capOf[n] = info.cap; winOf[n] = info.maxWin; }

      const out = [];
      const lastPaper = {};
      for (let n = 0; n <= last; n++) {
        const upcoming = ex.filter((e) => e.n > n);
        if (ex.length && !upcoming.length) break;
        let cap = capOf[n] - (keptMins[n] || 0);
        const todays = ex.filter((e) => e.n === n);
        if (todays.length) {
          if (S.examDay === 'off') continue;
          if (S.examDay === 'light') cap = Math.floor(cap / 2);
        }
        if (cap < 20) continue;
        const d = dateOf(n);

        const tomorrow = ex.filter((e) => e.n === n + 1);
        let only = null;
        if (S.eveReview && tomorrow.length) {
          only = {};
          tomorrow.forEach(function (e) {
            e.topicIds.forEach((id) => { only[id] = 1; });
            if (cap < 20) return;
            const m = Math.min(S.sessionLen, cap);
            out.push({ id: U.uid(), d: d, k: 'eve', s: e.subject, e: e.id, m: m, why: e.title + ' is tomorrow' });
            cap -= m;
          });
        }
        if (S.focusNext && upcoming.length && !only) {
          only = {};
          upcoming[0].topicIds.forEach((id) => { only[id] = 1; });
        }

        // At most one timed past paper a day, more often as each exam gets closer.
        if (S.ppWeeks > 0 && !(tomorrow.length && S.eveReview)) {
          let best = null, bestScore = 0, bestLeft = 0;
          upcoming.forEach(function (e) {
            if (!e.official) return;
            const left = e.n - n;
            if (left < 2 || left > S.ppWeeks * 7) return;
            const gap = lastPaper[e.id] != null ? n - lastPaper[e.id] : 99;
            const need = left > 28 ? 10 : left > 14 ? 6 : 3;
            if (gap < need) return;
            const score = Math.min(gap / need, 3) + 3 / (left + 1);
            if (score > bestScore) { best = e; bestScore = score; bestLeft = left; }
          });
          if (best && cap >= best.dur + 30 && winOf[n] >= best.dur + 30) {
            const m = best.dur + 30;
            out.push({ id: U.uid(), d: d, k: 'pp', s: best.subject, e: best.id, m: m, why: best.title + ' ' + U.countdown(bestLeft) + ': paper + marking' });
            cap -= m;
            lastPaper[best.id] = n;
            spent[best.subject] = (spent[best.subject] || 0) + m; spentAll += m;
          }
        }

        const used = {};
        const daySubj = [];
        while (cap >= Math.min(25, S.sessionLen)) {
          const m = Math.min(S.sessionLen, cap);
          let best = null, bestScore = -1, bestInfo = null;
          for (let i = 0; i < pool.length; i++) {
            const t = pool[i];
            if (used[t.gid] || (only && !only[t.gid])) continue;
            const st = sim[t.gid];
            let next = null;
            const list = topicExams[t.gid];
            if (list) for (let j = 0; j < list.length; j++) { if (list[j].n > n) { next = list[j]; break; } }
            if (ex.length && !next) continue;
            const days = next ? next.n - n : 60;
            const weak = weakness(st.conf);
            const urg = 1 / (1 + days / 21);
            const cov = st.n === 0 ? 1 : 0;
            let due = 0;
            if (S.spacing && st.last != null) {
              const gap = n - st.last, want = INTERVALS[Math.min(st.n, INTERVALS.length - 1)];
              if (gap >= want) due = Math.min(1, 0.5 + 0.5 * (gap - want) / want);
            }
            let score = S.wWeak * weak + S.wUrg * urg + S.wCov * cov + due;
            const sid = t.subject.id;
            const target = weightOf(sid) / wSum * (spentAll + 240);
            score *= U.clamp(Math.pow(target / ((spent[sid] || 0) + 60), 0.6), 0.45, 1.8);
            if (st.planned != null) {
              const g = n - st.planned;
              if (g < 2) score *= 0.25; else if (g < 4) score *= 0.6;
            }
            if (S.interleave) {
              if (daySubj[daySubj.length - 1] === sid) score *= 0.5;
              else if (daySubj.indexOf(sid) !== -1) score *= 0.8;
            } else if (daySubj.length) {
              score *= daySubj[0] === sid ? 1.6 : 0.3;
            }
            score += U.hash01(t.gid + n) * 0.02;
            if (score > bestScore) { bestScore = score; best = t; bestInfo = { due: due, next: next, days: days }; }
          }
          if (!best) break;
          const st = sim[best.gid];
          const why = [st.conf <= 0 && st.n === 0 ? 'Not started' : st.conf < 1.5 ? 'Weak topic' : st.conf < 2.5 ? 'Amber topic' : 'Keep it fresh'];
          if (bestInfo.due > 0) why.push('due for review');
          if (bestInfo.next) why.push(bestInfo.next.code + ' ' + U.countdown(bestInfo.days));
          const kind = st.n === 0 ? (st.conf >= 2 ? 'practice' : 'learn') : (st.conf >= 2.5 ? 'recall' : (st.n % 2 ? 'practice' : 'recall'));
          out.push({ id: U.uid(), d: d, k: kind, s: best.subject.id, t: best.gid, m: m, why: why.join(' · ') });
          st.n++; st.planned = n; st.last = n; st.conf = Math.min(3, st.conf + (st.conf === 0 ? 1 : 0.5));
          used[best.gid] = 1; daySubj.push(best.subject.id);
          spent[best.subject.id] = (spent[best.subject.id] || 0) + m; spentAll += m;
          cap -= m;
        }
      }
      const all = kept.concat(out).sort((a, b) => a.d.localeCompare(b.d));
      const byDay = {};
      all.forEach((x) => { if (x.d >= start) (byDay[x.d] = byDay[x.d] || []).push(x); });
      Object.keys(byDay).forEach((d) => RH.routine.placeDay(state, d, byDay[d]));
      return all;
    },

    // Plan summary: minutes per subject, and how many topics get at least one session before their first exam.
    summary: function (state) {
      const today = U.today();
      const future = state.plan.sessions.filter((s) => s.d >= today && !s.done);
      const mins = {}, touched = {};
      future.forEach((s) => { mins[s.s] = (mins[s.s] || 0) + s.m; if (s.t) touched[s.t] = 1; });
      const topics = M.activeTopics(state);
      return { sessions: future.length, mins: mins, total: future.reduce((a, s) => a + s.m, 0), covered: topics.filter((t) => touched[t.gid]).length, topics: topics.length };
    }
  };
})(window.RH = window.RH || {});
