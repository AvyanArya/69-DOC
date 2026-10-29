/* Your week as clock time: sleep, school, travel, activities, meals and protected free time.
   It works out the windows left for revision each day and gives every planned session a start time. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, tm = U.tm;
  const R = RH.routine = {};

  RH.ACTIVITY_KINDS = { meal: 'Meal', sport: 'Sport', job: 'Work', club: 'Club or lesson', family: 'Family', other: 'Other' };

  RH.ROUTINE_DEFAULTS = function () {
    const day = (school, wake, bed, study, free) => ({ school: school, start: '08:40', end: '15:30', wake: wake, bed: bed, study: study, free: free });
    return {
      days: [
        day(true, '07:00', '22:45', 150, 90), day(true, '07:00', '22:45', 150, 90), day(true, '07:00', '22:45', 150, 90),
        day(true, '07:00', '22:45', 150, 90), day(true, '07:00', '23:15', 90, 150),
        day(false, '08:30', '23:30', 240, 240), day(false, '08:30', '22:45', 210, 180)
      ],
      travel: 30,        // minutes each way
      prep: 45,          // from waking to being ready to work
      windDown: 45,      // no revision this close to bed
      afterSchool: 30,   // a break before revising on school days
      earliest: '07:30', latest: '21:45',
      stretch: 120,      // longest run of sessions before a long break
      longBreak: 20,
      prefer: 'early',   // fill free time from the start of the day ('early') or the end ('late')
      activities: [{ id: 'a-dinner', name: 'Dinner', kind: 'meal', days: [0, 1, 2, 3, 4, 5, 6], start: '18:30', end: '19:15', term: false }],
      events: [],
      holiday: { wake: '08:30', bed: '23:00', free: 240 },
      setupAt: 0
    };
  };

  // Normalise an older or imported routine, keeping what the student set.
  R.normalise = function (raw, settings) {
    const d = RH.ROUTINE_DEFAULTS();
    if (!raw || typeof raw !== 'object') {
      // First run after an upgrade: carry the old hours-per-day over as study targets.
      if (settings && Array.isArray(settings.week)) settings.week.forEach((m, i) => { if (d.days[i]) d.days[i].study = Number(m) || 0; });
      return d;
    }
    const r = Object.assign(d, raw);
    r.days = (Array.isArray(raw.days) && raw.days.length === 7 ? raw.days : d.days).map((x, i) => Object.assign({}, RH.ROUTINE_DEFAULTS().days[i], x));
    r.activities = Array.isArray(raw.activities) ? raw.activities : d.activities;
    r.events = Array.isArray(raw.events) ? raw.events : [];
    r.holiday = Object.assign(RH.ROUTINE_DEFAULTS().holiday, raw.holiday || {});
    return r;
  };

  const holidayOn = (S, d) => (S.holidays || []).find((h) => h.from && h.to && d >= h.from && d <= h.to) || null;
  R.holidayOn = holidayOn;

  // Subtract busy blocks from a window, returning the free gaps.
  function gaps(from, to, busy) {
    const out = [];
    let c = from;
    busy.slice().sort((a, b) => a.start - b.start).forEach(function (b) {
      if (b.start >= to || b.end <= c) return;
      if (b.start > c) out.push({ start: c, end: Math.min(b.start, to) });
      c = Math.max(c, b.end);
    });
    if (c < to) out.push({ start: c, end: to });
    return out.filter((g) => g.end - g.start >= 15);
  }

  // Minutes of sessions (of length len, with breaks of brk) that fit into the windows.
  function packable(windows, len, brk) {
    let total = 0;
    windows.forEach(function (w) {
      const L = w.end - w.start;
      const n = Math.floor((L + brk) / (len + brk));
      const rem = L - n * (len + brk);
      total += n * len + (rem >= 25 ? rem : 0);
    });
    return total;
  }

  // Everything about one date: the blocks of the day and the revision time it leaves.
  R.day = function (state, d, opts) {
    const r = state.routine, S = state.plan.settings;
    const dow = U.dow(d);
    const base = r.days[dow];
    const hol = holidayOn(S, d);
    const exams = M.exams(state).filter((e) => e.date === d);
    const blocks = [];
    const wake = tm(hol ? r.holiday.wake : base.wake);
    let bed = tm(hol ? r.holiday.bed : base.bed);
    if (bed <= wake) bed += 1440;
    const add = (kind, start, end, label, extra) => { if (end > start) blocks.push(Object.assign({ kind: kind, start: start, end: end, label: label }, extra || {})); };

    add('morning', wake, wake + (Number(r.prep) || 0), 'Get ready');
    let school = null;
    if (!hol && base.school && !exams.length) {
      school = { start: tm(base.start), end: tm(base.end) };
      const tr = Number(r.travel) || 0;
      add('travel', school.start - tr, school.start, 'Travel');
      add('school', school.start, school.end, 'School');
      add('travel', school.end, school.end + tr, 'Travel');
      add('rest', school.end + tr, school.end + tr + (Number(r.afterSchool) || 0), 'Break after school');
    }
    exams.forEach(function (e) {
      const s = tm(e.time || '09:00');
      add('exam', s - 30, s + e.dur, e.code + ' exam', { subj: e.subject, exam: e.id });
    });
    (r.activities || []).forEach(function (a) {
      if ((a.days || []).indexOf(dow) === -1) return;
      if (a.term && hol) return;
      let s = tm(a.start), e = tm(a.end);
      if (e <= s) e += 1440;
      add(a.kind === 'meal' ? 'meal' : 'activity', s, e, a.name, { id: a.id, akind: a.kind });
    });
    (r.events || []).forEach(function (ev) {
      if (ev.date !== d) return;
      let s = tm(ev.start || '00:00'), e = tm(ev.end || '23:59');
      if (e <= s) e += 1440;
      add('event', s, e, ev.name || 'Busy', { id: ev.id });
    });
    add('winddown', bed - (Number(r.windDown) || 0), bed, 'Wind down');
    // Sessions already done today keep their slots.
    (opts && opts.keep || []).forEach((x) => { if (x.t0 != null) add('kept', x.t0, x.t0 + x.m, ''); });

    const from = Math.max(wake + (Number(r.prep) || 0), tm(r.earliest));
    const to = Math.min(bed - (Number(r.windDown) || 0), tm(r.latest) <= tm(r.earliest) ? tm(r.latest) + 1440 : tm(r.latest));
    const windows = from < to ? gaps(from, to, blocks) : [];
    const freeTotal = windows.reduce((a, w) => a + w.end - w.start, 0);
    const target = hol ? (Number(hol.mins) || 0) : (Number(base.study) || 0);
    const freeWant = hol ? (hol.free != null ? Number(hol.free) : Number(r.holiday.free) || 0) : (Number(base.free) || 0);
    const fits = packable(windows, S.sessionLen, S.breakLen);
    const cap = Math.max(0, Math.min(target, freeTotal - freeWant, fits));
    return {
      d: d, dow: dow, hol: hol, school: school, exams: exams, wake: wake, bed: bed,
      blocks: blocks.filter((b) => b.kind !== 'kept').sort((a, b) => a.start - b.start), windows: windows,
      freeTotal: freeTotal, target: target, freeWant: freeWant, cap: cap,
      maxWin: windows.reduce((a, w) => Math.max(a, w.end - w.start), 0),
      short: cap < target
    };
  };

  // Give each not-done session on a date a start time (t0, minutes after midnight). Returns the sessions it could not fit.
  R.placeDay = function (state, d, sessions) {
    const S = state.plan.settings, r = state.routine;
    const done = sessions.filter((x) => x.done && x.t0 != null);
    const todo = sessions.filter((x) => !(x.done && x.t0 != null));
    const info = R.day(state, d, { keep: done });
    const late = r.prefer === 'late';
    const wins = info.windows.map((w) => ({ start: w.start, end: w.end, cur: late ? w.end : w.start, run: 0 }));
    const brk = Number(S.breakLen) || 0, stretch = Number(r.stretch) || 120, lb = Number(r.longBreak) || 20;
    // Long sessions (timed papers) choose their window first.
    const order = todo.slice().sort((a, b) => (b.k === 'pp') - (a.k === 'pp') || (b.k === 'eve') - (a.k === 'eve'));
    const misses = [];
    order.forEach(function (x) {
      const m = x.m;
      let placed = false;
      const list = late ? wins.slice().reverse() : wins;
      for (const w of list) {
        if (late) {
          let end = w.cur;
          if (w.run && w.run + m > stretch) end -= lb - brk;
          const start = end - m;
          if (start >= w.start) { x.t0 = start; w.cur = start - brk; w.run = w.run + m > stretch ? m : w.run + m; placed = true; break; }
        } else {
          let start = w.cur;
          if (w.run && w.run + m > stretch) start += lb - brk;
          if (start + m <= w.end) { x.t0 = start; w.cur = start + m + brk; w.run = w.run + m > stretch ? m : w.run + m; placed = true; break; }
        }
      }
      if (!placed) { x.t0 = null; misses.push(x); }
    });
    return misses;
  };

  // Place every future day's sessions. Call after the plan is built or a session moves.
  R.placeAll = function (state, from) {
    from = from || U.today();
    const byDay = {};
    state.plan.sessions.forEach((x) => { if (x.d >= from) (byDay[x.d] = byDay[x.d] || []).push(x); });
    Object.keys(byDay).forEach((d) => R.placeDay(state, d, byDay[d]));
  };

  // Timeline for one day: routine blocks plus study sessions and the free time left over.
  R.timeline = function (state, d) {
    const info = R.day(state, d);
    const sess = state.plan.sessions.filter((x) => x.d === d && x.t0 != null);
    const items = info.blocks.map((b) => Object.assign({ type: 'block' }, b));
    sess.forEach((x) => items.push({ type: 'session', kind: 'study', start: x.t0, end: x.t0 + x.m, sess: x }));
    // Free time = windows minus sessions.
    const busy = sess.map((x) => ({ start: x.t0, end: x.t0 + x.m + (Number(state.plan.settings.breakLen) || 0) }));
    info.windows.forEach((w) => gaps(w.start, w.end, busy).forEach((g) => { if (g.end - g.start >= 20) items.push({ type: 'free', kind: 'free', start: g.start, end: g.end, label: 'Free time' }); }));
    items.sort((a, b) => a.start - b.start || (a.type === 'block' ? -1 : 1));
    return { info: info, items: items, unplaced: state.plan.sessions.filter((x) => x.d === d && x.t0 == null && !x.done) };
  };

  // Weekly totals for the routine page.
  R.weekTotals = function (state, ws) {
    const t = { school: 0, activity: 0, study: 0, target: 0, free: 0, sleep: 0, short: [] };
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(ws, i), info = R.day(state, d);
      info.blocks.forEach((b) => { if (b.kind === 'school' || b.kind === 'travel') t.school += b.end - b.start; if (b.kind === 'activity' || b.kind === 'meal' || b.kind === 'event') t.activity += b.end - b.start; });
      t.study += info.cap; t.target += info.target;
      t.free += Math.max(0, info.freeTotal - info.cap);
      t.sleep += 1440 - (info.bed - info.wake);
      if (info.short) t.short.push({ d: d, cap: info.cap, target: info.target, freeTotal: info.freeTotal, freeWant: info.freeWant });
    }
    return t;
  };
})(window.RH = window.RH || {});
