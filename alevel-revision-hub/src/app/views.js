/* Shared page pieces: navigation, session titles, the day timeline and small cards used on several pages. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc;
  const st = () => RH.store.state;
  const V = RH.views;

  // ---------- Areas and navigation ----------
  V.areaOf = function (r) {
    if (r === 'home') return 'home';
    if (/^(study|s-|c-|t-|cards|deck-|review|papers|paper-|exam$|mark$|library|guide)/.test(r)) return 'study';
    if (/^(plan|deliverables|routine|exams|strategy)$/.test(r)) return 'plan';
    if (/^(check|checks|check-)/.test(r)) return 'check';
    if (r === 'focus') return 'focus';
    return 'settings';
  };
  V.nav = function (r) {
    const s = st(), area = V.areaOf(r);
    const sum = RH.deliv.summary();
    const todayLeft = s.plan.sessions.filter((x) => x.d === U.today() && !x.done).length;
    const badge = { home: todayLeft ? '<span class="count">' + todayLeft + '</span>' : '', plan: sum && sum.overdue ? '<span class="count bad">' + sum.overdue + '</span>' : '', focus: RH.face.on ? '<span class="live-dot" title="Tracker on"></span>' : '' };
    return Object.keys(RH.AREAS).map(function (k) {
      const a = RH.AREAS[k], on = area === k;
      return '<a href="#' + a.pages[0][0] + '" class="nav-item' + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + C.icon(a.icon) + '<span>' + a.label + '</span>' + (badge[k] || '') + '</a>';
    }).join('');
  };
  V.railFoot = function (r) {
    const on = V.areaOf(r) === 'settings';
    const sync = RH.store.sync;
    return '<a href="#preferences" class="nav-item' + (on ? ' on' : '') + '">' + C.icon('gear') + '<span>Settings</span></a>' +
      '<p class="sync-line small muted">' + (sync === 'cloud' ? 'Synced to your account' : sync === 'cloud-error' ? 'Sync failed, saved here' : 'Saved on this device') + '</p>';
  };
  V.tabbar = function (r) {
    const area = V.areaOf(r);
    return Object.keys(RH.AREAS).map(function (k) {
      const a = RH.AREAS[k], on = area === k;
      return '<a href="#' + a.pages[0][0] + '" class="tab-i' + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + C.icon(a.icon) + '<span>' + a.label + '</span></a>';
    }).join('');
  };

  // ---------- Sessions ----------
  V.sessTitle = function (s) {
    const t = s.t && M.topic[s.t];
    if (t) return t.name;
    const e = s.e && M.examById(st(), s.e);
    if (e) return (s.k === 'pp' ? 'Past paper: ' : 'Review for ') + e.title;
    return RH.KIND[s.k] ? RH.KIND[s.k].label : 'Session';
  };
  V.when = (x) => x.t0 != null ? U.hm(x.t0) + '–' + U.hm(x.t0 + x.m) : 'No slot';

  V.staleBanner = function () {
    const p = st().plan;
    const stale = p.builtAt && (p.settingsAt > p.builtAt || st().ratedAt > p.builtAt);
    const missed = p.sessions.filter((s) => !s.done && s.d < U.today()).length;
    if (!stale && !missed) return '';
    const why = [];
    if (missed) why.push(U.plural(missed, 'past session') + ' not done');
    if (stale) why.push(p.settingsAt > p.builtAt ? 'your routine or strategy changed' : 'your ratings changed');
    return '<div class="note row-note"><p><b>Your plan can be updated:</b> ' + esc(why.join(', ')) + '.</p><button type="button" class="btn sm" data-action="plan-build">' + C.icon('rebuild') + 'Rebuild from today</button></div>';
  };

  // One day as a list of times: school, activities, revision sessions and free time.
  V.timeline = function (d, opts) {
    const tl = RH.routine.timeline(st(), d);
    const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes(), isToday = d === U.today();
    const skip = { morning: 1, winddown: 1, travel: opts && opts.compact ? 1 : 0, rest: opts && opts.compact ? 1 : 0 };
    let marked = false;
    let html = '<ol class="tl">';
    tl.items.forEach(function (it) {
      if (it.type === 'block' && skip[it.kind]) return;
      if (isToday && !marked && it.start > nowM) { html += '<li class="tl-now" aria-label="Now"><span>' + U.hm(nowM) + '</span></li>'; marked = true; }
      const past = isToday && it.end <= nowM;
      if (it.type === 'session') {
        const x = it.sess, t = x.t && M.topic[x.t];
        html += '<li class="tl-i kind-study' + (x.done ? ' done' : '') + (past && !x.done ? ' late' : '') + '" data-subj="' + x.s + '"><span class="tl-t num">' + U.hm(it.start) + '<span>' + U.hm(it.end) + '</span></span>' +
          '<span class="tl-bar"></span><div class="tl-body"><button type="button" class="tl-title" data-action="sess-open" data-id="' + x.id + '">' + C.stag(x.s) + esc(V.sessTitle(x)) + '</button><span class="muted small">' + esc(RH.KIND[x.k].label) + (t ? ' · ' + esc(t.comp.name) : '') + '</span></div>' +
          '<div class="tl-act"><button type="button" class="check-b' + (x.done ? ' on' : '') + '" data-action="sess-done" data-id="' + x.id + '" aria-pressed="' + !!x.done + '" aria-label="' + (x.done ? 'Done' : 'Mark done') + '">' + C.icon('tick') + '</button>' +
          (x.done ? '' : '<button type="button" class="icon-btn" data-action="timer-open" data-id="' + x.id + '" aria-label="Start a timer">' + C.icon('timer') + '</button>') + '</div></li>';
      } else {
        const label = it.type === 'free' ? 'Free time' : it.label;
        html += '<li class="tl-i kind-' + it.kind + (past ? ' past' : '') + '"' + (it.subj ? ' data-subj="' + it.subj + '"' : '') + '><span class="tl-t num">' + U.hm(it.start) + '<span>' + U.hm(it.end) + '</span></span><span class="tl-bar"></span><div class="tl-body"><span class="tl-title plain">' + esc(label) + '</span><span class="muted small">' + U.dur(it.end - it.start) + '</span></div></li>';
      }
    });
    if (isToday && !marked) html += '<li class="tl-now" aria-label="Now"><span>' + U.hm(nowM) + '</span></li>';
    html += '</ol>';
    if (tl.unplaced.length) html += '<p class="note small">' + U.plural(tl.unplaced.length, 'session') + ' didn’t fit into this day’s free time: ' + tl.unplaced.map((x) => esc(V.sessTitle(x))).join(', ') + '. Rebuild the plan, or loosen your routine.</p>';
    if (!tl.items.some((i) => i.type === 'session') && !tl.unplaced.length) html += '<p class="muted small tl-empty">No revision planned for this day.</p>';
    return html;
  };

  // ---------- Further Maths options ----------
  V.fmOptionsCard = function () {
    const chosen = st().profile.fmOptions || RH.ui.fmDraft || ['fs1', 'fm1'];
    return '<section class="card" id="fmopts" data-subj="further"><div class="card-head"><h2>Further Maths options</h2></div><p class="muted">Pick the two options you sit for Papers 3 and 4. Mr Gale’s resources cover Further Statistics 1 and Further Mechanics 1, so those are ticked to start with.</p>' +
      '<div class="opt-grid">' + RH.FM_OPTIONS.map((o) => {
        const p = M.subject.further.paper[o.paper];
        return '<label class="opt"><input type="checkbox" data-fmopt="' + o.id + '"' + (chosen.indexOf(o.id) !== -1 ? ' checked' : '') + '><span><b>' + esc(o.name) + '</b><span class="muted small num">' + esc(p.code) + '</span></span></label>';
      }).join('') + '</div><div class="row-actions"><button type="button" class="btn" data-action="fm-save">Save options</button></div></section>';
  };

  V.compPicks = function (sid) {
    return M.compsFor(st(), M.subject[sid]).map((c) => '<label class="pick"><input type="checkbox" name="comps" value="' + c.id + '"><span>' + esc(c.name) + '</span></label>').join('');
  };

  V.notFound = () => C.page({ title: 'Page not found', lede: 'That link does not match a page in the hub.' }) + '<a class="btn" href="#home">Go home</a>';
})(window.RH = window.RH || {});
