/* Plan: the week on a clock, your routine (school, sleep, activities, free time), exams and strategy. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, R = RH.routine;
  const st = () => RH.store.state;
  const store = RH.store;
  const V = RH.views;
  const DAYNAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ---------- This week ----------
  const PPM = 0.8; // pixels per minute on the week grid
  V.plan = function () {
    const s = st(), today = U.today();
    const ws = RH.ui.week || U.weekStart(today);
    const days = []; for (let i = 0; i < 7; i++) days.push(U.addDays(ws, i));
    const tls = days.map((d) => R.timeline(s, d));
    const h0 = Math.max(0, Math.floor(Math.min.apply(null, tls.map((t) => t.info.wake)) / 60));
    const h1 = Math.min(24, Math.ceil(Math.max.apply(null, tls.map((t) => Math.min(1440, t.info.bed))) / 60));
    const sess = s.plan.sessions.filter((x) => x.d >= ws && x.d <= days[6]);
    const planned = sess.reduce((a, x) => a + x.m, 0), target = tls.reduce((a, t) => a + t.info.target, 0);
    const free = tls.reduce((a, t) => a + t.items.filter((i) => i.type === 'free').reduce((b, i) => b + i.end - i.start, 0), 0);
    const doneM = sess.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const exams = M.exams(s);
    const sum = RH.planner.summary(s);
    let html = C.subnav('plan', 'plan');
    html += C.page({ eyebrow: 'Plan', title: esc(U.fmtShort(ws)) + ' – ' + esc(U.fmtShort(days[6])), lede: U.dur(planned) + ' of revision planned (' + U.dur(doneM) + ' done) · ' + U.dur(free) + ' free time kept · ' + U.plural(sum.sessions, 'session') + ' left until your exams',
      actions: '<button type="button" class="icon-btn" data-action="week-prev" aria-label="Previous week">' + C.icon('left') + '</button><button type="button" class="btn alt sm" data-action="week-today">This week</button><button type="button" class="icon-btn" data-action="week-next" aria-label="Next week">' + C.icon('right') + '</button><button type="button" class="btn sm" data-action="plan-build">' + C.icon('rebuild') + 'Rebuild plan</button>' });
    html += V.staleBanner();
    if (!s.routine.setupAt) html += '<div class="note row-note"><p><b>This plan uses a sample routine.</b> Put in your school times, activities and how much you want to revise so the times fit your real week.</p><a class="btn sm" href="#routine">Set my routine</a></div>';
    if (!s.profile.fmOptions) html += '<div class="note row-note"><p><b>Further Maths options aren’t in the plan yet.</b></p><a class="btn alt sm" href="#preferences">Choose options</a></div>';
    if (target > planned + 60) html += '<p class="muted small">Your targets add up to ' + U.dur(target) + ' this week; ' + U.dur(planned) + ' fits around school, activities and the free time you asked for. <a href="#routine">Adjust your routine</a></p>';

    // Desktop grid
    const hgt = (h1 - h0) * 60 * PPM;
    const pos = (a, b) => 'top:' + Math.max(0, (a - h0 * 60) * PPM).toFixed(1) + 'px;height:' + Math.max(8, (Math.min(b, h1 * 60) - Math.max(a, h0 * 60)) * PPM - 2).toFixed(1) + 'px';
    html += '<section class="card wk-card"><div class="wk" style="--wk-h:' + hgt + 'px"><div class="wk-head"><span></span>' + days.map(function (d, i) {
      const t = tls[i];
      return '<div class="wk-day' + (d === today ? ' today' : '') + '"><span class="label">' + U.DAYS[i] + '</span><b class="num">' + U.parse(d).getDate() + '</b><span class="muted small num">' + U.dur(s.plan.sessions.filter((x) => x.d === d).reduce((a, x) => a + x.m, 0)) + '</span>' + (t.info.hol ? '<span class="chip info">' + esc(t.info.hol.name.split(' ')[0]) + '</span>' : '') + '</div>';
    }).join('') + '</div><div class="wk-body"><div class="wk-hours">';
    for (let h = h0; h < h1; h++) html += '<span style="top:' + ((h - h0) * 60 * PPM) + 'px">' + String(h).padStart(2, '0') + ':00</span>';
    html += '</div>' + days.map(function (d, i) {
      const t = tls[i];
      let col = '<div class="wk-col' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '">';
      col += '<span class="wb kind-sleep" style="' + pos(h0 * 60, t.info.wake) + '"></span><span class="wb kind-sleep" style="' + pos(t.info.bed, h1 * 60 + 60) + '"></span>';
      t.items.forEach(function (it) {
        if (it.type === 'block' && (it.kind === 'morning' || it.kind === 'winddown')) return;
        const tall = (it.end - it.start) * PPM >= 30;
        if (it.type === 'session') {
          const x = it.sess;
          col += '<button type="button" class="wb kind-study' + (x.done ? ' done' : '') + '" data-subj="' + x.s + '" style="' + pos(it.start, it.end) + '" data-action="sess-open" data-id="' + x.id + '" title="' + esc(U.hm(it.start) + ' ' + V.sessTitle(x)) + '"><b>' + esc(V.sessTitle(x).replace(/^[\d.]+ /, '')) + '</b>' + (tall ? '<span class="num">' + U.hm(it.start) + ' · ' + esc(RH.KIND[x.k].label.split(' ')[0]) + '</span>' : '') + '</button>';
        } else {
          col += '<span class="wb kind-' + it.kind + '"' + (it.subj ? ' data-subj="' + it.subj + '"' : '') + ' style="' + pos(it.start, it.end) + '" title="' + esc(U.hm(it.start) + '–' + U.hm(it.end) + ' ' + (it.label || 'Free time')) + '">' + (tall && it.kind !== 'travel' && it.kind !== 'rest' ? '<b>' + esc(it.type === 'free' ? 'Free' : it.label) + '</b>' : '') + '</span>';
        }
      });
      exams.filter((e) => e.date === d && !e.time).forEach((e) => { col += '<span class="wb kind-exam" style="top:0;height:20px" data-subj="' + e.subject + '"><b>' + esc(e.code) + '</b></span>'; });
      return col + '</div>';
    }).join('') + '</div></div>' +
      '<div class="wk-legend small">' + [['study', 'Revision'], ['school', 'School'], ['activity', 'Activities'], ['meal', 'Meals'], ['exam', 'Exams'], ['free', 'Free time'], ['sleep', 'Asleep']].map((k) => '<span><i class="lgd kind-' + k[0] + '"></i>' + k[1] + '</span>').join('') + '</div></section>';

    // Phone: one day at a time
    const sel = RH.ui.day && RH.ui.day >= ws && RH.ui.day <= days[6] ? RH.ui.day : (today >= ws && today <= days[6] ? today : ws);
    html += '<section class="card wk-phone"><div class="day-chips">' + days.map((d, i) => '<button type="button" class="day-chip' + (d === sel ? ' on' : '') + (d === today ? ' today' : '') + '" data-action="plan-day" data-v="' + d + '"><span>' + U.DAYS[i].slice(0, 1) + '</span><b class="num">' + U.parse(d).getDate() + '</b></button>').join('') + '</div>' +
      '<h2>' + esc(U.fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2>' + V.timeline(sel) + '</section>';

    html += '<section class="card"><div class="card-head"><h2>Add to your calendar</h2></div><p class="muted small">Exports your exams and every revision session with its time.</p><div class="row-actions"><button type="button" class="btn alt sm" data-action="export-ics">' + C.icon('download') + '.ics for Apple or Outlook</button><button type="button" class="btn alt sm" data-action="export-csv">' + C.icon('download') + '.csv for Google Calendar</button></div></section>';
    return html;
  };

  // ---------- Routine ----------
  const hrs = (m) => Math.round((Number(m) || 0) / 15) / 4;
  V.routine = function () {
    const s = st(), r = s.routine, S = s.plan.settings;
    const ws = U.weekStart(U.today());
    const tot = R.weekTotals(s, ws);
    const pd = RH.ui.rday != null ? RH.ui.rday : U.dow(U.today());
    let html = C.subnav('plan', 'routine');
    html += C.page({ eyebrow: 'Plan', title: 'Your routine', lede: 'Tell the planner when you’re at school, asleep and busy, how much you want to revise and how much free time to protect. Every session then gets a real time slot.',
      actions: '<button type="button" class="btn" data-action="routine-save">' + C.icon('rebuild') + 'Save and rebuild plan</button>' });

    // Weekly balance
    const parts = [['sleep', 'Sleep', tot.sleep], ['school', 'School & travel', tot.school], ['activity', 'Activities & meals', tot.activity], ['study', 'Revision', tot.study], ['free', 'Free time', tot.free]];
    const all = 7 * 1440;
    html += '<section class="card"><div class="card-head"><h2>Your week at a glance</h2><span class="muted small">Revision target ' + U.dur(tot.target) + ', ' + U.dur(tot.study) + ' fits</span></div>' +
      '<div class="balance" role="img" aria-label="How your week is split">' + parts.map((p) => '<span class="kind-' + p[0] + '" style="flex-grow:' + Math.max(1, p[2]) + '" title="' + p[1] + ' ' + U.dur(p[2]) + '"></span>').join('') + '<span class="kind-other" style="flex-grow:' + Math.max(0, all - parts.reduce((a, p) => a + p[2], 0)) + '"></span></div>' +
      '<ul class="balance-key">' + parts.map((p) => '<li><i class="lgd kind-' + p[0] + '"></i><span>' + p[1] + '</span><b class="num">' + U.dur(p[2]) + '</b></li>').join('') + '</ul>' +
      (tot.short.length ? '<div class="note small"><b>Not everything fits.</b> ' + tot.short.map((x) => esc(DAYNAMES[U.dow(x.d)]) + ': ' + U.dur(x.cap) + ' of ' + U.dur(x.target) + (x.freeTotal - x.freeWant < x.target ? ' (only ' + U.dur(Math.max(0, x.freeTotal)) + ' free, and you want ' + U.dur(x.freeWant) + ' of it kept free)' : '')).join('; ') + '.</div>' : '') + '</section>';

    // The days, in three groups: Monday to Thursday, Friday, the weekend.
    // One column per group (Monday to Thursday, Friday, the weekend), or per day when a group is split.
    const cols = [];
    R.GROUPS.forEach(function (g) {
      const ix = g[2], split = ix.length > 1 && r.split && r.split[g[0]];
      if (split) ix.forEach((i) => cols.push([String(i), DAYNAMES[i]]));
      else cols.push([ix.join(','), ix.length === 1 ? DAYNAMES[ix[0]] : U.DAYS[ix[0]] + '–' + U.DAYS[ix[ix.length - 1]]]);
    });
    const val = (c, f) => r.days[Number(c[0].split(',')[0])][f];
    const row = function (f, label, kind, opt) {
      const needSchool = ['start', 'end', 'travelTo', 'travelBack', 'afterSchool'].indexOf(f) !== -1;
      return '<tr><th scope="row">' + label + (opt ? ' <span class="opt-t">optional</span>' : '') + '</th>' + cols.map(function (c) {
        if (needSchool && !val(c, 'school')) return '<td class="muted">—</td>';
        const v = val(c, f);
        const at = ' data-rday="' + c[0] + '" data-f="' + f + '" aria-label="' + esc(label + ', ' + c[1]) + '"';
        let input;
        if (kind === 'toggle') input = '<label class="mini-toggle"><input type="checkbox"' + at + (v ? ' checked' : '') + '><span></span></label>';
        else if (kind === 'time') input = '<span class="t-cell"><input type="time"' + at + ' value="' + esc(v || '') + '">' + (opt && v ? '<button type="button" class="clear-x" data-action="r-clear" data-rday="' + c[0] + '" data-f="' + f + '" aria-label="Clear ' + esc(label + ', ' + c[1]) + '">' + C.icon('x') + '</button>' : '') + '</span>';
        else if (kind === 'hours') input = '<span class="u-cell"><input type="number" min="0" max="16" step="0.25" inputmode="decimal" placeholder="0"' + at + ' value="' + (v === '' || v == null ? '' : hrs(v)) + '"><span class="unit">h</span></span>';
        else input = '<span class="u-cell"><input type="number" min="0" max="300" step="5" inputmode="numeric" placeholder="none" data-kind="mins"' + at + ' value="' + (v === '' || v == null ? '' : esc(v)) + '"><span class="unit">min</span></span>';
        return '<td>' + input + '</td>';
      }).join('') + '</tr>';
    };
    const sub = (t) => '<tr class="rg-sub"><th colspan="' + (cols.length + 1) + '">' + t + '</th></tr>';
    const fits = '<tr class="rg-fit"><th scope="row">Revision that fits</th>' + cols.map(function (c) {
      const info = R.day(s, U.addDays(ws, Number(c[0].split(',')[0])));
      return '<td class="' + (info.short ? 'warn-t' : 'ok-t') + '">' + U.dur(info.cap) + (info.short ? ' of ' + U.dur(info.target) : '') + '</td>';
    }).join('') + '</tr>';
    html += '<section class="card rg"><div class="card-head"><h2>Each day</h2><div class="rg-splits">' +
      C.toggle('data-action="r-split" data-g="wk"', 'Set Monday–Thursday one day at a time', r.split && r.split.wk) + C.toggle('data-action="r-split" data-g="we"', 'Set Saturday and Sunday separately', r.split && r.split.we) + '</div></div>' +
      '<p class="help">Leave a box empty if it doesn’t apply: no travel, no break, no limit. “Free time” is time kept for yourself; the planner never books revision into it.</p>' +
      '<div class="table-wrap"><table class="tbl rg-tbl"><thead><tr><th></th>' + cols.map((c) => '<th scope="col">' + c[1] + '</th>').join('') + '</tr></thead><tbody>' +
      sub('School') + row('school', 'School', 'toggle') + row('start', 'Starts', 'time') + row('end', 'Ends', 'time') +
      row('travelTo', 'Travel there', 'mins', true) + row('travelBack', 'Travel home', 'mins', true) + row('afterSchool', 'Break after school', 'mins', true) +
      sub('Sleep') + row('wake', 'Wake up', 'time') + row('prep', 'Getting ready', 'mins', true) + row('bed', 'Bedtime', 'time') + row('windDown', 'Wind down before bed', 'mins', true) +
      sub('Revision') + row('study', 'Hours of revision', 'hours') + row('free', 'Hours of free time', 'hours', true) + row('earliest', 'Earliest start', 'time', true) + row('latest', 'Latest finish', 'time', true) +
      fits + '</tbody></table></div></section>';

    // Sessions
    const num = (k, label, help, min, max, step) => '<label class="field"><span>' + label + '</span><input type="number" min="' + min + '" max="' + max + '" step="' + (step || 5) + '" data-rset="' + k + '" value="' + esc(r[k]) + '">' + (help ? '<span class="help">' + help + '</span>' : '') + '</label>';
    html += '<section class="card"><div class="card-head"><h2>Sessions</h2></div><div class="form-grid">' +
      '<label class="field"><span>Session length</span><select data-set="sessionLen" data-num="1">' + C.opts([[25, '25 min'], [30, '30 min'], [45, '45 min'], [60, '60 min'], [90, '90 min']], S.sessionLen) + '</select></label>' +
      '<label class="field"><span>Break between</span><select data-set="breakLen" data-num="1">' + C.opts([[5, '5 min'], [10, '10 min'], [15, '15 min']], S.breakLen) + '</select></label>' +
      num('stretch', 'Longest stretch (min)', 'Then a longer break.', 30, 300, 15) + num('longBreak', 'Longer break (min)', '', 10, 60) + '</div>' +
      '<div class="field"><span>When to revise in your free time</span>' + C.seg([['early', 'As early as possible'], ['late', 'As late as possible']], r.prefer, 'data-action="r-prefer"') + '</div></section>';

    // Activities
    html += '<section class="card"><div class="card-head"><h2>Regular commitments</h2><button type="button" class="btn alt sm" data-action="ract-add">' + C.icon('plus') + 'Add</button></div><p class="muted small">Clubs, sport, a job, lessons, family time, meals. The planner works around them.</p>' +
      (r.activities.length ? '<div class="act-list">' + r.activities.map((a) => '<div class="act">' +
        '<input class="act-name" data-ract="' + a.id + '" data-f="name" value="' + esc(a.name) + '" aria-label="Name">' +
        '<select data-ract="' + a.id + '" data-f="kind" aria-label="Kind">' + C.opts(Object.keys(RH.ACTIVITY_KINDS).map((k) => [k, RH.ACTIVITY_KINDS[k]]), a.kind) + '</select>' +
        '<div class="daypick" role="group" aria-label="Days">' + U.DAYS.map((d, i) => '<button type="button" class="' + ((a.days || []).indexOf(i) !== -1 ? 'on' : '') + '" data-action="ract-day" data-id="' + a.id + '" data-v="' + i + '" aria-pressed="' + ((a.days || []).indexOf(i) !== -1) + '">' + d.slice(0, 2) + '</button>').join('') + '</div>' +
        '<span class="act-time"><input type="time" data-ract="' + a.id + '" data-f="start" value="' + esc(a.start) + '" aria-label="Starts"><span class="muted">–</span><input type="time" data-ract="' + a.id + '" data-f="end" value="' + esc(a.end) + '" aria-label="Ends"></span>' +
        '<label class="mini-check"><input type="checkbox" data-ract="' + a.id + '" data-f="term"' + (a.term ? ' checked' : '') + '>Term time only</label>' +
        '<button type="button" class="icon-btn" data-action="ract-del" data-id="' + a.id + '" aria-label="Remove ' + esc(a.name) + '">' + C.icon('trash') + '</button></div>').join('') + '</div>' : '<p class="muted">Nothing yet.</p>') + '</section>';

    // One-off events
    html += '<section class="card"><div class="card-head"><h2>One-off plans</h2><button type="button" class="btn alt sm" data-action="rev-add">' + C.icon('plus') + 'Add</button></div><p class="muted small">A party, an appointment, a trip. Busy for the time you set.</p>' +
      (r.events.length ? '<div class="act-list">' + r.events.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => '<div class="act">' +
        '<input class="act-name" data-rev="' + e.id + '" data-f="name" value="' + esc(e.name) + '" aria-label="Name"><input type="date" data-rev="' + e.id + '" data-f="date" value="' + esc(e.date) + '" aria-label="Date">' +
        '<span class="act-time"><input type="time" data-rev="' + e.id + '" data-f="start" value="' + esc(e.start) + '" aria-label="Starts"><span class="muted">–</span><input type="time" data-rev="' + e.id + '" data-f="end" value="' + esc(e.end) + '" aria-label="Ends"></span>' +
        '<button type="button" class="icon-btn" data-action="rev-del" data-id="' + e.id + '" aria-label="Remove ' + esc(e.name) + '">' + C.icon('trash') + '</button></div>').join('') + '</div>' : '<p class="muted">Nothing planned.</p>') + '</section>';

    // Holidays
    html += '<section class="card"><div class="card-head"><h2>Holidays and study leave</h2><button type="button" class="btn alt sm" data-action="hol-add">' + C.icon('plus') + 'Add</button></div><p class="muted small">No school on these days. These are typical dates; edit them to match your school.</p>' +
      '<div class="form-grid narrow"><label class="field"><span>Holiday wake-up</span><input type="time" data-rhol="wake" value="' + esc(r.holiday.wake) + '"></label><label class="field"><span>Holiday bedtime</span><input type="time" data-rhol="bed" value="' + esc(r.holiday.bed) + '"></label></div>' +
      '<div class="act-list">' + (S.holidays || []).map((h) => '<div class="act">' +
        '<input class="act-name" data-hol="' + h.id + '" data-f="name" value="' + esc(h.name) + '" aria-label="Name">' +
        '<span class="act-time"><input type="date" data-hol="' + h.id + '" data-f="from" value="' + esc(h.from) + '" aria-label="From"><span class="muted">–</span><input type="date" data-hol="' + h.id + '" data-f="to" value="' + esc(h.to) + '" aria-label="To"></span>' +
        '<label class="mini-field">Revise <input type="number" min="0" max="14" step="0.5" data-hol="' + h.id + '" data-f="mins" value="' + hrs(h.mins) + '" aria-label="Hours of revision a day">h</label>' +
        '<label class="mini-field">Free <input type="number" min="0" max="14" step="0.5" data-hol="' + h.id + '" data-f="free" value="' + hrs(h.free != null ? h.free : r.holiday.free) + '" aria-label="Hours of free time a day">h</label>' +
        '<button type="button" class="icon-btn" data-action="hol-del" data-id="' + h.id + '" aria-label="Remove ' + esc(h.name) + '">' + C.icon('trash') + '</button></div>').join('') + '</div></section>';

    // Preview a day
    html += '<section class="card"><div class="card-head"><h2>Preview a day</h2></div>' + C.seg(U.DAYS.map((d, i) => [i, d]), pd, 'data-action="r-day"') + V.timeline(U.addDays(ws, pd)) + '</section>';
    html += '<div class="row-actions"><button type="button" class="btn lg" data-action="routine-save">' + C.icon('rebuild') + 'Save and rebuild plan</button></div>';
    return html;
  };

  // ---------- Exams ----------
  V.exams = function () {
    const s = st(), today = U.today();
    let html = C.subnav('plan', 'exams') + C.page({ eyebrow: 'Plan', title: 'Exams and tests', lede: 'Official dates from the <a href="' + RH.EXAM_SOURCE.url + '" target="_blank" rel="noopener">Pearson Edexcel Summer 2027 final timetable</a>. Morning papers start at 9:00, afternoon papers at 1:30pm. Check with your exams officer.' });
    if (!s.profile.fmOptions) html += V.fmOptionsCard();
    let month = '';
    html += '<div class="exam-list">';
    M.officialFor(s).forEach(function (o) {
      const sub = M.subject[o.subject], p = sub.paper[o.paper], on = !s.exams.off[o.id];
      const m = U.fmt(o.date, { month: 'long', year: 'numeric' });
      if (m !== month) { html += '<h2 class="group-h">' + esc(m) + '</h2>'; month = m; }
      const topics = M.paperTopics(s, sub, o.paper), past = o.date < today;
      html += '<article class="card exam' + (on ? '' : ' off') + (past ? ' past' : '') + '" data-subj="' + o.subject + '"><div class="exam-date"><b class="num">' + U.parse(o.date).getDate() + '</b><span>' + esc(U.fmt(o.date, { weekday: 'short' })) + '</span></div>' +
        '<div class="exam-main"><p class="small">' + C.stag(o.subject) + '<span class="num">' + esc(p.code) + '</span> · ' + (o.session === 'AM' ? 'Morning, 9:00' : 'Afternoon, 1:30') + ' · ' + U.mins(p.dur) + ' · ' + p.marks + ' marks</p><h3>' + esc(sub.name) + ' ' + esc(p.name) + '</h3><p class="muted small">' + esc(p.what) + '</p>' +
        '<div class="exam-ready"><span class="small muted">Readiness ' + U.pct(M.readiness(s, topics)) + ' · ' + U.plural(topics.length, 'sub-topic') + '</span>' + C.stack(M.ragCounts(s, topics), p.code) + '</div></div>' +
        '<div class="exam-side">' + (past ? '<span class="muted small">Sat</span>' : C.countdownChip(o.date)) + C.toggle('data-action="exam-toggle" data-id="' + o.id + '"', 'Sitting', on) + '</div></article>';
    });
    html += '</div><section class="card"><div class="card-head"><h2>Mocks and class tests</h2></div>' +
      (s.exams.custom.length ? '<ul class="list">' + s.exams.custom.slice().sort((a, b) => a.date.localeCompare(b.date)).map(function (c) {
        const sub = M.subject[c.subject];
        const comps = c.comps && c.comps.length ? c.comps.map((id) => (sub.comps.find((x) => x.id === id) || {}).name).filter(Boolean).join(', ') : 'Whole subject';
        return '<li class="row" data-subj="' + c.subject + '">' + C.stag(c.subject) + '<span class="row-main"><b>' + esc(c.name) + '</b><span class="muted small">' + esc(U.fmt(c.date)) + (c.time ? ' · ' + esc(c.time) : '') + ' · ' + U.mins(c.dur || 60) + ' · ' + esc(comps) + '</span></span>' + (c.date >= today ? C.countdownChip(c.date) : '<span class="muted small">Done</span>') +
          '<button type="button" class="icon-btn" data-action="test-del" data-id="' + c.id + '" aria-label="Delete ' + esc(c.name) + '">' + C.icon('trash') + '</button></li>';
      }).join('') + '</ul>' : '<p class="muted">No mocks or tests yet. Add them so the plan revises the right sections before each one.</p>') +
      '<form id="testForm" class="stack-form"><div class="form-grid"><label class="field"><span>Name</span><input id="t-name" name="name" required placeholder="e.g. Physics mock, Paper 1"></label>' +
      '<label class="field"><span>Subject</span><select id="t-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (RH.ui.testSubj === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Date</span><input id="t-date" name="date" type="date" required min="' + today + '"></label><label class="field"><span>Start time</span><input id="t-time" name="time" type="time" value="09:00"></label>' +
      '<label class="field"><span>Minutes</span><input id="t-dur" name="dur" type="number" min="10" max="300" step="5" value="60"></label></div>' +
      '<fieldset class="field"><legend>Sections it covers <span class="muted small">(none ticked = whole subject)</span></legend><div class="picks" id="t-comps">' + V.compPicks(RH.ui.testSubj || 'physics') + '</div></fieldset>' +
      '<div class="row-actions"><button type="submit" class="btn">' + C.icon('plus') + 'Add test</button></div></form></section>';
    return html;
  };

  // ---------- Strategy ----------
  V.strategy = function () {
    const S = st().plan.settings;
    const range = (key, label, help, min, max, step) => '<div class="field"><label for="f-' + key + '" class="range-l"><span>' + label + '</span><output class="num" id="o-' + key + '">' + S[key] + '</output></label>' +
      '<input type="range" id="f-' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '" data-set="' + key + '" data-num="1">' + (help ? '<p class="help">' + help + '</p>' : '') + '</div>';
    const tg = (key, label, help) => C.toggle('id="f-' + key + '" data-set="' + key + '"', label, S[key], help);
    let html = C.subnav('plan', 'strategy') + C.page({ eyebrow: 'Plan', title: 'Strategy', lede: 'How the planner chooses what to revise. Your hours and free time are set in <a href="#routine">Routine</a>.', actions: '<button type="button" class="btn" data-action="plan-build">' + C.icon('rebuild') + 'Rebuild plan</button>' });
    html += V.staleBanner();
    html += '<section class="card"><div class="card-head"><h2>Pick a strategy</h2></div><div class="presets">' + Object.keys(RH.PRESETS).map((k) => { const p = RH.PRESETS[k]; return '<button type="button" class="preset' + (S.preset === k ? ' on' : '') + '" data-action="preset" data-v="' + k + '" aria-pressed="' + (S.preset === k) + '"><b>' + p.label + '</b><span>' + p.note + '</span></button>'; }).join('') + '</div></section>';
    html += '<div class="grid-2"><section class="card"><div class="card-head"><h2>What matters most</h2></div>' + range('wWeak', 'Weak topics', 'Red and not-started topics first.', 0, 3, 0.25) + range('wUrg', 'Exam urgency', 'Topics in sooner papers first.', 0, 3, 0.25) + range('wCov', 'Cover untouched topics', 'Reach every topic at least once.', 0, 3, 0.25) + range('ppWeeks', 'Past papers: weeks before each exam', 'Timed papers start this many weeks out. 0 turns them off.', 0, 12, 1) + '</section>' +
      '<section class="card"><div class="card-head"><h2>Share of time</h2></div>' + M.subjects.map((sub) => '<div class="field inline" data-subj="' + sub.id + '"><label for="f-subj-' + sub.id + '">' + C.stag(sub.id) + esc(sub.name) + '</label><input type="range" min="0" max="3" step="0.5" id="f-subj-' + sub.id + '" data-subjw="' + sub.id + '" value="' + (S.subj[sub.id] == null ? 1 : S.subj[sub.id]) + '"><output class="num" id="o-subj-' + sub.id + '">' + (S.subj[sub.id] == null ? 1 : S.subj[sub.id]) + '×</output></div>').join('') + '<p class="help">1× is an equal share. 0 leaves a subject out.</p>' +
      '<div class="field"><label for="f-examDay">On exam days</label><select id="f-examDay" data-set="examDay">' + C.opts([['light', 'Half the usual revision'], ['normal', 'Normal'], ['off', 'No revision']], S.examDay) + '</select></div>' +
      '<div class="form-grid"><label class="field"><span>Plan from</span><input type="date" data-set="start" value="' + esc(S.start) + '"></label><label class="field"><span>Plan until</span><input type="date" data-set="end" value="' + esc(S.end) + '"></label></div><p class="help">Leave blank to plan from today to your last exam.</p></section></div>';
    html += '<section class="card"><div class="card-head"><h2>Rules</h2></div><div class="toggles">' + tg('spacing', 'Spaced repetition', 'Bring topics back after 2, 5, 10, 21 and 35 days.') + tg('interleave', 'Mix subjects within a day', 'Off gives each day one main subject.') + tg('eveReview', 'Exam-eve review', 'The day before a paper is a light review of it.') + tg('skipUntaught', 'Skip topics not taught yet', 'Leave out topics you’ve flagged.') + tg('focusNext', 'Only my next exam or test', 'Every session goes to the next paper.') + '</div></section>';
    html += '<details class="card fold"><summary><h2>How the planner decides</h2></summary><dl class="fold-body defs">' + RH.GUIDE.planner.map((p) => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl></details>';
    return html;
  };

  // ---------- Routine events ----------
  const touch = (s) => { s.plan.settingsAt = Date.now(); s.routine.setupAt = s.routine.setupAt || Date.now(); };
  const toMins = (v) => Math.round(U.clamp(Number(v) || 0, 0, 16) * 60);
  RH.onChange.push(function (el) {
    const d = el.dataset;
    if (d.rday != null) {
      const f = d.f, empty = el.value === '';
      if (empty && (f === 'wake' || f === 'bed' || f === 'start' || f === 'end')) { RH.render({ keepScroll: true }); return true; }
      const v = f === 'school' ? el.checked : empty ? '' : (f === 'study' || f === 'free') ? toMins(el.value) : d.kind === 'mins' ? U.clamp(Math.round(Number(el.value) || 0), 0, 600) : el.value;
      store.update(function (s) { String(d.rday).split(',').forEach((i) => { s.routine.days[Number(i)][f] = v; }); touch(s); });
      return true;
    }
    if (d.rset) { store.update(function (s) { s.routine[d.rset] = el.type === 'time' ? el.value : U.clamp(Number(el.value) || 0, 0, 600); touch(s); }); return true; }
    if (d.rhol) { store.update(function (s) { s.routine.holiday[d.rhol] = el.value; touch(s); }); return true; }
    if (d.ract) { store.update(function (s) { const a = s.routine.activities.find((x) => x.id === d.ract); if (a) a[d.f] = el.type === 'checkbox' ? el.checked : el.value; touch(s); }); return true; }
    if (d.rev) { store.update(function (s) { const e = s.routine.events.find((x) => x.id === d.rev); if (e) e[d.f] = el.value; touch(s); }); return true; }
    if (d.hol && d.f === 'free') { store.update(function (s) { const h = s.plan.settings.holidays.find((x) => x.id === d.hol); if (h) h.free = toMins(el.value); touch(s); }); return true; }
    return false;
  });
  const A = RH.actions;
  A['r-clear'] = (el) => store.update(function (s) { String(el.dataset.rday).split(',').forEach((i) => { s.routine.days[Number(i)][el.dataset.f] = ''; }); touch(s); });
  // Set a group's days one by one, or make them all match the first day again.
  A['r-split'] = function (el) {
    const g = R.GROUPS.find((x) => x[0] === el.dataset.g), on = el.checked;
    store.update(function (s) {
      s.routine.split = s.routine.split || {};
      s.routine.split[g[0]] = on;
      if (!on) g[2].slice(1).forEach((i) => { R.FIELDS.forEach((k) => { s.routine.days[i][k] = s.routine.days[g[2][0]][k]; }); });
      touch(s);
    });
    if (!on) C.toast('All of ' + g[1] + ' now match ' + DAYNAMES[g[2][0]]);
  };
  A['r-prefer'] = (el) => store.update(function (s) { s.routine.prefer = el.dataset.v; touch(s); });
  A['r-day'] = (el) => { RH.ui.rday = Number(el.dataset.v); RH.render({ keepScroll: true }); };
  A['ract-add'] = () => store.update(function (s) { s.routine.activities.push({ id: 'a' + U.uid(), name: 'New activity', kind: 'club', days: [U.dow(U.today())], start: '17:00', end: '18:00', term: false }); touch(s); });
  A['ract-del'] = (el) => store.update(function (s) { s.routine.activities = s.routine.activities.filter((x) => x.id !== el.dataset.id); touch(s); });
  A['ract-day'] = (el) => store.update(function (s) { const a = s.routine.activities.find((x) => x.id === el.dataset.id); const v = Number(el.dataset.v); const i = a.days.indexOf(v); if (i === -1) a.days.push(v); else a.days.splice(i, 1); touch(s); });
  A['rev-add'] = () => store.update(function (s) { s.routine.events.push({ id: 'e' + U.uid(), name: 'Busy', date: U.today(), start: '18:00', end: '21:00' }); touch(s); });
  A['rev-del'] = (el) => store.update(function (s) { s.routine.events = s.routine.events.filter((x) => x.id !== el.dataset.id); touch(s); });
  A['routine-save'] = () => { store.update(function (s) { touch(s); }, { silent: true }); A['plan-build'](); location.hash = 'plan'; };
  A['plan-day'] = (el) => { RH.ui.day = el.dataset.v; RH.render({ keepScroll: true }); };
})(window.RH = window.RH || {});
