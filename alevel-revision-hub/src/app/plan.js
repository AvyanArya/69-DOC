/* Plan: the week on a clock, your routine (school, sleep, activities, free time), exams and strategy. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, R = RH.routine;
  const st = () => RH.store.state;
  const store = RH.store;
  const V = RH.views;
  const DAYNAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ---------- The planner: a day agenda by default, or the whole week as columns ----------
  const BLOCK_IC = { school: 'book', activity: 'flame', meal: 'sun', travel: 'right', rest: 'pause', sleep: 'moon', exam: 'flag' };
  function agenda(s, d) {
    const tl = R.timeline(s, d), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes(), isToday = d === U.today();
    let html = '<ol class="ag">', marked = false;
    tl.items.forEach(function (it) {
      if (it.type === 'block' && (it.kind === 'morning' || it.kind === 'winddown' || it.kind === 'travel' || it.kind === 'rest')) return;
      if (isToday && !marked && it.start > nowM) { html += '<li class="ag-now"><span class="num">' + U.hm(nowM) + '</span></li>'; marked = true; }
      const past = isToday && it.end <= nowM;
      if (it.type === 'session') {
        const x = it.sess, sub = M.subject[x.s], t = x.t && M.topic[x.t];
        html += '<li class="ag-card' + (x.done ? ' done' : '') + (past && !x.done ? ' late' : '') + '" style="--c:' + (sub ? C.scol(sub) : 'var(--primary)') + '"><span class="ag-t num"><b>' + U.hm(it.start) + '</b>' + U.hm(it.end) + '</span>' +
          '<div class="ag-body"><button type="button" class="ag-title" data-action="sess-open" data-id="' + x.id + '">' + esc(V.sessTitle(x)) + '</button><span class="ag-meta"><i class="ag-dot"></i>' + esc(sub ? sub.name : '') + ' · ' + esc(RH.KIND[x.k].label) + ' · ' + U.mins(x.m) + (t ? '<span class="ag-ch"> · ' + esc(M.title(t.comp.name)) + '</span>' : '') + '</span></div>' +
          '<div class="ag-act">' + (x.done ? '' : '<button type="button" class="icon-btn" data-action="timer-open" data-id="' + x.id + '" aria-label="Start a timer">' + C.icon('timer') + '</button>') + '<button type="button" class="check-b' + (x.done ? ' on' : '') + '" data-action="sess-done" data-id="' + x.id + '" aria-pressed="' + !!x.done + '" aria-label="' + (x.done ? 'Done' : 'Mark done') + '">' + C.icon('tick') + '</button></div></li>';
      } else if (it.type === 'free') {
        if (it.end - it.start >= 20) html += '<li class="ag-free' + (past ? ' past' : '') + '"><span class="ag-t num">' + U.hm(it.start) + '</span><span>Free time · ' + U.dur(it.end - it.start) + '</span></li>';
      } else {
        html += '<li class="ag-block kind-' + it.kind + (past ? ' past' : '') + '"><span class="ag-t num">' + U.hm(it.start) + '</span><span class="ag-bi">' + C.icon(BLOCK_IC[it.kind] || 'dot') + '</span><span><b>' + esc(it.label || '') + '</b> <span class="muted">until ' + U.hm(it.end) + '</span></span></li>';
      }
    });
    if (isToday && !marked) html += '<li class="ag-now"><span class="num">' + U.hm(nowM) + '</span></li>';
    html += '</ol>';
    if (tl.unplaced.length) html += '<p class="note small">' + U.plural(tl.unplaced.length, 'session') + ' didn’t fit into this day: ' + tl.unplaced.map((x) => esc(V.sessTitle(x))).join(', ') + '. Rebuild the plan, or free up time in My schedule.</p>';
    if (!tl.items.some((i) => i.type === 'session') && !tl.unplaced.length) html = '<div class="ag-empty">' + C.icon('sun') + '<div><b>No revision planned.</b><p class="muted">A day off. Rest counts too.</p></div></div>' + html;
    return html;
  }

  V.plan = function () {
    const s = st(), today = U.today();
    const ws = RH.ui.week || U.weekStart(today);
    const days = []; for (let i = 0; i < 7; i++) days.push(U.addDays(ws, i));
    const mode = RH.ui.planMode || 'day';
    const sel = RH.ui.day && RH.ui.day >= ws && RH.ui.day <= days[6] ? RH.ui.day : (today >= ws && today <= days[6] ? today : ws);
    const sess = s.plan.sessions.filter((x) => x.d >= ws && x.d <= days[6]);
    const planned = sess.reduce((a, x) => a + x.m, 0), doneM = sess.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const exams = M.exams(s), tests = s.exams.custom || [];
    const daySess = s.plan.sessions.filter((x) => x.d === sel), dayM = daySess.reduce((a, x) => a + x.m, 0), dayDone = daySess.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
    const title = mode === 'week' ? (ws === U.weekStart(today) ? 'This week' : 'Week of ' + U.fmtShort(ws)) : sel === today ? 'Today' : sel === U.addDays(today, 1) ? 'Tomorrow' : U.fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' });
    const meta = mode === 'week' ? U.dur(planned) + ' of revision · ' + U.dur(doneM) + ' done' : (dayM ? U.dur(dayM) + ' of revision' + (dayDone ? ' · ' + U.dur(dayDone) + ' done' : '') : 'Nothing planned') + (sel === today ? '' : ' · ' + U.fmt(sel, { weekday: 'long' }));
    let html = C.subnav('plan', 'plan');
    html += '<header class="pl-head"><div><p class="kicker">Planner</p><h1>' + esc(title) + '</h1><p class="meta">' + meta + '</p></div><div class="pl-tools">' +
      C.seg([['day', 'Day'], ['week', 'Week']], mode, 'data-action="plan-mode"') +
      '<a class="btn" href="#exams">' + C.icon('flag') + 'Revise for a test</a>' +
      '<a class="icon-btn pl-ib" href="#routine" title="Edit my schedule" aria-label="Edit my schedule">' + C.icon('pen') + '</a>' +
      '<button type="button" class="icon-btn pl-ib" data-action="plan-build" title="Rebuild the plan" aria-label="Rebuild the plan">' + C.icon('rebuild') + '</button></div></header>';

    // The week strip: a pill per day with how full it is.
    if (mode === 'week') html += '<nav class="pl-strip wk-only" aria-label="Weeks"><button type="button" class="icon-btn" data-action="week-prev" aria-label="Previous week">' + C.icon('left') + '</button><b>' + esc(U.fmtShort(ws)) + ' – ' + esc(U.fmtShort(days[6])) + '</b><button type="button" class="icon-btn" data-action="week-next" aria-label="Next week">' + C.icon('right') + '</button></nav>';
    else html += '<nav class="pl-strip" aria-label="Days"><button type="button" class="icon-btn" data-action="week-prev" aria-label="Previous week">' + C.icon('left') + '</button><div class="pl-days">' + days.map(function (d, i) {
      const ds = s.plan.sessions.filter((x) => x.d === d), m = ds.reduce((a, x) => a + x.m, 0), dn = ds.filter((x) => x.done).reduce((a, x) => a + x.m, 0);
      const cap = Math.max(60, R.day(s, d).target || 120), ex = exams.some((e) => e.date === d) || tests.some((t) => t.date === d);
      return '<button type="button" class="pl-day' + (d === sel && mode === 'day' ? ' on' : '') + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '" data-action="plan-day" data-v="' + d + '" aria-pressed="' + (d === sel) + '"><span class="pd-w">' + U.DAYS[i].slice(0, 3) + '</span><b class="num">' + U.parse(d).getDate() + '</b>' +
        '<span class="pd-load" title="' + U.dur(m) + '"><i style="width:' + Math.min(100, Math.round(100 * m / cap)) + '%"></i><i class="dn" style="width:' + Math.min(100, Math.round(100 * dn / cap)) + '%"></i></span>' + (ex ? '<span class="pd-ex" title="Exam or test">' + C.icon('flag') + '</span>' : '') + '</button>';
    }).join('') + '</div><button type="button" class="icon-btn" data-action="week-next" aria-label="Next week">' + C.icon('right') + '</button></nav>';
    if (ws !== U.weekStart(today)) html += '<p class="center"><button type="button" class="btn ghost sm" data-action="week-today">Back to this week</button></p>';

    const notes = [];
    if (!s.routine.setupAt) notes.push('<b>This plan uses a sample week.</b> <a href="#routine">Put in your real week</a> so the times fit.');
    if (!s.profile.fmOptions && M.isMine(M.subject.further)) notes.push('Further Maths options aren’t in the plan yet. <a href="#preferences">Choose options</a>.');
    html += V.staleBanner();
    if (notes.length) html += '<p class="pl-note">' + C.icon('spark') + '<span>' + notes.join(' ') + '</span></p>';

    if (mode === 'week') {
      html += '<div class="pl-week">' + days.map(function (d, i) {
        const ds = s.plan.sessions.filter((x) => x.d === d).sort((a, b) => (a.t0 == null ? 9999 : a.t0) - (b.t0 == null ? 9999 : b.t0));
        const ex = exams.filter((e) => e.date === d).map((e) => '<span class="pw-ex">' + C.icon('flag') + esc(e.code || e.title) + '</span>').concat(tests.filter((t) => t.date === d).map((t) => '<a class="pw-ex" href="#prep-' + t.id + '">' + C.icon('flag') + esc(t.name) + '</a>')).join('');
        return '<section class="pw-col' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '"><button type="button" class="pw-h" data-action="plan-day-open" data-v="' + d + '"><span>' + U.DAYS[i] + '</span><b class="num">' + U.parse(d).getDate() + '</b><span class="muted small">' + (ds.length ? U.dur(ds.reduce((a, x) => a + x.m, 0)) : 'Free') + '</span></button>' + ex +
          ds.map(function (x) {
            const sub = M.subject[x.s];
            return '<button type="button" class="pw-s' + (x.done ? ' done' : '') + '" style="--c:' + (sub ? C.scol(sub) : 'var(--primary)') + '" data-action="sess-open" data-id="' + x.id + '"><span class="num">' + (x.t0 != null ? U.hm(x.t0) : '') + ' · ' + U.mins(x.m) + '</span><b>' + esc(V.sessTitle(x)) + '</b><span>' + esc(sub ? sub.name : '') + '</span></button>';
          }).join('') + '</section>';
      }).join('') + '</div>';
    } else {
      const nextEx = exams.filter((e) => e.date >= today).concat(tests.filter((t) => t.date >= today).map((t) => ({ date: t.date, title: t.name, test: t }))).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
      html += '<div class="pl-dayv"><section class="pl-agenda">' + agenda(s, sel) + '</section><aside class="pl-side">' +
        '<section class="card pl-week-ring"><div class="pwr">' + C.ring(planned ? doneM / planned : 0, '<b>' + (planned ? Math.round(100 * doneM / planned) : 0) + '%</b>', 76) + '<div><b>This week</b><span class="muted small">' + U.dur(doneM) + ' of ' + U.dur(planned) + ' done</span></div></div></section>' +
        '<section class="card"><div class="card-head"><h2>Coming up</h2><a href="#exams">All</a></div>' + (nextEx.length ? '<ul class="pl-up">' + nextEx.map((e) => '<li><span class="pu-n num"><b>' + C.daysTo(e.date) + '</b>days</span><span><b>' + esc(e.title) + '</b><span class="muted small">' + esc(U.fmt(e.date, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span>' + (e.test ? '<a class="small" href="#prep-' + e.test.id + '">Revision plan</a>' : '') + '</span></li>').join('') + '</ul>' : '<p class="muted small">No exams or tests yet. <a href="#exams">Add a test</a> to get a plan for it.</p>') + '</section>' +
        '<section class="card pl-cal"><h2>Calendar</h2><div class="row-actions"><button type="button" class="btn alt sm" data-action="export-ics">' + C.icon('download') + 'Apple / Outlook</button><button type="button" class="btn alt sm" data-action="export-csv">' + C.icon('download') + 'Google</button></div></section>' +
        '</aside></div>';
    }
    return html;
  };
  RH.actions['plan-mode'] = (el) => { RH.ui.planMode = el.dataset.v; RH.render({ keepScroll: true }); };
  RH.actions['plan-day-open'] = (el) => { RH.ui.day = el.dataset.v; RH.ui.planMode = 'day'; RH.render({ keepScroll: true }); };

  // ---------- Routine ----------
  const hrs = (m) => Math.round((Number(m) || 0) / 15) / 4;
  V.routine = function () {
    const s = st(), r = s.routine, S = s.plan.settings;
    const ws = U.weekStart(U.today());
    const tot = R.weekTotals(s, ws);
    const pd = RH.ui.rday != null ? RH.ui.rday : U.dow(U.today());
    let html = C.page({ title: 'My schedule', lede: 'When you’re busy, so revision fits around it.',
      actions: '<button type="button" class="btn" data-action="routine-save">' + C.icon('rebuild') + 'Save and rebuild my plan</button>' });
    const stepH = (n, t, sub, right) => '<div class="step-h"><span class="step-n">' + n + '</span><div><h2>' + t + '</h2>' + (sub ? '<p class="muted small">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';

    // 1. The days: one card for Monday to Thursday, Friday, and the weekend (or one per day when split).
    const cols = [];
    R.GROUPS.forEach(function (g) {
      const ix = g[2], split = ix.length > 1 && r.split && r.split[g[0]];
      if (split) ix.forEach((i) => cols.push([String(i), DAYNAMES[i]]));
      else cols.push([ix.join(','), ix.length === 1 ? DAYNAMES[ix[0]] : DAYNAMES[ix[0]] + ' to ' + DAYNAMES[ix[ix.length - 1]]]);
    });
    const field = function (c, f, label, kind, opt) {
      const v = r.days[Number(c[0].split(',')[0])][f];
      const at = ' data-rday="' + c[0] + '" data-f="' + f + '" aria-label="' + esc(label + ', ' + c[1]) + '"';
      let input;
      if (kind === 'time') input = '<span class="t-cell"><input type="time"' + at + ' value="' + esc(v || '') + '">' + (opt && v ? '<button type="button" class="clear-x" data-action="r-clear" data-rday="' + c[0] + '" data-f="' + f + '" aria-label="Clear ' + esc(label + ', ' + c[1]) + '">' + C.icon('x') + '</button>' : '') + '</span>';
      else if (kind === 'hours') input = '<span class="u-cell"><input type="number" min="0" max="16" step="0.25" inputmode="decimal" placeholder="0"' + at + ' value="' + (v === '' || v == null ? '' : hrs(v)) + '"><span class="unit">hours</span></span>';
      else input = '<span class="u-cell"><input type="number" min="0" max="300" step="5" inputmode="numeric" placeholder="none" data-kind="mins"' + at + ' value="' + (v === '' || v == null ? '' : esc(v)) + '"><span class="unit">min</span></span>';
      return '<label class="dfield"><span>' + label + (opt ? ' <i>optional</i>' : '') + '</span>' + input + '</label>';
    };
    html += '<section class="sched-step">' + stepH(1, 'Your days', 'Leave a box empty if it doesn’t apply.', '<div class="rg-splits">' + C.toggle('data-action="r-split" data-g="wk"', 'Set Monday–Thursday day by day', r.split && r.split.wk) + C.toggle('data-action="r-split" data-g="we"', 'Set Saturday and Sunday separately', r.split && r.split.we) + '</div>') + '<div class="day-cards">' + cols.map(function (c) {
      const d0 = Number(c[0].split(',')[0]), day = r.days[d0], info = R.day(s, U.addDays(ws, d0));
      const school = !!day.school;
      return '<article class="dcard"><header><h3>' + esc(c[1]) + '</h3><span class="fits ' + (info.short ? 'warn' : 'ok') + '">' + U.dur(info.cap) + (info.short ? ' of ' + U.dur(info.target) : '') + ' revision fits</span></header>' +
        '<div class="dgroup"><label class="mini-toggle-l"><label class="mini-toggle"><input type="checkbox" data-rday="' + c[0] + '" data-f="school"' + (school ? ' checked' : '') + ' aria-label="School, ' + esc(c[1]) + '"><span></span></label><b>School</b></label>' +
        (school ? '<div class="dgrid">' + field(c, 'start', 'Starts', 'time') + field(c, 'end', 'Ends', 'time') + '</div>' : '') + '</div>' +
        '<div class="dgroup"><b class="dg-t">Sleep</b><div class="dgrid">' + field(c, 'wake', 'Wake up', 'time') + field(c, 'bed', 'Bedtime', 'time') + '</div></div>' +
        '<div class="dgroup"><b class="dg-t">Revision</b><div class="dgrid">' + field(c, 'study', 'Hours of revision', 'hours') + field(c, 'free', 'Free time to keep', 'hours', true) + '</div></div>' +
        '<details class="dmore"><summary>More: travel, breaks and limits</summary><div class="dgrid">' +
        (school ? field(c, 'travelTo', 'Travel there', 'mins', true) + field(c, 'travelBack', 'Travel home', 'mins', true) + field(c, 'afterSchool', 'Break after school', 'mins', true) : '') +
        field(c, 'prep', 'Getting ready', 'mins', true) + field(c, 'windDown', 'Wind down before bed', 'mins', true) + field(c, 'earliest', 'Earliest revision', 'time', true) + field(c, 'latest', 'Latest revision', 'time', true) + '</div></details></article>';
    }).join('') + '</div>' +
      (tot.short.length ? '<div class="note small"><b>Not everything fits.</b> ' + tot.short.map((x) => esc(DAYNAMES[U.dow(x.d)]) + ': ' + U.dur(x.cap) + ' of ' + U.dur(x.target) + (x.freeTotal - x.freeWant < x.target ? ' (only ' + U.dur(Math.max(0, x.freeTotal)) + ' free, and you want ' + U.dur(x.freeWant) + ' of it kept free)' : '')).join('; ') + '.</div>' : '') + '</section>';

    // 2. Regular commitments
    html += '<section class="sched-step">' + stepH(2, 'Clubs, sport and other regular plans', 'A job, lessons, family time, meals. The planner works around them.', '<button type="button" class="btn alt sm" data-action="ract-add">' + C.icon('plus') + 'Add</button>') +
      (r.activities.length ? '<div class="act-list">' + r.activities.map((a) => '<div class="act">' +
        '<input class="act-name" data-ract="' + a.id + '" data-f="name" value="' + esc(a.name) + '" aria-label="Name">' +
        '<select data-ract="' + a.id + '" data-f="kind" aria-label="Kind">' + C.opts(Object.keys(RH.ACTIVITY_KINDS).map((k) => [k, RH.ACTIVITY_KINDS[k]]), a.kind) + '</select>' +
        '<div class="daypick" role="group" aria-label="Days">' + U.DAYS.map((d, i) => '<button type="button" class="' + ((a.days || []).indexOf(i) !== -1 ? 'on' : '') + '" data-action="ract-day" data-id="' + a.id + '" data-v="' + i + '" aria-pressed="' + ((a.days || []).indexOf(i) !== -1) + '">' + d.slice(0, 2) + '</button>').join('') + '</div>' +
        '<span class="act-time"><input type="time" data-ract="' + a.id + '" data-f="start" value="' + esc(a.start) + '" aria-label="Starts"><span class="muted">–</span><input type="time" data-ract="' + a.id + '" data-f="end" value="' + esc(a.end) + '" aria-label="Ends"></span>' +
        '<label class="mini-check"><input type="checkbox" data-ract="' + a.id + '" data-f="term"' + (a.term ? ' checked' : '') + '>Term time only</label>' +
        '<button type="button" class="icon-btn" data-action="ract-del" data-id="' + a.id + '" aria-label="Remove ' + esc(a.name) + '">' + C.icon('trash') + '</button></div>').join('') + '</div>' : '<p class="muted">Nothing yet.</p>') + '</section>';

    // 3. One-off plans
    html += '<section class="sched-step">' + stepH(3, 'One-off plans', 'A party, an appointment, a trip. You’re busy for the time you set.', '<button type="button" class="btn alt sm" data-action="rev-add">' + C.icon('plus') + 'Add</button>') +
      (r.events.length ? '<div class="act-list">' + r.events.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => '<div class="act">' +
        '<input class="act-name" data-rev="' + e.id + '" data-f="name" value="' + esc(e.name) + '" aria-label="Name"><input type="date" data-rev="' + e.id + '" data-f="date" value="' + esc(e.date) + '" aria-label="Date">' +
        '<span class="act-time"><input type="time" data-rev="' + e.id + '" data-f="start" value="' + esc(e.start) + '" aria-label="Starts"><span class="muted">–</span><input type="time" data-rev="' + e.id + '" data-f="end" value="' + esc(e.end) + '" aria-label="Ends"></span>' +
        '<button type="button" class="icon-btn" data-action="rev-del" data-id="' + e.id + '" aria-label="Remove ' + esc(e.name) + '">' + C.icon('trash') + '</button></div>').join('') + '</div>' : '<p class="muted">Nothing planned.</p>') + '</section>';

    // 4. Holidays
    html += '<section class="sched-step">' + stepH(4, 'Holidays and study leave', 'No school on these days. These are typical dates; change them to match your school.', '<button type="button" class="btn alt sm" data-action="hol-add">' + C.icon('plus') + 'Add</button>') +
      '<div class="form-grid narrow"><label class="field"><span>Holiday wake-up</span><input type="time" data-rhol="wake" value="' + esc(r.holiday.wake) + '"></label><label class="field"><span>Holiday bedtime</span><input type="time" data-rhol="bed" value="' + esc(r.holiday.bed) + '"></label></div>' +
      '<div class="act-list">' + (S.holidays || []).map((h) => '<div class="act">' +
        '<input class="act-name" data-hol="' + h.id + '" data-f="name" value="' + esc(h.name) + '" aria-label="Name">' +
        '<span class="act-time"><input type="date" data-hol="' + h.id + '" data-f="from" value="' + esc(h.from) + '" aria-label="From"><span class="muted">–</span><input type="date" data-hol="' + h.id + '" data-f="to" value="' + esc(h.to) + '" aria-label="To"></span>' +
        '<label class="mini-field">Revise <input type="number" min="0" max="14" step="0.5" data-hol="' + h.id + '" data-f="mins" value="' + hrs(h.mins) + '" aria-label="Hours of revision a day">h</label>' +
        '<label class="mini-field">Free <input type="number" min="0" max="14" step="0.5" data-hol="' + h.id + '" data-f="free" value="' + hrs(h.free != null ? h.free : r.holiday.free) + '" aria-label="Hours of free time a day">h</label>' +
        '<button type="button" class="icon-btn" data-action="hol-del" data-id="' + h.id + '" aria-label="Remove ' + esc(h.name) + '">' + C.icon('trash') + '</button></div>').join('') + '</div></section>';

    // 5. Sessions
    const num = (k, label, help, min, max, step) => '<label class="field"><span>' + label + '</span><input type="number" min="' + min + '" max="' + max + '" step="' + (step || 5) + '" data-rset="' + k + '" value="' + esc(r[k]) + '">' + (help ? '<span class="help">' + help + '</span>' : '') + '</label>';
    html += '<section class="sched-step">' + stepH(5, 'How you like to revise', 'Session length, breaks, and whether to start early or late.') + '<div class="form-grid">' +
      '<label class="field"><span>Session length</span><select data-set="sessionLen" data-num="1">' + C.opts([[25, '25 min'], [30, '30 min'], [45, '45 min'], [60, '60 min'], [90, '90 min']], S.sessionLen) + '</select></label>' +
      '<label class="field"><span>Break between</span><select data-set="breakLen" data-num="1">' + C.opts([[5, '5 min'], [10, '10 min'], [15, '15 min']], S.breakLen) + '</select></label>' +
      num('stretch', 'Longest stretch (min)', 'Then a longer break.', 30, 300, 15) + num('longBreak', 'Longer break (min)', '', 10, 60) + '</div>' +
      '<div class="field"><span>When to revise in your free time</span>' + C.seg([['early', 'As early as possible'], ['late', 'As late as possible']], r.prefer, 'data-action="r-prefer"') + '</div></section>';

    // Check it: the week's balance and one day.
    const parts = [['sleep', 'Sleep', tot.sleep], ['school', 'School and travel', tot.school], ['activity', 'Activities and meals', tot.activity], ['study', 'Revision', tot.study], ['free', 'Free time', tot.free]];
    const all = 7 * 1440;
    html += '<section class="sched-step">' + stepH(6, 'Check your week', 'Revision target ' + U.dur(tot.target) + '; ' + U.dur(tot.study) + ' of it fits.') +
      '<div class="balance" role="img" aria-label="How your week is split">' + parts.map((p) => '<span class="kind-' + p[0] + '" style="flex-grow:' + Math.max(1, p[2]) + '" title="' + p[1] + ' ' + U.dur(p[2]) + '"></span>').join('') + '<span class="kind-other" style="flex-grow:' + Math.max(0, all - parts.reduce((a, p) => a + p[2], 0)) + '"></span></div>' +
      '<ul class="balance-key">' + parts.map((p) => '<li><i class="lgd kind-' + p[0] + '"></i><span>' + p[1] + '</span><b class="num">' + U.dur(p[2]) + '</b></li>').join('') + '</ul>' +
      '<div class="preview-day"><p class="label">Preview a day</p>' + C.seg(U.DAYS.map((d, i) => [i, d]), pd, 'data-action="r-day"') + V.timeline(U.addDays(ws, pd)) + '</div></section>';
    html += '<div class="save-bar"><span class="muted small">Your changes are saved. Rebuild the plan to use them.</span><button type="button" class="btn lg" data-action="routine-save">' + C.icon('rebuild') + 'Save and rebuild my plan</button></div>';
    return html;
  };

  // ---------- Exams ----------
  V.exams = function () {
    const s = st(), today = U.today();
    let html = C.subnav('plan', 'exams') + C.page({ title: 'Exams and tests', lede: 'Official <a href="' + RH.EXAM_SOURCE.url + '" target="_blank" rel="noopener">Edexcel Summer 2027</a> dates. Add your school tests below.' });
    if (!s.profile.fmOptions) html += V.fmOptionsCard();
    const tests = '<section class="card tests-card"><div class="card-head"><h2>School tests and mocks</h2></div>' +
      (s.exams.custom.length ? '<ul class="list">' + s.exams.custom.slice().sort((a, b) => a.date.localeCompare(b.date)).map(function (c) {
        const sub = M.subject[c.subject];
        const comps = c.comps && c.comps.length ? c.comps.map((id) => (sub.comps.find((x) => x.id === id) || {}).name).filter(Boolean).join(', ') : 'Whole subject';
        return '<li class="row" data-subj="' + c.subject + '">' + C.stag(c.subject) + '<span class="row-main"><b>' + esc(c.name) + '</b><span class="muted small">' + esc(U.fmt(c.date)) + (c.time ? ' · ' + esc(c.time) : '') + ' · ' + U.mins(c.dur || 60) + ' · ' + esc(comps) + '</span></span>' + (c.date >= today ? C.countdownChip(c.date) : '<span class="muted small">Done</span>') +
          (c.date >= today ? '<a class="btn sm" href="#prep-' + c.id + '">' + C.icon('list') + 'Revision plan</a>' : '') + '<button type="button" class="icon-btn" data-action="test-del" data-id="' + c.id + '" aria-label="Delete ' + esc(c.name) + '">' + C.icon('trash') + '</button></li>';
      }).join('') + '</ul>' : '<p class="muted">Got a test coming up? Add it with its topics and you’ll get a day-by-day plan for it.</p>') +
      '<form id="testForm" class="stack-form"><div class="form-grid"><label class="field"><span>Name</span><input id="t-name" name="name" required placeholder="e.g. Physics mock, Paper 1"></label>' +
      '<label class="field"><span>Subject</span><select id="t-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (RH.ui.testSubj === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Date</span><input id="t-date" name="date" type="date" required min="' + today + '"></label><label class="field"><span>Start time</span><input id="t-time" name="time" type="time" value="09:00"></label>' +
      '<label class="field"><span>Minutes</span><input id="t-dur" name="dur" type="number" min="10" max="300" step="5" value="60"></label></div>' +
      '<fieldset class="field"><legend>Topics it covers <span class="muted small">(none ticked = the whole subject)</span></legend><div class="picks" id="t-comps">' + V.compPicks(RH.ui.testSubj || 'physics') + '</div></fieldset>' +
      '<div class="row-actions"><button type="submit" class="btn">' + C.icon('plus') + 'Add test and plan it</button></div></form></section>';
    html += tests + '<h2 class="h-sec">Official exams</h2>';
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
    html += '</div>';
    return html;
  };

  // ---------- Strategy ----------
  V.strategy = function () {
    const S = st().plan.settings;
    const range = (key, label, help, min, max, step) => '<div class="field"><label for="f-' + key + '" class="range-l"><span>' + label + '</span><output class="num" id="o-' + key + '">' + S[key] + '</output></label>' +
      '<input type="range" id="f-' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '" data-set="' + key + '" data-num="1">' + (help ? '<p class="help">' + help + '</p>' : '') + '</div>';
    const tg = (key, label, help) => C.toggle('id="f-' + key + '" data-set="' + key + '"', label, S[key], help);
    let html = C.subnav('plan', 'strategy') + C.page({ title: 'Strategy', lede: 'How the planner picks what to revise.', actions: '<button type="button" class="btn" data-action="plan-build">' + C.icon('rebuild') + 'Rebuild plan</button>' });
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
  A['plan-day'] = (el) => { RH.ui.day = el.dataset.v; RH.ui.planMode = 'day'; RH.render({ keepScroll: true }); };
})(window.RH = window.RH || {});
