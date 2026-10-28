/* Shared interface pieces: icons, tags, bars, ratings, resource lists, video cards, tabs, toasts, dialogs, files. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, esc = U.esc;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const C = RH.c = {};
  RH.$ = $;
  // Feature modules register into these: pages, click actions, tab-switch hooks and change handlers.
  RH.views = RH.views || {};
  RH.actions = RH.actions || {};
  RH.onTab = RH.onTab || {};
  RH.onChange = RH.onChange || [];
  RH.onInput = RH.onInput || [];
  RH.onSubmit = RH.onSubmit || {};
  RH.afterRender = RH.afterRender || [];

  // Per-visit interface state (which tab, which week, filters). Not saved.
  RH.ui = { week: null, filter: {}, tabs: {}, justDone: null, fmDraft: null, testSubj: 'physics', paperSubj: 'physics' };
  C.tab = (group, fallback) => RH.ui.tabs[group] || fallback;

  // ---------- Icons ----------
  const P = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-6h4v6"/>',
    today: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    plan: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    exams: '<path d="M6.5 3h8l4 4v14h-12z"/><path d="M14 3v5h4.5M9.5 12.5h6M9.5 16.5h4"/>',
    portal: '<path d="M6 3h8l4 4v6"/><path d="M14 3v5h4"/><path d="M6 3v18h6"/><circle cx="17" cy="17.5" r="4"/><path d="M17 15.5v2l1.3 1"/>',
    cards: '<rect x="3" y="6" width="13" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><path d="M7 12h5M7 15.5h3"/>',
    book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5z"/><path d="M5 19.5A2.5 2.5 0 0 0 7.5 22H19v-5"/>',
    log: '<path d="M5 20v-7M11 20V6M17 20v-4M3 20h18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    prefs: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.5M9.5 2.5h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    later: '<path d="M4 12h11M11 7l5 5-5 5M20 5v14"/>',
    trash: '<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13h9l1-13"/>',
    flame: '<path d="M12 3c.8 3.4 5 5.4 5 10a5 5 0 0 1-10 0c0-2.1 1-3.6 2-4.6.1 1.8.9 2.9 2 3.1-.1-3.2-.6-5.6 1-8.5z"/>',
    rebuild: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    notes: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    qs: '<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17" r=".6"/><circle cx="12" cy="12" r="9"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    shuffle: '<path d="M4 7h3c4 0 6 10 10 10h3M4 17h3c1.5 0 2.7-1.3 3.7-3M14 10c1-1.7 2.2-3 3.7-3H20"/><path d="M18 4l2 3-2 3M18 14l2 3-2 3"/>',
    swap: '<path d="M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
  };
  C.icon = (n, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>';

  const TAG = { physics: 'PHY', maths: 'MAT', further: 'FM', economics: 'ECO' };
  C.TAG = TAG;
  C.stag = (sid) => '<span class="stag" data-subj="' + sid + '">' + (TAG[sid] || '') + '</span>';

  // ---------- Small components ----------
  C.stack = function (n, label) {
    const total = n[0] + n[1] + n[2] + n[3];
    const segs = [3, 2, 1, 0].map((c) => n[c] ? '<span class="seg c' + c + '" style="flex-grow:' + n[c] + '"></span>' : '').join('');
    const aria = (label ? label + ': ' : '') + n[3] + ' green, ' + n[2] + ' amber, ' + n[1] + ' red, ' + n[0] + ' not started';
    return '<div class="stack" role="img" aria-label="' + esc(aria) + '">' + (total ? segs : '<span class="seg c0" style="flex-grow:1"></span>') + '</div>';
  };

  C.ragDots = function (gid, c) {
    return '<div class="rag-dots" role="group" aria-label="Confidence">' + [1, 2, 3].map((v) =>
      '<button type="button" class="rd c' + v + (c === v ? ' on' : '') + '" data-action="rate" data-id="' + gid + '" data-v="' + v + '" data-toggle="1" aria-pressed="' + (c === v) + '" title="' + M.CONF[v].label + ': ' + M.CONF[v].hint + '"><span class="sr">' + M.CONF[v].label + '</span></button>').join('') + '</div>';
  };
  C.ragFull = function (gid, c, compact) {
    return '<div class="rag-full' + (compact ? ' compact' : '') + '" role="radiogroup" aria-label="How confident are you?">' + [0, 1, 2, 3].map((v) =>
      '<button type="button" class="rf c' + v + (c === v ? ' on' : '') + '" role="radio" aria-checked="' + (c === v) + '" data-action="rate" data-id="' + gid + '" data-v="' + v + '"><span class="rf-dot"></span><span class="rf-l">' + M.CONF[v].label + '</span>' + (compact ? '' : '<span class="rf-h">' + (v ? M.CONF[v].hint : 'Not rated yet') + '</span>') + '</button>').join('') + '</div>';
  };

  C.site = function (r) {
    const s = RH.SITES[r.s] || { short: r.s === 'mine' ? 'Mine' : r.s };
    return '<span class="site" data-site="' + r.s + '">' + esc(s.short) + '</span>';
  };
  C.resLink = (r) => '<li><a class="res" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + C.site(r) + '<span class="res-t">' + esc(r.t) + '</span>' + C.icon('ext', 'i-ext') + '</a></li>';
  C.resList = (list) => '<ul class="res-list">' + list.map(C.resLink).join('') + '</ul>';
  C.resGroups = function (list, kinds) {
    const groups = {};
    list.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
    return Object.keys(RH.KINDS).filter((k) => groups[k] && (!kinds || kinds.indexOf(k) !== -1)).map((k) =>
      '<section class="res-group"><h3 class="label">' + RH.KINDS[k] + ' <span class="muted">' + groups[k].length + '</span></h3>' + C.resList(groups[k]) + '</section>').join('');
  };

  // Video cards. Thumbnails load only where the page may fetch YouTube images (not inside claude.ai).
  C.canThumb = !(window.claude && typeof window.claude.use === 'function');
  const CH = { gale: "Mr Gale's pick", econdal: 'EconplusDal', bicen: 'Bicen Maths', phyo: 'Physics Online', gill: 'Mr Gill', fcm: '1st Class Maths', tlm: 'TLMaths', exs: 'ExamSolutions', cog: 'Cognito' };
  C.videoCard = function (v, sid) {
    const url = 'https://www.youtube.com/watch?v=' + v.id;
    return '<a class="vcard" href="' + url + '" target="_blank" rel="noopener" data-subj="' + (sid || '') + '">' +
      '<span class="vthumb">' + (C.canThumb ? '<img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg" onerror="this.remove()">' : '') + '<span class="vplay">' + C.icon('play') + '</span></span>' +
      '<span class="vmeta"><span class="vch">' + esc(CH[v.ch] || v.ch) + '</span><span class="vt">' + esc(v.title) + '</span></span></a>';
  };
  C.videoGrid = (list, sid) => '<div class="vgrid">' + list.map((v) => C.videoCard(v, sid)).join('') + '</div>';

  // Tabs inside a page. Switching is handled by the "tab" action and kept for the visit.
  C.tabs = function (group, items, active) {
    return '<div class="tabs" role="tablist">' + items.map((it) => {
      const on = it[0] === active;
      return '<button type="button" role="tab" class="tab-b' + (on ? ' on' : '') + '" aria-selected="' + on + '" data-action="tab" data-group="' + group + '" data-v="' + it[0] + '">' + (it[2] ? C.icon(it[2]) : '') + '<span>' + it[1] + '</span>' + (it[3] != null ? '<span class="tab-n mono">' + it[3] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  };

  C.head = function (eyebrow, title, lede, right) {
    return '<header class="page-head"><div class="ph-text">' + (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') + '<h1>' + title + '</h1>' + (lede ? '<p class="lede">' + lede + '</p>' : '') + '</div>' + (right ? '<div class="ph-right">' + right + '</div>' : '') + '</header>';
  };
  C.crumbs = (items) => '<nav class="crumbs" aria-label="Breadcrumb">' + items.map((x, i) => (i ? '<span aria-hidden="true">/</span>' : '') + (x[1] ? '<a href="#' + x[1] + '">' + esc(x[0]) + '</a>' : '<span>' + esc(x[0]) + '</span>')).join('') + '</nav>';
  C.daysTo = (d) => U.diff(U.today(), d);
  C.countdownBadge = function (d) {
    const n = C.daysTo(d);
    return '<span class="cd mono' + (n <= 7 ? ' soon' : '') + '">' + (n === 0 ? 'Today' : n === 1 ? '1 day' : n + ' days') + '</span>';
  };
  C.empty = (title, body, action) => '<div class="empty"><p><b>' + title + '</b> ' + (body || '') + '</p>' + (action || '') + '</div>';

  // ---------- Toasts & dialogs ----------
  C.toast = function (msg) {
    const root = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2800);
  };
  RH.toast = C.toast;

  let modalCleanup = null, lastFocus = null;
  C.openModal = function (title, body, opts) {
    C.closeModal();
    lastFocus = document.activeElement;
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-bg" data-action="modal-close"></div><div class="modal' + (opts && opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title"' + (opts && opts.subj ? ' data-subj="' + opts.subj + '"' : '') + '>' +
      '<div class="modal-head"><h2 id="modal-title">' + title + '</h2><button type="button" class="btn-icon" data-action="modal-close" aria-label="Close">' + C.icon('x') + '</button></div><div class="modal-body">' + body + '</div></div>';
    root.hidden = false;
    const first = root.querySelector('.modal-body button, .modal-body a, .modal-body input, .modal-body textarea');
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
    C.openModal(esc(title), '<p>' + esc(text) + '</p><div class="row-actions"><button type="button" class="btn danger-fill" data-action="confirm-yes">' + esc(yesLabel) + '</button><button type="button" class="btn-ghost" data-action="modal-close">Cancel</button></div>');
  };
  C.confirmYes = function () { const f = pendingConfirm; pendingConfirm = null; C.closeModal(); if (f) f(); };

  // ---------- Sound ----------
  // Browsers only allow sound after a click, so the first click on a timer "unlocks" it.
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
      const notes = kind === 'warn' ? [880] : kind === 'end' ? [523, 659, 784, 1047] : [660, 880, 990];
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

  // Load a library script once, from cdnjs.
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
})(window.RH = window.RH || {});
