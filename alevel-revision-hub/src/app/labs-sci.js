/* Chemistry and biology labs. Same frame as the physics labs (labs.js): each create(p) returns
   { reset, step(dt, p), draw(g, W, H, p, th), graph(g, W, H, p, th), readouts(p), change, action, extra }. */
(function (RH) {
  'use strict';
  const LB = RH.labs, f = LB.fmt, T = LB.text, esc = RH.util.esc;
  const icon = (d) => '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  // Mix two colours given as [r,g,b,a].
  const mix = (a, b, t) => 'rgba(' + [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)).join(',') + ',' + (a[3] + (b[3] - a[3]) * t).toFixed(3) + ')';
  // A lab bench: soft wall and a wooden worktop from y down.
  function bench(g, W, H, y, th) {
    const wall = g.createLinearGradient(0, 0, 0, y);
    wall.addColorStop(0, th.dark ? '#22263A' : '#F4F1FF'); wall.addColorStop(1, th.dark ? '#2A2F48' : '#E9F2FF');
    g.fillStyle = wall; g.fillRect(0, 0, W, y);
    const top = g.createLinearGradient(0, y, 0, H);
    top.addColorStop(0, th.dark ? '#5A4636' : '#E2B884'); top.addColorStop(1, th.dark ? '#3E3026' : '#C9965E');
    g.fillStyle = top; g.fillRect(0, y, W, H - y);
    g.fillStyle = th.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)'; g.fillRect(0, y, W, 4);
  }
  function pill(g, s, x, y, col, th, align) {
    g.font = '800 12px Nunito, system-ui, sans-serif';
    const w = g.measureText(s).width + 16, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    LB.rr(g, x0, y - 13, w, 22, 11); g.fillStyle = th.dark ? 'rgba(20,22,34,0.85)' : 'rgba(255,255,255,0.92)'; g.fill();
    g.strokeStyle = col; g.lineWidth = 2; g.stroke();
    T(g, s, x0 + 8, y + 3, { col: col, size: 12, weight: 800 });
  }

  // =====================================================================
  // CHEMISTRY 1. Titration and pH curves
  // =====================================================================
  const ACIDS = { hcl: ['Hydrochloric acid (strong)', 1e7, 'HCl'], eth: ['Ethanoic acid (weak, pKa 4.76)', 1.74e-5, 'CH₃COOH'] };
  const BASES = { naoh: ['Sodium hydroxide (strong)', 1e7, 'NaOH'], nh3: ['Ammonia (weak, pKb 4.75)', 1.78e-5, 'NH₃'] };
  const IND = {
    pp: { n: 'Phenolphthalein (8.2–10.0)', lo: 8.2, hi: 10, a: [255, 255, 255, 0], b: [224, 33, 138, 0.85], ca: 'colourless', cb: 'pink' },
    mo: { n: 'Methyl orange (3.1–4.4)', lo: 3.1, hi: 4.4, a: [232, 65, 44, 0.85], b: [245, 197, 24, 0.85], ca: 'red', cb: 'yellow' },
    bb: { n: 'Bromothymol blue (6.0–7.6)', lo: 6, hi: 7.6, a: [229, 211, 56, 0.85], b: [47, 111, 214, 0.85], ca: 'yellow', cb: 'blue' },
    none: { n: 'No indicator (pH meter only)', lo: 0, hi: 14, a: [255, 255, 255, 0], b: [255, 255, 255, 0], ca: 'colourless', cb: 'colourless' }
  };
  // pH from the charge balance [H+] + [BH+] = [OH-] + [A-], solved by bisection. Volumes in cm³.
  function pHof(Ca, Va, Ka, Cb, Vb, Kb) {
    const Vt = Va + Vb, na = Ca * Va / Vt, nb = Cb * Vb / Vt, Kw = 1e-14, KaB = Kw / Kb;
    let lo = -1, hi = 15;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2, h = Math.pow(10, -mid);
      const fx = h + nb * h / (h + KaB) - Kw / h - na * Ka / (Ka + h);
      if (fx > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  LB.add({
    id: 'titration', subject: 'chemistry', name: 'Titration and pH curves', topics: ['chm-u6-t1', 'chm-u6-t9', 'chm-u2-t5'],
    blurb: 'Run a burette into an acid, watch the indicator change and draw the pH curve for strong and weak acids and bases.',
    icon: icon('<path d="M22 4h4v22l-2 4-2-4z"/><path d="M18 30h12l6 14H12z"/><path d="M15 38h18"/>'),
    aspect: 0.6, maxH: 470, graph: true, graphH: 230, still: true,
    help: 'Green values are calculated from the equilibrium equations; the others are what you would read on the meter.',
    controls: [
      { k: 'acid', type: 'select', label: 'Acid in the flask (25.0 cm³)', options: Object.keys(ACIDS).map((k) => [k, ACIDS[k][0]]), v: 'hcl' },
      { k: 'Ca', label: 'Acid concentration', min: 0.05, max: 0.2, step: 0.01, v: 0.1, unit: 'mol dm⁻³', dp: 2 },
      { k: 'base', type: 'select', label: 'Alkali in the burette', options: Object.keys(BASES).map((k) => [k, BASES[k][0]]), v: 'naoh' },
      { k: 'Cb', label: 'Alkali concentration', min: 0.05, max: 0.2, step: 0.01, v: 0.1, unit: 'mol dm⁻³', dp: 2 },
      { k: 'ind', type: 'select', label: 'Indicator', options: Object.keys(IND).map((k) => [k, IND[k].n]), v: 'pp' },
      { k: 'rate', type: 'seg', label: 'Tap', options: [[1.2, 'Fast'], [0.3, 'Slow'], [0.06, 'Dropwise']], v: 0.3 }
    ],
    actions: [{ id: 'tap', label: 'Open / close tap', primary: true }, { id: 'drop', label: 'Add one drop' }, { id: 'rec', label: 'Record titre' }, { id: 'reset', label: 'Refill' }],
    tasks: [
      'Titrate 0.10 mol dm⁻³ HCl with 0.10 mol dm⁻³ NaOH using phenolphthalein. Open the tap on fast for a rough titre, then refill and go dropwise near the end point.',
      'Record three titres. Results within <b>0.10 cm³</b> of each other are concordant; average only those.',
      'Switch the acid to ethanoic acid. Read the pH at half the equivalence volume: it equals the pKa (4.76).',
      'Try a weak acid with a weak alkali. Why is there no sharp vertical section, and why does no indicator work?',
      'Strong acid with weak alkali (ammonia): which indicator changes on the vertical section, methyl orange or phenolphthalein?',
      'Double the acid concentration. What happens to the equivalence volume, and to the start pH?'
    ],
    theory: '<p>At the <b>equivalence point</b> the moles of alkali added equal the moles of acid: n = c × V, so V<sub>eq</sub> = c<sub>acid</sub> × 25.0 / c<sub>alkali</sub>.</p><p class="eq">strong acid: pH = −log[H⁺] &nbsp;&nbsp; weak acid: K<sub>a</sub> = [H⁺][A⁻] / [HA]</p><p>For a weak acid before equivalence the flask is a <b>buffer</b> of HA and A⁻. At half-neutralisation [HA] = [A⁻], so <b>pH = pK<sub>a</sub></b>. An indicator is suitable when its colour-change range lies entirely on the steep vertical part of the curve.</p><p>The simulation solves the full charge balance [H⁺] + [BH⁺] = [OH⁻] + [A⁻] with K<sub>w</sub> = 1.00 × 10⁻¹⁴ at 25 °C.</p>',
    exam: [['Method (RP1)', ['Rinse the burette with the alkali and the pipette with the acid.', 'Pipette 25.0 cm³ of acid into a conical flask on a white tile; add 2–3 drops of indicator.', 'Do a rough titration, then add dropwise near the end point, swirling.', 'Read the burette at eye level from the bottom of the meniscus to ±0.05 cm³.', 'Repeat until you have concordant titres (within 0.10 cm³).'], 'ol'], ['Calculations', ['n = c × V (V in dm³: divide cm³ by 1000).', 'Use the mole ratio from the balanced equation.', 'pH of strong base: [H⁺] = K<sub>w</sub> / [OH⁻].', 'Weak acid: [H⁺] = √(K<sub>a</sub> × [HA]).']], ['Common mistakes', ['Reading the top of the meniscus.', 'Averaging a rough titre with accurate ones.', 'Choosing phenolphthalein for a weak base, or methyl orange for a weak acid.', 'Forgetting the total volume changes when you mix.']]],
    create: function (p) {
      const S = { V: 0, open: false, drops: [], pts: [], titres: [], swirl: 0 };
      const Ka = () => ACIDS[p.acid][1], Kb = () => BASES[p.base][1];
      const pH = (V) => pHof(p.Ca, 25, Ka(), p.Cb, V, Kb());
      const Veq = () => p.Ca * 25 / p.Cb;
      function addVol(dv) {
        const before = S.V;
        S.V = Math.min(50, S.V + dv);
        if (S.V >= 50) S.open = false;
        const step = 0.05;
        for (let v = Math.ceil(before / step) * step; v <= S.V + 1e-9; v += step) S.pts.push([v, pH(v)]);
        if (!S.pts.length || S.pts[S.pts.length - 1][0] < S.V) S.pts.push([S.V, pH(S.V)]);
      }
      const inst = {
        reset: function () { S.V = 0; S.open = false; S.drops = []; S.pts = [[0, pH(0)]]; },
        change: function (k) { if (k !== 'rate' && k !== 'ind') inst.reset(); },
        action: function (id) {
          if (id === 'tap') S.open = !S.open;
          if (id === 'drop') { S.drops.push({ y: 0, v: 0.05 }); }
          if (id === 'rec' && S.V > 0) { S.titres.push(S.V); if (S.titres.length > 6) S.titres.shift(); }
          if (id === 'reset') inst.reset();
        },
        step: function (dt) {
          S.swirl += dt;
          if (S.open) {
            S.acc = (S.acc || 0) + dt * p.rate;
            while (S.acc >= 0.05) { S.acc -= 0.05; S.drops.push({ y: 0, v: 0.05 }); }
          }
          S.drops.forEach((d) => { d.y += dt * 260; });
          while (S.drops.length && S.drops[0].y > 1) { addVol(S.drops[0].v); S.drops.shift(); }
        },
        draw: function (g, W, H, p, th) {
          const by = H * 0.86;
          bench(g, W, H, by, th);
          const ph = pH(S.V), ind = IND[p.ind];
          // Stand
          const sx = W * 0.27;
          g.fillStyle = th.dark ? '#555C70' : '#7B8194'; LB.rr(g, sx - 50, by - 10, 120, 12, 4); g.fill();
          g.fillStyle = th.dark ? '#7C8398' : '#A3A9B8'; g.fillRect(sx - 4, 14, 8, by - 24);
          // Burette
          const bx = W * 0.42, top = 18, bot = H * 0.56, bw = 18;
          g.fillStyle = th.dark ? '#7C8398' : '#A3A9B8'; g.fillRect(sx, H * 0.28 - 4, bx - sx - bw / 2, 8);
          LB.box(g, bx - bw / 2 - 6, H * 0.28 - 9, bw + 12, 18, '#8B93A7', 4);
          const lvl = top + 12 + (bot - top - 20) * (S.V / 50);
          g.fillStyle = 'rgba(160,200,255,0.55)'; g.fillRect(bx - bw / 2 + 3, lvl, bw - 6, bot - lvl);
          g.strokeStyle = th.dark ? 'rgba(220,230,255,0.7)' : 'rgba(80,100,140,0.6)'; g.lineWidth = 2.5;
          LB.rr(g, bx - bw / 2, top, bw, bot - top, 6); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx - bw / 2 + 3, top + 4, 3, bot - top - 8);
          for (let i = 0; i <= 50; i += 5) {
            const y = top + 12 + (bot - top - 20) * i / 50;
            g.strokeStyle = th.ink3; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + bw / 2 - (i % 10 ? 4 : 8), y); g.lineTo(bx + bw / 2, y); g.stroke();
            if (i % 10 === 0) T(g, String(i), bx + bw / 2 + 4, y + 4, { col: th.ink3, size: 10, weight: 700 });
          }
          // Tap and jet
          g.fillStyle = th.dark ? '#AAB2C8' : '#3D4456'; g.fillRect(bx - 3, bot, 6, 22);
          g.save(); g.translate(bx, bot + 9); g.rotate(S.open ? Math.PI / 2 : 0);
          LB.rr(g, -16, -4, 32, 8, 4); g.fillStyle = S.open ? '#22C55E' : '#EF4444'; g.fill(); g.restore();
          const tipY = bot + 24;
          // Flask
          const fx = bx, fy = by - 4, fwBase = Math.min(150, W * 0.2), fh = Math.min(140, H * 0.3), neck = 22;
          const flask = () => { g.beginPath(); g.moveTo(fx - neck / 2, fy - fh); g.lineTo(fx - neck / 2, fy - fh * 0.62); g.lineTo(fx - fwBase / 2, fy - 8); g.quadraticCurveTo(fx - fwBase / 2, fy, fx - fwBase / 2 + 10, fy); g.lineTo(fx + fwBase / 2 - 10, fy); g.quadraticCurveTo(fx + fwBase / 2, fy, fx + fwBase / 2, fy - 8); g.lineTo(fx + neck / 2, fy - fh * 0.62); g.lineTo(fx + neck / 2, fy - fh); };
          // White tile
          g.fillStyle = '#FFFFFF'; LB.rr(g, fx - fwBase / 2 - 20, by - 6, fwBase + 40, 10, 3); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.stroke();
          // Liquid
          const vol = 25 + S.V, lh = fh * 0.3 + fh * 0.22 * (vol - 25) / 50, wob = Math.sin(S.swirl * 3) * 2;
          g.save(); flask(); g.closePath(); g.clip();
          const tcol = ind.hi > ind.lo ? clamp((ph - ind.lo) / (ind.hi - ind.lo), 0, 1) : 0;
          g.fillStyle = 'rgba(190,220,255,0.45)'; g.fillRect(fx - fwBase, fy - lh, fwBase * 2, lh + 2);
          g.fillStyle = mix(ind.a, ind.b, tcol); g.fillRect(fx - fwBase, fy - lh, fwBase * 2, lh + 2);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(fx, fy - lh, fwBase * 0.4, 3 + Math.abs(wob), 0, 0, 7); g.fill();
          g.restore();
          flask(); g.strokeStyle = th.dark ? 'rgba(220,230,255,0.75)' : 'rgba(70,90,130,0.7)'; g.lineWidth = 3; g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx - fwBase / 2 + 14, fy - 14); g.lineTo(fx - neck / 2 - 4, fy - fh * 0.56); g.stroke();
          // Drops
          S.drops.forEach((d) => { const y = tipY + d.y * (fy - lh - tipY); LB.ball(g, bx, y, 4, '#7FB3FF'); });
          if (S.open) { g.strokeStyle = 'rgba(127,179,255,0.5)'; g.lineWidth = 2; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(bx, tipY); g.lineTo(bx, fy - lh); g.stroke(); g.setLineDash([]); }
          // pH meter
          const mx = Math.min(W - 120, fx + fwBase / 2 + 60), my = by - 150;
          g.strokeStyle = th.dark ? '#9AA3B5' : '#3D4456'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx + 20, my + 92); g.bezierCurveTo(mx, by - 20, fx + 30, fy - fh - 40, fx + 6, fy - fh + 10); g.lineTo(fx + 6, fy - lh * 0.4); g.stroke();
          LB.box(g, mx - 20, my, 140, 92, th.dark ? '#3A4058' : '#E9ECF5', 14);
          LB.rr(g, mx - 8, my + 12, 116, 44, 8); g.fillStyle = '#C9F2D0'; g.fill(); g.strokeStyle = '#8CC79A'; g.lineWidth = 2; g.stroke();
          T(g, ph.toFixed(2), mx + 50, my + 45, { col: '#1E4D2B', size: 26, weight: 900, align: 'center' });
          T(g, 'pH', mx + 98, my + 26, { col: '#1E4D2B', size: 11, weight: 900, align: 'right' });
          T(g, 'pH METER', mx + 50, my + 78, { col: th.ink2, size: 11, weight: 900, align: 'center' });
          pill(g, f(S.V, 2) + ' cm³ added', bx + 30, top + 26, '#3B82F6', th);
          pill(g, ACIDS[p.acid][2] + ' + ' + BASES[p.base][2], 14, by + 28 > H - 6 ? H - 10 : by + 28, '#EF4444', th);
        },
        graph: function (g, W, H, p, th) {
          const ind = IND[p.ind], pl = LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: 50, y0: 0, y1: 14, xl: 'Volume of alkali added / cm³', yl: 'pH', series: [{ pts: S.pts, col: '#EF4444', width: 3 }], vlines: [{ x: Veq(), col: th.ok, label: 'Equivalence ' + f(Veq(), 2) + ' cm³' }] });
          if (p.ind !== 'none') { g.fillStyle = mix(ind.a, ind.b, 0.5).replace(/,[\d.]+\)$/, ',0.16)'); g.fillRect(pl.sx(0), pl.sy(ind.hi), pl.sx(50) - pl.sx(0), pl.sy(ind.lo) - pl.sy(ind.hi)); T(g, 'indicator range', pl.sx(50) - 6, pl.sy(ind.hi) - 4, { col: th.ink3, size: 10, align: 'right', weight: 700 }); }
          if (S.pts.length) { const q = S.pts[S.pts.length - 1]; LB.ball(g, pl.sx(q[0]), pl.sy(q[1]), 5, '#EF4444'); }
        },
        readouts: function () {
          const ph = pH(S.V), ind = IND[p.ind], t = ind.hi > ind.lo ? (ph - ind.lo) / (ind.hi - ind.lo) : 0;
          const r = [['Volume added', f(S.V, 2) + ' cm³'], ['pH', ph.toFixed(2)], ['Indicator colour', p.ind === 'none' ? '–' : t <= 0 ? ind.ca : t >= 1 ? ind.cb : 'changing'], ['Tap', S.open ? 'open' : 'closed'],
            ['Moles of acid', LB.sci(p.Ca * 0.025, 3) + ' mol', 'th'], ['Equivalence volume', f(Veq(), 2) + ' cm³', 'th'], ['pH at equivalence', pH(Veq()).toFixed(2), 'th']];
          if (p.acid === 'eth') r.push(['pH at half-equivalence (= pKa)', pH(Veq() / 2).toFixed(2), 'th']);
          return r;
        },
        extra: function () {
          if (!S.titres.length) return '<p class="help">Press <b>Record titre</b> when the indicator changes colour, then <b>Refill</b> and repeat.</p>';
          const t = S.titres, conc = [];
          for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (Math.abs(t[i] - t[j]) <= 0.1 + 1e-9) { if (conc.indexOf(i) < 0) conc.push(i); if (conc.indexOf(j) < 0) conc.push(j); }
          const mean = conc.length ? conc.reduce((s, i) => s + t[i], 0) / conc.length : null;
          return '<table class="tbl lab-tbl"><thead><tr><th>Run</th><th>Titre / cm³</th><th></th></tr></thead><tbody>' + t.map((v, i) => '<tr><td>' + (i + 1) + '</td><td class="num">' + v.toFixed(2) + '</td><td>' + (conc.indexOf(i) >= 0 ? '✓ concordant' : '') + '</td></tr>').join('') + '</tbody></table>' + (mean != null ? '<p class="small"><b>Mean titre ' + mean.toFixed(2) + ' cm³</b> → c(alkali) = ' + (p.Ca * 25 / mean).toFixed(3) + ' mol dm⁻³</p>' : '');
        }
      };
      inst.reset();
      return inst;
    }
  });

  // =====================================================================
  // CHEMISTRY 2. Rates and collision theory
  // =====================================================================
  // Fraction of particles with energy ≥ E in a Maxwell–Boltzmann energy distribution (3D): Q(3/2, E/kT).
  function fracAbove(E, kT) {
    const x = E / kT;
    return 2 * Math.sqrt(x / Math.PI) * Math.exp(-x) + (1 - erf(Math.sqrt(x)));
  }
  function erf(x) { const t = 1 / (1 + 0.3275911 * x), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return y; }
  const mbDensity = (E, kT) => 2000 * Math.sqrt(E / Math.PI) * Math.pow(1 / kT, 1.5) * Math.exp(-E / kT);
  LB.add({
    id: 'rates', subject: 'chemistry', name: 'Rates and collision theory', topics: ['chm-u1-t5', 'chm-u6-t3', 'chm-u2-t2'],
    blurb: 'Heat particles up, crowd them together or add a catalyst. Watch successful collisions and the Maxwell–Boltzmann curve.',
    icon: icon('<circle cx="16" cy="18" r="6"/><circle cx="32" cy="30" r="6"/><path d="M22 22l4 4"/><path d="M8 40c8-14 14-4 20-12s10-14 14-14"/>'),
    aspect: 0.56, maxH: 440, graph: true, graphH: 220,
    help: 'Green values use the Arrhenius equation with real energies; the particle box uses scaled energies so you can see collisions succeed.',
    controls: [
      { k: 'T', label: 'Temperature', min: 250, max: 450, step: 5, v: 300, unit: 'K', show: (v) => v + ' K (' + (v - 273) + ' °C)' },
      { k: 'n', label: 'Concentration (particles of each reactant)', min: 6, max: 50, step: 1, v: 24, dp: 0 },
      { k: 'Ea', label: 'Activation energy, Eₐ', min: 20, max: 100, step: 1, v: 55, unit: 'kJ mol⁻¹', dp: 0 },
      { k: 'cat', type: 'toggle', label: 'Add a catalyst', v: false, help: 'Provides an alternative route with a lower activation energy (here 40% lower).' }
    ],
    actions: [{ id: 'refill', label: 'Fresh reactants' }],
    tasks: [
      'Count the products formed in 20 seconds at 300 K. Raise the temperature to 340 K and repeat. Why does the rate rise so much more than the collision rate?',
      'Look at the graph: raising T flattens the curve and moves the peak right, but the area under it stays the same. Only the shaded tail above Eₐ grows.',
      'Turn on the catalyst. The curve does not change; the Eₐ line moves left, so more of the area is shaded.',
      'Double the concentration. Collisions per second roughly double, so the rate doubles: rate ∝ [A][B] for this reaction.',
      'Find the temperature rise that doubles the Arrhenius rate when Eₐ = 50 kJ mol⁻¹. (It is about 10 K near room temperature.)'
    ],
    theory: '<p>Particles react only when they <b>collide</b> with energy at least equal to the <b>activation energy</b> E<sub>a</sub> and the right orientation.</p><p>The <b>Maxwell–Boltzmann distribution</b> shows how many particles have each energy. It starts at the origin, has no maximum energy and the area under it equals the number of particles. At a higher temperature the peak is lower and further right, and many more particles are above E<sub>a</sub>.</p><p class="eq">k = A e<sup>−Eₐ / RT</sup> &nbsp;&nbsp; ln k = ln A − Eₐ / RT</p><p>A catalyst gives an alternative route with a lower E<sub>a</sub>; it is not used up. Higher concentration means more collisions per second, not more energetic ones.</p>',
    exam: [['Describe the curve', ['Starts at the origin: no particles have zero energy.', 'Never touches the energy axis: no maximum energy.', 'Area under the curve = total number of particles.', 'Higher T: peak lower and to the right, same area.'], 'ul'], ['Explain a rate change', ['Name the factor and what it does to collisions.', 'Say whether more particles have E ≥ Eₐ (temperature, catalyst) or there are just more collisions (concentration, pressure, surface area).', 'Finish with "more successful collisions per second".'], 'ul'], ['Arrhenius (A2)', ['Plot ln k against 1/T: gradient = −Eₐ / R.', 'Use R = 8.31 J K⁻¹ mol⁻¹ and convert Eₐ to J.', 'Rate = k[A]ᵐ[B]ⁿ: orders come from experiment.']]],
    create: function (p) {
      const S = { parts: [], made: 0, hits: 0, coll: 0, flashes: [], t: 0, hist: [] };
      const kTvis = () => 11 * p.T / 300;
      const EaEff = () => p.Ea * (p.cat ? 0.6 : 1);
      function fill() {
        S.parts = []; S.made = 0; S.hits = 0; S.coll = 0; S.t = 0; S.hist = [[0, 0]];
        for (let i = 0; i < p.n * 2; i++) S.parts.push({ x: Math.random(), y: Math.random(), a: Math.random() * 7, k: i % 2 ? 'B' : 'A', sp: 0.7 + Math.random() * 0.6 });
      }
      const inst = {
        reset: fill,
        change: function (k) { if (k === 'n') fill(); },
        action: function (id) { if (id === 'refill') fill(); },
        step: function (dt) {
          S.t += dt;
          const v = 0.22 * Math.sqrt(p.T / 300);
          const ps = S.parts, R = 0.022;
          ps.forEach((q) => {
            const s = v * q.sp * (q.k === 'P' ? 0.7 : 1);
            q.x += Math.cos(q.a) * s * dt; q.y += Math.sin(q.a) * s * dt * 1.6;
            if (q.x < 0.02) { q.x = 0.02; q.a = Math.PI - q.a; } if (q.x > 0.98) { q.x = 0.98; q.a = Math.PI - q.a; }
            if (q.y < 0.03) { q.y = 0.03; q.a = -q.a; } if (q.y > 0.97) { q.y = 0.97; q.a = -q.a; }
          });
          const pFrac = fracAbove(EaEff(), kTvis()) * 6;
          for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i], b = ps[j];
            if (a.dead || b.dead) continue;
            const dx = a.x - b.x, dy = (a.y - b.y) / 1.6;
            if (dx * dx + dy * dy < R * R * 4 && !(a.cool > 0) && !(b.cool > 0)) {
              S.coll++;
              if (a.k !== b.k && a.k !== 'P' && b.k !== 'P') {
                S.hits++;
                if (Math.random() < pFrac) {
                  a.k = 'P'; b.dead = true; S.made++; a.cool = 0.4;
                  S.flashes.push({ x: a.x, y: a.y, t: 0.5 });
                  continue;
                }
              }
              const t = a.a; a.a = b.a; b.a = t; a.cool = b.cool = 0.15;
            }
          }
          ps.forEach((q) => { if (q.cool > 0) q.cool -= dt; });
          S.parts = ps.filter((q) => !q.dead);
          S.flashes.forEach((fl) => { fl.t -= dt; }); S.flashes = S.flashes.filter((fl) => fl.t > 0);
          if (!S.hist.length || S.t - S.hist[S.hist.length - 1][0] > 0.25) S.hist.push([S.t, S.made]);
        },
        draw: function (g, W, H, p, th) {
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, th.dark ? '#1E2236' : '#FFF4F2'); bg.addColorStop(1, th.dark ? '#262B44' : '#FFE9E5');
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          const heat = (p.T - 250) / 200;
          // Hot plate glow
          LB.glow(g, W / 2, H + 10, W * 0.5, 'rgba(255,' + Math.round(140 - heat * 90) + ',60,' + (0.15 + heat * 0.5) + ')');
          const bx = 14, by = 14, bw = W - 28, bh = H - 42;
          LB.rr(g, bx, by, bw, bh, 20); g.fillStyle = th.dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'; g.fill(); g.strokeStyle = th.dark ? '#5C6380' : '#F3B6AC'; g.lineWidth = 3; g.stroke();
          const X = (x) => bx + 10 + x * (bw - 20), Y = (y) => by + 10 + y * (bh - 20), r = Math.max(6, Math.min(11, W / 70));
          S.flashes.forEach((fl) => LB.glow(g, X(fl.x), Y(fl.y), 40 * (1.2 - fl.t), 'rgba(255,214,0,0.9)', fl.t * 2));
          S.parts.forEach((q) => {
            if (q.k === 'P') { LB.ball(g, X(q.x) - r * 0.45, Y(q.y), r * 0.9, '#8B5CF6'); LB.ball(g, X(q.x) + r * 0.45, Y(q.y), r * 0.9, '#A855F7'); }
            else LB.ball(g, X(q.x), Y(q.y), r, q.k === 'A' ? '#EF4444' : '#3B82F6');
          });
          if (p.cat) { for (let i = 0; i < 5; i++) { const x = bx + 30 + i * (bw - 60) / 4; LB.box(g, x - 16, by + bh - 22, 32, 14, '#9CA3AF', 4); } }
          const lx = 22, ly = H - 12;
          LB.ball(g, lx + 6, ly - 4, 6, '#EF4444'); T(g, 'A', lx + 16, ly, { col: th.ink2, size: 12, weight: 800 });
          LB.ball(g, lx + 42, ly - 4, 6, '#3B82F6'); T(g, 'B', lx + 52, ly, { col: th.ink2, size: 12, weight: 800 });
          LB.ball(g, lx + 78, ly - 4, 6, '#8B5CF6'); T(g, 'Product AB', lx + 88, ly, { col: th.ink2, size: 12, weight: 800 });
          if (p.cat) T(g, 'grey blocks: catalyst surface', lx + 180, ly, { col: th.ink3, size: 12, weight: 700 });
          pill(g, S.made + ' products', W - 24, 38, '#8B5CF6', th, 'right');
        },
        graph: function (g, W, H, p, th) {
          const kT = kTvis(), Emax = 110, pts = [], pts300 = [];
          let ymax = 0;
          for (let E = 0; E <= Emax; E += 0.5) { const y = mbDensity(E, kT); pts.push([E, y]); pts300.push([E, mbDensity(E, 11 * 250 / 300)]); ymax = Math.max(ymax, y, mbDensity(E, 11 * 250 / 300)); }
          const pl = LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: Emax, y0: 0, y1: ymax * 1.1, xl: 'Energy (scaled)', yl: 'Number of particles', series: [] });
          const shade = (Ea, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pl.sx(Ea), pl.sy(0)); pts.filter((q) => q[0] >= Ea).forEach((q) => g.lineTo(pl.sx(q[0]), pl.sy(q[1]))); g.lineTo(pl.sx(Emax), pl.sy(0)); g.closePath(); g.fill(); };
          if (p.cat) shade(EaEff(), 'rgba(34,197,94,0.25)');
          shade(p.Ea, 'rgba(239,68,68,0.3)');
          g.save(); g.setLineDash([5, 5]); g.strokeStyle = th.ink3; g.lineWidth = 1.5; g.beginPath(); pts300.forEach((q, i) => { const x = pl.sx(q[0]), y = pl.sy(q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); g.restore();
          g.strokeStyle = '#EF4444'; g.lineWidth = 3; g.beginPath(); pts.forEach((q, i) => { const x = pl.sx(q[0]), y = pl.sy(q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
          [[p.Ea, 'Eₐ', '#EF4444']].concat(p.cat ? [[EaEff(), 'Eₐ (catalyst)', '#16A34A']] : []).forEach((e) => { g.strokeStyle = e[2]; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(pl.sx(e[0]), pl.sy(0)); g.lineTo(pl.sx(e[0]), pl.sy(ymax * 1.05)); g.stroke(); g.setLineDash([]); T(g, e[1], pl.sx(e[0]) + 4, pl.sy(ymax * 0.95) + (e[2] === '#16A34A' ? 16 : 0), { col: e[2], size: 12, weight: 900 }); });
          LB.legend(g, th, W - 230, 22, [[p.T + ' K', '#EF4444'], ['250 K', th.ink3]]);
        },
        readouts: function () {
          const R = 8.314, k = (T) => Math.exp(-EaEff() * 1000 / (R * T)), base = Math.exp(-p.Ea * 1000 / (R * 298));
          return [['Time', f(S.t, 1) + ' s'], ['Collisions', String(S.coll)], ['A–B collisions', String(S.hits)], ['Products formed', String(S.made)],
            ['Particles with E ≥ Eₐ (scaled)', (fracAbove(EaEff(), kTvis()) * 100).toFixed(1) + ' %', 'th'],
            ['Rate constant vs 298 K, no catalyst', (k(p.T) / base < 1e4 ? f(k(p.T) / base, 2) : LB.sci(k(p.T) / base, 3)) + ' ×', 'th'],
            ['Rate change for +10 K', f(Math.exp(EaEff() * 1000 / R * (1 / p.T - 1 / (p.T + 10))), 2) + ' ×', 'th']];
        }
      };
      fill();
      return inst;
    }
  });

  // =====================================================================
  // BIOLOGY 1. Enzyme activity
  // =====================================================================
  const ENZ = {
    amylase: { n: 'Amylase (optimum pH 7, 37 °C)', pH: 7, T: 37, col: '#22C55E', sub: 'starch' },
    pepsin: { n: 'Pepsin (optimum pH 2, 37 °C)', pH: 2, T: 37, col: '#0EA5E9', sub: 'protein' },
    trypsin: { n: 'Trypsin (optimum pH 8, 37 °C)', pH: 8, T: 37, col: '#8B5CF6', sub: 'protein' },
    taq: { n: 'Taq polymerase (thermophile, 72 °C)', pH: 8.5, T: 72, col: '#F97316', sub: 'nucleotides' }
  };
  function enzRate(p, o) {
    o = Object.assign({}, p, o || {});
    const e = ENZ[o.enz], Tm = e.T + 9;
    const act = (T) => Math.pow(2, (T - e.T) / 10) / (1 + Math.exp((T - Tm) / 2.6));
    let peak = 0; for (let T = 0; T <= 100; T += 0.5) peak = Math.max(peak, act(T));
    const tf = act(o.T) / peak, pf = Math.exp(-Math.pow((o.pH - e.pH) / 1.7, 2));
    const Km = 2 * (o.inh === 'comp' ? 3 : 1), Vmax = 100 * (o.inh === 'non' ? 0.4 : 1);
    return { rate: Vmax * tf * pf * o.S / (Km + o.S), tf: tf, pf: pf, den: clamp(1 / (1 + Math.exp(-(o.T - Tm) / 2.6)) + (1 - pf) * 0.8, 0, 1), Km: Km, Vmax: Vmax * tf * pf };
  }
  LB.add({
    id: 'enzymes', subject: 'biology', name: 'Enzyme activity', topics: ['bio-u1-t4', 'bio-u9-t1'],
    blurb: 'Change temperature, pH and substrate concentration. Watch substrates fit the active site, and enzymes denature.',
    icon: icon('<path d="M24 8a16 16 0 1 0 14 8l-14 8z"/><path d="M36 10l6-2-2 6z"/>'),
    aspect: 0.52, maxH: 420, graph: true, graphH: 220,
    help: 'Green values come from the model behind the graph: Michaelis–Menten kinetics with a temperature and pH factor.',
    controls: [
      { k: 'enz', type: 'select', label: 'Enzyme', options: Object.keys(ENZ).map((k) => [k, ENZ[k].n]), v: 'amylase' },
      { k: 'T', label: 'Temperature', min: 0, max: 90, step: 1, v: 37, unit: '°C', dp: 0 },
      { k: 'pH', label: 'pH', min: 1, max: 13, step: 0.5, v: 7, dp: 1 },
      { k: 'S', label: 'Substrate concentration', min: 0.5, max: 20, step: 0.5, v: 6, unit: 'mmol dm⁻³', dp: 1 },
      { k: 'inh', type: 'seg', label: 'Inhibitor', options: [['none', 'None'], ['comp', 'Competitive'], ['non', 'Non-competitive']], v: 'none' },
      { k: 'gx', type: 'seg', label: 'Graph against', options: [['T', 'Temperature'], ['pH', 'pH'], ['S', 'Substrate']], v: 'T' }
    ],
    tasks: [
      'Plot the temperature curve: raise the temperature from 10 °C in steps and watch the dot. Rate roughly doubles every 10 °C, then falls steeply above the optimum.',
      'Heat amylase to 60 °C, then cool it back to 37 °C. In real life denaturation is permanent; here the slider shows each temperature fresh, like a new test tube each time.',
      'Switch to pepsin, which works in the stomach. Find its optimum pH. Why would amylase stop working there?',
      'Graph against substrate. At high concentration the curve levels off: every active site is busy, so enzyme concentration is now the limiting factor.',
      'Add a competitive inhibitor and graph against substrate. Adding lots more substrate gets you back to nearly the same maximum rate. Try a non-competitive inhibitor: it does not.',
      'Try Taq polymerase from hot-spring bacteria. Why is it used in PCR?'
    ],
    theory: '<p>An enzyme’s <b>active site</b> has a shape complementary to its substrate. When they collide with enough energy they form an <b>enzyme–substrate complex</b>; the induced fit lowers the activation energy.</p><p><b>Temperature:</b> more kinetic energy means more successful collisions, until bonds holding the tertiary structure (hydrogen and ionic bonds) break. The active site changes shape and the enzyme is <b>denatured</b>.</p><p><b>pH:</b> H⁺ and OH⁻ ions disrupt the ionic and hydrogen bonds, changing the active site.</p><p><b>Substrate concentration:</b> rate rises until all active sites are occupied (V<sub>max</sub>).</p><p><b>Competitive</b> inhibitors fit the active site and compete with the substrate; <b>non-competitive</b> inhibitors bind elsewhere (an allosteric site) and change the active site’s shape.</p>',
    exam: [['Describe a graph', ['Quote figures: "rate rises from 12 to 40 units between 20 and 40 °C".', 'Name the optimum and the point where rate falls to zero.', 'Do not say the enzyme is "killed": enzymes are not alive.'], 'ul'], ['Explain', ['Link to kinetic energy and enzyme–substrate complexes formed per second.', 'Above the optimum: bonds in the tertiary structure break, the active site changes shape, substrate no longer complementary.', 'Inhibitors: state where they bind and whether more substrate overcomes them.'], 'ul'], ['RP1 method', ['Use a water bath and thermometer; equilibrate both solutions first.', 'Keep enzyme and substrate concentration, volume and pH (buffer) constant.', 'Measure initial rate: tangent at t = 0 on a product–time graph.'], 'ol']],
    create: function (p) {
      const S = { enz: [], subs: [], prods: [], t: 0, made: 0 };
      function setup() {
        S.enz = []; S.subs = []; S.prods = []; S.made = 0;
        for (let i = 0; i < 7; i++) S.enz.push({ x: 0.12 + (i % 4) * 0.25 + (i > 3 ? 0.12 : 0), y: i > 3 ? 0.68 : 0.3, a: Math.random() * 7, w: rnd(-0.6, 0.6), busy: 0, wob: Math.random() * 7 });
      }
      function nSubs() { return Math.round(4 + p.S * 2.2); }
      const inst = {
        reset: setup,
        step: function (dt) {
          S.t += dt;
          const r = enzRate(p), den = r.den;
          while (S.subs.length < nSubs()) S.subs.push({ x: Math.random(), y: Math.random(), a: Math.random() * 7, inh: false });
          if (S.subs.length > nSubs()) S.subs.length = nSubs();
          const nInh = p.inh === 'none' ? 0 : 5;
          let have = S.subs.filter((s) => s.inh).length;
          S.subs.forEach((s) => { if (have < nInh && !s.inh) { s.inh = true; have++; } if (!nInh) s.inh = false; });
          const sp = 0.08 + 0.12 * Math.min(1, p.T / 40);
          S.subs.forEach((s) => {
            s.a += rnd(-2, 2) * dt;
            s.x += Math.cos(s.a) * sp * dt; s.y += Math.sin(s.a) * sp * dt * 1.8;
            if (s.x < 0.03 || s.x > 0.97) { s.a = Math.PI - s.a; s.x = clamp(s.x, 0.03, 0.97); }
            if (s.y < 0.05 || s.y > 0.95) { s.a = -s.a; s.y = clamp(s.y, 0.05, 0.95); }
          });
          S.enz.forEach((e, i) => {
            e.a += e.w * dt * 0.6; e.wob += dt * (1 + p.T / 30);
            e.dead = i < Math.round(den * S.enz.length);
            if (e.busy > 0) {
              e.busy -= dt;
              if (e.busy <= 0) {
                if (e.with === 'sub') { S.made++; for (let k = 0; k < 2; k++) S.prods.push({ x: e.x, y: e.y, a: e.a + (k ? 0.6 : -0.6), life: 3 }); }
                e.with = null;
              }
              return;
            }
            if (e.dead) return;
            // catch a nearby substrate; the chance reflects the model rate per active enzyme
            for (let j = 0; j < S.subs.length; j++) {
              const s = S.subs[j], dx = s.x - e.x, dy = (s.y - e.y) / 1.8;
              if (dx * dx + dy * dy < 0.012) {
                if (s.inh && p.inh === 'comp') { e.busy = 1.6; e.with = 'inh'; S.subs.splice(j, 1); break; }
                if (s.inh || e.allo) continue;
                if (Math.random() < 8 * r.tf * r.pf * dt) { e.busy = 0.9; e.with = 'sub'; S.subs.splice(j, 1); break; }
              }
            }
            if (p.inh === 'non' && !e.allo) e.allo = Math.random() < 0.6;
            if (p.inh !== 'non') e.allo = false;
          });
          S.prods.forEach((q) => { q.x += Math.cos(q.a) * 0.15 * dt; q.y += Math.sin(q.a) * 0.25 * dt; q.life -= dt; });
          S.prods = S.prods.filter((q) => q.life > 0);
        },
        draw: function (g, W, H, p, th) {
          const e = ENZ[p.enz];
          const bg = g.createLinearGradient(0, 0, 0, H);
          const warm = clamp(p.T / 90, 0, 1);
          bg.addColorStop(0, th.dark ? '#1C2A2A' : mix([230, 250, 240, 1], [255, 236, 226, 1], warm)); bg.addColorStop(1, th.dark ? '#22303A' : mix([214, 242, 228, 1], [255, 220, 205, 1], warm));
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          const X = (x) => 16 + x * (W - 32), Y = (y) => 16 + y * (H - 54), R = Math.max(18, Math.min(30, W / 26));
          S.prods.forEach((q) => { g.globalAlpha = clamp(q.life, 0, 1); LB.box(g, X(q.x) - 6, Y(q.y) - 6, 12, 12, '#F59E0B', 3); g.globalAlpha = 1; });
          S.subs.forEach((s) => {
            if (s.inh) { g.fillStyle = '#6B7280'; g.beginPath(); const x = X(s.x), y = Y(s.y); g.moveTo(x - 8, y + 7); g.lineTo(x + 8, y + 7); g.lineTo(x, y - 8); g.closePath(); g.fill(); return; }
            LB.box(g, X(s.x) - 8, Y(s.y) - 8, 16, 16, '#3B82F6', 4);
          });
          S.enz.forEach((en) => {
            const x = X(en.x), y = Y(en.y);
            LB.shadow(g, x, y + R + 4, R * 0.8, 0.12);
            g.save(); g.translate(x, y); g.rotate(en.a);
            if (en.dead) {
              g.fillStyle = '#9CA3AF'; g.beginPath();
              for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2, rr = R * (0.85 + 0.18 * Math.sin(a * 5 + en.wob)); if (k) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
              g.closePath(); g.fill();
            } else {
              const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
              gr.addColorStop(0, LB.shade(e.col, 0.5)); gr.addColorStop(1, LB.shade(e.col, -0.2));
              g.fillStyle = gr; g.beginPath();
              const notch = en.allo ? 0.12 : 0.32;
              g.moveTo(0, 0); g.arc(0, 0, R, notch, Math.PI * 2 - notch); g.closePath(); g.fill();
              g.fillStyle = gr; g.beginPath(); g.arc(-R * 0.15, 0, R * 0.55, 0, 7); g.fill();
              if (en.with === 'sub') LB.box(g, R * 0.25, -8, 16, 16, '#3B82F6', 4);
              if (en.with === 'inh') { g.fillStyle = '#6B7280'; g.beginPath(); g.moveTo(R * 0.25, 7); g.lineTo(R * 0.25 + 16, 7); g.lineTo(R * 0.25 + 8, -8); g.closePath(); g.fill(); }
              if (en.allo) { g.fillStyle = '#6B7280'; g.beginPath(); g.arc(-R * 0.95, 0, 6, 0, 7); g.fill(); }
              g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-R * 0.35, -R * 0.4, R * 0.12, 0, 7); g.fill();
            }
            g.restore();
          });
          // Thermometer and pH strip
          const tx = W - 34, ty = 20, thh = H - 80;
          LB.rr(g, tx - 7, ty, 14, thh, 7); g.fillStyle = th.dark ? '#2E3346' : '#FFFFFF'; g.fill(); g.strokeStyle = th.ink3; g.lineWidth = 2; g.stroke();
          const lvl = ty + thh - 6 - (thh - 12) * p.T / 90;
          g.fillStyle = '#EF4444'; LB.rr(g, tx - 3, lvl, 6, ty + thh - lvl, 3); g.fill(); LB.ball(g, tx, ty + thh + 6, 10, '#EF4444');
          T(g, p.T + ' °C', tx - 14, lvl + 4, { col: th.ink, size: 12, weight: 900, align: 'right' });
          const ph = p.pH, hue = clamp((ph - 1) / 12, 0, 1) * 270;
          LB.rr(g, 16, H - 32, 120, 20, 10); g.fillStyle = 'hsl(' + (hue < 120 ? hue * 0.5 : hue) + ',75%,55%)'; g.fill();
          T(g, 'pH ' + ph, 76, H - 18, { col: '#fff', size: 12, weight: 900, align: 'center' });
          const r = enzRate(p);
          pill(g, S.made + ' products · rate ' + f(r.rate, 1), W - 60, H - 20, ENZ[p.enz].col, th, 'right');
        },
        graph: function (g, W, H, p, th) {
          const e = ENZ[p.enz];
          const ax = p.gx, rng = ax === 'T' ? [0, 90, 'Temperature / °C'] : ax === 'pH' ? [1, 13, 'pH'] : [0, 20, 'Substrate concentration / mmol dm⁻³'];
          const series = [], mk = (o, col, dash) => { const pts = []; for (let v = rng[0]; v <= rng[1] + 1e-9; v += (rng[1] - rng[0]) / 160) { const q = {}; q[ax] = v; pts.push([v, enzRate(p, Object.assign(q, o)).rate]); } series.push({ pts: pts, col: col, width: 3, dash: dash }); };
          if (p.inh !== 'none') mk({ inh: 'none' }, th.ink3, [5, 5]);
          mk({}, e.col);
          const pl = LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: rng[0], x1: rng[1], y0: 0, y1: 110, xl: rng[2], yl: 'Rate of reaction (relative)', series: series });
          const cur = enzRate(p);
          LB.ball(g, pl.sx(p[ax]), pl.sy(cur.rate), 7, e.col);
          if (p.inh !== 'none') LB.legend(g, th, W - 260, 22, [['with inhibitor', e.col], ['no inhibitor', th.ink3]]);
        },
        readouts: function () {
          const r = enzRate(p);
          return [['Products made', String(S.made)], ['Rate (relative)', f(r.rate, 1), 'th'], ['Temperature factor', f(r.tf, 2), 'th'], ['pH factor', f(r.pf, 2), 'th'], ['Enzymes denatured', Math.round(r.den * 100) + ' %', 'th'], ['Km', f(r.Km, 1) + ' mmol dm⁻³', 'th'], ['Vmax here', f(r.Vmax, 1), 'th']];
        }
      };
      setup();
      return inst;
    }
  });

  // =====================================================================
  // BIOLOGY 2. Osmosis and water potential (RP3)
  // =====================================================================
  const TISSUE = { potato: ['Potato', -0.85], sweet: ['Sweet potato', -1.25], carrot: ['Carrot', -0.65], mystery: ['Mystery tissue', null] };
  LB.add({
    id: 'osmosis', subject: 'biology', name: 'Osmosis and water potential', topics: ['bio-u9-t3', 'bio-u2-t4', 'bio-u3-t4'],
    blurb: 'Soak plant tissue in sucrose solutions, record the change in mass and find the water potential of the cells.',
    icon: icon('<path d="M14 6h20v6l-4 6v20a6 6 0 0 1-12 0V18l-4-6z"/><rect x="20" y="24" width="8" height="12" rx="2"/>'),
    aspect: 0.52, maxH: 420, graph: true, graphH: 220, still: true,
    help: 'Green values are calculated: Ψ of a sucrose solution ≈ −2.48 × concentration (MPa) at 25 °C.',
    controls: [
      { k: 'tis', type: 'select', label: 'Tissue', options: Object.keys(TISSUE).map((k) => [k, TISSUE[k][0]]), v: 'potato' },
      { k: 'c', label: 'Sucrose concentration', min: 0, max: 1, step: 0.05, v: 0.2, unit: 'mol dm⁻³', dp: 2 }
    ],
    actions: [{ id: 'go', label: 'Soak for 30 minutes', primary: true }, { id: 'rec', label: 'Record result' }, { id: 'clear', label: 'Clear results' }],
    tasks: [
      'Soak potato in 0.0, 0.2, 0.4, 0.6, 0.8 and 1.0 mol dm⁻³ sucrose, recording each result. Where does the best-fit line cross zero?',
      'At that concentration there is no net movement of water: the solution and the cells have the same water potential.',
      'Read Ψ of the tissue off the graph and compare it with the green value.',
      'Try the mystery tissue. Use at least 6 concentrations and repeats to get a reliable answer.',
      'Why do we record <b>percentage</b> change in mass rather than change in mass?'
    ],
    theory: '<p><b>Water potential</b> (Ψ, in kPa or MPa) is the tendency of water to move out of a solution. Pure water has Ψ = 0; adding solute makes Ψ <b>more negative</b>.</p><p><b>Osmosis</b> is the net movement of water across a partially permeable membrane from a higher (less negative) to a lower (more negative) water potential.</p><p>If the solution has a higher Ψ than the cells, water moves <b>in</b>: the tissue gains mass and becomes turgid. If lower, water moves <b>out</b>: the tissue loses mass and the cells may <b>plasmolyse</b>. Where the line crosses 0% change, Ψ<sub>cells</sub> = Ψ<sub>solution</sub>.</p>',
    exam: [['Method (RP3)', ['Cut equal cylinders with a cork borer; blot dry and weigh.', 'Make a serial dilution of 1.0 mol dm⁻³ sucrose.', 'Soak for the same time at the same temperature.', 'Blot and reweigh; calculate % change in mass.', 'Plot % change against concentration; read the x-intercept.'], 'ol'], ['Explain a result', ['Use "water potential", never "water concentration".', 'Say which side has the higher Ψ and which way water moves by osmosis.', 'Link to turgid or plasmolysed cells.'], 'ul'], ['Evaluation', ['Blotting inconsistently changes mass.', 'Use repeats and calculate a mean.', 'Use percentage change because starting masses differ.']]],
    create: function (p) {
      const S = { t: 0, m0: 2.5, results: [], running: false, mystery: rnd(-1.35, -0.55) };
      const psiT = () => TISSUE[p.tis][1] == null ? S.mystery : TISSUE[p.tis][1];
      const psiS = (c) => -2.48 * c;
      const finalPct = (c) => { const d = psiS(c) - psiT(); return d > 0 ? 18 * Math.tanh(d / 0.9) : 28 * Math.tanh(d / 1.1); };
      const pctAt = () => finalPct(p.c) * (1 - Math.exp(-S.t / 9));
      const inst = {
        reset: function () { S.t = 0; S.running = false; },
        change: function (k) { if (k === 'tis' && p.tis === 'mystery') S.mystery = rnd(-1.35, -0.55); if (k === 'tis') S.results = []; inst.reset(); },
        action: function (id) {
          if (id === 'go') { S.t = 0; S.running = true; }
          if (id === 'rec' && S.t > 0) S.results.push([p.c, pctAt() + gauss() * 0.9]);
          if (id === 'clear') S.results = [];
        },
        step: function (dt) { if (S.running) { S.t = Math.min(30, S.t + dt * 6); if (S.t >= 30) S.running = false; } },
        draw: function (g, W, H, p, th) {
          bench(g, W, H, H * 0.82, th);
          const pct = pctAt(), scale = 1 + pct / 100;
          // Boiling tube
          const tx = W * 0.22, top = 24, bot = H * 0.8, tw = Math.min(90, W * 0.13);
          const sol = 'rgba(' + Math.round(170 + 60 * p.c) + ',' + Math.round(210 - 20 * p.c) + ',255,' + (0.35 + 0.35 * p.c) + ')';
          g.fillStyle = sol; LB.rr(g, tx - tw / 2 + 3, top + 40, tw - 6, bot - top - 43, [0, 0, tw / 2, tw / 2]); g.fill();
          g.strokeStyle = th.dark ? 'rgba(220,230,255,0.7)' : 'rgba(70,90,130,0.6)'; g.lineWidth = 3; LB.rr(g, tx - tw / 2, top, tw, bot - top, [4, 4, tw / 2, tw / 2]); g.stroke();
          // Potato cylinder
          const cw = tw * 0.32 * Math.sqrt(scale), ch = (bot - top) * 0.45 * scale, cy = bot - 18 - ch;
          LB.box(g, tx - cw / 2, cy, cw, ch, pct < -8 ? '#D6C27A' : '#F5DB8B', 6);
          T(g, p.c.toFixed(2) + ' M', tx, top - 6, { col: th.ink, size: 13, weight: 900, align: 'center' });
          // Clock
          const cx = W * 0.22 + tw + 50, cyc = 70, cr = 34;
          LB.dial(g, cx, cyc, cr, S.t / 30, 'min', Math.round(S.t) + ' / 30 min', '#22C55E', th);
          // Zoom bubble: one cell
          const zx = W * 0.66, zy = H * 0.42, zr = Math.min(W * 0.2, H * 0.36);
          g.save(); g.beginPath(); g.arc(zx, zy, zr, 0, 7); g.clip();
          g.fillStyle = sol; g.fillRect(zx - zr, zy - zr, zr * 2, zr * 2);
          const wall = zr * 0.72, shrink = clamp(-pct / 28, 0, 1), swell = clamp(pct / 18, 0, 1);
          g.fillStyle = th.dark ? '#3F6B3A' : '#B7E4A8'; LB.rr(g, zx - wall, zy - wall * 0.8, wall * 2, wall * 1.6, 18); g.fill();
          g.strokeStyle = '#3F8F3A'; g.lineWidth = 6; g.stroke();
          const mem = wall * (0.94 - 0.35 * shrink + 0.04 * swell);
          LB.rr(g, zx - mem, zy - mem * 0.78, mem * 2, mem * 1.56, 16); g.fillStyle = th.dark ? '#4E8A46' : '#8FD27E'; g.fill(); g.strokeStyle = '#2E7D32'; g.lineWidth = 2; g.stroke();
          LB.rr(g, zx - mem * 0.6, zy - mem * 0.45, mem * 1.2, mem * 0.9, 14); g.fillStyle = 'rgba(160,210,255,0.8)'; g.fill();
          T(g, 'vacuole', zx, zy + 4, { col: '#1E3A5F', size: 11, weight: 800, align: 'center' });
          // water molecules moving
          const dir = Math.sign(psiS(p.c) - psiT()), live = S.running ? 1 : 0.3;
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2, ph = ((performance.now() / 1400) + i * 0.13) % 1;
            const r0 = dir > 0 ? wall * 1.25 - ph * wall * 0.5 : wall * 0.8 + ph * wall * 0.5;
            g.globalAlpha = live * (dir === 0 ? 0.2 : 0.9);
            LB.ball(g, zx + Math.cos(a) * r0, zy + Math.sin(a) * r0 * 0.8, 4, '#38BDF8');
          }
          g.globalAlpha = 1; g.restore();
          g.strokeStyle = th.ink2; g.lineWidth = 3; g.beginPath(); g.arc(zx, zy, zr, 0, 7); g.stroke();
          const msg = dir > 0 ? 'Water moves IN: Ψ solution > Ψ cells' : dir < 0 ? 'Water moves OUT: Ψ solution < Ψ cells' : 'No net movement';
          pill(g, msg, zx, zy + zr + 22 > H - 8 ? H - 14 : zy + zr + 22, dir > 0 ? '#0EA5E9' : '#F97316', th, 'center');
          pill(g, 'Mass ' + (S.m0 * scale).toFixed(2) + ' g (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)', tx - tw / 2, H - 14, '#22C55E', th);
        },
        graph: function (g, W, H, p, th) {
          const pts = S.results, n = pts.length;
          let fit = null;
          if (n >= 2) { const mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n; let sxy = 0, sxx = 0; pts.forEach((q) => { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) * (q[0] - mx); }); if (sxx > 0) { const m = sxy / sxx; fit = { m: m, c: my - m * mx }; } }
          const series = [{ pts: pts, col: '#22C55E', dots: true, r: 5 }];
          if (fit) series.unshift({ pts: [[0, fit.c], [1, fit.m + fit.c]], col: th.ink3, dash: [6, 4], width: 2 });
          const vl = fit && fit.m < 0 ? [{ x: -fit.c / fit.m, col: '#0EA5E9', label: 'no change at ' + (-fit.c / fit.m).toFixed(2) + ' M' }] : [];
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: 1, y0: -30, y1: 20, xl: 'Sucrose concentration / mol dm⁻³', yl: '% change in mass', series: series, vlines: vl });
          if (!n) T(g, 'Soak, then press Record result to plot points', W / 2, H / 2 - 20, { col: th.ink3, size: 13, weight: 800, align: 'center' });
          S.fit = fit;
        },
        readouts: function () {
          const fit = S.fit, x0 = fit && fit.m < 0 ? -fit.c / fit.m : null;
          const r = [['Time soaked', Math.round(S.t) + ' min'], ['Change in mass', (pctAt() >= 0 ? '+' : '') + pctAt().toFixed(1) + ' %'], ['Results recorded', String(S.results.length)], ['Ψ of solution', psiS(p.c).toFixed(2) + ' MPa', 'th']];
          if (x0 != null) r.push(['Ψ of tissue from your graph', (-2.48 * x0).toFixed(2) + ' MPa']);
          if (p.tis !== 'mystery') r.push(['Ψ of tissue (true)', psiT().toFixed(2) + ' MPa', 'th']);
          return r;
        },
        extra: function () {
          if (!S.results.length) return '';
          return '<table class="tbl lab-tbl"><thead><tr><th>Sucrose / M</th><th>Ψ / MPa</th><th>% change</th></tr></thead><tbody>' + S.results.map((q) => '<tr><td class="num">' + q[0].toFixed(2) + '</td><td class="num">' + psiS(q[0]).toFixed(2) + '</td><td class="num">' + (q[1] >= 0 ? '+' : '') + q[1].toFixed(1) + '</td></tr>').join('') + '</tbody></table>';
        }
      };
      return inst;
    }
  });

  // =====================================================================
  // BIOLOGY 3. Predators and prey
  // =====================================================================
  LB.add({
    id: 'predator', subject: 'biology', name: 'Predators and prey', topics: ['bio-u7-t4', 'bio-u5-t3'],
    blurb: 'Foxes eat rabbits. Change birth, hunting and death rates and watch the two populations rise and fall in cycles.',
    icon: icon('<path d="M4 34c6-10 10-10 14 0s8 10 14 0 10-10 12-4"/><path d="M4 24c6 10 10 10 14 0s8-10 14 0 10 8 12 4"/>'),
    aspect: 0.5, maxH: 400, graph: true, graphH: 220, fast: 4,
    help: 'Green values are the equilibrium populations from the Lotka–Volterra equations.',
    controls: [
      { k: 'a', label: 'Rabbit birth rate', min: 0.2, max: 1.5, step: 0.05, v: 0.8, unit: 'per year', dp: 2 },
      { k: 'b', label: 'Hunting success', min: 0.005, max: 0.04, step: 0.001, v: 0.02, dp: 3 },
      { k: 'e', label: 'Fox efficiency (rabbits → foxes)', min: 0.1, max: 0.5, step: 0.01, v: 0.25, dp: 2 },
      { k: 'm', label: 'Fox death rate', min: 0.1, max: 1, step: 0.05, v: 0.4, unit: 'per year', dp: 2 },
      { k: 'K', type: 'toggle', label: 'Limited food for rabbits (carrying capacity 250)', v: true },
      { k: 'view', type: 'seg', label: 'Graph', options: [['time', 'Over time'], ['phase', 'Rabbits vs foxes']], v: 'time' }
    ],
    actions: [{ id: 'disease', label: 'Disease hits rabbits' }, { id: 'cull', label: 'Cull foxes' }],
    tasks: [
      'Watch one full cycle. The fox peak comes <b>after</b> the rabbit peak. Explain why.',
      'Turn off the carrying capacity. The cycles keep going forever; with it on they settle towards the equilibrium.',
      'Increase hunting success. Does the average number of foxes go up or down?',
      'Press <b>Cull foxes</b>. What happens to the rabbits next, and then to the foxes?',
      'Switch to the phase graph: each cycle is a loop around the equilibrium point.'
    ],
    theory: '<p>The <b>Lotka–Volterra</b> model:</p><p class="eq">dR/dt = aR(1 − R/K) − bRF &nbsp;&nbsp; dF/dt = e·bRF − mF</p><p>More prey means more food, so predators increase; more predators eat more prey, so prey fall; then predators starve and fall, and prey recover. The predator peak lags behind the prey peak.</p><p>Real populations are also limited by other <b>biotic</b> factors (disease, competition) and <b>abiotic</b> ones (temperature, space), so cycles are rarely this regular. The classic data are the Hudson’s Bay Company records of snowshoe hares and lynx.</p>',
    exam: [['Describe the graph', ['Both populations fluctuate in cycles.', 'Prey peak first; predator peak follows after a lag.', 'Predator numbers are lower than prey numbers.'], 'ul'], ['Explain', ['Prey increase → more food for predators → more predators survive and reproduce.', 'More predators → more prey eaten → prey fall.', 'Less food → predators die or reproduce less → predators fall → prey recover.'], 'ol'], ['Watch out', ['Other factors also limit populations: disease, weather, competition.', 'Correlation in field data does not prove causation.']]],
    create: function (p) {
      const S = { R: 60, F: 10, t: 0, hist: [], animals: [] };
      for (let i = 0; i < 90; i++) S.animals.push({ x: Math.random(), y: Math.random(), dx: rnd(-1, 1), dy: rnd(-1, 1), ph: Math.random() * 7 });
      const inst = {
        reset: function () { S.R = 60; S.F = 10; S.t = 0; S.hist = [[0, 60, 10]]; },
        action: function (id) { if (id === 'disease') S.R *= 0.4; if (id === 'cull') S.F *= 0.4; },
        step: function (dt) {
          const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
          for (let i = 0; i < n; i++) {
            const K = p.K ? 250 : Infinity, dR = p.a * S.R * (1 - S.R / K) - p.b * S.R * S.F, dF = p.e * p.b * S.R * S.F - p.m * S.F;
            S.R = Math.max(0.01, S.R + dR * h); S.F = Math.max(0.01, S.F + dF * h); S.t += h;
          }
          if (S.t - (S.hist.length ? S.hist[S.hist.length - 1][0] : -1) > 0.1) S.hist.push([S.t, S.R, S.F]);
          if (S.hist.length > 1200) S.hist.shift();
          S.animals.forEach((q) => { q.ph += dt * 6; q.x += q.dx * dt * 0.05; q.y += q.dy * dt * 0.05; if (q.x < 0.02 || q.x > 0.98) q.dx *= -1; if (q.y < 0.05 || q.y > 0.95) q.dy *= -1; if (Math.random() < dt * 0.3) { q.dx = rnd(-1, 1); q.dy = rnd(-1, 1); } });
        },
        draw: function (g, W, H, p, th) {
          LB.sky(g, W, H * 0.3, th);
          LB.grass(g, H * 0.26, W, H, th);
          const now = performance.now() / 1000;
          LB.cloud(g, (now * 12) % (W + 120) - 60, 26, 0.7, th);
          // bushes
          for (let i = 0; i < 6; i++) { const x = (i + 0.5) * W / 6, y = H * 0.27; LB.ball(g, x, y, 16, th.dark ? '#2E6B37' : '#43A047'); LB.ball(g, x + 14, y + 2, 12, th.dark ? '#2E6B37' : '#4CAF50'); }
          const nR = Math.min(70, Math.round(S.R / 4)), nF = Math.min(20, Math.round(S.F / 2));
          const Y = (y) => H * 0.33 + y * (H * 0.6), X = (x) => 12 + x * (W - 24);
          for (let i = 0; i < nR; i++) {
            const q = S.animals[i], x = X(q.x), y = Y(q.y) + Math.abs(Math.sin(q.ph)) * -4;
            LB.shadow(g, x, Y(q.y) + 8, 8, 0.15);
            g.fillStyle = th.dark ? '#D9D2C5' : '#F2EEE6'; g.beginPath(); g.ellipse(x, y, 9, 7, 0, 0, 7); g.fill();
            g.beginPath(); g.arc(x + (q.dx > 0 ? 7 : -7), y - 4, 5, 0, 7); g.fill();
            g.beginPath(); g.ellipse(x + (q.dx > 0 ? 7 : -7), y - 13, 1.8, 6, q.dx > 0 ? 0.2 : -0.2, 0, 7); g.fill();
            g.fillStyle = '#F9A8D4'; g.beginPath(); g.arc(x + (q.dx > 0 ? 11 : -11), y - 4, 1.5, 0, 7); g.fill();
            g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x + (q.dx > 0 ? -9 : 9), y - 2, 3, 0, 7); g.fill();
          }
          for (let i = 0; i < nF; i++) {
            const q = S.animals[70 + i], x = X(q.x), y = Y(q.y), s = q.dx > 0 ? 1 : -1;
            LB.shadow(g, x, y + 12, 14, 0.18);
            g.fillStyle = '#EA7A2A'; g.beginPath(); g.ellipse(x, y, 15, 8, 0, 0, 7); g.fill();
            g.beginPath(); g.ellipse(x - s * 18, y - 2, 10, 4, s * -0.4, 0, 7); g.fill();
            g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x - s * 26, y - 5, 3, 0, 7); g.fill();
            g.fillStyle = '#EA7A2A'; g.beginPath(); g.arc(x + s * 14, y - 6, 7, 0, 7); g.fill();
            g.beginPath(); g.moveTo(x + s * 10, y - 10); g.lineTo(x + s * 12, y - 20); g.lineTo(x + s * 16, y - 11); g.fill();
            g.beginPath(); g.moveTo(x + s * 15, y - 10); g.lineTo(x + s * 19, y - 19); g.lineTo(x + s * 20, y - 9); g.fill();
            g.fillStyle = '#1F2330'; g.beginPath(); g.arc(x + s * 21, y - 5, 2, 0, 7); g.fill();
            g.fillStyle = '#3B2A20'; g.fillRect(x - 9, y + 5, 3, 7); g.fillRect(x + 7, y + 5, 3, 7);
          }
          pill(g, Math.round(S.R) + ' rabbits', 16, 24, '#64748B', th);
          pill(g, Math.round(S.F) + ' foxes', 16, 52, '#EA7A2A', th);
          pill(g, 'Year ' + S.t.toFixed(1), W - 16, 24, '#22C55E', th, 'right');
        },
        graph: function (g, W, H, p, th) {
          const hs = S.hist;
          if (p.view === 'phase') {
            const xm = Math.max(100, ...hs.map((q) => q[1])) * 1.1, ym = Math.max(30, ...hs.map((q) => q[2])) * 1.1;
            const eq = inst.eq();
            const pl = LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: xm, y0: 0, y1: ym, xl: 'Rabbits', yl: 'Foxes', series: [{ pts: hs.map((q) => [q[1], q[2]]), col: '#22C55E', width: 2.5 }] });
            if (eq) LB.ball(g, pl.sx(eq[0]), pl.sy(eq[1]), 5, th.ink3);
            if (hs.length) LB.ball(g, pl.sx(S.R), pl.sy(S.F), 6, '#22C55E');
            return;
          }
          const t1 = Math.max(30, S.t), t0 = t1 - 30, ym = Math.max(100, ...hs.map((q) => q[1])) * 1.1;
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: t0, x1: t1, y0: 0, y1: ym, xl: 'Time / years', yl: 'Population', series: [{ pts: hs.filter((q) => q[0] >= t0).map((q) => [q[0], q[1]]), col: '#64748B', width: 3 }, { pts: hs.filter((q) => q[0] >= t0).map((q) => [q[0], q[2]]), col: '#EA7A2A', width: 3 }] });
          LB.legend(g, th, W - 190, 22, [['Rabbits', '#64748B'], ['Foxes', '#EA7A2A']]);
        },
        eq: function () { const Rs = p.m / (p.e * p.b), K = p.K ? 250 : Infinity; if (Rs >= K) return null; return [Rs, p.a / p.b * (1 - Rs / K)]; },
        readouts: function () {
          const eq = inst.eq();
          return [['Year', S.t.toFixed(1)], ['Rabbits', String(Math.round(S.R))], ['Foxes', String(Math.round(S.F))], ['Rabbits per fox', f(S.R / S.F, 1)], ['Equilibrium rabbits', eq ? f(eq[0], 0) : 'foxes die out', 'th'], ['Equilibrium foxes', eq ? f(eq[1], 0) : '0', 'th']];
        }
      };
      inst.reset();
      return inst;
    }
  });
})(window.RH = window.RH || {});
