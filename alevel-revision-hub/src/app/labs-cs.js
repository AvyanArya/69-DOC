/* Computer science, psychology and geography labs, on the same frame as the physics labs (labs.js). */
(function (RH) {
  'use strict';
  const LB = RH.labs, f = LB.fmt, T = LB.text, esc = RH.util.esc;
  const icon = (d) => '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  function pill(g, s, x, y, col, th, align) {
    g.font = '800 12px Nunito, system-ui, sans-serif';
    const w = g.measureText(s).width + 16, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    LB.rr(g, x0, y - 13, w, 22, 11); g.fillStyle = th.dark ? 'rgba(20,22,34,0.85)' : 'rgba(255,255,255,0.92)'; g.fill();
    g.strokeStyle = col; g.lineWidth = 2; g.stroke();
    T(g, s, x0 + 8, y + 3, { col: col, size: 12, weight: 800 });
  }
  function panelBg(g, W, H, th, a, b) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, th.dark ? '#1B2133' : a); gr.addColorStop(1, th.dark ? '#222A40' : b);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  const syncToggle = (k, v) => { const el = document.querySelector('input[data-lk="' + k + '"]'); if (el) el.checked = v; };

  // =====================================================================
  // COMPUTER SCIENCE 1. Sorting algorithms
  // =====================================================================
  const ALGS = { bubble: 'Bubble sort', insertion: 'Insertion sort', merge: 'Merge sort', quick: 'Quick sort' };
  function sortOps(alg, arr) {
    const a = arr.slice(), o = [];
    const cmp = (i, j) => { o.push(['c', i, j]); return a[i] > a[j]; };
    const swap = (i, j) => { if (i === j) return; o.push(['s', i, j]); const t = a[i]; a[i] = a[j]; a[j] = t; };
    const set = (i, v) => { o.push(['w', i, v]); a[i] = v; };
    const done = (i) => o.push(['d', i]);
    const n = a.length;
    if (alg === 'bubble') {
      for (let m = n; m > 1; m--) {
        let sw = false;
        for (let i = 0; i < m - 1; i++) if (cmp(i, i + 1)) { swap(i, i + 1); sw = true; }
        done(m - 1);
        if (!sw) break;
      }
    } else if (alg === 'insertion') {
      for (let i = 1; i < n; i++) { let j = i; while (j > 0 && cmp(j - 1, j)) { swap(j - 1, j); j--; } }
    } else if (alg === 'merge') {
      const ms = (lo, hi) => {
        if (hi <= lo) return;
        const mid = (lo + hi) >> 1; ms(lo, mid); ms(mid + 1, hi);
        const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
        let i = 0, j = 0, k = lo;
        while (i < L.length && j < R.length) { o.push(['c', lo + i, mid + 1 + j]); if (L[i] <= R[j]) set(k++, L[i++]); else set(k++, R[j++]); }
        while (i < L.length) set(k++, L[i++]);
        while (j < R.length) set(k++, R[j++]);
      };
      ms(0, n - 1);
    } else {
      const qs = (lo, hi) => {
        if (lo > hi) return;
        if (lo === hi) { done(lo); return; }
        let i = lo;
        o.push(['p', hi]);
        for (let j = lo; j < hi; j++) if (!cmp(j, hi)) { swap(i, j); i++; }
        swap(i, hi); done(i);
        qs(lo, i - 1); qs(i + 1, hi);
      };
      qs(0, n - 1);
    }
    for (let i = 0; i < n; i++) done(i);
    return o;
  }
  LB.add({
    id: 'sorting', subject: 'compsci', name: 'Sorting algorithms', topics: ['cs-u8-t4', 'cs-u8-t1'],
    blurb: 'Watch bubble, insertion, merge and quick sort step by step, and count the comparisons each one needs.',
    icon: icon('<path d="M8 40V28M16 40V20M24 40V32M32 40V12M40 40V24"/>'),
    aspect: 0.48, maxH: 400, graph: true, graphH: 190, still: true,
    help: 'Green values are the textbook formulas for this n; the others are counted as the algorithm runs.',
    controls: [
      { k: 'alg', type: 'select', label: 'Algorithm', options: Object.keys(ALGS).map((k) => [k, ALGS[k]]), v: 'bubble' },
      { k: 'n', label: 'Number of items, n', min: 6, max: 60, step: 1, v: 20, dp: 0 },
      { k: 'order', type: 'seg', label: 'Starting order', options: [['random', 'Random'], ['nearly', 'Nearly sorted'], ['reversed', 'Reversed']], v: 'random' },
      { k: 'speed', label: 'Steps per second', min: 1, max: 120, step: 1, v: 12, dp: 0 }
    ],
    actions: [{ id: 'run', label: 'Play / pause', primary: true }, { id: 'one', label: 'One step' }, { id: 'shuffle', label: 'New data' }],
    tasks: [
      'Run bubble sort on 20 random items. After the first pass, the largest item is in place. Count the passes.',
      'Give bubble sort a <b>nearly sorted</b> list. It stops early because a pass has no swaps: best case O(n).',
      'Compare all four on the same data using the bar chart. Which needs the fewest comparisons?',
      'Set n = 60 and run insertion sort on a reversed list: the worst case, n(n − 1)/2 comparisons.',
      'Quick sort on a reversed list chooses the worst pivot each time. Why does its comparison count jump?',
      'Merge sort uses about n log₂ n comparisons whatever the order. What is the cost? (Look at the extra memory it needs.)'
    ],
    theory: '<p><b>Bubble sort</b> compares adjacent pairs and swaps them if out of order; each pass bubbles the largest item to the end. O(n²), best case O(n) with an early stop.</p><p><b>Insertion sort</b> takes each item and slides it left into the sorted part. O(n²), but fast on nearly sorted data.</p><p><b>Merge sort</b> splits the list in half recursively, then merges sorted halves. O(n log n) always, but needs O(n) extra memory.</p><p><b>Quick sort</b> picks a pivot (here the last item), partitions smaller items to its left and larger to its right, then sorts each side. O(n log n) on average, O(n²) in the worst case.</p>',
    exam: [['Trace tables', ['Write out the list after every pass (bubble) or every insertion.', 'For merge sort, show the splits then each merge.', 'For quick sort, mark the pivot and the two partitions.'], 'ul'], ['Big O to learn', ['Bubble and insertion: O(n²) time, O(1) space.', 'Merge: O(n log n) time, O(n) space.', 'Quick: O(n log n) average, O(n²) worst; O(log n) space.'], 'ul'], ['Compare', ['For tiny or nearly sorted data, insertion sort is often fastest.', 'Merge sort is stable and predictable.', 'Quick sort is usually fastest in practice.']]],
    create: function (p) {
      const S = { base: [], a: [], ops: [], k: 0, acc: 0, run: true, sorted: {}, hl: null, cmp: 0, sw: 0, counts: {} };
      function data() {
        const n = p.n, a = [];
        for (let i = 0; i < n; i++) a.push(Math.round(5 + (95 * (i + 1)) / n));
        if (p.order === 'random') shuffle(a);
        else if (p.order === 'reversed') a.reverse();
        else for (let i = 0; i < Math.max(1, n / 10); i++) { const x = Math.floor(Math.random() * (n - 1)); const t = a[x]; a[x] = a[x + 1]; a[x + 1] = t; }
        S.base = a;
        S.counts = {}; Object.keys(ALGS).forEach((k) => { S.counts[k] = sortOps(k, a).filter((q) => q[0] === 'c').length; });
      }
      function restart() { S.a = S.base.slice(); S.ops = sortOps(p.alg, S.base); S.k = 0; S.acc = 0; S.sorted = {}; S.hl = null; S.cmp = 0; S.sw = 0; S.run = true; }
      function apply() {
        const q = S.ops[S.k++];
        if (!q) return;
        S.hl = q;
        if (q[0] === 'c') S.cmp++;
        if (q[0] === 's') { const t = S.a[q[1]]; S.a[q[1]] = S.a[q[2]]; S.a[q[2]] = t; S.sw++; }
        if (q[0] === 'w') { S.a[q[1]] = q[2]; S.sw++; }
        if (q[0] === 'd') S.sorted[q[1]] = true;
      }
      const inst = {
        reset: restart,
        change: function (k) { if (k === 'n' || k === 'order') data(); if (k !== 'speed') restart(); },
        action: function (id) { if (id === 'run') S.run = !S.run; if (id === 'one') { S.run = false; apply(); } if (id === 'shuffle') { data(); restart(); } },
        step: function (dt) {
          if (!S.run) return;
          S.acc += dt * p.speed;
          while (S.acc >= 1 && S.k < S.ops.length) { S.acc -= 1; apply(); while (S.k < S.ops.length && S.ops[S.k][0] === 'd') apply(); }
          if (S.k >= S.ops.length) S.hl = null;
        },
        draw: function (g, W, H, p, th) {
          panelBg(g, W, H, th, '#EFF8FF', '#E0F2FE');
          const n = S.a.length, pad = 18, bw = (W - pad * 2) / n, base = H - 30, top = 30;
          const hlc = S.hl && (S.hl[0] === 'c' || S.hl[0] === 'p') ? [S.hl[1], S.hl[2]] : [], hls = S.hl && (S.hl[0] === 's' || S.hl[0] === 'w') ? [S.hl[1], S.hl[2]] : [];
          for (let i = 0; i < n; i++) {
            const h = (base - top) * S.a[i] / 100, x = pad + i * bw + bw * 0.12, w = bw * 0.76;
            let col = '#0EA5E9';
            if (S.sorted[i]) col = '#22C55E';
            if (hlc.indexOf(i) >= 0) col = '#FACC15';
            if (hls.indexOf(i) >= 0 && S.hl[0] === 's') col = '#EC4899';
            if (S.hl && S.hl[0] === 'w' && S.hl[1] === i) col = '#8B5CF6';
            LB.box(g, x, base - h, w, h, col, Math.min(8, w / 3));
            if (n <= 24) T(g, String(S.a[i]), x + w / 2, base + 16, { col: th.ink3, size: 11, weight: 800, align: 'center' });
          }
          if (S.hl && S.hl[0] === 'c') { const i = S.hl[1], j = S.hl[2], x1 = pad + (i + 0.5) * bw, x2 = pad + (j + 0.5) * bw; g.strokeStyle = '#CA8A04'; g.lineWidth = 2; g.beginPath(); g.moveTo(x1, top - 6); g.quadraticCurveTo((x1 + x2) / 2, top - 22, x2, top - 6); g.stroke(); }
          const done = S.k >= S.ops.length;
          pill(g, ALGS[p.alg] + (done ? ' · sorted ✓' : S.run ? ' · running' : ' · paused'), pad, 22, done ? '#22C55E' : '#0EA5E9', th);
          pill(g, S.cmp + ' comparisons · ' + S.sw + (p.alg === 'merge' ? ' writes' : ' swaps'), W - pad, 22, '#64748B', th, 'right');
        },
        graph: function (g, W, H, p, th) {
          const ks = Object.keys(ALGS), mx = Math.max(...ks.map((k) => S.counts[k]), p.n * (p.n - 1) / 2) * 1.08, L = Math.min(150, W * 0.3), rowH = (H - 40) / ks.length;
          T(g, 'Comparisons needed to sort this exact list', 8, 16, { col: th.ink2, size: 12, weight: 800 });
          ks.forEach((k, i) => {
            const y = 28 + i * rowH, w = (W - L - 70) * S.counts[k] / mx, on = k === p.alg;
            T(g, ALGS[k], L - 8, y + rowH / 2 + 4, { col: on ? th.ink : th.ink3, size: 12, weight: on ? 900 : 700, align: 'right' });
            LB.box(g, L, y + 4, Math.max(4, w), rowH - 10, on ? '#0EA5E9' : (th.dark ? '#4B5567' : '#CBD5E1'), 6);
            T(g, String(S.counts[k]), L + Math.max(4, w) + 8, y + rowH / 2 + 4, { col: th.ink2, size: 12, weight: 900 });
          });
          const nn = p.n * (p.n - 1) / 2, x = L + (W - L - 70) * nn / mx;
          g.strokeStyle = '#EF4444'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x, 24); g.lineTo(x, H - 8); g.stroke(); g.setLineDash([]);
          T(g, 'n(n−1)/2', x - 4, H - 2, { col: '#EF4444', size: 11, weight: 800, align: 'right' });
        },
        readouts: function () {
          const n = p.n;
          return [['Step', S.k + ' / ' + S.ops.length], ['Comparisons', String(S.cmp)], [p.alg === 'merge' ? 'Writes' : 'Swaps', String(S.sw)], ['n(n−1)/2', String(n * (n - 1) / 2), 'th'], ['n log₂ n', f(n * Math.log2(n), 0), 'th'], ['Time complexity', p.alg === 'merge' ? 'O(n log n)' : p.alg === 'quick' ? 'O(n log n) avg, O(n²) worst' : 'O(n²), best O(n)', 'th']];
        }
      };
      data(); restart();
      return inst;
    }
  });

  // =====================================================================
  // COMPUTER SCIENCE 2. Logic gates
  // =====================================================================
  const FN = { AND: (a) => a[0] & a[1], OR: (a) => a[0] | a[1], NOT: (a) => 1 - a[0], NAND: (a) => 1 - (a[0] & a[1]), NOR: (a) => 1 - (a[0] | a[1]), XOR: (a) => a[0] ^ a[1] };
  const CIRC = {
    AND: { n: 'AND gate', in: ['A', 'B'], g: [['g', 'AND', ['A', 'B'], 0.5, 0.5]], out: [['Q', 'g']], ex: 'Q = A ∧ B' },
    OR: { n: 'OR gate', in: ['A', 'B'], g: [['g', 'OR', ['A', 'B'], 0.5, 0.5]], out: [['Q', 'g']], ex: 'Q = A ∨ B' },
    NOT: { n: 'NOT gate', in: ['A'], g: [['g', 'NOT', ['A'], 0.5, 0.5]], out: [['Q', 'g']], ex: 'Q = ¬A' },
    NAND: { n: 'NAND gate', in: ['A', 'B'], g: [['g', 'NAND', ['A', 'B'], 0.5, 0.5]], out: [['Q', 'g']], ex: 'Q = ¬(A ∧ B)' },
    NOR: { n: 'NOR gate', in: ['A', 'B'], g: [['g', 'NOR', ['A', 'B'], 0.5, 0.5]], out: [['Q', 'g']], ex: 'Q = ¬(A ∨ B)' },
    XOR: { n: 'XOR gate', in: ['A', 'B'], g: [['g', 'XOR', ['A', 'B'], 0.5, 0.5]], out: [['Q', 'g']], ex: 'Q = A ⊻ B' },
    expr: { n: '(A AND B) OR NOT C', in: ['A', 'B', 'C'], g: [['g1', 'AND', ['A', 'B'], 0.42, 0.3], ['g2', 'NOT', ['C'], 0.42, 0.74], ['g3', 'OR', ['g1', 'g2'], 0.72, 0.5]], out: [['Q', 'g3']], ex: 'Q = (A ∧ B) ∨ ¬C' },
    half: { n: 'Half adder', in: ['A', 'B'], g: [['g1', 'XOR', ['A', 'B'], 0.55, 0.3], ['g2', 'AND', ['A', 'B'], 0.55, 0.72]], out: [['Sum', 'g1'], ['Carry', 'g2']], ex: 'Sum = A ⊻ B, Carry = A ∧ B' },
    full: { n: 'Full adder', in: ['A', 'B', 'C'], g: [['g1', 'XOR', ['A', 'B'], 0.32, 0.26], ['g2', 'XOR', ['g1', 'C'], 0.62, 0.32], ['g3', 'AND', ['A', 'B'], 0.42, 0.62], ['g4', 'AND', ['g1', 'C'], 0.62, 0.84], ['g5', 'OR', ['g4', 'g3'], 0.82, 0.72]], out: [['Sum', 'g2'], ['Carry out', 'g5']], ex: 'Sum = A ⊻ B ⊻ Cin, Cout = (A ∧ B) ∨ (Cin ∧ (A ⊻ B))' }
  };
  function gatePath(g, type, x, y, w, h) {
    const body = /^N/.test(type) && type !== 'NOT' ? w - 10 : w;
    g.beginPath();
    if (type === 'AND' || type === 'NAND') { g.moveTo(x, y); g.lineTo(x + body - h / 2, y); g.arc(x + body - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(x, y + h); g.closePath(); }
    else if (type === 'OR' || type === 'NOR' || type === 'XOR') { g.moveTo(x, y); g.quadraticCurveTo(x + body * 0.65, y, x + body, y + h / 2); g.quadraticCurveTo(x + body * 0.65, y + h, x, y + h); g.quadraticCurveTo(x + body * 0.28, y + h / 2, x, y); g.closePath(); }
    else { g.moveTo(x, y); g.lineTo(x + w - 12, y + h / 2); g.lineTo(x, y + h); g.closePath(); }
    return body;
  }
  LB.add({
    id: 'logic', subject: 'compsci', name: 'Logic gates and adders', topics: ['cs-u4-t3', 'cs-u1-t1'],
    blurb: 'Flip the switches and watch signals light up through AND, OR, NOT, XOR, a half adder and a full adder.',
    icon: icon('<path d="M10 12h12a12 12 0 0 1 0 24H10z"/><path d="M4 18h6M4 30h6M34 24h10"/>'),
    aspect: 0.55, maxH: 420, onCanvas: true, still: true,
    help: 'Click the switches on the left of the circuit, or use the toggles here. The truth table highlights the current row.',
    controls: [
      { k: 'c', type: 'select', label: 'Circuit', options: Object.keys(CIRC).map((k) => [k, CIRC[k].n]), v: 'AND' },
      { k: 'A', type: 'toggle', label: 'Input A', v: true },
      { k: 'B', type: 'toggle', label: 'Input B', v: false, when: (p) => CIRC[p.c].in.indexOf('B') >= 0 },
      { k: 'C', type: 'toggle', label: 'Input C (carry in for the full adder)', v: false, when: (p) => CIRC[p.c].in.indexOf('C') >= 0 }
    ],
    tasks: [
      'Work through every row of the AND truth table by flipping the switches. When is the output 1?',
      'Compare NAND with AND. Every row is inverted. NAND on its own can build every other gate.',
      'Choose the half adder and add 1 + 1. The Sum is 0 and the Carry is 1: binary 10 = 2.',
      'Use the full adder to work out 1 + 1 + 1. Why do we need a carry in to add numbers wider than one bit?',
      'For (A AND B) OR NOT C, find all the inputs that make Q = 0. Write the expression in Boolean algebra and simplify it if you can.'
    ],
    theory: '<p>A <b>logic gate</b> takes one or more binary inputs and gives one output. A <b>truth table</b> lists the output for every combination of inputs: 2ⁿ rows for n inputs.</p><p class="eq">AND: A ∧ B &nbsp; OR: A ∨ B &nbsp; NOT: ¬A &nbsp; XOR: A ⊻ B</p><p>A <b>half adder</b> adds two bits: Sum = A ⊻ B and Carry = A ∧ B. A <b>full adder</b> also adds a carry in, so full adders can be chained to add whole binary numbers. A <b>D-type flip-flop</b> (also in OCR 1.4.3) stores one bit, changing only on the rising edge of the clock.</p>',
    exam: [['Draw it', ['Use the standard ANSI symbols: D-shape AND, curved OR, triangle and bubble NOT.', 'A bubble on the output means NOT.', 'Label every input and output.'], 'ul'], ['Boolean algebra', ['De Morgan: ¬(A ∧ B) = ¬A ∨ ¬B; ¬(A ∨ B) = ¬A ∧ ¬B.', 'Distribution, association, commutation, double negation.', 'Karnaugh maps: group 1s in powers of 2, wrapping round the edges.'], 'ul'], ['Truth tables', ['Count up in binary down the input columns so you never miss a row.', 'Add a column for each intermediate gate.']]],
    create: function (p) {
      const S = { sw: [], pulse: 0 };
      const inv = () => CIRC[p.c].in;
      function evalc() {
        const c = CIRC[p.c], v = {};
        c.in.forEach((k) => { v[k] = p[k] ? 1 : 0; });
        c.g.forEach((q) => { v[q[0]] = FN[q[1]](q[2].map((s) => v[s])); });
        return v;
      }
      const inst = {
        reset: function () {},
        step: function (dt) { S.pulse += dt; },
        pointer: function (kind, x, y) {
          if (kind !== 'down') return false;
          const hit = S.sw.find((s) => x >= s.x - 6 && x <= s.x + s.w + 6 && y >= s.y - 8 && y <= s.y + s.h + 8);
          if (!hit) return false;
          p[hit.k] = !p[hit.k]; syncToggle(hit.k, p[hit.k]);
          return true;
        },
        draw: function (g, W, H, p, th) {
          panelBg(g, W, H, th, '#F2F7FF', '#E6F0FF');
          // breadboard dots
          g.fillStyle = th.dark ? 'rgba(255,255,255,0.05)' : 'rgba(14,165,233,0.12)';
          for (let x = 12; x < W; x += 24) for (let y = 12; y < H; y += 24) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
          const c = CIRC[p.c], v = evalc(), gw = clamp(W * 0.1, 54, 84), gh = gw * 0.72;
          const on = '#F59E0B', off = th.dark ? '#5B6277' : '#94A3B8';
          const pos = {}, ins = c.in;
          S.sw = [];
          ins.forEach((k, i) => { const y = H * (ins.length === 1 ? 0.5 : c.g.length > 2 ? [0.22, 0.42, 0.78][i] : (i + 1) / (ins.length + 1)); pos[k] = [W * 0.04 + 70, y]; });
          c.g.forEach((q) => { const x = W * q[3] - gw / 2, y = H * q[4] - gh / 2; pos[q[0]] = [x + gw, y + gh / 2, x, y]; });
          const wire = (from, x2, y2, idx) => {
            const a = pos[from], val = v[from], xm = x2 - 16 - idx * 10;
            g.strokeStyle = val ? on : off; g.lineWidth = val ? 5 : 3.5; g.lineJoin = 'round';
            if (val) { g.shadowColor = 'rgba(245,158,11,0.6)'; g.shadowBlur = 10; }
            g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(xm, a[1]); g.lineTo(xm, y2); g.lineTo(x2, y2); g.stroke();
            g.shadowBlur = 0;
            if (val) { const L = Math.abs(xm - a[0]) + Math.abs(y2 - a[1]) + Math.abs(x2 - xm), t = (S.pulse * 120) % 30; for (let s = t; s < L; s += 30) { let px, py; if (s < Math.abs(xm - a[0])) { px = a[0] + Math.sign(xm - a[0]) * s; py = a[1]; } else if (s < Math.abs(xm - a[0]) + Math.abs(y2 - a[1])) { px = xm; py = a[1] + Math.sign(y2 - a[1]) * (s - Math.abs(xm - a[0])); } else { px = xm + (s - Math.abs(xm - a[0]) - Math.abs(y2 - a[1])); py = y2; } g.fillStyle = '#FFF7D6'; g.beginPath(); g.arc(px, py, 2.2, 0, 7); g.fill(); } }
          };
          c.g.forEach((q) => { const x = pos[q[0]][2], y = pos[q[0]][3]; q[2].forEach((s, i) => wire(s, x + (q[1] === 'NOT' ? 0 : gw * 0.1), y + gh * (q[2].length === 1 ? 0.5 : (i + 1) / 3), i)); });
          const outs = c.out.map((o, i) => { const y = c.out.length === 1 ? pos[o[1]][1] : H * (i ? 0.72 : 0.32); return [o, W - 70, c.out.length === 1 ? y : (p.c === 'full' ? pos[o[1]][1] : y)]; });
          outs.forEach((o) => wire(o[0][1], o[1] - 18, o[2], 0));
          // fan-out junction dots
          const uses = {}; c.g.forEach((q) => q[2].forEach((s) => { uses[s] = (uses[s] || 0) + 1; })); c.out.forEach((o) => { uses[o[1]] = (uses[o[1]] || 0) + 1; });
          Object.keys(uses).forEach((k) => { if (uses[k] > 1) { g.fillStyle = v[k] ? on : off; g.beginPath(); g.arc(pos[k][0] + 2, pos[k][1], 5, 0, 7); g.fill(); } });
          // gates
          c.g.forEach((q) => {
            const x = pos[q[0]][2], y = pos[q[0]][3], val = v[q[0]];
            g.shadowColor = 'rgba(0,0,0,0.15)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
            const body = gatePath(g, q[1], x, y, gw, gh);
            const gr = g.createLinearGradient(0, y, 0, y + gh); gr.addColorStop(0, th.dark ? '#2E3A55' : '#FFFFFF'); gr.addColorStop(1, th.dark ? '#25304A' : '#E0F2FE');
            g.fillStyle = gr; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
            g.strokeStyle = '#0EA5E9'; g.lineWidth = 3; g.stroke();
            if (q[1] === 'XOR') { g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x + gw * 0.28 - 9, y + gh / 2, x - 9, y + gh); g.stroke(); }
            if (/^N/.test(q[1])) { const bx = q[1] === 'NOT' ? x + gw - 6 : x + body + 5; g.beginPath(); g.arc(bx, y + gh / 2, 5.5, 0, 7); g.fillStyle = th.dark ? '#2E3A55' : '#FFFFFF'; g.fill(); g.stroke(); }
            T(g, q[1], x + gw * (q[1] === 'NOT' ? 0.3 : 0.42), y + gh / 2 + 4, { col: th.ink, size: 11, weight: 900, align: 'center' });
          });
          // switches
          ins.forEach((k) => {
            const x = pos[k][0] - 62, y = pos[k][1] - 13, val = p[k];
            S.sw.push({ k: k, x: x, y: y, w: 48, h: 26 });
            LB.rr(g, x, y, 48, 26, 13); g.fillStyle = val ? '#22C55E' : (th.dark ? '#3A4058' : '#CBD5E1'); g.fill();
            LB.ball(g, val ? x + 35 : x + 13, y + 13, 10, '#FFFFFF');
            T(g, k === 'C' && p.c === 'full' ? 'Cin' : k, x - 8, y + 18, { col: th.ink, size: 15, weight: 900, align: 'right' });
            T(g, val ? '1' : '0', x + 24, y + 42, { col: val ? '#16A34A' : th.ink3, size: 12, weight: 900, align: 'center' });
            g.strokeStyle = val ? on : off; g.lineWidth = val ? 5 : 3.5; g.beginPath(); g.moveTo(x + 48, y + 13); g.lineTo(pos[k][0], pos[k][1]); g.stroke();
          });
          // lamps
          outs.forEach((o) => {
            const val = v[o[0][1]], x = o[1], y = o[2];
            if (val) LB.glow(g, x, y, 46, 'rgba(250,204,21,0.9)');
            LB.ball(g, x, y, 17, val ? '#FACC15' : (th.dark ? '#4B5567' : '#E2E8F0'));
            g.strokeStyle = th.dark ? '#8B93A7' : '#64748B'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 17, 0, 7); g.stroke();
            T(g, o[0][0] + ' = ' + val, x, y + 36, { col: th.ink, size: 13, weight: 900, align: 'center' });
          });
          pill(g, c.ex, 14, H - 16, '#0EA5E9', th);
        },
        readouts: function () {
          const c = CIRC[p.c], v = evalc();
          const r = c.in.map((k) => ['Input ' + (k === 'C' && p.c === 'full' ? 'Cin' : k), String(v[k])]).concat(c.out.map((o) => [o[0], String(v[o[1]]), 'th']));
          if (p.c === 'half' || p.c === 'full') { const sum = c.in.reduce((s, k) => s + v[k], 0); r.push(['In denary', c.in.map((k) => v[k]).join(' + ') + ' = ' + sum + ' = ' + sum.toString(2) + '₂', 'th']); }
          return r;
        },
        extra: function () {
          const c = CIRC[p.c], n = c.in.length, cur = c.in.map((k) => p[k] ? 1 : 0).join('');
          let rows = '';
          for (let i = 0; i < 1 << n; i++) {
            const bits = i.toString(2).padStart(n, '0'), v = {};
            c.in.forEach((k, j) => { v[k] = Number(bits[j]); });
            c.g.forEach((q) => { v[q[0]] = FN[q[1]](q[2].map((s) => v[s])); });
            rows += '<tr' + (bits === cur ? ' class="hl"' : '') + '>' + c.in.map((k) => '<td class="num">' + v[k] + '</td>').join('') + c.out.map((o) => '<td class="num"><b>' + v[o[1]] + '</b></td>').join('') + '</tr>';
          }
          return '<p class="label">Truth table</p><table class="tbl lab-tbl"><thead><tr>' + c.in.map((k) => '<th>' + (k === 'C' && p.c === 'full' ? 'Cin' : k) + '</th>').join('') + c.out.map((o) => '<th>' + esc(o[0]) + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>';
        }
      };
      return inst;
    }
  });

  // =====================================================================
  // COMPUTER SCIENCE 3. Binary and hex
  // =====================================================================
  LB.add({
    id: 'binary', subject: 'compsci', name: 'Binary, hex and two’s complement', topics: ['cs-u4-t1'],
    blurb: 'Click the bits to build a number. See it in denary and hex, as two’s complement or sign and magnitude, and try shifts.',
    icon: icon('<rect x="4" y="14" width="10" height="20" rx="3"/><rect x="19" y="14" width="10" height="20" rx="3"/><rect x="34" y="14" width="10" height="20" rx="3"/><path d="M9 20v8M24 20v8"/><circle cx="39" cy="24" r="3"/>'),
    aspect: 0.42, maxH: 340, onCanvas: true, still: true,
    help: 'Click a bit to flip it. In challenge mode, make the target number.',
    controls: [
      { k: 'mode', type: 'seg', label: 'Read the 8 bits as', options: [['u', 'Unsigned'], ['tc', 'Two’s complement'], ['sm', 'Sign and magnitude']], v: 'u' },
      { k: 'ch', type: 'toggle', label: 'Challenge mode', v: false, help: 'Make the target number shown on the board.' }
    ],
    actions: [{ id: 'inc', label: '+1' }, { id: 'shl', label: 'Shift left' }, { id: 'shr', label: 'Shift right' }, { id: 'not', label: 'Invert (NOT)' }, { id: 'neg', label: 'Negate' }, { id: 'clr', label: 'Clear' }, { id: 'tgt', label: 'New target' }],
    tasks: [
      'Make 73 in unsigned binary. Which place values did you use?',
      'Press <b>Shift left</b> on 00010110. The number doubles. What happens if the leftmost 1 falls off?',
      'Switch to two’s complement and make −1. Why is it 11111111?',
      'Make 5, then press <b>Negate</b> (invert and add 1). Check you get −5.',
      'Unsigned 255 + 1 overflows to 0. Two’s complement 127 + 1 overflows to −128. Try both with the +1 button.',
      'Turn on challenge mode and get five targets in a row without using the denary readout.'
    ],
    theory: '<p>Each bit has a place value: 128, 64, 32, 16, 8, 4, 2, 1. An 8-bit unsigned integer holds 0 to 255.</p><p><b>Two’s complement</b> makes the most significant bit worth −128, so 8 bits hold −128 to 127. To negate: invert every bit and add 1.</p><p><b>Sign and magnitude</b> uses the first bit as the sign (1 = negative) and the other 7 as the size, so it has two zeros.</p><p><b>Hexadecimal</b> groups bits in nibbles of 4: each hex digit 0–F is one nibble. A <b>logical shift left</b> multiplies by 2; shift right divides by 2 (losing the remainder).</p>',
    exam: [['Conversions', ['Write the place values above the bits every time.', 'Binary → hex: split into nibbles from the right.', 'Negative two’s complement → denary: −128 + the rest.'], 'ul'], ['Arithmetic', ['Binary addition: 1 + 1 = 0 carry 1; 1 + 1 + 1 = 1 carry 1.', 'Subtraction: add the two’s complement of the number.', 'Overflow: the result needs more bits than are available.'], 'ul'], ['Also in OCR 1.4.1', ['Floating point: mantissa and exponent, normalisation.', 'Masks with AND, OR and XOR.', 'Character sets: ASCII and Unicode.']]],
    create: function (p) {
      const S = { b: [0, 1, 0, 0, 1, 0, 0, 1], flash: [0, 0, 0, 0, 0, 0, 0, 0], msg: '', msgT: 0, target: 0, streak: 0, tiles: [] };
      const uval = () => S.b.reduce((s, x) => s * 2 + x, 0);
      const val = () => { const u = uval(); if (p.mode === 'tc') return u >= 128 ? u - 256 : u; if (p.mode === 'sm') return (S.b[0] ? -1 : 1) * (u & 127); return u; };
      const setU = (u) => { const nb = []; for (let i = 7; i >= 0; i--) nb.push((u >> i) & 1); nb.forEach((x, i) => { if (x !== S.b[i]) S.flash[i] = 1; }); S.b = nb; };
      const say = (m) => { S.msg = m; S.msgT = 2.5; };
      function newTarget() { const lo = p.mode === 'u' ? 0 : p.mode === 'tc' ? -128 : -127, hi = p.mode === 'u' ? 255 : 127; S.target = Math.round(rnd(lo, hi)); }
      newTarget();
      const inst = {
        reset: function () {},
        change: function (k) { if (k === 'mode' || k === 'ch') newTarget(); },
        action: function (id) {
          const u = uval();
          if (id === 'inc') { const r = u + 1; if (p.mode === 'u' && r > 255) say('Overflow! 255 + 1 needs 9 bits'); if (p.mode === 'tc' && u === 127) say('Overflow! 127 + 1 wraps to −128'); setU(r & 255); }
          if (id === 'shl') { if (S.b[0]) say('A 1 fell off the left: overflow'); setU((u << 1) & 255); }
          if (id === 'shr') { if (S.b[7]) say('A 1 fell off the right: the remainder is lost'); setU(u >> 1); }
          if (id === 'not') setU(~u & 255);
          if (id === 'neg') { if (p.mode === 'sm') setU(u ^ 128); else setU((~u + 1) & 255); }
          if (id === 'clr') setU(0);
          if (id === 'tgt') newTarget();
        },
        pointer: function (kind, x, y) {
          if (kind !== 'down') return false;
          const i = S.tiles.findIndex((t) => x >= t[0] && x <= t[0] + t[2] && y >= t[1] && y <= t[1] + t[3]);
          if (i < 0) return false;
          S.b[i] = 1 - S.b[i]; S.flash[i] = 1;
          return true;
        },
        step: function (dt) {
          S.flash = S.flash.map((x) => Math.max(0, x - dt * 3));
          if (S.msgT > 0) S.msgT -= dt;
          if (p.ch && val() === S.target && !S.hit) { S.hit = true; S.streak++; say('✓ Got it! ' + S.target + ' = ' + S.b.join('')); setTimeout(() => { newTarget(); S.hit = false; }, 1200); }
        },
        draw: function (g, W, H, p, th) {
          panelBg(g, W, H, th, '#F0F9FF', '#E0F2FE');
          const gap = 8, nib = 18, tw = Math.min(78, (W - 40 - gap * 7 - nib) / 8), th2 = tw * 1.15, x0 = (W - (tw * 8 + gap * 7 + nib)) / 2, y0 = H * 0.26;
          const pv = p.mode === 'tc' ? ['−128', '64', '32', '16', '8', '4', '2', '1'] : p.mode === 'sm' ? ['sign', '64', '32', '16', '8', '4', '2', '1'] : ['128', '64', '32', '16', '8', '4', '2', '1'];
          S.tiles = [];
          for (let i = 0; i < 8; i++) {
            const x = x0 + i * (tw + gap) + (i >= 4 ? nib : 0), y = y0, on = S.b[i], fl = S.flash[i];
            S.tiles.push([x, y, tw, th2]);
            T(g, pv[i], x + tw / 2, y - 10, { col: i === 0 && p.mode !== 'u' ? '#EC4899' : th.ink2, size: 13, weight: 900, align: 'center' });
            if (on) LB.glow(g, x + tw / 2, y + th2 / 2, tw * 0.9, 'rgba(250,204,21,0.55)');
            g.save(); g.translate(x + tw / 2, y + th2 / 2); g.scale(1 + fl * 0.08, 1 + fl * 0.08);
            LB.box(g, -tw / 2, -th2 / 2, tw, th2, on ? '#FACC15' : (th.dark ? '#3A4058' : '#E2E8F0'), 14);
            T(g, String(on), 0, tw * 0.2, { col: on ? '#713F12' : th.ink3, size: Math.round(tw * 0.55), weight: 900, align: 'center' });
            g.restore();
          }
          const hex = uval().toString(16).toUpperCase().padStart(2, '0');
          T(g, 'hex', x0 + tw * 2 + gap * 1.5, y0 + th2 + 24, { col: th.ink3, size: 11, weight: 800, align: 'center' });
          T(g, hex[0], x0 + tw * 2 + gap * 1.5, y0 + th2 + 48, { col: '#0EA5E9', size: 24, weight: 900, align: 'center' });
          T(g, hex[1], x0 + tw * 6 + gap * 5.5 + nib, y0 + th2 + 48, { col: '#0EA5E9', size: 24, weight: 900, align: 'center' });
          const parts = []; S.b.forEach((x, i) => { if (x) parts.push(i === 0 && p.mode === 'tc' ? '(−128)' : i === 0 && p.mode === 'sm' ? '' : pv[i]); });
          const sum = (p.mode === 'sm' && S.b[0] ? '−(' : '') + (parts.filter(Boolean).join(' + ') || '0') + (p.mode === 'sm' && S.b[0] ? ')' : '') + ' = ' + val();
          T(g, sum, W / 2, Math.min(H - 14, y0 + th2 + 84), { col: th.ink, size: 16, weight: 900, align: 'center' });
          if (p.ch) pill(g, 'Target: ' + S.target + '   ·   streak ' + S.streak, W / 2, 26, '#EC4899', th, 'center');
          else pill(g, 'Denary ' + val() + '  ·  hex ' + hex + '  ·  ' + S.b.slice(0, 4).join('') + ' ' + S.b.slice(4).join(''), W / 2, 26, '#0EA5E9', th, 'center');
          if (S.msgT > 0) { g.globalAlpha = clamp(S.msgT, 0, 1); pill(g, S.msg, W / 2, y0 - 34 < 46 ? 52 : y0 - 34, S.msg[0] === '✓' ? '#22C55E' : '#EF4444', th, 'center'); g.globalAlpha = 1; }
        },
        readouts: function () {
          const u = uval();
          return [['Binary', S.b.slice(0, 4).join('') + ' ' + S.b.slice(4).join('')], ['Unsigned', String(u)], ['Two’s complement', String(u >= 128 ? u - 256 : u)], ['Sign and magnitude', (S.b[0] && (u & 127) ? '−' : S.b[0] ? '−' : '') + (u & 127)], ['Hexadecimal', u.toString(16).toUpperCase().padStart(2, '0')], ['Range of this format', p.mode === 'u' ? '0 to 255' : p.mode === 'tc' ? '−128 to 127' : '−127 to 127', 'th']];
        }
      };
      return inst;
    }
  });

  // =====================================================================
  // PSYCHOLOGY. Serial position effect (memory)
  // =====================================================================
  const WORDS = ['apple', 'river', 'candle', 'tiger', 'window', 'garden', 'pencil', 'rocket', 'button', 'castle', 'ladder', 'mirror', 'violin', 'jacket', 'wallet', 'carpet', 'helmet', 'kettle', 'lemon', 'magnet', 'needle', 'orange', 'parrot', 'pillow', 'rabbit', 'saddle', 'teapot', 'tunnel', 'wagon', 'zebra', 'anchor', 'basket', 'cactus', 'dragon', 'engine', 'feather', 'glove', 'hammer', 'island', 'jungle', 'kitten', 'lantern', 'meadow', 'napkin', 'oyster', 'pebble', 'quilt', 'statue', 'trumpet', 'umbrella', 'velvet', 'whistle', 'yacht', 'bridge', 'cotton', 'forest', 'harbour', 'marble', 'puzzle', 'silver'];
  function spModel(pos, N, rate, delay) {
    const prim = 0.42 * Math.exp(-(pos - 1) / 1.7) * (0.55 + 0.3 * rate);
    const rec = 0.55 * Math.exp(-(N - pos) / 1.3) * (delay === 0 ? 1 : delay === 10 ? 0.45 : 0.06);
    return clamp(0.18 + 0.03 * rate + prim + rec - 0.004 * N, 0.03, 0.97);
  }
  LB.add({
    id: 'serialpos', subject: 'psychology', name: 'Serial position effect', topics: ['psy-u2-t1', 'psy-u7-t3', 'psy-u7-t1'],
    blurb: 'Take a free-recall memory test yourself, or run a simulated class, and see primacy and recency appear.',
    icon: icon('<path d="M6 36c4-24 8-24 12-8s8 10 12 8 6-26 12-30"/><path d="M6 42h36"/>'),
    aspect: 0.5, maxH: 420, graph: true, graphH: 210, onCanvas: true, still: true,
    help: 'Green values come from the model of a typical class (after Murdock 1962 and Glanzer and Cunitz 1966).',
    controls: [
      { k: 'N', label: 'Words in the list', min: 10, max: 20, step: 1, v: 15, dp: 0 },
      { k: 'rate', label: 'Seconds per word', min: 0.5, max: 3, step: 0.5, v: 1.5, unit: 's', dp: 1 },
      { k: 'delay', type: 'seg', label: 'Before recall', options: [[0, 'Recall at once'], [10, '10 s delay'], [30, '30 s counting task']], v: 0 }
    ],
    actions: [{ id: 'start', label: 'Start the test', primary: true }, { id: 'done', label: 'Finish recall' }, { id: 'class', label: 'Run a class of 30' }, { id: 'clear', label: 'Clear results' }],
    tasks: [
      'Take the test with immediate recall three times. Are you better at the first and last few words than the middle?',
      'Run a class of 30 with immediate recall: a U-shaped curve. The first words (<b>primacy</b>) were rehearsed into long-term memory; the last (<b>recency</b>) are still in short-term memory.',
      'Now run the class with a 30-second counting task. Which effect disappears, and why? (Glanzer and Cunitz, 1966.)',
      'Slow the presentation to 3 seconds per word. Which part of the curve goes up? More time means more rehearsal.',
      'What is the independent variable and the dependent variable in this experiment? Is it repeated measures or independent groups?'
    ],
    theory: '<p>In <b>free recall</b>, people remember the words at the start and end of a list better than those in the middle: the <b>serial position curve</b>.</p><p>The <b>primacy effect</b> happens because early words are rehearsed more and transferred to <b>long-term memory</b>. The <b>recency effect</b> happens because the last few words are still in <b>short-term memory</b> (capacity about 7 ± 2, duration about 18–30 seconds without rehearsal).</p><p>This supports the <b>multi-store model</b> (Atkinson and Shiffrin, 1968): an interference task wipes out recency but leaves primacy, so STM and LTM are separate stores.</p>',
    exam: [['Evaluate the multi-store model', ['Supported by the serial position effect and by HM and KF case studies.', 'But KF had impaired STM for verbal items only: STM is not one store (the working memory model).', 'Rehearsal is not the only route into LTM (flashbulb memories).'], 'ul'], ['Research methods', ['IV: serial position (or delay); DV: % of words recalled.', 'Control: same word length and frequency, same presentation rate.', 'Lab experiment: high control but low mundane realism.'], 'ul'], ['Data handling', ['Draw a line graph: position on the x-axis, % recalled on the y-axis.', 'Describe the trend using figures from the graph.', 'Calculate mean and range for each position.']]],
    create: function (p) {
      const S = { phase: 'idle', t: 0, list: [], grid: [], sel: {}, cells: [], you: [], cls: null, last: null, count: 0 };
      function start() {
        S.list = shuffle(WORDS.slice()).slice(0, p.N);
        const extra = shuffle(WORDS.filter((w) => S.list.indexOf(w) < 0)).slice(0, p.N);
        S.grid = shuffle(S.list.concat(extra)); S.sel = {}; S.phase = 'show'; S.t = 0; S.count = 400 + Math.floor(Math.random() * 500);
      }
      function finish() {
        if (S.phase !== 'recall') return;
        const row = S.list.map((w) => S.sel[w] ? 1 : 0), fa = S.grid.filter((w) => S.sel[w] && S.list.indexOf(w) < 0).length;
        S.you.push(row); S.last = { got: row.reduce((a, b) => a + b, 0), fa: fa }; S.phase = 'score';
      }
      const inst = {
        reset: function () {},
        change: function (k) { if (k === 'N') { S.you = []; S.cls = null; S.phase = 'idle'; } },
        action: function (id) {
          if (id === 'start') start();
          if (id === 'done') finish();
          if (id === 'class') { const res = []; for (let i = 1; i <= p.N; i++) { const pr = spModel(i, p.N, p.rate, p.delay); let c = 0; for (let k = 0; k < 30; k++) if (Math.random() < pr) c++; res.push(c / 30 * 100); } S.cls = { pts: res, delay: p.delay, rate: p.rate }; }
          if (id === 'clear') { S.you = []; S.cls = null; S.last = null; }
        },
        pointer: function (kind, x, y) {
          if (kind !== 'down' || S.phase !== 'recall') return false;
          const c = S.cells.find((q) => x >= q[1] && x <= q[1] + q[3] && y >= q[2] && y <= q[2] + q[4]);
          if (!c) return false;
          S.sel[c[0]] = !S.sel[c[0]];
          return true;
        },
        step: function (dt) {
          if (S.phase === 'show') { S.t += dt; if (S.t >= p.N * p.rate) { S.phase = p.delay ? 'delay' : 'recall'; S.t = 0; } }
          else if (S.phase === 'delay') { S.t += dt; if (S.t >= p.delay) { S.phase = 'recall'; S.t = 0; } }
        },
        draw: function (g, W, H, p, th) {
          panelBg(g, W, H, th, '#FFF1F7', '#FCE7F3');
          const pink = '#EC4899';
          S.cells = [];
          if (S.phase === 'idle') {
            T(g, 'Free recall test', W / 2, H * 0.36, { col: th.ink, size: 26, weight: 900, align: 'center' });
            T(g, p.N + ' words, one every ' + p.rate + ' s. Then pick out the ones you saw.', W / 2, H * 0.36 + 32, { col: th.ink2, size: 14, weight: 700, align: 'center' });
            T(g, 'Press “Start the test” when you are ready.', W / 2, H * 0.36 + 56, { col: th.ink3, size: 13, weight: 700, align: 'center' });
          } else if (S.phase === 'show') {
            const i = Math.floor(S.t / p.rate), ft = (S.t % p.rate) / p.rate;
            g.globalAlpha = clamp(Math.min(ft * 6, (1 - ft) * 6), 0, 1);
            LB.box(g, W / 2 - 150, H / 2 - 50, 300, 100, th.dark ? '#3A2440' : '#FFFFFF', 24);
            T(g, S.list[i] || '', W / 2, H / 2 + 12, { col: th.ink, size: 36, weight: 900, align: 'center' });
            g.globalAlpha = 1;
            T(g, 'Word ' + (i + 1) + ' of ' + p.N, W / 2, H / 2 + 80, { col: th.ink3, size: 13, weight: 800, align: 'center' });
          } else if (S.phase === 'delay') {
            const left = Math.ceil(p.delay - S.t);
            if (p.delay >= 30) {
              T(g, 'Count backwards in threes, out loud, from', W / 2, H * 0.38, { col: th.ink2, size: 15, weight: 800, align: 'center' });
              T(g, String(S.count), W / 2, H * 0.38 + 50, { col: pink, size: 44, weight: 900, align: 'center' });
            } else T(g, 'Wait…', W / 2, H * 0.45, { col: th.ink2, size: 26, weight: 900, align: 'center' });
            LB.dial(g, W / 2, H * 0.78, 30, S.t / p.delay, 's', left + ' s left', pink, th);
          } else {
            const cols = W > 640 ? 6 : 4, rows = Math.ceil(S.grid.length / cols), cw = (W - 40) / cols, ch = Math.min(40, (H - 60) / rows);
            T(g, S.phase === 'recall' ? 'Click every word you saw, then press “Finish recall”.' : 'Green: you got it. Red: you picked a word that was not on the list. Grey: missed.', W / 2, 24, { col: th.ink2, size: 13, weight: 800, align: 'center' });
            S.grid.forEach((w, i) => {
              const x = 20 + (i % cols) * cw + 4, y = 40 + Math.floor(i / cols) * ch, sel = S.sel[w], was = S.list.indexOf(w) >= 0;
              S.cells.push([w, x, y, cw - 8, ch - 6]);
              let col = th.dark ? '#3A3048' : '#FFFFFF', tc = th.ink;
              if (S.phase === 'recall' && sel) { col = pink; tc = '#FFFFFF'; }
              if (S.phase === 'score') { if (sel && was) { col = '#22C55E'; tc = '#FFFFFF'; } else if (sel) { col = '#EF4444'; tc = '#FFFFFF'; } else if (was) { col = th.dark ? '#4B5567' : '#CBD5E1'; } }
              LB.box(g, x, y, cw - 8, ch - 6, col, 12);
              T(g, w, x + (cw - 8) / 2, y + (ch - 6) / 2 + 5, { col: tc, size: 13, weight: 800, align: 'center' });
            });
            if (S.phase === 'score' && S.last) pill(g, 'You recalled ' + S.last.got + ' of ' + p.N + (S.last.fa ? ', ' + S.last.fa + ' false alarm' + (S.last.fa > 1 ? 's' : '') : ''), W / 2, H - 14, '#22C55E', th, 'center');
          }
        },
        graph: function (g, W, H, p, th) {
          const series = [], N = p.N;
          const model = []; for (let i = 1; i <= N; i++) model.push([i, spModel(i, N, p.rate, p.delay) * 100]);
          series.push({ pts: model, col: th.ink3, dash: [5, 5], width: 2 });
          if (S.cls) { const pts = S.cls.pts.map((v, i) => [i + 1, v]); series.push({ pts: pts, col: '#8B5CF6', width: 3 }); series.push({ pts: pts, col: '#8B5CF6', dots: true, r: 4 }); }
          if (S.you.length) { const pts = []; for (let i = 0; i < N; i++) pts.push([i + 1, S.you.reduce((s, r) => s + (r[i] || 0), 0) / S.you.length * 100]); series.push({ pts: pts, col: '#EC4899', width: 3 }); series.push({ pts: pts, col: '#EC4899', dots: true, r: 5 }); }
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 1, x1: N, y0: 0, y1: 100, xl: 'Serial position', yl: '% recalled', series: series });
          LB.legend(g, th, W - 330, 22, [['Expected', th.ink3]].concat(S.cls ? [['Class of 30', '#8B5CF6']] : []).concat(S.you.length ? [['You (' + S.you.length + ' trial' + (S.you.length > 1 ? 's' : '') + ')', '#EC4899']] : []));
        },
        readouts: function () {
          const N = p.N, avg = (a, b) => { let s = 0; for (let i = a; i <= b; i++) s += spModel(i, N, p.rate, p.delay); return Math.round(s / (b - a + 1) * 100) + ' %'; };
          const r = [['Stage', { idle: 'ready', show: 'learning', delay: 'delay', recall: 'recall', score: 'scored' }[S.phase]], ['Your trials', String(S.you.length)]];
          if (S.last) r.push(['Last score', S.last.got + ' / ' + N]);
          r.push(['Expected: first 3 words', avg(1, 3), 'th'], ['Expected: middle', avg(4, N - 3), 'th'], ['Expected: last 3 words', avg(N - 2, N), 'th']);
          return r;
        }
      };
      return inst;
    }
  });

  // =====================================================================
  // GEOGRAPHY 1. Storm hydrograph
  // =====================================================================
  function hydro(p) {
    const dt = 0.25, N = 48 / dt, start = 2, A = 60;
    const base = { dry: 0.15, normal: 0.3, wet: 0.6 }[p.soil], land = { forest: 0.55, grass: 1, arable: 1.2 }[p.land], u = p.urban / 100;
    const c = clamp(base * land * (1 - u) + 0.9 * u, 0.05, 0.95);
    let lag = (p.shape === 'circ' ? 6.5 : 11) + (p.land === 'forest' ? 3 : p.land === 'arable' ? -1 : 0);
    lag *= (1 - 0.55 * u) * (p.soil === 'wet' ? 0.85 : 1);
    const k = 3.5, theta = lag / (k - 1);
    const kern = []; let ks = 0;
    for (let i = 0; i < N; i++) { const t = (i + 0.5) * dt, v = Math.pow(t, k - 1) * Math.exp(-t / theta); kern.push(v); ks += v; }
    const slow = []; let ss = 0; const th2 = 26 / 2.5;
    for (let i = 0; i < N; i++) { const t = (i + 0.5) * dt, v = Math.pow(t, 2.5) * Math.exp(-t / th2); slow.push(v); ss += v; }
    const rain = [], Q = [];
    for (let i = 0; i < N; i++) { const t = i * dt; rain.push(t >= start && t < start + p.dur ? p.rain / p.dur : 0); Q.push(4); }
    for (let i = 0; i < N; i++) {
      if (!rain[i]) continue;
      const vol = rain[i] * dt * A * 1000;
      for (let j = i; j < N; j++) { Q[j] += vol * c * kern[j - i] / ks / (dt * 3600); Q[j] += vol * (1 - c) * 0.35 * slow[j - i] / ss / (dt * 3600); }
    }
    let pk = 0, pi = 0; Q.forEach((q, i) => { if (q > pk) { pk = q; pi = i; } });
    return { dt: dt, N: N, rain: rain, Q: Q, peak: pk, tPeak: pi * dt, tRain: start + p.dur / 2, c: c, lag: pi * dt - (start + p.dur / 2) };
  }
  LB.add({
    id: 'hydrograph', subject: 'geography', name: 'Storm hydrograph', topics: ['geo-u1-t2', 'geo-u6-t2'],
    blurb: 'Send a storm over a drainage basin. Change the rainfall, soil, land use, urbanisation and basin shape and watch the river respond.',
    icon: icon('<path d="M6 40h36"/><path d="M8 38c6-2 8-20 14-22s10 16 20 20"/><path d="M12 6v8M18 4v8M24 6v8"/>'),
    aspect: 0.5, maxH: 420, graph: true, graphH: 230, fast: 4,
    help: 'Green values are read from the modelled hydrograph for a 60 km² basin with a bankfull discharge of 40 m³/s.',
    controls: [
      { k: 'rain', label: 'Total rainfall', min: 5, max: 90, step: 1, v: 35, unit: 'mm', dp: 0 },
      { k: 'dur', label: 'Storm length', min: 1, max: 12, step: 0.5, v: 4, unit: 'hours', dp: 1 },
      { k: 'soil', type: 'seg', label: 'Antecedent soil moisture', options: [['dry', 'Dry'], ['normal', 'Normal'], ['wet', 'Saturated']], v: 'normal' },
      { k: 'land', type: 'seg', label: 'Land use', options: [['forest', 'Forest'], ['grass', 'Grassland'], ['arable', 'Ploughed fields']], v: 'grass' },
      { k: 'urban', label: 'Urbanised area', min: 0, max: 90, step: 5, v: 10, unit: '%', dp: 0 },
      { k: 'shape', type: 'seg', label: 'Basin shape', options: [['circ', 'Circular'], ['long', 'Elongated']], v: 'circ' }
    ],
    actions: [{ id: 'ghost', label: 'Keep this curve to compare' }],
    tasks: [
      'Run the storm with the default basin. Find the <b>lag time</b>: from peak rainfall to peak discharge.',
      'Press <b>Keep this curve</b>, then set urbanisation to 70%. The new hydrograph is “flashy”: shorter lag, higher peak, steeper rising limb.',
      'Make the soil saturated (after a wet week). Why does the same storm now cause a flood?',
      'Compare forest with ploughed fields. Explain the difference using interception and infiltration.',
      'An elongated basin has a lower, later peak than a circular one of the same area. Why?'
    ],
    theory: '<p>A <b>storm hydrograph</b> shows river discharge (m³/s) over time after a storm, with rainfall as bars. Key parts: <b>rising limb</b>, <b>peak discharge</b>, <b>lag time</b> (peak rainfall to peak discharge), <b>falling limb</b> and <b>baseflow</b>.</p><p>Water reaching the river quickly by <b>surface runoff</b> (overland flow) gives a flashy hydrograph. Water that <b>infiltrates</b> and moves by throughflow and groundwater flow arrives later and more slowly.</p><p>Flashy: urban surfaces, saturated or frozen soil, steep slopes, circular basins, intense rain, little vegetation. Subdued: forest (interception), permeable rock, dry soil, elongated basins.</p>',
    exam: [['Describe a hydrograph', ['Quote peak discharge and its time, with units.', 'Calculate lag time from peak rainfall, not from the start of the rain.', 'Compare the gradient of the rising limbs.'], 'ul'], ['Explain urban floods', ['Impermeable surfaces: little infiltration, more overland flow.', 'Drains and gutters carry water to the river quickly.', 'Result: shorter lag time and higher peak.'], 'ul'], ['Case study links', ['Use a named UK flood (for example Cumbria 2015 or Boscastle 2004).', 'Link physical and human causes.', 'Evaluate hard and soft management.']]],
    create: function (p) {
      const S = { t: 0, h: hydro(p), ghost: null, drops: [] };
      for (let i = 0; i < 80; i++) S.drops.push({ x: Math.random(), y: Math.random(), s: rnd(0.8, 1.2) });
      const qAt = (t) => { const i = clamp(Math.floor(t / S.h.dt), 0, S.h.N - 1); return S.h.Q[i]; };
      const inst = {
        reset: function () { S.t = 0; },
        change: function () { S.h = hydro(p); },
        action: function (id) { if (id === 'ghost') S.ghost = S.h.Q.slice(); },
        step: function (dt) { S.t = Math.min(48, S.t + dt * 2.5); S.drops.forEach((d) => { d.y += dt * 1.6 * d.s; if (d.y > 1) { d.y = 0; d.x = Math.random(); } }); },
        draw: function (g, W, H, p, th) {
          const raining = S.t >= 2 && S.t < 2 + p.dur, inten = p.rain / p.dur;
          LB.sky(g, W, H, th, raining ? '#9FB3C8' : '#BEE3FF', raining ? '#DCE6F0' : '#F3FAFF');
          // hills (cross-section)
          const gy = H * 0.55, rx = W / 2, rw = Math.min(160, W * 0.22);
          const soil = { dry: '#C9A27A', normal: '#9C7552', wet: '#5E4632' }[p.soil];
          g.fillStyle = th.dark ? LB.shade(soil, -0.3) : soil;
          g.beginPath(); g.moveTo(0, gy - 70); g.quadraticCurveTo(W * 0.25, gy - 40, rx - rw / 2, gy + 30); g.lineTo(rx + rw / 2, gy + 30); g.quadraticCurveTo(W * 0.75, gy - 40, W, gy - 70); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
          g.fillStyle = p.land === 'arable' ? '#C8A86A' : (th.dark ? '#2F6B3A' : '#6CC870');
          g.beginPath(); g.moveTo(0, gy - 70); g.quadraticCurveTo(W * 0.25, gy - 40, rx - rw / 2, gy + 30); g.lineTo(rx - rw / 2, gy + 38); g.quadraticCurveTo(W * 0.25, gy - 30, 0, gy - 60); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(W, gy - 70); g.quadraticCurveTo(W * 0.75, gy - 40, rx + rw / 2, gy + 30); g.lineTo(rx + rw / 2, gy + 38); g.quadraticCurveTo(W * 0.75, gy - 30, W, gy - 60); g.closePath(); g.fill();
          const qb = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
          const hillY = (x) => { const L = x < rx, P = L ? [0, W * 0.25, rx - rw / 2] : [W, W * 0.75, rx + rw / 2]; let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2, xm = qb(P[0], P[1], P[2], m); if (L ? xm < x : xm > x) lo = m; else hi = m; } return qb(gy - 70, gy - 40, gy + 30, lo); };
          // rock layers
          g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, gy - 20 + i * 40); g.lineTo(W, gy - 10 + i * 40); g.stroke(); }
          // river channel
          const q = qAt(S.t), fill = clamp(q / 40, 0.05, 1.25), cy = gy + 30, depth = 46;
          g.fillStyle = th.dark ? '#3B3127' : '#7A5A3F'; g.beginPath(); g.moveTo(rx - rw / 2, cy); g.quadraticCurveTo(rx, cy + depth * 2, rx + rw / 2, cy); g.fill();
          const wl = cy + depth - depth * Math.min(1, fill);
          g.save(); g.beginPath(); g.moveTo(rx - rw / 2 - (fill > 1 ? 60 : 0), cy); g.quadraticCurveTo(rx, cy + depth * 2, rx + rw / 2 + (fill > 1 ? 60 : 0), cy); g.lineTo(rx + rw, cy - 40); g.lineTo(rx - rw, cy - 40); g.closePath(); g.clip();
          const wg = g.createLinearGradient(0, wl, 0, cy + depth); wg.addColorStop(0, '#60A5FA'); wg.addColorStop(1, '#1D4ED8');
          g.fillStyle = wg; g.fillRect(rx - rw * 1.2, fill > 1 ? cy - 8 * (fill - 1) * 6 : wl, rw * 2.4, depth * 2 + 60); g.restore();
          if (fill > 1) pill(g, 'FLOOD: river over its banks', rx, cy - 54, '#EF4444', th, 'center');
          // trees, crops, houses
          const nT = p.land === 'forest' ? 14 : p.land === 'grass' ? 4 : 0, nB = Math.round(p.urban / 8);
          for (let i = 0; i < nT; i++) { const m = Math.ceil(nT / 2), span = W / 2 - rw / 2 - 40, x = i % 2 ? W - 16 - (i >> 1) * span / m : 16 + (i >> 1) * span / m; const y = hillY(x); g.fillStyle = '#6B4423'; g.fillRect(x - 2, y - 14, 4, 14); LB.ball(g, x, y - 20, 11, th.dark ? '#2E7D32' : '#2E9E44'); }
          if (p.land === 'arable') { g.strokeStyle = '#9A7B45'; g.lineWidth = 2; for (let x = 8; x < W; x += 14) { if (Math.abs(x - rx) < rw / 2 + 10) continue; const y = hillY(x); g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 6, y + 4); g.stroke(); } }
          for (let i = 0; i < nB; i++) { const left = i % 2 === 0, k = i >> 1, x = left ? rx - rw / 2 - 30 - k * 34 : rx + rw / 2 + 10 + k * 34; if (x < 0 || x > W - 24) continue; const y = hillY(x + 12); LB.box(g, x, y - 26, 24, 26, ['#F87171', '#FBBF24', '#60A5FA', '#A78BFA'][i % 4], 3); g.fillStyle = '#475569'; g.beginPath(); g.moveTo(x - 3, y - 26); g.lineTo(x + 12, y - 38); g.lineTo(x + 27, y - 26); g.fill(); g.fillStyle = '#E0F2FE'; g.fillRect(x + 7, y - 18, 8, 8); }
          if (p.urban > 0) { g.strokeStyle = '#4B5563'; g.lineWidth = 4; g.beginPath(); const x0 = Math.max(0, rx - rw / 2 - 30 - (nB >> 1) * 34); g.moveTo(x0, hillY(x0) + 2); for (let x = x0; x < rx - rw / 2; x += 8) g.lineTo(x, hillY(x) + 2); g.stroke(); }
          // clouds and rain
          const cl = raining ? 1 : S.t < 2 ? 0.5 : 0.25;
          for (let i = 0; i < 4; i++) { const cx = W * (0.1 + i * 0.24), cy = 30 + (i % 2) * 10; g.fillStyle = raining ? (th.dark ? '#4B5567' : '#7C8BA1') : (th.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)'); g.globalAlpha = raining ? 1 : cl + 0.3; [[0, 0, 1], [0.9, -0.3, 0.8], [1.7, 0, 0.9], [0.8, 0.25, 0.9]].forEach((c) => { g.beginPath(); g.arc(cx + c[0] * 24, cy + c[1] * 24, c[2] * 22, 0, 7); g.fill(); }); g.globalAlpha = 1; }
          if (raining) { g.strokeStyle = 'rgba(37,99,235,0.6)'; g.lineWidth = 1.5; const n = Math.round(clamp(inten * 6, 10, 80)); for (let i = 0; i < n; i++) { const d = S.drops[i], x = d.x * W, y = 50 + d.y * (H * 0.45); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 9); g.stroke(); } }
          // flow arrows
          if (S.t > 2 && S.t < 2 + p.dur + 6) {
            const c = S.h.c, a = clamp((2 + p.dur + 6 - S.t) / 6, 0, 1);
            g.globalAlpha = a;
            [0.15, 0.3, 0.7, 0.85].forEach((fx) => { const x = W * fx, dir = fx < 0.5 ? 1 : -1, y = hillY(x); if (c > 0.25) LB.arrow(g, x, y - 6, x + dir * (18 + 30 * c), hillY(x + dir * (18 + 30 * c)) - 6, '#2563EB', 3); LB.arrow(g, x, y + 10, x, y + 10 + 30 * (1 - c), '#0EA5E9', 2.5); });
            g.globalAlpha = 1;
          }
          pill(g, 'Hour ' + S.t.toFixed(1), 14, 22, '#64748B', th);
          pill(g, 'Discharge ' + f(q, 1) + ' m³/s', W - 14, 22, '#2563EB', th, 'right');
          T(g, '→ overland flow   ↓ infiltration', 14, H - 10, { col: th.dark ? '#E2E8F0' : '#FFFFFF', size: 12, weight: 800 });
        },
        graph: function (g, W, H, p, th) {
          const h = S.h, ymax = Math.max(50, h.peak * 1.15, S.ghost ? Math.max(...S.ghost) * 1.15 : 0) * 1.35;
          const pts = [], full = []; h.Q.forEach((q, i) => { const t = i * h.dt; full.push([t, q]); if (t <= S.t) pts.push([t, q]); });
          const series = [{ pts: full, col: th.ink3, dash: [3, 5], width: 1.5 }, { pts: pts, col: '#2563EB', width: 3 }];
          if (S.ghost) series.unshift({ pts: S.ghost.map((q, i) => [i * h.dt, q]), col: '#F97316', width: 2, dash: [8, 4] });
          const pl = LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: 48, y0: 0, y1: ymax, xl: 'Time / hours', yl: 'Discharge / m³ s⁻¹', series: series, hlines: [{ y: 40, col: '#EF4444', label: 'bankfull' }], vlines: [{ x: S.t, col: '#64748B' }] });
          // rainfall bars hang from the top
          const top = pl.sy(ymax), rmax = Math.max(20, p.rain / p.dur), bh = (pl.sy(0) - top) * 0.32;
          g.fillStyle = 'rgba(14,165,233,0.75)';
          for (let t = 0; t < 48; t += 1) { let r = 0; for (let k = 0; k < 4; k++) r += h.rain[Math.min(h.N - 1, t * 4 + k)] / 4; if (!r) continue; const x = pl.sx(t), w = pl.sx(t + 1) - x - 2, hh = bh * r / rmax; LB.rr(g, x + 1, top, w, hh, 3); g.fill(); }
          T(g, 'Rainfall ' + f(p.rain / p.dur, 1) + ' mm/h', pl.sx(2 + p.dur) + 6, top + 12, { col: '#0EA5E9', size: 11, weight: 800 });
          const xr = pl.sx(h.tRain), xp = pl.sx(h.tPeak), yl = pl.sy(h.peak) - 14;
          if (S.t >= h.tPeak) { g.strokeStyle = '#22C55E'; g.lineWidth = 2; g.beginPath(); g.moveTo(xr, yl); g.lineTo(xp, yl); g.stroke(); T(g, 'lag ' + f(h.lag, 1) + ' h', (xr + xp) / 2, yl - 6, { col: '#16A34A', size: 12, weight: 900, align: 'center' }); }
          if (S.ghost) LB.legend(g, th, W - 230, H - 40, [['This storm', '#2563EB'], ['Kept curve', '#F97316']]);
        },
        readouts: function () {
          const h = S.h;
          return [['Time', S.t.toFixed(1) + ' h'], ['Discharge now', f(qAt(S.t), 1) + ' m³/s'], ['Rainfall intensity', f(p.rain / p.dur, 1) + ' mm/h'], ['Runoff coefficient', Math.round(h.c * 100) + ' %', 'th'], ['Peak discharge', f(h.peak, 1) + ' m³/s', 'th'], ['Peak rainfall at', f(h.tRain, 1) + ' h', 'th'], ['Lag time', f(h.lag, 1) + ' h', 'th'], ['Flood risk', h.peak > 40 ? 'over bankfull' : h.peak > 32 ? 'close to bankfull' : 'low', 'th']];
        }
      };
      return inst;
    }
  });

  // =====================================================================
  // GEOGRAPHY 2. Spearman's rank correlation
  // =====================================================================
  const CRIT = { 0.05: { 5: 1, 6: 0.886, 7: 0.786, 8: 0.738, 9: 0.7, 10: 0.648, 11: 0.618, 12: 0.587, 13: 0.56, 14: 0.538, 15: 0.521, 16: 0.503, 17: 0.485, 18: 0.472, 19: 0.46, 20: 0.447 }, 0.01: { 6: 1, 7: 0.929, 8: 0.881, 9: 0.833, 10: 0.794, 11: 0.755, 12: 0.727, 13: 0.703, 14: 0.679, 15: 0.654, 16: 0.635, 17: 0.615, 18: 0.6, 19: 0.584, 20: 0.57 } };
  const DATA = {
    river: { n: 'River: distance downstream vs channel width', xl: 'Distance downstream / km', yl: 'Channel width / m', x: [0.5, 1.2, 2, 3.1, 4, 5.5, 6.2, 7.8, 9, 10.5], y: [1.1, 1.4, 1.3, 2.0, 2.4, 2.2, 3.1, 3.0, 3.8, 4.2], r: [0, 12, 0, 5] },
    cbd: { n: 'City: distance from the CBD vs land value', xl: 'Distance from CBD / km', yl: 'Land value / £ per m²', x: [0.2, 0.5, 0.9, 1.4, 2, 2.6, 3.3, 4, 5, 6], y: [3200, 2900, 2500, 2600, 1900, 1500, 1600, 1100, 900, 700], r: [0, 7, 0, 3600] },
    psy: { n: 'Psychology: hours revised vs test score', xl: 'Hours of revision', yl: 'Test score / %', x: [2, 5, 1, 8, 4, 6, 3, 9, 7, 10], y: [45, 60, 52, 72, 48, 66, 58, 70, 75, 80], r: [0, 12, 30, 100] },
    beach: { n: 'Coast: distance along beach vs pebble size', xl: 'Distance along beach / m', yl: 'Mean pebble size / mm', x: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550], y: [62, 55, 58, 47, 44, 49, 38, 35, 37, 30, 26, 28], r: [0, 600, 0, 80] }
  };
  function ranks(v) {
    const idx = v.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]), r = new Array(v.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
    return r;
  }
  LB.add({
    id: 'spearman', subject: 'geography', name: 'Spearman’s rank correlation', topics: ['geo-u7-t1', 'geo-u7-t2', 'psy-u7-t4'],
    blurb: 'Drag the points on a scatter graph and watch rs, the ranks and the significance test update. For fieldwork and the NEA.',
    icon: icon('<path d="M6 42V6M6 42h36"/><circle cx="14" cy="34" r="2.5" fill="currentColor"/><circle cx="22" cy="26" r="2.5" fill="currentColor"/><circle cx="30" cy="22" r="2.5" fill="currentColor"/><circle cx="38" cy="12" r="2.5" fill="currentColor"/>'),
    aspect: 0.56, maxH: 440, onCanvas: true, still: true,
    help: 'Drag any point. Critical values are two-tailed (Zar’s table); if your hypothesis predicts a direction, use a one-tailed table.',
    controls: [
      { k: 'ds', type: 'select', label: 'Data set', options: Object.keys(DATA).map((k) => [k, DATA[k].n]), v: 'river' },
      { k: 'sig', type: 'seg', label: 'Significance level', options: [[0.05, '0.05 (95%)'], [0.01, '0.01 (99%)']], v: 0.05 },
      { k: 'fit', type: 'toggle', label: 'Show line of best fit', v: true }
    ],
    actions: [{ id: 'add', label: 'Add a point' }, { id: 'rm', label: 'Remove a point' }, { id: 'rand', label: 'Random data' }, { id: 'reset', label: 'Original data' }],
    tasks: [
      'With the river data, work out rs by hand from the rank table, then check it against the readout.',
      'Drag one point far from the trend. How much does rs change? Spearman’s uses ranks, so it is less affected by extreme values than Pearson’s.',
      'Remove points until n = 6. The same rs is now less likely to be significant: the critical value rises.',
      'Make two points tie on x. How are tied ranks shared?',
      'Try the CBD data: a strong <b>negative</b> correlation. Is it significant at 0.01?',
      'Remember: a significant correlation does not prove one variable causes the other.'
    ],
    theory: '<p><b>Spearman’s rank correlation coefficient</b> measures how strongly two variables are related, using ranks rather than raw values.</p><p class="eq">r<sub>s</sub> = 1 − 6Σd² / (n³ − n)</p><p>Rank each variable separately (highest = 1, tied values share the mean of their ranks), find the difference d for each pair, square it and sum. r<sub>s</sub> runs from −1 (perfect negative) to +1 (perfect positive).</p><p>To test significance, compare |r<sub>s</sub>| with the <b>critical value</b> for your n and significance level. If it is equal or greater, reject the null hypothesis of no correlation.</p>',
    exam: [['Step by step', ['State the null hypothesis: there is no correlation between X and Y.', 'Rank both variables; share ranks for ties.', 'Calculate d, d² and Σd²; substitute into the formula.', 'Compare with the critical value; accept or reject the null hypothesis.'], 'ol'], ['Limitations', ['Needs at least 10 pairs to be reliable.', 'Only detects monotonic relationships.', 'Correlation is not causation: look for other factors.'], 'ul'], ['In psychology', ['Spearman’s is used for ordinal data in a correlational study.', 'Choose it when the data are not normally distributed.', 'Report the calculated value, critical value, n and p.']]],
    create: function (p) {
      const S = { pts: [], drag: -1, box: null };
      function load() { const d = DATA[p.ds]; S.pts = d.x.map((x, i) => [x, d.y[i]]); }
      function stats() {
        const n = S.pts.length, rx = ranks(S.pts.map((q) => q[0])), ry = ranks(S.pts.map((q) => q[1]));
        let sd = 0; const rows = S.pts.map((q, i) => { const d = rx[i] - ry[i]; sd += d * d; return [q[0], rx[i], q[1], ry[i], d, d * d]; });
        const rs = 1 - 6 * sd / (n * n * n - n), cv = (CRIT[p.sig] || {})[Math.min(20, n)];
        return { n: n, rows: rows, sd: sd, rs: rs, cv: cv };
      }
      const inst = {
        reset: load,
        change: function (k) { if (k === 'ds') load(); },
        action: function (id) {
          const r = DATA[p.ds].r;
          if (id === 'add' && S.pts.length < 20) S.pts.push([+rnd(r[0], r[1]).toPrecision(3), +rnd(r[2], r[3]).toPrecision(3)]);
          if (id === 'rm' && S.pts.length > 5) S.pts.pop();
          if (id === 'rand') { S.pts = []; for (let i = 0; i < 10; i++) S.pts.push([+rnd(r[0], r[1]).toPrecision(3), +rnd(r[2], r[3]).toPrecision(3)]); }
          if (id === 'reset') load();
        },
        pointer: function (kind, x, y) {
          const b = S.box; if (!b) return false;
          const r = DATA[p.ds].r;
          if (kind === 'down') { let best = -1, bd = 22 * 22; S.pts.forEach((q, i) => { const dx = b.sx(q[0]) - x, dy = b.sy(q[1]) - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }); S.drag = best; return best >= 0; }
          if (kind === 'move' && S.drag >= 0) { const X = r[0] + (x - b.X0) / (b.X1 - b.X0) * (r[1] - r[0]), Y = r[2] + (b.Y0 - y) / (b.Y0 - b.Y1) * (r[3] - r[2]); S.pts[S.drag] = [+clamp(X, r[0], r[1]).toPrecision(3), +clamp(Y, r[2], r[3]).toPrecision(3)]; }
          if (kind === 'up') S.drag = -1;
          return true;
        },
        step: function () {},
        draw: function (g, W, H, p, th) {
          panelBg(g, W, H, th, '#F7FEE7', '#ECFCCB');
          const d = DATA[p.ds], r = d.r;
          LB.rr(g, 10, 10, W - 20, H - 20, 18); g.fillStyle = th.dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)'; g.fill();
          const pl = LB.plot(g, th, { x: 14, y: 30, w: W - 28, h: H - 44, x0: r[0], x1: r[1], y0: r[2], y1: r[3], xl: d.xl, yl: d.yl, series: [] });
          S.box = { sx: pl.sx, sy: pl.sy, X0: pl.sx(r[0]), X1: pl.sx(r[1]), Y0: pl.sy(r[2]), Y1: pl.sy(r[3]) };
          if (p.fit && S.pts.length > 1) {
            const n = S.pts.length, mx = S.pts.reduce((s, q) => s + q[0], 0) / n, my = S.pts.reduce((s, q) => s + q[1], 0) / n;
            let sxy = 0, sxx = 0; S.pts.forEach((q) => { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) * (q[0] - mx); });
            if (sxx) { const m = sxy / sxx, c = my - m * mx; g.save(); g.beginPath(); g.rect(S.box.X0, S.box.Y1, S.box.X1 - S.box.X0, S.box.Y0 - S.box.Y1); g.clip(); g.strokeStyle = 'rgba(132,204,22,0.8)'; g.lineWidth = 3; g.setLineDash([8, 5]); g.beginPath(); g.moveTo(pl.sx(r[0]), pl.sy(m * r[0] + c)); g.lineTo(pl.sx(r[1]), pl.sy(m * r[1] + c)); g.stroke(); g.restore(); }
          }
          S.pts.forEach((q, i) => { LB.shadow(g, pl.sx(q[0]), pl.sy(q[1]) + 9, 8, 0.12); LB.ball(g, pl.sx(q[0]), pl.sy(q[1]), i === S.drag ? 11 : 8, i === S.drag ? '#F97316' : '#65A30D'); });
          const st = stats(), sig = st.cv != null && Math.abs(st.rs) >= st.cv;
          pill(g, 'rs = ' + st.rs.toFixed(3) + (st.cv != null ? (sig ? '  ·  significant' : '  ·  not significant') : ''), W - 24, 30, sig ? '#16A34A' : '#64748B', th, 'right');
        },
        readouts: function () {
          const st = stats(), sig = st.cv != null && Math.abs(st.rs) >= st.cv;
          const str = Math.abs(st.rs) >= 0.8 ? 'strong' : Math.abs(st.rs) >= 0.5 ? 'moderate' : Math.abs(st.rs) >= 0.2 ? 'weak' : 'no clear';
          return [['n (pairs)', String(st.n)], ['Σd²', f(st.sd, 1)], ['rs', st.rs.toFixed(3), 'th'], ['Strength', str + (Math.abs(st.rs) >= 0.2 ? (st.rs > 0 ? ' positive' : ' negative') : ''), 'th'], ['Critical value (' + p.sig + ', two-tailed)', st.cv != null ? st.cv.toFixed(3) : 'n too small', 'th'], ['Conclusion', st.cv == null ? 'add more data' : sig ? 'reject the null hypothesis' : 'accept the null hypothesis', 'th']];
        },
        extra: function () {
          const st = stats(), fx = (v) => Math.abs(v) >= 100 ? v.toFixed(0) : +v.toPrecision(3);
          return '<p class="label">Rank table</p><table class="tbl lab-tbl"><thead><tr><th>X</th><th>Rank</th><th>Y</th><th>Rank</th><th>d</th><th>d²</th></tr></thead><tbody>' + st.rows.map((r) => '<tr><td class="num">' + fx(r[0]) + '</td><td class="num">' + r[1] + '</td><td class="num">' + fx(r[2]) + '</td><td class="num">' + r[3] + '</td><td class="num">' + r[4] + '</td><td class="num">' + r[5] + '</td></tr>').join('') + '</tbody></table>';
        }
      };
      load();
      return inst;
    }
  });
})(window.RH = window.RH || {});
