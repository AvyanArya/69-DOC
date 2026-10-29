/* Check: an AI examiner for exam answers. Type or photograph a question, the mark scheme and your answer;
   Claude marks it the way an Edexcel examiner would, mark by mark with your own words as evidence, then shows
   exactly how to reach full marks, a model answer and an exam tip. Ask follow-up questions, improve the answer
   and resubmit, or get a similar practice question. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const store = RH.store;
  const K = RH.checker = {};

  const GUIDE = {
    maths: '- Use Edexcel mark types: M (method), A (accuracy, dependent on the M before it), B (independent), dM (dependent method). Award follow-through (ft) only where the scheme allows. For "show that" questions every step must be shown. Check the final answer is in the form and accuracy asked for (exact value, 3 s.f., etc.).',
    further: '- Use Edexcel mark types: M (method), A (accuracy, dependent on the M before it), B (independent), dM (dependent method). Award follow-through (ft) only where the scheme allows. For proofs and "show that" questions the argument must be complete and clearly concluded. Check the final answer is in the form and accuracy asked for.',
    physics: '- Most marking points are worth 1 mark each. Final numerical answers need correct units and sensible significant figures; allow error carried forward (ecf) from an earlier part. For "explain" and "describe" questions each mark needs a separate, correct physics point in precise terms (no vague words like "it" or "energy goes up" without saying what). For 6-mark extended responses use the Edexcel levels: indicative content plus how well the answer is linked into a sustained line of reasoning.',
    economics: '- Edexcel Economics A uses levels for longer questions. Typical split (use the scheme given if it differs): 5 marks = knowledge 1, application 2, analysis 2; 8 = KAA 6 + evaluation 2; 10 = KAA 6 + evaluation 4; 12 = KAA 8 + evaluation 4; 15 = KAA 9 + evaluation 6; 25 = KAA 16 + evaluation 9. Reward precise definitions, accurate and fully labelled diagrams (described in words if handwritten), chains of reasoning that link cause to effect step by step, use of the extract or real-world data, and evaluation that weighs factors (magnitude, time period, assumptions, elasticities) and reaches a supported judgement.'
  };

  const resultTemplate = '{\n  "score": number, "max": number,\n  "verdict": "one sentence overall judgement, encouraging but honest",\n  "band": "short label, e.g. \\"M1 A1 M1 A0\\" or \\"KAA Level 2, Evaluation Level 1\\"",\n' +
    '  "points": [{"label": "e.g. M1, B1, Knowledge, Application, Evaluation", "criterion": "what earns this mark", "awarded": number, "available": number, "evidence": "the student\'s own words or working, quoted exactly, or empty", "comment": "why it was or was not awarded"}],\n' +
    '  "strengths": ["what the answer did well, specific"],\n  "improvements": [{"issue": "what cost marks", "fix": "exactly what to do next time", "example": "a rewritten sentence, line of working or labelled diagram description they could use"}],\n' +
    '  "modelAnswer": "a concise full-mark answer, with working where needed",\n  "examTip": "one tip about this command word or question type",\n  "transcript": "the handwritten answer as text if answer photos were given, else empty",\n' +
    '  "inferredScheme": true if you wrote the mark scheme yourself,\n  "topic": "the closest topic id from the list, or empty",\n  "nextStep": "one short thing to practise next"\n}';

  // ---------- Draft ----------
  function blank() { return { subject: 'economics', topic: '', marks: '', question: '', ms: '', answer: '', qImgs: [], msImgs: [], aImgs: [], source: null, parent: null }; }
  RH.ui.ck = RH.ui.ck || blank();
  RH.ui.ckRun = null;
  const draft = () => RH.ui.ck;
  K.removeImage = function (group, i) {
    const d = draft(), key = group === 'ck-q' ? 'qImgs' : group === 'ck-ms' ? 'msImgs' : 'aImgs';
    d[key].splice(i, 1);
    RH.render({ keepScroll: true });
  };
  K.prefill = function (o) {
    RH.ui.ck = Object.assign(blank(), o);
    if (location.hash !== '#check') location.hash = 'check'; else RH.render();
  };

  function topicLines(sid) {
    return M.subjectTopics(st(), M.subject[sid]).map((t) => t.gid + ' — ' + t.comp.name + ': ' + t.name).join('\n');
  }
  function imageGuide(d) {
    const parts = []; let n = 0;
    const add = (list, what) => { if (list.length) { parts.push('Photo' + (list.length > 1 ? 's ' : ' ') + (n + 1) + (list.length > 1 ? '–' + (n + list.length) : '') + ': ' + what); n += list.length; } };
    add(d.qImgs, 'the question'); add(d.msImgs, 'the mark scheme'); add(d.aImgs, 'the student\'s handwritten answer');
    return parts.length ? 'Attached photos, in order. ' + parts.join('. ') + '.' : '';
  }
  function markingPrompt(d) {
    const sub = M.subject[d.subject];
    const t = d.topic && M.topic[d.topic];
    return [
      'You are a senior Pearson Edexcel A-level ' + sub.name + ' (' + sub.spec + ') examiner and a supportive tutor. Mark the student\'s answer exactly as an Edexcel examiner would, then coach them to full marks.',
      '',
      'Rules:',
      '- Mark strictly against the mark scheme if one is given. If none is given, first work out the mark scheme an Edexcel examiner would use for this question, mark against it, and set "inferredScheme" to true. Never give marks for intent or for things the student did not write.',
      '- Accept correct alternative methods and equivalent wording.',
      GUIDE[d.subject],
      '- For every mark awarded or withheld, quote the student\'s own words or working as evidence.',
      '- Make the feedback specific to this answer: say exactly what to add, change or cut, and show it with an example.',
      '- The points must add up: the sum of "awarded" is "score" and the sum of "available" is "max".',
      '- If answer photos are attached, transcribe the handwriting faithfully, mistakes included, before marking.',
      '',
      (t ? 'Topic: ' + t.comp.name + ' – ' + t.name + '\n' : '') + 'Question' + (d.marks ? ' (' + d.marks + ' marks)' : '') + ':',
      d.question || '(see the question photo)',
      '',
      d.ms ? 'Mark scheme:\n' + d.ms : d.msImgs.length ? 'Mark scheme: see the photo.' : 'No mark scheme was provided.',
      '',
      'Student\'s answer:',
      d.answer || '(see the answer photos)',
      '',
      imageGuide(d),
      '',
      'Topic ids for ' + sub.name + ':',
      topicLines(d.subject),
      '',
      'Reply with only this JSON object:',
      resultTemplate
    ].join('\n');
  }

  function clean(r, d) {
    const num = (x) => Math.max(0, Number(x) || 0);
    const points = Array.isArray(r.points) ? r.points.map((p) => ({ label: String(p.label || ''), criterion: String(p.criterion || ''), awarded: num(p.awarded), available: Math.max(num(p.available), num(p.awarded)), evidence: String(p.evidence || ''), comment: String(p.comment || '') })) : [];
    let max = num(r.max) || Number(d.marks) || points.reduce((a, p) => a + p.available, 0);
    let score = Math.min(num(r.score), max || 999);
    return {
      score: score, max: max, verdict: String(r.verdict || ''), band: String(r.band || ''), points: points,
      strengths: (Array.isArray(r.strengths) ? r.strengths : []).map(String).slice(0, 6),
      improvements: (Array.isArray(r.improvements) ? r.improvements : []).map((x) => ({ issue: String(x.issue || ''), fix: String(x.fix || ''), example: String(x.example || '') })).slice(0, 6),
      modelAnswer: String(r.modelAnswer || ''), examTip: String(r.examTip || ''), transcript: String(r.transcript || ''),
      inferredScheme: !!r.inferredScheme, topic: M.topic[r.topic] && M.topic[r.topic].subject.id === d.subject ? r.topic : (d.topic || ''), nextStep: String(r.nextStep || '')
    };
  }

  // ---------- Running a check ----------
  async function runCheck() {
    const d = draft();
    if (!d.question.trim() && !d.qImgs.length) { C.toast('Add the question, as text or a photo.'); return; }
    if (!d.answer.trim() && !d.aImgs.length) { C.toast('Add your answer, typed or as photos.'); return; }
    const images = d.qImgs.concat(d.msImgs, d.aImgs);
    const maxImg = RH.ai.maxImages();
    if (images.length && !maxImg) { C.toast('Photos can’t be sent from this view. Type the question and answer instead.'); return; }
    if (images.length > maxImg) { C.toast('Too many photos: ' + images.length + ' attached, up to ' + maxImg + ' can be sent.'); return; }
    const id = 'k' + U.uid();
    const ctl = new AbortController();
    RH.ui.ckRun = { id: id, ctl: ctl, started: Date.now() };
    RH.render({ keepScroll: true });
    try {
      const raw = await RH.ai.ask(markingPrompt(d), { json: true, images: images, signal: ctl.signal, tier: 'complex' });
      const result = clean(raw, d);
      const rec = { id: id, date: U.today(), at: Date.now(), subject: d.subject, topic: result.topic, marks: Number(d.marks) || result.max, question: d.question.slice(0, 4000), ms: d.ms.slice(0, 4000), answer: d.answer.slice(0, 6000), imgs: { q: d.qImgs.length, ms: d.msImgs.length, a: d.aImgs.length }, source: d.source, parent: d.parent, result: result, chat: [] };
      for (const [list, tag] of [[d.qImgs, 'q'], [d.msImgs, 'ms'], [d.aImgs, 'a']]) for (let i = 0; i < list.length; i++) await RH.files.put('ck:' + id + ':' + tag + i, list[i]);
      store.update(function (s) {
        s.checks.unshift(rec);
        if (s.checks.length > 80) s.checks = s.checks.slice(0, 80);
        s.activity[rec.date] = (s.activity[rec.date] || 0) + 1;
        if (rec.topic && result.max && result.score / result.max < 0.5) {
          const ts = s.topics[rec.topic] || (s.topics[rec.topic] = { c: 0, p: [], notes: '', last: null, n: 0 });
          ts.notes = (ts.notes ? ts.notes + '\n' : '') + '• ' + U.fmtShort(rec.date) + ': ' + result.score + '/' + result.max + ' on a checked answer. ' + (result.improvements[0] ? result.improvements[0].fix : '');
        }
      }, { checks: true, silent: true });
      RH.ui.ckRun = null;
      RH.ui.ck = blank();
      RH.ui.ck.subject = rec.subject;
      location.hash = 'check-' + id;
      RH.render();
    } catch (e) {
      RH.ui.ckRun = null;
      RH.render({ keepScroll: true });
      if (e && e.code !== 'cancelled') C.toast(RH.ai.errorText(e));
    }
  }

  async function similar() {
    const d = draft();
    const t = d.topic && M.topic[d.topic];
    const sub = M.subject[d.subject];
    RH.ui.ckRun = { id: 'gen', ctl: new AbortController(), gen: true };
    RH.render({ keepScroll: true });
    try {
      const prompt = 'Write one new exam-style question for Pearson Edexcel A-level ' + sub.name + ' (' + sub.spec + ')' + (t ? ' on the topic "' + t.name + '" (' + t.comp.name + '). Specification points: ' + (t.pts || []).join('; ') : '') + '.\n' +
        (d.question ? 'Make it similar in style and difficulty to this question, but not the same:\n' + d.question + '\n' : 'Pick a typical mark tariff for this topic.\n') +
        (d.marks ? 'Make it worth ' + d.marks + ' marks.\n' : '') +
        'Use Edexcel command words and conventions. Include any data or context the question needs inside the question text.\nReply with only JSON: {"question": "the full question text", "marks": number, "markScheme": "the mark scheme in Edexcel style, one marking point per line"}';
      const r = await RH.ai.ask(prompt, { json: true, signal: RH.ui.ckRun.ctl.signal, tier: 'default' });
      Object.assign(d, { question: String(r.question || ''), marks: String(r.marks || d.marks || ''), ms: String(r.markScheme || ''), answer: '', qImgs: [], msImgs: [], aImgs: [], source: { kind: 'practice' }, parent: null });
      RH.ui.ckOpenMs = false;
      C.toast('New practice question ready. The mark scheme is hidden until it’s marked.');
    } catch (e) { if (e && e.code !== 'cancelled') C.toast(RH.ai.errorText(e)); }
    RH.ui.ckRun = null;
    RH.render({ keepScroll: true });
  }

  async function ask(id, text) {
    const rec = st().checks.find((c) => c.id === id);
    if (!rec || !text.trim()) return;
    store.update(function (s) { s.checks.find((c) => c.id === id).chat.push({ role: 'user', content: text.trim().slice(0, 2000) }); }, { checks: true, silent: true });
    RH.ui.ckChat = { id: id, text: '', ctl: new AbortController() };
    RH.render({ keepScroll: true });
    const now = st().checks.find((c) => c.id === id);
    const context = 'You are a supportive Pearson Edexcel A-level ' + M.subject[now.subject].name + ' tutor. You just marked this answer; the student is asking about the feedback. Answer in plain English, briefly (under 180 words unless they ask for more), refer to the mark scheme and their own words, and never just hand over a full answer to a different question. Use short paragraphs or a few bullets; no headings.\n\n' +
      'Question (' + now.marks + ' marks):\n' + (now.question || '(from a photo)') + '\n\nMark scheme:\n' + (now.ms || '(from a photo or written by you)') + '\n\nStudent answer:\n' + (now.answer || now.result.transcript || '(from photos)') + '\n\nYour marking:\n' + JSON.stringify({ score: now.result.score, max: now.result.max, points: now.result.points, improvements: now.result.improvements });
    const turns = [{ role: 'user', content: context }].concat(now.chat.slice(-12));
    try {
      const out = await RH.ai.ask(turns, { signal: RH.ui.ckChat.ctl.signal, tier: 'default', onText: function (u) { RH.ui.ckChat.text = u.text; const b = $('#ck-live'); if (b) b.textContent = u.text; } });
      store.update(function (s) { s.checks.find((c) => c.id === id).chat.push({ role: 'assistant', content: String(out) }); }, { checks: true, silent: true });
    } catch (e) {
      if (e && e.code !== 'cancelled') C.toast(RH.ai.errorText(e));
      store.update(function (s) { const c = s.checks.find((x) => x.id === id); if (c.chat.length && c.chat[c.chat.length - 1].role === 'user') c.chat.pop(); }, { checks: true, silent: true });
    }
    RH.ui.ckChat = null;
    RH.render({ keepScroll: true });
    const t = $('#ck-ask'); if (t) t.focus();
  }

  // ---------- Pieces of the page ----------
  function aiBanner() {
    const s = RH.ai.status();
    if (s === 'claude' || s === 'api') return '<p class="ai-line">' + C.icon('spark') + esc(RH.ai.label()) + '</p>';
    if (s === 'pending') return '<p class="ai-line muted">' + C.icon('spark') + 'Connecting to Claude…</p>';
    return '<div class="note"><b>Connect Claude to mark answers.</b> ' + (RH.ai.inClaude ? 'Claude was not allowed for this page. Allow it from the page’s Permissions menu, then reload.' : 'Open the hub on claude.ai, or add an Anthropic API key in <a href="#preferences">Settings</a>.') + '</div>';
  }
  function imgField(group, list, label, capture) {
    return '<div class="img-field"><label class="btn alt sm file-btn">' + C.icon(capture ? 'camera' : 'image') + label + '<input type="file" accept="image/*"' + (capture ? ' capture="environment"' : '') + ' multiple data-ckimg="' + group + '"></label>' + C.thumbs(list, 'ck-' + group, true) + '</div>';
  }
  function paperPicker() {
    const papers = Object.keys(st().portal.papers).map((k) => st().portal.papers[k]);
    if (!papers.length) return '<p class="muted small">No past papers uploaded yet. Add one in <a href="#papers">Past papers</a> and its questions show up here.</p>';
    const d = draft(), src = d.source && d.source.kind === 'paper' ? d.source : {};
    const p = src.paper && st().portal.papers[src.paper];
    return '<div class="form-grid"><label class="field"><span>Paper</span><select data-ckpick="paper"><option value="">Choose a paper</option>' + C.opts(papers.map((x) => [x.id, x.title]), src.paper || '') + '</select></label>' +
      (p ? '<label class="field"><span>Question</span><select data-ckpick="q"><option value="">Choose</option>' + C.opts(p.questions.map((q, i) => [i, 'Q' + q.n + (q.marks ? ' (' + q.marks + ' marks)' : '')]), src.q != null ? src.q : '') + '</select></label>' : '') + '</div>' +
      (src.loading ? '<p class="muted small">Cutting the question out of the PDF…</p>' : '');
  }

  function form() {
    const d = draft(), run = RH.ui.ckRun, s = RH.ai.status();
    const srcTab = C.tab('ck-src', 'type');
    const topics = M.subjectTopics(st(), M.subject[d.subject]);
    const ready = s === 'claude' || s === 'api';
    const practice = d.source && d.source.kind === 'practice';
    let html = '<form id="ckForm" class="card ck-form" onsubmit="return false">' +
      '<div class="ck-step"><span class="step-n">1</span><h2>The question</h2></div>' +
      '<div class="ck-subjects">' + M.subjects.map((x) => '<button type="button" class="pick-subj' + (d.subject === x.id ? ' on' : '') + '" data-subj="' + x.id + '" data-action="ck-subj" data-v="' + x.id + '" aria-pressed="' + (d.subject === x.id) + '">' + esc(x.name) + '</button>').join('') + '</div>' +
      C.tabs('ck-src', [['type', 'Type or photo', 'pen'], ['paper', 'From my past papers', 'paper'], ['practice', 'Practice question', 'spark']], srcTab);
    if (srcTab === 'paper') html += paperPicker();
    if (srcTab === 'practice') html += '<p class="muted small">Claude writes a new exam-style question for the topic you pick, with a hidden mark scheme.</p><div class="row-actions"><button type="button" class="btn alt" data-action="ck-similar"' + (ready && !run ? '' : ' disabled') + '>' + C.icon('spark') + (d.question ? 'Write a similar question' : 'Write a practice question') + '</button></div>';
    html += '<div class="form-grid"><label class="field"><span>Topic (optional)</span><select data-ck="topic"><option value="">Let Claude work it out</option>' + M.compsFor(st(), M.subject[d.subject], true).map((c) => '<optgroup label="' + esc(c.name) + '">' + c.topics.filter((t) => topics.indexOf(t) !== -1).map((t) => '<option value="' + t.gid + '"' + (d.topic === t.gid ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</optgroup>').join('') + '</select></label>' +
      '<label class="field"><span>Marks</span><input type="number" min="1" max="50" inputmode="numeric" data-ck="marks" value="' + esc(d.marks) + '" placeholder="e.g. 8"></label></div>' +
      '<label class="field"><span>Question</span><textarea data-ck="question" rows="4" placeholder="Paste or type the question, including any extract or data it refers to">' + esc(d.question) + '</textarea></label>' +
      imgField('q', d.qImgs, 'Photo of the question', false) +
      (practice ? '<p class="help">' + C.icon('lock', 'i-sm') + ' The mark scheme for this practice question is hidden until your answer is marked.</p>'
        : '<details class="fold-lite"' + (d.ms || d.msImgs.length || RH.ui.ckOpenMs ? ' open' : '') + '><summary>Mark scheme <span class="muted">(recommended)</span></summary><textarea data-ck="ms" rows="4" placeholder="Paste the mark scheme for this question. Without one, Claude writes the scheme an Edexcel examiner would use.">' + esc(d.ms) + '</textarea>' + imgField('ms', d.msImgs, 'Photo of the mark scheme', false) + '</details>') +
      '<div class="ck-step"><span class="step-n">2</span><h2>Your answer</h2></div>' +
      '<label class="field"><span class="sr">Your answer</span><textarea data-ck="answer" rows="9" placeholder="Type your full answer as you would in the exam, or photograph your handwritten answer below">' + esc(d.answer) + '</textarea></label>' +
      imgField('a', d.aImgs, 'Photos of my written answer', true) +
      (d.parent ? '<p class="note">' + C.icon('rebuild', 'i-sm') + ' Improving an earlier answer. The new mark will be compared with the last one.</p>' : '') +
      '<div class="ck-go"><button type="button" class="btn lg" data-action="ck-mark"' + (ready && !run ? '' : ' disabled') + '>' + C.icon('check') + 'Mark my answer</button>' + aiBanner() + '</div></form>';
    return html;
  }

  function running() {
    const run = RH.ui.ckRun;
    if (!run || run.gen) return '';
    const secs = Math.floor((Date.now() - run.started) / 1000);
    const steps = ['Reading the question and mark scheme', 'Reading your answer', 'Marking point by point', 'Writing your feedback'];
    const at = Math.min(3, Math.floor(secs / 9));
    return '<section class="card ck-running" aria-live="polite"><div class="spinner" aria-hidden="true"></div><h2>Marking your answer</h2><ol class="ck-steps">' + steps.map((x, i) => '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + x + '</li>').join('') + '</ol><p class="muted small">This usually takes 20 to 60 seconds.</p><button type="button" class="btn ghost sm" data-action="ck-stop">Stop</button></section>';
  }

  function resultView(rec) {
    const r = rec.result, frac = r.max ? r.score / r.max : 0;
    const tone = frac >= 0.8 ? 'ok' : frac >= 0.5 ? 'warn' : 'bad';
    const parent = rec.parent && st().checks.find((c) => c.id === rec.parent);
    const t = rec.topic && M.topic[rec.topic];
    let html = '<section class="card ck-score" data-subj="' + rec.subject + '">' + C.ring(frac, '<b class="num">' + r.score + '</b><span class="num">/' + r.max + '</span>', 108, tone) +
      '<div class="ck-score-t"><p class="eyebrow">' + C.stag(rec.subject) + (t ? esc(t.name) : esc(M.subject[rec.subject].name)) + '</p><h2>' + esc(r.verdict || 'Marked') + '</h2>' +
      (r.band ? '<p class="num small muted">' + esc(r.band) + '</p>' : '') +
      (parent ? '<p class="delta ' + (r.score > parent.result.score ? 'ok-t' : '') + '">' + (r.score > parent.result.score ? 'Up from ' : r.score === parent.result.score ? 'Same as ' : 'Down from ') + parent.result.score + '/' + parent.result.max + ' last time</p>' : '') +
      (r.inferredScheme ? '<p class="help">No mark scheme was given, so Claude wrote one first. Check it against the official scheme when you can.</p>' : '') + '</div></section>';

    if (r.points.length) html += '<section class="card"><div class="card-head"><h2>Mark by mark</h2><span class="muted small">' + r.points.filter((p) => p.awarded >= p.available).length + ' of ' + r.points.length + ' points earned</span></div><ol class="marks">' + r.points.map(function (p) {
      const st2 = p.awarded >= p.available ? 'got' : p.awarded > 0 ? 'part' : 'miss';
      return '<li class="mk ' + st2 + '"><span class="mk-ic">' + C.icon(st2 === 'miss' ? 'x' : st2 === 'part' ? 'minus' : 'tick') + '</span><div class="mk-main"><p><span class="mk-label">' + esc(p.label) + '</span><span class="num mk-n">' + p.awarded + '/' + p.available + '</span> ' + esc(p.criterion) + '</p>' +
        (p.evidence ? '<blockquote>' + esc(p.evidence) + '</blockquote>' : '') + (p.comment ? '<p class="muted small">' + esc(p.comment) + '</p>' : '') + '</div></li>';
    }).join('') + '</ol></section>';

    if (r.improvements.length) html += '<section class="card"><div class="card-head"><h2>How to get full marks</h2></div><ol class="improve">' + r.improvements.map((x) => '<li><p class="imp-issue">' + esc(x.issue) + '</p><p>' + esc(x.fix) + '</p>' + (x.example ? '<div class="imp-eg"><span class="label">Try</span><p>' + esc(x.example) + '</p></div>' : '') + '</li>').join('') + '</ol></section>';
    html += '<div class="grid-2">';
    if (r.strengths.length) html += '<section class="card"><div class="card-head"><h2>What you did well</h2></div><ul class="bullets">' + r.strengths.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></section>';
    if (r.examTip || r.nextStep) html += '<section class="card tip-card"><div class="card-head"><h2>' + C.icon('bulb') + 'Exam tip</h2></div>' + (r.examTip ? '<p>' + esc(r.examTip) + '</p>' : '') + (r.nextStep ? '<p class="muted small"><b>Practise next:</b> ' + esc(r.nextStep) + '</p>' : '') + '</section>';
    html += '</div>';
    if (r.modelAnswer) html += '<details class="card fold"><summary><h2>Show a full-mark answer</h2><span class="muted small">Try improving your own first</span></summary><div class="fold-body prose">' + esc(r.modelAnswer).replace(/\n/g, '<br>') + '</div></details>';
    html += '<details class="card fold"><summary><h2>The question and your answer</h2></summary><div class="fold-body"><p class="label">Question' + (rec.marks ? ' · ' + rec.marks + ' marks' : '') + '</p><p class="prose">' + (esc(rec.question) || '<i>From a photo</i>').replace(/\n/g, '<br>') + '</p>' + storedImgs(rec, 'q') +
      (rec.ms ? '<p class="label">Mark scheme</p><p class="prose">' + esc(rec.ms).replace(/\n/g, '<br>') + '</p>' : '') + storedImgs(rec, 'ms') +
      '<p class="label">Your answer</p><p class="prose">' + (esc(rec.answer) || esc(r.transcript) || '<i>From photos</i>').replace(/\n/g, '<br>') + '</p>' + storedImgs(rec, 'a') +
      (r.transcript && rec.answer ? '' : r.transcript ? '<p class="help">Read from your photos. If something was misread, edit it and resubmit.</p>' : '') + '</div></details>';

    html += '<div class="row-actions ck-actions"><button type="button" class="btn" data-action="ck-improve" data-id="' + rec.id + '">' + C.icon('rebuild') + 'Improve and resubmit</button>' +
      '<button type="button" class="btn alt" data-action="ck-again" data-id="' + rec.id + '">' + C.icon('spark') + 'Similar question</button>' +
      (t ? '<a class="btn ghost" href="#t-' + t.gid + '">Open ' + esc(t.name) + '</a>' : '') + '</div>';

    // Follow-up chat
    const live = RH.ui.ckChat && RH.ui.ckChat.id === rec.id;
    html += '<section class="card chat"><div class="card-head"><h2>' + C.icon('chat') + 'Ask about your feedback</h2></div><div class="chat-log">' +
      (rec.chat.length || live ? '' : '<p class="muted small">For example: “Why didn’t I get the second application mark?” or “Show me how to evaluate this.”</p>') +
      rec.chat.map((m) => '<div class="msg ' + m.role + '">' + esc(m.content).replace(/\n/g, '<br>') + '</div>').join('') +
      (live ? '<div class="msg assistant" id="ck-live">' + (esc(RH.ui.ckChat.text) || '<span class="muted">Thinking…</span>') + '</div>' : '') + '</div>' +
      '<form id="ckChatForm" class="chat-form" data-id="' + rec.id + '"><textarea id="ck-ask" name="q" rows="2" placeholder="Ask a follow-up question" aria-label="Ask a follow-up question"' + (live ? ' disabled' : '') + '></textarea><button type="submit" class="btn" aria-label="Send"' + (live ? ' disabled' : '') + '>' + C.icon('send') + '</button></form></section>';
    return html;
  }
  function storedImgs(rec, tag) {
    const n = rec.imgs && rec.imgs[tag];
    if (!n) return '';
    let h = '<div class="thumbs">';
    for (let i = 0; i < n; i++) h += '<figure class="thumb"><img data-dvimg="ck:' + rec.id + ':' + tag + i + '" alt="Photo ' + (i + 1) + '"></figure>';
    return h + '</div>';
  }

  // ---------- Pages ----------
  RH.views.check = function () {
    let html = C.subnav('check', 'check');
    html += C.page({ eyebrow: 'Check', title: 'Check an answer', lede: 'Get an exam answer marked like an Edexcel examiner would, then see exactly how to reach full marks.' });
    html += '<div class="ck">' + form() + '<div class="ck-side">' + running() + recentList(4) + howItWorks() + '</div></div>';
    return html;
  };
  function howItWorks() {
    return '<section class="card soft"><h2>How it marks</h2><ul class="bullets small"><li>Each mark is matched to your own words, so you can see where it was earned or lost.</li><li>Maths uses M, A and B marks; Physics checks units, significant figures and error carried forward; Economics uses the KAA and evaluation levels.</li><li>Add the mark scheme for the most accurate marking. Photos of handwritten work are fine.</li><li>Answers you lose marks on go into that topic’s mistakes log.</li></ul></section>';
  }
  function recentList(n) {
    const list = st().checks.slice(0, n);
    if (!list.length) return '';
    return '<section class="card"><div class="card-head"><h2>Recent</h2><a class="small" href="#checks">All</a></div><ul class="list compact">' + list.map(checkRow).join('') + '</ul></section>';
  }
  function checkRow(c) {
    const r = c.result, t = c.topic && M.topic[c.topic];
    const frac = r && r.max ? r.score / r.max : 0;
    return '<li><a class="row link" href="#check-' + c.id + '" data-subj="' + c.subject + '">' + C.stag(c.subject) + '<span class="row-main"><b>' + esc((c.question || 'Question from a photo').slice(0, 80)) + '</b><span class="muted small">' + esc(U.fmtShort(c.date)) + (t ? ' · ' + esc(t.name) : '') + '</span></span><span class="score-pill ' + (frac >= 0.8 ? 'ok' : frac >= 0.5 ? 'warn' : 'bad') + ' num">' + (r ? r.score + '/' + r.max : '–') + '</span></a></li>';
  }
  RH.views.checks = function () {
    const list = st().checks;
    let html = C.subnav('check', 'checks') + C.page({ eyebrow: 'Check', title: 'History', lede: list.length ? U.plural(list.length, 'answer') + ' checked' : '' });
    if (!list.length) return html + C.empty('No answers checked yet.', 'Mark your first answer and it appears here.', '<a class="btn" href="#check">Check an answer</a>');
    const bySubj = {};
    list.forEach((c) => { (bySubj[c.subject] = bySubj[c.subject] || []).push(c); });
    html += '<div class="grid-4 stat-tiles">' + M.subjects.map(function (s) {
      const l = bySubj[s.id] || [];
      const avg = l.length ? l.reduce((a, c) => a + (c.result.max ? c.result.score / c.result.max : 0), 0) / l.length : null;
      return '<div class="card tile" data-subj="' + s.id + '">' + C.stag(s.id) + '<span class="stat-n num">' + (avg == null ? '–' : U.pct(avg)) + '</span><span class="stat-l">average over ' + U.plural(l.length, 'answer') + '</span></div>';
    }).join('') + '</div>';
    return html + '<section class="card"><ul class="list">' + list.map(checkRow).join('') + '</ul></section>';
  };
  RH.views.checkOne = function (id) {
    const rec = st().checks.find((c) => c.id === id);
    if (!rec) return C.subnav('check', '') + C.empty('That check isn’t here.', 'It may have been deleted, or made on another device before syncing.', '<a class="btn" href="#check">Check an answer</a>');
    return C.subnav('check', '') + C.crumbs([['Check', 'check'], ['History', 'checks'], ['Feedback']]) + '<div class="ck-result">' + resultView(rec) + '</div>' +
      '<div class="row-actions"><button type="button" class="btn ghost danger-t sm" data-action="ck-del" data-id="' + rec.id + '">' + C.icon('trash') + 'Delete this check</button></div>';
  };

  // ---------- Events ----------
  RH.onInput.push(function (el) {
    if (!el.dataset.ck) return false;
    draft()[el.dataset.ck] = el.value;
    return true;
  });
  RH.onChange.push(function (el) {
    if (el.dataset.ck) { draft()[el.dataset.ck] = el.value; return true; }
    if (el.dataset.ckimg) {
      const d = draft(), key = el.dataset.ckimg === 'q' ? 'qImgs' : el.dataset.ckimg === 'ms' ? 'msImgs' : 'aImgs';
      d[key] = d[key].concat(C.imageFiles(el)).slice(0, 6);
      if (el.dataset.ckimg === 'ms') RH.ui.ckOpenMs = true;
      RH.render({ keepScroll: true });
      return true;
    }
    if (el.dataset.ckpick) { pickFromPaper(el); return true; }
    return false;
  });
  async function pickFromPaper(el) {
    const d = draft();
    const src = d.source && d.source.kind === 'paper' ? d.source : { kind: 'paper' };
    if (el.dataset.ckpick === 'paper') { d.source = { kind: 'paper', paper: el.value || null }; RH.render({ keepScroll: true }); return; }
    const p = st().portal.papers[src.paper];
    const qi = Number(el.value);
    if (!p || el.value === '') return;
    const q = p.questions[qi];
    d.source = { kind: 'paper', paper: p.id, q: qi, loading: true };
    if (p.subject) d.subject = p.subject;
    d.marks = q.marks ? String(q.marks) : d.marks;
    d.topic = q.topic || d.topic;
    d.question = d.question && d.source.q === qi ? d.question : '';
    RH.render({ keepScroll: true });
    try {
      d.qImgs = await RH.portal.questionImages(p.id, qi);
      const ms = q.ms != null && p.msFile ? await RH.portal.msImage(p.id, q.ms) : null;
      d.msImgs = ms ? [ms] : [];
      if (ms) RH.ui.ckOpenMs = true;
    } catch (e) { C.toast(e.message || 'Could not read that question from the PDF.'); }
    d.source.loading = false;
    RH.render({ keepScroll: true });
  }
  RH.actions['ck-subj'] = (el) => { const d = draft(); if (d.subject !== el.dataset.v) { d.subject = el.dataset.v; d.topic = ''; } RH.render({ keepScroll: true }); };
  RH.actions['ck-mark'] = () => runCheck();
  RH.actions['ck-stop'] = () => { if (RH.ui.ckRun) RH.ui.ckRun.ctl.abort(); };
  RH.actions['ck-similar'] = () => similar();
  RH.actions['ck-improve'] = function (el) {
    const rec = st().checks.find((c) => c.id === el.dataset.id);
    RH.ui.ck = Object.assign(blank(), { subject: rec.subject, topic: rec.topic, marks: String(rec.marks || ''), question: rec.question, ms: rec.ms, answer: rec.answer || rec.result.transcript, parent: rec.id, source: rec.source });
    Promise.all(['q', 'ms'].map(async function (tag) {
      const out = [];
      for (let i = 0; i < ((rec.imgs || {})[tag] || 0); i++) { const b = await RH.files.get('ck:' + rec.id + ':' + tag + i); if (b) out.push(b); }
      return out;
    })).then(function (res) { RH.ui.ck.qImgs = res[0]; RH.ui.ck.msImgs = res[1]; location.hash = 'check'; RH.render(); });
  };
  RH.actions['ck-again'] = function (el) {
    const rec = st().checks.find((c) => c.id === el.dataset.id);
    RH.ui.ck = Object.assign(blank(), { subject: rec.subject, topic: rec.topic, marks: String(rec.marks || ''), question: rec.question });
    RH.ui.tabs['ck-src'] = 'practice';
    location.hash = 'check';
    setTimeout(similar, 0);
  };
  RH.actions['ck-del'] = function (el) {
    C.confirm('Delete this check?', 'The marking, feedback and chat will be removed.', 'Delete', function () {
      store.update(function (s) { s.checks = s.checks.filter((c) => c.id !== el.dataset.id); }, { checks: true, silent: true });
      location.hash = 'checks';
    });
  };
  RH.onSubmit.ckChatForm = function (f) { const q = String(new FormData(f).get('q') || ''); if (q.trim()) ask(f.dataset.id, q); };
  // Enter sends, Shift+Enter makes a new line.
  document.addEventListener('keydown', function (ev) {
    if (ev.target.id === 'ck-ask' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); const f = ev.target.form; if (f.requestSubmit) f.requestSubmit(); }
  });
  // Keep the "Marking" steps moving.
  setInterval(function () { if (RH.ui.ckRun && !RH.ui.ckRun.gen && location.hash === '#check') { const el = document.querySelector('.ck-running'); if (el) el.outerHTML = running(); } }, 3000);
})(window.RH = window.RH || {});
