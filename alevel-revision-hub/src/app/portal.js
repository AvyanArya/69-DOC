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

  // ---------- Topic packs (PMT style): "Q1." starts a question, "(Total for question = 4 marks)" ends it,
  // and the mark scheme follows in the same file from a page headed "Mark Scheme". ----------
  const QSTART = /^Q(\d{1,3})\.?(\s|$)/, PEND = /\(\s*Total\s+for\s+question\s*=?\s*(\d+)\s*marks?\s*\)/i;
  const after = (a, b) => a.p > b.p || (a.p === b.p && a.y < b.y);
  // Where the mark scheme or solutions start, if they are in the same file.
  function msStart(pages) {
    for (let p = 1; p < pages.length; p++) {
      const top = pages[p].lines.slice(0, 10);
      if (top.some((l) => /^(mark\s*scheme|marking\s*scheme|solutions?|worked\s+solutions|answers?)\b(?!\s+(all|each|the|every)\b)/i.test(l.text) || /mark\s*scheme\s*[–-]/i.test(l.text))) return p;
    }
    return -1;
  }
  // Question numbering styles seen in packs and booklets. The style that gives the longest run of questions
  // numbered 1, 2, 3… down the left margin wins.
  const FAMS = [/^Q\s?(\d{1,3})\b/, /^Question\s+(\d{1,3})\b/i, /^(\d{1,2})\s*[.)](\s|$)/, /^(\d{1,2})(\s|$)/];
  function genericSplit(pages, qpN) {
    let best = null, bestFam = null;
    FAMS.forEach(function (re) {
      const starts = []; let want = 1;
      for (let p = 0; p < qpN; p++) pages[p].lines.forEach(function (l) {
        if (l.x > pages[p].w * 0.24) return;
        const m = re.exec(l.text);
        if (m && Number(m[1]) === want) { starts.push({ n: String(want), p: p, y: l.y + l.h + 4 }); want++; }
      });
      if (starts.length >= 2 && (!best || starts.length > best.length)) { best = starts; bestFam = re; }
    });
    if (!best) return null;
    const ends = [];
    for (let p = 0; p < qpN; p++) pages[p].lines.forEach(function (l) {
      const e = PEND.exec(l.text) || END.exec(l.text);
      if (e) ends.push({ p: p, y: l.y, marks: Number(e[e.length - 1]) });
    });
    const qs = best.map(function (st0, i) {
      const nx = best[i + 1];
      const end = ends.find((e) => after(e, st0) && (!nx || after(nx, e)));
      const to = end ? { p: end.p, y: end.y - 6 } : nx ? { p: nx.p, y: nx.y + 14 } : { p: qpN - 1, y: bottom(pages[qpN - 1]) };
      const regions = regionsBetween(pages, { p: st0.p, y: st0.y }, to);
      return { n: st0.n, marks: end ? end.marks : marksIn(pages, regions), regions: regions };
    }).filter((q) => q.regions.length);
    return { qs: qs, fam: bestFam };
  }
  function packSplit(pages) {
    const ms = msStart(pages), qpN = ms > 0 ? ms : pages.length;
    const g = genericSplit(pages, qpN);
    if (!g) return { qs: [], ms: ms, msMap: {} };
    const msMap = {};
    if (ms > 0) g.qs.forEach(function (q) {
      const re = new RegExp('^(Q\\s?|Question\\s+)?' + q.n + '(\\b|[.)])', 'i');
      for (let p = ms; p < pages.length; p++) if (pages[p].lines.some((l) => l.x < pages[p].w * 0.3 && re.test(l.text))) { msMap[q.n] = p; return; }
    });
    return { qs: g.qs, ms: ms, msMap: msMap };
  }

  // ---------- Upload ----------
  P.analyse = async function (qpFile, msFile) {
    const id = 'x' + U.uid();
    const qpBuf = await qpFile.arrayBuffer();
    const qp = await readPdf(qpBuf.slice(0));
    const info = meta(qp.pages);
    let qs = detect(qp.pages), pack = null;
    // A topic pack with its own mark scheme at the back: split it into the questions and the scheme.
    // Past papers end each question with "Total for Question N"; anything else (packs, booklets) uses the general splitter.
    const endMarkers = qp.pages.reduce((a, pg) => a + pg.lines.filter((l) => END.test(l.text)).length, 0);
    if (!msFile && endMarkers < 2) { const pk = packSplit(qp.pages); if (pk.qs.length >= 2) { pack = pk; qs = pk.qs; } }
    markChoices(qs, info.marks);
    let ms = null, msMap = pack ? pack.msMap : {};
    if (pack && pack.ms > 0) await RH.files.put(id + ':ms', new Blob([qpBuf.slice(0)], { type: 'application/pdf' }));
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
    const opt = arguments[2] || {};
    const packMarks = qs.reduce((a, q) => a + (q.marks || 0), 0);
    const paper = {
      id: id, title: opt.title || title, file: qpFile.name, msFile: msFile ? msFile.name : pack && pack.ms > 0 ? 'Included in the PDF' : '', subject: opt.subject || subject, code: info.code || '', series: info.series || '',
      dur: pack ? Math.max(10, Math.round((packMarks || qs.length * 4) * 1.2)) : info.dur || (paperDef && paperDef.dur) || 90, marks: pack ? packMarks || null : total, pages: qp.pages.length, msPagesCount: ms ? ms.pages.length : pack && pack.ms > 0 ? qp.pages.length : 0,
      pack: !!pack, src: opt.src || '', topic: opt.topic || '',
      questions: qs.map((q) => ({ n: q.n, marks: q.marks, r: q.regions.map((g) => [g.p, Math.round(g.top), Math.round(g.bottom)]), ms: msMap[q.n] != null ? msMap[q.n] : null, topic: opt.topic || '', choice: q.choice || '' })),
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
    if (!doc) { box.innerHTML = '<div class="empty"><p><b>The PDF for this paper is not on this device.</b> Upload it again on the paper page to see the questions here.</p><a class="btn sm" href="#paper-' + paper.id + '">Open paper</a></div>'; return; }
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

  // Images for the AI checker: each region of a question, and one mark scheme page, as JPEG blobs.
  const toBlob = (canvas) => new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.88));
  P.questionImages = async function (paperId, qi) {
    const paper = st().portal.papers[paperId], q = paper.questions[qi];
    const doc = await getDoc(paper, 'qp');
    if (!doc) throw new Error('The PDF for this paper is not on this device. Upload it again on the paper page.');
    const out = [];
    for (const r of q.r) {
      const pc = await pageCanvas(paper, 'qp', doc, r[0], 900);
      const yA = pc.vp.convertToViewportPoint(0, r[1])[1], yB = pc.vp.convertToViewportPoint(0, r[2])[1];
      const y0 = Math.max(0, Math.floor(Math.min(yA, yB))), y1 = Math.min(pc.canvas.height, Math.ceil(Math.max(yA, yB)));
      const c = document.createElement('canvas');
      c.width = pc.canvas.width; c.height = Math.max(1, y1 - y0);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(pc.canvas, 0, y0, c.width, y1 - y0, 0, 0, c.width, y1 - y0);
      out.push(await toBlob(c));
    }
    return out.slice(0, 3);
  };
  // The words of a question, read from the PDF, so Claude knows the question even when images can't be sent.
  const textCache = {};
  P.questionText = async function (paperId, qi) {
    const key = paperId + ':' + qi;
    if (textCache[key] != null) return textCache[key];
    const paper = st().portal.papers[paperId], q = paper && paper.questions[qi];
    const doc = q && await getDoc(paper, 'qp');
    if (!doc) return '';
    const parts = [];
    for (const r of q.r) {
      const page = await doc.getPage(r[0] + 1), tc = await page.getTextContent();
      const lo = Math.min(r[1], r[2]) - 2, hi = Math.max(r[1], r[2]) + 2;
      const items = tc.items.filter((it) => it.str && it.str.trim() && it.transform[5] >= lo && it.transform[5] <= hi)
        .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5] }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      items.forEach(function (it) { const l = lines.find((x) => Math.abs(x.y - it.y) < 2.5); if (l) l.items.push(it); else lines.push({ y: it.y, items: [it] }); });
      lines.sort((a, b) => b.y - a.y).forEach((l) => parts.push(l.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim()));
    }
    return (textCache[key] = parts.filter(Boolean).join('\n').slice(0, 6000));
  };
  P.msText = async function (paperId, page) {
    const paper = st().portal.papers[paperId];
    const doc = paper && await getDoc(paper, 'ms');
    if (!doc) return '';
    const pg = await doc.getPage(U.clamp(page, 0, doc.numPages - 1) + 1), tc = await pg.getTextContent();
    return tc.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
  };
  P.msImage = async function (paperId, page) {
    const paper = st().portal.papers[paperId];
    const doc = await getDoc(paper, 'ms');
    if (!doc) return null;
    const pc = await pageCanvas(paper, 'ms', doc, U.clamp(page, 0, doc.numPages - 1), 900);
    const c = document.createElement('canvas');
    c.width = pc.canvas.width; c.height = pc.canvas.height;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(pc.canvas, 0, 0);
    return toBlob(c);
  };

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

  const paperCard = function (p) {
    const b = best(p.id), n = attemptsFor(p.id).length;
    return '<article class="pcard"' + (p.subject ? ' data-subj="' + p.subject + '"' : '') + '><a class="pc-main" href="#paper-' + p.id + '"><span class="pc-kind">' + (p.pack ? 'Topic questions' : 'Past paper') + (p.subject && M.subject[p.subject] ? ' · ' + esc(M.subject[p.subject].name) : '') + '</span><b>' + esc(p.title) + '</b>' +
      '<span class="pc-meta">' + U.plural(p.questions.length, 'question') + (p.marks ? ' · ' + p.marks + ' marks' : '') + (b >= 0 ? ' · best ' + U.pct(b) : n ? '' : ' · not sat yet') + '</span></a>' +
      '<a class="btn sm" href="#sit-' + p.id + '">' + C.icon('play') + 'Sit</a></article>';
  };
  RH.views.papers = RH.views.portal = function () {
    const tab = C.tab('portal', 'papers'), L = st().portal.live;
    let html = '<header class="page-h"><div><h1>Exam centre</h1><p class="lede">Sit papers and topic questions against the clock, then mark them.</p></div><button type="button" class="btn" data-action="paper-add">' + C.icon('plus') + 'Add a paper</button></header>';
    if (L && st().portal.papers[L.paper]) html += '<a class="resume-strip" href="#exam">' + C.icon('timer') + '<span><b>Exam in progress</b><span>' + esc(st().portal.papers[L.paper].title) + '</span></span><span class="btn sm white">Back to it</span></a>';
    if (st().portal.marking) html += '<a class="resume-strip" href="#mark">' + C.icon('check') + '<span><b>Marking waiting</b><span>Finish marking your last sitting.</span></span><span class="btn sm white">Mark it</span></a>';
    html += C.tabs('portal', [['papers', 'My papers'], ['results', 'Results'], ['find', 'Find papers']], tab);
    if (tab === 'results') return html + RH.views.results();
    if (tab === 'find') return html + '<div class="res-cols">' + M.subjects.map((sub) => '<details class="fold" data-subj="' + sub.id + '"><summary>' + esc(sub.name) + '</summary><div class="fold-body">' + C.resList(findPapers(sub.id)) + '</div></details>').join('') + '</div>';
    const list = papers();
    html += list.length ? '<div class="pgrid">' + list.map(paperCard).join('') + '</div>'
      : '<div class="empty big-empty">' + C.icon('paper') + '<p class="empty-t">No papers yet</p><p class="muted">Add a past paper PDF, or open any lesson and press a question pack under <b>Exam questions</b>.</p><button type="button" class="btn" data-action="paper-add">' + C.icon('plus') + 'Add a paper</button></div>';
    return html;
  };
  RH.actions['paper-add'] = function () {
    C.openModal('Add a paper', '<form id="uploadForm" class="upload-form">' +
      '<label class="drop" for="up-qp">' + C.icon('upload') + '<b>Question paper (PDF)</b><span class="muted small" id="up-qp-name">Choose or drop the file</span><input type="file" id="up-qp" name="qp" accept="application/pdf,.pdf" required></label>' +
      '<label class="drop" for="up-ms">' + C.icon('notes') + '<b>Mark scheme (optional)</b><span class="muted small" id="up-ms-name">Add it now or later</span><input type="file" id="up-ms" name="ms" accept="application/pdf,.pdf"></label>' +
      '<button type="submit" class="btn lg block" id="up-go">' + C.icon('paper') + 'Read paper</button></form><p class="help" id="up-status">Files stay on this device.</p>');
  };

  RH.views.paper = function (id) {
    const p = st().portal.papers[id];
    if (!p) return C.head('', 'Paper not found', '') + '<a class="btn" href="#papers">Back to the exam centre</a>';
    const mpm = p.marks ? p.dur / p.marks : null;
    const attempts = attemptsFor(id);
    let html = C.crumbs([['Exam centre', 'papers'], [p.title]]);
    html += C.page({ title: esc(p.title), lede: U.plural(p.questions.length, 'question') + (p.marks ? ' · ' + p.marks + ' marks' : '') + ' · ' + U.mins(p.dur) + (p.msFile ? ' · mark scheme added' : ''), actions: '<button type="button" class="btn alt" data-action="ans-export" data-v="blank" data-id="' + p.id + '" title="Every question with lined space under it, to print and write on">' + C.icon('download') + 'Printable with answer space</button><a class="btn lg" href="#sit-' + p.id + '">' + C.icon('play') + 'Sit it</a>' });
    if (attempts.length) html += '<section class="card"><h2>Your attempts</h2>' + attemptTable(attempts) + '</section>';
    html += '<section class="card"><div class="card-head"><h2>Questions</h2><span class="muted small">Tap one to preview or practise it alone</span></div><div class="qgrid">' +
      p.questions.map((q, i) => '<div class="qitem"><button type="button" class="qi-main" data-action="q-preview" data-id="' + id + '" data-i="' + i + '"><b>Q' + esc(q.n) + '</b><span class="num">' + (q.marks == null ? '?' : q.marks) + ' marks' + (mpm && q.marks ? ' · ' + U.mins(Math.round(q.marks * mpm)) : '') + '</span></button><a class="icon-btn" href="#sit-' + id + '" data-action="sit-one" data-id="' + id + '" data-i="' + i + '" aria-label="Practise question ' + esc(q.n) + '">' + C.icon('play') + '</a></div>').join('') + '</div></section>';
    html += '<details class="fold"><summary>Fix the paper’s details</summary><div class="fold-body">' +
      (p.method !== 'markers' && !p.pack ? '<p class="note small">This paper had no "Total for Question" lines, so it was split ' + (p.questions.length && p.questions[0].marks == null ? 'by page' : 'by question numbers') + '. Check the marks.</p>' : '') +
      '<div class="form-grid"><div class="field"><label for="pp-title">Title</label><input id="pp-title" data-paper="' + id + '" data-pf="title" value="' + esc(p.title) + '"></div>' +
      '<div class="field"><label for="pp-subj">Subject</label><select id="pp-subj" data-paper="' + id + '" data-pf="subject"><option value="">Other</option>' + M.subjects.map((x) => '<option value="' + x.id + '"' + (p.subject === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="pp-dur">Minutes</label><input id="pp-dur" type="number" min="5" max="400" data-paper="' + id + '" data-pf="dur" value="' + p.dur + '"></div><div class="field"><label for="pp-marks">Marks</label><input id="pp-marks" type="number" min="1" max="600" data-paper="' + id + '" data-pf="marks" value="' + (p.marks || '') + '"></div></div>' +
      '<div class="table-wrap"><table class="tbl qtbl"><thead><tr><th>Question</th><th class="num">Marks</th><th>Topic</th><th></th></tr></thead><tbody>' +
      p.questions.map((q, i) => '<tr><td><b>Q' + esc(q.n) + '</b>' + (q.choice ? ' <span class="pill" title="' + esc(choiceNote(p, q)) + '">choice</span>' : '') + '</td><td class="num"><input type="number" class="num-in" min="0" max="200" data-paper="' + id + '" data-qm="' + i + '" value="' + (q.marks == null ? '' : q.marks) + '" aria-label="Marks for question ' + esc(q.n) + '"></td>' +
        '<td><select class="topic-sel" data-paper="' + id + '" data-qt="' + i + '" aria-label="Topic for question ' + esc(q.n) + '"><option value="">–</option>' + topicOpts(p.subject, q.topic) + '</select></td><td>' + (i ? '<button type="button" class="icon-btn" data-action="q-merge" data-id="' + id + '" data-i="' + i + '" title="Merge into previous question" aria-label="Merge into previous question">' + C.icon('x') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="row-actions"><label class="btn alt sm file-btn">' + C.icon('upload') + (p.msFile ? 'Replace mark scheme' : 'Add mark scheme') + '<input type="file" accept="application/pdf,.pdf" data-paperfile="ms" data-paper="' + id + '"></label>' +
      '<label class="btn alt sm file-btn">' + C.icon('upload') + 'Re-upload paper<input type="file" accept="application/pdf,.pdf" data-paperfile="qp" data-paper="' + id + '"></label>' +
      '<button type="button" class="btn ghost sm danger-t" data-action="paper-remove" data-id="' + id + '">' + C.icon('trash') + 'Delete paper</button></div></div></details>';
    return html;
  };

  // ---------- Before you start: the conditions ----------
  // A long paper or pack can be sat as a set of questions that fills the time you have.
  function nextSet(p, mins) {
    const mpm = p.marks ? p.dur / p.marks : 1.2, sat = {};
    attemptsFor(p.id).forEach((a) => (a.per || []).forEach((x) => { sat[x[0]] = 1; }));
    let startI = p.questions.findIndex((q) => !sat[q.n]);
    if (startI < 0) startI = 0;
    const out = []; let m = 0;
    for (let i = startI; i < p.questions.length && (m === 0 || m + (p.questions[i].marks || 4) * mpm <= mins * 1.1); i++) { out.push(i); m += (p.questions[i].marks || 4) * mpm; }
    return out;
  }
  RH.views.sit = function (id) {
    const p = st().portal.papers[id];
    if (!p) return RH.views.paper(id);
    const ui = RH.ui.sit = Object.assign({ paper: id, mode: p.dur > 75 && p.questions.length > 6 ? 'set' : 'all', mins: 30, extra: 0, strict: false, ai: false, one: null }, RH.ui.sit && RH.ui.sit.paper === id ? RH.ui.sit : {});
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    const idx = ui.one != null ? [ui.one] : ui.mode === 'set' ? nextSet(p, ui.mins) : p.questions.map((q, i) => i);
    const marks = idx.reduce((a, i) => a + (p.questions[i].marks || 0), 0);
    const mins = Math.round((ui.one != null || ui.mode === 'set' ? Math.max(3, marks * mpm) : p.dur) * (1 + ui.extra / 100));
    const opt = (k, v, label, sub) => '<button type="button" class="choice' + (String(ui[k]) === String(v) ? ' on' : '') + '" data-action="sit-set" data-k="' + k + '" data-v="' + v + '"><b>' + label + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</button>';
    let html = C.crumbs([['Exam centre', 'papers'], [p.title, 'paper-' + p.id], ['Start']]);
    html += '<section class="sit"' + (p.subject ? ' data-subj="' + p.subject + '"' : '') + '><header><p class="kicker">' + (p.pack ? 'Topic questions' : 'Past paper') + '</p><h1>' + esc(p.title) + '</h1></header>';
    if (ui.one != null) html += '<div class="sit-row"><p class="label">What you’ll sit</p><div class="choices">' + opt('one', ui.one, 'Question ' + esc(p.questions[ui.one].n), U.plural(p.questions[ui.one].marks || 0, 'mark')) + '<button type="button" class="choice" data-action="sit-set" data-k="one" data-v="">Pick something else</button></div></div>';
    else html += '<div class="sit-row"><p class="label">What you’ll sit</p><div class="choices">' + opt('mode', 'all', 'The whole ' + (p.pack ? 'pack' : 'paper'), U.plural(p.questions.length, 'question') + ' · ' + U.mins(p.dur)) + opt('mode', 'set', 'A set of questions', 'Fill the time you have') + '</div>' +
      (ui.mode === 'set' ? '<div class="seg-row"><span class="muted small">Time you have</span>' + C.seg([[20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour']], ui.mins, 'data-action="sit-set" data-k="mins"') + '</div>' : '') + '</div>';
    html += '<div class="sit-row"><p class="label">Conditions</p><div class="choices">' +
      opt('strict', false, 'Practice', 'You can pause') + opt('strict', true, 'Exam conditions', 'No pausing, like the real thing') + '</div>' +
      '<div class="choices">' + opt('ai', false, 'On my own', 'No help') + opt('ai', true, 'With the help of AI', 'Ask Claude for hints in the corner') + '</div>' +
      '<div class="seg-row"><span class="muted small">Extra time</span>' + C.seg([[0, 'None'], [10, '10%'], [25, '25%'], [50, '50%']], ui.extra, 'data-action="sit-set" data-k="extra"') + '</div></div>';
    html += '<div class="sit-go"><div><b>' + (idx.length === 1 ? 'Question ' + esc(p.questions[idx[0]].n) : 'Questions ' + esc(p.questions[idx[0]].n) + '–' + esc(p.questions[idx[idx.length - 1]].n)) + '</b><span class="muted">' + (marks ? marks + ' marks · ' : '') + U.mins(mins) + '</span></div>' +
      '<button type="button" class="btn lg" data-action="sit-go" data-id="' + p.id + '" data-qs="' + idx.join(',') + '" data-mins="' + mins + '">' + C.icon('play') + 'Start the clock</button></div>' +
      '<p class="help center">Answer on screen (type, or tap A–D) or on paper. At the end you can photograph what you wrote and export everything as a PDF.</p></section>';
    return html;
  };
  RH.actions['sit-set'] = function (el) {
    const k = el.dataset.k, raw = el.dataset.v, ui = RH.ui.sit || {};
    ui[k] = k === 'strict' || k === 'ai' ? raw === 'true' : k === 'one' ? (raw === '' ? null : Number(raw)) : k === 'mode' ? raw : Number(raw);
    RH.ui.sit = ui; RH.render({ keepScroll: true });
  };
  RH.actions['sit-one'] = function (el) { RH.ui.sit = { paper: el.dataset.id, one: Number(el.dataset.i), mode: 'all', mins: 30, extra: 0, strict: false, ai: false }; return true; };
  RH.actions['sit-go'] = function (el) {
    const ui = RH.ui.sit || {};
    const go = () => { C.primeAudio(); P.start(el.dataset.id, el.dataset.qs.split(',').map(Number), { mins: Number(el.dataset.mins), strict: !!ui.strict, ai: !!ui.ai }); };
    if (st().portal.live) C.confirm('Start a new exam?', 'You have an exam in progress. Starting another ends it without saving.', 'Start new exam', go); else go();
  };

  function topicOpts(sid, sel) {
    if (!sid) return '';
    return M.compsFor(st(), M.subject[sid], true).map((c) => '<optgroup label="' + esc(c.name) + '">' + c.topics.map((t) => '<option value="' + t.gid + '"' + (sel === t.gid ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</optgroup>').join('');
  }

  function attemptTable(list) {
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Paper</th><th class="num">Score</th><th class="num">%</th><th class="num">Time used</th><th></th></tr></thead><tbody>' +
      list.slice().sort((a, b) => b.date.localeCompare(a.date)).map((a) => '<tr' + (a.subject ? ' data-subj="' + a.subject + '"' : '') + '><td class="num">' + esc(U.fmtShort(a.date)) + '</td><td>' + (a.subject ? C.stag(a.subject) : '') + esc(a.title) + (a.single ? ' <span class="muted small">(Q' + esc(a.single) + ')</span>' : '') + '</td>' +
        '<td class="num num">' + a.score + '/' + a.max + '</td><td class="num num"><b>' + U.pct(a.score / a.max) + '</b></td><td class="num num">' + RH.timer.fmt(a.used) + ' / ' + U.mins(a.dur) + '</td>' +
        '<td><button type="button" class="icon-btn" data-action="attempt-del" data-id="' + a.id + '" aria-label="Delete attempt">' + C.icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div>';
  }

  // ---------- Exam mode ----------
  const live = () => st().portal.live;
  function elapsedOn(L, i) { return (L.timeOn[i] || 0) + (L.current === i && !L.paused ? (Date.now() - L.since) / 1000 : 0); }
  function leftSec(L) { return L.paused ? L.pausedLeft : Math.max(0, (L.endsAt - Date.now()) / 1000); }

  P.start = function (paperId, qIdx, opts) {
    const p = st().portal.papers[paperId];
    if (!Array.isArray(qIdx)) qIdx = qIdx != null ? [Number(qIdx)] : p.questions.map((q, i) => i);
    opts = opts || {};
    const marks = totals(p, qIdx).max;
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    const dur = Math.round((opts.mins || (qIdx.length === p.questions.length ? p.dur : Math.max(3, marks * mpm))) * 60 * (opts.mins ? 1 : 1 + (opts.extra || 0) / 100));
    store.update(function (s) {
      s.portal.live = { paper: paperId, single: qIdx.length === 1 ? p.questions[qIdx[0]].n : null, qs: qIdx, current: qIdx[0], since: Date.now(), endsAt: Date.now() + dur * 1000, dur: dur, paused: false, pausedLeft: 0,
        strict: !!opts.strict, ai: !!opts.ai, timeOn: {}, flags: {}, visited: {}, done: {}, notes: {}, mc: {}, mode: {}, marks: marks, warned: {}, started: Date.now() };
      s.portal.live.visited[qIdx[0]] = 1;
    }, { silent: true });
    RH.ui.chat = [];
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

  // ---------- Answering on the paper ----------
  // Each question gets an answer space under it: type on lined paper, tap A–D for multiple choice,
  // or write on real paper and photograph it at the end.
  const LETTERS = ['A', 'B', 'C', 'D'];
  function looksMcq(text) {
    const seen = {};
    String(text || '').split('\n').forEach(function (l) { const m = /^\s*([A-D])(\s|$|[.)])/.exec(l); if (m) seen[m[1]] = 1; });
    return Object.keys(seen).length === 4;
  }
  function ansMode(L, p, i) { return (L.mode && L.mode[i]) || (p.questions[i].mcq ? 'mc' : 'write'); }
  function typedAnswer(src, i) {
    const mc = src.mc && src.mc[i], t = (src.notes && src.notes[i] || '').trim();
    return (mc ? 'Multiple choice: chose ' + mc + (t ? '\n' : '') : '') + t;
  }
  P.typedAnswer = typedAnswer;
  function answerSheet(L, p, q) {
    const i = L.current, mode = ansMode(L, p, i), mc = L.mc && L.mc[i];
    const tab = (v, label) => '<button type="button" class="' + (mode === v ? 'on' : '') + '" data-action="ans-mode" data-v="' + v + '" aria-pressed="' + (mode === v) + '">' + label + '</button>';
    let body;
    if (mode === 'mc') body = '<div class="mc-row" role="group" aria-label="Choose an answer">' + LETTERS.map((x) => '<button type="button" class="mc-b' + (mc === x ? ' on' : '') + '" data-action="ans-mc" data-v="' + x + '" aria-pressed="' + (mc === x) + '">' + x + '</button>').join('') + '</div><p class="help">' + (mc ? 'You chose <b>' + mc + '</b>. Tap it again to clear.' : 'Tap the letter of your answer.') + '</p>';
    else if (mode === 'paper') body = '<div class="on-paper">' + C.icon('camera') + '<p><b>Write this one on paper.</b> At the end you can photograph your answers to mark them' + (L.ai ? ' or have Claude mark them' : '') + '.</p></div>';
    else body = '<textarea id="ex-notes" class="lined" data-exnote="' + i + '" rows="7" placeholder="Type your answer and working here…" aria-label="Your answer to question ' + esc(q.n) + '">' + esc(L.notes[i] || '') + '</textarea>';
    return '<section class="answer-sheet" aria-label="Answer space"><div class="as-head"><b>Answer</b><div class="seg">' + tab('write', 'Type') + tab('mc', 'A–D') + tab('paper', 'On paper') + '</div></div>' + body + '</section>';
  }
  RH.actions['ans-mode'] = function (el) {
    store.update(function (s) { const L = s.portal.live; L.mode = L.mode || {}; L.mode[L.current] = el.dataset.v; }, { silent: true });
    RH.render({ keepScroll: true });
    if (el.dataset.v === 'write') { const t = document.getElementById('ex-notes'); if (t) t.focus(); }
  };
  RH.actions['ans-mc'] = function (el) {
    store.update(function (s) { const L = s.portal.live; L.mc = L.mc || {}; if (L.mc[L.current] === el.dataset.v) delete L.mc[L.current]; else L.mc[L.current] = el.dataset.v; }, { silent: true });
    RH.render({ keepScroll: true });
  };
  // Spot multiple-choice questions (four lines starting A, B, C, D) the first time each one is shown.
  RH.afterRender.push(function (r) {
    if (r !== 'exam') return;
    const L = live(); if (!L) return;
    const p = st().portal.papers[L.paper], i = L.current, q = p && p.questions[i];
    if (!q || q.mcq != null) return;
    P.questionText(p.id, i).then(function (t) {
      const yes = looksMcq(t);
      store.update(function (s) { s.portal.papers[p.id].questions[i].mcq = yes; }, { silent: true });
      if (yes && !(L.mode && L.mode[i]) && live() && live().current === i && location.hash === '#exam') RH.render({ keepScroll: true });
    }).catch(() => {});
  });

  // ---------- Export: each question, then its answer (or a blank answer space to print and write on) ----------
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const pdfSafe = (t) => String(t || '').replace(/[\u2212\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, '...')
    .replace(/[θΘ]/g, 'theta').replace(/[λ]/g, 'lambda').replace(/[μ]/g, 'mu').replace(/[ωΩ]/g, 'omega').replace(/[π]/g, 'pi').replace(/[Δ]/g, 'Delta').replace(/[α]/g, 'alpha').replace(/[β]/g, 'beta').replace(/[ε]/g, 'epsilon').replace(/[ρ]/g, 'rho').replace(/[σΣ]/g, 'sigma').replace(/[φ]/g, 'phi')
    .replace(/[√]/g, 'sqrt').replace(/[≈]/g, '~').replace(/[≤]/g, '<=').replace(/[≥]/g, '>=').replace(/[→]/g, '->').replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '?');
  async function blobImage(b) {
    const bmp = await createImageBitmap(b);
    const c = document.createElement('canvas'); const k = Math.min(1, 1400 / bmp.width);
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height };
  }
  P.exportAnswers = async function (src, opts) {
    opts = opts || {};
    const p = st().portal.papers[src.paper];
    C.toast('Making the PDF…');
    await C.loadScript(JSPDF);
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M0 = 16, CW = W - 2 * M0;
    let y = M0;
    const room = (h) => { if (y + h > H - M0) { doc.addPage(); y = M0; } };
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(pdfSafe(p.title), M0, y + 6); y += 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110);
    doc.text(pdfSafe((opts.blank ? 'Questions with answer space' : 'Questions and my answers') + ' · ' + U.fmt(U.today(), { day: 'numeric', month: 'long', year: 'numeric' }) + (src.used ? ' · ' + Math.round(src.used / 60) + ' min used' : '')), M0, y); y += 8;
    doc.setTextColor(0);
    for (const i of src.qs) {
      const q = p.questions[i];
      const imgs = [];
      for (const b of await P.questionImages(p.id, i).catch(() => [])) imgs.push(await blobImage(b));
      // Keep the heading with the start of the question.
      const first = imgs[0] ? Math.min(imgs[0].h * CW / imgs[0].w, H - 2 * M0 - 10) : 10;
      room(14 + Math.min(first, 120));
      doc.setDrawColor(200); doc.line(M0, y, W - M0, y); y += 7;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Question ' + pdfSafe(q.n) + (q.marks ? '  (' + q.marks + ' mark' + (q.marks === 1 ? '' : 's') + ')' : ''), M0, y); y += 5;
      for (const im of imgs) {
        let w = CW, h = im.h * w / im.w;
        if (h > H - 2 * M0 - 10) { h = H - 2 * M0 - 10; w = im.w * h / im.h; }
        room(h + 2); doc.addImage(im.url, 'JPEG', M0, y, w, h); y += h + 3;
      }
      if (!imgs.length) { doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.text('(The question PDF is not on this device.)', M0, y + 4); y += 8; }
      room(16);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(120, 90, 220); doc.text('Answer', M0, y + 4); doc.setTextColor(0); y += 8;
      const ans = opts.blank ? '' : typedAnswer(src, i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      if (ans) {
        doc.splitTextToSize(pdfSafe(ans), CW).forEach(function (line) { room(6); doc.text(line, M0, y + 4); y += 5.6; });
        y += 2;
      }
      const photos = !opts.blank && src.hw ? (await hwList(src, i)).concat(src.hw.all && i === src.qs[src.qs.length - 1] ? await hwList(src, 'all') : []) : [];
      for (const b of photos) {
        const im = await blobImage(b).catch(() => null); if (!im) continue;
        let w = CW * 0.8, h = im.h * w / im.w;
        if (h > 150) { h = 150; w = im.w * h / im.h; }
        room(h + 2); doc.addImage(im.url, 'JPEG', M0, y, w, h); y += h + 3;
      }
      if (!ans && !photos.length) {
        // Blank lined answer space, sized to the marks.
        const lines = Math.max(4, Math.min(24, (q.marks || 3) * 2));
        doc.setDrawColor(190);
        for (let k = 0; k < lines; k++) { room(8); y += 8; doc.line(M0, y, W - M0, y); }
        y += 4;
      }
      y += 4;
    }
    const name = (p.title || 'paper').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) + (opts.blank ? '-answer-space' : '-my-answers') + '.pdf';
    await C.saveFile(name, doc.output('blob'), 'application/pdf');
  };
  RH.actions['ans-export'] = function (el) {
    const which = el.dataset.v, s = st();
    let src;
    if (which === 'live') src = s.portal.live;
    else if (which === 'mark') src = s.portal.marking;
    else { const p = s.portal.papers[el.dataset.id]; src = { paper: p.id, qs: p.questions.map((q, i) => i) }; }
    if (!src) return;
    P.exportAnswers(src, { blank: which === 'blank' }).catch((e) => C.toast('Could not make the PDF: ' + (e && e.message || 'unknown error')));
  };

  RH.views.exam = function () {
    const L = live();
    if (!L) return C.empty('No exam in progress.', 'Start one from the exam centre.', '<a class="btn" href="#papers">Exam centre</a>');
    const p = st().portal.papers[L.paper];
    if (!p) return C.empty('That paper was deleted.', '', '<button type="button" class="btn" data-action="exam-quit">Close exam</button>');
    const pos = L.qs.indexOf(L.current);
    const q = p.questions[L.current];
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    const sugg = q.marks ? Math.round(q.marks * mpm * 60) : null;
    let html = '<div class="exam-mode" data-subj="' + (p.subject || '') + '">';
    html += '<section class="ex-main">' + (L.paused ? '<div class="paused">' + C.icon('pause') + '<b>Paused</b><p class="muted">The clock is stopped and the question is hidden.</p><button type="button" class="btn" data-action="exam-pause">' + C.icon('play') + 'Resume</button></div>' :
      '<div class="ex-q-head"><h1>Question ' + esc(q.n) + '</h1><span class="muted">' + (q.marks == null ? '' : U.plural(q.marks, 'mark')) + (sugg ? ' · aim for ' + U.mins(Math.round(sugg / 60)) : '') + '</span></div>' +
      (q.choice ? '<p class="note choice-note">' + C.icon('flag') + esc(choiceNote(p, q)) + '</p>' : '') +
      '<div class="qcrop paper-sheet" data-qdraw="' + L.current + '" data-paper="' + p.id + '"></div>' +
      answerSheet(L, p, q) +
      '<div class="q-actions"><button type="button" class="btn alt" data-action="exam-go" data-i="' + (L.qs[pos - 1] != null ? L.qs[pos - 1] : '') + '"' + (pos > 0 ? '' : ' disabled') + '>' + C.icon('left') + 'Previous</button>' +
      (pos < L.qs.length - 1 ? '<button type="button" class="btn" data-action="exam-done">' + (L.done[L.current] ? 'Next' : 'Done, next') + C.icon('right') + '</button>' : '<button type="button" class="btn" data-action="exam-finish">Finish' + C.icon('tick') + '</button>') + '</div>') + '</section>';
    html += '<aside class="ex-side" aria-label="Exam controls"><p class="ex-title">' + esc(p.title) + '</p><div class="ex-clock"><span class="num" id="ex-left">' + RH.timer.fmt(leftSec(L)) + '</span><span class="small" id="ex-pace"></span></div><div class="meter exam-meter"><span id="ex-meter" style="width:0%"></span></div>' +
      '<p class="label">Questions</p><nav class="qnav" aria-label="Questions">' + L.qs.map((i) => {
        const qq = p.questions[i];
        const cls = (i === L.current ? ' on' : '') + (L.done[i] ? ' done' : L.visited[i] ? ' seen' : '') + (L.flags[i] ? ' flag' : '');
        return '<button type="button" class="qchip' + cls + '" data-action="exam-go" data-i="' + i + '" aria-current="' + (i === L.current) + '" title="' + (qq.marks == null ? '' : qq.marks + ' marks') + '">' + esc(qq.n) + '</button>';
      }).join('') + '</nav>' +
      '<div class="ex-tools"><button type="button" class="btn alt sm' + (L.flags[L.current] ? ' on' : '') + '" data-action="exam-flag">' + C.icon('flag') + (L.flags[L.current] ? 'Flagged' : 'Flag') + '</button>' +
      (L.strict ? '' : '<button type="button" class="btn alt sm" data-action="exam-pause">' + C.icon(L.paused ? 'play' : 'pause') + (L.paused ? 'Resume' : 'Pause') + '</button>') +
      '<button type="button" class="btn alt sm" data-action="exam-full" aria-label="Full screen">' + C.icon('expand') + '</button></div>' +
      '<button type="button" class="btn alt sm block" data-action="ans-export" data-v="live">' + C.icon('download') + 'Export questions + answers</button>' +
      '<button type="button" class="btn block" data-action="exam-finish">' + C.icon('tick') + 'Finish and hand in</button>' +
      (L.strict ? '<p class="help center">Exam conditions: no pausing.</p>' : '') + '</aside></div>';
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
      s.portal.marking = { paper: L.paper, single: L.single, qs: L.qs, used: Math.round(L.dur - left), dur: Math.round(L.dur / 60), timeOn: L.timeOn, notes: L.notes, mc: L.mc || {}, scores: {}, msPage: null, current: L.qs[0], logMistakes: true, hw: {}, ai: L.ai, fb: {} };
      s.portal.live = null;
    });
    location.hash = 'handin';
    RH.render();
  }

  // ---------- Hand in: photos of what you wrote ----------
  const hwKey = (K, qi, k) => 'hw:' + K.paper + ':' + K.used + ':' + qi + ':' + k;
  const hwBlobs = {};
  async function hwList(K, qi) {
    const ck = K.paper + ':' + K.used + ':' + qi;
    if (hwBlobs[ck]) return hwBlobs[ck];
    const out = [];
    for (let k = 0; k < ((K.hw || {})[qi] || 0); k++) { const b = await RH.files.get(hwKey(K, qi, k)); if (b) out.push(b); }
    return (hwBlobs[ck] = out);
  }
  const hwThumbs = (qi) => '<div class="thumbs" data-hwthumbs="' + qi + '"></div>';
  RH.afterRender.push(function () {
    const K = st().portal.marking;
    if (!K) return;
    document.querySelectorAll('[data-hwthumbs]').forEach(function (box) {
      const qi = box.dataset.hwthumbs;
      hwList(K, qi).then((list) => { box.innerHTML = list.map((b, n) => '<figure class="thumb"><img src="' + C.blobURL(b) + '" alt="Your answer, photo ' + (n + 1) + '"></figure>').join(''); });
    });
  });
  RH.views.handin = function () {
    const K = st().portal.marking;
    if (!K) return C.empty('Nothing to hand in.', '', '<a class="btn" href="#papers">Exam centre</a>');
    const p = st().portal.papers[K.paper];
    if (!p) return C.empty('That paper was deleted.', '', '<a class="btn" href="#papers">Exam centre</a>');
    let html = '<section class="sit handin"' + (p.subject ? ' data-subj="' + p.subject + '"' : '') + '><header><p class="kicker">Pens down · ' + RH.timer.fmt(K.used) + ' used</p><h1>Hand in your answers</h1><p class="lede">Photograph what you wrote for each question, so you can mark it against the scheme' + (RH.ai.status() === 'absent' ? '' : ' or have Claude mark it') + '. You can skip this.</p></header>';
    html += '<label class="drop wide">' + C.icon('camera') + '<b>Add photos for the whole sitting</b><span class="muted small">' + (K.hw.all ? U.plural(K.hw.all, 'photo') + ' added' : 'Choose or take photos') + '</span><input type="file" accept="image/*" capture="environment" multiple data-hwq="all"></label>' + hwThumbs('all');
    html += '<ul class="hand-list">' + K.qs.map(function (i) {
      const q = p.questions[i];
      return '<li><span class="hl-q"><b>Q' + esc(q.n) + '</b><span class="muted small">' + (q.marks == null ? '' : U.plural(q.marks, 'mark')) + '</span></span>' + hwThumbs(i) + '<label class="btn alt sm file-btn">' + C.icon('camera') + (K.hw[i] ? U.plural(K.hw[i], 'photo') : 'Add photo') + '<input type="file" accept="image/*" capture="environment" multiple data-hwq="' + i + '"></label></li>';
    }).join('') + '</ul>';
    html += '<div class="sit-go"><div><b>Ready to mark?</b><span class="muted">' + U.plural(Object.keys(K.hw).reduce((a, k) => a + K.hw[k], 0), 'photo') + ' handed in</span></div><span class="row-actions"><button type="button" class="btn alt" data-action="ans-export" data-v="mark">' + C.icon('download') + 'Export PDF</button><a class="btn lg" href="#mark">Go to marking' + C.icon('right') + '</a></span></div></section>';
    return html;
  };
  RH.onChange.push(function (el) {
    if (el.dataset.hwq == null) return false;
    const K = st().portal.marking, qi = el.dataset.hwq, files = C.imageFiles(el);
    if (!K || !files.length) return true;
    (async function () {
      const start = (K.hw || {})[qi] || 0;
      for (let k = 0; k < files.length; k++) await RH.files.put(hwKey(K, qi, start + k), files[k]);
      delete hwBlobs[K.paper + ':' + K.used + ':' + qi];
      store.update(function (s) { s.portal.marking.hw = s.portal.marking.hw || {}; s.portal.marking.hw[qi] = start + files.length; });
    })();
    return true;
  });

  // ---------- Marking ----------
  RH.views.mark = function () {
    const K = st().portal.marking;
    if (!K) return C.empty('Nothing to mark.', '', '<a class="btn" href="#papers">Exam centre</a>');
    const p = st().portal.papers[K.paper];
    if (!p) return C.empty('That paper was deleted.', '', '<a class="btn" href="#papers">Exam centre</a>');
    const q = p.questions[K.current];
    const tt = totals(p, K.qs, K.scores), total = tt.max, score = tt.score;
    const msPage = K.msPage != null ? K.msPage : (q.ms != null ? q.ms : 0);
    const mpm = p.marks ? p.dur / p.marks : 1.2;
    const hasAns = (K.hw && (K.hw[K.current] || K.hw.all)) || typedAnswer(K, K.current);
    let html = C.crumbs([['Exam centre', 'papers'], [p.title, 'paper-' + p.id], ['Marking']]);
    html += C.page({ title: 'Marking', lede: esc(p.title) + ' · <b class="num">' + score + ' / ' + total + '</b>' + (total ? ' so far' : ''), actions: '<a class="btn alt" href="#handin">' + C.icon('camera') + 'Photos</a><button type="button" class="btn alt" data-action="ans-export" data-v="mark">' + C.icon('download') + 'Export PDF</button><button type="button" class="btn" data-action="mark-save">' + C.icon('tick') + 'Save result</button>' });
    html += '<nav class="mark-nav">' + K.qs.map((i) => {
      const qq = p.questions[i], has = K.scores[i] != null && K.scores[i] !== '';
      return '<button type="button" class="qchip wide' + (i === K.current ? ' on' : '') + (has ? ' done' : '') + '" data-action="mark-go" data-i="' + i + '"><b>Q' + esc(qq.n) + '</b><span class="num small">' + (has ? K.scores[i] : '–') + '/' + (qq.marks == null ? '?' : qq.marks) + '</span></button>';
    }).join('') + '</nav>';
    const t = K.timeOn[K.current] || 0, sugg = q.marks ? q.marks * mpm * 60 : 0;
    html += '<div class="mark-cols"><section class="card"><div class="q-head"><h2>Question ' + esc(q.n) + '</h2><span class="muted small">' + RH.timer.fmt(t) + ' spent' + (sugg && t > sugg * 1.3 ? ' · <span class="pace-bad">longer than the ' + U.mins(Math.round(sugg / 60)) + ' it’s worth</span>' : '') + '</span></div>' +
      '<div class="qcrop paper-sheet" data-qdraw="' + K.current + '" data-paper="' + p.id + '"></div>' +
      '<p class="label">Your answer</p>' + hwThumbs(K.current) + (K.hw && K.hw.all ? hwThumbs('all') : '') + (typedAnswer(K, K.current) ? '<div class="typed-ans"><p>' + esc(typedAnswer(K, K.current)).replace(/\n/g, '<br>') + '</p></div>' : '') + (hasAns ? '' : '<p class="muted small">No photo for this question. <a href="#handin">Add one</a>, or mark from memory.</p>') +
      (K.fb && K.fb[K.current] ? '<div class="note ok-n ai-fb">' + C.icon('spark') + '<div>' + K.fb[K.current] + '</div></div>' : '') +
      '<div class="score-row"><label for="mk-score"><b>Marks</b></label><input id="mk-score" type="number" min="0" max="' + (q.marks || 200) + '" data-mscore="' + K.current + '" value="' + (K.scores[K.current] != null ? esc(K.scores[K.current]) : '') + '" inputmode="numeric"><span class="num">/ ' + (q.marks == null ? '?' : q.marks) + '</span>' +
      '<button type="button" class="btn alt sm" data-action="mark-full" data-i="' + K.current + '">Full</button><button type="button" class="btn alt sm" data-action="mark-zero" data-i="' + K.current + '">0</button>' +
      (hasAns ? '<button type="button" class="btn alt sm" data-action="mark-ai" data-i="' + K.current + '">' + C.icon('spark') + 'Mark with Claude</button>' : '') +
      '<button type="button" class="btn sm" data-action="mark-next">Next' + C.icon('right') + '</button></div></section>' +
      '<section class="card ms-pane"><div class="card-head"><h2>Mark scheme</h2>' + (p.msFile ? '<span class="row-actions"><button type="button" class="icon-btn" data-action="ms-page" data-v="-1" aria-label="Previous page">' + C.icon('left') + '</button><span class="num small">page ' + (msPage + 1) + (p.msPagesCount ? ' / ' + p.msPagesCount : '') + '</span><button type="button" class="icon-btn" data-action="ms-page" data-v="1" aria-label="Next page">' + C.icon('right') + '</button></span>' : '') + '</div>' +
      (p.msFile ? '<div class="qcrop paper-sheet" data-pagedraw="' + msPage + '" data-kind="ms" data-paper="' + p.id + '"></div>'
        : '<p class="muted">No mark scheme for this paper yet.</p><label class="btn alt file-btn">' + C.icon('upload') + 'Add the mark scheme PDF<input type="file" accept="application/pdf,.pdf" data-paperfile="ms" data-paper="' + p.id + '"></label>') + '</section></div>';
    html += '<details class="fold-lite"><summary>Options</summary><label class="toggle"><input type="checkbox" data-mlog="1"' + (K.logMistakes ? ' checked' : '') + '><span class="tg" aria-hidden="true"></span><span class="tg-t"><b>Note lost marks in the topic’s notes</b></span></label><div class="field"><label for="mk-topic">Topic this question tests</label><select id="mk-topic" data-paper="' + p.id + '" data-qt="' + K.current + '"><option value="">–</option>' + topicOpts(p.subject, q.topic) + '</select></div></details>';
    return html;
  };

  // Claude marks one answer: the question, your photos or typed answer, and the mark scheme page.
  async function aiMark(i) {
    const K = st().portal.marking, p = st().portal.papers[K.paper], q = p.questions[i];
    const max = RH.ai.maxImages();
    const imgs = max ? (await P.questionImages(p.id, i).catch(() => [])).slice(0, 2) : [];
    const ans = max ? (await hwList(K, i)).concat(K.hw && K.hw.all ? await hwList(K, 'all') : []).slice(0, 3) : [];
    const ms = max && q.ms != null && p.msFile ? await P.msImage(p.id, q.ms) : null;
    const all = imgs.concat(ans).concat(ms ? [ms] : []).slice(0, max);
    const qText = await P.questionText(p.id, i).catch(() => '');
    const msText = q.ms != null && p.msFile ? await P.msText(p.id, q.ms).catch(() => '') : '';
    const typed = typedAnswer(K, i);
    if (!typed && !(ans.length && all.length > imgs.length)) throw { code: 'no_answer', message: max ? 'Add a photo of your answer or type it first.' : 'Photos can’t be sent to Claude from here. Type your answer in the box on the paper, then mark again.' };
    const subj = p.subject && M.subject[p.subject] ? M.subject[p.subject].name : 'A-level';
    const sentAns = all.filter((b) => ans.indexOf(b) !== -1).length, sentQ = all.filter((b) => imgs.indexOf(b) !== -1).length;
    const prompt = 'You are an experienced ' + subj + ' examiner. Mark one exam answer.\n\nQuestion ' + q.n + (q.marks ? ' (' + q.marks + ' marks)' : '') + (qText ? ', as text read from the PDF (diagrams and some symbols may be missing):\n"""' + qText + '"""' : '') +
      (all.length ? '\n\nImages, in order: ' + (sentQ ? sentQ + ' of the question' : '') + (sentAns ? (sentQ ? ', then ' : '') + sentAns + ' photo(s) of the student’s handwritten answer' + (K.hw && K.hw.all ? ' (one photo may cover several questions: mark only question ' + q.n + ')' : '') : '') + (ms && all.indexOf(ms) !== -1 ? ', then the mark scheme page' : '') + '.' : '') +
      (typed ? '\n\nThe student’s answer:\n"""' + typed + '"""' : '') +
      (msText && !(ms && all.indexOf(ms) !== -1) ? '\n\nMark scheme page text (it may cover other questions too; use only question ' + q.n + '):\n"""' + msText + '"""' : '') +
      '\n\nAward marks strictly by the mark scheme if you have it, otherwise by standard ' + subj + ' marking. Reply with JSON only: {"score": number, "max": number, "feedback": "two or three short sentences: what earned marks and the one thing that would have got the next mark"}';
    return RH.ai.ask(prompt, { json: true, images: all, effort: 'high' });
  }
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
    location.hash = 'papers';
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
      return '<div class="trend" data-subj="' + sub.id + '">' + C.stag(sub.id) + '<span class="tr-n num">' + (avg == null ? '–' : U.pct(avg)) + '</span><span class="muted small">' + (mine.length ? 'average of last ' + last3.length : 'no papers yet') + '</span>' + spark(pcts) + '</div>';
    }).join('') + '</div>';
    if (s.portal.attempts.length) html += '<section class="card"><h2>Papers sat in the portal</h2>' + attemptTable(s.portal.attempts) + '</section>';
    const sid = RH.ui.paperSubj || 'physics', sub = M.subject[sid];
    html += '<section class="card"><h2>Log a paper you did on paper</h2><form id="paperForm" class="paper-form">' +
      '<div class="form-grid"><div class="field"><label for="p-subj">Subject</label><select id="p-subj" name="subject">' + M.subjects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="p-paper">Paper</label><select id="p-paper" name="paper">' + sub.papers.map((p) => '<option value="' + esc(p.code) + '">' + esc(p.code + ' ' + p.name.replace(/^Paper \w+: /, '')) + '</option>').join('') + '<option value="Other">Other / practice paper</option></select></div>' +
      '<div class="field"><label for="p-series">Series</label><input id="p-series" name="series" placeholder="e.g. June 2023"></div></div>' +
      '<div class="form-grid"><div class="field"><label for="p-score">Score</label><input id="p-score" name="score" type="number" min="0" step="1" required></div>' +
      '<div class="field"><label for="p-max">Out of</label><input id="p-max" name="max" type="number" min="1" step="1" required value="' + (sub.papers[0] ? sub.papers[0].marks : 100) + '"></div>' +
      '<div class="field"><label for="p-date">Date</label><input id="p-date" name="date" type="date" value="' + today + '"></div></div>' +
      '<div class="field"><label for="p-notes">What went wrong?</label><input id="p-notes" name="notes" placeholder="Topics to fix"></div>' +
      '<button type="submit" class="btn">' + C.icon('plus') + 'Log paper</button></form></section>';
    const list = s.papers.slice().sort((a, b) => b.date.localeCompare(a.date));
    html += '<section class="card"><h2>All paper scores</h2>' + (list.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Subject</th><th>Paper</th><th class="num">Score</th><th class="num">%</th><th>Notes</th><th></th></tr></thead><tbody>' +
      list.map((p) => '<tr data-subj="' + p.subject + '"><td class="num">' + esc(U.fmtShort(p.date)) + '</td><td>' + C.stag(p.subject) + '</td><td>' + esc(p.paper) + (p.series ? ' <span class="muted">' + esc(p.series) + '</span>' : '') + '</td><td class="num num">' + p.score + '/' + p.max + '</td><td class="num num"><b>' + U.pct(p.score / p.max) + '</b></td><td class="small">' + esc(p.notes || '') + '</td>' +
        '<td><button type="button" class="icon-btn" data-action="paper-del" data-id="' + p.id + '" aria-label="Delete">' + C.icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No scores yet. Sit a paper in the portal or log one above.</p>') + '</section>';
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
      btn.disabled = false; btn.innerHTML = C.icon('paper') + 'Read paper';
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
    RH.ui.sit = el.dataset.q != null ? { paper: el.dataset.id, one: Number(el.dataset.q), mode: 'all', mins: 30, extra: 0, strict: false, ai: false } : null;
    location.hash = 'sit-' + el.dataset.id;
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
  RH.actions['exam-quit'] = () => { store.update(function (s) { s.portal.live = null; }); location.hash = 'papers'; };
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
  RH.actions['mark-ai'] = async function (el) {
    const i = Number(el.dataset.i);
    el.disabled = true; el.innerHTML = C.icon('spark') + 'Marking…';
    try {
      const r = await aiMark(i);
      const q = st().portal.papers[st().portal.marking.paper].questions[i];
      const sc = Math.max(0, Math.min(q.marks || r.max || 99, Math.round(Number(r.score) || 0)));
      store.update(function (s) { const K = s.portal.marking; K.scores[i] = String(sc); K.fb = K.fb || {}; K.fb[i] = '<b>Claude: ' + sc + '/' + (q.marks || r.max) + '.</b> ' + esc(String(r.feedback || '')); });
    } catch (e) { C.toast(RH.ai.errorText(e)); RH.render({ keepScroll: true }); }
  };
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
      location.hash = 'papers';
      RH.render();
    });
  };
  RH.actions['attempt-del'] = function (el) {
    C.confirm('Delete this result?', 'It will be removed from your results.', 'Delete', () => store.update(function (s) { s.portal.attempts = s.portal.attempts.filter((a) => a.id !== el.dataset.id); }));
  };

  // ---------- Practise a lesson's question pack ----------
  // PMT packs can be fetched straight into the exam centre. Anything else (and anything inside claude.ai, which
  // blocks downloads from other sites) is opened in a new tab for you to download and drop back in.
  function packOpts(el) {
    const t = M.topic[el.dataset.topic];
    return { title: (t ? M.title(t.name) : 'Topic') + ': exam questions', subject: t ? t.subject.id : '', topic: el.dataset.topic || '', src: el.dataset.u };
  }
  async function importPack(file, o) {
    const paper = await P.analyse(file, null, o);
    C.closeModal();
    C.toast('Added ' + U.plural(paper.questions.length, 'question') + (paper.msFile ? ' with the mark scheme' : ''));
    RH.ui.sit = null;
    location.hash = 'sit-' + paper.id;
  }
  RH.actions['pack-practise'] = async function (el) {
    const o = packOpts(el), have = papers().find((p) => p.src && p.src === o.src);
    if (have) { location.hash = 'sit-' + have.id; return; }
    const pdf = /\.pdf(\?|#|$)/i.test(o.src);
    if (pdf && !RH.ai.inClaude) {
      C.openModal('Getting the questions', '<p class="muted">Downloading the PDF and splitting it into questions…</p>');
      try {
        const r = await fetch(o.src);
        if (r.ok) { const b = await r.blob(); await importPack(new File([b], 'questions.pdf', { type: 'application/pdf' }), o); return; }
      } catch (e) { /* fall back to downloading it yourself */ }
    }
    C.openModal('Bring it into the exam centre', '<ol class="pack-steps"><li><b>Open the questions and download the PDF.</b>' + (pdf ? '' : ' On the page, pick this topic’s question paper.') + '<a class="btn alt" href="' + esc(o.src) + '" target="_blank" rel="noopener">' + C.icon('ext') + 'Open the questions</a></li>' +
      '<li><b>Drop the PDF here.</b><label class="drop">' + C.icon('upload') + '<span>Choose the downloaded file</span><input type="file" accept="application/pdf,.pdf" data-packfile="1" data-u="' + esc(o.src) + '" data-topic="' + esc(o.topic) + '"></label></li></ol><p class="help" id="pack-status">It’s split into questions, with the mark scheme if it’s in the file.</p>');
  };
  RH.onChange.push(function (el) {
    if (!el.dataset.packfile) return false;
    const f = el.files && el.files[0];
    if (!f) return true;
    const stEl = document.getElementById('pack-status'); if (stEl) stEl.textContent = 'Reading the PDF…';
    importPack(f, packOpts(el)).catch((e) => { if (stEl) stEl.textContent = 'That file could not be read: ' + (e && e.message || 'unknown error'); });
    return true;
  });

  // ---------- Claude in the corner (only when "With the help of AI" was chosen) ----------
  const dock = document.createElement('div');
  dock.id = 'aiDock'; dock.className = 'ai-dock'; dock.hidden = true;
  document.body.appendChild(dock);
  const chat = () => (RH.ui.chat = RH.ui.chat || []);
  const fmtMsg = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  function paintDock() {
    const L = live(), on = !!(L && L.ai && location.hash === '#exam' && !L.paused);
    dock.hidden = !on;
    // On wide screens an open chat sits in the side column under the clock, so it never covers the controls.
    const side = document.querySelector('.ex-side'), inSide = on && RH.ui.chatOpen && side && window.innerWidth > 1000;
    if (inSide && dock.parentNode !== side) side.appendChild(dock);
    else if (!inSide && dock.parentNode !== document.body) document.body.appendChild(dock);
    dock.classList.toggle('in-side', !!inSide);
    if (!on) return;
    const p = st().portal.papers[L.paper], q = p && p.questions[L.current];
    if (!RH.ui.chatOpen) { dock.innerHTML = '<button type="button" class="ai-fab" data-action="chat-toggle">' + C.icon('spark') + '<span>Ask Claude</span></button>'; return; }
    dock.innerHTML = '<section class="ai-panel" aria-label="Claude"><header><span class="ai-av">' + C.icon('spark') + '</span><span><b>Claude</b><span>Hints for question ' + esc(q ? q.n : '') + '</span></span><button type="button" class="icon-btn" data-action="chat-toggle" aria-label="Close">' + C.icon('x') + '</button></header>' +
      '<div class="ai-msgs" id="aiMsgs">' + (chat().length ? chat().map((m) => '<div class="msg ' + (m.role === 'user' ? 'me' : 'ai') + '">' + fmtMsg(m.content || '…') + '</div>').join('') : '<p class="ai-hello">Stuck? Ask for a hint, an explanation of the idea, or a check of your method. Claude can see the question.</p>') + '</div>' +
      '<div class="ai-quick">' + ['Give me a hint', 'Explain the idea', 'Is my method right?'].map((x) => '<button type="button" class="chip" data-action="chat-quick" data-v="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<form class="ai-form" id="aiChatForm"><input id="aiIn" autocomplete="off" placeholder="Ask about this question" aria-label="Message Claude"><button type="submit" class="btn sm" aria-label="Send">' + C.icon('send') + '</button></form></section>';
    const box = document.getElementById('aiMsgs'); if (box) box.scrollTop = box.scrollHeight;
  }
  RH.afterRender.push(paintDock);
  window.addEventListener('hashchange', paintDock);
  async function send(text) {
    const L = live(); if (!L || !text.trim()) return;
    const p = st().portal.papers[L.paper], q = p.questions[L.current];
    const msgs = chat();
    msgs.push({ role: 'user', content: text.trim() });
    const reply = { role: 'assistant', content: '' };
    msgs.push(reply); paintDock();
    const max = RH.ai.maxImages();
    const imgs = max ? (await P.questionImages(p.id, L.current).catch(() => [])).slice(0, max) : [];
    const qText = await P.questionText(p.id, L.current).catch(() => '');
    const typed = typedAnswer(L, L.current);
    const intro = 'You are a friendly A-level ' + (p.subject && M.subject[p.subject] ? M.subject[p.subject].name + ' ' : '') + 'tutor helping a student during a timed practice question: question ' + q.n + (q.marks ? ' (' + q.marks + ' marks)' : '') + ' of ' + p.title + '.' +
      (imgs.length ? ' The question is in the attached image' + (imgs.length > 1 ? 's' : '') + '.' : '') +
      (qText ? '\n\nThe question as text read from the PDF (diagrams and some symbols may be missing):\n"""' + qText + '"""' : (imgs.length ? '' : ' You can’t see the question, so ask the student to type the part they are stuck on.')) +
      (typed ? '\n\nWhat the student has written so far:\n"""' + typed + '"""' : '') +
      '\n\nGive hints and explain ideas briefly. Do not write out the full answer unless the student asks for it. Keep replies under 120 words.\n\n';
    const turns = msgs.slice(0, -1).map((m, k) => ({ role: m.role, content: (k === 0 ? intro : '') + m.content }));
    try {
      const out = await RH.ai.ask(turns, { images: imgs, effort: 'low', onText: (x) => { reply.content = x.text; const b = document.getElementById('aiMsgs'); if (b && b.lastElementChild) { b.lastElementChild.innerHTML = fmtMsg(x.text); b.scrollTop = b.scrollHeight; } } });
      reply.content = out || reply.content || 'No reply came back. Try again.';
    } catch (e) { reply.content = RH.ai.errorText(e); }
    paintDock();
  }
  RH.actions['chat-toggle'] = () => { RH.ui.chatOpen = !RH.ui.chatOpen; paintDock(); const i = document.getElementById('aiIn'); if (i) i.focus(); };
  RH.actions['chat-quick'] = (el) => send(el.dataset.v);
  RH.onSubmit.aiChatForm = function () { const i = document.getElementById('aiIn'); const v = i ? i.value : ''; if (i) i.value = ''; send(v); };

  P.key = function (ev) {
    if (location.hash !== '#exam' || C.modalOpen() || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return false;
    const L = live(); if (!L || L.paused) return false;
    const pos = L.qs.indexOf(L.current);
    if (ev.key === 'ArrowRight' && pos < L.qs.length - 1) { switchTo(L.qs[pos + 1]); return true; }
    if (ev.key === 'ArrowLeft' && pos > 0) { switchTo(L.qs[pos - 1]); return true; }
    if (ev.key === 'f' || ev.key === 'F') { RH.actions['exam-flag'](); return true; }
    return false;
  };
  P.detect = detect; P.meta = meta; P.readPdf = readPdf; P.packSplit = packSplit;
})(window.RH = window.RH || {});
