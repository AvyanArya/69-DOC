/* Exam portal: upload a past paper PDF, split it into questions, sit it against the clock, then mark it. */
(function (RH) {
  'use strict';
  const U = RH.util, M = RH.model, C = RH.c, esc = U.esc, $ = RH.$;
  const st = () => RH.store.state;
  const store = RH.store;

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  async function pdfjs() {
    await C.loadScript(PDFJS);
    // Loading the worker as a plain script lets pdf.js run in the page, so no separate worker file is needed.
    await C.loadScript(PDFJS_WORKER);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return window.pdfjsLib;
  }

  const P = RH.portal = {};
  const docs = {}; // paperId -> {qp, ms} pdf.js documents for this visit
  const pageCache = {}; // "paper|kind|page|width" -> canvas

  // ---------- Reading a PDF ----------
  async function readPdf(buffer) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: buffer }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const items = tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height || 10 }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      items.forEach(function (it) {
        const line = lines.find((l) => Math.abs(l.y - it.y) < 2.5);
        if (line) { line.items.push(it); line.h = Math.max(line.h, it.h); }
        else lines.push({ y: it.y, h: it.h, items: [it] });
      });
      lines.forEach(function (l) {
        l.items.sort((a, b) => a.x - b.x);
        l.x = l.items[0].x;
        l.text = l.items.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim();
      });
      lines.sort((a, b) => b.y - a.y);
      pages.push({ w: vp.width, h: vp.height, lines: lines });
    }
    return { doc: doc, pages: pages };
  }

  const CODE = /\b(9PH0|9MA0|9FM0|9EC0)\s*\/?\s*(0[1-3]|3[A-D]|4[A-D])\b/i;
  const SUBJ = { '9PH0': 'physics', '9MA0': 'maths', '9FM0': 'further', '9EC0': 'economics' };
  function meta(pages) {
    const text = pages.slice(0, 2).map((p) => p.lines.map((l) => l.text).join('\n')).join('\n');
    const out = {};
    const code = CODE.exec(text.replace(/\s+/g, ' '));
    if (code) { out.code = code[1].toUpperCase() + '/' + code[2].toUpperCase(); out.subject = SUBJ[code[1].toUpperCase()]; }
    if (!out.subject) {
      if (/further\s+mathematics/i.test(text)) out.subject = 'further';
      else if (/mathematics/i.test(text)) out.subject = 'maths';
      else if (/physics/i.test(text)) out.subject = 'physics';
      else if (/economics/i.test(text)) out.subject = 'economics';
    }
    const t = /Time:?\s*(\d+)\s*hours?(?:\s*(?:and\s*)?(\d+)\s*minutes?)?/i.exec(text) || /Time:?\s*(\d+)\s*minutes/i.exec(text);
    if (t) out.dur = /minutes/i.test(t[0]) && !/hour/i.test(t[0]) ? Number(t[1]) : Number(t[1]) * 60 + Number(t[2] || 0);
    const mk = /total marks?\s+(?:for|on)\s+this\s+paper\s+is\s+(\d+)/i.exec(text);
    if (mk) out.marks = Number(mk[1]);
    const ser = /(January|February|May|June|October|November)\s+(20\d\d)/i.exec(text);
    if (ser) out.series = ser[1].charAt(0).toUpperCase() + ser[1].slice(1).toLowerCase() + ' ' + ser[2];
    return out;
  }

  const END = /\(?\s*Total\s+for\s+Question\s+(\d+)\s*(?:is|=|:)?\s*(\d+)\s*marks?\s*\)?/i;
  const isBlank = (pg) => pg.lines.some((l) => /^BLANK PAGE$/i.test(l.text)) || pg.lines.length < 3;
  const top = (pg) => pg.h * 0.94, bottom = (pg) => pg.h * 0.05;

  // Split into questions. Edexcel papers end each question with "(Total for Question N = M marks)".
  function detect(pages) {
    const ends = [];
    pages.forEach((pg, p) => pg.lines.forEach(function (l) {
      const m = END.exec(l.text);
      if (m) ends.push({ q: Number(m[1]), marks: Number(m[2]), p: p, y: l.y });
    }));
    if (ends.length >= 2) return byEndMarkers(pages, ends);
    const numbered = byNumbers(pages);
    if (numbered.length >= 2) return numbered;
    return byPages(pages);
  }

  function regionsBetween(pages, from, to) {
    // from = {p, y} just above where the question starts; to = {p, y} at the bottom of the question.
    const regs = [];
    for (let p = from.p; p <= to.p; p++) {
      const pg = pages[p];
      if (p !== from.p && p !== to.p && isBlank(pg)) continue;
      const t = p === from.p ? from.y : top(pg), b = p === to.p ? to.y : bottom(pg);
      if (t - b > 12) regs.push({ p: p, top: t, bottom: b });
    }
    return regs;
  }

  function firstQuestionStart(pages, untilPage) {
    for (let p = 1; p <= untilPage; p++) {
      const pg = pages[p];
      if (isBlank(pg)) continue;
      const l = pg.lines.find((ln) => /^1\b/.test(ln.text) && ln.x < pg.w * 0.2);
      if (l) return { p: p, y: l.y + l.h + 4 };
    }
    const p = Math.min(1, untilPage);
    return { p: p, y: top(pages[p]) };
  }

  function byEndMarkers(pages, ends) {
    ends.sort((a, b) => a.p - b.p || b.y - a.y);
    const qs = [];
    let from = firstQuestionStart(pages, ends[0].p);
    ends.forEach(function (e, i) {
      const to = { p: e.p, y: e.y - 6 };
      qs.push({ n: String(e.q), marks: e.marks, regions: regionsBetween(pages, from, to) });
      // The next question starts right under this marker, or at the top of the next page if the marker is low down.
      const pg = pages[e.p];
      from = e.y - 9 < pg.h * 0.12 && e.p + 1 < pages.length ? { p: e.p + 1, y: top(pages[e.p + 1]) } : { p: e.p, y: e.y - 9 };
      if (i + 1 < ends.length && ends[i + 1].p > from.p) {
        // skip blank pages between questions
        while (from.p < ends[i + 1].p && isBlank(pages[from.p])) from = { p: from.p + 1, y: top(pages[from.p + 1]) };
      }
    });
    return qs.filter((q) => q.regions.length);
  }

  function marksIn(pages, regs) {
    let sum = 0;
    regs.forEach((r) => pages[r.p].lines.forEach(function (l) {
      if (l.y > r.top || l.y < r.bottom) return;
      l.items.forEach((it) => { const m = /^\((\d{1,2})\)$/.exec(it.s.trim()); if (m && it.x > pages[r.p].w * 0.7) sum += Number(m[1]); });
    }));
    return sum || null;
  }

  function byNumbers(pages) {
    const starts = [];
    let want = 1;
    pages.forEach((pg, p) => {
      if (p === 0) return;
      pg.lines.forEach(function (l) {
        const m = /^(\d{1,2})\b/.exec(l.text);
        if (m && Number(m[1]) === want && l.x < pg.w * 0.15) { starts.push({ n: want, p: p, y: l.y + l.h + 4 }); want++; }
      });
    });
    const lastPage = pages.length - 1;
    return starts.map(function (s, i) {
      const nx = starts[i + 1];
      const to = nx ? { p: nx.p, y: nx.y + 2 } : { p: lastPage, y: bottom(pages[lastPage]) };
      if (nx && nx.y + 2 > top(pages[nx.p]) - 4 && nx.p > s.p) { to.p = nx.p - 1; to.y = bottom(pages[nx.p - 1]); }
      const regions = regionsBetween(pages, s, to);
      return { n: String(s.n), marks: marksIn(pages, regions), regions: regions };
    }).filter((q) => q.regions.length);
  }

  function byPages(pages) {
    return pages.map((pg, p) => ({ n: String(p + 1), marks: null, regions: [{ p: p, top: top(pg), bottom: bottom(pg) }] }))
      .filter((q, i) => i > 0 || pages.length === 1).filter((q) => !isBlank(pages[q.regions[0].p]));
  }

  // Economics Papers 1 and 2 end with an "answer ONE question" section (Q7 or Q8): when the questions add up to more
  // than the paper total, a run of equal-mark questions at the end that explains the difference is treated as a choice.
  function markChoices(qs, total) {
    const sum = qs.reduce((a, q) => a + (q.marks || 0), 0);
    if (!total || sum <= total || !qs.length) return;
    const last = qs[qs.length - 1].marks;
    let k = 0;
    for (let i = qs.length - 1; i >= 0 && qs[i].marks === last; i--) k++;
    if (k > 1 && (k - 1) * last === sum - total) qs.slice(-k).forEach((q) => { q.choice = 'c1'; });
  }

  // Marks available and scored for a set of questions. From a choice group only the best answer counts.
  function totals(p, idx, scores) {
    let max = 0, score = 0;
    const groups = {};
    idx.forEach(function (i) {
      const q = p.questions[i], m = q.marks || 0;
      const got = scores ? U.clamp(Number(scores[i]) || 0, 0, m || 999) : 0;
      if (q.choice) { const g = groups[q.choice] || (groups[q.choice] = { max: 0, score: 0 }); g.max = Math.max(g.max, m); g.score = Math.max(g.score, got); }
      else { max += m; score += got; }
    });
    Object.keys(groups).forEach((k) => { max += groups[k].max; score += groups[k].score; });
    return { max: max, score: score };
  }
  P.totals = totals;
  const choiceNote = (p, q) => q.choice ? 'Answer one of ' + p.questions.filter((x) => x.choice === q.choice).map((x) => 'Q' + x.n).join(' or ') + ', not both.' : '';

  // Find the mark scheme page for each question number.
  function msPages(pages, qs) {
    const out = {};
    let from = 1;
    qs.forEach(function (q) {
      const re = new RegExp('^' + q.n + '\\s*(\\(|[a-z]\\b|$|\\s)');
      for (let p = from; p < pages.length; p++) {
        if (pages[p].lines.some((l) => re.test(l.text) && l.x < pages[p].w * 0.25)) { out[q.n] = p; from = p; return; }
      }
    });
    return out;
  }

  // ---------- Upload ----------
  P.analyse = async function (qpFile, msFile) {
    const id = 'x' + U.uid();
    const qpBuf = await qpFile.arrayBuffer();
    const qp = await readPdf(qpBuf.slice(0));
    const info = meta(qp.pages);
    const qs = detect(qp.pages);
    markChoices(qs, info.marks);
    let ms = null, msMap = {};
    if (msFile) {
      const msBuf = await msFile.arrayBuffer();
      ms = await readPdf(msBuf.slice(0));
      msMap = msPages(ms.pages, qs);
      await RH.files.put(id + ':ms', new Blob([msBuf], { type: 'application/pdf' }));
    }
    await RH.files.put(id + ':qp', new Blob([qpBuf], { type: 'application/pdf' }));
    docs[id] = { qp: qp.doc, ms: ms && ms.doc };
    const subject = info.subject || '';
    const paperDef = subject && info.code ? (M.subject[subject].papers.find((p) => p.code === info.code)) : null;
    const total = info.marks || qs.reduce((a, q) => a + (q.marks || 0), 0) || null;
    const title = (subject ? M.subject[subject].name + ' ' : '') + (paperDef ? paperDef.name.split(':')[0] : (info.code || qpFile.name.replace(/\.pdf$/i, ''))) + (info.series ? ' · ' + info.series : '');
    const paper = {
      id: id, title: title, file: qpFile.name, msFile: msFile ? msFile.name : '', subject: subject, code: info.code || '', series: info.series || '',
      dur: info.dur || (paperDef && paperDef.dur) || 90, marks: total, pages: qp.pages.length, msPagesCount: ms ? ms.pages.length : 0,
      questions: qs.map((q) => ({ n: q.n, marks: q.marks, r: q.regions.map((g) => [g.p, Math.round(g.top), Math.round(g.bottom)]), ms: msMap[q.n] != null ? msMap[q.n] : null, topic: '', choice: q.choice || '' })),
      method: qs.length && qs[0].marks != null && qs.every((q) => q.marks != null) ? 'markers' : 'pages', added: U.today()
    };
    store.update(function (s) { s.portal.papers[id] = paper; });
    return paper;
  };

  async function getDoc(paper, kind) {
    const cache = docs[paper.id] || (docs[paper.id] = {});
    if (cache[kind]) return cache[kind];
    const blob = await RH.files.get(paper.id + ':' + kind);
    if (!blob) return null;
    const lib = await pdfjs();
    cache[kind] = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
    return cache[kind];
  }

  async function pageCanvas(paper, kind, doc, p, cssW) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const key = paper.id + '|' + kind + '|' + p + '|' + Math.round(cssW * dpr);
    if (pageCache[key]) return pageCache[key];
    const page = await doc.getPage(p + 1);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: cssW * dpr / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pageCache[key] = { canvas: canvas, vp: vp, dpr: dpr };
    return pageCache[key];
  }

  // Draw one question (all its page slices) into a container.
  async function drawQuestion(box, paper, qi) {
    const q = paper.questions[qi];
    const doc = await getDoc(paper, 'qp');
    if (!doc) { box.innerHTML = '<div class="empty"><p><b>The PDF for this paper is not on this device.</b> Upload it again on the paper page to see the questions here.</p><a class="btn btn-sm" href="#paper-' + paper.id + '">Open paper</a></div>'; return; }
    const cssW = Math.min(box.clientWidth || 760, 900);
    const frag = document.createDocumentFragment();
    for (const r of q.r) {
      const pc = await pageCanvas(paper, 'qp', doc, r[0], cssW);
      const yA = pc.vp.convertToViewportPoint(0, r[1])[1], yB = pc.vp.convertToViewportPoint(0, r[2])[1];
      const pad = Math.abs(pc.vp.convertToViewportPoint(0, 0)[1] - pc.vp.convertToViewportPoint(0, 3)[1]); // 3pt, whatever the zoom
      const y0 = Math.max(0, Math.floor(Math.min(yA, yB) - pad)), y1 = Math.min(pc.canvas.height, Math.ceil(Math.max(yA, yB) + pad));
      const out = document.createElement('canvas');
      out.width = pc.canvas.width; out.height = Math.max(1, y1 - y0);
      out.getContext('2d').drawImage(pc.canvas, 0, y0, pc.canvas.width, y1 - y0, 0, 0, pc.canvas.width, y1 - y0);
      out.style.width = cssW + 'px'; out.style.maxWidth = '100%';
      out.className = 'qslice';
      out.setAttribute('role', 'img');
      out.setAttribute('aria-label', 'Question ' + q.n + ', page ' + (r[0] + 1));
      frag.appendChild(out);
    }
    box.innerHTML = '';
    box.appendChild(frag);
  }

  async function drawPage(box, paper, kind, p) {
    const doc = await getDoc(paper, kind);
    if (!doc) { box.innerHTML = '<p class="muted small">No ' + (kind === 'ms' ? 'mark scheme' : 'question paper') + ' PDF on this device.</p>'; return; }
    p = U.clamp(p, 0, doc.numPages - 1);
    const pc = await pageCanvas(paper, kind, doc, p, Math.min(box.clientWidth || 700, 900));
    const img = document.createElement('canvas');
    img.width = pc.canvas.width; img.height = pc.canvas.height;
    img.getContext('2d').drawImage(pc.canvas, 0, 0);
    img.style.width = '100%';
    img.className = 'qslice';
    box.innerHTML = '';
    box.appendChild(img);
  }

  // Fill any question or page placeholders after a page renders.
  RH.afterRender.push(function () {
    document.querySelectorAll('[data-qdraw]').forEach(function (box) {
      const paper = st().portal.papers[box.dataset.paper];
      if (!paper) return;
      box.innerHTML = '<p class="muted small">Loading question…</p>';
      drawQuestion(box, paper, Number(box.dataset.qdraw)).catch((e) => { box.innerHTML = '<p class="danger small">' + esc(e.message) + '</p>'; });
    });
    document.querySelectorAll('[data-pagedraw]').forEach(function (box) {
      const paper = st().portal.papers[box.dataset.paper];
      if (!paper) return;
      box.innerHTML = '<p class="muted small">Loading page…</p>';
      drawPage(box, paper, box.dataset.kind, Number(box.dataset.pagedraw)).catch((e) => { box.innerHTML = '<p class="danger small">' + esc(e.message) + '</p>'; });
    });
  });

  // ---------- Pages ----------
  const papers = () => Object.keys(st().portal.papers).map((k) => st().portal.papers[k]).sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  const attemptsFor = (id) => st().portal.attempts.filter((a) => a.paper === id);
  const best = (id) => attemptsFor(id).reduce((m, a) => Math.max(m, a.max ? a.score / a.max : 0), -1);

  function findPapers(sid) {
    const subs = sid ? [M.subject[sid]] : M.subjects;
    let list = [];
    subs.forEach((s) => { list = list.concat(s.res.filter((r) => r.k === 'papers')); });
    Object.keys(RH.GALE_COMP).forEach(function (cg) {
      if (sid && M.comp[cg] && M.comp[cg].subject.id !== sid) return;
      RH.GALE_COMP[cg].forEach((g) => { if (g[0] === 'papers' && !list.some((x) => x.u === g[2])) list.push(RH.link.r('gale', 'papers', g[1], g[2])); });
    });
    return list;
  }

  RH.views.portal = function () {
    const tab = C.tab('portal', 'papers');
    let html = C.head('Practise', 'Exam portal', 'Upload a past paper PDF. The portal splits it into questions, runs a timed exam with a pace guide, then helps you mark it against the mark scheme.');
    html += C.tabs('portal', [['papers', 'My papers', 'portal', Object.keys(st().portal.papers).length], ['results', 'Results', 'log', st().portal.attempts.length + st().papers.length], ['find', 'Find papers', 'link']], tab);
    if (tab === 'results') return html + RH.views.results();
    if (tab === 'find') {
      return html + '<p class="help">Download a question paper and its mark scheme, then upload both on the <b>My papers</b> tab.</p><div class="res-cols">' +
        M.subjects.map((s) => '<section class="panel" data-subj="' + s.id + '"><h2>' + C.stag(s.id) + esc(s.name) + '</h2>' + C.resList(findPapers(s.id)) + '</section>').join('') + '</div>';
    }
    html += '<section class="sheet upload"><h2>Add a paper</h2><form id="uploadForm" class="upload-form">' +
      '<label class="drop" for="up-qp">' + C.icon('upload') + '<b>Question paper (PDF)</b><span class="muted small" id="up-qp-name">Choose or drop the file</span><input type="file" id="up-qp" name="qp" accept="application/pdf,.pdf" required></label>' +
      '<label class="drop" for="up-ms">' + C.icon('notes') + '<b>Mark scheme (PDF, optional)</b><span class="muted small" id="up-ms-name">Add it now or later</span><input type="file" id="up-ms" name="ms" accept="application/pdf,.pdf"></label>' +
      '<button type="submit" class="btn btn-lg" id="up-go">' + C.icon('portal') + 'Read paper</button></form>' +
      '<p class="help" id="up-status">Works best with Pearson Edexcel papers from PMT, Mr Gale\'s past paper pages or the Pearson website. Files stay on this device.</p></section>';
    const list = papers();
    html += list.length ? '<section class="panel"><h2>Your papers</h2><ul class="paper-list">' + list.map(function (p) {
      const b = best(p.id);
      return '<li class="paper-item"' + (p.subject ? ' data-subj="' + p.subject + '"' : '') + '>' + (p.subject ? C.stag(p.subject) : '<span class="stag stag-none">PDF</span>') +
        '<a class="pi-main" href="#paper-' + p.id + '"><b>' + esc(p.title) + '</b><span class="muted small">' + U.plural(p.questions.length, 'question') + (p.marks ? ' · ' + p.marks + ' marks' : '') + ' · ' + U.mins(p.dur) + (p.msFile ? ' · mark scheme added' : '') + '</span></a>' +
        (b >= 0 ? '<span class="cd mono">Best ' + U.pct(b) + '</span>' : '') +
        '<button type="button" class="btn btn-sm" data-action="exam-start" data-id="' + p.id + '">' + C.icon('timer') + 'Sit paper</button></li>';
    }).join('') + '</ul></section>' : C.empty('No papers yet.', 'Download one from the "Find papers" tab, then add it above.');
    return html;
  };

  RH.views.paper = function (id) {
    const p = st().portal.papers[id];
    if (!p) return C.head('', 'Paper not found', '') + '<a class="btn" href="#portal">Back to the exam portal</a>';
    const mpm = p.marks ? p.dur / p.marks : null;
    const attempts = attemptsFor(id);
    let html = C.crumbs([['Exam portal', 'portal'], [p.title]]);
    html += C.head((p.subject ? C.stag(p.subject) + ' ' : '') + esc(p.code || 'Uploaded paper'), esc(p.title), U.plural(p.questions.length, 'question') + (p.marks ? ' · ' + p.marks + ' marks' : '') + ' · ' + U.mins(p.dur) + (mpm ? ' · about ' + (Math.round(mpm * 10) / 10) + ' min per mark' : ''),
      '<button type="button" class="btn btn-lg" data-action="exam-start" data-id="' + p.id + '">' + C.icon('timer') + 'Sit full paper</button>');
    const qsum = totals(p, p.questions.map((q, i) => i)).max;
    if (p.method === 'markers' && p.marks && qsum !== p.marks) html += '<div class="banner"><p><b>Check the marks.</b> The questions add up to ' + qsum + ' but the paper is out of ' + p.marks + '. Fix any question marks below that look wrong.</p></div>';
    if (p.method !== 'markers') html += '<div class="banner"><p><b>Check the questions.</b> The paper didn\'t have "Total for Question" lines, so it was split ' + (p.questions.length && p.questions[0].marks == null ? 'by page' : 'by question numbers') + '. Fix the marks below if they look wrong.</p></div>';
    html += '<section class="panel"><h2>Paper details</h2><div class="three">' +
      '<div class="field"><label for="pp-title">Title</label><input id="pp-title" data-paper="' + id + '" data-pf="title" value="' + esc(p.title) + '"></div>' +
      '<div class="field"><label for="pp-subj">Subject</label><select id="pp-subj" data-paper="' + id + '" data-pf="subject"><option value="">Other</option>' + M.subjects.map((s) => '<option value="' + s.id + '"' + (p.subject === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select></div>' +
      '<div class="two"><div class="field"><label for="pp-dur">Minutes</label><input id="pp-dur" type="number" min="5" max="300" data-paper="' + id + '" data-pf="dur" value="' + p.dur + '"></div><div class="field"><label for="pp-marks">Marks</label><input id="pp-marks" type="number" min="1" max="400" data-paper="' + id + '" data-pf="marks" value="' + (p.marks || '') + '"></div></div></div>' +
      '<div class="row-actions"><label class="btn-ghost file-btn">' + C.icon('upload') + (p.msFile ? 'Replace mark scheme' : 'Add mark scheme') + '<input type="file" accept="application/pdf,.pdf" data-paperfile="ms" data-paper="' + id + '"></label>' +
      '<label class="btn-ghost file-btn">' + C.icon('upload') + 'Re-upload question paper<input type="file" accept="application/pdf,.pdf" data-paperfile="qp" data-paper="' + id + '"></label>' +
      '<button type="button" class="btn-ghost danger" data-action="paper-remove" data-id="' + id + '">' + C.icon('trash') + 'Delete paper</button></div></section>';
    html += '<section class="panel"><div class="sec-head"><h2>Questions</h2><span class="muted small">Click a question to preview it</span></div><div class="table-wrap"><table class="tbl qtbl"><thead><tr><th>Question</th><th class="num">Marks</th><th class="num">Suggested time</th><th>Pages</th><th>Topic</th><th></th></tr></thead><tbody>' +
      p.questions.map((q, i) => '<tr><td><button type="button" class="btn-link" data-action="q-preview" data-id="' + id + '" data-i="' + i + '"><b>Q' + esc(q.n) + '</b></button>' + (q.choice ? ' <span class="pill" title="' + esc(choiceNote(p, q)) + '">choice</span>' : '') + '</td>' +
        '<td class="num"><input type="number" class="num-in" min="0" max="200" data-paper="' + id + '" data-qm="' + i + '" value="' + (q.marks == null ? '' : q.marks) + '" aria-label="Marks for question ' + esc(q.n) + '"></td>' +
        '<td class="num mono">' + (mpm && q.marks ? U.mins(Math.round(q.marks * mpm)) : '–') + '</td><td class="mono small">' + q.r.map((r) => r[0] + 1).filter((v, k, a) => a.indexOf(v) === k).join(', ') + '</td>' +
        '<td><select class="topic-sel" data-paper="' + id + '" data-qt="' + i + '" aria-label="Topic for question ' + esc(q.n) + '"><option value="">–</option>' + topicOpts(p.subject, q.topic) + '</select></td>' +
        '<td class="row-actions"><button type="button" class="btn-ghost btn-sm" data-action="exam-start" data-id="' + id + '" data-q="' + i + '">Practise</button>' + (i ? '<button type="button" class="btn-icon" data-action="q-merge" data-id="' + id + '" data-i="' + i + '" title="Merge into previous question" aria-label="Merge into previous question">' + C.icon('x') + '</button>' : '') + '</td></tr>').join('') +
      '</tbody></table></div><p class="help">Linking questions to topics lets the portal add lost marks to that topic\'s mistakes log when you mark the paper.</p></section>';
    if (attempts.length) html += '<section class="panel"><h2>Your attempts</h2>' + attemptTable(attempts) + '</section>';
    return html;
  };

  function topicOpts(sid, sel) {
    if (!sid) return '';
    return M.compsFor(st(), M.subject[sid], true).map((c) => '<optgroup label="' + esc(c.name) + '">' + c.topics.map((t) => '<option value="' + t.gid + '"' + (sel === t.gid ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</optgroup>').join('');
  }

  function attemptTable(list) {
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Paper</th><th class="num">Score</th><th class="num">%</th><th class="num">Time used</th><th></th></tr></thead><tbody>' +
      list.slice().sort((a, b) => b.date.localeCompare(a.date)).map((a) => '<tr' + (a.subject ? ' data-subj="' + a.subject + '"' : '') + '><td class="mono">' + esc(U.fmtShort(a.date)) + '</td><td>' + (a.subject ? C.stag(a.subject) : '') + esc(a.title) + (a.single ? ' <span class="muted small">(Q' + esc(a.single) + ')</span>' : '') + '</td>' +
        '<td class="num mono">' + a.score + '/' + a.max + '</td><td class="num mono"><b>' + U.pct(a.score / a.max) + '</b></td><td class="num mono">' + RH.timer.fmt(a.used) + ' / ' + U.mins(a.dur) + '</td>' +
        '<td><button type="button" class="btn-icon" data-action="attempt-del" data-id="' + a.id + '" aria-label="Delete attempt">' + C.icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div>';
  }

  // ---------- Exam mode ----------
  const live = () => st().portal.live;
  function elapsedOn(L, i) { return (L.timeOn[i] || 0) + (L.current === i && !L.paused ? (Date.now() - L.since) / 1000 : 0); }
  function leftSec(L) { return L.paused ? L.pausedLeft : Math.max(0, (L.endsAt - Date.now()) / 1000); }

  P.start = function (paperId, single, opts) {
    const p = st().portal.papers[paperId];
    const qIdx = single != null ? [Number(single)] : p.questions.map((q, i) => i);
    const marks = totals(p, qIdx).max;
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    const extra = (opts && opts.extra) || 0;
    const dur = Math.round((single != null ? Math.max(3, Math.round((p.questions[single].marks || 5) * mpm)) : p.dur) * 60 * (1 + extra / 100));
    store.update(function (s) {
      s.portal.live = { paper: paperId, single: single != null ? p.questions[single].n : null, qs: qIdx, current: qIdx[0], since: Date.now(), endsAt: Date.now() + dur * 1000, dur: dur, paused: false, pausedLeft: 0,
        strict: !!(opts && opts.strict), timeOn: {}, flags: {}, visited: {}, done: {}, notes: {}, marks: marks, warned: {}, started: Date.now() };
      s.portal.live.visited[qIdx[0]] = 1;
    }, { silent: true });
    location.hash = 'exam';
    RH.render();
  };
  function switchTo(i) {
    store.update(function (s) {
      const L = s.portal.live;
      if (!L.paused) L.timeOn[L.current] = (L.timeOn[L.current] || 0) + (Date.now() - L.since) / 1000;
      L.current = i; L.since = Date.now(); L.visited[i] = 1;
    }, { silent: true });
    RH.render({ keepScroll: false });
  }

  RH.views.exam = function () {
    const L = live();
    if (!L) return C.empty('No exam in progress.', 'Start one from a paper in the exam portal.', '<a class="btn" href="#portal">Exam portal</a>');
    const p = st().portal.papers[L.paper];
    if (!p) return C.empty('That paper was deleted.', '', '<button type="button" class="btn" data-action="exam-quit">Close exam</button>');
    const pos = L.qs.indexOf(L.current);
    const q = p.questions[L.current];
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    const sugg = q.marks ? Math.round(q.marks * mpm * 60) : null;
    let html = '<div class="exam-mode" data-subj="' + (p.subject || '') + '">' +
      '<div class="exam-bar"><div class="eb-title"><b>' + esc(p.title) + '</b><span class="muted small">' + (L.single ? 'Practice: question ' + esc(L.single) : U.plural(L.qs.length, 'question') + ' · ' + L.marks + ' marks') + (L.strict ? ' · exam conditions' : '') + '</span></div>' +
      '<div class="eb-clock"><span class="mono big" id="ex-left">' + RH.timer.fmt(leftSec(L)) + '</span><span class="small" id="ex-pace"></span></div>' +
      '<div class="eb-actions">' + (L.strict ? '' : '<button type="button" class="btn-ghost btn-sm" data-action="exam-pause">' + C.icon(L.paused ? 'play' : 'pause') + (L.paused ? 'Resume' : 'Pause') + '</button>') +
      '<button type="button" class="btn-ghost btn-sm" data-action="exam-full" title="Full screen">' + C.icon('expand') + '</button>' +
      '<button type="button" class="btn btn-sm" data-action="exam-finish">' + C.icon('check') + 'Finish</button></div></div>' +
      '<div class="meter exam-meter"><span id="ex-meter" style="width:0%"></span></div>';
    html += '<div class="exam-cols"><nav class="qnav" aria-label="Questions">' + L.qs.map((i) => {
      const qq = p.questions[i];
      const cls = (i === L.current ? ' on' : '') + (L.done[i] ? ' done' : L.visited[i] ? ' seen' : '') + (L.flags[i] ? ' flag' : '');
      return '<button type="button" class="qchip' + cls + '" data-action="exam-go" data-i="' + i + '" aria-current="' + (i === L.current) + '"' + (qq.choice ? ' title="' + esc(choiceNote(p, qq)) + '"' : '') + '><b>Q' + esc(qq.n) + (qq.choice ? ' <span class="or">or</span>' : '') + '</b><span class="mono small">' + (qq.marks == null ? '?' : qq.marks) + 'm</span></button>';
    }).join('') + '<p class="qnav-key small muted"><span class="k done"></span>done <span class="k flag"></span>flagged <span class="k seen"></span>seen</p></nav>';
    html += '<section class="qpane">' + (L.paused ? '<div class="paused"><b>Paused</b><p class="muted">The clock is stopped. Questions are hidden until you resume.</p><button type="button" class="btn" data-action="exam-pause">' + C.icon('play') + 'Resume</button></div>' :
      '<div class="q-head"><h2>Question ' + esc(q.n) + '</h2><span class="muted small">' + (q.marks == null ? 'marks unknown' : U.plural(q.marks, 'mark')) + (sugg ? ' · aim for ' + RH.timer.fmt(sugg) : '') + ' · on it for <span class="mono" id="ex-qtime">' + RH.timer.fmt(elapsedOn(L, L.current)) + '</span></span></div>' +
      (q.choice ? '<p class="hint choice-note">' + C.icon('flag') + esc(choiceNote(p, q)) + '</p>' : '') +
      '<div class="qcrop" data-qdraw="' + L.current + '" data-paper="' + p.id + '"></div>' +
      '<div class="field"><label for="ex-notes">Working or answer notes (optional)</label><textarea id="ex-notes" data-exnote="' + L.current + '" rows="3" placeholder="Most people write on paper. Use this for quick notes, or to type answers for essay questions.">' + esc(L.notes[L.current] || '') + '</textarea></div>' +
      '<div class="q-actions"><button type="button" class="btn-ghost" data-action="exam-go" data-i="' + (L.qs[pos - 1] != null ? L.qs[pos - 1] : '') + '"' + (pos > 0 ? '' : ' disabled') + '>' + C.icon('left') + 'Previous</button>' +
      '<button type="button" class="btn-ghost' + (L.flags[L.current] ? ' on' : '') + '" data-action="exam-flag">' + C.icon('flag') + (L.flags[L.current] ? 'Flagged' : 'Flag to come back') + '</button>' +
      '<button type="button" class="btn-ghost" data-action="exam-done">' + C.icon('check') + (L.done[L.current] ? 'Marked as done' : 'Mark as done') + '</button>' +
      (pos < L.qs.length - 1 ? '<button type="button" class="btn" data-action="exam-go" data-i="' + L.qs[pos + 1] + '">Next' + C.icon('right') + '</button>' : '<button type="button" class="btn" data-action="exam-finish">Finish' + C.icon('check') + '</button>') + '</div>') +
      '</section></div><p class="muted small center keys">Keys: ← → move between questions · F flag</p></div>';
    return html;
  };

  // Live clock for the exam.
  setInterval(function () {
    const L = live();
    if (!L || location.hash !== '#exam') return;
    const left = leftSec(L);
    const el = $('#ex-left');
    if (el) {
      el.textContent = RH.timer.fmt(left);
      el.classList.toggle('low', left < 300);
      const used = L.dur - left;
      const meter = $('#ex-meter'); if (meter) meter.style.width = Math.min(100, 100 * used / L.dur) + '%';
      const qt = $('#ex-qtime'); if (qt) qt.textContent = RH.timer.fmt(elapsedOn(L, L.current));
      const p = st().portal.papers[L.paper];
      const pace = $('#ex-pace');
      if (pace && p && L.marks) {
        const doneMarks = L.qs.filter((i) => L.done[i]).reduce((a, i) => a + (p.questions[i].marks || 0), 0);
        const expected = L.dur * doneMarks / L.marks;
        const diff = Math.round((expected - used) / 60);
        pace.textContent = doneMarks ? (diff >= 0 ? (diff ? diff + ' min ahead' : 'On pace') : (-diff) + ' min behind') : 'Mark questions done to see your pace';
        pace.className = 'small ' + (doneMarks && diff < -2 ? 'pace-bad' : doneMarks ? 'pace-good' : 'muted');
      }
    }
    if (!L.paused) {
      [30, 10, 5].forEach(function (m) {
        if (left <= m * 60 && L.dur > m * 60 && !L.warned[m]) { L.warned[m] = 1; C.chime('warn'); C.toast(m + ' minutes left'); }
      });
      if (left <= 0 && !L.over) { L.over = true; C.chime('end'); C.toast('Time is up. Pens down.'); finish(); }
    }
  }, 500);

  function finish() {
    store.update(function (s) {
      const L = s.portal.live;
      if (!L) return;
      if (!L.paused) L.timeOn[L.current] = (L.timeOn[L.current] || 0) + (Date.now() - L.since) / 1000;
      const left = L.paused ? L.pausedLeft : Math.max(0, (L.endsAt - Date.now()) / 1000);
      s.portal.marking = { paper: L.paper, single: L.single, qs: L.qs, used: Math.round(L.dur - left), dur: Math.round(L.dur / 60), timeOn: L.timeOn, notes: L.notes, scores: {}, msPage: null, current: L.qs[0], logMistakes: true };
      s.portal.live = null;
    });
    location.hash = 'mark';
    RH.render();
  }

  // ---------- Marking ----------
  RH.views.mark = function () {
    const K = st().portal.marking;
    if (!K) return C.empty('Nothing to mark.', '', '<a class="btn" href="#portal">Exam portal</a>');
    const p = st().portal.papers[K.paper];
    if (!p) return C.empty('That paper was deleted.', '', '<a class="btn" href="#portal">Exam portal</a>');
    const q = p.questions[K.current];
    const tt = totals(p, K.qs, K.scores), total = tt.max, score = tt.score;
    const msPage = K.msPage != null ? K.msPage : (q.ms != null ? q.ms : 0);
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    let html = C.crumbs([['Exam portal', 'portal'], [p.title, 'paper-' + p.id], ['Marking']]);
    html += C.head('Marking', esc(p.title), 'Time used ' + RH.timer.fmt(K.used) + ' of ' + U.mins(K.dur) + ' · running score <b class="mono">' + score + ' / ' + total + '</b>' + (total ? ' (' + U.pct(score / total) + ')' : ''),
      '<button type="button" class="btn btn-lg" data-action="mark-save">' + C.icon('check') + 'Save result</button>');
    html += '<div class="mark-nav">' + K.qs.map((i) => {
      const qq = p.questions[i];
      const has = K.scores[i] != null && K.scores[i] !== '';
      return '<button type="button" class="qchip' + (i === K.current ? ' on' : '') + (has ? ' done' : '') + '" data-action="mark-go" data-i="' + i + '"><b>Q' + esc(qq.n) + '</b><span class="mono small">' + (has ? K.scores[i] : '–') + '/' + (qq.marks == null ? '?' : qq.marks) + '</span></button>';
    }).join('') + '</div>';
    const t = K.timeOn[K.current] || 0, sugg = q.marks ? q.marks * mpm * 60 : 0;
    html += '<div class="mark-cols"><section class="sheet"><div class="q-head"><h2>Question ' + esc(q.n) + '</h2><span class="muted small">You spent <b class="mono">' + RH.timer.fmt(t) + '</b>' + (sugg ? ' (aim ' + RH.timer.fmt(sugg) + ')' + (t > sugg * 1.3 ? ' · <span class="pace-bad">too long</span>' : '') : '') + '</span></div>' +
      (q.choice ? '<p class="hint choice-note">' + C.icon('flag') + esc(choiceNote(p, q)) + ' Only your better mark counts.</p>' : '') +
      '<div class="qcrop" data-qdraw="' + K.current + '" data-paper="' + p.id + '"></div>' +
      (K.notes[K.current] ? '<div class="tip"><span class="label">Your notes</span><p>' + esc(K.notes[K.current]) + '</p></div>' : '') +
      '<div class="score-row"><label for="mk-score"><b>Marks scored</b></label><input id="mk-score" type="number" min="0" max="' + (q.marks || 200) + '" data-mscore="' + K.current + '" value="' + (K.scores[K.current] != null ? esc(K.scores[K.current]) : '') + '" inputmode="numeric"><span class="mono">/ ' + (q.marks == null ? '?' : q.marks) + '</span>' +
      '<button type="button" class="btn-ghost btn-sm" data-action="mark-full" data-i="' + K.current + '">Full marks</button><button type="button" class="btn-ghost btn-sm" data-action="mark-zero" data-i="' + K.current + '">0</button>' +
      '<button type="button" class="btn btn-sm" data-action="mark-next">Next question' + C.icon('right') + '</button></div>' +
      '<div class="field"><label for="mk-topic">Topic this question tests</label><select id="mk-topic" data-paper="' + p.id + '" data-qt="' + K.current + '"><option value="">–</option>' + topicOpts(p.subject, q.topic) + '</select></div></section>' +
      '<section class="sheet ms-pane"><div class="sec-head"><h2>Mark scheme</h2>' + (p.msFile ? '<span class="row-actions"><button type="button" class="btn-icon" data-action="ms-page" data-v="-1" aria-label="Previous page">' + C.icon('left') + '</button><span class="mono small">page ' + (msPage + 1) + (p.msPagesCount ? ' / ' + p.msPagesCount : '') + '</span><button type="button" class="btn-icon" data-action="ms-page" data-v="1" aria-label="Next page">' + C.icon('right') + '</button></span>' : '') + '</div>' +
      (p.msFile ? '<div class="qcrop" data-pagedraw="' + msPage + '" data-kind="ms" data-paper="' + p.id + '"></div>'
        : '<p class="muted">No mark scheme added for this paper.</p><label class="btn-ghost file-btn">' + C.icon('upload') + 'Add the mark scheme PDF<input type="file" accept="application/pdf,.pdf" data-paperfile="ms" data-paper="' + p.id + '"></label>') + '</section></div>';
    html += '<label class="toggle"><input type="checkbox" data-mlog="1"' + (K.logMistakes ? ' checked' : '') + '><span class="tg-ui" aria-hidden="true"></span><span class="tg-text"><b>Add lost marks to topic mistakes logs</b><span class="help">For questions linked to a topic, a line goes into that topic\'s notes when you lose more than half the marks.</span></span></label>';
    return html;
  };

  function saveResult() {
    const s0 = st(), K = s0.portal.marking, p = s0.portal.papers[K.paper];
    const tt = totals(p, K.qs, K.scores), max = tt.max, score = tt.score;
    if (!max) { C.toast('Add the marks for each question on the paper page first.'); return; }
    const today = U.today();
    store.update(function (s) {
      const att = { id: 'a' + U.uid(), paper: p.id, title: p.title, subject: p.subject, single: K.single, date: today, score: score, max: max, used: K.used, dur: K.dur,
        per: K.qs.map((i) => [p.questions[i].n, Number(K.scores[i]) || 0, p.questions[i].marks || 0, Math.round(K.timeOn[i] || 0)]) };
      s.portal.attempts.push(att);
      if (!K.single && p.subject) s.papers.push({ id: 'p' + U.uid(), subject: p.subject, paper: p.code || p.title, series: p.series || '', score: score, max: max, date: today, notes: 'Sat in the exam portal' });
      if (K.logMistakes) K.qs.forEach(function (i) {
        const q = p.questions[i], got = Number(K.scores[i]) || 0;
        if (q.topic && q.marks && got < q.marks / 2) {
          const t = s.topics[q.topic] || (s.topics[q.topic] = { c: 0, p: [], notes: '', last: null, n: 0 });
          t.notes = (t.notes ? t.notes + '\n' : '') + '• ' + U.fmtShort(today) + ': lost marks on ' + p.title + ' Q' + q.n + ' (' + got + '/' + q.marks + ')';
        }
      });
      s.activity[today] = (s.activity[today] || 0) + 1;
      s.portal.marking = null;
    });
    RH.ui.tabs.portal = 'results';
    C.toast('Saved: ' + score + '/' + max + ' (' + U.pct(score / max) + ')');
    location.hash = 'portal';
    RH.render();
  }

  // Results tab: portal attempts plus papers logged by hand.
  function spark(points) {
    if (points.length < 2) return '';
    const w = 160, h = 40, pad = 4;
    const xs = (i) => pad + i * (w - 2 * pad) / (points.length - 1);
    const ys = (v) => h - pad - v * (h - 2 * pad);
    const d = points.map((v, i) => (i ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(v).toFixed(1)).join(' ');
    const last = points.length - 1;
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Score trend"><path class="sp-grid" d="M' + pad + ' ' + ys(0.5) + 'H' + (w - pad) + '"/><path class="sp-line" d="' + d + '"/><circle class="sp-end" cx="' + xs(last) + '" cy="' + ys(points[last]) + '" r="3"/></svg>';
  }
  RH.views.results = function () {
    const s = st(), today = U.today();
    let html = '<div class="trend-grid">' + M.subjects.map(function (sub) {
      const mine = s.papers.filter((p) => p.subject === sub.id).sort((a, b) => a.date.localeCompare(b.date));
      const pcts = mine.map((p) => p.score / p.max);
      const last3 = pcts.slice(-3);
      const avg = last3.length ? last3.reduce((a, x) => a + x, 0) / last3.length : null;
      return '<div class="trend" data-subj="' + sub.id + '">' + C.stag(sub.id) + '<span class="tr-n mono">' + (avg == null ? '–' : U.pct(avg)) + '</span><span class="muted small">' + (mine.length ? 'average of last ' + last3.length : 'no papers yet') + '</span>' + spark(pcts) + '</div>';
    }).join('') + '</div>';
    if (s.portal.attempts.length) html += '<section class="panel"><h2>Papers sat in the portal</h2>' + attemptTable(s.portal.attempts) + '</section>';
    const sid = RH.ui.paperSubj || 'physics', sub = M.subject[sid];
    html += '<section class="panel"><h2>Log a paper you did on paper</h2><form id="paperForm" class="paper-form">' +
      '<div class="three"><div class="field"><label for="p-subj">Subject</label><select id="p-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="p-paper">Paper</label><select id="p-paper" name="paper">' + sub.papers.map((p) => '<option value="' + esc(p.code) + '">' + esc(p.code + ' ' + p.name.replace(/^Paper \w+: /, '')) + '</option>').join('') + '<option value="Other">Other / practice paper</option></select></div>' +
      '<div class="field"><label for="p-series">Series</label><input id="p-series" name="series" placeholder="e.g. June 2023"></div></div>' +
      '<div class="three"><div class="field"><label for="p-score">Score</label><input id="p-score" name="score" type="number" min="0" step="1" required></div>' +
      '<div class="field"><label for="p-max">Out of</label><input id="p-max" name="max" type="number" min="1" step="1" required value="' + (sub.papers[0] ? sub.papers[0].marks : 100) + '"></div>' +
      '<div class="field"><label for="p-date">Date</label><input id="p-date" name="date" type="date" value="' + today + '"></div></div>' +
      '<div class="field"><label for="p-notes">What went wrong?</label><input id="p-notes" name="notes" placeholder="Topics to fix"></div>' +
      '<button type="submit" class="btn">' + C.icon('plus') + 'Log paper</button></form></section>';
    const list = s.papers.slice().sort((a, b) => b.date.localeCompare(a.date));
    html += '<section class="panel"><h2>All paper scores</h2>' + (list.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Subject</th><th>Paper</th><th class="num">Score</th><th class="num">%</th><th>Notes</th><th></th></tr></thead><tbody>' +
      list.map((p) => '<tr data-subj="' + p.subject + '"><td class="mono">' + esc(U.fmtShort(p.date)) + '</td><td>' + C.stag(p.subject) + '</td><td>' + esc(p.paper) + (p.series ? ' <span class="muted">' + esc(p.series) + '</span>' : '') + '</td><td class="num mono">' + p.score + '/' + p.max + '</td><td class="num mono"><b>' + U.pct(p.score / p.max) + '</b></td><td class="small">' + esc(p.notes || '') + '</td>' +
        '<td><button type="button" class="btn-icon" data-action="paper-del" data-id="' + p.id + '" aria-label="Delete">' + C.icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No scores yet. Sit a paper in the portal or log one above.</p>') + '</section>';
    return html;
  };

  // ---------- Actions ----------
  RH.onSubmit.uploadForm = async function (f) {
    const qp = f.querySelector('#up-qp').files[0], ms = f.querySelector('#up-ms').files[0];
    if (!qp) { C.toast('Choose the question paper PDF first.'); return; }
    const btn = $('#up-go'), status = $('#up-status');
    btn.disabled = true; btn.textContent = 'Reading the paper…';
    status.textContent = 'Loading the PDF reader and finding the questions. This takes a few seconds.';
    try {
      const paper = await P.analyse(qp, ms);
      C.toast('Found ' + U.plural(paper.questions.length, 'question') + (paper.marks ? ' (' + paper.marks + ' marks)' : ''));
      location.hash = 'paper-' + paper.id;
      RH.render();
    } catch (e) {
      btn.disabled = false; btn.innerHTML = C.icon('portal') + 'Read paper';
      status.textContent = 'That file could not be read: ' + (e && e.message ? e.message : 'unknown error') + '. Make sure it is a PDF, not a scan inside a ZIP.';
    }
  };
  RH.onChange.push(function (el) {
    if (el.id === 'up-qp' || el.id === 'up-ms') { const n = $('#' + el.id + '-name'); if (n) n.textContent = el.files[0] ? el.files[0].name : 'Choose or drop the file'; return true; }
    if (el.dataset.paperfile) {
      const id = el.dataset.paper, kind = el.dataset.paperfile, file = el.files && el.files[0];
      if (!file) return true;
      (async function () {
        try {
          const buf = await file.arrayBuffer();
          const read = await readPdf(buf.slice(0));
          await RH.files.put(id + ':' + kind, new Blob([buf], { type: 'application/pdf' }));
          delete (docs[id] || {})[kind];
          Object.keys(pageCache).forEach((k) => { if (k.indexOf(id + '|' + kind + '|') === 0) delete pageCache[k]; });
          store.update(function (s) {
            const p = s.portal.papers[id];
            if (kind === 'ms') { p.msFile = file.name; p.msPagesCount = read.pages.length; const map = msPages(read.pages, p.questions); p.questions.forEach((q) => { q.ms = map[q.n] != null ? map[q.n] : null; }); }
            else { p.file = file.name; p.pages = read.pages.length; }
          });
          C.toast(kind === 'ms' ? 'Mark scheme added' : 'Question paper replaced');
        } catch (e) { C.toast('That file could not be read as a PDF.'); }
      })();
      return true;
    }
    if (el.dataset.pf) {
      const id = el.dataset.paper, k = el.dataset.pf;
      store.update(function (s) { const p = s.portal.papers[id]; p[k] = k === 'dur' || k === 'marks' ? Number(el.value) || null : el.value; if (k === 'dur' && !p.dur) p.dur = 60; }, { silent: k === 'title' });
      return true;
    }
    if (el.dataset.qm != null && el.dataset.paper) {
      store.update(function (s) {
        const p = s.portal.papers[el.dataset.paper];
        p.questions[Number(el.dataset.qm)].marks = el.value === '' ? null : Number(el.value);
        const sum = p.questions.reduce((a, q) => a + (q.marks || 0), 0);
        if (sum) p.marks = sum;
      });
      return true;
    }
    if (el.dataset.qt != null && el.dataset.paper) {
      store.update(function (s) { s.portal.papers[el.dataset.paper].questions[Number(el.dataset.qt)].topic = el.value; }, { silent: true });
      return true;
    }
    if (el.dataset.mlog) { store.update(function (s) { s.portal.marking.logMistakes = el.checked; }, { silent: true }); return true; }
    return false;
  });
  RH.onInput.push(function (el) {
    if (el.dataset.exnote != null) { const L = live(); if (L) { L.notes[el.dataset.exnote] = el.value; store.update(() => {}, { silent: true }); } return true; }
    if (el.dataset.mscore != null) {
      store.update(function (s) { s.portal.marking.scores[el.dataset.mscore] = el.value; }, { silent: true });
      return true;
    }
    return false;
  });

  RH.actions['exam-start'] = function (el) {
    const id = el.dataset.id, single = el.dataset.q;
    const p = st().portal.papers[id];
    if (st().portal.live) {
      C.confirm('Start a new exam?', 'You have an exam in progress. Starting another ends it without saving.', 'Start new exam', () => openStart(p, single));
      return;
    }
    openStart(p, single);
  };
  function openStart(p, single) {
    const q = single != null ? p.questions[Number(single)] : null;
    C.openModal(single != null ? 'Practise question ' + esc(q.n) : 'Sit ' + esc(p.title),
      '<p>' + (single != null ? U.plural(q.marks || 0, 'mark') + '. The timer is set from the paper\'s minutes per mark.' : U.plural(p.questions.length, 'question') + (p.marks ? ', ' + p.marks + ' marks' : '') + ', ' + U.mins(p.dur) + '.') + '</p>' +
      '<div class="field"><label for="ex-extra">Extra time</label><select id="ex-extra"><option value="0">None</option><option value="10">10%</option><option value="25">25%</option><option value="50">50%</option></select></div>' +
      '<label class="toggle"><input type="checkbox" id="ex-strict"><span class="tg-ui" aria-hidden="true"></span><span class="tg-text"><b>Exam conditions</b><span class="help">No pausing. Have paper, pen and calculator ready.</span></span></label>' +
      '<div class="row-actions"><button type="button" class="btn btn-lg" data-action="exam-go-start" data-id="' + p.id + '"' + (single != null ? ' data-q="' + single + '"' : '') + '>' + C.icon('play') + 'Start the clock</button><button type="button" class="btn-ghost" data-action="modal-close">Cancel</button></div>');
  }
  RH.actions['exam-go-start'] = function (el) {
    const extra = Number(($('#ex-extra') || {}).value || 0), strict = !!($('#ex-strict') || {}).checked;
    C.closeModal(); C.primeAudio();
    P.start(el.dataset.id, el.dataset.q != null ? Number(el.dataset.q) : null, { extra: extra, strict: strict });
  };
  RH.actions['exam-go'] = (el) => { if (el.dataset.i !== '') switchTo(Number(el.dataset.i)); };
  RH.actions['exam-flag'] = () => { store.update(function (s) { const L = s.portal.live; L.flags[L.current] = !L.flags[L.current]; }, { silent: true }); RH.render({ keepScroll: true }); };
  RH.actions['exam-done'] = function () {
    const L = live();
    store.update(function (s) { const l = s.portal.live; l.done[l.current] = !l.done[l.current]; }, { silent: true });
    const pos = L.qs.indexOf(L.current);
    if (L.done[L.current] && pos < L.qs.length - 1) switchTo(L.qs[pos + 1]); else RH.render({ keepScroll: true });
  };
  RH.actions['exam-pause'] = function () {
    store.update(function (s) {
      const L = s.portal.live;
      if (L.strict) return;
      if (L.paused) { L.endsAt = Date.now() + L.pausedLeft * 1000; L.since = Date.now(); L.paused = false; }
      else { L.pausedLeft = Math.max(0, (L.endsAt - Date.now()) / 1000); L.timeOn[L.current] = (L.timeOn[L.current] || 0) + (Date.now() - L.since) / 1000; L.paused = true; }
    }, { silent: true });
    RH.render({ keepScroll: true });
  };
  RH.actions['exam-full'] = function () {
    const el = document.querySelector('.exam-mode');
    try { if (document.fullscreenElement) document.exitFullscreen(); else if (el && el.requestFullscreen) el.requestFullscreen().catch(() => C.toast('Full screen is not available here.')); } catch (e) { C.toast('Full screen is not available here.'); }
  };
  RH.actions['exam-finish'] = function () {
    const L = live();
    const left = leftSec(L);
    if (left > 60 && !L.over) C.confirm('Finish the exam?', U.plural(Math.round(left / 60), 'minute') + ' left. You will move on to marking.', 'Finish and mark', finish);
    else finish();
  };
  RH.actions['exam-quit'] = () => { store.update(function (s) { s.portal.live = null; }); location.hash = 'portal'; };
  RH.actions['mark-go'] = (el) => { store.update(function (s) { s.portal.marking.current = Number(el.dataset.i); s.portal.marking.msPage = null; }, { silent: true }); RH.render(); };
  RH.actions['mark-next'] = function () {
    const K = st().portal.marking, pos = K.qs.indexOf(K.current);
    if (pos < K.qs.length - 1) RH.actions['mark-go']({ dataset: { i: String(K.qs[pos + 1]) } });
    else C.toast('That was the last question. Press "Save result".');
  };
  RH.actions['mark-full'] = function (el) { const K = st().portal.marking, p = st().portal.papers[K.paper]; store.update(function (s) { s.portal.marking.scores[el.dataset.i] = String(p.questions[Number(el.dataset.i)].marks || 0); }, { silent: true }); RH.actions['mark-next'](); };
  RH.actions['mark-zero'] = function (el) { store.update(function (s) { s.portal.marking.scores[el.dataset.i] = '0'; }, { silent: true }); RH.actions['mark-next'](); };
  RH.actions['ms-page'] = function (el) {
    const K = st().portal.marking, p = st().portal.papers[K.paper], q = p.questions[K.current];
    const cur = K.msPage != null ? K.msPage : (q.ms != null ? q.ms : 0);
    const next = U.clamp(cur + Number(el.dataset.v), 0, Math.max(0, (p.msPagesCount || 1) - 1));
    store.update(function (s) { s.portal.marking.msPage = next; }, { silent: true });
    RH.render({ keepScroll: true });
  };
  RH.actions['mark-save'] = saveResult;
  RH.actions['q-preview'] = function (el) {
    const p = st().portal.papers[el.dataset.id], i = Number(el.dataset.i);
    C.openModal('Question ' + esc(p.questions[i].n), '<div class="qcrop" data-qdraw="' + i + '" data-paper="' + p.id + '"></div>', { wide: true });
    RH.afterRender.forEach((fn) => fn());
  };
  RH.actions['q-merge'] = function (el) {
    const i = Number(el.dataset.i);
    store.update(function (s) {
      const p = s.portal.papers[el.dataset.id], a = p.questions[i - 1], b = p.questions[i];
      a.r = a.r.concat(b.r); a.marks = (a.marks || 0) + (b.marks || 0) || null; a.n = a.n + '+' + b.n;
      p.questions.splice(i, 1);
    });
  };
  RH.actions['paper-remove'] = function (el) {
    const p = st().portal.papers[el.dataset.id];
    C.confirm('Delete "' + p.title + '"?', 'The PDF is removed from this device. Your saved results stay.', 'Delete paper', function () {
      RH.files.del(p.id + ':qp'); RH.files.del(p.id + ':ms');
      store.update(function (s) { delete s.portal.papers[p.id]; if (s.portal.live && s.portal.live.paper === p.id) s.portal.live = null; }, { silent: true });
      location.hash = 'portal';
      RH.render();
    });
  };
  RH.actions['attempt-del'] = function (el) {
    C.confirm('Delete this result?', 'It will be removed from your results.', 'Delete', () => store.update(function (s) { s.portal.attempts = s.portal.attempts.filter((a) => a.id !== el.dataset.id); }));
  };

  P.key = function (ev) {
    if (location.hash !== '#exam' || C.modalOpen() || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return false;
    const L = live(); if (!L || L.paused) return false;
    const pos = L.qs.indexOf(L.current);
    if (ev.key === 'ArrowRight' && pos < L.qs.length - 1) { switchTo(L.qs[pos + 1]); return true; }
    if (ev.key === 'ArrowLeft' && pos > 0) { switchTo(L.qs[pos - 1]); return true; }
    if (ev.key === 'f' || ev.key === 'F') { RH.actions['exam-flag'](); return true; }
    return false;
  };
  P.detect = detect; P.meta = meta; P.readPdf = readPdf;
})(window.RH = window.RH || {});
