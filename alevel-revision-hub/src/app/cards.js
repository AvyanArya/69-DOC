/* Flashcard terminal: decks, importing from Quizlet / Gizmo / Anki / CSV, the Leitner system and study modes. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const store = RH.store;

  // Leitner boxes: a card moved into box k comes back after BOX_DAYS[k] days. A miss sends it to box 1.
  const BOX_DAYS = [0, 1, 2, 4, 8, 16];
  const BOX_NAME = ['', 'Box 1 · daily', 'Box 2 · every 2 days', 'Box 3 · every 4 days', 'Box 4 · every 8 days', 'Box 5 · every 16 days'];
  const isDue = (c, today) => !c.due || c.due <= today;
  const decks = () => Object.keys(st().decks).map((id) => st().decks[id]).sort((a, b) => (a.subject || 'z').localeCompare(b.subject || 'z') || a.name.localeCompare(b.name));

  const K = RH.cards = {};
  K.dueCount = function (deck) { const t = U.today(); return deck.cards.filter((c) => isDue(c, t)).length; };
  K.totalDue = () => decks().reduce((a, d) => a + K.dueCount(d), 0);
  K.forTopic = (gid) => decks().filter((d) => d.topic === gid);
  K.forSubject = (sid) => decks().filter((d) => d.subject === sid && !d.topic);

  const newCard = (f, b) => ({ id: U.uid(), f: String(f).trim(), b: String(b).trim(), box: 1, due: '', n: 0, r: 0, w: 0 });
  function newDeck(name, subject, topic, cards, source) {
    const id = 'd' + U.uid();
    store.update(function (s) {
      s.decks[id] = { id: id, name: name || 'New deck', subject: subject || '', topic: topic || '', source: source || null, created: U.today(), cards: (cards || []).map((c) => newCard(c[0], c[1])) };
    }, { decks: [id], silent: true });
    return id;
  }
  K.newDeck = newDeck;

  // ---------- Import parsing ----------
  function splitCSVLine(line, sep) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"' && cur === '') q = true;
      else if (ch === sep) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  K.detectSep = function (text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 30);
    if (!lines.length) return '\t';
    const share = (needle) => lines.filter((l) => l.indexOf(needle) !== -1).length / lines.length;
    if (share('\t') > 0.6) return '\t';
    if (share(' - ') > 0.6) return ' - ';
    if (share(',') > 0.6) return ',';
    if (share(':') > 0.6) return ':';
    if (share(';') > 0.6) return ';';
    return '\t';
  };
  K.parse = function (text, termSep, cardSep) {
    text = String(text || '').replace(/\r\n/g, '\n').replace(/^﻿/, '');
    if (termSep === 'auto') termSep = K.detectSep(text);
    const rows = cardSep === 'blank' ? text.split(/\n\s*\n/) : cardSep === 'semi' ? text.split(';') : text.split('\n');
    const cards = [];
    rows.forEach(function (row) {
      if (!row.trim() || /^#/.test(row.trim())) return;
      let f, b;
      if (termSep === ',' || termSep === ';') {
        const parts = splitCSVLine(row, termSep);
        f = parts[0]; b = parts.slice(1).join(termSep === ',' ? ', ' : '; ');
      } else {
        const at = row.indexOf(termSep);
        if (at === -1) return;
        f = row.slice(0, at); b = row.slice(at + termSep.length);
      }
      f = (f || '').trim(); b = (b || '').trim();
      if (f && b) cards.push([f, b]);
    });
    return cards;
  };
  const sourceKind = (url) => /quizlet\.com/i.test(url) ? 'Quizlet' : /gizmo\.ai/i.test(url) ? 'Gizmo' : /ankiweb/i.test(url) ? 'AnkiWeb' : 'Link';

  function subjectOptions(sel) {
    return '<option value="">No subject</option>' + M.subjects.map((s) => '<option value="' + s.id + '"' + (sel === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('');
  }
  function topicOptions(sid, sel) {
    if (!sid) return '<option value="">Choose a subject first</option>';
    const s = M.subject[sid];
    return '<option value="">Whole subject</option>' + M.compsFor(st(), s, true).map((c) => '<optgroup label="' + esc(c.name) + '">' + c.topics.map((t) => '<option value="' + t.gid + '"' + (sel === t.gid ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</optgroup>').join('');
  }
  K.topicOptions = topicOptions;

  // ---------- Import dialog ----------
  K.openImport = function (opts) {
    opts = opts || {};
    const t = opts.topic && M.topic[opts.topic];
    const sid = opts.subject || (t ? t.subject.id : '');
    const deckList = decks();
    const body = '<form id="importForm" class="import">' +
      '<details class="how" open><summary>How to get your cards out of Quizlet, Gizmo or Anki</summary><ul class="bullets">' +
      '<li><b>Quizlet:</b> open the set on quizlet.com, choose <i>⋯ → Export</i>, keep <i>Tab</i> between term and definition and <i>New line</i> between rows, then <i>Copy text</i> and paste below.</li>' +
      '<li><b>Gizmo:</b> if your deck came from Quizlet or Anki, export from there. Otherwise copy the cards out of Gizmo, one per line, with a tab, comma or " - " between the question and the answer.</li>' +
      '<li><b>Anki:</b> <i>File → Export → Notes in Plain Text</i>, then choose the file below.</li>' +
      '<li><b>Spreadsheet:</b> save two columns (front, back) as CSV.</li></ul></details>' +
      '<div class="field"><label for="im-text">Paste cards</label><textarea id="im-text" name="text" rows="7" placeholder="Term&#9;Definition&#10;Opportunity cost&#9;The value of the next best alternative forgone"></textarea></div>' +
      '<div class="row-actions"><label class="btn alt file-btn">' + C.icon('upload') + 'Or choose a file (.txt, .csv, .tsv)<input type="file" id="im-file" accept=".txt,.csv,.tsv,text/plain,text/csv"></label></div>' +
      '<div class="form-grid"><div class="field"><label for="im-term">Between term and definition</label><select id="im-term" name="term"><option value="auto">Detect automatically</option><option value="\t">Tab</option><option value=",">Comma (CSV)</option><option value=" - ">Dash ( - )</option><option value=":">Colon</option><option value=";">Semicolon</option></select></div>' +
      '<div class="field"><label for="im-card">Between cards</label><select id="im-card" name="card"><option value="line">New line</option><option value="semi">Semicolon</option><option value="blank">Blank line</option></select></div></div>' +
      '<div class="im-preview" id="im-preview"><p class="muted small">Paste or choose a file to see a preview.</p></div>' +
      '<fieldset class="field"><legend>Add to</legend><div class="form-grid"><div class="field"><label for="im-deck">Deck</label><select id="im-deck" name="deck"><option value="">A new deck</option>' + deckList.map((d) => '<option value="' + d.id + '"' + (opts.deck === d.id ? ' selected' : '') + '>' + esc(d.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="im-name">New deck name</label><input id="im-name" name="name" value="' + esc(t ? t.name : '') + '" placeholder="e.g. Physics definitions"></div></div>' +
      '<div class="form-grid"><div class="field"><label for="im-subj">Subject</label><select id="im-subj" name="subject" data-cards="subj">' + subjectOptions(sid) + '</select></div>' +
      '<div class="field"><label for="im-topic">Topic</label><select id="im-topic" name="topic">' + topicOptions(sid, opts.topic || '') + '</select></div></div>' +
      '<div class="field"><label for="im-url">Link to the original set (optional)</label><input id="im-url" name="url" type="url" placeholder="https://quizlet.com/… or https://gizmo.ai/…"></div></fieldset>' +
      '<div class="row-actions"><button type="submit" class="btn">' + C.icon('upload') + 'Import cards</button><button type="button" class="btn alt" data-action="modal-close">Cancel</button></div></form>';
    C.openModal('Import flashcards', body, { wide: true });
  };
  function importPreview() {
    const text = $('#im-text') ? $('#im-text').value : '';
    const box = $('#im-preview');
    if (!box) return;
    if (!text.trim()) { box.innerHTML = '<p class="muted small">Paste or choose a file to see a preview.</p>'; return; }
    const term = $('#im-term').value;
    const cards = K.parse(text, term, $('#im-card').value);
    const sepName = { '\t': 'tab', ',': 'comma', ' - ': 'dash', ':': 'colon', ';': 'semicolon' }[term === 'auto' ? K.detectSep(text) : term];
    box.innerHTML = cards.length
      ? '<p class="small"><b>' + U.plural(cards.length, 'card') + '</b> found' + (term === 'auto' ? ' (split on ' + sepName + ')' : '') + '. First few:</p><table class="tbl small"><tbody>' + cards.slice(0, 4).map((c) => '<tr><td>' + esc(c[0]) + '</td><td>' + esc(c[1]) + '</td></tr>').join('') + '</tbody></table>'
      : '<p class="small danger">No cards found. Try a different separator.</p>';
  }

  RH.onSubmit.importForm = function (f) {
    const d = new FormData(f);
    const cards = K.parse(String(d.get('text') || ''), String(d.get('term')), String(d.get('card')));
    if (!cards.length) { C.toast('No cards found to import. Check the separators.'); return; }
    const url = String(d.get('url') || '').trim();
    let id = String(d.get('deck') || '');
    if (id && st().decks[id]) {
      store.update(function (s) { cards.forEach((c) => s.decks[id].cards.push(newCard(c[0], c[1]))); if (url) s.decks[id].source = { kind: sourceKind(url), url: url }; }, { decks: [id], silent: true });
    } else {
      id = newDeck(String(d.get('name') || '').trim() || 'Imported deck', String(d.get('subject') || ''), String(d.get('topic') || ''), cards, url ? { kind: sourceKind(url), url: url } : null);
    }
    C.closeModal();
    C.toast('Imported ' + U.plural(cards.length, 'card'));
    location.hash = 'deck-' + id;
    RH.render();
  };
  RH.onInput.push(function (el) { if (el.id === 'im-text') { importPreview(); return true; } return false; });
  RH.onChange.push(function (el) {
    if (el.id === 'im-term' || el.id === 'im-card') { importPreview(); return true; }
    if (el.id === 'im-file' && el.files && el.files[0]) {
      const r = new FileReader();
      r.onload = () => { $('#im-text').value = String(r.result); importPreview(); };
      r.readAsText(el.files[0]);
      return true;
    }
    if (el.dataset.cards === 'subj') { const tsel = el.form && el.form.querySelector('[name="topic"]'); if (tsel) tsel.innerHTML = topicOptions(el.value, ''); return true; }
    if (el.dataset.deckField) {
      const id = el.dataset.deck, k = el.dataset.deckField;
      store.update(function (s) {
        const dk = s.decks[id]; if (!dk) return;
        if (k === 'url') dk.source = el.value.trim() ? { kind: sourceKind(el.value.trim()), url: el.value.trim() } : null;
        else dk[k] = el.value;
        if (k === 'subject') dk.topic = '';
      }, { decks: [id], silent: k !== 'subject' });
      return true;
    }
    return false;
  });

  // ---------- Pages ----------
  function boxBar(deck) {
    const n = [0, 0, 0, 0, 0, 0];
    deck.cards.forEach((c) => { n[c.box || 1]++; });
    const total = deck.cards.length || 1;
    return '<div class="boxbar" role="img" aria-label="Cards per Leitner box">' + [1, 2, 3, 4, 5].map((b) => n[b] ? '<span class="bx b' + b + '" style="flex-grow:' + n[b] + '" title="' + BOX_NAME[b] + ': ' + n[b] + '"></span>' : '').join('') + (deck.cards.length ? '' : '<span class="bx b0" style="flex-grow:' + total + '"></span>') + '</div>';
  }
  function deckRow(d) {
    const due = K.dueCount(d);
    const t = d.topic && M.topic[d.topic];
    return '<li class="deck-row"' + (d.subject ? ' data-subj="' + d.subject + '"' : '') + '>' + (d.subject ? C.stag(d.subject) : '<span class="tag stag-none">ALL</span>') +
      '<a class="deck-name" href="#deck-' + d.id + '"><b>' + esc(d.name) + '</b><span class="muted small">' + U.plural(d.cards.length, 'card') + (t ? ' · ' + esc(t.name) : '') + (d.source ? ' · from ' + esc(d.source.kind) : '') + '</span>' + boxBar(d) + '</a>' +
      '<span class="due' + (due ? ' on' : '') + '"><b class="num">' + due + '</b> due</span>' +
      '<button type="button" class="btn sm" data-action="study" data-deck="' + d.id + '" data-mode="leitner"' + (due ? '' : ' disabled') + '>Review</button></li>';
  }
  K.deckRow = deckRow;

  RH.views.cards = function () {
    const s = st();
    const all = decks();
    const cards = all.reduce((a, d) => a + d.cards.length, 0);
    const due = K.totalDue();
    const mastered = all.reduce((a, d) => a + d.cards.filter((c) => c.box === 5).length, 0);
    let html = C.subnav('study', 'cards') + C.head('Study', 'Flashcards', 'Leitner-system flashcards. Cards you know move up a box and come back less often; a miss sends a card back to box 1.',
      '<button type="button" class="btn" data-action="cards-import">' + C.icon('upload') + 'Import cards</button><button type="button" class="btn alt" data-action="deck-new">' + C.icon('plus') + 'New deck</button>');
    html += '<div class="stat-strip"><div class="stat-tile"><span class="stat-n num">' + due + '</span><span class="muted small">cards due today</span>' + (due ? '<button type="button" class="btn sm" data-action="study" data-mode="leitner" data-deck="all">Review all due</button>' : '') + '</div>' +
      '<div class="stat-tile"><span class="stat-n num">' + cards + '</span><span class="muted small">cards in ' + U.plural(all.length, 'deck') + '</span></div>' +
      '<div class="stat-tile"><span class="stat-n num">' + mastered + '</span><span class="muted small">in box 5 (mastered)</span></div>' +
      '<div class="stat-tile"><span class="stat-n num">' + (s.prefs.cardsDaily || 50) + '</span><span class="muted small">max cards per review</span></div></div>';
    if (all.length) {
      html += '<section class="card"><div class="card-head"><h2>Your decks</h2></div><ul class="deck-list">' + all.map(deckRow).join('') + '</ul></section>';
    } else {
      html += C.empty('No decks yet.', 'Import a Quizlet or Gizmo set, add a starter deck below, or create a deck from any topic page.', '<button type="button" class="btn" data-action="cards-import">' + C.icon('upload') + 'Import cards</button>');
    }
    html += '<section class="card"><div class="card-head"><h2>Starter decks</h2><span class="muted small">Copy one into your decks, then edit it however you like</span></div><div class="starter-grid">' +
      RH.STARTER_DECKS.map(function (d) {
        const have = all.some((x) => x.starter === d.id);
        return '<div class="starter" data-subj="' + d.subject + '">' + C.stag(d.subject) + '<b>' + esc(d.name) + '</b><span class="muted small">' + d.cards.length + ' cards. ' + esc(d.note) + '</span>' +
          (have ? '<span class="small muted">Added</span>' : '<button type="button" class="btn alt sm" data-action="starter-add" data-id="' + d.id + '">' + C.icon('plus') + 'Add deck</button>') + '</div>';
      }).join('') + '</div></section>';
    html += '<section class="card"><h2>How the Leitner system works</h2><ol class="leitner-explain">' + [1, 2, 3, 4, 5].map((b) => '<li><span class="bx b' + b + '"></span><b>Box ' + b + '</b> <span class="muted">reviewed every ' + U.plural(BOX_DAYS[b], 'day') + '</span></li>').join('') + '</ol>' +
      '<p class="help">Get a card right and it moves up one box. Get it wrong and it goes back to box 1. Review the cards that are due every day, a little at a time, and use a Pomodoro block for longer sessions.</p></section>';
    return html;
  };

  RH.views.deck = function (id) {
    const d = st().decks[id];
    if (!d) return C.head('', 'Deck not found', 'It may have been deleted.') + '<a class="btn" href="#cards">Back to flashcards</a>';
    const due = K.dueCount(d);
    const n = [0, 0, 0, 0, 0, 0];
    d.cards.forEach((c) => { n[c.box || 1]++; });
    const t = d.topic && M.topic[d.topic];
    let html = C.subnav('study', 'cards') + C.crumbs([['Flashcards', 'cards'], [d.name]]);
    html += C.head(d.subject ? C.stag(d.subject) + ' ' + esc(M.subject[d.subject].name) : 'Deck', esc(d.name), U.plural(d.cards.length, 'card') + ' · ' + due + ' due today' + (t ? ' · <a href="#t-' + t.gid + '">' + esc(t.name) + '</a>' : ''),
      d.source ? '<a class="btn alt" href="' + esc(d.source.url) + '" target="_blank" rel="noopener">' + C.icon('ext') + 'Open in ' + esc(d.source.kind) + '</a>' : '');
    const modes = [['leitner', 'Review due cards', 'Leitner: flip, then say if you knew it', 'cards', due], ['all', 'Flip through all', 'Browse every card, no box changes', 'swap', d.cards.length], ['type', 'Type the answer', 'Recall it exactly; it is checked for you', 'pen', null], ['mcq', 'Multiple choice', 'Pick the right answer from four', 'list', null], ['match', 'Match game', 'Pair terms with definitions against the clock', 'grid', null]];
    html += '<div class="mode-grid">' + modes.map((m) => {
      const off = !d.cards.length || (m[0] === 'leitner' && !due) || (m[0] === 'mcq' && d.cards.length < 4) || (m[0] === 'match' && d.cards.length < 3);
      return '<button type="button" class="mode" data-action="study" data-deck="' + d.id + '" data-mode="' + m[0] + '"' + (off ? ' disabled' : '') + '>' + C.icon(m[3]) + '<b>' + m[1] + (m[4] != null ? ' <span class="num muted">' + m[4] + '</span>' : '') + '</b><span class="muted small">' + m[2] + '</span></button>';
    }).join('') + '</div>';
    html += '<label class="toggle"><input type="checkbox" data-action="deck-reverse" data-id="' + d.id + '"' + (d.reverse ? ' checked' : '') + '><span class="tg" aria-hidden="true"></span><span class="tg-t"><b>Show the definition first</b><span class="help">Answer with the term instead.</span></span></label>';
    html += '<section class="card"><h2>Leitner boxes</h2><div class="boxes">' + [1, 2, 3, 4, 5].map((b) => '<div class="box-col"><span class="bx b' + b + '"></span><b class="num">' + n[b] + '</b><span class="muted small">Box ' + b + ' · ' + BOX_DAYS[b] + 'd</span></div>').join('') + '</div></section>';

    html += '<section class="card"><div class="card-head"><h2>Cards</h2><div class="row-actions"><button type="button" class="btn alt sm" data-action="cards-import" data-deck="' + d.id + '">' + C.icon('upload') + 'Import more</button><button type="button" class="btn alt sm" data-action="deck-export" data-id="' + d.id + '">' + C.icon('download') + 'Export CSV</button></div></div>' +
      '<form id="cardForm" class="card-add" data-deck="' + d.id + '"><input name="f" required placeholder="Front (term or question)" aria-label="Front"><input name="b" required placeholder="Back (definition or answer)" aria-label="Back"><button type="submit" class="btn">' + C.icon('plus') + 'Add</button></form>' +
      (d.cards.length ? '<div class="table-wrap"><table class="tbl cards-tbl"><thead><tr><th>Front</th><th>Back</th><th class="num">Box</th><th class="num">Due</th><th></th></tr></thead><tbody>' + d.cards.map((c) =>
        '<tr><td><textarea class="cell" rows="1" data-card="' + c.id + '" data-deck="' + d.id + '" data-side="f" aria-label="Front">' + esc(c.f) + '</textarea></td><td><textarea class="cell" rows="1" data-card="' + c.id + '" data-deck="' + d.id + '" data-side="b" aria-label="Back">' + esc(c.b) + '</textarea></td>' +
        '<td class="num num">' + (c.box || 1) + '</td><td class="num num small">' + (isDue(c, U.today()) ? 'now' : esc(U.fmtShort(c.due))) + '</td>' +
        '<td><button type="button" class="icon-btn" data-action="card-del" data-deck="' + d.id + '" data-id="' + c.id + '" aria-label="Delete card">' + C.icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No cards yet. Add one above or import a set.</p>') + '</section>';

    html += '<section class="card"><h2>Deck settings</h2><div class="form-grid">' +
      '<div class="field"><label for="dk-name">Name</label><input id="dk-name" data-deck-field="name" data-deck="' + d.id + '" value="' + esc(d.name) + '"></div>' +
      '<div class="field"><label for="dk-subj">Subject</label><select id="dk-subj" data-deck-field="subject" data-deck="' + d.id + '">' + subjectOptions(d.subject) + '</select></div>' +
      '<div class="field"><label for="dk-topic">Topic</label><select id="dk-topic" data-deck-field="topic" data-deck="' + d.id + '">' + topicOptions(d.subject, d.topic) + '</select></div></div>' +
      '<div class="field"><label for="dk-url">Linked Quizlet / Gizmo set</label><input id="dk-url" type="url" data-deck-field="url" data-deck="' + d.id + '" value="' + esc(d.source ? d.source.url : '') + '" placeholder="https://quizlet.com/…"></div>' +
      '<div class="row-actions"><button type="button" class="btn alt" data-action="deck-resetboxes" data-id="' + d.id + '">Reset all cards to box 1</button><button type="button" class="btn alt danger" data-action="deck-del" data-id="' + d.id + '">' + C.icon('trash') + 'Delete deck</button></div></section>';
    return html;
  };

  // Topic-page panel: decks for this topic and its subject.
  K.topicPanel = function (t) {
    const mine = K.forTopic(t.gid), subj = K.forSubject(t.subject.id);
    let html = '<div class="row-actions"><button type="button" class="btn" data-action="deck-new" data-topic="' + t.gid + '">' + C.icon('plus') + 'New deck for this topic</button><button type="button" class="btn alt" data-action="cards-import" data-topic="' + t.gid + '">' + C.icon('upload') + 'Import from Quizlet / Gizmo</button></div>';
    html += mine.length ? '<ul class="deck-list">' + mine.map(deckRow).join('') + '</ul>' : '<p class="muted">No decks linked to this topic yet.</p>';
    if (subj.length) html += '<h3 class="label">' + esc(t.subject.name) + ' decks</h3><ul class="deck-list">' + subj.map(deckRow).join('') + '</ul>';
    const starter = RH.STARTER_DECKS.filter((d) => d.subject === t.subject.id && !decks().some((x) => x.starter === d.id));
    if (starter.length) html += '<p class="help">Starter deck available: ' + starter.map((d) => '<button type="button" class="btn link" data-action="starter-add" data-id="' + d.id + '">' + esc(d.name) + '</button>').join(', ') + '</p>';
    return html;
  };

  // ---------- Study session ----------
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  function findCard(ref) { const d = st().decks[ref[0]]; return d && d.cards.find((c) => c.id === ref[1]); }

  K.start = function (deckId, mode) {
    const today = U.today();
    const list = deckId === 'all' ? decks() : [st().decks[deckId]].filter(Boolean);
    let refs = [];
    list.forEach((d) => d.cards.forEach((c) => { if (mode !== 'leitner' || isDue(c, today)) refs.push([d.id, c.id]); }));
    refs = shuffle(refs);
    if (mode === 'leitner') refs = refs.slice(0, st().prefs.cardsDaily || 50);
    if (mode === 'match') refs = refs.slice(0, 6);
    if (!refs.length) { C.toast(mode === 'leitner' ? 'Nothing due. Come back tomorrow, or flip through all cards.' : 'This deck has no cards yet.'); return; }
    const reverse = deckId !== 'all' && !!(st().decks[deckId] || {}).reverse;
    RH.ui.study = { deckId: deckId, mode: mode, queue: refs, i: 0, flipped: false, right: 0, wrong: 0, retried: {}, reverse: reverse, answer: null, picked: null, started: Date.now(), total: refs.length };
    if (mode === 'mcq') makeOptions();
    if (mode === 'match') makeMatch();
    location.hash = 'review';
    RH.render();
  };

  function grade(ok) {
    const S = RH.ui.study, ref = S.queue[S.i];
    const today = U.today();
    store.update(function (s) {
      const c = s.decks[ref[0]] && s.decks[ref[0]].cards.find((x) => x.id === ref[1]);
      if (!c) return;
      c.n = (c.n || 0) + 1;
      // A card missed earlier in this session stays in box 1 even when the retry is right.
      if (ok) { c.r = (c.r || 0) + 1; c.box = S.retried[ref[1]] ? 1 : Math.min(5, (c.box || 1) + 1); }
      else { c.w = (c.w || 0) + 1; c.box = 1; }
      c.due = U.addDays(today, BOX_DAYS[c.box]);
      s.activity[today] = (s.activity[today] || 0) + (S.i === 0 ? 1 : 0);
      s.cardLog[today] = (s.cardLog[today] || 0) + 1;
    }, { decks: [ref[0]], silent: true });
    if (ok) S.right++; else { S.wrong++; if (!S.retried[ref[1]]) { S.retried[ref[1]] = 1; S.queue.push(ref); } }
    next();
  }
  function next() {
    const S = RH.ui.study;
    S.i++; S.flipped = false; S.answer = null; S.picked = null;
    if (S.mode === 'mcq' && S.i < S.queue.length) makeOptions();
    RH.render({ keepScroll: true });
  }
  function makeOptions() {
    const S = RH.ui.study, card = findCard(S.queue[S.i]);
    if (!card) return;
    const pool = [];
    (S.deckId === 'all' ? decks() : [st().decks[S.deckId]]).forEach((d) => d.cards.forEach((c) => { if (c.id !== card.id) pool.push(c); }));
    const side = S.reverse ? 'f' : 'b';
    const wrong = shuffle(pool.map((c) => c[side]).filter((v, i, a) => v !== card[side] && a.indexOf(v) === i)).slice(0, 3);
    S.options = shuffle([card[side]].concat(wrong));
  }
  function makeMatch() {
    const S = RH.ui.study;
    const tiles = [];
    S.queue.forEach((ref, i) => { const c = findCard(ref); if (c) { tiles.push({ k: i, side: 'f', text: c.f }); tiles.push({ k: i, side: 'b', text: c.b }); } });
    S.tiles = shuffle(tiles); S.sel = null; S.done = {}; S.misses = 0;
  }
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  function closeEnough(a, b) {
    a = norm(a); b = norm(b);
    if (a === b) return true;
    if (!a || !b) return false;
    const m = a.length, n = b.length, dp = [];
    for (let i = 0; i <= m; i++) { dp[i] = [i]; for (let j = 1; j <= n; j++) dp[i][j] = i ? 0 : j; }
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[m][n] <= Math.max(1, Math.floor(Math.max(m, n) * 0.15));
  }

  RH.views.review = function () {
    const S = RH.ui.study;
    if (!S) return C.empty('No study session running.', '', '<a class="btn" href="#cards">Go to flashcards</a>');
    const deckName = S.deckId === 'all' ? 'All due cards' : (st().decks[S.deckId] || {}).name || 'Deck';
    const modeName = { leitner: 'Leitner review', all: 'Flip through', type: 'Type the answer', mcq: 'Multiple choice', match: 'Match game' }[S.mode];
    const done = S.mode === 'match' ? Object.keys(S.done).length === S.queue.length : S.i >= S.queue.length;
    let html = '<div class="study">' +
      '<div class="study-bar"><a class="btn alt sm" href="' + (S.deckId === 'all' ? '#cards' : '#deck-' + S.deckId) + '">' + C.icon('left') + 'End session</a><span class="study-title"><b>' + esc(deckName) + '</b><span class="muted small">' + modeName + '</span></span>' +
      '<button type="button" class="btn alt sm" data-action="study-pomo">' + C.icon('timer') + (RH.timer.running ? RH.timer.fmt(RH.timer.left) : 'Pomodoro') + '</button></div>';
    if (S.mode !== 'match') {
      const pct = Math.min(100, Math.round(100 * Math.min(S.i, S.queue.length) / S.queue.length));
      html += '<div class="meter study-meter"><span style="width:' + pct + '%"></span></div><p class="muted small center num">' + Math.min(S.i + 1, S.queue.length) + ' / ' + S.queue.length + ' · ' + S.right + ' right · ' + S.wrong + ' wrong</p>';
    }
    if (done) {
      const secs = Math.round((Date.now() - S.started) / 1000);
      html += '<section class="card study-done"><h2>Session complete</h2>' +
        (S.mode === 'match' ? '<p class="big num">' + RH.timer.fmt(secs) + '</p><p class="muted">' + U.plural(S.misses, 'wrong match', 'wrong matches') + '</p>'
          : '<p class="big num">' + S.right + ' / ' + (S.right + S.wrong) + '</p><p class="muted">correct in ' + RH.timer.fmt(secs) + (S.mode === 'leitner' || S.mode === 'type' || S.mode === 'mcq' ? '. Cards you got right moved up a box.' : '.') + '</p>') +
        '<div class="row-actions center"><button type="button" class="btn" data-action="study" data-deck="' + S.deckId + '" data-mode="' + S.mode + '">Go again</button><a class="btn alt" href="' + (S.deckId === 'all' ? '#cards' : '#deck-' + S.deckId) + '">Back to deck</a></div></section></div>';
      return html;
    }
    if (S.mode === 'match') {
      html += '<p class="center small muted">Pick a term, then its definition. Timer: <span class="num" id="match-clock">0:00</span></p><div class="match-grid">' + S.tiles.map((t, i) =>
        S.done[t.k] ? '<span class="mtile gone"></span>' : '<button type="button" class="mtile' + (S.sel === i ? ' sel' : '') + (t.side === 'f' ? ' term' : '') + '" data-action="match-pick" data-i="' + i + '">' + esc(t.text) + '</button>').join('') + '</div></div>';
      return html;
    }
    const card = findCard(S.queue[S.i]);
    if (!card) { setTimeout(next, 0); return html + '</div>'; }
    const front = S.reverse ? card.b : card.f, back = S.reverse ? card.f : card.b;
    if (S.mode === 'leitner' || S.mode === 'all') {
      html += '<button type="button" class="flash' + (S.flipped ? ' flipped' : '') + '" data-action="study-flip" aria-live="polite"><span class="fl-side">' + (S.flipped ? 'Answer' : 'Question') + ' · box ' + (card.box || 1) + '</span><span class="fl-text">' + esc(S.flipped ? back : front) + '</span>' + (S.flipped ? '<span class="fl-q muted small">' + esc(front) + '</span>' : '<span class="fl-hint muted small">Click or press Space to flip</span>') + '</button>';
      html += S.flipped
        ? (S.mode === 'leitner'
          ? '<div class="grade"><button type="button" class="btn-grade bad" data-action="study-grade" data-v="0"><b>Didn\'t know</b><span>back to box 1 · key 1</span></button><button type="button" class="btn-grade good" data-action="study-grade" data-v="1"><b>Knew it</b><span>' + (S.retried[card.id] ? 'stays in box 1 for tomorrow' : 'up to box ' + Math.min(5, (card.box || 1) + 1)) + ' · key 2</span></button></div>'
          : '<div class="grade"><button type="button" class="btn-grade bad" data-action="study-again"><b>Still learning</b><span>see it again · key 1</span></button><button type="button" class="btn-grade good" data-action="study-next"><b>Got it</b><span>next card · key 2</span></button></div>')
        : '<div class="grade"><button type="button" class="btn lg" data-action="study-flip">Show answer</button></div>';
    } else if (S.mode === 'type') {
      html += '<div class="flash static"><span class="fl-side">Question · box ' + (card.box || 1) + '</span><span class="fl-text">' + esc(front) + '</span></div>';
      if (S.answer == null) {
        html += '<form id="typeForm" class="type-form"><input id="type-in" autocomplete="off" placeholder="Type your answer and press Enter" aria-label="Your answer"><button type="submit" class="btn">Check</button><button type="button" class="btn alt" data-action="type-skip">I don\'t know</button></form>';
        setTimeout(() => { const i = $('#type-in'); if (i) i.focus(); }, 0);
      } else {
        const ok = S.answer.ok;
        html += '<div class="verdict ' + (ok ? 'good' : 'bad') + '"><b>' + (ok ? 'Correct' : 'Not quite') + '</b>' + (S.answer.text ? '<p>You wrote: ' + esc(S.answer.text) + '</p>' : '') + '<p>Answer: <b>' + esc(back) + '</b></p></div>' +
          '<div class="grade">' + (ok ? '<button type="button" class="btn lg" data-action="study-grade" data-v="1">Next · Enter</button>' : '<button type="button" class="btn-grade good" data-action="study-grade" data-v="1"><b>I was right</b><span>count it as correct</span></button><button type="button" class="btn-grade bad" data-action="study-grade" data-v="0"><b>Next</b><span>back to box 1 · Enter</span></button>') + '</div>';
      }
    } else if (S.mode === 'mcq') {
      html += '<div class="flash static"><span class="fl-side">Question</span><span class="fl-text">' + esc(front) + '</span></div><div class="mcq">' + S.options.map((o, i) => {
        let cls = '';
        if (S.picked != null) cls = o === back ? ' right' : (i === S.picked ? ' wrong' : '');
        return '<button type="button" class="mcq-o' + cls + '" data-action="mcq-pick" data-i="' + i + '"' + (S.picked != null ? ' disabled' : '') + '><span class="num">' + (i + 1) + '</span>' + esc(o) + '</button>';
      }).join('') + '</div>' + (S.picked != null ? '<div class="grade"><button type="button" class="btn lg" data-action="mcq-next">Next · Enter</button></div>' : '');
    }
    html += '<p class="muted small center keys">Keys: Space flip · 1 / ← didn\'t know · 2 / → knew it</p></div>';
    return html;
  };

  // ---------- Actions ----------
  RH.actions['cards-import'] = (el) => K.openImport({ topic: el.dataset.topic, deck: el.dataset.deck });
  RH.actions['deck-new'] = function (el) {
    const t = el.dataset.topic && M.topic[el.dataset.topic];
    const id = newDeck(t ? t.name : 'New deck', t ? t.subject.id : '', t ? t.gid : '', []);
    location.hash = 'deck-' + id;
  };
  RH.actions['starter-add'] = function (el) {
    const d = RH.STARTER_DECKS.find((x) => x.id === el.dataset.id);
    const id = newDeck(d.name, d.subject, '', d.cards);
    store.update(function (s) { s.decks[id].starter = d.id; }, { decks: [id] });
    C.toast('Added "' + d.name + '" (' + d.cards.length + ' cards)');
  };
  RH.actions['deck-del'] = function (el) {
    const d = st().decks[el.dataset.id];
    C.confirm('Delete "' + d.name + '"?', 'All ' + d.cards.length + ' cards and their progress will be deleted.', 'Delete deck', function () {
      store.update(function (s) { delete s.decks[d.id]; }, { decks: [d.id], silent: true });
      location.hash = 'cards';
      RH.render();
    });
  };
  RH.actions['deck-resetboxes'] = function (el) {
    store.update(function (s) { s.decks[el.dataset.id].cards.forEach((c) => { c.box = 1; c.due = ''; }); }, { decks: [el.dataset.id] });
    C.toast('All cards are back in box 1');
  };
  RH.actions['deck-reverse'] = function (el) { store.update(function (s) { s.decks[el.dataset.id].reverse = el.checked; }, { decks: [el.dataset.id], silent: true }); };
  RH.actions['deck-export'] = function (el) {
    const d = st().decks[el.dataset.id];
    const q = (t) => '"' + String(t).replace(/"/g, '""') + '"';
    C.saveFile(d.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.csv', d.cards.map((c) => q(c.f) + ',' + q(c.b)).join('\r\n'), 'text/csv');
  };
  RH.actions['card-del'] = function (el) {
    store.update(function (s) { const d = s.decks[el.dataset.deck]; d.cards = d.cards.filter((c) => c.id !== el.dataset.id); }, { decks: [el.dataset.deck] });
  };
  RH.actions.study = (el) => K.start(el.dataset.deck, el.dataset.mode);
  RH.actions['study-flip'] = () => { const S = RH.ui.study; if (S && !S.flipped) { S.flipped = true; RH.render({ keepScroll: true }); } };
  RH.actions['study-grade'] = (el) => grade(el.dataset.v === '1');
  const logCard = () => store.update(function (s) { const d = U.today(); s.cardLog[d] = (s.cardLog[d] || 0) + 1; }, { silent: true });
  RH.actions['study-next'] = () => { RH.ui.study.right++; logCard(); next(); };
  RH.actions['study-again'] = () => { const S = RH.ui.study; S.wrong++; S.queue.push(S.queue[S.i]); logCard(); next(); };
  RH.actions['study-pomo'] = () => { C.primeAudio(); if (RH.timer.running) RH.timer.pause(); else { RH.timer.setMode('pomo'); RH.timer.start(); } RH.render({ keepScroll: true }); };
  RH.actions['type-skip'] = () => { RH.ui.study.answer = { ok: false, text: '' }; RH.render({ keepScroll: true }); };
  RH.actions['mcq-pick'] = function (el) {
    const S = RH.ui.study, card = findCard(S.queue[S.i]);
    S.picked = Number(el.dataset.i);
    S.mcqOk = S.options[S.picked] === (S.reverse ? card.f : card.b);
    RH.render({ keepScroll: true });
  };
  RH.actions['mcq-next'] = () => grade(RH.ui.study.mcqOk);
  RH.actions['match-pick'] = function (el) {
    const S = RH.ui.study, i = Number(el.dataset.i);
    if (S.sel == null) { S.sel = i; RH.render({ keepScroll: true }); return; }
    const a = S.tiles[S.sel], b = S.tiles[i];
    if (S.sel === i) { S.sel = null; }
    else if (a.k === b.k && a.side !== b.side) { S.done[a.k] = 1; S.sel = null; }
    else { S.misses++; S.sel = i; el.classList.add('miss'); }
    RH.render({ keepScroll: true });
  };

  RH.onSubmit.typeForm = function () {
    const S = RH.ui.study, card = findCard(S.queue[S.i]);
    const text = $('#type-in').value;
    S.answer = { text: text, ok: closeEnough(text, S.reverse ? card.f : card.b) };
    RH.render({ keepScroll: true });
  };
  RH.onSubmit.cardForm = function (f) {
    const d = new FormData(f), id = f.dataset.deck;
    store.update(function (s) { s.decks[id].cards.unshift(newCard(d.get('f'), d.get('b'))); }, { decks: [id] });
    setTimeout(() => { const i = document.querySelector('#cardForm input'); if (i) i.focus(); }, 0);
  };
  let cellTimer = null;
  RH.onInput.push(function (el) {
    if (!el.dataset.card) return false;
    clearTimeout(cellTimer);
    const deck = el.dataset.deck, cid = el.dataset.card, side = el.dataset.side, val = el.value;
    cellTimer = setTimeout(() => store.update(function (s) { const c = s.decks[deck].cards.find((x) => x.id === cid); if (c) c[side] = val; }, { decks: [deck], silent: true }), 500);
    return true;
  });

  // Keyboard shortcuts in a study session.
  K.key = function (ev) {
    const S = RH.ui.study;
    if (location.hash !== '#review' || !S || C.modalOpen()) return false;
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    const k = ev.key;
    if (S.mode === 'leitner' || S.mode === 'all') {
      if ((k === ' ' || k === 'Enter') && !S.flipped) { ev.preventDefault(); RH.actions['study-flip'](); return true; }
      if (S.flipped && (k === '1' || k === 'ArrowLeft')) { ev.preventDefault(); S.mode === 'leitner' ? grade(false) : RH.actions['study-again'](); return true; }
      if (S.flipped && (k === '2' || k === 'ArrowRight')) { ev.preventDefault(); S.mode === 'leitner' ? grade(true) : RH.actions['study-next'](); return true; }
    }
    if (S.mode === 'mcq') {
      if (S.picked == null && /^[1-4]$/.test(k) && S.options[Number(k) - 1] != null) { RH.actions['mcq-pick']({ dataset: { i: String(Number(k) - 1) } }); return true; }
      if (S.picked != null && k === 'Enter') { ev.preventDefault(); grade(S.mcqOk); return true; }
    }
    if (S.mode === 'type' && S.answer && k === 'Enter' && !typing) { ev.preventDefault(); grade(S.answer.ok); return true; }
    return false;
  };

  // Match game clock.
  setInterval(function () {
    const el = $('#match-clock'), S = RH.ui.study;
    if (el && S) el.textContent = RH.timer.fmt((Date.now() - S.started) / 1000);
  }, 500);
})(window.RH = window.RH || {});
