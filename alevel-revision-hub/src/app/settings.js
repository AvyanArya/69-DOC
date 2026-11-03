/* Settings: you, Claude connection, Further Maths options, data and backups. */
(function (RH) {
  'use strict';
  const U = RH.util, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const V = RH.views;

  // One row: what it is on the left, the control on the right.
  const row = (title, help, control, cls) => '<div class="set-row' + (cls ? ' ' + cls : '') + '"><div class="sr-t"><b>' + title + '</b>' + (help ? '<span>' + help + '</span>' : '') + '</div><div class="sr-c">' + control + '</div></div>';
  const group = (id, icon, title, body) => '<section class="set-group" id="set-' + id + '"><h2>' + C.icon(icon) + title + '</h2><div class="set-card">' + body + '</div></section>';
  const SECTIONS = [['profile', 'user', 'Profile'], ['look', 'sun', 'Appearance'], ['study', 'book', 'Studying'], ['claude', 'spark', 'Claude'], ['fm', 'list', 'Further Maths'], ['data', 'download', 'Your data'], ['about', 'info', 'About']];

  V.prefs = function () {
    const s = st(), sync = RH.store.sync, ai = RH.ai, cfg = ai.cfg();
    const syncText = sync === 'cloud' ? 'Saved to your Claude account and synced to any device where you open this page.'
      : sync === 'cloud-full' ? 'Saved in this browser. Some data is too big to sync, so export a backup now and then.'
      : sync === 'cloud-error' ? 'Saved in this browser. Syncing failed this time and will retry on your next change.'
      : 'Saved in this browser on this device. Export a backup to move it to another device.';
    const AC = RH.account || {}, me = AC.me;
    const pic = me && me.avatarUrl && me.name ? '<img src="' + esc(me.avatarUrl) + '" alt="">' : esc((s.profile.name || (me && me.name) || '?').charAt(0).toUpperCase());
    const hasFM = RH.model.isMine(RH.model.subject.further);
    const secs = SECTIONS.filter((x) => x[0] !== 'fm' || hasFM);
    let html = '<div class="set-wrap"><nav class="set-nav" aria-label="Settings sections"><p class="kicker">Settings</p>' + secs.map((x) => '<button type="button" data-action="set-jump" data-v="' + x[0] + '">' + C.icon(x[1]) + x[2] + '</button>').join('') + '</nav><div class="set-main">';

    // Profile header
    html += '<section class="set-hero"><span class="av xl">' + pic + '</span><div class="sh-t"><h1>' + esc(s.profile.name || (me && me.name) || 'Your account') + '</h1><p>' +
      (AC.inClaude ? (me && me.name ? 'Signed in to Claude as ' + esc(me.name) : 'Signed in with your Claude account') + (sync === 'cloud' ? ' · progress synced' : '') : 'Saved on this device only') + '</p></div>' +
      '<div class="sh-acts"><a class="btn white sm" href="#setup">' + C.icon('rebuild') + 'Run setup again</a></div><span class="orb o1"></span><span class="orb o2"></span></section>';

    html += group('profile', 'user', 'Profile',
      row('First name', 'Used to greet you on Home.', '<input id="pref-name" data-pref="name" value="' + esc(s.profile.name) + '" autocomplete="given-name" aria-label="First name">') +
      row('Subjects', U.plural(RH.model.subjects.length, 'subject') + ': ' + esc(RH.model.subjects.map((x) => x.name).join(', ')), '<a class="btn alt sm" href="#subjects">Change' + C.icon('right', 'i-sm') + '</a>') +
      row('Sign-in page', 'See the welcome screen again.', '<a class="btn ghost sm" href="#welcome">Open</a>'));

    html += group('look', 'sun', 'Appearance', row('Theme', 'Match your device, or pick one.', C.seg([['system', 'Device'], ['light', 'Light'], ['dark', 'Dark']], s.profile.theme, 'data-action="theme"')));

    html += group('study', 'book', 'Studying',
      row('Flashcards per review', 'The most cards in one review session.', '<input id="pref-cards" class="num-in" type="number" min="5" max="500" data-prefnum="cardsDaily" value="' + (s.prefs.cardsDaily || 50) + '" aria-label="Flashcards per review">') +
      row('My schedule', 'School, clubs and how much you want to revise each day.', '<a class="btn alt sm" href="#routine">Edit' + C.icon('right', 'i-sm') + '</a>'));

    // Claude
    const conn = ai.status() === 'claude' || ai.status() === 'api';
    let cl = row('Status', conn ? ai.label() : ai.inClaude ? 'Claude starts the first time you ask it for a hint or a mark.' : 'Add an API key below, or open the hub in claude.ai.', C.chip(conn ? 'Connected' : ai.status() === 'pending' ? 'Connecting' : 'Not connected', conn ? 'ok' : ''));
    if (ai.inClaude) cl += row('Permissions', 'The hub uses Claude from your own account for hints and marking. claude.ai asks the first time.', '<button type="button" class="btn alt sm" data-action="perm-manage">Manage</button>');
    else cl += '<form id="aiForm" class="set-form">' + row('API key', 'Outside claude.ai the hub needs an Anthropic API key. Make one with a spending limit at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. It stays in this browser only.', '<input type="password" name="key" id="ai-key" autocomplete="off" placeholder="' + (cfg.key ? 'Saved: ••••' + esc(cfg.key.slice(-4)) : 'sk-ant-…') + '" aria-label="API key">') +
      row('Model', 'Opus marks most carefully; Haiku is cheapest.', '<select name="model" id="ai-model" aria-label="Model">' + C.opts(ai.MODELS.map((m) => [m[0], m[1]]), cfg.model || ai.MODELS[0][0]) + '</select>') +
      '<div class="set-row sr-end"><div class="row-actions">' + (cfg.key ? '<button type="button" class="btn ghost sm danger-t" data-action="ai-forget">Remove key</button><button type="button" class="btn alt sm" data-action="ai-test">Test</button>' : '') + '<button type="submit" class="btn sm">Save</button></div></div></form>';
    html += group('claude', 'spark', 'Claude', cl);

    if (hasFM) html += '<section class="set-group" id="set-fm"><h2>' + C.icon('list') + 'Further Maths options</h2>' + V.fmOptionsCard() + '</section>';

    html += group('data', 'download', 'Your data',
      '<div class="set-row sr-note' + (sync === 'cloud' ? ' ok' : '') + '">' + C.icon(sync === 'cloud' ? 'tick' : 'info') + '<span>' + esc(syncText) + '</span></div>' +
      row('Back up', 'Ratings, notes, plans, flashcards and scores. Exam PDFs and photos stay on this device.', '<button type="button" class="btn alt sm" data-action="export-json">' + C.icon('download') + 'Export</button>') +
      row('Restore', 'From a backup file, or <button type="button" class="btn link" data-action="set-paste">paste one</button>.', '<label class="btn alt sm file-btn">' + C.icon('upload') + 'Import<input type="file" accept=".json,application/json" id="importFile"></label>') +
      (RH.ui.setPaste ? '<div class="set-row sr-col"><textarea id="importText" rows="4" placeholder="Paste the contents of a backup file" aria-label="Backup to import"></textarea><button type="button" class="btn sm" data-action="import-text">Import pasted backup</button></div>' : '') +
      row('Reset everything', 'Deletes all your progress on this device. Export a backup first.', '<button type="button" class="btn ghost sm danger-t" data-action="reset-all">' + C.icon('trash') + 'Reset</button>', 'danger'));

    html += group('about', 'info', 'About', '<div class="set-row sr-col"><p class="small muted">Topics follow the Pearson Edexcel and other boards’ specifications for the subjects you take. Videos and resources come from Mr Gale’s Resources, Physics & Maths Tutor, Mad Asmaths, Bicen Maths, 1st Class Maths, TLMaths, ExamSolutions, EconplusDal, Physics Online, Physics With Mr Gill, Cognito, Save My Exams, tutor2u and others.</p></div>');
    return html + '</div></div>';
  };
  RH.actions['set-jump'] = function (el) { const t = document.getElementById('set-' + el.dataset.v); if (t) t.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  RH.actions['set-paste'] = function () { RH.ui.setPaste = !RH.ui.setPaste; RH.render({ keepScroll: true }); };

  RH.onSubmit.aiForm = function (f) {
    const d = new FormData(f), cfg = RH.ai.cfg();
    const key = String(d.get('key') || '').trim();
    if (key && !/^sk-ant-/.test(key)) { C.toast('That doesn’t look like an Anthropic API key. It starts with sk-ant-.'); return; }
    const next = { key: key || cfg.key || '', model: String(d.get('model') || cfg.model || RH.ai.MODELS[0][0]) };
    if (!RH.ai.saveCfg(next)) { C.toast('This browser blocked saving the key.'); return; }
    C.toast(next.key ? 'Saved' : 'Saved. Add a key to use the checker.');
    RH.render({ keepScroll: true });
  };
  RH.actions['ai-test'] = async function (el) {
    el.disabled = true; el.textContent = 'Testing…';
    try { const out = await RH.ai.ask('Reply with the single word OK.', { effort: 'low' }); C.toast(/ok/i.test(out) ? 'Connected. Claude replied.' : 'Connected.'); }
    catch (e) { C.toast(RH.ai.errorText(e)); }
    RH.render({ keepScroll: true });
  };
  RH.actions['ai-forget'] = function () { RH.ai.saveCfg({ model: RH.ai.cfg().model }); C.toast('Key removed from this browser'); RH.render({ keepScroll: true }); };
  RH.actions['perm-manage'] = async function () {
    try { const p = await window.claude.use('permissions'); if (p) await p.manage(); RH.render({ keepScroll: true }); }
    catch (e) { C.toast('Open the Permissions menu for this page in claude.ai.'); }
  };
})(window.RH = window.RH || {});
