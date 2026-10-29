/* Saved state. Always kept in this browser; when the page runs on claude.ai it also syncs to the
   signed-in person's private storage so progress follows them between devices.
   Cloud layout (one private folder per person): state, plan, and one document per flashcard deck. */
(function (RH) {
  'use strict';
  const KEY = 'alevel-revision-hub:v1';
  const MAX_DOC = 250000; // the cloud store caps each document at 256 KiB

  const S = RH.store = { state: null, sync: 'local', listeners: [] };

  function defaults() {
    return {
      v: 2, updatedAt: 0,
      profile: { name: '', fmOptions: null, theme: 'system', welcomed: false },
      topics: {},
      exams: { off: {}, custom: [] },
      plan: { settings: RH.PLAN_DEFAULTS(), sessions: [], builtAt: 0, settingsAt: 0 },
      papers: [],
      activity: {},
      decks: {},
      portal: { papers: {}, attempts: [] },
      prefs: { pomo: { focus: 25, short: 5, long: 15, cycles: 4, auto: true, sound: true }, cardsDaily: 50 },
      routine: RH.ROUTINE_DEFAULTS(),
      deliv: { settings: { day: 6, time: '20:00', count: 6, strict: true, carry: true, partner: '' }, weeks: {} },
      checks: [],
      focus: { log: [], prefs: { pauseAway: true, awaySecs: 20, sideways: true, chime: true } },
      cardLog: {},
      ratedAt: 0
    };
  }

  const obj = (x) => x && typeof x === 'object' && !Array.isArray(x);

  // Fill in anything missing from an older or imported save.
  function normalise(raw) {
    const d = defaults();
    if (!obj(raw)) return d;
    const s = Object.assign(d, raw);
    s.profile = Object.assign(defaults().profile, raw.profile || {});
    s.exams = Object.assign(defaults().exams, raw.exams || {});
    s.exams.off = obj(s.exams.off) ? s.exams.off : {};
    s.exams.custom = Array.isArray(s.exams.custom) ? s.exams.custom : [];
    const plan = raw.plan || {};
    s.plan = Object.assign(defaults().plan, plan);
    s.plan.settings = Object.assign(RH.PLAN_DEFAULTS(), plan.settings || {});
    s.plan.settings.subj = Object.assign(RH.PLAN_DEFAULTS().subj, (plan.settings || {}).subj || {});
    s.plan.sessions = Array.isArray(plan.sessions) ? plan.sessions : [];
    s.topics = obj(s.topics) ? s.topics : {};
    s.papers = Array.isArray(s.papers) ? s.papers : [];
    s.activity = obj(s.activity) ? s.activity : {};
    s.decks = obj(s.decks) ? s.decks : {};
    s.portal = Object.assign(defaults().portal, obj(raw.portal) ? raw.portal : {});
    s.portal.papers = obj(s.portal.papers) ? s.portal.papers : {};
    s.portal.attempts = Array.isArray(s.portal.attempts) ? s.portal.attempts : [];
    s.prefs = Object.assign(defaults().prefs, obj(raw.prefs) ? raw.prefs : {});
    s.prefs.pomo = Object.assign(defaults().prefs.pomo, (raw.prefs || {}).pomo || {});
    s.routine = RH.routine.normalise(raw.routine, (raw.plan || {}).settings);
    const dv = obj(raw.deliv) ? raw.deliv : {};
    s.deliv = { settings: Object.assign(defaults().deliv.settings, dv.settings || {}), weeks: obj(dv.weeks) ? dv.weeks : {} };
    s.checks = Array.isArray(raw.checks) ? raw.checks : [];
    const fc = obj(raw.focus) ? raw.focus : {};
    s.focus = { log: Array.isArray(fc.log) ? fc.log : [], prefs: Object.assign(defaults().focus.prefs, fc.prefs || {}) };
    s.cardLog = obj(raw.cardLog) ? raw.cardLog : {};
    s.v = 3;
    return s;
  }

  const clone = (x) => JSON.parse(JSON.stringify(x));

  function readLocal() {
    try { const t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function writeLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(S.state)); return true; } catch (e) { return false; }
  }

  function emit(why) { S.listeners.forEach((fn) => { try { fn(why); } catch (e) { console.error(e); } }); }
  S.on = (fn) => { S.listeners.push(fn); };

  S.load = function () {
    S.state = normalise(readLocal());
    S.isNew = !S.state.updatedAt;
    return S.state;
  };

  // Change state through here so every change is saved and the page re-renders.
  // opts.plan marks the plan dirty; opts.decks lists deck ids that changed (or were deleted); opts.checks marks AI checks dirty.
  S.update = function (fn, opts) {
    fn(S.state);
    S.state.updatedAt = Date.now();
    if (opts && opts.plan) planDirty = true;
    if (opts && opts.checks) checksDirty = true;
    if (opts && opts.decks) opts.decks.forEach((id) => { deckDirty[id] = 1; });
    writeLocal();
    schedulePush();
    if (!(opts && opts.silent)) emit('change');
  };

  // ---- Cloud sync (claude.ai only) ----
  let cloud = null, timer = null, inflight = false, again = false, planDirty = true, checksDirty = true;
  // The newest AI checks that fit in one cloud document.
  function checksDoc(st) {
    const list = [];
    let size = 200;
    for (const c of st.checks) { const n = JSON.stringify(c).length + 1; if (size + n > MAX_DOC) break; size += n; list.push(c); }
    return { checks: list, updatedAt: st.updatedAt };
  }
  let deckDirty = {};

  function stateDoc(st) {
    const body = clone(st);
    delete body.plan.sessions;
    body.deckIds = Object.keys(st.decks || {});
    delete body.decks;
    delete body.checks;
    return body;
  }

  function schedulePush() {
    if (!cloud) return;
    clearTimeout(timer);
    timer = setTimeout(push, 1500);
  }

  async function push() {
    if (!cloud) return;
    if (inflight) { again = true; return; }
    inflight = true;
    try {
      const st = S.state;
      const body = stateDoc(st);
      const planBody = { sessions: st.plan.sessions, builtAt: st.plan.builtAt, updatedAt: st.updatedAt };
      let full = JSON.stringify(body).length > MAX_DOC || (planDirty && JSON.stringify(planBody).length > MAX_DOC);
      if (!full) {
        await cloud.state.set(body);
        if (planDirty) { planDirty = false; await cloud.plan.set(planBody); }
        if (checksDirty) { checksDirty = false; await cloud.user.doc('checks').set(checksDoc(st)); }
        const ids = Object.keys(deckDirty);
        deckDirty = {};
        for (const id of ids) {
          const ref = cloud.user.doc('deck-' + id);
          const deck = st.decks[id];
          if (!deck) { await ref.delete(); continue; }
          const d = { deck: deck, updatedAt: st.updatedAt };
          if (JSON.stringify(d).length > MAX_DOC) { full = true; continue; }
          await ref.set(d);
        }
      }
      S.sync = full ? 'cloud-full' : 'cloud';
    } catch (e) {
      S.sync = e && e.code === 'quota_exceeded' ? 'cloud-full' : 'cloud-error';
    } finally {
      inflight = false;
      emit('sync');
      if (again) { again = false; schedulePush(); }
    }
  }

  S.connect = async function () {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') return;
    try {
      const both = await Promise.all([c.use('db'), c.use('user')]);
      const db = both[0], user = both[1];
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const folder = db.collection('data/users/' + id);
      const refs = { state: folder.doc('state'), plan: folder.doc('plan'), user: folder };
      const snaps = await Promise.all([refs.state.get(), refs.plan.get()]);
      cloud = refs;
      const remote = snaps[0].exists ? clone(snaps[0].data()) : null;
      if (remote && (remote.updatedAt || 0) > (S.state.updatedAt || 0)) {
        const plan = snaps[1].exists ? clone(snaps[1].data()) : {};
        remote.plan = Object.assign(remote.plan || {}, { sessions: plan.sessions || [], builtAt: plan.builtAt || 0 });
        remote.decks = {};
        const deckSnaps = await Promise.all((remote.deckIds || []).map((d) => folder.doc('deck-' + d).get()));
        deckSnaps.forEach((snap, i) => { if (snap.exists) remote.decks[remote.deckIds[i]] = clone(snap.data()).deck; });
        delete remote.deckIds;
        const ck = await folder.doc('checks').get();
        remote.checks = ck.exists ? (clone(ck.data()).checks || []) : [];
        S.state = normalise(remote);
        S.isNew = false;
        writeLocal();
        S.sync = 'cloud';
        emit('remote');
      } else {
        S.sync = 'cloud';
        if (S.state.updatedAt) {
          planDirty = true; checksDirty = true;
          Object.keys(S.state.decks).forEach((d) => { deckDirty[d] = 1; });
          push();
        } else emit('sync');
      }
    } catch (e) {
      cloud = null;
      S.sync = 'local';
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && cloud && timer) { clearTimeout(timer); timer = null; push(); }
  });

  // ---- Backup ----
  S.exportJSON = () => JSON.stringify(Object.assign({ app: 'alevel-revision-hub' }, S.state), null, 1);
  S.importJSON = function (text) {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || !raw.profile || !raw.topics) throw new Error('That file is not a Revision Hub backup.');
    delete raw.app;
    const before = Object.keys(S.state.decks);
    S.state = normalise(raw);
    S.update(() => {}, { plan: true, checks: true, decks: before.concat(Object.keys(S.state.decks)) });
  };
  S.reset = function () {
    const before = Object.keys(S.state.decks);
    S.state = defaults();
    S.update(() => {}, { plan: true, checks: true, decks: before });
  };
  S.defaults = defaults;

  // ---- Uploaded files (exam PDFs) stay in this browser's IndexedDB ----
  const DB_NAME = 'alevel-revision-hub-files';
  function idb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('This browser cannot store files.')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('File storage is blocked in this browser.'));
    });
  }
  // If the browser blocks IndexedDB (private windows, some embeds), files are kept for this visit only.
  const memFiles = {};
  RH.files = {
    put: async function (key, blob) {
      memFiles[key] = blob;
      try {
        const db = await idb();
        await new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(blob, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
        delete memFiles[key];
        return true;
      } catch (e) { return false; }
    },
    get: async function (key) {
      if (memFiles[key]) return memFiles[key];
      try {
        const db = await idb();
        return await new Promise((res) => { const r = db.transaction('files').objectStore('files').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
      } catch (e) { return null; }
    },
    del: async function (key) {
      delete memFiles[key];
      try {
        const db = await idb();
        await new Promise((res) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); });
      } catch (e) { /* nothing stored */ }
    }
  };
})(window.RH = window.RH || {});
