/* Weekly deliverables: a short list of work you must hand in by the end of each week, made from your plan.
   Each one needs evidence (a photo of your work, a score, your written recall) or is measured automatically
   (focus hours, flashcard reviews, answers marked in Check). You commit to the list at the start of the week,
   and the week has to be closed before it stops nagging. Missed work carries over. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const store = RH.store;
  const D = RH.deliv = {};

  D.KINDS = {
    paper: { label: 'Timed paper', icon: 'paper', ev: ['score', 'photo'] },
    questions: { label: 'Exam questions', icon: 'qs', ev: ['photo', 'score'] },
    summary: { label: 'Topic summary', icon: 'notes', ev: ['photo'] },
    blurt: { label: 'Blurt test', icon: 'pen', ev: ['text'] },
    checks: { label: 'Marked answers', icon: 'check', auto: true, unit: 'answers' },
    focus: { label: 'Focus time', icon: 'focus', auto: true, unit: 'min' },
    cards: { label: 'Flashcards', icon: 'cards', auto: true, unit: 'cards' },
    catchup: { label: 'Catch-up', icon: 'flag', ev: ['photo', 'score'] },
    custom: { label: 'Your own', icon: 'target', ev: ['photo', 'text'] }
  };
  const STATUS = {
    open: ['Due', ''], returned: ['Sent back', 'warn'], overdue: ['Overdue', 'bad'], submitted: ['Handed in', 'ok'], verified: ['Verified', 'ok'],
    late: ['Handed in late', 'warn'], done: ['Done', 'ok'], missed: ['Missed', 'bad'], excused: ['Excused', '']
  };
  const DONE = { done: 1, verified: 1, submitted: 1, late: 1 };
  D.isDone = (s) => !!DONE[s];

  const atTime = (d, t) => U.parse(d).getTime() + U.tm(t) * 60000;
  D.deadline = function (ws) { const s = st().deliv.settings; const d = U.addDays(ws, Number(s.day)); return { date: d, time: s.time, at: atTime(d, s.time) }; };
  D.currentWs = () => U.weekStart(U.today());
  D.passed = (ws) => Date.now() > D.deadline(ws).at;
  D.timeLeft = function (ws) {
    const ms = D.deadline(ws).at - Date.now();
    if (ms <= 0) return 'Deadline passed';
    const h = Math.floor(ms / 36e5), d = Math.floor(h / 24);
    return d ? d + 'd ' + (h % 24) + 'h left' : h ? h + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm left' : Math.floor(ms / 6e4) + 'm left';
  };

  // Automatic progress, counted from the logs for that week.
  D.progress = function (item, ws) {
    const s = st(), end = U.addDays(ws, 6), inWk = (d) => d >= ws && d <= end;
    if (item.kind === 'focus') return { val: Math.round(s.focus.log.filter((x) => inWk(x.date)).reduce((a, x) => a + (x.focused || 0), 0)), target: item.target };
    if (item.kind === 'cards') return { val: Object.keys(s.cardLog).filter(inWk).reduce((a, d) => a + s.cardLog[d], 0), target: item.target };
    if (item.kind === 'checks') return { val: s.checks.filter((c) => inWk(c.date) && c.result).length, target: item.target };
    return null;
  };
  D.statusOf = function (item, ws) {
    if (item.status === 'missed' || item.status === 'excused') return item.status;
    if (D.KINDS[item.kind] && D.KINDS[item.kind].auto) {
      const p = D.progress(item, ws);
      return p.val >= p.target ? 'done' : D.passed(ws) ? 'overdue' : 'open';
    }
    if (item.status === 'verified' || item.status === 'submitted') return item.late ? 'late' : item.status;
    if (D.passed(ws)) return 'overdue';
    return item.status === 'returned' ? 'returned' : 'open';
  };
  D.statusChip = (s) => C.chip(STATUS[s][0], STATUS[s][1]);

  // ---------- Making a week's list ----------
  function paperMarks(s, examId) {
    const e = M.examById(s, examId);
    if (!e || !e.official) return null;
    const p = M.subject[e.subject].papers.find((x) => x.code === e.code);
    return p ? p.marks : null;
  }
  D.generate = function (s, ws) {
    const we = U.addDays(ws, 6);
    const sess = s.plan.sessions.filter((x) => x.d >= ws && x.d <= we);
    const planned = sess.reduce((a, x) => a + x.m, 0);
    const mk = (o) => Object.assign({ id: 'v' + U.uid(), status: 'open', files: [] }, o);
    const topicName = (gid) => (M.topic[gid] || {}).name || 'a topic';
    const picks = [];
    const pp = sess.find((x) => x.k === 'pp');
    const topicSess = sess.filter((x) => x.t && M.topic[x.t]);
    const weakest = topicSess.slice().sort((a, b) => M.conf(s, a.t) - M.conf(s, b.t))[0];
    if (pp) {
      const e = M.examById(s, pp.e);
      picks.push(mk({ kind: 'paper', subject: pp.s, exam: pp.e, target: paperMarks(s, pp.e), title: 'Sit ' + (e ? e.title : 'a past paper') + ' as a timed paper', detail: 'Full paper in exam conditions, then mark it with the mark scheme. Sit it in Past papers, or do it on paper and enter your score with a photo of the front page.' }));
    } else if (weakest) {
      picks.push(mk({ kind: 'questions', subject: weakest.s, topic: weakest.t, target: 20, title: '20 marks of exam questions: ' + topicName(weakest.t), detail: 'Do at least 20 marks of past-paper questions on this topic, mark them with the mark scheme in a different colour, and upload a photo with your score.' }));
    }
    const learns = topicSess.filter((x) => x.k === 'learn').filter((x, i, a) => a.findIndex((y) => y.t === x.t) === i);
    if (learns[0]) picks.push(mk({ kind: 'summary', subject: learns[0].s, topic: learns[0].t, title: 'One-page summary: ' + topicName(learns[0].t), detail: 'Condense the topic onto one side of A4 from memory first, then fill gaps from your notes. Upload a photo.' }));
    picks.push(mk({ kind: 'checks', target: 3, title: 'Get 3 exam answers marked in Check', detail: 'Write full answers to real exam questions, let the AI checker mark them against the mark scheme, then fix what it flags.' }));
    const focusTarget = Math.max(60, Math.round(planned * 0.75 / 30) * 30);
    picks.push(mk({ kind: 'focus', target: focusTarget, title: 'Log ' + U.dur(focusTarget) + ' of focused revision', detail: 'Time your sessions on the Focus page. With the webcam tracker on, only time at your desk counts.' }));
    const hasDecks = Object.keys(s.decks).length > 0;
    picks.push(mk({ kind: 'cards', target: hasDecks ? 150 : 50, title: hasDecks ? 'Review 150 flashcards' : 'Add a flashcard deck and review 50 cards', detail: 'Leitner reviews count, a few each day rather than all on Sunday.' }));
    const rec = topicSess.find((x) => x.k === 'recall') || topicSess.find((x) => M.conf(s, x.t) === 1);
    if (rec) picks.push(mk({ kind: 'blurt', subject: rec.s, topic: rec.t, title: 'Blurt test: ' + topicName(rec.t), detail: 'Set a 10-minute timer and write down everything you know about this topic without notes. Paste or type what you wrote.' }));
    if (learns[1]) picks.push(mk({ kind: 'summary', subject: learns[1].s, topic: learns[1].t, title: 'One-page summary: ' + topicName(learns[1].t), detail: 'Condense the topic onto one side of A4. Upload a photo.' }));
    const count = U.clamp(Number(s.deliv.settings.count) || 6, 3, 8);
    return { ws: ws, createdAt: Date.now(), items: picks.slice(0, count), committedAt: 0, signature: '', reviewedAt: 0 };
  };

  // The record for a week, made the first time this week is looked at.
  D.week = function (ws) {
    ws = ws || D.currentWs();
    const s = st();
    if (!s.deliv.weeks[ws] && ws === D.currentWs()) {
      const rec = D.generate(s, ws);
      store.update(function (x) { x.deliv.weeks[ws] = rec; }, { silent: true });
    }
    return st().deliv.weeks[ws] || null;
  };
  // A finished week that has not been closed yet.
  D.needsReview = function () {
    const weeks = st().deliv.weeks, cur = D.currentWs();
    return Object.keys(weeks).filter((ws) => ws < cur && !weeks[ws].reviewedAt && D.passed(ws)).sort().pop() || null;
  };
  D.summary = function (ws) {
    ws = ws || D.currentWs();
    const w = D.week(ws);
    if (!w) return null;
    const statuses = w.items.map((it) => D.statusOf(it, ws));
    return { total: w.items.length, done: statuses.filter(D.isDone).length, overdue: statuses.filter((x) => x === 'overdue').length, returned: statuses.filter((x) => x === 'returned').length, left: D.timeLeft(ws), committed: !!w.committedAt };
  };
  D.streak = function () {
    const weeks = st().deliv.weeks;
    let n = 0;
    for (const ws of Object.keys(weeks).sort().reverse()) {
      const w = weeks[ws];
      if (!w.reviewedAt) continue;
      if (w.score === 1) n++; else break;
    }
    return n;
  };

  function findItem(id) {
    const weeks = st().deliv.weeks;
    for (const ws of Object.keys(weeks)) { const it = weeks[ws].items.find((x) => x.id === id); if (it) return { ws: ws, item: it }; }
    return null;
  }
  function updateItem(id, fn) {
    store.update(function (s) {
      Object.keys(s.deliv.weeks).forEach((ws) => s.deliv.weeks[ws].items.forEach((it) => { if (it.id === id) fn(it, ws); }));
    });
  }

  // ---------- Evidence photos (kept in this browser) ----------
  const blobCache = {};
  async function loadBlob(key) { if (!(key in blobCache)) blobCache[key] = await RH.files.get(key); return blobCache[key]; }
  RH.afterRender.push(function () {
    document.querySelectorAll('img[data-dvimg]').forEach(function (img) {
      loadBlob(img.dataset.dvimg).then(function (b) { if (b) img.src = C.blobURL(b); else img.closest('.thumb').classList.add('gone'); });
    });
  });
  const storedThumbs = (files) => files && files.length ? '<div class="thumbs">' + files.map((f) => '<figure class="thumb"><img data-dvimg="' + esc(f.key) + '" alt="' + esc(f.name || 'Evidence photo') + '"></figure>').join('') + '</div>' : '';

  // ---------- Page ----------
  function itemRow(it, ws, opts) {
    const k = D.KINDS[it.kind] || D.KINDS.custom;
    const status = D.statusOf(it, ws);
    const p = k.auto ? D.progress(it, ws) : null;
    const t = it.topic && M.topic[it.topic];
    let right = '';
    if (k.auto) right = '<div class="dv-prog"><span class="num">' + (it.kind === 'focus' ? U.dur(p.val) + ' / ' + U.dur(p.target) : p.val + ' / ' + p.target) + '</span>' + C.bar(p.val / p.target, D.isDone(status) ? 'ok' : '') + '</div>';
    else if (!opts || !opts.readonly) right = '<button type="button" class="btn sm' + (D.isDone(status) ? ' alt' : '') + '" data-action="dv-submit" data-id="' + it.id + '">' + (D.isDone(status) ? 'View' : status === 'returned' ? 'Resubmit' : 'Hand in') + '</button>';
    const go = it.kind === 'focus' ? '#focus' : it.kind === 'cards' ? '#cards' : it.kind === 'checks' ? '#check' : it.kind === 'paper' ? '#papers' : t ? '#t-' + t.gid : '';
    return '<li class="dv' + (D.isDone(status) ? ' is-done' : '') + (status === 'overdue' ? ' is-overdue' : '') + '"' + (it.subject ? ' data-subj="' + it.subject + '"' : '') + '>' +
      '<span class="dv-ic">' + C.icon(D.isDone(status) ? 'tick' : k.icon) + '</span>' +
      '<div class="dv-main"><div class="dv-top">' + (it.subject ? C.stag(it.subject) : '') + '<span class="label">' + esc(k.label) + '</span>' + D.statusChip(status) + (it.carried ? C.chip('Carried over', 'warn') : '') + '</div>' +
      '<p class="dv-title">' + esc(it.title) + '</p>' + (opts && opts.compact ? '' : '<p class="dv-detail">' + esc(it.detail || '') + '</p>') +
      (it.verdict && it.verdict.comment && !(opts && opts.compact) ? '<p class="dv-verdict ' + (it.verdict.verdict === 'reject' ? 'bad' : it.verdict.verdict === 'partial' ? 'warn' : 'ok') + '">' + C.icon('spark') + esc(it.verdict.comment) + '</p>' : '') +
      (go && !(opts && opts.compact) && !D.isDone(status) ? '<a class="dv-go small" href="' + go + '">Go to ' + (it.kind === 'focus' ? 'Focus' : it.kind === 'cards' ? 'Flashcards' : it.kind === 'checks' ? 'Check' : it.kind === 'paper' ? 'Past papers' : 'the topic') + C.icon('right') + '</a>' : '') +
      '</div><div class="dv-side">' + right + '</div></li>';
  }
  D.itemRow = itemRow;

  RH.views.deliverables = function () {
    const s = st(), ws = RH.ui.dvWeek || D.currentWs(), cur = D.currentWs();
    const w = D.week(ws);
    const dl = D.deadline(ws);
    const set = s.deliv.settings;
    const review = D.needsReview();
    let html = C.subnav('plan', 'deliverables');
    html += C.page({ eyebrow: 'Week of ' + esc(U.fmtShort(ws)), title: 'Deliverables', lede: 'Hand these in by <b>' + esc(U.fmt(dl.date, { weekday: 'long' })) + ' ' + esc(dl.time) + '</b>. Each one needs proof, or is measured for you.',
      actions: '<button type="button" class="icon-btn" data-action="dv-week" data-v="-7" aria-label="Previous week">' + C.icon('left') + '</button><button type="button" class="icon-btn" data-action="dv-week" data-v="7" aria-label="Next week"' + (ws >= cur ? ' disabled' : '') + '>' + C.icon('right') + '</button>' });

    if (review && ws === cur) html += reviewPanel(review);

    if (!w) return html + C.empty('No deliverables were set for this week.', 'Deliverables start from the week you first opened this page.');
    const sum = D.summary(ws);
    html += '<section class="card dv-head"><div class="dv-head-l">' + C.ring(sum.done / (sum.total || 1), '<b class="num">' + sum.done + '/' + sum.total + '</b>', 76, sum.overdue ? 'bad' : sum.done === sum.total ? 'ok' : '') +
      '<div><p class="h3">' + (sum.done === sum.total ? 'Everything handed in' : U.plural(sum.total - sum.done, 'deliverable') + ' to go') + '</p><p class="muted">' + esc(sum.left) + (sum.overdue ? ' · <b class="bad-t">' + sum.overdue + ' overdue</b>' : '') + '</p>' +
      '<p class="muted small">' + C.icon('flame', 'i-sm') + ' ' + U.plural(D.streak(), 'week') + ' in a row fully delivered</p></div></div>' +
      '<div class="row-actions"><button type="button" class="btn alt sm" data-action="dv-report" data-ws="' + ws + '">' + C.icon('copy') + 'Copy weekly report</button>' + (ws === cur ? '<button type="button" class="btn alt sm" data-action="dv-add">' + C.icon('plus') + 'Add your own</button>' : '') + '</div></section>';

    if (ws === cur && !w.committedAt) {
      html += '<section class="card commit"><div><h2>Commit to this week</h2><p class="muted">Sign up to the list below. Your signature and the time go on your weekly report, so a parent, tutor or friend can hold you to it.</p></div>' +
        '<form id="commitForm" class="commit-form"><label class="field"><span>Type your name to sign</span><input name="sig" id="commit-sig" required value="' + esc(s.profile.name || '') + '" autocomplete="name"></label><button type="submit" class="btn">' + C.icon('pen') + 'I commit to these</button>' +
        '<button type="button" class="btn ghost" data-action="dv-regen">Rebuild the list from my plan</button></form></section>';
    } else if (w.committedAt) {
      html += '<p class="signed small muted">' + C.icon('pen', 'i-sm') + ' Signed by <b>' + esc(w.signature) + '</b> on ' + esc(new Date(w.committedAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</p>';
    }
    html += '<ul class="dv-list">' + w.items.map((it) => itemRow(it, ws)).join('') + '</ul>';

    // Past weeks
    const past = Object.keys(s.deliv.weeks).filter((x) => x < cur && s.deliv.weeks[x].reviewedAt).sort().reverse();
    if (past.length) html += '<section class="card"><div class="card-head"><h2>Past weeks</h2></div><ul class="list">' + past.slice(0, 12).map(function (x) {
      const pw = s.deliv.weeks[x], done = pw.items.filter((it) => D.isDone(D.statusOf(it, x))).length;
      return '<li class="row"><span class="row-main"><b>Week of ' + esc(U.fmtShort(x)) + '</b><span class="muted small">' + done + ' of ' + pw.items.length + ' delivered</span></span>' + C.bar(done / (pw.items.length || 1), done === pw.items.length ? 'ok' : done / pw.items.length < 0.5 ? 'bad' : 'warn') + '<button type="button" class="btn ghost sm" data-action="dv-show" data-ws="' + x + '">Open</button></li>';
    }).join('') + '</ul></section>';

    html += '<details class="card fold"><summary><h2>Rules</h2><span class="muted small">Deadline, how many, what happens if you miss one</span></summary><div class="fold-body form-grid">' +
      '<label class="field"><span>Deadline day</span><select data-dvset="day">' + C.opts(U.DAYS.map((d, i) => [i, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]]), set.day) + '</select></label>' +
      '<label class="field"><span>Deadline time</span><input type="time" data-dvset="time" value="' + esc(set.time) + '"></label>' +
      '<label class="field"><span>Deliverables per week</span><select data-dvset="count">' + C.opts([[3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7'], [8, '8']], set.count) + '</select></label>' +
      '<label class="field"><span>Report goes to (optional)</span><input data-dvset="partner" value="' + esc(set.partner || '') + '" placeholder="e.g. Mum, Mr Gale"></label>' +
      C.toggle('data-dvset="carry"', 'Missed work carries over', set.carry, 'Anything you miss is added to next week.') +
      C.toggle('data-dvset="strict"', 'Strict mode', set.strict, 'Missing anything adds a catch-up task, and Home stays locked until you close the week.') +
      '</div></details>';
    return html;
  };

  function reviewPanel(ws) {
    const w = st().deliv.weeks[ws];
    const open = w.items.filter((it) => !D.isDone(D.statusOf(it, ws)) && it.status !== 'missed' && it.status !== 'excused');
    return '<section class="card review" id="review"><div class="card-head"><h2>' + C.icon('lock') + 'Close the week of ' + esc(U.fmtShort(ws)) + '</h2><span class="chip bad">Deadline passed</span></div>' +
      '<p class="muted">Before you start this week, deal with what is left from last week. Hand it in late, or mark it missed' + (st().deliv.settings.carry ? ' (it carries over to this week)' : '') + '.</p>' +
      (open.length ? '<ul class="dv-list">' + open.map((it) => '<li class="dv is-overdue"><span class="dv-ic">' + C.icon((D.KINDS[it.kind] || D.KINDS.custom).icon) + '</span><div class="dv-main"><p class="dv-title">' + esc(it.title) + '</p></div><div class="dv-side row-actions">' +
        ((D.KINDS[it.kind] || {}).auto ? '' : '<button type="button" class="btn sm" data-action="dv-submit" data-id="' + it.id + '">Hand in late</button>') +
        '<button type="button" class="btn alt sm" data-action="dv-miss" data-id="' + it.id + '">Missed</button><button type="button" class="btn ghost sm" data-action="dv-excuse" data-id="' + it.id + '">Excuse</button></div></li>').join('') + '</ul>' : '<p>Everything is accounted for.</p>') +
      '<div class="row-actions"><button type="button" class="btn" data-action="dv-close" data-ws="' + ws + '"' + (open.length ? ' disabled' : '') + '>' + C.icon('tick') + 'Close the week</button></div></section>';
  }

  // ---------- Hand-in dialog ----------
  RH.ui.dvDraft = null;
  function openSubmit(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.item, k = D.KINDS[it.kind] || D.KINDS.custom;
    const ev = it.kind === 'custom' ? (it.ev || ['photo', 'text']) : k.ev;
    const t = it.topic && M.topic[it.topic];
    if (!RH.ui.dvDraft || RH.ui.dvDraft.id !== id) RH.ui.dvDraft = { id: id, photos: [] };
    const draft = RH.ui.dvDraft;
    const ai = RH.ai.status();
    let body = '<p class="muted">' + esc(it.detail || '') + '</p>' + (t && t.pts && (it.kind === 'summary' || it.kind === 'blurt') ? '<details class="fold-lite"><summary>Spec points it should cover</summary><ul class="bullets small">' + t.pts.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></details>' : '');
    if (it.files && it.files.length) body += '<p class="label">Handed in</p>' + storedThumbs(it.files);
    if (it.verdict) body += '<p class="dv-verdict ' + (it.verdict.verdict === 'reject' ? 'bad' : it.verdict.verdict === 'partial' ? 'warn' : 'ok') + '">' + C.icon('spark') + esc(it.verdict.comment) + '</p>' + (it.verdict.missing && it.verdict.missing.length ? '<ul class="bullets small">' + it.verdict.missing.map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '');
    body += '<form id="dvForm" class="stack-form" data-id="' + id + '">';
    if (ev.indexOf('photo') !== -1) body += '<div class="field"><span>Photos of your work</span><label class="drop small-drop">' + C.icon('camera') + '<b>Take or choose photos</b><span class="muted small">JPEG or PNG, up to 6</span><input type="file" id="dv-photos" accept="image/*" capture="environment" multiple></label><div id="dv-thumbs">' + C.thumbs(draft.photos, 'dv', true) + '</div></div>';
    if (ev.indexOf('score') !== -1) body += '<div class="field"><span>Your marked score</span><div class="score-in"><input type="number" name="got" min="0" inputmode="numeric" value="' + (it.score != null ? it.score : '') + '" aria-label="Marks scored"><span>out of</span><input type="number" name="of" min="1" inputmode="numeric" value="' + (it.of || it.target || '') + '" aria-label="Marks available"></div></div>';
    if (ev.indexOf('text') !== -1) body += '<label class="field"><span>' + (it.kind === 'blurt' ? 'What you wrote from memory' : 'Notes or a link') + '</span><textarea name="text" rows="' + (it.kind === 'blurt' ? 9 : 4) + '">' + esc(it.text || '') + '</textarea></label>';
    body += '<div class="row-actions"><button type="submit" class="btn" name="mode" value="plain">' + C.icon('upload') + 'Hand in</button>' +
      ((ai === 'claude' || ai === 'api') ? '<button type="submit" class="btn alt" name="mode" value="ai">' + C.icon('spark') + 'Hand in and verify with AI</button>' : '') + '</div>' +
      '<p class="help">' + (ai === 'claude' || ai === 'api' ? 'AI verification checks your photo or text really does what the deliverable asks, and sends it back if it doesn’t.' : 'Connect Claude in Settings to have hand-ins checked.') + ' Photos stay on this device.</p></form>';
    C.openModal(esc(it.title), body, { wide: true, subj: it.subject || null, onClose: () => { RH.ui.dvDraft = null; } });
    RH.afterRender.forEach((fn) => fn());
  }
  D.openSubmit = openSubmit;

  RH.onChange.push(function (el) {
    if (el.id !== 'dv-photos') return false;
    const d = RH.ui.dvDraft;
    d.photos = d.photos.concat(C.imageFiles(el)).slice(0, 6);
    el.value = '';
    $('#dv-thumbs').innerHTML = C.thumbs(d.photos, 'dv', true);
    return true;
  });

  async function verify(it, photos, text) {
    const t = it.topic && M.topic[it.topic];
    const prompt = 'A student revising for Pearson Edexcel A-levels has handed in evidence for a weekly revision deliverable. Decide whether the evidence genuinely completes it. Be fair but firm: blank, off-topic, copied-looking or clearly unfinished work should be sent back.\n\n' +
      'Deliverable: ' + it.title + '\nWhat was asked: ' + (it.detail || '') + '\n' +
      (t ? 'Topic: ' + t.subject.name + ' – ' + t.name + '\nSpecification points for this topic:\n' + (t.pts || []).map((p) => '- ' + p).join('\n') + '\n' : '') +
      (it.target && it.kind !== 'summary' ? 'Target: ' + it.target + ' marks\n' : '') +
      (photos.length ? 'The student attached ' + photos.length + ' photo(s) of their work.\n' : 'No photos were attached.\n') +
      (text ? 'The student wrote:\n"""\n' + text.slice(0, 6000) + '\n"""\n' : '') +
      '\nReply with only JSON: {"verdict": "accept" | "partial" | "reject", "comment": "one or two sentences to the student, plain and specific", "missing": ["specification points or parts that are missing, at most 5"]}';
    return RH.ai.ask(prompt, { json: true, images: photos.length ? photos : null });
  }

  RH.onSubmit.dvForm = async function (f, ev) {
    const id = f.dataset.id, found = findItem(id);
    if (!found) return;
    const it = found.item, k = D.KINDS[it.kind] || D.KINDS.custom;
    const ev2 = it.kind === 'custom' ? (it.ev || ['photo', 'text']) : k.ev;
    const mode = ev && ev.submitter && ev.submitter.value === 'ai' ? 'ai' : 'plain';
    const d = new FormData(f);
    const photos = (RH.ui.dvDraft && RH.ui.dvDraft.photos) || [];
    const text = String(d.get('text') || '').trim();
    const got = d.get('got'), of = d.get('of');
    const hasPhoto = photos.length || (it.files && it.files.length);
    if (ev2[0] === 'photo' && !hasPhoto) { C.toast('Add at least one photo of your work.'); return; }
    if (ev2[0] === 'score' && (got === '' || got == null)) { C.toast('Enter your marked score.'); return; }
    if (ev2[0] === 'text' && text.length < 40) { C.toast('Write a bit more: this needs to show the work you did.'); return; }
    const btns = f.querySelectorAll('button'); btns.forEach((b) => { b.disabled = true; });
    const files = (it.files || []).slice();
    for (const p of photos) {
      const key = 'dv:' + id + ':' + U.uid();
      await RH.files.put(key, p);
      blobCache[key] = p;
      files.push({ key: key, name: p.name || 'photo.jpg' });
    }
    let verdict = null;
    if (mode === 'ai') {
      const note = f.querySelector('.help');
      if (note) note.textContent = 'Checking your hand-in…';
      try { verdict = await verify(it, photos, text); }
      catch (e) { C.toast(RH.ai.errorText(e)); btns.forEach((b) => { b.disabled = false; }); if (note) note.textContent = ''; return; }
    }
    const late = D.passed(found.ws);
    updateItem(id, function (x) {
      x.files = files; x.text = text;
      if (got !== null && got !== '') { x.score = Number(got); x.of = Number(of) || x.target || null; }
      x.submittedAt = Date.now(); x.late = late;
      if (verdict) {
        x.verdict = { verdict: verdict.verdict, comment: String(verdict.comment || ''), missing: Array.isArray(verdict.missing) ? verdict.missing.slice(0, 5).map(String) : [] };
        x.status = verdict.verdict === 'accept' ? 'verified' : verdict.verdict === 'reject' ? 'returned' : 'submitted';
      } else x.status = 'submitted';
    });
    RH.ui.dvDraft = null;
    C.closeModal();
    const now = findItem(id).item;
    C.toast(now.status === 'returned' ? 'Sent back: ' + (now.verdict.comment || 'it does not meet the deliverable yet.') : now.status === 'verified' ? 'Verified and handed in' : 'Handed in');
  };

  RH.onSubmit.commitForm = function (f) {
    const sig = String(new FormData(f).get('sig') || '').trim();
    if (!sig) { C.toast('Type your name to sign.'); return; }
    const ws = D.currentWs();
    store.update(function (s) { const w = s.deliv.weeks[ws]; w.committedAt = Date.now(); w.signature = sig.slice(0, 60); if (!s.profile.name) s.profile.name = sig.split(' ')[0].slice(0, 40); });
    C.toast('Committed. Deadline ' + U.fmt(D.deadline(ws).date, { weekday: 'long' }) + ' ' + st().deliv.settings.time);
  };
  RH.onSubmit.dvAddForm = function (f) {
    const d = new FormData(f), title = String(d.get('title') || '').trim();
    if (!title) { C.toast('Give it a name.'); return; }
    const ws = D.currentWs();
    store.update(function (s) { s.deliv.weeks[ws].items.push({ id: 'v' + U.uid(), kind: 'custom', status: 'open', files: [], title: title.slice(0, 120), detail: String(d.get('detail') || '').slice(0, 400), subject: String(d.get('subject') || ''), ev: String(d.get('ev')) === 'text' ? ['text', 'photo'] : ['photo', 'text'] }); });
    C.closeModal();
  };

  D.report = function (ws) {
    const s = st(), w = s.deliv.weeks[ws];
    if (!w) return '';
    const lines = [(s.profile.name || 'My') + (s.profile.name ? "'s" : '') + ' revision deliverables, week of ' + U.fmtShort(ws) + (s.deliv.settings.partner ? ' (for ' + s.deliv.settings.partner + ')' : '')];
    if (w.committedAt) lines.push('Committed: ' + new Date(w.committedAt).toLocaleString('en-GB') + ' (signed ' + w.signature + ')');
    lines.push('Deadline: ' + U.fmt(D.deadline(ws).date, { weekday: 'long', day: 'numeric', month: 'short' }) + ' ' + s.deliv.settings.time, '');
    w.items.forEach(function (it) {
      const status = D.statusOf(it, ws), p = D.KINDS[it.kind] && D.KINDS[it.kind].auto ? D.progress(it, ws) : null;
      lines.push((D.isDone(status) ? '[x] ' : '[ ] ') + it.title + ' — ' + STATUS[status][0] + (p ? ' (' + (it.kind === 'focus' ? U.dur(p.val) + ' of ' + U.dur(p.target) : p.val + ' of ' + p.target) + ')' : '') + (it.score != null ? ' — score ' + it.score + (it.of ? '/' + it.of : '') : '') + (it.verdict ? ' — AI: ' + it.verdict.verdict : ''));
    });
    const sum = w.items.filter((it) => D.isDone(D.statusOf(it, ws))).length;
    lines.push('', sum + ' of ' + w.items.length + ' delivered.');
    return lines.join('\n');
  };

  // ---------- Actions ----------
  RH.actions['dv-submit'] = (el) => openSubmit(el.dataset.id);
  RH.actions['dv-week'] = function (el) {
    const ws = U.addDays(RH.ui.dvWeek || D.currentWs(), Number(el.dataset.v));
    RH.ui.dvWeek = ws > D.currentWs() ? null : ws;
    RH.render({ keepScroll: true });
  };
  RH.actions['dv-show'] = (el) => { RH.ui.dvWeek = el.dataset.ws; RH.render(); window.scrollTo(0, 0); };
  RH.actions['dv-report'] = (el) => C.copyText(D.report(el.dataset.ws), 'Weekly report copied. Paste it into a message.');
  RH.actions['dv-regen'] = function () {
    const ws = D.currentWs();
    store.update(function (s) { const old = s.deliv.weeks[ws]; const rec = D.generate(s, ws); rec.items = old.items.filter((x) => x.carried || x.kind === 'custom' || x.kind === 'catchup').concat(rec.items).slice(0, 10); s.deliv.weeks[ws] = rec; });
    C.toast('List rebuilt from this week’s plan');
  };
  RH.actions['dv-add'] = function () {
    C.openModal('Add your own deliverable', '<form id="dvAddForm" class="stack-form"><label class="field"><span>What you will hand in</span><input name="title" required placeholder="e.g. Maths homework: integration worksheet"></label>' +
      '<label class="field"><span>Details (optional)</span><textarea name="detail" rows="3"></textarea></label><div class="form-grid">' +
      '<label class="field"><span>Subject</span><select name="subject"><option value="">None</option>' + M.subjects.map((x) => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Proof</span><select name="ev"><option value="photo">A photo</option><option value="text">Writing</option></select></label></div>' +
      '<div class="row-actions"><button type="submit" class="btn">Add</button></div></form>');
  };
  RH.actions['dv-miss'] = (el) => updateItem(el.dataset.id, (x) => { x.status = 'missed'; });
  RH.actions['dv-excuse'] = function (el) {
    C.openModal('Excuse this deliverable', '<form id="dvExcuseForm" class="stack-form" data-id="' + el.dataset.id + '"><label class="field"><span>Why couldn’t you do it?</span><textarea name="why" rows="3" required placeholder="e.g. Ill on Thursday and Friday"></textarea></label><p class="help">Excused work does not carry over and does not break your streak. Keep it honest: the reason goes on your weekly report.</p><div class="row-actions"><button type="submit" class="btn">Excuse it</button></div></form>');
  };
  RH.onSubmit.dvExcuseForm = function (f) {
    const why = String(new FormData(f).get('why') || '').trim();
    if (why.length < 8) { C.toast('Give a real reason.'); return; }
    updateItem(f.dataset.id, (x) => { x.status = 'excused'; x.excuse = why.slice(0, 300); });
    C.closeModal();
  };
  RH.actions['dv-close'] = function (el) {
    const ws = el.dataset.ws, cur = D.currentWs();
    D.week(cur);
    store.update(function (s) {
      const w = s.deliv.weeks[ws];
      w.items.forEach((it) => { const stt = D.statusOf(it, ws); if (!D.isDone(stt) && it.status !== 'excused') it.status = 'missed'; });
      const counted = w.items.filter((it) => it.status !== 'excused');
      w.score = counted.length ? counted.filter((it) => D.isDone(D.statusOf(it, ws))).length / counted.length : 1;
      w.reviewedAt = Date.now();
      const missed = w.items.filter((it) => it.status === 'missed');
      const next = s.deliv.weeks[cur];
      if (missed.length && next) {
        if (s.deliv.settings.carry) missed.filter((it) => !(D.KINDS[it.kind] || {}).auto && !it.carried).forEach(function (it) {
          next.items.unshift({ id: 'v' + U.uid(), kind: it.kind, subject: it.subject, topic: it.topic, exam: it.exam, target: it.target, ev: it.ev, title: it.title, detail: it.detail, status: 'open', files: [], carried: ws });
        });
        if (s.deliv.settings.strict) next.items.push({ id: 'v' + U.uid(), kind: 'catchup', status: 'open', files: [], target: 15, title: 'Catch-up: 15 extra marks of exam questions', detail: 'You missed work last week. Do 15 marks of exam questions in your weakest subject, mark them, and upload a photo with your score.' });
      }
    });
    C.toast('Week closed');
  };

  RH.onChange.push(function (el) {
    if (!el.dataset.dvset) return false;
    const k = el.dataset.dvset;
    store.update(function (s) { s.deliv.settings[k] = el.type === 'checkbox' ? el.checked : (k === 'day' || k === 'count') ? Number(el.value) : el.value; });
    return true;
  });
  RH.actions['img-del'] = function (el) {
    const g = el.dataset.group, i = Number(el.dataset.i);
    if (g === 'dv' && RH.ui.dvDraft) { RH.ui.dvDraft.photos.splice(i, 1); $('#dv-thumbs').innerHTML = C.thumbs(RH.ui.dvDraft.photos, 'dv', true); return; }
    if (RH.checker && RH.checker.removeImage) RH.checker.removeImage(g, i);
  };
})(window.RH = window.RH || {});
