/* Settings: you, Claude connection, Further Maths options, data and backups. */
(function (RH) {
  'use strict';
  const U = RH.util, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const V = RH.views;

  V.prefs = function () {
    const s = st(), sync = RH.store.sync, ai = RH.ai, cfg = ai.cfg();
    const syncText = sync === 'cloud' ? 'Saved to your Claude account. Your progress follows you to any device where you open this page.'
      : sync === 'cloud-full' ? 'Saved in this browser. Some data is too big to sync, so export a backup regularly.'
      : sync === 'cloud-error' ? 'Saved in this browser. Syncing failed this time and will retry on your next change.'
      : 'Saved in this browser on this device. Export a backup to move it to another device.';
    let html = C.page({ eyebrow: 'Settings', title: 'Settings' });
    html += '<div class="grid-2"><section class="card"><div class="card-head"><h2>You</h2></div><div class="form-grid">' +
      '<label class="field"><span>First name</span><input id="pref-name" data-pref="name" value="' + esc(s.profile.name) + '" autocomplete="given-name"></label>' +
      '<label class="field"><span>Most flashcards per review</span><input id="pref-cards" type="number" min="5" max="500" data-prefnum="cardsDaily" value="' + (s.prefs.cardsDaily || 50) + '"></label></div>' +
      '<div class="field"><span>Theme</span>' + C.seg([['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']], s.profile.theme, 'data-action="theme"') + '</div></section>';

    // Claude
    html += '<section class="card"><div class="card-head"><h2>' + C.icon('spark') + 'Claude</h2>' + C.chip(ai.status() === 'claude' || ai.status() === 'api' ? 'Connected' : ai.status() === 'pending' ? 'Connecting' : 'Not connected', ai.status() === 'claude' || ai.status() === 'api' ? 'ok' : '') + '</div>';
    if (ai.inClaude) {
      html += '<p class="muted">Inside claude.ai the hub uses Claude from your own account to mark answers and verify hand-ins. Each check uses some of your Claude usage. The first time, claude.ai asks you to allow it.</p>' +
        '<div class="row-actions"><button type="button" class="btn alt sm" data-action="perm-manage">Manage permissions</button></div>';
    } else {
      html += '<p class="muted">Outside claude.ai, the checker uses an Anthropic API key. Create one with a monthly spending limit at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. A typical marked answer costs a few pence.</p>' +
        '<form id="aiForm" class="stack-form"><label class="field"><span>API key</span><input type="password" name="key" id="ai-key" autocomplete="off" placeholder="' + (cfg.key ? 'Saved: ••••' + esc(cfg.key.slice(-4)) : 'sk-ant-…') + '"></label>' +
        '<label class="field"><span>Model</span><select name="model" id="ai-model">' + C.opts(ai.MODELS.map((m) => [m[0], m[1] + ' — ' + m[2]]), cfg.model || ai.MODELS[0][0]) + '</select></label>' +
        '<div class="row-actions"><button type="submit" class="btn">Save</button>' + (cfg.key ? '<button type="button" class="btn alt" data-action="ai-test">Test connection</button><button type="button" class="btn ghost danger-t" data-action="ai-forget">Remove key</button>' : '') + '</div>' +
        '<p class="help">The key is kept only in this browser. It is never synced, backed up or put in the page. Anyone using this browser profile could use it.</p></form>';
    }
    html += '</section></div>';
    html += V.fmOptionsCard();
    html += '<section class="card"><div class="card-head"><h2>Your data</h2></div><p class="note ' + (sync === 'cloud' ? 'ok-n' : '') + '">' + esc(syncText) + '</p><p class="muted small">Exam PDFs, photos of your work and the focus tracker video stay on this device. Ratings, notes, plans, routine, deliverables, flashcards, scores and checked answers are in backups.</p>' +
      '<div class="row-actions"><button type="button" class="btn alt" data-action="export-json">' + C.icon('download') + 'Export backup</button>' +
      '<label class="btn alt file-btn">' + C.icon('upload') + 'Import backup<input type="file" accept=".json,application/json" id="importFile"></label>' +
      '<button type="button" class="btn ghost danger-t" data-action="reset-all">' + C.icon('trash') + 'Reset everything</button></div>' +
      '<details class="fold-lite"><summary>Paste a backup instead</summary><textarea id="importText" rows="4" placeholder="Paste the contents of a backup file"></textarea><button type="button" class="btn sm" data-action="import-text">Import pasted backup</button></details></section>';
    html += '<section class="card"><div class="card-head"><h2>About</h2></div><p class="small muted">Topics follow the Pearson Edexcel specifications: Physics 9PH0, Mathematics 9MA0, Further Mathematics 9FM0 and Economics A 9EC0. Videos and resources come from Mr Gale’s Resources, Physics & Maths Tutor, Mad Asmaths, Bicen Maths, 1st Class Maths, TLMaths, ExamSolutions, EconplusDal, Physics Online, Physics With Mr Gill, Cognito, Save My Exams, tutor2u and others.</p></section>';
    return html;
  };

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
