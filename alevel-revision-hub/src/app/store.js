/* Saved state. Always kept in this browser; when the page runs on claude.ai it also syncs to the
   signed-in person's private storage so progress follows them between devices. */
(function (RH) {
  'use strict';
  const KEY = 'alevel-revision-hub:v1';
  const MAX_DOC = 250000; // the cloud store caps each document at 256 KiB

  const S = RH.store = { state: null, sync: 'local', listeners: [] };

  function defaults() {
    return {
      v: 1, updatedAt: 0,
      profile: { name: '', fmOptions: null, theme: 'system', welcomed: false },
      topics: {},
      exams: { off: {}, custom: [] },
      plan: { settings: RH.PLAN_DEFAULTS(), sessions: [], builtAt: 0, settingsAt: 0 },
      papers: [],
      activity: {},
      ratedAt: 0
    };
  }

  // Fill in anything missing from an older or imported save.
  function normalise(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    const s = Object.assign(d, raw);
    s.profile = Object.assign(defaults().profile, raw.profile || {});
    s.exams = Object.assign(defaults().exams, raw.exams || {});
    s.exams.off = s.exams.off || {};
    s.exams.custom = Array.isArray(s.exams.custom) ? s.exams.custom : [];
    const plan = raw.plan || {};
    s.plan = Object.assign(defaults().plan, plan);
    s.plan.settings = Object.assign(RH.PLAN_DEFAULTS(), plan.settings || {});
    s.plan.settings.subj = Object.assign(RH.PLAN_DEFAULTS().subj, (plan.settings || {}).subj || {});
    s.plan.sessions = Array.isArray(plan.sessions) ? plan.sessions : [];
    s.topics = s.topics && typeof s.topics === 'object' ? s.topics : {};
    s.papers = Array.isArray(s.papers) ? s.papers : [];
    s.activity = s.activity && typeof s.activity === 'object' ? s.activity : {};
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
  S.update = function (fn, opts) {
    fn(S.state);
    S.state.updatedAt = Date.now();
    if (opts && opts.plan) planDirty = true;
    writeLocal();
    schedulePush();
    if (!(opts && opts.silent)) emit('change');
  };

  // ---- Cloud sync (claude.ai only) ----
  let cloud = null, timer = null, inflight = false, again = false, planDirty = true;

  function stateDoc(st) {
    const body = clone(st);
    delete body.plan.sessions;
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
      if (JSON.stringify(body).length > MAX_DOC || (planDirty && JSON.stringify(planBody).length > MAX_DOC)) {
        S.sync = 'cloud-full';
      } else {
        await cloud.state.set(body);
        if (planDirty) { planDirty = false; await cloud.plan.set(planBody); }
        S.sync = 'cloud';
      }
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
      const refs = { state: db.doc('data/users/' + id + '/state'), plan: db.doc('data/users/' + id + '/plan') };
      const snaps = await Promise.all([refs.state.get(), refs.plan.get()]);
      cloud = refs;
      const remote = snaps[0].exists ? clone(snaps[0].data()) : null;
      if (remote && (remote.updatedAt || 0) > (S.state.updatedAt || 0)) {
        const plan = snaps[1].exists ? clone(snaps[1].data()) : {};
        remote.plan = Object.assign(remote.plan || {}, { sessions: plan.sessions || [], builtAt: plan.builtAt || 0 });
        S.state = normalise(remote);
        S.isNew = false;
        writeLocal();
        S.sync = 'cloud';
        emit('remote');
      } else {
        S.sync = 'cloud';
        if (S.state.updatedAt) { planDirty = true; push(); } else emit('sync');
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
    S.state = normalise(raw);
    S.update(() => {}, { plan: true });
  };
  S.reset = function () {
    S.state = defaults();
    S.update(() => {}, { plan: true });
  };
  S.defaults = defaults;
})(window.RH = window.RH || {});
