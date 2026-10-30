/* Shared interface kit: icons, page headers, section menus, tags, chips, bars, rings, dialogs, toasts, files. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, esc = U.esc;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const C = RH.c = {};
  RH.$ = $;
  // Feature modules register pages, click actions, tab hooks and form handlers here.
  RH.views = RH.views || {};
  RH.actions = RH.actions || {};
  RH.onTab = RH.onTab || {};
  RH.onChange = RH.onChange || [];
  RH.onInput = RH.onInput || [];
  RH.onSubmit = RH.onSubmit || {};
  RH.afterRender = RH.afterRender || [];

  // Per-visit interface state. Not saved.
  RH.ui = { week: null, day: null, tabs: {}, justDone: null, fmDraft: null, testSubj: 'physics', paperSubj: 'physics' };
  C.tab = (group, fallback) => RH.ui.tabs[group] || fallback;

  // ---------- Icons (24px, 1.75 stroke) ----------
  const P = {
    home: '<path d="M4 10.5L12 4l8 6.5"/><path d="M6 9v11h12V9"/><path d="M10 20v-5h4v5"/>',
    study: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',
    plan: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6"/>',
    check: '<path d="M14.5 4.5l5 5L9 20H4v-5z"/><path d="M12.5 6.5l5 5"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.5M9.5 2.5h5"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    later: '<path d="M4 12h11M11 7l5 5-5 5M20 5v14"/>',
    trash: '<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13h9l1-13"/>',
    flame: '<path d="M12 3c.8 3.4 5 5.4 5 10a5 5 0 0 1-10 0c0-2.1 1-3.6 2-4.6.1 1.8.9 2.9 2 3.1-.1-3.2-.6-5.6 1-8.5z"/>',
    rebuild: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    notes: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    qs: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17" r=".6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    cards: '<rect x="3" y="6" width="13" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    paper: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    school: '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c3 2 7 2 10 0v-4.5"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    swap: '<path d="M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    book: '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19"/>',
    pcircle: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/>',
    brain: '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.5A3 3 0 0 0 8 17.5a2.5 2.5 0 0 0 4 1.5V6a2.5 2.5 0 0 0-3-1.5zM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.5A3 3 0 0 1 16 17.5a2.5 2.5 0 0 1-4 1.5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  C.icon = (n, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>';

  // ---------- Subject tags ----------
  const TAG = { physics: 'PHY', maths: 'MAT', further: 'FM', economics: 'ECO' };
  C.TAG = TAG;
  C.stag = (sid, long) => sid ? '<span class="tag" data-subj="' + sid + '">' + (long ? esc(M.subject[sid].name) : TAG[sid] || '') + '</span>' : '';
  C.chip = (text, tone, icon) => '<span class="chip' + (tone ? ' ' + tone : '') + '">' + (icon ? C.icon(icon) : '') + text + '</span>';

  // ---------- Page furniture ----------
  C.page = function (o) {
    return '<header class="page-head"><div class="ph-text">' + (o.eyebrow ? '<p class="eyebrow">' + o.eyebrow + '</p>' : '') +
      '<h1>' + o.title + '</h1>' + (o.lede ? '<p class="lede">' + o.lede + '</p>' : '') + '</div>' + (o.actions ? '<div class="ph-actions">' + o.actions + '</div>' : '') + '</header>';
  };
  C.head = (eyebrow, title, lede, actions) => C.page({ eyebrow: eyebrow, title: title, lede: lede, actions: actions });
  C.crumbs = (items) => '<nav class="crumbs" aria-label="Breadcrumb">' + items.map((x, i) => (i ? '<span class="sep" aria-hidden="true">/</span>' : '') + (x[1] ? '<a href="#' + x[1] + '">' + esc(x[0]) + '</a>' : '<span aria-current="page">' + esc(x[0]) + '</span>')).join('') + '</nav>';

  // The five areas in the top menu, and the pages each one lists in the bar under it.
  RH.AREAS = {
    home: { label: 'Home', icon: 'home', href: 'home', pages: [] },
    learn: { label: 'Learn', icon: 'study', href: 'study', pages: [['study', 'All subjects'], ['s-physics', 'Physics', 'physics'], ['s-maths', 'Maths', 'maths'], ['s-further', 'Further Maths', 'further'], ['s-economics', 'Economics', 'economics'], ['guide', 'How to revise'], ['library', 'Resources']] },
    practise: { label: 'Practise', icon: 'qs', href: 'papers', pages: [['papers', 'Past papers'], ['check', 'Check an answer'], ['checks', 'Marked answers'], ['cards', 'Flashcards']] },
    plan: { label: 'Plan', icon: 'plan', href: 'plan', pages: [['plan', 'This week'], ['deliverables', 'Deliverables'], ['routine', 'Routine'], ['exams', 'Exams'], ['strategy', 'Strategy']] },
    focus: { label: 'Focus', icon: 'focus', href: 'focus', pages: [] }
  };
  // Area menus are drawn once by the page frame (see views.js), so pages no longer add their own.
  C.subnav = () => '';

  // Tabs inside one page; switching is the "tab" action and is remembered for the visit.
  C.tabs = function (group, items, active) {
    return '<div class="tabs" role="tablist">' + items.map(function (it) {
      const on = it[0] === active;
      return '<button type="button" role="tab" class="tab' + (on ? ' on' : '') + '" aria-selected="' + on + '" data-action="tab" data-group="' + group + '" data-v="' + it[0] + '">' + (it[2] ? C.icon(it[2]) : '') + '<span>' + it[1] + '</span>' + (it[3] != null && it[3] !== '' ? '<span class="tab-n">' + it[3] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  };
  C.seg = function (items, active, attrs) {
    return '<div class="seg" role="group">' + items.map((it) => '<button type="button" class="' + (String(it[0]) === String(active) ? 'on' : '') + '" aria-pressed="' + (String(it[0]) === String(active)) + '" ' + attrs + ' data-v="' + it[0] + '">' + it[1] + '</button>').join('') + '</div>';
  };
  C.empty = (title, body, action) => '<div class="empty"><p class="empty-t">' + title + '</p>' + (body ? '<p class="muted">' + body + '</p>' : '') + (action ? '<div class="row-actions">' + action + '</div>' : '') + '</div>';

  // ---------- Measures ----------
  C.bar = (frac, tone, label) => '<div class="bar' + (tone ? ' ' + tone : '') + '" role="img" aria-label="' + esc(label || U.pct(frac)) + '"><span style="width:' + Math.round(100 * U.clamp(frac || 0, 0, 1)) + '%"></span></div>';
  C.ring = function (frac, inner, size, tone) {
    const r = 15.5, c = 2 * Math.PI * r, f = U.clamp(frac || 0, 0, 1);
    return '<span class="ring' + (tone ? ' ' + tone : '') + '" style="--sz:' + (size || 64) + 'px"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="' + r + '"/><circle class="ring-fg" cx="18" cy="18" r="' + r + '"' + (f ? '' : ' stroke-opacity="0"') + ' stroke-dasharray="' + (c * f).toFixed(2) + ' ' + c.toFixed(2) + '"/></svg><span class="ring-in">' + (inner || '') + '</span></span>';
  };
  C.stack = function (n, label) {
    const total = n[0] + n[1] + n[2] + n[3];
    const segs = [3, 2, 1, 0].map((c) => n[c] ? '<span class="seg-' + c + '" style="flex-grow:' + n[c] + '"></span>' : '').join('');
    const aria = (label ? label + ': ' : '') + n[3] + ' green, ' + n[2] + ' amber, ' + n[1] + ' red, ' + n[0] + ' not started';
    return '<div class="rag" role="img" aria-label="' + esc(aria) + '">' + (total ? segs : '<span class="seg-0" style="flex-grow:1"></span>') + '</div>';
  };
  C.ragDots = function (gid, c) {
    return '<div class="dots" role="group" aria-label="Confidence">' + [1, 2, 3].map((v) =>
      '<button type="button" class="dot c' + v + (c === v ? ' on' : '') + '" data-action="rate" data-id="' + gid + '" data-v="' + v + '" data-toggle="1" aria-pressed="' + (c === v) + '" title="' + M.CONF[v].label + ': ' + M.CONF[v].hint + '"><span class="sr">' + M.CONF[v].label + '</span></button>').join('') + '</div>';
  };
  C.ragFull = function (gid, c) {
    return '<div class="conf" role="radiogroup" aria-label="How confident are you?">' + [0, 1, 2, 3].map((v) =>
      '<button type="button" class="conf-b c' + v + (c === v ? ' on' : '') + '" role="radio" aria-checked="' + (c === v) + '" data-action="rate" data-id="' + gid + '" data-v="' + v + '"><span class="conf-dot"></span><span>' + (v ? M.CONF[v].label : 'Not started') + '</span></button>').join('') + '</div>';
  };
  C.daysTo = (d) => U.diff(U.today(), d);
  C.countdownChip = function (d) {
    const n = C.daysTo(d);
    return C.chip(n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n + ' days', n <= 7 ? 'warn' : '');
  };

  // ---------- Resources & videos ----------
  C.site = function (r) {
    const s = RH.SITES[r.s] || { short: r.s === 'mine' ? 'Mine' : r.s };
    return '<span class="site">' + esc(s.short) + '</span>';
  };
  C.resLink = (r) => '<li><a class="res" href="' + esc(r.u) + '" target="_blank" rel="noopener"><span class="res-t">' + esc(r.t) + '</span>' + C.site(r) + C.icon('ext', 'i-ext') + '</a></li>';
  C.resList = (list) => '<ul class="res-list">' + list.map(C.resLink).join('') + '</ul>';
  C.resGroups = function (list, kinds) {
    const groups = {};
    list.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
    return Object.keys(RH.KINDS).filter((k) => groups[k] && (!kinds || kinds.indexOf(k) !== -1)).map((k) =>
      '<section class="res-group"><h3 class="label">' + RH.KINDS[k] + ' <span class="muted">' + groups[k].length + '</span></h3>' + C.resList(groups[k]) + '</section>').join('');
  };
  // Thumbnails load only where the page may fetch YouTube images (not inside claude.ai).
  C.canThumb = !(window.claude && typeof window.claude.use === 'function');
  const CH = { gale: 'Mr Gale', econdal: 'EconplusDal', bicen: 'Bicen Maths', phyo: 'Physics Online', gill: 'Mr Gill', fcm: '1st Class Maths', tlm: 'TLMaths', exs: 'ExamSolutions', cog: 'Cognito' };
  C.channel = (ch) => CH[ch] || ch;
  C.videoCard = function (v, sid) {
    return '<a class="vcard" href="https://www.youtube.com/watch?v=' + v.id + '" target="_blank" rel="noopener" data-subj="' + (sid || '') + '">' +
      '<span class="vthumb">' + (C.canThumb ? '<img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg" onerror="this.remove()">' : '') + '<span class="vplay">' + C.icon('play') + '</span></span>' +
      '<span class="vmeta"><span class="vch">' + esc(CH[v.ch] || v.ch) + '</span><span class="vt">' + esc(v.title) + '</span></span></a>';
  };
  C.videoGrid = (list, sid) => '<div class="vgrid">' + list.map((v) => C.videoCard(v, sid)).join('') + '</div>';

  // ---------- Form bits ----------
  C.toggle = (attrs, label, on, help) => '<label class="toggle"><input type="checkbox" ' + attrs + (on ? ' checked' : '') + '><span class="tg" aria-hidden="true"></span><span class="tg-t"><b>' + label + '</b>' + (help ? '<span class="help">' + help + '</span>' : '') + '</span></label>';
  C.opts = (list, val) => list.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');

  // Object URLs for images held in memory, made once per blob.
  const urls = new WeakMap();
  C.blobURL = function (b) { if (!urls.has(b)) urls.set(b, URL.createObjectURL(b)); return urls.get(b); };
  C.thumbs = function (blobs, group, removable) {
    if (!blobs || !blobs.length) return '';
    return '<div class="thumbs">' + blobs.map((b, i) => '<figure class="thumb"><img src="' + C.blobURL(b) + '" alt="Photo ' + (i + 1) + '">' +
      (removable ? '<button type="button" class="thumb-x" data-action="img-del" data-group="' + group + '" data-i="' + i + '" aria-label="Remove photo ' + (i + 1) + '">' + C.icon('x') + '</button>' : '') + '</figure>').join('') + '</div>';
  };

  // ---------- Toasts & dialogs ----------
  C.toast = function (msg, opt) {
    const root = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    if (opt && opt.action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = opt.action;
      b.addEventListener('click', function () { el.remove(); opt.fn(); });
      el.appendChild(b);
    }
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, opt && opt.action ? 8000 : 3200);
  };
  RH.toast = C.toast;

  let modalCleanup = null, lastFocus = null;
  C.openModal = function (title, body, opts) {
    C.closeModal();
    lastFocus = document.activeElement;
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-bg" data-action="modal-close"></div><div class="modal' + (opts && opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title"' + (opts && opts.subj ? ' data-subj="' + opts.subj + '"' : '') + '>' +
      '<div class="modal-head"><h2 id="modal-title">' + title + '</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="Close">' + C.icon('x') + '</button></div><div class="modal-body">' + body + '</div></div>';
    root.hidden = false;
    const first = root.querySelector('.modal-body input:not([type="hidden"]), .modal-body textarea, .modal-body button, .modal-body a');
    if (first) first.focus();
    modalCleanup = opts && opts.onClose;
  };
  C.closeModal = function () {
    const root = $('#modal-root');
    if (root.hidden) return;
    root.hidden = true;
    root.innerHTML = '';
    if (modalCleanup) { const f = modalCleanup; modalCleanup = null; f(); }
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
  };
  C.modalOpen = () => !$('#modal-root').hidden;
  let pendingConfirm = null;
  C.confirm = function (title, text, yesLabel, onYes) {
    pendingConfirm = onYes;
    C.openModal(esc(title), '<p>' + esc(text) + '</p><div class="row-actions"><button type="button" class="btn danger" data-action="confirm-yes">' + esc(yesLabel) + '</button><button type="button" class="btn alt" data-action="modal-close">Cancel</button></div>');
  };
  C.confirmYes = function () { const f = pendingConfirm; pendingConfirm = null; C.closeModal(); if (f) f(); };

  // ---------- Sound ----------
  C.primeAudio = function () {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!C._audio) C._audio = new Ctx();
      if (C._audio.state === 'suspended') C._audio.resume();
    } catch (e) { /* sound is optional */ }
  };
  C.chime = function (kind) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = C._audio || (C._audio = new Ctx());
      const notes = kind === 'warn' ? [880] : kind === 'end' ? [523, 659, 784, 1047] : kind === 'away' ? [440, 330] : [660, 880, 990];
      notes.forEach(function (f, i) {
        const t = i * 0.22, o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
      });
    } catch (e) { /* sound is optional */ }
  };

  // ---------- Files ----------
  C.copyText = function (text, okMsg) {
    const done = () => C.toast(okMsg || 'Copied');
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { C.toast('Copy failed. Select the text and copy it yourself.'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  };
  C.saveFile = async function (name, text, mime) {
    const c = window.claude;
    const framed = window.top !== window;
    if (c && typeof c.use === 'function') {
      let dl = null;
      try { dl = await c.use('downloads'); } catch (e) { dl = null; }
      if (dl) {
        try { await dl.save({ filename: name, data: text }); C.toast('Saved ' + name); }
        catch (e) {
          if (e && e.code === 'declined') return;
          if (e && e.code === 'rate_limited') { C.toast('A save is already waiting for you to confirm.'); return; }
          C.copyText(text, 'This viewer cannot save ' + name.split('.').pop() + ' files, so the contents were copied. Paste them into a file named ' + name + '.');
        }
        return;
      }
      if (framed) { C.copyText(text, 'Copied. Paste into a file named ' + name + '.'); return; }
    }
    try {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      C.toast('Downloading ' + name);
    } catch (e) {
      C.copyText(text, 'Download was blocked, so the file contents were copied. Paste them into a file named ' + name + '.');
    }
  };
  const loading = {};
  C.loadScript = function (src) {
    if (!loading[src]) {
      loading[src] = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = src; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = () => resolve();
        s.onerror = () => { delete loading[src]; reject(new Error('Could not load ' + src.split('/').pop() + '. Check your internet connection.')); };
        document.head.appendChild(s);
      });
    }
    return loading[src];
  };
  // Pick image files from an <input type=file>, keeping only images.
  C.imageFiles = (input) => Array.prototype.slice.call(input.files || []).filter((f) => /^image\//.test(f.type));
})(window.RH = window.RH || {});
