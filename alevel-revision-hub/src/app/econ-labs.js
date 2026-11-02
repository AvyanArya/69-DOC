/* Economics diagrams: the Edexcel diagrams, interactive. Curves are straight lines or simple functions on a 0–100
   scale; areas (surplus, tax revenue, welfare loss) are worked out exactly and shaded the way you would in an exam.
   Each one registers with RH.labs as an economics lab, with things to try, the theory and how to use it in the exam. */
(function (RH) {
  'use strict';
  const LB = RH.labs, f = LB.fmt, T = LB.text, U = RH.util;
  const icon = (d) => '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const AX = '<path d="M8 4v36h36"/>';

  // ---------- Drawing kit ----------
  const ED = {};
  ED.frame = function (g, W, H, th, o) {
    const X0 = W < 500 ? 46 : 62, X1 = W - 36, Y0 = H - (W < 500 ? 84 : 72), Y1 = 30, xmax = o.xmax || 100, ymax = o.ymax || 100;
    const F = { g: g, th: th, X0: X0, X1: X1, Y0: Y0, Y1: Y1, xmax: xmax, ymax: ymax,
      sx: (q) => X0 + q / xmax * (X1 - X0), sy: (p) => Y0 - p / ymax * (Y0 - Y1) };
    g.strokeStyle = th.ink; g.fillStyle = th.ink; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(X0, Y1 - 14); g.lineTo(X0, Y0); g.lineTo(X1 + 16, Y0); g.stroke();
    g.beginPath(); g.moveTo(X0, Y1 - 20); g.lineTo(X0 - 5, Y1 - 10); g.lineTo(X0 + 5, Y1 - 10); g.fill();
    g.beginPath(); g.moveTo(X1 + 22, Y0); g.lineTo(X1 + 12, Y0 - 5); g.lineTo(X1 + 12, Y0 + 5); g.fill();
    T(g, o.yl || 'Price (P)', X0 + 10, Y1 - 12, { col: th.ink, size: 12, weight: 600 });
    T(g, o.xl || 'Quantity (Q)', X1 + 14, Y0 + 34, { col: th.ink, size: 12, weight: 600, align: 'right' });
    T(g, '0', X0 - 8, Y0 + 16, { col: th.ink3, size: 11, align: 'right' });
    return F;
  };
  ED.clip = function (F, fn) { const g = F.g; g.save(); g.beginPath(); g.rect(F.X0, F.Y1 - 8, F.X1 - F.X0 + 8, F.Y0 - F.Y1 + 8); g.clip(); fn(); g.restore(); };
  ED.fn = function (F, fn, col, w, dash, q0, q1) {
    ED.clip(F, function () {
      const g = F.g; g.strokeStyle = col; g.lineWidth = w || 2.4; g.setLineDash(dash || []); g.beginPath();
      const a = q0 == null ? 0 : q0, b = q1 == null ? F.xmax : q1;
      for (let i = 0; i <= 200; i++) { const q = a + (b - a) * i / 200, p = fn(q); if (!isFinite(p)) continue; const X = F.sx(q), Y = F.sy(Math.max(-F.ymax, Math.min(F.ymax * 3, p))); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
      g.stroke(); g.setLineDash([]);
    });
  };
  ED.seg = function (F, q1, p1, q2, p2, col, w, dash) {
    ED.clip(F, function () { const g = F.g; g.strokeStyle = col; g.lineWidth = w || 2.4; g.setLineDash(dash || []); g.beginPath(); g.moveTo(F.sx(q1), F.sy(p1)); g.lineTo(F.sx(q2), F.sy(p2)); g.stroke(); g.setLineDash([]); });
  };
  ED.area = function (F, pts, col, alpha) {
    if (!pts.length) return;
    ED.clip(F, function () { const g = F.g; g.globalAlpha = alpha == null ? 0.22 : alpha; g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => { if (i) g.lineTo(F.sx(p[0]), F.sy(p[1])); else g.moveTo(F.sx(p[0]), F.sy(p[1])); }); g.closePath(); g.fill(); g.globalAlpha = 1; });
  };
  ED.label = function (F, q, p, txt, col, o) {
    o = o || {};
    T(F.g, txt, F.sx(q) + (o.dx || 0), F.sy(p) + (o.dy || 0), { col: col, size: o.size || 13, weight: o.weight || 700, align: o.align || 'left' });
  };
  // Dashed lines from a point to both axes, with labels on the axes.
  ED.guide = function (F, q, p, lp, lq, col) {
    const g = F.g, X = F.sx(q), Y = F.sy(p);
    if (q < 0 || p < 0 || q > F.xmax || p > F.ymax) return;
    g.strokeStyle = col || F.th.ink3; g.lineWidth = 1; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(X, Y); g.lineTo(F.X0, Y); g.moveTo(X, Y); g.lineTo(X, F.Y0); g.stroke(); g.setLineDash([]);
    if (lp) T(g, lp, F.X0 - 8, Y + 4, { col: col || F.th.ink2, size: 12, weight: 600, align: 'right' });
    if (lq) T(g, lq, X, F.Y0 + 17, { col: col || F.th.ink2, size: 12, weight: 600, align: 'center' });
  };
  ED.dot = function (F, q, p, col) { const g = F.g; g.fillStyle = col || F.th.ink; g.beginPath(); g.arc(F.sx(q), F.sy(p), 4.5, 0, 7); g.fill(); };
  ED.span = function (F, q1, q2, p, txt, col) {
    const g = F.g, y = F.sy(p) - 12, a = F.sx(Math.min(q1, q2)), b = F.sx(Math.max(q1, q2));
    if (b - a < 4) return;
    LB.arrow(g, (a + b) / 2, y, a, y, col, 1.5); LB.arrow(g, (a + b) / 2, y, b, y, col, 1.5);
    T(g, txt, (a + b) / 2, y - 7, { col: col, size: 12, weight: 700, align: 'center' });
  };
  ED.shift = function (F, q1, p1, q2, p2, col) { LB.arrow(F.g, F.sx(q1), F.sy(p1), F.sx(q2), F.sy(p2), col, 2); };
  // The colour key sits in a row under the x-axis, clear of the curves.
  ED.key = function (F, items) {
    const g = F.g; let y = F.Y0 + 46, x = F.X0;
    g.font = '800 11.5px Nunito, system-ui, sans-serif';
    items.forEach(function (it) {
      const w = 34 + g.measureText(it[0]).width;
      if (x > F.X0 && x + w - 14 > F.X1 + 20) { x = F.X0; y += 17; }
      g.globalAlpha = it[2] || 0.3; g.fillStyle = it[1]; g.fillRect(x, y - 10, 14, 12); g.globalAlpha = 1;
      g.strokeStyle = it[1]; g.lineWidth = 1; g.strokeRect(x, y - 10, 14, 12);
      T(g, it[0], x + 20, y, { col: F.th.ink2, size: 11.5, weight: 600 });
      x += w;
    });
  };
  // Area of a polygon (shoelace), used for surplus areas that are not simple triangles.
  ED.polyArea = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const sub = (s) => s.replace(/1/g, '₁').replace(/2/g, '₂').replace(/3/g, '₃');
  const money = (x) => '£' + f(x, 2);
  const area$ = (x) => '£' + f(x, 0);
  const slope = (k, label) => ({ k: k, label: label, min: 0.3, max: 2, step: 0.05, v: 0.7, dp: 2, show: (v) => Number(v) >= 1.2 ? 'steep (inelastic)' : Number(v) <= 0.5 ? 'flat (elastic)' : 'medium' });
  function syncUI(p) {
    document.querySelectorAll('.lab-ctrls input[type="range"][data-lk]').forEach(function (el) {
      const k = el.dataset.lk; if (p[k] == null) return;
      el.value = p[k]; el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.querySelectorAll('.lab-ctrls button[data-lk]').forEach(function (b) {
      const on = String(p[b.dataset.lk]) === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  const add = (d) => LB.add(Object.assign({ subject: 'economics', aspect: 0.66, maxH: 540, still: d.id !== 'multiplier' }, d));

  // ---------- 1. Supply and demand ----------
  add({
    id: 'sd', name: 'Supply and demand', topics: ['eco-s1-2-t1-2-6', 'eco-s1-2-t1-2-2', 'eco-s1-2-t1-2-5', 'eco-s1-2-t1-2-7', 'eco-s1-2-t1-2-8'],
    blurb: 'Shift demand and supply, find the new equilibrium, and see consumer and producer surplus change.',
    icon: icon(AX + '<path d="M12 10l28 26M12 36l28-26"/>'),
    controls: [
      { k: 'dD', label: 'Shift in demand', min: -30, max: 30, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v + ' (increase)' : v < 0 ? v + ' (decrease)' : 'none' },
      { k: 'dS', label: 'Shift in supply', min: -30, max: 30, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v + ' (increase)' : v < 0 ? v + ' (decrease)' : 'none' },
      slope('b', 'Demand curve'), slope('d', 'Supply curve'),
      { k: 'surplus', type: 'toggle', label: 'Shade consumer and producer surplus', v: true }
    ],
    tasks: [
      'Increase demand (for example, a rise in incomes for a normal good). Price and quantity both rise.',
      'Decrease supply (for example, higher costs of raw materials). Price rises and quantity falls.',
      'Make demand steep (inelastic), then decrease supply. Price rises a lot and quantity hardly falls: this is why a poor harvest raises food prices so sharply.',
      'Increase both demand and supply. Quantity rises for certain, but whether price rises depends on which shift is bigger.',
      'Watch consumer surplus as price rises: consumers lose it, producers gain some of it.'
    ],
    theory: '<p>Demand slopes down because, at a lower price, more people are willing and able to buy (and, by diminishing marginal utility, each extra unit is worth less to them). Supply slopes up because a higher price makes production more profitable. The market clears where they cross.</p><p class="eq">Equilibrium: quantity demanded = quantity supplied</p><p>If price is above equilibrium there is excess supply and firms cut prices; below it there is excess demand and prices are bid up. The price mechanism works through three functions: <b>signalling</b>, <b>incentive</b> and <b>rationing</b>. Consumer surplus is the area under demand above the price; producer surplus is above supply below the price.</p>',
    exam: [
      ['Draw it', ['Label the axes Price (P) and Quantity (Q), with an origin.', 'Draw D₁ and S₁ and mark the equilibrium P₁ and Q₁ with dashed lines to both axes.', 'Show the shift with an arrow and draw the new curve, labelled D₂ or S₂.', 'Mark the new equilibrium P₂ and Q₂.', 'In words, explain the excess demand or supply at the old price that moves the market.'], 'ol'],
      ['Evaluate', ['How big is the shift? A small change in demand may barely move price.', 'Elasticity: the steeper the other curve, the more the change shows up in price rather than quantity.', 'Time: supply is more elastic in the long run as firms can add capacity.', 'Ceteris paribus: other factors may be shifting at the same time.'], ''],
      ['Real world', ['A frost in Brazil in 2021 cut coffee supply, pushing up world coffee prices.', 'Concert tickets: fixed supply (vertical), so any rise in demand goes entirely into price.'], '']
    ],
    create: function (p) {
      const a0 = 85, c0 = 15;
      const m = () => { const a = a0 + p.b * p.dD, c = c0 - p.d * p.dS, Q = (a - c) / (p.b + p.d); return { a: a, c: c, Q: Q, P: a - p.b * Q }; };
      const m0 = () => { const Q = (a0 - c0) / (p.b + p.d); return { a: a0, c: c0, Q: Q, P: a0 - p.b * Q }; };
      const ps = (e) => e.c >= 0 ? 0.5 * e.Q * (e.P - e.c) : ED.polyArea([[0, e.P], [e.Q, e.P], [-e.c / p.d, 0], [0, 0]]);
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, {}), e0 = m0(), e1 = m(), moved = p.dD || p.dS, col = th.primary;
          if (p.surplus) {
            ED.area(F, [[0, e1.P], [0, e1.a], [e1.Q, e1.P]], th.phy, 0.18);
            ED.area(F, e1.c >= 0 ? [[0, e1.P], [0, e1.c], [e1.Q, e1.P]] : [[0, e1.P], [0, 0], [-e1.c / p.d, 0], [e1.Q, e1.P]], th.green, 0.2);
            ED.key(F, [['Consumer surplus', th.phy, 0.25], ['Producer surplus', th.green, 0.28]]);
          }
          ED.fn(F, (q) => a0 - p.b * q, th.ink); ED.fn(F, (q) => c0 + p.d * q, th.ink);
          ED.label(F, (a0 - 6) / p.b, 6, moved && p.dD ? 'D₁' : 'D', th.ink, { dx: 6 });
          ED.label(F, Math.min(95, (94 - c0) / p.d), Math.min(94, c0 + p.d * 95), moved && p.dS ? 'S₁' : 'S', th.ink, { dx: 6, dy: 4 });
          if (p.dD) { ED.fn(F, (q) => e1.a - p.b * q, col); ED.label(F, (e1.a - 6) / p.b, 6, 'D₂', col, { dx: 6 }); const pm = 60; ED.shift(F, (a0 - pm) / p.b, pm, (e1.a - pm) / p.b, pm, col); }
          if (p.dS) { ED.fn(F, (q) => e1.c + p.d * q, col); ED.label(F, Math.min(95, (94 - e1.c) / p.d), Math.min(94, e1.c + p.d * 95), 'S₂', col, { dx: 6, dy: 4 }); const pm = 40; ED.shift(F, (pm - c0) / p.d, pm, (pm - e1.c) / p.d, pm, col); }
          ED.guide(F, e0.Q, e0.P, moved ? 'P₁' : 'P*', moved ? 'Q₁' : 'Q*'); ED.dot(F, e0.Q, e0.P);
          if (moved) { ED.guide(F, e1.Q, e1.P, 'P₂', 'Q₂', col); ED.dot(F, e1.Q, e1.P, col); }
        },
        readouts: function () {
          const e0 = m0(), e1 = m();
          return [['Original price P₁', money(e0.P)], ['Original quantity Q₁', f(e0.Q, 1)], ['New price P₂', money(e1.P)], ['New quantity Q₂', f(e1.Q, 1)],
            ['Change in price', (e1.P >= e0.P ? '+' : '') + f(e1.P - e0.P, 2)], ['Change in quantity', (e1.Q >= e0.Q ? '+' : '') + f(e1.Q - e0.Q, 1)],
            ['Consumer surplus', area$(0.5 * e1.Q * (e1.a - e1.P)), 'th'], ['Producer surplus', area$(ps(e1)), 'th']];
        }
      };
    }
  });

  // ---------- 2. Price elasticity and revenue ----------
  add({
    id: 'ped', name: 'Price elasticity and revenue', topics: ['eco-s1-2-t1-2-3', 'eco-s1-2-t1-2-4', 'eco-s3-3-t3-3-1'],
    blurb: 'Move along a demand curve and see how elasticity changes, and what a price change does to total revenue.',
    icon: icon(AX + '<path d="M10 8l32 30"/><rect x="8" y="22" width="16" height="18" fill="currentColor" opacity=".25" stroke="none"/>'),
    graph: true, graphH: 200,
    controls: [
      { k: 'P', label: 'Starting price P₁', min: 5, max: 95, step: 1, v: 70, unit: '', dp: 0, show: (v) => '£' + v },
      { k: 'dP', label: 'Price change', min: -30, max: 30, step: 1, v: -10, dp: 0, show: (v) => (v > 0 ? '+£' : v < 0 ? '−£' : '£') + Math.abs(v) }
    ],
    tasks: [
      'Start at £70 and cut the price by £10. Revenue rises: demand is price elastic at the top of the curve.',
      'Start at £30 and cut the price by £10. Revenue falls: demand is price inelastic at the bottom.',
      'Find the price where revenue is greatest (the top of the revenue graph). PED is exactly −1 there.',
      'Notice that a straight-line demand curve does not have one elasticity: it changes all along the line.'
    ],
    theory: '<p class="eq">PED = % change in quantity demanded ÷ % change in price</p><p>If |PED| > 1 demand is elastic: cutting the price raises total revenue, because the gain from selling more outweighs the lower price. If |PED| < 1 it is inelastic: raising the price raises revenue. Revenue is greatest where |PED| = 1.</p><p>Elasticity depends on the number and closeness of substitutes, the share of income spent, whether it is a necessity or habit-forming, how broadly the market is defined, and time. Income elasticity (YED = %ΔQd / %ΔY) tells you if a good is normal (+) or inferior (−); cross elasticity (XED) tells you if two goods are substitutes (+) or complements (−). PES works the same way for supply.</p>',
    exam: [
      ['Draw it', ['Draw a straight-line demand curve and mark the starting price and quantity.', 'Shade the revenue rectangle P × Q before the change.', 'Show the new price and quantity, and shade the area gained (extra units sold) and lost (lower price on existing units).', 'State whether revenue rises or falls and link it to PED.'], 'ol'],
      ['Evaluate', ['PED estimates come from past data and may not hold.', 'Elasticity changes along the curve, so a big price change can cross from elastic to inelastic.', 'Firms also care about costs: higher revenue is not the same as higher profit.', 'Competitors may respond to a price cut.'], ''],
      ['Real world', ['Cigarettes and petrol have inelastic demand, which is why governments tax them: revenue is reliable.', 'Rail operators charge much more at peak times, when commuters’ demand is inelastic.'], '']
    ],
    create: function (p) {
      const Q = (P) => 100 - P;
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, {}), P1 = p.P, P2 = Math.max(1, Math.min(99, p.P + p.dP)), Q1 = Q(P1), Q2 = Q(P2);
          const hi = Math.max(P1, P2), lo = Math.min(P1, P2), qlo = Math.min(Q1, Q2), qhi = Math.max(Q1, Q2);
          ED.area(F, [[0, 0], [qlo, 0], [qlo, lo], [0, lo]], th.ink3, 0.12);
          ED.area(F, [[0, lo], [qlo, lo], [qlo, hi], [0, hi]], P2 < P1 ? th.bad : th.green, 0.3);
          ED.area(F, [[qlo, 0], [qhi, 0], [qhi, lo], [qlo, lo]], P2 < P1 ? th.green : th.bad, 0.3);
          ED.key(F, [['Revenue gained', th.green, 0.35], ['Revenue lost', th.bad, 0.35]]);
          ED.fn(F, (q) => 100 - q, th.ink); ED.label(F, 94, 6, 'D', th.ink, { dx: 6 });
          ED.label(F, 18, 82, '|PED| > 1', th.ink2, { size: 12 }); ED.label(F, 52, 50, '|PED| = 1', th.ink2, { size: 12 }); ED.label(F, 78, 17, '|PED| < 1', th.ink2, { size: 12 });
          ED.dot(F, 50, 50, th.ink3);
          ED.guide(F, Q1, P1, 'P₁', 'Q₁'); ED.dot(F, Q1, P1);
          if (p.dP) { ED.guide(F, Q2, P2, 'P₂', 'Q₂', th.primary); ED.dot(F, Q2, P2, th.primary); }
        },
        graph: function (g, W, H, p, th) {
          const pts = []; for (let q = 0; q <= 100; q += 1) pts.push([q, q * (100 - q)]);
          const P2 = Math.max(1, Math.min(99, p.P + p.dP));
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: 100, y0: 0, y1: 2800, xl: 'quantity', yl: 'total revenue (£)', series: [{ pts: pts, col: th.ink }, { pts: [[Q(p.P), Q(p.P) * p.P]], col: th.ink, dots: true, r: 5 }, { pts: [[Q(P2), Q(P2) * P2]], col: th.primary, dots: true, r: 5 }], vlines: [{ x: 50, label: 'max revenue, |PED| = 1' }] });
        },
        readouts: function () {
          const P1 = p.P, P2 = Math.max(1, Math.min(99, p.P + p.dP)), Q1 = Q(P1), Q2 = Q(P2);
          const pedPoint = -P1 / Q1, arc = ((Q2 - Q1) / ((Q1 + Q2) / 2)) / ((P2 - P1) / ((P1 + P2) / 2));
          return [['Revenue before', area$(P1 * Q1)], ['Revenue after', area$(P2 * Q2)], ['Change in revenue', (P2 * Q2 >= P1 * Q1 ? '+' : '−') + area$(Math.abs(P2 * Q2 - P1 * Q1))],
            ['PED at P₁', f(pedPoint, 2), 'th'], ['PED for this change', p.dP ? f(arc, 2) : '–', 'th'], ['Demand at P₁ is', Math.abs(pedPoint) > 1.001 ? 'price elastic' : Math.abs(pedPoint) < 0.999 ? 'price inelastic' : 'unit elastic']];
        }
      };
    }
  });

  // ---------- 3. Indirect taxes and subsidies ----------
  add({
    id: 'tax', name: 'Indirect taxes and subsidies', topics: ['eco-s1-2-t1-2-9', 'eco-s1-4-t1-4-1'],
    blurb: 'Put a specific or ad valorem tax, or a subsidy, on a good. See who pays, how much the government raises and the welfare loss.',
    icon: icon(AX + '<path d="M12 36L40 12M12 26L36 6M10 10l30 28"/>'),
    controls: [
      { k: 'mode', type: 'seg', label: 'Policy', options: [['specific', 'Specific tax'], ['adval', 'Ad valorem tax'], ['subsidy', 'Subsidy']], v: 'specific' },
      { k: 't', label: 'Size', min: 0, max: 30, step: 1, v: 15, dp: 0, show: (v, p) => p.mode === 'adval' ? (2 * v) + '% of the price' : '£' + v + ' per unit' },
      slope('b', 'Demand curve'), slope('d', 'Supply curve')
    ],
    tasks: [
      'Put a £15 specific tax on the good. Supply shifts up by exactly £15, but the price rises by less: producers absorb the rest.',
      'Make demand steep (inelastic). Consumers now pay most of the tax, and the government raises more revenue. This is why tobacco and fuel are taxed.',
      'Make demand flat (elastic). Producers bear most of the tax and quantity falls a lot.',
      'Switch to an ad valorem tax. The supply curve pivots rather than shifting in parallel, because the tax is a percentage of the price.',
      'Switch to a subsidy. Price falls and output rises, at a cost to the government (the shaded rectangle).'
    ],
    theory: '<p>An indirect tax is a tax on spending. A <b>specific</b> tax is a fixed amount per unit, so supply shifts up in parallel by the tax. An <b>ad valorem</b> tax is a percentage of the price, so the gap widens at higher prices. A <b>subsidy</b> is a payment per unit to producers, shifting supply down.</p><p class="eq">Tax revenue = tax per unit × quantity &nbsp;&nbsp; Consumer burden = rise in price paid × Q</p><p>The <b>incidence</b> of the tax (who really pays it) depends on elasticities: the side of the market that is more inelastic pays more. Taxes reduce the quantity traded below the free-market level, causing a deadweight welfare loss, but they can correct negative externalities and raise revenue.</p>',
    exam: [
      ['Draw it', ['Draw D and S₁ and mark P₁, Q₁.', 'Specific tax: draw S₂ = S + tax parallel above S₁; ad valorem: pivot S₂ upward from the S intercept.', 'Mark the new price paid by consumers (P₂) and the quantity Q₂.', 'Drop down from Q₂ to S₁ to find the price producers receive.', 'Shade the tax revenue rectangle, split into the consumer and producer burdens, and the welfare loss triangle.'], 'ol'],
      ['Evaluate', ['Elasticity decides how much the quantity falls and who pays.', 'It is hard to set the tax equal to the external cost.', 'Taxes on necessities are regressive: they take a bigger share of poorer people’s income.', 'Firms may avoid or pass on the tax; there may be a black market.', 'Subsidies cost the government money (opportunity cost) and firms may become reliant on them.'], ''],
      ['Real world', ['The Soft Drinks Industry Levy (the “sugar tax”, April 2018) is charged per litre on sugary drinks. Many firms cut sugar to avoid it.', 'VAT is an ad valorem tax at 20% on most goods in the UK.', 'Governments subsidise renewable energy and public transport.'], '']
    ],
    create: function (p) {
      const A = 90, Cs = 10;
      function solve() {
        const Q1 = (A - Cs) / (p.b + p.d), P1 = A - p.b * Q1;
        let Q2;
        if (p.mode === 'adval') { const r = 2 * p.t / 100; Q2 = (A - Cs * (1 + r)) / (p.b + p.d * (1 + r)); }
        else { const s = p.mode === 'subsidy' ? -p.t : p.t; Q2 = (A - Cs - s) / (p.b + p.d); }
        const Pc = A - p.b * Q2, Pp = Cs + p.d * Q2;
        return { Q1: Q1, P1: P1, Q2: Q2, Pc: Pc, Pp: Pp };
      }
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, {}), e = solve(), sub = p.mode === 'subsidy';
          if (sub) {
            ED.area(F, [[0, e.Pc], [e.Q2, e.Pc], [e.Q2, e.Pp], [0, e.Pp]], th.purple, 0.2);
            ED.area(F, [[e.Q1, e.P1], [e.Q2, e.Pp], [e.Q2, e.Pc]], th.bad, 0.4);
            ED.key(F, [['Cost to government', th.purple, 0.25], ['Welfare loss', th.bad, 0.4]]);
          } else {
            ED.area(F, [[0, e.P1], [e.Q2, e.P1], [e.Q2, e.Pc], [0, e.Pc]], th.phy, 0.22);
            ED.area(F, [[0, e.Pp], [e.Q2, e.Pp], [e.Q2, e.P1], [0, e.P1]], th.green, 0.24);
            ED.area(F, [[e.Q2, e.Pc], [e.Q2, e.Pp], [e.Q1, e.P1]], th.bad, 0.4);
            ED.key(F, [['Tax paid by consumers', th.phy, 0.28], ['Tax paid by producers', th.green, 0.3], ['Welfare loss', th.bad, 0.4]]);
          }
          ED.fn(F, (q) => A - p.b * q, th.ink); ED.label(F, (A - 6) / p.b, 6, 'D', th.ink, { dx: 6 });
          ED.fn(F, (q) => Cs + p.d * q, th.ink); ED.label(F, Math.min(95, (92 - Cs) / p.d), Math.min(92, Cs + p.d * 95), 'S₁', th.ink, { dx: 6 });
          const s2 = p.mode === 'adval' ? (q) => (Cs + p.d * q) * (1 + 2 * p.t / 100) : (q) => Cs + (sub ? -p.t : p.t) + p.d * q;
          ED.fn(F, s2, th.primary);
          let lq = 95; while (lq > 0 && s2(lq) > 92) lq -= 1;
          ED.label(F, lq, s2(lq), sub ? 'S₂ (S − subsidy)' : p.mode === 'adval' ? 'S₂ (S + ad valorem tax)' : 'S₂ (S + tax)', th.primary, { dx: -8, dy: -8, align: 'right', size: 12 });
          ED.guide(F, e.Q1, e.P1, 'P₁', 'Q₁'); ED.dot(F, e.Q1, e.P1);
          ED.guide(F, e.Q2, e.Pc, 'P₂', 'Q₂', th.primary); ED.dot(F, e.Q2, e.Pc, th.primary);
          ED.guide(F, e.Q2, e.Pp, sub ? 'Pp' : 'Pp', null, th.green); ED.dot(F, e.Q2, e.Pp, th.green);
        },
        readouts: function () {
          const e = solve(), sub = p.mode === 'subsidy', gap = Math.abs(e.Pc - e.Pp);
          const out = [['Price before', money(e.P1)], ['Price consumers pay', money(e.Pc)], ['Price producers receive', money(e.Pp)], ['Quantity before → after', f(e.Q1, 1) + ' → ' + f(e.Q2, 1)]];
          if (sub) out.push(['Cost to government', area$(gap * e.Q2), 'th'], ['Consumers’ share of subsidy', f(100 * (e.P1 - e.Pc) / gap, 0) + '%', 'th'], ['Welfare loss', area$(0.5 * gap * Math.abs(e.Q2 - e.Q1)), 'th']);
          else if (gap > 0.001) out.push(['Tax revenue', area$(gap * e.Q2), 'th'], ['Paid by consumers', f(100 * (e.Pc - e.P1) / gap, 0) + '%', 'th'], ['Paid by producers', f(100 * (e.P1 - e.Pp) / gap, 0) + '%', 'th'], ['Welfare loss', area$(0.5 * gap * (e.Q1 - e.Q2)), 'th']);
          return out;
        }
      };
    }
  });

  // ---------- 4. Maximum and minimum prices ----------
  add({
    id: 'pricecontrols', name: 'Maximum and minimum prices', topics: ['eco-s1-4-t1-4-1', 'eco-s1-4-t1-4-2'],
    blurb: 'Set a price ceiling or a price floor and see the shortage or surplus it creates, and the welfare lost.',
    icon: icon(AX + '<path d="M12 10l28 26M12 36l28-26"/><path d="M8 30h36" stroke-dasharray="4 3"/>'),
    controls: [
      { k: 'mode', type: 'seg', label: 'Control', options: [['max', 'Maximum price'], ['min', 'Minimum price']], v: 'max' },
      { k: 'pc', label: 'Price set by government', min: 5, max: 85, step: 1, v: 35, dp: 0, show: (v) => '£' + v },
      { k: 'buy', type: 'toggle', label: 'Government buys the surplus', v: false, when: (p) => p.mode === 'min' },
      slope('b', 'Demand curve'), slope('d', 'Supply curve')
    ],
    tasks: [
      'Set a maximum price of £35, below equilibrium. Quantity supplied falls and there is a shortage: queues, waiting lists or a black market.',
      'Set a maximum price above equilibrium. Nothing happens: a maximum price only matters if it is below the market price.',
      'Switch to a minimum price above equilibrium. There is a surplus. Turn on government buying and see how much it costs.',
      'Make supply very elastic (flat) under a maximum price. The shortage gets much bigger.'
    ],
    theory: '<p>A <b>maximum price</b> (price ceiling) is set below equilibrium to make a necessity affordable, such as rent controls. Because it is below the market price, quantity demanded exceeds quantity supplied: a shortage. Rationing then happens by queuing, lottery or the black market.</p><p>A <b>minimum price</b> (price floor) is set above equilibrium, to support producers’ incomes or to cut consumption of a demerit good (minimum unit pricing for alcohol). It creates excess supply; the government may have to buy and store the surplus.</p><p class="eq">Shortage = Qd − Qs at the maximum price &nbsp;&nbsp; Surplus = Qs − Qd at the minimum price</p>',
    exam: [
      ['Draw it', ['Draw D and S and mark the free-market P* and Q*.', 'Draw a horizontal line for the maximum price below P* (or the minimum price above P*).', 'Mark Qs and Qd where the line meets each curve and label the gap as the shortage (or surplus).', 'Shade the welfare loss triangle between Qs (or Qd) and Q*.'], 'ol'],
      ['Evaluate', ['How far from equilibrium is it set? Close to P*, the side effects are small.', 'Elasticities decide how big the shortage or surplus is.', 'Black markets, poorer quality and less investment (for example, landlords not maintaining rented homes).', 'Buying the surplus has an opportunity cost, and stored food may be wasted.'], ''],
      ['Real world', ['Scotland brought in minimum unit pricing for alcohol in May 2018, at 50p per unit.', 'Berlin capped rents in 2020; the cap was struck down by Germany’s constitutional court in 2021.', 'The EU’s Common Agricultural Policy once bought up surpluses, creating “butter mountains” and “wine lakes”.'], '']
    ],
    create: function (p) {
      const A = 90, Cs = 10;
      function solve() {
        const Q = (A - Cs) / (p.b + p.d), P = A - p.b * Q, pc = p.pc;
        const Qd = Math.max(0, (A - pc) / p.b), Qs = Math.max(0, (pc - Cs) / p.d);
        const binding = p.mode === 'max' ? pc < P : pc > P;
        const traded = binding ? Math.min(Qd, Qs) : Q;
        return { Q: Q, P: P, pc: pc, Qd: Qd, Qs: Qs, binding: binding, traded: traded };
      }
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, {}), e = solve(), max = p.mode === 'max';
          if (e.binding) {
            const qt = e.traded;
            ED.area(F, [[qt, A - p.b * qt], [qt, Cs + p.d * qt], [e.Q, e.P]], th.bad, 0.4);
            if (!max && p.buy) ED.area(F, [[e.Qd, 0], [e.Qs, 0], [e.Qs, e.pc], [e.Qd, e.pc]], th.purple, 0.2);
            ED.key(F, [['Welfare loss', th.bad, 0.4]].concat(!max && p.buy ? [['Cost of buying the surplus', th.purple, 0.25]] : []));
          }
          ED.fn(F, (q) => A - p.b * q, th.ink); ED.label(F, (A - 6) / p.b, 6, 'D', th.ink, { dx: 6 });
          ED.fn(F, (q) => Cs + p.d * q, th.ink); ED.label(F, Math.min(95, (92 - Cs) / p.d), Math.min(92, Cs + p.d * 95), 'S', th.ink, { dx: 6 });
          ED.guide(F, e.Q, e.P, 'P*', 'Q*'); ED.dot(F, e.Q, e.P);
          ED.seg(F, 0, e.pc, 100, e.pc, th.primary, 2, [7, 5]);
          ED.label(F, 99, e.pc, (max ? 'Maximum price' : 'Minimum price') + (e.binding ? '' : ' (not binding)'), th.primary, { dy: -8, align: 'right', size: 12 });
          if (e.binding) {
            ED.guide(F, e.Qs, e.pc, null, 'Qs', th.primary); ED.guide(F, e.Qd, e.pc, null, 'Qd', th.primary);
            ED.span(F, e.Qs, e.Qd, e.pc, max ? 'Shortage' : 'Surplus', th.bad);
          }
        },
        readouts: function () {
          const e = solve(), max = p.mode === 'max';
          const out = [['Market price P*', money(e.P)], ['Market quantity Q*', f(e.Q, 1)], ['Controlled price', money(e.pc)]];
          if (!e.binding) return out.concat([['Effect', max ? 'none: set above the market price' : 'none: set below the market price']]);
          out.push(['Quantity demanded', f(e.Qd, 1)], ['Quantity supplied', f(e.Qs, 1)], [max ? 'Shortage' : 'Surplus', f(Math.abs(e.Qd - e.Qs), 1), 'th'], ['Quantity traded', f(e.traded, 1)], ['Welfare loss', area$(0.5 * (e.Q - e.traded) * ((A - p.b * e.traded) - (Cs + p.d * e.traded))), 'th']);
          if (!max && p.buy) out.push(['Cost of buying the surplus', area$(e.pc * (e.Qs - e.Qd)), 'th']);
          return out;
        }
      };
    }
  });

  // ---------- 5. Externalities ----------
  add({
    id: 'externalities', name: 'Externalities', topics: ['eco-s1-3-t1-3-2', 'eco-s1-3-t1-3-1', 'eco-s1-4-t1-4-1'],
    blurb: 'Negative production and positive consumption externalities: market output, the social optimum and the welfare loss.',
    icon: icon(AX + '<path d="M10 38L38 10M10 28L30 6M10 10l30 28"/>'),
    controls: [
      { k: 'mode', type: 'seg', label: 'Externality', options: [['neg', 'Negative production'], ['pos', 'Positive consumption']], v: 'neg' },
      { k: 'ext', label: 'Size of the external cost or benefit', min: 0, max: 40, step: 1, v: 20, dp: 0, show: (v) => '£' + v + ' per unit' },
      { k: 'fix', type: 'toggle', label: 'Government corrects it', v: false, help: 'A tax (or subsidy) equal to the external cost (or benefit).' }
    ],
    tasks: [
      'Negative production externality: the market produces Qm, more than the social optimum Q*. The triangle is the welfare lost by overproducing.',
      'Make the external cost bigger. The gap between MPC and MSC widens and the welfare loss grows.',
      'Turn on <i>Government corrects it</i>. A tax equal to the external cost shifts MPC up to MSC and the market moves to Q*.',
      'Switch to a positive consumption externality (education, vaccines). Now the market under-consumes. A subsidy fixes it.'
    ],
    theory: '<p>An externality is a cost or benefit to a third party, not paid for by the buyer or seller. With a negative production externality (pollution), the marginal social cost is higher than the marginal private cost:</p><p class="eq">MSC = MPC + external cost &nbsp;&nbsp; MSB = MPB + external benefit</p><p>The market produces where MPC = MPB, but the social optimum is where MSC = MSB. The difference is a misallocation of resources: overproduction of goods with external costs, underconsumption of merit goods with external benefits. The triangle between the curves from Q* to Qm is the welfare loss.</p>',
    exam: [
      ['Draw it', ['Label the axes Costs and benefits and Output.', 'Negative production: draw MPB = MSB, MPC, and MSC above MPC. Positive consumption: draw MPC = MSC, MPB, and MSB above MPB.', 'Mark the market output Qm (private curves cross) and the optimum Q* (social curves cross).', 'Shade the welfare loss triangle pointing towards the social optimum.', 'Label the vertical gap as the external cost (or benefit).'], 'ol'],
      ['Evaluate', ['It is very hard to measure the external cost in money, so a tax may be set too high or too low.', 'Taxes may be regressive, and demand may be inelastic so output barely falls.', 'Alternatives: regulation, tradable permits, information provision.', 'Government failure: the policy may have unintended consequences.'], ''],
      ['Real world', ['London’s congestion charge (2003) puts a price on the congestion and pollution caused by driving into the centre.', 'England’s 5p plastic bag charge (2015) cut single-use bag use dramatically.', 'Vaccinations and education are subsidised or free because they benefit people beyond the individual.'], '']
    ],
    create: function (p) {
      function solve() {
        if (p.mode === 'neg') {
          const a = 90, b = 0.7, c = 10, d = 0.6, Qm = (a - c) / (b + d), Qs = (a - c - p.ext) / (b + d);
          return { Qm: Qm, Pm: a - b * Qm, Qs: Qs, Ps: a - b * Qs, loss: 0.5 * p.ext * (Qm - Qs), a: a, b: b, c: c, d: d };
        }
        const a = 75, b = 0.7, c = 10, d = 0.6, Qm = (a - c) / (b + d), Qs = (a + p.ext - c) / (b + d);
        return { Qm: Qm, Pm: c + d * Qm, Qs: Qs, Ps: c + d * Qs, loss: 0.5 * p.ext * (Qs - Qm), a: a, b: b, c: c, d: d };
      }
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Costs and benefits (£)', xl: 'Output (Q)' }), e = solve(), neg = p.mode === 'neg';
          if (neg) ED.area(F, [[e.Qs, e.Ps], [e.Qm, e.c + e.d * e.Qm + p.ext], [e.Qm, e.Pm]], th.bad, 0.4);
          else ED.area(F, [[e.Qm, e.a + p.ext - e.b * e.Qm], [e.Qm, e.Pm], [e.Qs, e.Ps]], th.bad, 0.4);
          ED.key(F, [['Welfare loss', th.bad, 0.4]]);
          ED.fn(F, (q) => e.a - e.b * q, th.ink); ED.label(F, (e.a - 6) / e.b, 6, neg ? 'MPB = MSB' : 'MPB', th.ink, { dx: -4, dy: -6, align: 'right', size: 12 });
          ED.fn(F, (q) => e.c + e.d * q, th.ink); ED.label(F, 95, e.c + e.d * 95, neg ? 'MPC' : 'MPC = MSC', th.ink, { dx: 4, dy: 4, size: 12 });
          if (neg) { ED.fn(F, (q) => e.c + p.ext + e.d * q, th.primary); const q = Math.min(95, (93 - e.c - p.ext) / e.d); ED.label(F, q, e.c + p.ext + e.d * q, 'MSC', th.primary, { dx: 4, size: 12 }); }
          else { ED.fn(F, (q) => e.a + p.ext - e.b * q, th.primary); ED.label(F, (e.a + p.ext - 6) / e.b, 6, 'MSB', th.primary, { dx: 4, dy: -6, size: 12 }); }
          ED.guide(F, e.Qm, e.Pm, 'Pm', 'Qm'); ED.dot(F, e.Qm, e.Pm);
          ED.guide(F, e.Qs, e.Ps, 'P*', 'Q*', th.primary); ED.dot(F, e.Qs, e.Ps, th.primary);
          if (p.fix && p.ext) { const qx = neg ? 20 : 25, y1 = neg ? e.c + e.d * qx : e.a - e.b * qx; ED.shift(F, qx, y1, qx, y1 + p.ext, th.green); ED.label(F, qx, y1 + p.ext / 2, neg ? 'tax = external cost' : 'subsidy = external benefit', th.green, { dx: 8, size: 12 }); }
        },
        readouts: function () {
          const e = solve(), neg = p.mode === 'neg';
          return [['Market output Qm', f(e.Qm, 1)], ['Socially optimal output Q*', f(e.Qs, 1), 'th'], [neg ? 'Overproduction' : 'Underconsumption', f(Math.abs(e.Qm - e.Qs), 1)], ['Welfare loss', area$(e.loss), 'th'],
            [neg ? 'Total external cost at Qm' : 'Total external benefit at Qm', area$(p.ext * e.Qm)], ['After correction, output', p.fix ? f(e.Qs, 1) + ' (optimal)' : 'not corrected']];
        }
      };
    }
  });

  // ---------- 6. Production possibility frontier ----------
  add({
    id: 'ppf', name: 'Production possibility frontier', topics: ['eco-s1-1-t1-1-4', 'eco-s1-1-t1-1-3', 'eco-s2-5-t2-5-1'],
    blurb: 'Choose between capital and consumer goods, see the opportunity cost, unemployment and economic growth.',
    icon: icon(AX + '<path d="M8 10 Q36 12 40 40"/><circle cx="30" cy="22" r="2.5" fill="currentColor"/>'),
    controls: [
      { k: 'n', label: 'Shape of the frontier', min: 1, max: 2.6, step: 0.05, v: 2, dp: 2, show: (v) => Number(v) <= 1.05 ? 'straight (constant opportunity cost)' : 'bowed out (rising opportunity cost)' },
      { k: 'pos', label: 'Mix of goods', min: 0.05, max: 0.95, step: 0.01, v: 0.5, dp: 2, show: (v) => Math.round(100 * (1 - v)) + '% capital goods' },
      { k: 'inside', type: 'toggle', label: 'Unemployed resources (point inside)', v: false },
      { k: 'growth', label: 'Economic growth (shift outwards)', min: 0, max: 30, step: 1, v: 0, dp: 0, show: (v) => v + '%' }
    ],
    tasks: [
      'Move along the frontier towards consumer goods. Each extra unit of consumer goods costs more capital goods: rising opportunity cost, because resources are not equally good at making both.',
      'Make the frontier a straight line. Now the opportunity cost is constant.',
      'Turn on unemployed resources. The point is inside the frontier: more of both goods could be produced.',
      'Add economic growth. The whole frontier shifts outwards, so points that were unattainable become possible.',
      'Choose more capital goods today. Why might that lead to more growth later?'
    ],
    theory: '<p>A PPF shows the maximum combinations of two goods an economy can produce with all its resources used efficiently. Because resources are scarce, choosing more of one good means giving up some of the other: the <b>opportunity cost</b>.</p><p class="eq">Opportunity cost of 1 more consumer good = capital goods given up</p><p>Points on the frontier are productively efficient; points inside mean unemployed or misallocated resources; points outside are unattainable now. Economic growth (more or better resources, better technology) shifts the frontier out. Making more capital goods now can shift it out faster in future.</p>',
    exam: [
      ['Draw it', ['Label the axes with the two goods (for example, Capital goods and Consumer goods).', 'Draw the frontier bowed out from the origin.', 'Mark points on, inside and outside the curve and say what each means.', 'Show opportunity cost with a move between two points: the fall in one good for the rise in the other.', 'For growth, draw a second frontier further out with an arrow.'], 'ol'],
      ['Evaluate', ['The PPF is a model with only two goods.', 'Growth may not be evenly spread: technology can shift one axis more than the other.', 'Choosing capital goods means lower living standards now for higher ones later.'], ''],
      ['Real world', ['In wartime, economies move along their PPF towards military goods.', 'A recession moves an economy inside its frontier as workers and factories go unused.'], '']
    ],
    create: function (p) {
      const X = 78, Y = 78;
      const at = (t, s) => [s * X * Math.pow(Math.cos(t), 2 / p.n), s * Y * Math.pow(Math.sin(t), 2 / p.n)];
      const pt = () => at((1 - p.pos) * Math.PI / 2, 1);
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Capital goods', xl: 'Consumer goods' }), curve = [];
          for (let i = 0; i <= 100; i++) curve.push(at(i / 100 * Math.PI / 2, 1));
          ED.area(F, [[0, 0]].concat(curve), th.phy, 0.06);
          const g2 = F.g; g2.strokeStyle = th.ink; g2.lineWidth = 2.4; g2.beginPath(); curve.forEach((q, i) => { if (i) g2.lineTo(F.sx(q[0]), F.sy(q[1])); else g2.moveTo(F.sx(q[0]), F.sy(q[1])); }); g2.stroke();
          ED.label(F, 4, Y + 2, 'PPF', th.ink, { dy: -6 });
          if (p.growth) {
            const s = 1 + p.growth / 100; g2.strokeStyle = th.primary; g2.setLineDash([7, 5]); g2.beginPath();
            for (let i = 0; i <= 100; i++) { const q = at(i / 100 * Math.PI / 2, s); if (i) g2.lineTo(F.sx(q[0]), F.sy(q[1])); else g2.moveTo(F.sx(q[0]), F.sy(q[1])); }
            g2.stroke(); g2.setLineDash([]);
            ED.label(F, 4, Y * s + 2, 'PPF₂', th.primary, { dy: -6 });
            const m = at(Math.PI / 4, 1), m2 = at(Math.PI / 4, s); ED.shift(F, m[0], m[1], m2[0], m2[1], th.primary);
          }
          const a = pt(), b = at((1 - Math.min(0.99, p.pos + 0.12)) * Math.PI / 2, 1);
          if (p.inside) { const q = [a[0] * 0.65, a[1] * 0.65]; ED.dot(F, q[0], q[1], th.bad); ED.label(F, q[0], q[1], 'U: unemployed resources', th.bad, { dx: 8, dy: 4, size: 12 }); }
          ED.guide(F, a[0], a[1], 'K₁', 'C₁'); ED.dot(F, a[0], a[1]); ED.label(F, a[0], a[1], 'A', th.ink, { dx: 8, dy: -6 });
          ED.dot(F, b[0], b[1], th.primary); ED.label(F, b[0], b[1], 'B', th.primary, { dx: 8, dy: -6 });
          ED.seg(F, a[0], a[1], a[0], b[1], th.bad, 1.8); ED.seg(F, a[0], b[1], b[0], b[1], th.green, 1.8);
          ED.label(F, a[0], (a[1] + b[1]) / 2, 'given up', th.bad, { dx: -6, align: 'right', size: 11 });
          ED.label(F, (a[0] + b[0]) / 2, b[1], 'gained', th.green, { dy: 16, align: 'center', size: 11 });
          const o = at(Math.PI / 4, 1.22 + p.growth / 100); ED.label(F, o[0], o[1], 'unattainable', th.ink3, { size: 12, weight: 600 });
        },
        readouts: function () {
          const a = pt(), b = at((1 - Math.min(0.99, p.pos + 0.12)) * Math.PI / 2, 1);
          const oc = (a[1] - b[1]) / Math.max(0.01, b[0] - a[0]);
          return [['Consumer goods at A', f(a[0], 1)], ['Capital goods at A', f(a[1], 1)], ['Moving A → B gains', f(b[0] - a[0], 1) + ' consumer goods'], ['…and gives up', f(a[1] - b[1], 1) + ' capital goods'], ['Opportunity cost of 1 consumer good', f(oc, 2) + ' capital goods', 'th'], ['Point A is', p.inside ? 'shown with U inside the frontier' : 'on the frontier (productively efficient)']];
        }
      };
    }
  });

  // ---------- 7. AD/AS ----------
  add({
    id: 'adas', name: 'Aggregate demand and supply', topics: ['eco-s2-2-t2-2-1', 'eco-s2-3-t2-3-1', 'eco-s2-3-t2-3-2', 'eco-s2-3-t2-3-3', 'eco-s2-5-t2-5-2', 'eco-s2-6-t2-6-2', 'eco-s2-6-t2-6-3'],
    blurb: 'Shift AD, SRAS and LRAS in the classical or Keynesian model and see real GDP, the price level and the output gap.',
    icon: icon(AX + '<path d="M12 10l28 26M12 36l28-26M30 4v36"/>'),
    controls: [
      { k: 'model', type: 'seg', label: 'Model', options: [['classical', 'Classical'], ['keynes', 'Keynesian']], v: 'classical' },
      { k: 'ad', label: 'Shift in AD', min: -30, max: 30, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v : String(v) },
      { k: 'sras', label: 'Shift in SRAS', min: -30, max: 30, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v : String(v), when: (p) => p.model === 'classical' },
      { k: 'lras', label: 'Shift in LRAS', min: -15, max: 25, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v : String(v) }
    ],
    actions: [{ id: 'crisis', label: '2008-style demand shock' }, { id: 'energy', label: '2022-style energy shock' }, { id: 'reset0', label: 'Back to start' }],
    tasks: [
      'Shift AD left (a fall in confidence, as in 2008). Real GDP falls below full employment: a negative output gap and rising unemployment.',
      'Shift SRAS left (a jump in energy costs, as in 2022). The price level rises while output falls: cost-push inflation and “stagflation”.',
      'Shift LRAS right with supply-side policies. The economy can grow without inflation.',
      'Switch to the Keynesian model and raise AD when there is lots of spare capacity: output rises with almost no inflation. Near full capacity, the same rise in AD is mostly inflation.'
    ],
    theory: '<p class="eq">AD = C + I + G + (X − M)</p><p>Aggregate demand slopes down (wealth, interest rate and trade effects). Short-run aggregate supply slopes up because firms’ costs are fixed in the short run. Long-run aggregate supply is the economy’s productive potential.</p><p>In the <b>classical</b> view LRAS is vertical at full employment: in the long run, more demand only raises prices. In the <b>Keynesian</b> view, AS is flat when there is lots of spare capacity, curves upward as bottlenecks appear and becomes vertical at full capacity, so boosting demand in a recession raises output without much inflation.</p>',
    exam: [
      ['Draw it', ['Label the axes Price level (PL) and Real GDP (Y).', 'Draw AD, SRAS and a vertical LRAS (or the Keynesian AS curve), labelled.', 'Mark the equilibrium PL₁, Y₁ and full employment Yfe.', 'Show the shift with an arrow and the new PL₂, Y₂.', 'Identify the output gap between Y and Yfe.'], 'ol'],
      ['Evaluate', ['Size of the multiplier: the final change in GDP may be bigger than the first shift.', 'How much spare capacity there is (where the economy is on the AS curve).', 'Time lags, especially for supply-side policies.', 'Which model is right depends on the economy’s situation.'], ''],
      ['Real world', ['2008: the financial crisis cut confidence and lending, shifting AD sharply left; the UK fell into recession.', '2022: energy prices surged after Russia invaded Ukraine, shifting SRAS left; UK inflation peaked at 11.1% in October 2022.', 'The Bank of England raised Bank Rate from 0.1% to 5.25% between December 2021 and August 2023 to reduce AD.'], '']
    ],
    create: function (p) {
      const yfe = () => 60 + p.lras;
      const AD = (y) => 110 + p.ad - y;
      const keynesAS = (y) => y < 35 ? 25 : y >= yfe() - 0.01 ? Infinity : 25 + 12 * (y - 35) / (yfe() - y);
      function eq() {
        if (p.model === 'classical') { const y = (120 + p.ad + p.sras) / 2; return { y: y, pl: AD(y) }; }
        let lo = 0, hi = yfe() - 0.001;
        for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (AD(m) - keynesAS(m) > 0) lo = m; else hi = m; }
        return { y: lo, pl: AD(lo) };
      }
      const inst = {
        reset: function () {}, step: function () {},
        action: function (id) {
          if (id === 'crisis') { p.model = 'classical'; p.ad = -18; p.sras = 0; p.lras = 0; }
          if (id === 'energy') { p.model = 'classical'; p.ad = 0; p.sras = -16; p.lras = 0; }
          if (id === 'reset0') { p.ad = 0; p.sras = 0; p.lras = 0; }
          syncUI(p);
        },
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Price level (PL)', xl: 'Real GDP (Y)' }), e = eq(), Yf = yfe();
          ED.fn(F, (y) => 110 - y, p.ad ? th.ink3 : th.ink, p.ad ? 1.6 : 2.4, p.ad ? [6, 5] : null);
          if (p.ad) { ED.fn(F, AD, th.primary); ED.label(F, Math.min(97, 104 + p.ad), 8, 'AD₂', th.primary, { dx: -4 }); ED.shift(F, 50, 60, 50 + p.ad, 60, th.primary); }
          ED.label(F, Math.min(97, 104), 8, p.ad ? 'AD₁' : 'AD', p.ad ? th.ink3 : th.ink, { dx: -4 });
          if (p.model === 'classical') {
            ED.fn(F, (y) => -10 + y, p.sras ? th.ink3 : th.ink, p.sras ? 1.6 : 2.4, p.sras ? [6, 5] : null);
            ED.label(F, 96, 86, p.sras ? 'SRAS₁' : 'SRAS', p.sras ? th.ink3 : th.ink, { dx: -40 });
            if (p.sras) { ED.fn(F, (y) => -10 + y - p.sras, th.primary); ED.label(F, Math.min(96, 96 + p.sras), 86, 'SRAS₂', th.primary, { dx: -44, dy: -2 }); ED.shift(F, 70, 60, 70 + p.sras, 60, th.primary); }
            ED.seg(F, Yf, 0, Yf, 100, th.ink, 2.4); ED.label(F, Yf, 96, 'LRAS', th.ink, { dx: 6 });
          } else {
            ED.fn(F, keynesAS, th.ink, 2.4, null, 0, Yf - 0.5);
            ED.seg(F, Yf, 60, Yf, 100, th.ink, 2.4); ED.label(F, Yf, 96, 'AS', th.ink, { dx: 6 });
          }
          if (p.lras) ED.shift(F, 60, 92, Yf, 92, th.green);
          T(g, 'Yfe', F.sx(Yf), F.Y0 + 32, { col: th.ink, size: 12, weight: 700, align: 'center' });
          ED.guide(F, e.y, e.pl, 'PL', 'Y', th.primary); ED.dot(F, e.y, e.pl, th.primary);
          if (Math.abs(e.y - Yf) > 0.5) ED.span(F, e.y, Yf, Math.max(4, Math.min(e.pl, 20)), e.y < Yf ? 'negative output gap' : 'positive output gap', e.y < Yf ? th.bad : th.warn);
        },
        readouts: function () {
          const e = eq(), Yf = yfe(), gap = (e.y - Yf) / Yf * 100;
          return [['Real GDP (Y)', f(e.y, 1)], ['Price level', f(e.pl, 1)], ['Full-employment output (Yfe)', f(Yf, 1), 'th'], ['Output gap', (gap >= 0 ? '+' : '') + f(gap, 1) + '% of Yfe', 'th'],
            ['Situation', Math.abs(gap) < 1 ? 'at full employment' : gap < 0 ? 'spare capacity, rising unemployment' : 'above capacity, inflationary pressure']];
        }
      };
      return inst;
    }
  });

  // ---------- 8. Costs, revenue and market structure ----------
  add({
    id: 'firm', name: 'Costs, revenue and market structure', topics: ['eco-s3-3-t3-3-4', 'eco-s3-3-t3-3-2', 'eco-s3-4-t3-4-2', 'eco-s3-4-t3-4-5', 'eco-s3-4-t3-4-1'],
    blurb: 'A firm’s cost curves under perfect competition and monopoly: profit-maximising output, profit or loss, and efficiency.',
    icon: icon(AX + '<path d="M10 18 Q20 40 30 30 T42 8"/><path d="M8 24 Q24 40 42 22" stroke-dasharray="3 3"/>'),
    controls: [
      { k: 'mode', type: 'seg', label: 'Market', options: [['pc', 'Perfect competition'], ['mono', 'Monopoly']], v: 'pc' },
      { k: 'P', label: 'Market price (P = AR = MR)', min: 15, max: 80, step: 1, v: 48, dp: 0, show: (v) => '£' + v, when: (p) => p.mode === 'pc' },
      { k: 'A', label: 'Demand for the monopolist', min: 50, max: 110, step: 1, v: 88, dp: 0, show: (v) => v + ' (higher = more demand)', when: (p) => p.mode === 'mono' },
      { k: 'FC', label: 'Fixed costs', min: 200, max: 1600, step: 50, v: 800, dp: 0, show: (v) => '£' + v },
      { k: 'eff', type: 'toggle', label: 'Show efficiency', v: true }
    ],
    tasks: [
      'Perfect competition: the firm produces where MC = MR. Raise the price and see supernormal profit (green). Lower it and see a loss (red).',
      'Find the price where profit is exactly zero (P = minimum AC): normal profit, the long-run equilibrium in perfect competition.',
      'Below minimum AVC the firm shuts down: price no longer covers variable costs.',
      'Switch to monopoly. Output is where MR = MC, the price is read off the demand (AR) curve, and supernormal profit persists because of barriers to entry.',
      'Compare the monopolist’s output with the allocatively efficient output (P = MC). The triangle is the welfare loss of monopoly.'
    ],
    theory: '<p class="eq">Profit is maximised where MC = MR &nbsp;&nbsp; Profit = (AR − AC) × Q</p><p>Supernormal profit is anything above the normal profit needed to keep the firm in the industry (normal profit is counted in costs). A firm shuts down in the short run if price falls below average variable cost.</p><p><b>Allocative efficiency</b>: P = MC. <b>Productive efficiency</b>: producing at the lowest point of AC. In perfect competition the long-run equilibrium is both. A monopolist restricts output and raises price, so P > MC (allocatively inefficient), but its profits may fund investment and it may enjoy economies of scale (dynamic efficiency).</p>',
    exam: [
      ['Draw it', ['Label Costs and revenue (£) and Output (Q).', 'Draw MC cutting AC at its lowest point.', 'Perfect competition: a horizontal AR = MR line. Monopoly: downward-sloping AR with MR twice as steep.', 'Find Q where MC = MR, go up to AR for the price and to AC for the cost per unit.', 'Shade the profit (or loss) rectangle between price and AC.'], 'ol'],
      ['Evaluate', ['Firms may not profit-maximise: they may maximise revenue, sales or satisfice.', 'Monopoly can bring economies of scale and investment (dynamic efficiency).', 'Contestability: the threat of entry can keep prices down.', 'Regulation (price caps, the CMA) can limit monopoly power.'], ''],
      ['Real world', ['Water companies are regional monopolies, regulated by Ofwat with price controls.', 'Agricultural markets such as wheat come close to perfect competition: farmers are price takers.'], '']
    ],
    create: function (p) {
      const AVC = (q) => 40 - 0.4 * q + 0.004 * q * q, MC = (q) => 40 - 0.8 * q + 0.012 * q * q, AC = (q) => p.FC / q + AVC(q);
      function minAC() { let best = 1; for (let q = 1; q <= 100; q += 0.1) if (AC(q) < AC(best)) best = q; return best; }
      function solve() {
        if (p.mode === 'pc') {
          const disc = 0.64 - 0.048 * (40 - p.P), q = disc < 0 ? 0 : (0.8 + Math.sqrt(disc)) / 0.024;
          const shut = p.P < 30;
          return { q: shut ? 0 : q, P: p.P, shut: shut };
        }
        const disc = 0.16 - 0.048 * (40 - p.A), q = disc < 0 ? 0 : (-0.4 + Math.sqrt(disc)) / 0.024;
        const d2 = 0.04 - 0.048 * (40 - p.A), qa = d2 < 0 ? 0 : (0.2 + Math.sqrt(d2)) / 0.024;
        return { q: q, P: p.A - 0.6 * q, qa: qa, Pa: p.A - 0.6 * qa };
      }
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Costs and revenue (£)', xl: 'Output (Q)' }), e = solve();
          if (e.q > 0) {
            const ac = AC(e.q);
            ED.area(F, [[0, ac], [e.q, ac], [e.q, e.P], [0, e.P]], e.P >= ac ? th.green : th.bad, 0.28);
            ED.key(F, [[e.P >= ac ? 'Supernormal profit' : 'Loss', e.P >= ac ? th.green : th.bad, 0.32]].concat(p.mode === 'mono' && p.eff ? [['Welfare loss', th.warn, 0.4]] : []));
            if (p.mode === 'mono' && p.eff && e.qa > e.q) ED.area(F, [[e.q, e.P], [e.q, MC(e.q)], [e.qa, e.Pa]], th.warn, 0.4);
          }
          ED.fn(F, MC, th.ink, 2.4, null, 2, 100); ED.label(F, 88, MC(88), 'MC', th.ink, { dx: 6 });
          ED.fn(F, AC, th.ink, 2.4, null, 3, 100); ED.label(F, 98, AC(98), 'AC', th.ink, { dx: -26, dy: 18 });
          ED.fn(F, AVC, th.ink3, 1.4, [5, 5], 2, 100); ED.label(F, 98, AVC(98), 'AVC', th.ink3, { dx: -34, dy: 16, size: 11 });
          if (p.mode === 'pc') { ED.seg(F, 0, p.P, 100, p.P, th.primary, 2.4); ED.label(F, 99, p.P, 'AR = MR', th.primary, { dy: -8, align: 'right', size: 12 }); }
          else {
            ED.fn(F, (q) => p.A - 0.6 * q, th.primary); ED.label(F, Math.min(98, (p.A - 6) / 0.6), 6, 'AR = D', th.primary, { dx: -60, dy: -4, size: 12 });
            ED.fn(F, (q) => p.A - 1.2 * q, th.primary, 1.8, [6, 5]); ED.label(F, Math.min(98, (p.A - 6) / 1.2), 6, 'MR', th.primary, { dx: 6, size: 12 });
          }
          if (e.q > 0) { ED.guide(F, e.q, e.P, 'P', 'Q', th.primary); ED.dot(F, e.q, MC(e.q), th.ink); ED.guide(F, e.q, AC(e.q), 'AC', null); ED.dot(F, e.q, e.P, th.primary); }
          if (p.eff) {
            const qm = minAC(); ED.dot(F, qm, AC(qm), th.green); ED.label(F, qm, AC(qm), 'productively efficient', th.green, { dy: 18, align: 'center', size: 11 });
            if (p.mode === 'mono' && e.qa) { ED.dot(F, e.qa, e.Pa, th.warn); ED.label(F, e.qa, e.Pa, 'P = MC', th.warn, { dx: 8, dy: -6, size: 11 }); }
          }
          if (e.shut) T(g, 'Price below minimum AVC: the firm shuts down', W / 2, F.Y1 + 8, { col: th.bad, size: 13, weight: 700, align: 'center' });
        },
        readouts: function () {
          const e = solve(), qm = minAC();
          if (e.q <= 0) return [['Output', '0 (shut down)'], ['Minimum AVC', money(30)]];
          const ac = AC(e.q), prof = (e.P - ac) * e.q;
          const out = [['Profit-maximising output', f(e.q, 1)], ['Price', money(e.P)], ['Average cost', money(ac)], ['Marginal cost', money(MC(e.q))], ['Total profit', (prof >= 0 ? '' : '−') + area$(Math.abs(prof)), 'th'],
            ['Profit is', Math.abs(e.P - ac) < 0.3 ? 'normal' : prof > 0 ? 'supernormal' : 'a loss'], ['Allocatively efficient?', Math.abs(e.P - MC(e.q)) < 0.5 ? 'yes (P = MC)' : 'no (P > MC)'], ['Productively efficient?', Math.abs(e.q - qm) < 1.5 ? 'yes (lowest AC)' : 'no (min AC at Q = ' + f(qm, 0) + ')']];
          if (p.mode === 'mono') out.push(['Welfare loss vs P = MC', area$(0.5 * (e.qa - e.q) * (e.P - MC(e.q))), 'th']);
          return out;
        }
      };
    }
  });

  // ---------- 9. Labour market and minimum wage ----------
  add({
    id: 'labour', name: 'Labour market and minimum wage', topics: ['eco-s3-5-t3-5-3', 'eco-s3-5-t3-5-1', 'eco-s3-5-t3-5-2', 'eco-s3-4-t3-4-6', 'eco-s3-6-t3-6-1'],
    blurb: 'Set a national minimum wage in a competitive labour market or under a monopsony employer.',
    icon: icon(AX + '<path d="M12 10l28 26M12 36l28-26"/><path d="M8 24h36" stroke-dasharray="4 3"/>'),
    controls: [
      { k: 'mode', type: 'seg', label: 'Market', options: [['comp', 'Competitive'], ['mono', 'Monopsony']], v: 'comp' },
      { k: 'nmw', label: 'Minimum wage', min: 0, max: 26, step: 0.5, v: 0, dp: 1, show: (v) => Number(v) === 0 ? 'none' : '£' + Number(v).toFixed(2) + ' an hour' },
      { k: 'ds', label: 'Demand for labour (MRP)', min: -8, max: 8, step: 0.5, v: 0, dp: 1, show: (v) => v > 0 ? '+' + v : String(v) }
    ],
    tasks: [
      'Competitive market: set a minimum wage above the equilibrium wage. Employment falls and there is unemployment (excess supply of labour).',
      'Switch to monopsony with no minimum wage. The single employer hires where MCL = MRP and pays a wage below the competitive one.',
      'Now set a minimum wage between the monopsony wage and the competitive wage. Wages and employment both rise. This is the key evaluation point for minimum wages.',
      'Raise demand for labour (higher productivity or product demand). Wages and employment rise.'
    ],
    theory: '<p>The demand for labour is derived from the demand for the product; it is the marginal revenue product of labour (MRP = MPP × MR). Labour supply slopes up: higher wages attract more workers.</p><p>A <b>monopsony</b> is a single buyer of labour. To hire one more worker it must raise the wage for everyone, so its marginal cost of labour (MCL) is above the supply curve (ACL). It hires where MCL = MRP, employing fewer people at a lower wage than a competitive market.</p><p class="eq">Competitive: W where S = D &nbsp;&nbsp; Monopsony: L where MCL = MRP, W read off ACL</p><p>A minimum wage set in the right range removes the monopsonist’s incentive to hold wages down, so both wages and employment can rise.</p>',
    exam: [
      ['Draw it', ['Label Wage rate (W) and Quantity of labour (L).', 'Draw D = MRP and S = ACL; for monopsony add MCL above ACL.', 'Mark the equilibrium wage and employment.', 'Draw the minimum wage as a horizontal line and mark the new employment and any unemployment.'], 'ol'],
      ['Evaluate', ['The effect depends on how far above the market wage it is set, and on labour demand elasticity.', 'In monopsony labour markets employment can rise.', 'Firms may cut hours, training or non-wage benefits, or replace workers with machines.', 'Higher wages raise incentives to work and may boost productivity (efficiency wage).'], ''],
      ['Real world', ['The UK National Minimum Wage was introduced in April 1999, and the higher National Living Wage for older workers in 2016.', 'Supermarkets buying from farmers and the NHS employing nurses are often given as examples of monopsony power.'], '']
    ],
    create: function (p) {
      const D = (l) => 30 + p.ds - 0.25 * l, S = (l) => 5 + 0.2 * l, MCL = (l) => 5 + 0.4 * l;
      const Ld = (w) => Math.max(0, (30 + p.ds - w) / 0.25), Ls = (w) => Math.max(0, (w - 5) / 0.2);
      function solve() {
        const Lc = (25 + p.ds) / 0.45, Wc = S(Lc);
        if (p.mode === 'comp') {
          if (p.nmw > Wc) return { L: Ld(p.nmw), W: p.nmw, U: Ls(p.nmw) - Ld(p.nmw), Lc: Lc, Wc: Wc, base: Lc };
          return { L: Lc, W: Wc, U: 0, Lc: Lc, Wc: Wc, base: Lc };
        }
        const Lm = (25 + p.ds) / 0.65, Wm = S(Lm);
        if (!p.nmw || p.nmw <= Wm) return { L: Lm, W: Wm, U: 0, Lc: Lc, Wc: Wc, Lm: Lm, Wm: Wm, base: Lm };
        if (p.nmw <= Wc) return { L: Ls(p.nmw), W: p.nmw, U: 0, Lc: Lc, Wc: Wc, Lm: Lm, Wm: Wm, base: Lm };
        return { L: Ld(p.nmw), W: p.nmw, U: Ls(p.nmw) - Ld(p.nmw), Lc: Lc, Wc: Wc, Lm: Lm, Wm: Wm, base: Lm };
      }
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Wage rate (W, £ an hour)', xl: 'Quantity of labour (L)', ymax: 35 }), e = solve();
          ED.fn(F, D, th.ink); ED.label(F, Math.min(97, (30 + p.ds - 2) / 0.25), 2, 'D = MRP', th.ink, { dx: -70, dy: -6, size: 12 });
          ED.fn(F, S, th.ink); ED.label(F, 96, S(96), p.mode === 'mono' ? 'S = ACL' : 'S', th.ink, { dx: -50, dy: 18, size: 12 });
          if (p.mode === 'mono') { ED.fn(F, MCL, th.primary); ED.label(F, 72, MCL(72), 'MCL', th.primary, { dx: 8, size: 12 }); ED.guide(F, e.Lm, e.Wm, 'Wm', 'Lm', th.primary); ED.dot(F, e.Lm, D(e.Lm), th.primary); ED.seg(F, e.Lm, D(e.Lm), e.Lm, e.Wm, th.primary, 1, [3, 3]); }
          ED.guide(F, e.Lc, e.Wc, 'We', 'Le'); ED.dot(F, e.Lc, e.Wc);
          if (p.nmw) {
            ED.seg(F, 0, p.nmw, 100, p.nmw, th.green, 2, [7, 5]); ED.label(F, 99, p.nmw, 'Minimum wage', th.green, { dy: -8, align: 'right', size: 12 });
            ED.guide(F, e.L, e.W, null, 'L₂', th.green); ED.dot(F, e.L, e.W, th.green);
            if (e.U > 0.2) ED.span(F, Ld(p.nmw), Ls(p.nmw), p.nmw, 'Unemployment', th.bad);
          }
        },
        readouts: function () {
          const e = solve();
          return [['Wage', money(e.W) + ' an hour'], ['Employment', f(e.L, 1)], ['Unemployment (excess supply)', f(e.U, 1), 'th'], ['Competitive wage', money(e.Wc), 'th'], ['Change in employment vs no minimum wage', (e.L >= e.base ? '+' : '') + f(e.L - e.base, 1), 'th']];
        }
      };
    }
  });

  // ---------- 10. Lorenz curve and Gini ----------
  const GINI = { none: null, nor: [0.27, 'Norway ≈ 0.27'], uk: [0.35, 'UK ≈ 0.35'], za: [0.63, 'South Africa ≈ 0.63'] };
  add({
    id: 'lorenz', name: 'Lorenz curve and Gini coefficient', topics: ['eco-s4-2-t4-2-2', 'eco-s4-2-t4-2-1', 'eco-s4-3-t4-3-1'],
    blurb: 'Change how equally income is shared and watch the Lorenz curve and the Gini coefficient respond.',
    icon: icon(AX + '<path d="M8 40L40 8"/><path d="M8 40 Q34 38 40 8"/>'),
    aspect: 0.8, maxH: 540,
    controls: [
      { k: 'G', label: 'Gini coefficient', min: 0, max: 0.8, step: 0.01, v: 0.35, dp: 2 },
      { k: 'cmp', type: 'seg', label: 'Compare with', options: [['none', 'None'], ['nor', 'Norway'], ['uk', 'UK'], ['za', 'South Africa']], v: 'none' }
    ],
    tasks: [
      'Set the Gini to 0: perfect equality, the Lorenz curve sits on the 45° line.',
      'Increase it. The curve bows further from the line, and the share of income going to the poorest 20% shrinks.',
      'Compare the UK and South Africa. What share of income do the poorest half of people get in each?',
      'The Gini coefficient = area A ÷ (A + B). Check it against the shaded areas.'
    ],
    theory: '<p>The Lorenz curve plots the cumulative share of income against the cumulative share of the population, from poorest to richest. The 45° line is perfect equality.</p><p class="eq">Gini coefficient = A ÷ (A + B), from 0 (perfect equality) to 1 (one person has everything)</p><p>Inequality can be measured for income or wealth (wealth is usually far more unequal). Causes include differences in skills and education, discrimination, inheritance and the tax and benefit system. Note that the curve here is a smooth model; real data has its own shape.</p>',
    exam: [
      ['Draw it', ['Label the axes Cumulative % of population and Cumulative % of income, both 0 to 100.', 'Draw the 45° line of perfect equality.', 'Draw the Lorenz curve bowed below it; label area A between them and area B underneath.', 'State Gini = A / (A + B); a more unequal society has a curve further from the line.'], 'ol'],
      ['Evaluate', ['Gini summarises the whole distribution in one number, so different shapes can share a Gini.', 'Income inequality is not the same as poverty: absolute poverty can fall while inequality rises.', 'Some inequality creates incentives; too much can harm growth and social mobility.'], ''],
      ['Real world', ['Nordic countries such as Norway have some of the lowest Gini coefficients, around 0.27.', 'South Africa has one of the highest in the world, around 0.63.', 'The UK is around 0.35 for disposable income: high for Western Europe.'], '']
    ],
    create: function (p) {
      // Average of two standard Lorenz shapes with the same Gini, so both tails look realistic (the Gini of the average is the average Gini).
      const L = (x, G) => { const k = (1 + G) / (1 - G); return (Math.pow(x, k) + 1 - Math.pow(1 - x, 1 / k)) / 2; };
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Cumulative % of income', xl: 'Cumulative % of population' }), curve = [];
          for (let i = 0; i <= 100; i++) curve.push([i, 100 * L(i / 100, p.G)]);
          ED.area(F, [[0, 0], [100, 100]].concat(curve.slice().reverse()), th.phy, 0.22);
          ED.area(F, curve.concat([[100, 0]]), th.green, 0.16);
          ED.seg(F, 0, 0, 100, 100, th.ink, 1.8); ED.label(F, 62, 66, 'Line of perfect equality', th.ink, { dx: -8, dy: -8, align: 'right', size: 12 });
          ED.fn(F, (x) => 100 * L(x / 100, p.G), th.primary); ED.label(F, 80, 100 * L(0.8, p.G), 'Lorenz curve', th.primary, { dx: 8, dy: 14, size: 12 });
          ED.label(F, 52, (52 + 100 * L(0.52, p.G)) / 2, 'A', th.phy, { size: 18, align: 'center' });
          ED.label(F, 80, 100 * L(0.8, p.G) / 3, 'B', th.green, { size: 18, align: 'center' });
          const c = GINI[p.cmp];
          if (c) { ED.fn(F, (x) => 100 * L(x / 100, c[0]), th.ink3, 1.6, [6, 5]); ED.label(F, 55, 100 * L(0.55, c[0]), c[1], th.ink3, { dx: 6, dy: 14, size: 11 }); }
          ED.guide(F, 20, 100 * L(0.2, p.G), null, '20%', th.ink3); ED.guide(F, 50, 100 * L(0.5, p.G), null, '50%', th.ink3);
          for (let v = 20; v <= 100; v += 20) T(g, v + '', F.X0 - 8, F.sy(v) + 4, { col: th.ink3, size: 11, align: 'right' });
        },
        readouts: function () {
          const out = [['Gini coefficient', f(p.G, 2), 'th'], ['Income share of poorest 20%', f(100 * L(0.2, p.G), 1) + '%'], ['Income share of poorest 50%', f(100 * L(0.5, p.G), 1) + '%'], ['Income share of richest 20%', f(100 - 100 * L(0.8, p.G), 1) + '%'], ['Income share of richest 10%', f(100 - 100 * L(0.9, p.G), 1) + '%']];
          const c = GINI[p.cmp]; if (c) out.push([c[1].split(' ≈')[0] + ': poorest 50% get', f(100 * L(0.5, c[0]), 1) + '%']);
          return out;
        }
      };
    }
  });

  // ---------- 11. Tariffs and free trade ----------
  add({
    id: 'tariff', name: 'Tariffs and free trade', topics: ['eco-s4-1-t4-1-6', 'eco-s4-1-t4-1-2', 'eco-s4-1-t4-1-5'],
    blurb: 'Open a market to world trade, then put a tariff on imports. See imports, tariff revenue and the welfare losses.',
    icon: icon(AX + '<path d="M12 10l28 26M12 36l28-26M8 32h36M8 24h36" />'),
    controls: [
      { k: 'pw', label: 'World price', min: 10, max: 50, step: 1, v: 24, dp: 0, show: (v) => '£' + v },
      { k: 'tar', label: 'Tariff per unit', min: 0, max: 25, step: 1, v: 10, dp: 0, show: (v) => '£' + v }
    ],
    tasks: [
      'With no tariff, the domestic price falls to the world price. Consumers gain, domestic producers lose market share, and the gap is filled by imports.',
      'Add a £10 tariff. The domestic price rises, domestic producers supply more, imports fall and the government collects revenue (blue).',
      'The two red triangles are deadweight losses: inefficient domestic production and consumption that no longer happens.',
      'Raise the tariff until imports disappear: a prohibitive tariff, with no revenue.'
    ],
    theory: '<p>With free trade, a small country can buy as much as it likes at the world price (Pw), so world supply is horizontal at Pw. Domestic firms supply what they can at that price; imports make up the rest of demand.</p><p class="eq">Imports = Qd − Qs &nbsp;&nbsp; Tariff revenue = tariff × imports after the tariff</p><p>A tariff raises the domestic price to Pw + t. Domestic producer surplus rises, consumer surplus falls by more, and the government gains revenue. The net loss is the two deadweight triangles. Other protectionist measures include quotas, subsidies to domestic firms and non-tariff barriers.</p>',
    exam: [
      ['Draw it', ['Draw domestic D and S, and a horizontal world supply line at Pw below the domestic equilibrium.', 'Mark Q₁ (domestic supply) and Q₂ (demand) at Pw; imports are Q₁ to Q₂.', 'Draw a second horizontal line at Pw + tariff and mark the new Q₃ and Q₄.', 'Shade the tariff revenue rectangle and the two deadweight loss triangles.'], 'ol'],
      ['Evaluate', ['Protecting infant industries or strategic industries may justify a tariff.', 'Retaliation by other countries can start a trade war.', 'Consumers pay higher prices; firms using imported inputs face higher costs.', 'It goes against comparative advantage and WTO rules.'], ''],
      ['Real world', ['In 2018 the US put 25% tariffs on imported steel and 10% on aluminium; several trading partners retaliated.', 'The EU charges a common external tariff on many goods from outside the customs union.'], '']
    ],
    create: function (p) {
      const Qd = (P) => Math.max(0, (100 - P) / 0.8), Qs = (P) => Math.max(0, (P - 10) / 0.8);
      const pt = () => Math.min(55, p.pw + p.tar);
      return {
        reset: function () {}, step: function () {},
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { xmax: 125 }), P2 = pt();
          const s1 = Qs(p.pw), d1 = Qd(p.pw), s2 = Qs(P2), d2 = Qd(P2);
          if (p.tar) {
            ED.area(F, [[0, p.pw], [s1, p.pw], [s2, P2], [0, P2]], th.green, 0.22);
            ED.area(F, [[s1, p.pw], [s2, p.pw], [s2, P2]], th.bad, 0.42);
            ED.area(F, [[s2, p.pw], [d2, p.pw], [d2, P2], [s2, P2]], th.phy, 0.24);
            ED.area(F, [[d2, p.pw], [d1, p.pw], [d2, P2]], th.bad, 0.42);
            ED.key(F, [['Gain to domestic producers', th.green, 0.28], ['Tariff revenue', th.phy, 0.3], ['Deadweight loss', th.bad, 0.42]]);
          }
          ED.fn(F, (q) => 100 - 0.8 * q, th.ink); ED.label(F, 118, 100 - 0.8 * 118, 'D', th.ink, { dx: 6 });
          ED.fn(F, (q) => 10 + 0.8 * q, th.ink); ED.label(F, 105, 94, 'S domestic', th.ink, { dx: -84, dy: 4, size: 12 });
          ED.seg(F, 0, p.pw, 125, p.pw, th.primary, 2.2); ED.label(F, 124, p.pw, 'Sw (world price)', th.primary, { dy: 16, align: 'right', size: 12 });
          if (p.tar) { ED.seg(F, 0, P2, 125, P2, th.primary, 2, [7, 5]); ED.label(F, 124, P2, 'Sw + tariff', th.primary, { dy: -8, align: 'right', size: 12 }); }
          ED.guide(F, 56.25, 55, 'Pe', null, th.ink3);
          ED.guide(F, s1, p.pw, 'Pw', 'Q₁'); ED.guide(F, d1, p.pw, null, 'Q₂');
          if (p.tar) { ED.guide(F, s2, P2, 'Pw+t', 'Q₃', th.primary); ED.guide(F, d2, P2, null, 'Q₄', th.primary); }
          ED.span(F, p.tar ? s2 : s1, p.tar ? d2 : d1, Math.max(p.pw, P2) + 6, p.tar ? 'Imports after tariff' : 'Imports', th.ink2);
        },
        readouts: function () {
          const P2 = pt(), s1 = Qs(p.pw), d1 = Qd(p.pw), s2 = Qs(P2), d2 = Qd(P2), t = P2 - p.pw;
          const dCS = -((d1 + d2) / 2) * t, dPS = ((s1 + s2) / 2) * t, rev = t * (d2 - s2), dwl = 0.5 * t * (s2 - s1) + 0.5 * t * (d1 - d2);
          return [['Domestic price', money(P2)], ['Imports before → after', f(d1 - s1, 1) + ' → ' + f(Math.max(0, d2 - s2), 1)], ['Domestic production', f(s1, 1) + ' → ' + f(s2, 1)], ['Tariff revenue', area$(rev), 'th'], ['Change in consumer surplus', '−' + area$(-dCS), 'th'], ['Change in producer surplus', '+' + area$(dPS), 'th'], ['Deadweight loss', area$(dwl), 'th']];
        }
      };
    }
  });

  // ---------- 12. The multiplier ----------
  add({
    id: 'multiplier', name: 'The multiplier', topics: ['eco-s2-4-t2-4-4', 'eco-s2-4-t2-4-2', 'eco-s2-6-t2-6-2'],
    blurb: 'Inject spending into the economy and watch it ripple through round after round of spending.',
    icon: icon('<path d="M6 40h36"/><rect x="8" y="10" width="6" height="30"/><rect x="17" y="22" width="6" height="18"/><rect x="26" y="30" width="6" height="10"/><rect x="35" y="35" width="6" height="5"/>'),
    graph: true, graphH: 200,
    controls: [
      { k: 'inj', label: 'Injection (for example, government spending)', min: 1, max: 50, step: 1, v: 10, dp: 0, show: (v) => '£' + v + 'bn' },
      { k: 'mpw', label: 'Marginal propensity to withdraw (MPS + MPT + MPM)', min: 0.1, max: 0.8, step: 0.01, v: 0.4, dp: 2 }
    ],
    tasks: [
      'With MPW = 0.4, £10bn of extra government spending raises GDP by £25bn in the end: the multiplier is 2.5.',
      'Lower the MPW (people save, pay in tax and import less of each extra pound). The multiplier gets bigger.',
      'Raise the MPW to 0.8: a very open economy with high taxes. The multiplier is only 1.25.',
      'Watch the rounds: most of the final effect comes in the first few rounds.'
    ],
    theory: '<p>An injection of spending becomes someone’s income. They spend part of it (the marginal propensity to consume, MPC) and the rest leaks out as savings, tax or imports (withdrawals). The spending becomes someone else’s income, and so on.</p><p class="eq">Multiplier k = 1 / (1 − MPC) = 1 / MPW &nbsp;&nbsp; ΔGDP = k × Δinjection</p><p>Injections are investment, government spending and exports (I, G, X); withdrawals are savings, taxes and imports (S, T, M). The multiplier works in reverse too: a fall in spending causes a bigger fall in GDP.</p>',
    exam: [
      ['Use it', ['Define the multiplier: the process by which an injection causes a proportionally larger change in national income.', 'Calculate it: k = 1 / MPW, then ΔY = k × ΔJ.', 'Explain the rounds of spending in a short chain of reasoning.', 'Show it on an AD/AS diagram as AD shifting further than the first injection.'], 'ol'],
      ['Evaluate', ['The size of the multiplier is uncertain and changes over time.', 'Time lags: it takes months for the effects to work through.', 'If the economy is near full capacity, the extra demand causes inflation rather than output.', 'Crowding out: government borrowing may raise interest rates and reduce private investment.'], ''],
      ['Real world', ['Infrastructure projects are often justified by their multiplier effects on local jobs and spending.', 'An open economy like the UK, which imports a lot, has a smaller multiplier than a more closed one.'], '']
    ],
    create: function (p) {
      const S = { t: 0 };
      const rounds = () => { const out = []; let x = p.inj; for (let i = 0; i < 14; i++) { out.push(x); x *= 1 - p.mpw; } return out; };
      return {
        reset: function () { S.t = 0; }, change: function () { S.t = 0; },
        step: function (dt) { S.t += dt; },
        draw: function (g, W, H, p, th) {
          const r = rounds(), shown = Math.min(r.length, Math.floor(S.t / 0.45) + 1), x0 = 60, x1 = W - 30, y0 = H - 46, y1 = 40;
          const bw = (x1 - x0) / r.length, sc = (y0 - y1) / p.inj;
          g.strokeStyle = th.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, y1 - 10); g.lineTo(x0, y0); g.lineTo(x1 + 10, y0); g.stroke();
          T(g, 'Extra spending in each round (£bn)', x0 + 10, y1 - 16, { col: th.ink, size: 12, weight: 600 });
          for (let i = 0; i < shown; i++) {
            const h = r[i] * sc, x = x0 + i * bw + 6;
            g.fillStyle = i === 0 ? th.primary : th.phy; g.globalAlpha = i === 0 ? 1 : 0.75; g.fillRect(x, y0 - h, bw - 12, h); g.globalAlpha = 1;
            T(g, i === 0 ? 'J' : String(i), x + (bw - 12) / 2, y0 + 16, { col: th.ink3, size: 11, align: 'center' });
            if (bw > 40) T(g, f(r[i], 1), x + (bw - 12) / 2, y0 - h - 6, { col: th.ink2, size: 11, align: 'center' });
          }
          const tot = r.slice(0, shown).reduce((a, b) => a + b, 0);
          T(g, 'Total so far: £' + f(tot, 1) + 'bn of £' + f(p.inj / p.mpw, 1) + 'bn', x1, y1 + 4, { col: th.ink, size: 14, weight: 700, align: 'right' });
          T(g, 'Round', x1, y0 + 34, { col: th.ink, size: 12, weight: 600, align: 'right' });
        },
        graph: function (g, W, H, p, th) {
          const r = rounds(); let c = 0; const pts = [[0, 0]].concat(r.map((x, i) => [i + 1, (c += x)]));
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: 14, y0: 0, y1: p.inj / p.mpw * 1.1, xl: 'rounds of spending', yl: 'total change in GDP (£bn)', series: [{ pts: pts, col: th.phy }, { pts: pts, col: th.phy, dots: true, r: 3 }], hlines: [{ y: p.inj / p.mpw, label: 'final ΔY = k × J' }] });
        },
        readouts: function () {
          const k = 1 / p.mpw, r = rounds(); let n = 0, c = 0; while (c < 0.9 * p.inj * k && n < 200) { c += p.inj * Math.pow(1 - p.mpw, n); n++; }
          return [['MPC = 1 − MPW', f(1 - p.mpw, 2)], ['Multiplier k = 1/MPW', f(k, 2), 'th'], ['Final change in GDP', '£' + f(p.inj * k, 1) + 'bn', 'th'], ['Rounds to reach 90%', String(n)], ['Second round of spending', '£' + f(r[1], 2) + 'bn']];
        }
      };
    }
  });

  // ---------- 13. Exchange rates ----------
  add({
    id: 'forex', name: 'Exchange rates', topics: ['eco-s4-1-t4-1-8', 'eco-s4-1-t4-1-9', 'eco-s4-1-t4-1-7'],
    blurb: 'The pound as a market: shift the demand for and supply of sterling and see it appreciate or depreciate.',
    icon: icon(AX + '<path d="M12 10l28 26M12 36l28-26"/><text x="30" y="22" font-size="11" fill="currentColor" stroke="none" font-family="serif">£</text>'),
    controls: [
      { k: 'dD', label: 'Demand for pounds', min: -25, max: 25, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v + ' (rises)' : v < 0 ? v + ' (falls)' : 'no change' },
      { k: 'dS', label: 'Supply of pounds', min: -25, max: 25, step: 1, v: 0, dp: 0, show: (v) => v > 0 ? '+' + v + ' (rises)' : v < 0 ? v + ' (falls)' : 'no change' }
    ],
    actions: [{ id: 'rates', label: 'UK raises interest rates' }, { id: 'exports', label: 'UK exports boom' }, { id: 'imports', label: 'UK imports rise' }, { id: 'spec', label: 'Speculators sell £' }, { id: 'clear', label: 'Back to start' }],
    tasks: [
      'Press <i>UK raises interest rates</i>. Hot money flows in to earn higher returns: demand for pounds rises, so the pound appreciates.',
      'Press <i>UK imports rise</i>. UK buyers sell pounds to buy foreign currency: supply of pounds rises and the pound depreciates.',
      'Remember SPICED: a Strong Pound makes Imports Cheaper and Exports Dearer.',
      'A depreciation helps exporters but raises import prices and can add to inflation.'
    ],
    theory: '<p>In a floating system the exchange rate is the price of one currency in terms of another, set by demand and supply. Demand for pounds comes from foreigners buying UK exports, investing in the UK (including “hot money” chasing interest rates) and speculation. Supply of pounds comes from UK residents buying imports and investing abroad.</p><p class="eq">Appreciation: £ buys more foreign currency &nbsp;&nbsp; Depreciation: £ buys less</p><p>A stronger pound makes UK exports dearer and imports cheaper (SPICED), worsening the trade balance but lowering inflation. The Marshall–Lerner condition says a depreciation improves the current account only if the combined price elasticities of exports and imports are greater than 1; the J-curve says it may get worse first.</p>',
    exam: [
      ['Draw it', ['Label the axes Price of £ (in $ or €) and Quantity of £.', 'Draw D£ and S£ and mark the original exchange rate.', 'Shift the right curve with an arrow, depending on the cause.', 'Mark the new exchange rate and say whether the pound has appreciated or depreciated.'], 'ol'],
      ['Evaluate', ['Elasticities of exports and imports (Marshall–Lerner, J-curve).', 'Exchange rates are volatile, especially because of speculation.', 'Effects on inflation, growth and the current account can conflict.', 'Non-price competitiveness matters too: quality, brand, reliability.'], ''],
      ['Real world', ['The pound fell sharply after the EU referendum in June 2016.', 'Rising Bank of England interest rates in 2022–23 increased demand for sterling assets.'], '']
    ],
    create: function (p) {
      const a0 = 85, c0 = 15, b = 0.7, d = 0.7;
      const rate = (P) => (P / 50 * 1.25);
      const eqm = (dD, dS) => { const a = a0 + b * dD, c = c0 - d * dS, Q = (a - c) / (b + d); return { a: a, c: c, Q: Q, P: a - b * Q }; };
      const inst = {
        reset: function () {}, step: function () {},
        action: function (id) {
          if (id === 'rates') { p.dD = 14; p.dS = -6; }
          if (id === 'exports') { p.dD = 14; p.dS = 0; }
          if (id === 'imports') { p.dD = 0; p.dS = 14; }
          if (id === 'spec') { p.dD = -12; p.dS = 10; }
          if (id === 'clear') { p.dD = 0; p.dS = 0; }
          syncUI(p);
        },
        draw: function (g, W, H, p, th) {
          const F = ED.frame(g, W, H, th, { yl: 'Price of £ (in $)', xl: 'Quantity of £' }), e0 = eqm(0, 0), e1 = eqm(p.dD, p.dS), col = th.primary;
          ED.fn(F, (q) => a0 - b * q, th.ink); ED.label(F, (a0 - 6) / b, 6, p.dD ? 'D£₁' : 'D£', th.ink, { dx: 6 });
          ED.fn(F, (q) => c0 + d * q, th.ink); ED.label(F, (92 - c0) / d, 92, p.dS ? 'S£₁' : 'S£', th.ink, { dx: 6 });
          if (p.dD) { ED.fn(F, (q) => e1.a - b * q, col); ED.label(F, (e1.a - 6) / b, 6, 'D£₂', col, { dx: 6 }); ED.shift(F, (a0 - 60) / b, 60, (e1.a - 60) / b, 60, col); }
          if (p.dS) { ED.fn(F, (q) => e1.c + d * q, col); ED.label(F, Math.min(97, (92 - e1.c) / d), Math.min(92, e1.c + d * 97), 'S£₂', col, { dx: 6 }); ED.shift(F, (40 - c0) / d, 40, (40 - e1.c) / d, 40, col); }
          ED.guide(F, e0.Q, e0.P, '$' + rate(e0.P).toFixed(2), null); ED.dot(F, e0.Q, e0.P);
          if (p.dD || p.dS) { ED.guide(F, e1.Q, e1.P, '$' + rate(e1.P).toFixed(2), null, col); ED.dot(F, e1.Q, e1.P, col); }
        },
        readouts: function () {
          const e0 = eqm(0, 0), e1 = eqm(p.dD, p.dS), ch = (rate(e1.P) / rate(e0.P) - 1) * 100;
          return [['Exchange rate before', '£1 = $' + rate(e0.P).toFixed(2)], ['Exchange rate now', '£1 = $' + rate(e1.P).toFixed(2)], ['Change', (ch >= 0 ? '+' : '') + f(ch, 1) + '%', 'th'],
            ['The pound has', Math.abs(ch) < 0.05 ? 'not changed' : ch > 0 ? 'appreciated' : 'depreciated'], ['UK exports become', Math.abs(ch) < 0.05 ? '–' : ch > 0 ? 'dearer abroad' : 'cheaper abroad'], ['UK imports become', Math.abs(ch) < 0.05 ? '–' : ch > 0 ? 'cheaper' : 'dearer']];
        }
      };
      return inst;
    }
  });
})(window.RH = window.RH || {});
