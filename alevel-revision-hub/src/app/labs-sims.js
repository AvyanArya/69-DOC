/* The physics labs. Each one integrates the real equations (SI units throughout) and draws itself on a canvas.
   A lab: create(p) returns { reset, step(dt, p), draw(g, w, h, p, th), graph(g, w, h, p, th), readouts(p), change, action, extra }. */
(function (RH) {
  'use strict';
  const LB = RH.labs, f = LB.fmt, T = LB.text, U = RH.util, esc = U.esc;
  const icon = (d) => '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const GRAV = [[9.81, 'Earth (9.81 m/s²)'], [1.62, 'Moon (1.62 m/s²)'], [3.71, 'Mars (3.71 m/s²)'], [24.8, 'Jupiter (24.8 m/s²)']];
  const rk4 = function (x, v, t, h, acc) {
    const a1 = acc(x, v, t), x2 = x + v * h / 2, v2 = v + a1 * h / 2, a2 = acc(x2, v2, t + h / 2);
    const x3 = x + v2 * h / 2, v3 = v + a2 * h / 2, a3 = acc(x3, v3, t + h / 2), x4 = x + v3 * h, v4 = v + a3 * h, a4 = acc(x4, v4, t + h);
    return [x + h * (v + 2 * v2 + 2 * v3 + v4) / 6, v + h * (a1 + 2 * a2 + 2 * a3 + a4) / 6];
  };

  // ---------- 1. Projectile motion ----------
  const BALLS = { football: { m: 0.43, d: 0.22, cd: 0.25 }, golf: { m: 0.046, d: 0.0427, cd: 0.25 }, pingpong: { m: 0.0027, d: 0.04, cd: 0.5 }, shot: { m: 7.26, d: 0.12, cd: 0.47 } };
  LB.add({
    id: 'projectile', name: 'Projectile motion', topics: ['phy-t2-motion', 'phy-cp-cp1'],
    blurb: 'Launch a ball at any angle and speed, with or without air resistance, on Earth, the Moon, Mars or Jupiter.',
    icon: icon('<path d="M6 40 Q22 2 42 40"/><circle cx="31" cy="17" r="3" fill="currentColor"/><path d="M4 42h40"/>'),
    aspect: 0.52, maxH: 460, graph: true, graphH: 200,
    controls: [
      { k: 'v', label: 'Launch speed', min: 1, max: 40, step: 0.5, v: 18, unit: 'm/s', dp: 1 },
      { k: 'angle', label: 'Launch angle', min: 0, max: 90, step: 1, v: 45, unit: '°', dp: 0 },
      { k: 'h0', label: 'Launch height', min: 0, max: 30, step: 0.5, v: 0, unit: 'm', dp: 1 },
      { k: 'g', type: 'select', label: 'Gravity', options: GRAV, v: 9.81 },
      { k: 'drag', type: 'toggle', label: 'Air resistance', v: false, help: 'Drag force ½ρC<sub>d</sub>Av² opposes the motion.' },
      { k: 'ball', type: 'select', label: 'Ball', options: [['football', 'Football (430 g)'], ['golf', 'Golf ball (46 g)'], ['pingpong', 'Table-tennis ball (2.7 g)'], ['shot', 'Shot put (7.26 kg)']], v: 'football', when: (p) => p.drag },
      { k: 'vec', type: 'toggle', label: 'Show velocity components', v: true },
      { k: 'target', label: 'Target distance', min: 5, max: 120, step: 1, v: 40, unit: 'm', dp: 0 }
    ],
    actions: [{ id: 'fire', label: 'Fire', primary: true }, { id: 'clear', label: 'Clear shots' }],
    tasks: [
      'Fire at <b>30°</b> and then at <b>60°</b> with the same speed. Without air resistance they land in the same place. Why? (Hint: sin 2θ.)',
      'Find the angle that gives the greatest range. Now turn on air resistance and use the table-tennis ball. Is 45° still best?',
      'Switch to the Moon. Range and flight time go up by about 6×, because R = u² sin 2θ / g.',
      'Raise the launch height to 20 m. Is 45° still the best angle?',
      'Set the speed to 25 m/s and hit the target at 50 m. There are two angles that work.',
      'Fire straight across (0°) from 20 m. The time to land is the same as dropping it: t = √(2h/g). Horizontal and vertical motion are independent.'
    ],
    theory: '<p>With no air resistance the horizontal velocity is constant and the vertical acceleration is −g:</p><p class="eq">x = u cos θ · t &nbsp;&nbsp; y = h + u sin θ · t − ½ g t²</p><p class="eq">R = u² sin 2θ / g &nbsp;&nbsp; H = u² sin² θ / 2g &nbsp;&nbsp; T = 2u sin θ / g</p><p>(The range and flight-time formulas are for launch and landing at the same height.) With air resistance the drag force F = ½ ρ C<sub>d</sub> A v² acts against the velocity, so the ball loses horizontal speed and lands shorter and steeper. The simulation steps these equations 500 times a second.</p>',
    create: function (p) {
      const S = { shots: [], sc: 0 };
      const cols = () => ['#F97316', '#8B5CF6', '#EC4899', '#0EA5E9', '#EAB308'];
      function fire() {
        const a = p.angle * Math.PI / 180;
        S.shots.push({ x: 0, y: p.h0, vx: p.v * Math.cos(a), vy: p.v * Math.sin(a), t: 0, maxY: p.h0, pts: [[0, p.h0, p.v * Math.sin(a), 0]], done: false, rec: 0, v0: p.v, ang: p.angle, drag: p.drag, ball: p.ball, g: p.g, h0: p.h0 });
        if (S.shots.length > 8) S.shots.shift();
      }
      function theory() {
        const a = p.angle * Math.PI / 180, vx = p.v * Math.cos(a), vy = p.v * Math.sin(a);
        const tl = (vy + Math.sqrt(vy * vy + 2 * p.g * p.h0)) / p.g;
        return { R: vx * tl, H: p.h0 + vy * vy / (2 * p.g), T: tl, vx: vx, vy: vy };
      }
      const inst = {
        reset: function () { S.shots = []; fire(); },
        action: function (id) { if (id === 'fire') fire(); if (id === 'clear') S.shots = []; },
        step: function (dt) {
          S.shots.forEach(function (s) {
            if (s.done) return;
            const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n, B = BALLS[s.ball];
            const k = s.drag ? 0.5 * 1.2 * B.cd * Math.PI * B.d * B.d / 4 / B.m : 0;
            for (let i = 0; i < n && !s.done; i++) {
              const sp = Math.hypot(s.vx, s.vy), px = s.x, py = s.y;
              s.vx += -k * sp * s.vx * h; s.vy += (-s.g - k * sp * s.vy) * h;
              s.x += s.vx * h; s.y += s.vy * h; s.t += h;
              if (s.y > s.maxY) s.maxY = s.y;
              if (s.y < 0 && s.t > 0.001) {
                const fr = py / (py - s.y);
                s.x = px + (s.x - px) * fr; s.t -= h * (1 - fr); s.y = 0; s.done = true;
                s.impact = sp;
              }
              s.rec += h;
              if (s.rec >= 0.02 || s.done) { s.rec = 0; s.pts.push([s.x, s.y, s.vy, s.t]); }
            }
          });
        },
        draw: function (g, W, H, p, th) {
          const tr = theory();
          let X = Math.max(tr.R, p.target + 4, 10), Y = Math.max(tr.H, p.h0, 4);
          S.shots.forEach((s) => { X = Math.max(X, s.x); Y = Math.max(Y, s.maxY); });
          const want = Math.min((W - 80) / (X * 1.06), (H - 70) / (Y * 1.2));
          S.sc = S.sc ? S.sc + (want - S.sc) * 0.1 : want;
          const sc = S.sc, ox = 56, oy = H - 40, sx = (x) => ox + x * sc, sy = (y) => oy - y * sc;
          // Scene: sky, clouds drifting, grass.
          LB.sky(g, W, oy, th);
          S.cl = (S.cl || 0) + 0.15;
          [[0.15, 0.18, 1], [0.55, 0.1, 0.8], [0.82, 0.25, 1.1]].forEach((c) => LB.cloud(g, ((c[0] * W + S.cl * c[2]) % (W + 120)) - 60, c[1] * H, c[2], th));
          LB.grass(g, oy, W, H, th);
          const step = LB.nice(Math.max((W - ox) / sc, oy / sc), 8);
          g.strokeStyle = th.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)'; g.lineWidth = 1; g.beginPath();
          for (let x = 0; sx(x) < W; x += step) { g.moveTo(sx(x), oy); g.lineTo(sx(x), 0); }
          for (let y = step; sy(y) > 0; y += step) { g.moveTo(ox, sy(y)); g.lineTo(W, sy(y)); }
          g.stroke();
          for (let x = 0; sx(x) < W - 10; x += step) T(g, x + ' m', sx(x), oy + 22, { col: th.dark ? '#d8f5d9' : '#1d5b22', size: 11, align: 'center', weight: 800 });
          for (let y = step; sy(y) > 12; y += step) T(g, y + ' m', ox - 8, sy(y) + 4, { col: th.ink2, size: 11, align: 'right', weight: 800 });
          // Target: an archery boss on a stand.
          const tx = sx(p.target), tyy = oy - 30;
          g.strokeStyle = '#8B5A2B'; g.lineWidth = 4; g.beginPath(); g.moveTo(tx - 10, oy); g.lineTo(tx, tyy); g.lineTo(tx + 10, oy); g.stroke();
          ['#FFFFFF', '#1F2330', '#3B82F6', '#EF4444', '#FACC15'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.ellipse(tx, tyy, 9 - i * 1.6, 20 - i * 3.6, 0, 0, 7); g.fill(); });
          LB.shadow(g, tx, oy + 2, 16);
          // Launch tower and cannon.
          if (p.h0 > 0) { LB.box(g, ox - 14, sy(p.h0), 28, oy - sy(p.h0), '#C08552', 4); g.strokeStyle = 'rgba(0,0,0,0.12)'; for (let yy = sy(p.h0) + 10; yy < oy; yy += 12) { g.beginPath(); g.moveTo(ox - 14, yy); g.lineTo(ox + 14, yy); g.stroke(); } }
          const a = p.angle * Math.PI / 180, by = sy(p.h0);
          g.save(); g.translate(ox, by - 10); g.rotate(-a);
          const bg = g.createLinearGradient(0, -9, 0, 9); bg.addColorStop(0, '#6B7280'); bg.addColorStop(0.5, '#D1D5DB'); bg.addColorStop(1, '#374151');
          LB.rr(g, -6, -9, 46, 18, 7); g.fillStyle = bg; g.fill();
          g.fillStyle = '#1F2937'; g.fillRect(38, -10, 6, 20);
          g.restore();
          LB.wheel(g, ox, by - 6, 11, (S.cl || 0) * 0.02);
          // Prediction without air resistance.
          g.setLineDash([2, 7]); g.lineCap = 'round'; g.strokeStyle = th.dark ? 'rgba(255,255,255,0.5)' : 'rgba(31,35,48,0.35)'; g.lineWidth = 3; g.beginPath();
          for (let i = 0; i <= 60; i++) { const t = tr.T * i / 60, x = tr.vx * t, y = p.h0 + tr.vy * t - 0.5 * p.g * t * t; if (i) g.lineTo(sx(x), sy(y)); else g.moveTo(sx(x), sy(y)); }
          g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
          // Shots.
          const C = cols(th);
          S.shots.forEach(function (s, i) {
            const latest = i === S.shots.length - 1, col = C[i % C.length];
            g.globalAlpha = latest ? 1 : 0.5; g.fillStyle = col;
            s.pts.forEach((q, j) => { if (j % 3 === 0) { g.beginPath(); g.arc(sx(q[0]), sy(q[1]), latest ? 3 : 2.2, 0, 7); g.fill(); } });
            g.globalAlpha = 1;
            if (s.done) { g.fillStyle = col; g.beginPath(); g.arc(sx(s.x), oy, 4, 0, 7); g.fill(); }
            if (!s.done || latest) {
              LB.shadow(g, sx(s.x), oy + 2, 10, 0.22 * Math.max(0.2, 1 - s.y / (Y * 1.2)));
              LB.ball(g, sx(s.x), sy(s.y) - (s.done ? 8 : 0), 8, col);
              if (p.vec && !s.done) {
                const k = 2.6, x0 = sx(s.x), y0 = sy(s.y);
                LB.arrow(g, x0, y0, x0 + s.vx * k, y0, '#2563EB', 3);
                LB.arrow(g, x0, y0, x0, y0 - s.vy * k, '#DC2626', 3);
                LB.arrow(g, x0, y0, x0 + s.vx * k, y0 - s.vy * k, th.ink, 2);
              }
            }
            if (latest && s.done) {
              const top = s.pts.reduce((m, q) => q[1] > m[1] ? q : m, s.pts[0]);
              g.setLineDash([4, 5]); g.strokeStyle = th.ink3; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx(top[0]), sy(top[1])); g.lineTo(sx(top[0]), oy); g.stroke(); g.setLineDash([]);
              const lab = 'max ' + f(s.maxY) + ' m'; g.font = '900 12px Nunito, system-ui'; const wl = g.measureText(lab).width + 16;
              LB.rr(g, sx(top[0]) + 8, sy(top[1]) - 26, wl, 22, 11); g.fillStyle = th.bg; g.fill();
              T(g, lab, sx(top[0]) + 16, sy(top[1]) - 11, { col: th.ink, size: 12, weight: 900 });
              const lr = f(s.x) + ' m'; const wr = g.measureText(lr).width + 16;
              LB.rr(g, sx(s.x) - wr / 2, oy - 46, wr, 22, 11); g.fillStyle = col; g.fill();
              T(g, lr, sx(s.x), oy - 31, { col: '#fff', size: 12, weight: 900, align: 'center' });
            }
          });
          if (p.vec) LB.legend(g, th, W - 230, 22, [['vₓ', '#2563EB'], ['v_y', '#DC2626'], ['v', th.ink]]);
          const last = S.shots[S.shots.length - 1];
          if (last && last.done && Math.abs(last.x - p.target) <= 1) {
            LB.rr(g, W / 2 - 80, 14, 160, 34, 17); g.fillStyle = '#22C55E'; g.fill();
            T(g, '🎯 Bullseye!', W / 2, 37, { col: '#fff', size: 16, weight: 900, align: 'center' });
          }
        },
        graph: function (g, W, H, p, th) {
          const s = S.shots[S.shots.length - 1], w = W / 2;
          const pts = s ? s.pts : [], tmax = Math.max(1, s ? s.t : 1);
          const ymax = Math.max(1, s ? s.maxY : 1), vmax = Math.max(1, ...pts.map((q) => Math.abs(q[2])));
          LB.plot(g, th, { x: 0, y: 0, w: w - 6, h: H, x0: 0, x1: tmax * 1.05, y0: 0, y1: ymax * 1.15, xl: 't / s', yl: 'height / m', series: [{ pts: pts.map((q) => [q[3], q[1]]), col: th.primary }] });
          LB.plot(g, th, { x: w + 6, y: 0, w: w - 6, h: H, x0: 0, x1: tmax * 1.05, y0: -vmax * 1.15, y1: vmax * 1.15, xl: 't / s', yl: 'vertical velocity / m s⁻¹', series: [{ pts: pts.map((q) => [q[3], q[2]]), col: th.bad }] });
        },
        readouts: function () {
          const s = S.shots[S.shots.length - 1], tr = theory();
          return [
            ['Flight time', s ? f(s.t) + ' s' : '–'], ['Range', s && s.done ? f(s.x) + ' m' : '–'], ['Max height', s ? f(s.maxY) + ' m' : '–'], ['Impact speed', s && s.done ? f(s.impact) + ' m/s' : '–'],
            ['Predicted range (no air)', f(tr.R) + ' m', 'th'], ['Predicted max height', f(tr.H) + ' m', 'th'], ['Predicted flight time', f(tr.T) + ' s', 'th']
          ];
        },
        extra: function () {
          const done = S.shots.filter((s) => s.done);
          if (!done.length) return '';
          return '<h2>Shots</h2><table class="tbl lab-tbl"><thead><tr><th>θ</th><th>u</th><th>Air</th><th>Range</th><th>Height</th></tr></thead><tbody>' +
            done.slice(-6).reverse().map((s) => '<tr><td>' + s.ang + '°</td><td>' + f(s.v0) + '</td><td>' + (s.drag ? 'on' : 'off') + '</td><td>' + f(s.x) + ' m</td><td>' + f(s.maxY) + ' m</td></tr>').join('') + '</tbody></table>';
        }
      };
      inst.reset();
      return inst;
    }
  });

  // ---------- 2. Pendulum and spring: SHM, damping, resonance ----------
  LB.add({
    id: 'shm', name: 'Pendulum and spring (SHM)', topics: ['phy-t13-shm', 'phy-t13-damping', 'phy-cp-cp16'],
    blurb: 'Time a pendulum or a mass on a spring, add damping, then drive it to find resonance.',
    icon: icon('<path d="M24 4v4M10 4h28"/><path d="M24 8 L32 34"/><circle cx="33" cy="37" r="5"/><path d="M14 30 a12 12 0 0 0 20 0" stroke-dasharray="3 3"/>'),
    aspect: 0.5, maxH: 420, graph: true, graphH: 210,
    controls: [
      { k: 'mode', type: 'seg', label: 'Oscillator', options: [['pendulum', 'Pendulum'], ['spring', 'Mass on a spring']], v: 'pendulum' },
      { k: 'L', label: 'String length', min: 0.1, max: 2.5, step: 0.05, v: 1, unit: 'm', dp: 2, when: (p) => p.mode === 'pendulum' },
      { k: 'm', label: 'Mass', min: 0.1, max: 2, step: 0.05, v: 0.5, unit: 'kg', dp: 2 },
      { k: 'k', label: 'Spring constant', min: 5, max: 100, step: 1, v: 20, unit: 'N/m', dp: 0, when: (p) => p.mode === 'spring' },
      { k: 'amp', label: 'Release angle', min: 2, max: 85, step: 1, v: 10, unit: '°', dp: 0, when: (p) => p.mode === 'pendulum' },
      { k: 'ampx', label: 'Release displacement', min: 0, max: 0.3, step: 0.01, v: 0.1, unit: 'm', dp: 2, when: (p) => p.mode === 'spring' },
      { k: 'b', label: 'Damping', min: 0, max: 2, step: 0.02, v: 0, unit: 'kg/s', dp: 2 },
      { k: 'g', type: 'select', label: 'Gravity', options: GRAV, v: 9.81, when: (p) => p.mode === 'pendulum' },
      { k: 'drive', type: 'toggle', label: 'Driving force', v: false, help: 'A motor pushes the mass with F₀ cos 2πft.', when: (p) => p.mode === 'spring' },
      { k: 'fd', label: 'Driving frequency', min: 0.1, max: 3, step: 0.01, v: 0.8, unit: 'Hz', dp: 2, when: (p) => p.mode === 'spring' && p.drive },
      { k: 'F0', label: 'Driving force', min: 0.1, max: 2, step: 0.1, v: 0.5, unit: 'N', dp: 1, when: (p) => p.mode === 'spring' && p.drive }
    ],
    actions: [{ id: 'rec', label: 'Record amplitude' }, { id: 'clearres', label: 'Clear resonance curve' }],
    tasks: [
      'Time the pendulum with L = 0.5 m, then with L = 2.0 m. Quadrupling the length doubles the period, because T ∝ √L.',
      'Change the mass on the pendulum. The period does not change.',
      'Release the pendulum at 70°. The measured period is longer than 2π√(L/g): the small-angle approximation (sin θ ≈ θ) has broken down.',
      'Mass on a spring: multiply k by 4 and the period halves. T = 2π√(m/k).',
      'Add damping and watch the amplitude decay. Total energy falls while the period hardly changes.',
      '<b>Resonance (CP16):</b> turn on driving, set a small damping, and step the driving frequency from 0.3 Hz to 2 Hz. Let it settle and press <i>Record amplitude</i> at each step. The peak is at the natural frequency f₀. More damping gives a lower, broader peak.'
    ],
    theory: '<p>An oscillator moves with simple harmonic motion when its acceleration is proportional to its displacement and directed towards equilibrium: a = −ω²x.</p><p class="eq">Mass on a spring: T = 2π √(m/k) &nbsp;&nbsp; Pendulum (small angles): T = 2π √(L/g)</p><p>The pendulum here uses the exact equation θ″ = −(g/L) sin θ − (b/m) θ′, so it shows where the small-angle formula stops working. Damping removes energy; a driving force at the natural frequency f₀ = ω₀/2π transfers energy most efficiently, giving resonance.</p>',
    create: function (p) {
      const S = { x: 0, v: 0, t: 0, hist: [], ups: [], peak: 0, amp: 0, res: [], rec: 0 };
      const isP = () => p.mode === 'pendulum';
      const acc = (x, v, t) => isP() ? -(p.g / p.L) * Math.sin(x) - (p.b / p.m) * v : -(p.k / p.m) * x - (p.b / p.m) * v + (p.drive ? p.F0 / p.m * Math.cos(2 * Math.PI * p.fd * t) : 0);
      const T0 = () => isP() ? 2 * Math.PI * Math.sqrt(p.L / p.g) : 2 * Math.PI * Math.sqrt(p.m / p.k);
      const energy = function () {
        if (isP()) return { ke: 0.5 * p.m * Math.pow(p.L * S.v, 2), pe: p.m * p.g * p.L * (1 - Math.cos(S.x)) };
        return { ke: 0.5 * p.m * S.v * S.v, pe: 0.5 * p.k * S.x * S.x };
      };
      const inst = {
        reset: function () { S.x = isP() ? p.amp * Math.PI / 180 : p.ampx; S.v = 0; S.t = 0; S.hist = []; S.ups = []; S.peak = 0; S.amp = Math.abs(S.x); S.E0 = null; },
        change: function (k) { if (['mode', 'L', 'k', 'amp', 'ampx', 'g', 'm'].indexOf(k) !== -1) { inst.reset(); if (k === 'mode' || k === 'm' || k === 'k') S.res = []; } },
        action: function (id) {
          if (id === 'clearres') S.res = [];
          if (id === 'rec') {
            if (isP() || !p.drive) { RH.toast('Switch to the mass on a spring and turn on the driving force first.'); return; }
            S.res = S.res.filter((q) => Math.abs(q[0] - p.fd) > 0.005).concat([[p.fd, S.amp * 100]]).sort((a, b) => a[0] - b[0]);
          }
        },
        step: function (dt) {
          const n = Math.max(1, Math.ceil(dt / 0.001)), h = dt / n;
          for (let i = 0; i < n; i++) {
            const px = S.x, r = rk4(S.x, S.v, S.t, h, acc);
            S.x = r[0]; S.v = r[1]; S.t += h;
            S.peak = Math.max(S.peak, Math.abs(S.x));
            if (px < 0 && S.x >= 0) { S.ups.push(S.t - h * S.x / (S.x - px)); if (S.ups.length > 6) S.ups.shift(); S.amp = S.peak; S.peak = 0; }
            S.rec += h;
            if (S.rec >= 1 / 60) { S.rec = 0; S.hist.push([S.t, S.x, S.v]); }
          }
          while (S.hist.length && S.hist[0][0] < S.t - 10) S.hist.shift();
        },
        draw: function (g, W, H, p, th) {
          const e = energy(), cx = W * 0.32;
          LB.sky(g, W, H, th, '#F3EEFF', '#FFFFFF');
          LB.box(g, cx - 130, -6, 260, 22, '#B7794A', 6);
          if (isP()) {
            const sc = (H - 70) / 2.55, px = cx + Math.sin(S.x) * p.L * sc, py = 14 + Math.cos(S.x) * p.L * sc;
            g.setLineDash([4, 5]); g.strokeStyle = th.ink3; g.beginPath(); g.moveTo(cx, 14); g.lineTo(cx, 14 + p.L * sc + 20); g.stroke(); g.setLineDash([]);
            g.strokeStyle = th.ink3; g.lineWidth = 1; g.beginPath(); g.arc(cx, 14, Math.min(60, p.L * sc * 0.4), Math.PI / 2, Math.PI / 2 - S.x, S.x > 0); g.stroke();
            g.strokeStyle = th.dark ? '#CBD5E1' : '#475569'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, 14); g.lineTo(px, py); g.stroke();
            g.fillStyle = '#334155'; g.beginPath(); g.arc(cx, 14, 5, 0, 7); g.fill();
            LB.shadow(g, px, H - 18, 14 + 8 * Math.cbrt(p.m), 0.12);
            LB.ball(g, px, py, 10 + 10 * Math.cbrt(p.m), '#8B5CF6');
            T(g, 'θ = ' + f(S.x * 180 / Math.PI, 1) + '°', cx + 10, 40 + Math.min(60, p.L * sc * 0.4), { col: th.ink2, size: 12, weight: 600 });
          } else {
            const sc = (H * 0.32) / 0.3, eq = H * 0.52;
            let topY = 14;
            if (p.drive) { const wy = 26, ang = 2 * Math.PI * p.fd * S.t; g.strokeStyle = th.ink3; g.beginPath(); g.arc(cx + 70, wy, 10, 0, 7); g.stroke(); g.fillStyle = th.accent; g.beginPath(); g.arc(cx + 70 + Math.cos(ang) * 10, wy + Math.sin(ang) * 10, 3, 0, 7); g.fill(); T(g, 'driver ' + f(p.fd) + ' Hz', cx + 86, wy + 4, { col: th.ink3, size: 11 }); }
            const my = eq + S.x * sc, bh = 22 + 16 * Math.cbrt(p.m), coils = 14;
            g.strokeStyle = th.dark ? '#CBD5E1' : '#64748B'; g.lineWidth = 3.2; g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx, topY);
            const len = my - topY - 10;
            for (let i = 0; i <= coils * 2; i++) g.lineTo(cx + (i === 0 || i === coils * 2 ? 0 : (i % 2 ? 14 : -14)), topY + 10 + len * i / (coils * 2));
            g.lineTo(cx, my); g.stroke();
            LB.box(g, cx - 30, my, 60, bh, '#8B5CF6', 10);
            T(g, f(p.m) + ' kg', cx, my + bh / 2 + 4, { col: '#fff', size: 12, weight: 700, align: 'center' });
            g.setLineDash([4, 5]); g.strokeStyle = th.ink3; g.beginPath(); g.moveTo(cx - 70, eq); g.lineTo(cx + 70, eq); g.stroke(); g.setLineDash([]);
            T(g, 'equilibrium', cx - 74, eq - 5, { col: th.ink3, size: 11, align: 'right' });
            const rx = cx + 100;
            g.strokeStyle = th.ink3; g.lineWidth = 1; g.beginPath(); g.moveTo(rx, eq - 0.3 * sc); g.lineTo(rx, eq + 0.3 * sc);
            for (let c = -30; c <= 30; c += 5) { g.moveTo(rx, eq + c / 100 * sc); g.lineTo(rx + (c % 10 ? 5 : 10), eq + c / 100 * sc); }
            g.stroke();
            for (let c = -30; c <= 30; c += 10) T(g, c + ' cm', rx + 14, eq + c / 100 * sc + 4, { col: th.ink3, size: 10 });
          }
          // Energy bars
          const E = e.ke + e.pe, bx = W * 0.68, bw = 44, top = 40, base = H - 40;
          if (S.E0 == null || S.t < 0.02) S.E0 = Math.max(E, 1e-9);
          const scale = (base - top) / Math.max(S.E0 * 1.1, E * 1.1, 1e-9);
          [['KE', e.ke, '#F97316'], ['PE', e.pe, '#8B5CF6'], ['Total', E, '#22C55E']].forEach(function (q, i) {
            const x = bx + i * (bw + 18), hgt = q[1] * scale;
            LB.rr(g, x, top, bw, base - top, 12); g.fillStyle = th.dark ? 'rgba(255,255,255,0.06)' : 'rgba(31,35,48,0.06)'; g.fill();
            if (hgt > 1) { LB.rr(g, x, base - hgt, bw, hgt, Math.min(12, hgt / 2)); g.fillStyle = q[2]; g.fill(); }
            T(g, q[0], x + bw / 2, base + 16, { col: th.ink2, size: 12, weight: 600, align: 'center' });
            T(g, f(q[1] * 1000, 1) + ' mJ', x + bw / 2, top - 8, { col: th.ink3, size: 11, align: 'center' });
          });
          T(g, 'Energy', bx, top - 24, { col: th.ink, size: 13, weight: 700 });
        },
        graph: function (g, W, H, p, th) {
          const res = !isP() && (p.drive || S.res.length), w = res ? W * 0.58 : W;
          const k = isP() ? 180 / Math.PI : 100, unit = isP() ? 'θ / °' : 'x / cm';
          const amax = Math.max(1, ...S.hist.map((q) => Math.abs(q[1] * k))) * 1.15;
          LB.plot(g, th, { x: 0, y: 0, w: w, h: H, x0: Math.max(0, S.t - 10), x1: Math.max(10, S.t), y0: -amax, y1: amax, xl: 't / s', yl: unit, series: [{ pts: S.hist.map((q) => [q[0], q[1] * k]), col: th.primary }] });
          if (res) {
            const f0 = 1 / T0(), ymax = Math.max(5, ...S.res.map((q) => q[1])) * 1.2;
            LB.plot(g, th, { x: w + 8, y: 0, w: W - w - 8, h: H, x0: 0, x1: 3, y0: 0, y1: ymax, xl: 'f / Hz', yl: 'amplitude / cm', series: [{ pts: S.res, col: th.accent, width: 1.5 }, { pts: S.res, col: th.accent, dots: true }, { pts: [[p.fd, S.amp * 100]], col: th.ink, dots: true, r: 3 }], vlines: [{ x: f0, label: 'f₀', col: th.ok }] });
          }
        },
        readouts: function () {
          const e = energy(), u = S.ups, Tm = u.length > 2 ? (u[u.length - 1] - u[u.length - 3]) / 2 : null;
          const t0 = T0();
          return [
            ['Measured period', Tm ? f(Tm, 3) + ' s' : 'timing…'], [isP() ? 'Small-angle period 2π√(L/g)' : 'Period 2π√(m/k)', f(t0, 3) + ' s', 'th'], ['Natural frequency f₀', f(1 / t0, 3) + ' Hz', 'th'],
            ['Amplitude', isP() ? f(S.amp * 180 / Math.PI, 1) + '°' : f(S.amp * 100, 1) + ' cm'], ['Kinetic energy', f(e.ke * 1000, 1) + ' mJ'], ['Potential energy', f(e.pe * 1000, 1) + ' mJ'], ['Total energy', f((e.ke + e.pe) * 1000, 1) + ' mJ']
          ];
        }
      };
      inst.reset();
      return inst;
    }
  });

  // ---------- 3. EMF and internal resistance ----------
  LB.add({
    id: 'emf', name: 'EMF and internal resistance', topics: ['phy-t3-emf', 'phy-cp-cp3'],
    blurb: 'Change the load resistance, record readings of V and I, and find the EMF and internal resistance from a graph.',
    icon: icon('<path d="M6 24h10M16 14v20M22 18v12M22 24h20"/><rect x="28" y="20" width="10" height="8"/><circle cx="12" cy="38" r="5"/>'),
    aspect: 0.48, maxH: 380, graph: true, graphH: 240,
    controls: [
      { k: 'emf', label: 'EMF of the cell, ε', min: 1.5, max: 12, step: 0.5, v: 6, unit: 'V', dp: 1 },
      { k: 'r', label: 'Internal resistance, r', min: 0, max: 5, step: 0.1, v: 1.5, unit: 'Ω', dp: 1 },
      { k: 'R', label: 'Load resistance, R', min: 0.2, max: 30, step: 0.1, v: 6, unit: 'Ω', dp: 1 },
      { k: 'noise', type: 'toggle', label: 'Realistic meter readings', v: true, help: 'Meters read to 0.01 with a small random error.' },
      { k: 'hide', type: 'toggle', label: 'Hide ε and r (find them yourself)', v: false }
    ],
    actions: [{ id: 'rec', label: 'Record reading', primary: true }, { id: 'clear', label: 'Clear readings' }],
    tasks: [
      '<b>CP3:</b> turn on <i>Hide ε and r</i>. Record at least 6 readings across a wide range of R, then read r from the gradient and ε from the y-intercept of the best-fit line.',
      'Set r = 0. The terminal p.d. no longer drops as the current rises: there are no lost volts.',
      'Watch the lost volts (Ir) as you lower R. Why does a car’s headlight dim when the starter motor runs?',
      'Find the load resistance that gives the most power in R. It is when R = r.'
    ],
    theory: '<p>A real cell has an internal resistance r, so some of its EMF is used up inside it:</p><p class="eq">ε = I(R + r) = V + Ir &nbsp;⟹&nbsp; V = −r I + ε</p><p>So a graph of terminal p.d. V against current I is a straight line with gradient −r and y-intercept ε. The power delivered to the load, P = I²R, is greatest when R = r.</p>',
    create: function (p) {
      const S = { pts: [], phase: 0 };
      const cur = () => p.emf / (p.R + p.r);
      const meter = (x) => p.noise ? Math.round(x * (1 + (Math.random() - 0.5) * 0.01) * 100) / 100 : x;
      function fit() {
        const n = S.pts.length;
        if (n < 2) return null;
        let sx = 0, sy = 0, sxx = 0, sxy = 0;
        S.pts.forEach((q) => { sx += q[0]; sy += q[1]; sxx += q[0] * q[0]; sxy += q[0] * q[1]; });
        const den = n * sxx - sx * sx;
        if (Math.abs(den) < 1e-12) return null;
        const m = (n * sxy - sx * sy) / den;
        return { m: m, c: (sy - m * sx) / n };
      }
      const inst = {
        reset: function () { S.pts = []; },
        action: function (id) { if (id === 'clear') S.pts = []; if (id === 'rec') { const I = cur(); S.pts.push([meter(I), meter(I * p.R)]); } },
        step: function (dt) { S.phase += dt * cur() * 40; },
        draw: function (g, W, H, p, th) {
          const I = cur(), V = I * p.R, x0 = W * 0.24, x1 = W * 0.8, y0 = 70, y1 = H - 46, ym = (y0 + y1) / 2;
          LB.sky(g, W, H, th, '#FFF7ED', '#FFFFFF');
          g.strokeStyle = th.dark ? '#94A3B8' : '#334155'; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
          // Wires
          g.beginPath(); g.moveTo(x0, ym - 30); g.lineTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, ym - 28); g.moveTo(x1, ym + 28); g.lineTo(x1, y1); g.lineTo(x0, y1); g.lineTo(x0, ym + 46); g.stroke();
          // Cell with internal resistance in a dashed box
          g.setLineDash([5, 4]); g.strokeStyle = th.ink3; g.lineWidth = 1; g.strokeRect(x0 - 40, ym - 40, 80, 96); g.setLineDash([]);
          g.strokeStyle = th.ink; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x0 - 18, ym - 30); g.lineTo(x0 + 18, ym - 30); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(x0 - 9, ym - 20); g.lineTo(x0 + 9, ym - 20); g.stroke();
          g.lineWidth = 2; g.beginPath(); g.moveTo(x0, ym - 20); g.lineTo(x0, ym + 4); g.stroke(); g.strokeRect(x0 - 8, ym + 4, 16, 28); g.beginPath(); g.moveTo(x0, ym + 32); g.lineTo(x0, ym + 46); g.stroke();
          T(g, 'ε' + (p.hide ? '' : ' = ' + f(p.emf, 1) + ' V'), x0 - 48, ym - 22, { col: th.ink2, size: 12, align: 'right', weight: 600 });
          T(g, 'r' + (p.hide ? '' : ' = ' + f(p.r, 1) + ' Ω'), x0 - 48, ym + 22, { col: th.ink2, size: 12, align: 'right', weight: 600 });
          // Load resistor (variable)
          LB.box(g, x1 - 13, ym - 30, 26, 60, '#F59E0B', 6);
          LB.arrow(g, x1 - 26, ym + 24, x1 + 24, ym - 24, th.ink, 1.5);
          T(g, 'R = ' + f(p.R, 1) + ' Ω', x1 + 30, ym + 4, { col: th.ink, size: 13, weight: 700 });
          // Ammeter
          const ax = (x0 + x1) / 2;
          LB.dial(g, ax, y0, 30, I / (p.emf / Math.max(0.2 + p.r, 0.2)), 'A', f(I, 2) + ' A', '#EF4444', th);
          // Voltmeter across the terminals
          const vx = x0 - 110;
          g.strokeStyle = th.ink3; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0 + 0.01); g.lineTo(vx, y0); g.lineTo(vx, ym - 17); g.moveTo(vx, ym + 17); g.lineTo(vx, y1); g.lineTo(x0, y1); g.stroke();
          LB.dial(g, vx, ym, 30, V / p.emf, 'V', f(V, 2) + ' V', '#2563EB', th);
          // Moving charge (conventional current, clockwise from +)
          const path = [[x0, ym - 30], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, ym + 46]];
          const segs = [], total = path.slice(1).reduce((a, q, i) => { const L = Math.hypot(q[0] - path[i][0], q[1] - path[i][1]); segs.push(L); return a + L; }, 0);
          g.fillStyle = '#FACC15';
          for (let dpos = S.phase % 26; dpos < total; dpos += 26) {
            let d = dpos, i = 0;
            while (i < segs.length && d > segs[i]) { d -= segs[i]; i++; }
            if (i >= segs.length) break;
            const a = path[i], b = path[i + 1], t = d / segs[i];
            const cxp = a[0] + (b[0] - a[0]) * t, cyp = a[1] + (b[1] - a[1]) * t; LB.glow(g, cxp, cyp, 9, 'rgba(250,204,21,0.8)', 0.7); g.fillStyle = '#F59E0B'; g.beginPath(); g.arc(cxp, cyp, 3.5, 0, 7); g.fill();
          }
        },
        graph: function (g, W, H, p, th) {
          const F = fit(), I = cur();
          const xmax = Math.max(I, ...S.pts.map((q) => q[0]), 0.1) * 1.2, ymax = p.emf * 1.15;
          const series = [{ pts: S.pts, col: th.primary, dots: true }];
          if (F) series.push({ pts: [[0, F.c], [xmax, F.c + F.m * xmax]], col: th.accent, width: 1.5 });
          series.push({ pts: [[I, I * p.R]], col: th.ink3, dots: true, r: 3 });
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: xmax, y0: 0, y1: ymax, xl: 'current I / A', yl: 'terminal p.d. V / V', series: series });
          if (F) T(g, 'Best fit: gradient = ' + f(F.m, 2) + ' Ω, intercept = ' + f(F.c, 2) + ' V  →  r = ' + f(-F.m, 2) + ' Ω, ε = ' + f(F.c, 2) + ' V', W - 16, 34, { col: th.accent, size: 12, weight: 700, align: 'right' });
          else T(g, 'Record two or more readings to draw a best-fit line', W - 16, 34, { col: th.ink3, size: 12, align: 'right' });
        },
        readouts: function () {
          const I = cur();
          return [['Current I', f(I, 3) + ' A'], ['Terminal p.d. V', f(I * p.R, 3) + ' V'], ['Lost volts Ir', p.hide ? '?' : f(I * p.r, 3) + ' V'], ['Power in R', f(I * I * p.R, 3) + ' W'], ['Efficiency R/(R+r)', p.hide ? '?' : f(100 * p.R / (p.R + p.r), 1) + ' %'], ['Readings', String(S.pts.length)]];
        },
        extra: function () {
          if (!S.pts.length) return '';
          return '<h2>Readings</h2><table class="tbl lab-tbl"><thead><tr><th>I / A</th><th>V / V</th></tr></thead><tbody>' + S.pts.slice().reverse().map((q) => '<tr><td>' + q[0].toFixed(2) + '</td><td>' + q[1].toFixed(2) + '</td></tr>').join('') + '</tbody></table>';
        }
      };
      return inst;
    }
  });

  // ---------- 4. Capacitor charging and discharging ----------
  LB.add({
    id: 'capacitor', name: 'Capacitor charge and discharge', topics: ['phy-t7-capacitors', 'phy-cp-cp11'],
    blurb: 'Charge and discharge a capacitor through a resistor and measure the time constant RC.',
    icon: icon('<path d="M4 24h16M28 24h16M20 12v24M28 12v24"/><path d="M8 40 Q20 8 44 6" stroke-dasharray="3 3"/>'),
    aspect: 0.42, maxH: 340, graph: true, graphH: 230, fast: 10,
    controls: [
      { k: 'Vs', label: 'Supply voltage', min: 1, max: 12, step: 0.5, v: 6, unit: 'V', dp: 1 },
      { k: 'R', label: 'Resistance', min: 1, max: 100, step: 1, v: 22, unit: 'kΩ', dp: 0 },
      { k: 'C', label: 'Capacitance', min: 10, max: 1000, step: 10, v: 220, unit: 'μF', dp: 0 },
      { k: 'mode', type: 'seg', label: 'Switch', options: [['charge', 'Charge'], ['discharge', 'Discharge']], v: 'charge' },
      { k: 'ln', type: 'toggle', label: 'Plot ln(V) instead of V', v: false, help: 'For discharge, ln V against t is a straight line with gradient −1/RC.' }
    ],
    tasks: [
      'Charge the capacitor, then switch to discharge. Read the time for V to fall to 37% of its starting value and compare it with RC.',
      'Double R, then double C. Both double the time constant.',
      'Turn on <i>Plot ln(V)</i> while discharging. The gradient of the line is −1/RC.',
      'Watch the current: it is largest at the moment you flip the switch and falls exponentially, just like the p.d. on discharge.',
      'How much energy is stored when fully charged? Check ½CV² against the readout.'
    ],
    theory: '<p>Through a resistor R, a capacitor charges and discharges exponentially with time constant τ = RC:</p><p class="eq">Discharge: V = V₀ e<sup>−t/RC</sup> &nbsp;&nbsp; Charge: V = V₀ (1 − e<sup>−t/RC</sup>) &nbsp;&nbsp; Q = CV &nbsp;&nbsp; E = ½CV²</p><p>After one time constant a discharging capacitor is at 37% of V₀ (a charging one is at 63% of the supply). Taking logs gives ln V = ln V₀ − t/RC, a straight line.</p>',
    create: function (p) {
      const S = { Vc: 0, t: 0, hist: [], V0: 0 };
      const tau = () => p.R * 1e3 * p.C * 1e-6;
      const target = () => p.mode === 'charge' ? p.Vs : 0;
      const I = () => (target() - S.Vc) / (p.R * 1e3);
      const inst = {
        reset: function () { S.Vc = 0; S.t = 0; S.hist = [[0, 0, I()]]; S.V0 = 0; },
        change: function (k) { if (k === 'ln') return; S.t = 0; S.V0 = S.Vc; S.hist = [[0, S.Vc, I()]]; },
        step: function (dt) {
          S.Vc = target() + (S.Vc - target()) * Math.exp(-dt / tau());
          S.t += dt;
          if (S.t < 8 * tau()) S.hist.push([S.t, S.Vc, I()]);
          if (S.hist.length > 3000) S.hist = S.hist.filter((q, i) => i % 2 === 0);
        },
        draw: function (g, W, H, p, th) {
          const x0 = W * 0.16, x1 = W * 0.78, y0 = 50, y1 = H - 40, ym = (y0 + y1) / 2, sw = x0 + 70;
          g.strokeStyle = th.ink; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x0, ym - 8); g.lineTo(x0, y0); g.lineTo(sw - 20, y0); g.stroke();
          g.beginPath(); g.moveTo(x0, ym + 8); g.lineTo(x0, y1); g.lineTo(x1, y1); g.lineTo(x1, ym + 8); g.moveTo(x1, ym - 8); g.lineTo(x1, y0); g.lineTo(sw + 34, y0); g.stroke();
          g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 16, ym - 8); g.lineTo(x0 + 16, ym - 8); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(x0 - 8, ym + 8); g.lineTo(x0 + 8, ym + 8); g.stroke();
          T(g, f(p.Vs, 1) + ' V', x0 - 22, ym + 4, { col: th.ink2, size: 12, weight: 600, align: 'right' });
          // Two-way switch: A goes to the battery, B to the bypass wire
          g.lineWidth = 2; g.fillStyle = th.ink;
          const A = [sw - 20, y0], P = [sw + 34, y0], B = [sw - 20, y0 + 34];
          [A, P, B].forEach((q) => { g.beginPath(); g.arc(q[0], q[1], 3.5, 0, 7); g.fill(); });
          const to = p.mode === 'charge' ? A : B;
          g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(to[0] + 4, to[1] + (to === B ? -4 : -10)); g.stroke();
          g.strokeStyle = th.ink3; g.beginPath(); g.moveTo(B[0], B[1]); g.lineTo(B[0], y1 - 0.01); g.stroke();
          T(g, 'charge', A[0] - 6, y0 - 10, { col: p.mode === 'charge' ? th.primary : th.ink3, size: 11, weight: 600, align: 'right' });
          T(g, 'discharge', B[0] - 8, B[1] + 4, { col: p.mode === 'discharge' ? th.primary : th.ink3, size: 11, weight: 600, align: 'right' });
          // Resistor
          const rx = (sw + 34 + x1) / 2;
          g.fillStyle = th.bg; g.fillRect(rx - 26, y0 - 9, 52, 18); g.strokeStyle = th.ink; g.strokeRect(rx - 26, y0 - 9, 52, 18);
          T(g, p.R + ' kΩ', rx, y0 - 16, { col: th.ink2, size: 12, weight: 600, align: 'center' });
          // Capacitor with charge
          g.lineWidth = 3; g.beginPath(); g.moveTo(x1 - 20, ym - 8); g.lineTo(x1 + 20, ym - 8); g.moveTo(x1 - 20, ym + 8); g.lineTo(x1 + 20, ym + 8); g.stroke();
          const n = Math.round(6 * S.Vc / 12);
          for (let i = 0; i < n; i++) { T(g, '+', x1 - 17 + i * 7, ym - 13, { col: th.bad, size: 11, weight: 700 }); T(g, '−', x1 - 17 + i * 7, ym + 22, { col: th.primary, size: 11, weight: 700 }); }
          T(g, p.C + ' μF', x1 + 28, ym + 4, { col: th.ink2, size: 12, weight: 600 });
          T(g, 'V = ' + f(S.Vc, 2) + ' V', x1 + 28, ym + 22, { col: th.primary, size: 13, weight: 700 });
          const i = I() * 1000;
          if (Math.abs(i) > 0.001) LB.arrow(g, rx - 30 * Math.sign(i), y0 + 20, rx + 30 * Math.sign(i), y0 + 20, th.accent, 2);
          T(g, 'I = ' + f(Math.abs(i), 3) + ' mA', rx, y0 + 40, { col: th.accent, size: 12, weight: 700, align: 'center' });
        },
        graph: function (g, W, H, p, th) {
          const t1 = Math.max(5 * tau(), S.t) * 1.02, w = W / 2, ta = tau();
          const vl = [1, 2, 3, 4, 5].map((n) => ({ x: n * ta, label: n === 1 ? 'τ' : n + 'τ' }));
          if (p.ln) {
            const pts = S.hist.filter((q) => q[1] > 1e-3).map((q) => [q[0], Math.log(q[1])]);
            const lo = Math.min(-1, ...pts.map((q) => q[1])), hi = Math.max(1, ...pts.map((q) => q[1]));
            LB.plot(g, th, { x: 0, y: 0, w: w - 6, h: H, x0: 0, x1: t1, y0: lo - 0.3, y1: hi + 0.3, xl: 't / s', yl: 'ln(V / V)', series: [{ pts: pts, col: th.primary }], vlines: vl });
          } else {
            const hl = p.mode === 'discharge' && S.V0 ? [{ y: S.V0 * 0.37, label: '37%' }] : p.mode === 'charge' ? [{ y: p.Vs * 0.63, label: '63%' }] : [];
            LB.plot(g, th, { x: 0, y: 0, w: w - 6, h: H, x0: 0, x1: t1, y0: 0, y1: Math.max(p.Vs, S.Vc) * 1.1, xl: 't / s', yl: 'p.d. across C / V', series: [{ pts: S.hist.map((q) => [q[0], q[1]]), col: th.primary }], vlines: vl, hlines: hl });
          }
          const imax = Math.max(0.01, ...S.hist.map((q) => Math.abs(q[2] * 1000))) * 1.1;
          LB.plot(g, th, { x: w + 6, y: 0, w: w - 6, h: H, x0: 0, x1: t1, y0: -imax, y1: imax, xl: 't / s', yl: 'current / mA', series: [{ pts: S.hist.map((q) => [q[0], q[2] * 1000]), col: th.accent }], vlines: vl });
        },
        readouts: function () {
          return [['Time constant τ = RC', f(tau(), 2) + ' s', 'th'], ['Time since switching', f(S.t, 1) + ' s'], ['t / τ', f(S.t / tau(), 2)], ['p.d. across C', f(S.Vc, 3) + ' V'], ['Charge Q = CV', f(p.C * S.Vc, 0) + ' μC'], ['Current', f(Math.abs(I()) * 1000, 3) + ' mA'], ['Energy ½CV²', f(0.5 * p.C * 1e-6 * S.Vc * S.Vc * 1000, 2) + ' mJ']];
        }
      };
      inst.reset();
      return inst;
    }
  });

  // ---------- 5. Young's slits and the diffraction grating ----------
  LB.add({
    id: 'slits', name: 'Young’s slits and gratings', topics: ['phy-t5-diffraction', 'phy-t5-stationary', 'phy-cp-cp8'],
    blurb: 'Shine monochromatic light through one, two or many slits and measure the interference pattern on a screen.',
    icon: icon('<path d="M18 6v14M18 26v4M18 36v6"/><path d="M4 24h10"/><path d="M22 22 a8 8 0 0 1 0 6M24 17 a14 14 0 0 1 0 16"/><path d="M42 6v36"/>'),
    aspect: 0.5, maxH: 420, graph: true, graphH: 200,
    controls: [
      { k: 'lam', label: 'Wavelength λ', min: 380, max: 750, step: 1, v: 532, unit: 'nm', dp: 0 },
      { k: 'mode', type: 'seg', label: 'Slits', options: [['1', 'Single'], ['2', 'Double'], ['5', 'Five'], ['g', 'Grating']], v: '2' },
      { k: 'd', label: 'Slit separation s', min: 0.05, max: 1, step: 0.01, v: 0.25, unit: 'mm', dp: 2, when: (p) => p.mode === '2' || p.mode === '5' },
      { k: 'a', label: 'Slit width', min: 0.01, max: 0.15, step: 0.005, v: 0.04, unit: 'mm', dp: 3, when: (p) => p.mode !== 'g' },
      { k: 'lines', label: 'Lines per mm', min: 100, max: 800, step: 10, v: 300, unit: '', dp: 0, when: (p) => p.mode === 'g' },
      { k: 'D', label: 'Slit to screen distance D', min: 0.5, max: 3, step: 0.05, v: 1.5, unit: 'm', dp: 2 }
    ],
    tasks: [
      'Double slit: double the slit separation s. The fringes get twice as close together: w = λD/s.',
      'Change the colour from blue to red. Red light gives wider fringes because its wavelength is longer.',
      'Move the screen further away. The fringe spacing grows in proportion to D.',
      'Single slit: make the slit narrower. The central maximum gets wider, and it is twice as wide as the other maxima.',
      'Compare two slits with five. The bright fringes stay in the same places but get sharper, with faint maxima between them.',
      '<b>CP8:</b> with a grating of 300 lines/mm, measure the angle to the first and second orders and use d sin θ = nλ to find λ.'
    ],
    theory: '<p>Light from each slit spreads out by diffraction. Where the waves meet in phase (a path difference of nλ) you get a bright fringe; where they are in antiphase you get a dark fringe.</p><p class="eq">Double slit: w = λD / s &nbsp;&nbsp; Grating: d sin θ = nλ, with d = 1 / (lines per metre)</p><p>The pattern drawn here is the full intensity I = I₀ (sin β / β)² (sin Nα / N sin α)², where α = πd sin θ/λ and β = πa sin θ/λ. The single-slit envelope multiplies the many-slit fringes.</p>',
    create: function (p) {
      const S = { ph: 0 };
      const N = () => p.mode === 'g' ? 40 : Number(p.mode);
      const dm = () => (p.mode === 'g' ? 1 / p.lines : p.mode === '1' ? 0 : p.d) * 1e-3;
      const am = () => (p.mode === 'g' ? 0.4 / p.lines : p.a) * 1e-3;
      const lam = () => p.lam * 1e-9;
      function I(sinT) {
        const b = Math.PI * am() * sinT / lam(), al = Math.PI * dm() * sinT / lam(), n = N();
        const env = Math.abs(b) < 1e-9 ? 1 : Math.pow(Math.sin(b) / b, 2);
        if (n === 1) return env;
        const sa = Math.sin(al), m = Math.abs(sa) < 1e-9 ? 1 : Math.pow(Math.sin(n * al) / (n * sa), 2);
        return env * m;
      }
      const yRange = () => p.mode === 'g' ? p.D * 2.2 : Math.min(0.08, Math.max(1.8 * lam() * p.D / am(), 4 * lam() * p.D / Math.max(dm(), 1e-6)));
      const intensityAt = (y) => { const th = Math.atan(y / p.D); return I(Math.sin(th)); };
      return {
        reset: function () { S.ph = 0; },
        step: function (dt) { S.ph += dt; },
        draw: function (g, W, H, p, th) {
          g.fillStyle = th.dark ? '#05070c' : '#0d1220'; g.fillRect(0, 0, W, H);
          const bx = W * 0.28, sxc = W * 0.86, cy = H / 2, col = LB.waveColour(p.lam);
          // Laser and beam
          g.fillStyle = '#3a4152'; g.fillRect(16, cy - 14, 54, 28); T(g, 'laser', 43, cy + 4, { col: '#cfd6e4', size: 11, align: 'center', weight: 600 });
          g.fillStyle = LB.waveColour(p.lam, 0.6); g.fillRect(70, cy - 3, bx - 70, 6);
          // Barrier with slits
          const n = p.mode === 'g' ? 12 : N(), gapPx = p.mode === 'g' ? 6 : Math.max(8, Math.min(40, dm() / 0.25e-3 * 18));
          const ys = []; for (let i = 0; i < n; i++) ys.push(cy + (i - (n - 1) / 2) * gapPx);
          g.fillStyle = '#9aa3b5'; g.fillRect(bx - 3, 0, 6, H);
          g.fillStyle = th.dark ? '#05070c' : '#0d1220';
          const sw = p.mode === 'g' ? 2 : Math.max(2, Math.min(8, am() / 0.04e-3 * 4));
          ys.forEach((y) => g.fillRect(bx - 4, y - sw / 2, 8, sw));
          // Wavefronts
          const wl = 10 + (p.lam - 380) / 370 * 14, sp = 60;
          g.save(); g.beginPath(); g.rect(bx + 3, 0, sxc - bx - 3, H); g.clip();
          g.lineWidth = 1.5;
          if (p.mode === 'g') {
            const dd = dm();
            for (let k = -3; k <= 3; k++) { const s = k * lam() / dd; if (Math.abs(s) >= 1) continue; const a = Math.asin(s); g.strokeStyle = LB.waveColour(p.lam, k === 0 ? 0.8 : 0.55); g.lineWidth = 3; g.beginPath(); g.moveTo(bx, cy); g.lineTo(bx + Math.cos(a) * W, cy + Math.sin(a) * W); g.stroke(); }
          } else {
            ys.forEach(function (y) {
              for (let r = (S.ph * sp) % wl; r < sxc - bx; r += wl) { g.strokeStyle = LB.waveColour(p.lam, Math.max(0, 0.45 - r / (sxc - bx) * 0.35)); g.beginPath(); g.arc(bx, y, r, -Math.PI / 2, Math.PI / 2); g.stroke(); }
            });
          }
          g.restore();
          // Screen showing the pattern
          const Y = yRange();
          for (let py = 0; py < H; py++) {
            const yv = (py - cy) / (H / 2) * Y, i = intensityAt(yv);
            g.fillStyle = LB.waveColour(p.lam, Math.min(1, Math.pow(i, 0.7)));
            g.fillRect(sxc, py, 26, 1);
          }
          g.strokeStyle = '#9aa3b5'; g.lineWidth = 1; g.strokeRect(sxc, 0, 26, H);
          T(g, 'screen', sxc + 13, H - 8, { col: '#cfd6e4', size: 11, align: 'center', weight: 600 });
          T(g, 'D = ' + f(p.D, 2) + ' m (not to scale)', (bx + sxc) / 2, H - 10, { col: '#8b93a6', size: 11, align: 'center' });
          T(g, 'λ = ' + p.lam + ' nm', 20, 24, { col: col, size: 13, weight: 700 });
        },
        graph: function (g, W, H, p, th) {
          const Y = yRange(), unit = p.mode === 'g' ? 1 : 1000, pts = [];
          for (let i = 0; i <= 600; i++) { const y = -Y + 2 * Y * i / 600; pts.push([y * unit, intensityAt(y)]); }
          const w = lam() * p.D / Math.max(dm(), 1e-9) * unit;
          const vl = p.mode === '2' || p.mode === '5' ? [{ x: w, label: 'w' }, { x: -w }] : [];
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: -Y * unit, x1: Y * unit, y0: 0, y1: 1.1, xl: p.mode === 'g' ? 'position on screen / m' : 'position on screen / mm', yl: 'relative intensity', series: [{ pts: pts, col: LB.waveColour(Math.min(700, Math.max(420, p.lam))) }], vlines: vl });
        },
        readouts: function () {
          const out = [];
          if (p.mode === '2' || p.mode === '5') out.push(['Fringe spacing w = λD/s', f(lam() * p.D / dm() * 1000, 2) + ' mm', 'th']);
          if (p.mode !== 'g') out.push(['Central maximum width 2λD/a', f(2 * lam() * p.D / am() * 1000, 1) + ' mm', 'th']);
          if (p.mode === 'g') {
            const d = dm(), nmax = Math.floor(d / lam());
            out.push(['Grating spacing d', f(d * 1e6, 3) + ' μm', 'th'], ['Highest order visible', String(nmax), 'th']);
            for (let n = 1; n <= Math.min(3, nmax); n++) { const a = Math.asin(n * lam() / d); out.push(['Order ' + n + ' angle', f(a * 180 / Math.PI, 1) + '°'], ['Order ' + n + ' on screen', f(p.D * Math.tan(a), 3) + ' m']); }
          }
          out.push(['Wavelength', p.lam + ' nm'], ['Frequency c/λ', LB.sci(3e8 / lam()) + ' Hz']);
          return out;
        }
      };
    }
  });

  // ---------- 6. Collisions ----------
  LB.add({
    id: 'collisions', name: 'Momentum and collisions', topics: ['phy-t2-momentum', 'phy-t6-impulse', 'phy-cp-cp9'],
    blurb: 'Crash two trolleys together. Momentum is always conserved; kinetic energy only in an elastic collision.',
    icon: icon('<rect x="4" y="18" width="16" height="12" rx="2"/><rect x="28" y="18" width="16" height="12" rx="2"/><circle cx="8" cy="33" r="2.5"/><circle cx="16" cy="33" r="2.5"/><circle cx="32" cy="33" r="2.5"/><circle cx="40" cy="33" r="2.5"/><path d="M20 24h8"/>'),
    aspect: 0.42, maxH: 340, graph: true, graphH: 200,
    controls: [
      { k: 'm1', label: 'Mass of A', min: 0.5, max: 5, step: 0.1, v: 2, unit: 'kg', dp: 1 },
      { k: 'u1', label: 'Velocity of A', min: -5, max: 5, step: 0.1, v: 3, unit: 'm/s', dp: 1 },
      { k: 'm2', label: 'Mass of B', min: 0.5, max: 5, step: 0.1, v: 1, unit: 'kg', dp: 1 },
      { k: 'u2', label: 'Velocity of B', min: -5, max: 5, step: 0.1, v: -1, unit: 'm/s', dp: 1 },
      { k: 'e', label: 'Elasticity (coefficient of restitution)', min: 0, max: 1, step: 0.05, v: 1, unit: '', dp: 2, show: (v) => Number(v) === 1 ? '1 (elastic)' : Number(v) === 0 ? '0 (stick together)' : Number(v).toFixed(2) }
    ],
    tasks: [
      'Equal masses, B at rest, elastic: after the collision the velocities swap and A stops dead.',
      'Set elasticity to 0. The trolleys stick together. Momentum is still conserved but kinetic energy is lost (to heat and sound).',
      'Fire a heavy trolley into a light one at rest. The light one shoots off faster than the heavy one was moving.',
      'Fire a light trolley into a heavy one. It bounces back.',
      'Check the momentum bars: the total before and after is always the same, whatever you change.'
    ],
    theory: '<p>In any collision with no external forces, total momentum is conserved:</p><p class="eq">m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂</p><p>In an elastic collision kinetic energy is also conserved; in an inelastic one some is transferred to other stores. The elasticity e is the ratio of the speed of separation to the speed of approach (e = 1 elastic, e = 0 the objects stick). Force = rate of change of momentum, F = Δp/Δt.</p>',
    create: function (p) {
      const S = {};
      const wid = (m) => 0.45 * Math.cbrt(m);
      const inst = {
        reset: function () { S.x1 = 3; S.x2 = 7; S.v1 = p.u1; S.v2 = p.u2; S.hit = false; S.t = 0; S.after = null; S.hist = []; },
        change: function () { inst.reset(); },
        step: function (dt) {
          if (S.t > 10) return;
          const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
          for (let i = 0; i < n; i++) {
            S.x1 += S.v1 * h; S.x2 += S.v2 * h; S.t += h;
            if (!S.hit && S.x2 - S.x1 <= (wid(p.m1) + wid(p.m2)) / 2 && S.v1 > S.v2) {
              const P = p.m1 * S.v1 + p.m2 * S.v2, M = p.m1 + p.m2;
              const v1 = (P + p.m2 * p.e * (S.v2 - S.v1)) / M, v2 = (P + p.m1 * p.e * (S.v1 - S.v2)) / M;
              S.v1 = v1; S.v2 = v2; S.hit = true; S.after = [v1, v2];
            }
          }
          S.hist.push([S.t, p.m1 * S.v1, p.m2 * S.v2]);
          if (S.hist.length > 900) S.hist.shift();
        },
        draw: function (g, W, H, p, th) {
          const sc = (W - 40) / 10, ox = 20, ty = H * 0.66, sx = (x) => ox + x * sc;
          LB.sky(g, W, ty, th, '#E0F2FE', '#F8FAFC');
          const tg = g.createLinearGradient(0, ty, 0, ty + 14); tg.addColorStop(0, '#94A3B8'); tg.addColorStop(1, '#475569');
          g.fillStyle = tg; g.fillRect(0, ty, W, 14); g.fillStyle = th.dark ? '#1B1D29' : '#F1F5F9'; g.fillRect(0, ty + 14, W, H - ty - 14);
          g.strokeStyle = th.ink3; g.lineWidth = 1; g.beginPath();
          for (let x = 0; x <= 10; x++) { T(g, x + ' m', sx(x), ty + 26, { col: th.ink3, size: 10, align: 'center' }); g.beginPath(); g.moveTo(sx(x), ty); g.lineTo(sx(x), ty + 6); g.stroke(); }
          [[S.x1, p.m1, S.v1, '#8B5CF6', 'A'], [S.x2, p.m2, S.v2, '#F97316', 'B']].forEach(function (c) {
            const w = wid(c[1]) * sc, hgt = 30 + 16 * Math.cbrt(c[1]), x = sx(c[0]);
            LB.shadow(g, x, ty + 2, w * 0.55, 0.15);
            LB.box(g, x - w / 2, ty - hgt - 10, w, hgt, c[3], 10);
            [x - w / 3, x + w / 3].forEach((wx) => LB.wheel(g, wx, ty - 7, 8, c[0] * 3));
            if (Math.abs(c[2]) > 0.5) { g.strokeStyle = LB.shade(c[3], 0.4); g.lineWidth = 3; for (let k = 0; k < 3; k++) { const yy = ty - hgt + k * 10, xs = x - Math.sign(c[2]) * (w / 2 + 6 + k * 4); g.beginPath(); g.moveTo(xs, yy); g.lineTo(xs - Math.sign(c[2]) * 16, yy); g.stroke(); } }
            T(g, c[4] + ' · ' + f(c[1], 1) + ' kg', x, ty - hgt / 2 - 6, { col: '#fff', size: 13, weight: 900, align: 'center' });
            if (Math.abs(c[2]) > 0.01) LB.arrow(g, x, ty - hgt - 22, x + c[2] * 18, ty - hgt - 22, c[3], 3);
            T(g, f(c[2], 2) + ' m/s', x, ty - hgt - 32, { col: th.ink, size: 12, weight: 600, align: 'center' });
          });
          if (S.hit) T(g, 'Collision', W / 2, 22, { col: th.ink3, size: 12, weight: 600, align: 'center' });
        },
        graph: function (g, W, H, p, th) {
          const pb = p.m1 * p.u1 + p.m2 * p.u2, pmax = Math.max(1, Math.abs(p.m1 * p.u1), Math.abs(p.m2 * p.u2), Math.abs(pb), ...S.hist.map((q) => Math.max(Math.abs(q[1]), Math.abs(q[2])))) * 1.2;
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: Math.max(4, S.t), y0: -pmax, y1: pmax, xl: 't / s', yl: 'momentum / kg m s⁻¹', series: [{ pts: S.hist.map((q) => [q[0], q[1]]), col: th.primary }, { pts: S.hist.map((q) => [q[0], q[2]]), col: th.accent }, { pts: S.hist.map((q) => [q[0], q[1] + q[2]]), col: th.ink, width: 2.5 }] });
          LB.legend(g, th, W - 260, 24, [['A', th.primary], ['B', th.accent], ['Total', th.ink]]);
        },
        readouts: function () {
          const pb = p.m1 * p.u1 + p.m2 * p.u2, kb = 0.5 * p.m1 * p.u1 * p.u1 + 0.5 * p.m2 * p.u2 * p.u2;
          const out = [['Momentum before', f(pb, 2) + ' kg m/s'], ['KE before', f(kb, 2) + ' J']];
          if (S.after) {
            const pa = p.m1 * S.after[0] + p.m2 * S.after[1], ka = 0.5 * p.m1 * S.after[0] * S.after[0] + 0.5 * p.m2 * S.after[1] * S.after[1];
            out.push(['Momentum after', f(pa, 2) + ' kg m/s'], ['KE after', f(ka, 2) + ' J'], ['KE lost', f(kb - ka, 2) + ' J (' + f(kb ? 100 * (kb - ka) / kb : 0, 0) + '%)'], ['A after', f(S.after[0], 2) + ' m/s'], ['B after', f(S.after[1], 2) + ' m/s']);
          } else out.push(['After', p.u1 <= p.u2 ? 'They never meet: A must be faster than B' : 'waiting for the collision…']);
          return out;
        }
      };
      inst.reset();
      return inst;
    }
  });

  // ---------- 7. Photoelectric effect ----------
  const METALS = [[2.28, 'Sodium (φ = 2.28 eV)'], [2.3, 'Potassium (φ = 2.30 eV)'], [2.87, 'Calcium (φ = 2.87 eV)'], [4.3, 'Zinc (φ = 4.30 eV)'], [4.7, 'Copper (φ = 4.70 eV)'], [5.65, 'Platinum (φ = 5.65 eV)']];
  LB.add({
    id: 'photoelectric', name: 'Photoelectric effect', topics: ['phy-t5-photons'],
    blurb: 'Shine light on a metal and see when electrons are released, how fast they leave and the stopping potential.',
    icon: icon('<path d="M6 8 l6 4 -4 2 6 4"/><rect x="18" y="18" width="5" height="22"/><circle cx="32" cy="24" r="2" fill="currentColor"/><circle cx="38" cy="30" r="2" fill="currentColor"/><path d="M44 16v26"/>'),
    aspect: 0.48, maxH: 380, graph: true, graphH: 220,
    controls: [
      { k: 'lam', label: 'Wavelength of light', min: 100, max: 850, step: 1, v: 400, unit: 'nm', dp: 0 },
      { k: 'int', label: 'Intensity', min: 0, max: 100, step: 1, v: 60, unit: '%', dp: 0 },
      { k: 'phi', type: 'select', label: 'Metal', options: METALS, v: 2.28 },
      { k: 'Vs', label: 'Stopping (reverse) voltage', min: 0, max: 8, step: 0.05, v: 0, unit: 'V', dp: 2 }
    ],
    tasks: [
      'Shine bright red light (700 nm, 100%) on zinc. No electrons at all: each photon has too little energy, however many there are.',
      'Lower the wavelength until electrons appear. That is the threshold wavelength, λ₀ = hc/φ.',
      'Above the threshold, double the intensity. The current doubles but the maximum kinetic energy stays the same.',
      'Raise the stopping voltage until the current just reaches zero. Check that eV<sub>s</sub> = hf − φ.',
      'Look at the graph: every metal gives a line with the same gradient (the Planck constant h) and an intercept of −φ.'
    ],
    theory: '<p>Light arrives as photons of energy E = hf = hc/λ. One photon gives all its energy to one electron. If hf is larger than the work function φ, the electron can escape with kinetic energy up to:</p><p class="eq">KE<sub>max</sub> = hf − φ &nbsp;&nbsp; eV<sub>s</sub> = KE<sub>max</sub> &nbsp;&nbsp; f₀ = φ / h</p><p>Intensity sets the number of photons per second, so it changes the current but not the electrons’ energies. The wave model cannot explain the threshold frequency or the instant emission; the photon model can.</p>',
    create: function (p) {
      const S = { ph: [], el: [], acc: 0, arrive: [], t: 0, W: 600, H: 300 };
      const E = () => 1240 / p.lam;
      const geo = () => ({ px: S.W * 0.3, cx: S.W * 0.78, top: S.H * 0.22, bot: S.H * 0.78 });
      const inst = {
        reset: function () { S.ph = []; S.el = []; S.arrive = []; },
        change: function () { },
        step: function (dt) {
          S.t += dt;
          const G = geo(), c = 180, D = G.cx - G.px;
          S.acc += dt * p.int / 100 * 45;
          while (S.acc >= 1) { S.acc -= 1; const y = G.top + 14 + Math.random() * (G.bot - G.top - 28); S.ph.push({ x: 40, y0: 30, y: y, t: 0 }); }
          S.ph = S.ph.filter(function (q) {
            q.t += dt * 2.2;
            if (q.t < 1) return true;
            if (E() > p.phi) { const ke = (E() - p.phi) * Math.random(); S.el.push({ x: G.px + 4, y: q.y, v: c * Math.sqrt(ke), ke: ke }); }
            return false;
          });
          const a = p.Vs > 0 ? c * c * p.Vs / (2 * D) : 0;
          S.el = S.el.filter(function (e) {
            e.v -= a * dt; e.x += e.v * dt;
            if (e.x >= G.cx) { S.arrive.push(S.t); return false; }
            return e.x > G.px;
          });
          while (S.arrive.length && S.arrive[0] < S.t - 1) S.arrive.shift();
        },
        draw: function (g, W, H, p, th) {
          S.W = W; S.H = H;
          const G = geo(), col = LB.waveColour(p.lam);
          g.fillStyle = th.bg2; g.strokeStyle = th.ink3; g.lineWidth = 1.5;
          g.beginPath(); g.roundRect ? g.roundRect(G.px - 30, G.top - 20, G.cx - G.px + 60, G.bot - G.top + 40, 40) : g.rect(G.px - 30, G.top - 20, G.cx - G.px + 60, G.bot - G.top + 40); g.fill(); g.stroke();
          T(g, 'vacuum', (G.px + G.cx) / 2, G.top - 6, { col: th.ink3, size: 11, align: 'center' });
          g.fillStyle = '#9aa3b5'; g.fillRect(G.px - 6, G.top, 10, G.bot - G.top); g.fillStyle = th.ink2; g.fillRect(G.cx, G.top, 6, G.bot - G.top);
          T(g, 'metal', G.px - 1, G.bot + 16, { col: th.ink2, size: 11, align: 'center', weight: 600 });
          T(g, 'collector', G.cx + 3, G.bot + 16, { col: th.ink2, size: 11, align: 'center', weight: 600 });
          // Lamp
          LB.glow(g, 34, 30, 46, LB.waveColour(p.lam, 0.7), 0.4 + 0.6 * p.int / 100); g.fillStyle = col; g.beginPath(); g.arc(34, 30, 14, 0, 7); g.fill(); g.strokeStyle = th.ink3; g.stroke();
          T(g, p.lam < 380 ? 'ultraviolet' : p.lam > 750 ? 'infrared' : 'visible', 54, 34, { col: th.ink2, size: 11, weight: 600 });
          S.ph.forEach(function (q) {
            const x = 40 + (G.px - 46) * q.t, y = 30 + (q.y - 30) * q.t, ang = Math.atan2(q.y - 30, G.px - 46);
            g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
            for (let i = -10; i <= 10; i += 2) { const px = x + Math.cos(ang) * i - Math.sin(ang) * Math.sin(i * 0.8) * 3, py = y + Math.sin(ang) * i + Math.cos(ang) * Math.sin(i * 0.8) * 3; if (i === -10) g.moveTo(px, py); else g.lineTo(px, py); }
            g.stroke();
          });
          S.el.forEach((e) => LB.ball(g, e.x, e.y, 4.5, '#3B82F6'));
          // Circuit with battery and ammeter
          const by = H - 18;
          g.strokeStyle = th.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(G.px - 1, G.bot); g.lineTo(G.px - 1, by); g.lineTo(G.cx + 3, by); g.lineTo(G.cx + 3, G.bot); g.stroke();
          const mx = (G.px + G.cx) / 2;
          g.fillStyle = th.bg; g.fillRect(mx - 60, by - 12, 120, 24); g.strokeRect(mx - 60, by - 12, 120, 24);
          T(g, 'V = ' + f(p.Vs, 2) + ' V   I ∝ ' + S.arrive.length + ' e⁻/s', mx, by + 4, { col: th.ink, size: 11, weight: 600, align: 'center' });
          if (E() <= p.phi) T(g, 'No electrons: hf < φ', (G.px + G.cx) / 2, (G.top + G.bot) / 2, { col: th.bad, size: 14, weight: 700, align: 'center' });
        },
        graph: function (g, W, H, p, th) {
          const h = 4.1357e-15, fq = 3e8 / (p.lam * 1e-9) / 1e14, f0 = p.phi / h / 1e14;
          const line = [[0, -p.phi], [30, 30e14 * h - p.phi]];
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: 30, y0: -p.phi - 0.5, y1: 8, xl: 'frequency / 10¹⁴ Hz', yl: 'KE max / eV', series: [{ pts: line, col: th.ink3, dash: [5, 5], width: 1.5 }, { pts: [[f0, 0], [30, 30e14 * h - p.phi]], col: th.primary }, { pts: [[fq, Math.max(0, fq * 1e14 * h - p.phi)]], col: th.accent, dots: true, r: 6 }], vlines: [{ x: f0, label: 'f₀', col: th.ok }] });
        },
        readouts: function () {
          const e = E(), ke = e - p.phi, h = 6.626e-34;
          return [['Photon energy hf', f(e, 2) + ' eV'], ['Frequency', LB.sci(3e8 / (p.lam * 1e-9)) + ' Hz'], ['Threshold frequency f₀', LB.sci(p.phi * 1.602e-19 / h) + ' Hz', 'th'], ['Threshold wavelength', f(1240 / p.phi, 0) + ' nm', 'th'],
            ['KE max', ke > 0 ? f(ke, 2) + ' eV = ' + LB.sci(ke * 1.602e-19) + ' J' : 'none'], ['Fastest electron', ke > 0 ? LB.sci(Math.sqrt(2 * ke * 1.602e-19 / 9.11e-31)) + ' m/s' : '–'], ['Stopping potential needed', ke > 0 ? f(ke, 2) + ' V' : '–', 'th'], ['Electrons reaching collector', S.arrive.length + ' per second']];
        }
      };
      return inst;
    }
  });

  // ---------- 8. Radioactive decay ----------
  LB.add({
    id: 'decay', name: 'Radioactive decay and half-life', topics: ['phy-t11-halflife', 'phy-t11-decay'],
    blurb: 'Watch a sample of unstable nuclei decay at random and measure the half-life from the decay curve.',
    icon: icon('<circle cx="12" cy="12" r="3"/><circle cx="24" cy="12" r="3" fill="currentColor"/><circle cx="36" cy="12" r="3"/><circle cx="12" cy="24" r="3" fill="currentColor"/><circle cx="24" cy="24" r="3"/><circle cx="36" cy="24" r="3" fill="currentColor"/><path d="M6 44 Q16 30 42 40"/>'),
    aspect: 0.42, maxH: 340, graph: true, graphH: 220, fast: 4,
    controls: [
      { k: 'N0', type: 'seg', label: 'Number of nuclei', options: [[100, '100'], [400, '400'], [900, '900'], [2500, '2,500']], v: 900 },
      { k: 'half', label: 'Half-life', min: 1, max: 20, step: 0.5, v: 5, unit: 's', dp: 1 }
    ],
    tasks: [
      'Read the half-life off the graph: the time for N to fall from N₀ to N₀/2. Then from N₀/2 to N₀/4. It is the same every time.',
      'With 100 nuclei the curve is ragged. With 2,500 it follows the exponential closely. Decay is random, but large numbers are predictable.',
      'After 3 half-lives, about 1/8 of the nuclei are left. After 10, about 1/1000.',
      'The activity (decays per second) also halves every half-life, because A = λN.'
    ],
    theory: '<p>Each nucleus has the same, fixed chance of decaying in any second: the decay constant λ. So the rate of decay is proportional to the number left:</p><p class="eq">A = −dN/dt = λN &nbsp;&nbsp; N = N₀ e<sup>−λt</sup> &nbsp;&nbsp; t½ = ln 2 / λ</p><p>Here every nucleus is given its own random chance to decay each step, so you see the randomness of individual decays and the smooth curve that emerges from many of them.</p>',
    create: function (p) {
      const S = {};
      const lam = () => Math.LN2 / p.half;
      const inst = {
        reset: function () { S.n = p.N0; S.dead = new Float32Array(S.n); S.alive = S.n; S.t = 0; S.hist = [[0, S.n]]; S.rec = 0; S.recent = []; S.halfAt = null; },
        change: function () { inst.reset(); },
        step: function (dt) {
          if (!S.alive) return;
          const pr = 1 - Math.exp(-lam() * dt);
          S.t += dt;
          for (let i = 0; i < S.n; i++) if (!S.dead[i] && Math.random() < pr) { S.dead[i] = S.t; S.alive--; S.recent.push(S.t); }
          while (S.recent.length && S.recent[0] < S.t - 1) S.recent.shift();
          if (S.halfAt == null && S.alive <= S.n / 2) S.halfAt = S.t;
          S.rec += dt;
          if (S.rec >= 0.1) { S.rec = 0; S.hist.push([S.t, S.alive]); }
        },
        draw: function (g, W, H, p, th) {
          const cols = Math.ceil(Math.sqrt(S.n * W / H)), rows = Math.ceil(S.n / cols), cw = (W - 20) / cols, ch = (H - 20) / rows, r = Math.max(1.5, Math.min(cw, ch) * 0.36);
          for (let i = 0; i < S.n; i++) {
            const x = 10 + (i % cols + 0.5) * cw, y = 10 + (Math.floor(i / cols) + 0.5) * ch, d = S.dead[i];
            if (!d) { if (r > 3) LB.ball(g, x, y, r, '#8B5CF6'); else { g.fillStyle = '#8B5CF6'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
            else if (S.t - d < 0.35) { LB.glow(g, x, y, r * 3, 'rgba(250,204,21,0.9)'); g.fillStyle = '#F59E0B'; g.beginPath(); g.arc(x, y, r * 1.2, 0, 7); g.fill(); }
            else { g.fillStyle = th.dark ? '#3A3F55' : '#D9DCE6'; g.beginPath(); g.arc(x, y, r * 0.7, 0, 7); g.fill(); }
          }
        },
        graph: function (g, W, H, p, th) {
          const t1 = Math.max(5 * p.half, S.t), th0 = [];
          for (let i = 0; i <= 200; i++) { const t = t1 * i / 200; th0.push([t, S.n * Math.exp(-lam() * t)]); }
          LB.plot(g, th, { x: 0, y: 0, w: W, h: H, x0: 0, x1: t1, y0: 0, y1: S.n * 1.08, xl: 't / s', yl: 'undecayed nuclei N', series: [{ pts: th0, col: th.ink3, dash: [5, 5], width: 1.5 }, { pts: S.hist, col: th.purple }], vlines: [1, 2, 3, 4].map((k) => ({ x: k * p.half, label: k === 1 ? 't½' : k + 't½' })), hlines: [{ y: S.n / 2, label: 'N₀/2' }, { y: S.n / 4, label: 'N₀/4' }] });
        },
        readouts: function () {
          return [['Time', f(S.t, 1) + ' s'], ['Undecayed N', String(S.alive)], ['Fraction left', f(100 * S.alive / S.n, 1) + ' %'], ['Decay constant λ', f(lam(), 3) + ' s⁻¹', 'th'], ['Activity (last second)', S.recent.length + ' Bq'], ['λN', f(lam() * S.alive, 0) + ' Bq', 'th'], ['Measured half-life', S.halfAt ? f(S.halfAt, 2) + ' s' : 'waiting…']];
        }
      };
      inst.reset();
      return inst;
    }
  });

  // ---------- 9. Orbits ----------
  LB.add({
    id: 'orbits', name: 'Orbits and escape velocity', topics: ['phy-t12-orbits', 'phy-t12-gfields', 'phy-t6-circular'],
    blurb: 'Launch a satellite sideways from any height. Find the speed for a circular orbit and the speed to escape.',
    icon: icon('<circle cx="24" cy="24" r="7"/><ellipse cx="24" cy="24" rx="19" ry="11"/><circle cx="43" cy="24" r="2.5" fill="currentColor"/>'),
    aspect: 0.62, maxH: 520, graph: false,
    controls: [
      { k: 'M', label: 'Planet mass', min: 0.1, max: 5, step: 0.1, v: 1, unit: 'Earth masses', dp: 1 },
      { k: 'alt', label: 'Launch altitude', min: 200, max: 40000, step: 100, v: 4000, unit: 'km', dp: 0 },
      { k: 'vf', label: 'Launch speed', min: 0.3, max: 1.6, step: 0.01, v: 1, unit: '', dp: 2, show: (v, p) => { const r = 6.371e6 * Math.cbrt(p.M) + p.alt * 1e3, vc = Math.sqrt(6.674e-11 * 5.972e24 * p.M / r); return f(Number(v) * vc / 1000, 2) + ' km/s (' + Number(v).toFixed(2) + '× circular)'; } }
    ],
    actions: [{ id: 'launch', label: 'Launch', primary: true }],
    tasks: [
      'Launch at 1.00× the circular speed. The orbit is a circle: the gravitational force provides exactly the centripetal force.',
      'Try 0.85×: an ellipse that comes back closer to the planet. Try 0.6×: it crashes.',
      'Increase the speed to 1.41× (√2 × circular). That is the escape velocity: the satellite never comes back.',
      'Raise the launch altitude. The circular speed falls and the period grows: T² ∝ r³ (Kepler’s third law).',
      'Double the planet’s mass. The circular speed rises by √2.'
    ],
    theory: '<p>For a circular orbit, gravity provides the centripetal force:</p><p class="eq">GMm / r² = mv² / r &nbsp;⟹&nbsp; v = √(GM/r) &nbsp;&nbsp; T = 2π √(r³/GM) &nbsp;&nbsp; v<sub>escape</sub> = √(2GM/r)</p><p>Launched faster than circular speed, the satellite climbs into an ellipse; at √2 times the circular speed it has enough kinetic energy to escape (total energy ½mv² − GMm/r ≥ 0). The simulation integrates Newton’s law of gravitation step by step.</p>',
    onCanvas: false,
    create: function (p) {
      const G = 6.674e-11, S = {};
      const Mk = () => 5.972e24 * p.M, Rp = () => 6.371e6 * Math.cbrt(p.M), r0 = () => Rp() + p.alt * 1e3;
      const vc = () => Math.sqrt(G * Mk() / r0());
      const inst = {
        reset: function () { S.x = r0(); S.y = 0; S.vx = 0; S.vy = p.vf * vc(); S.trail = [[S.x, S.y]]; S.state = 'orbit'; S.t = 0; S.sc = 0; S.rec = 0; },
        change: function () { inst.reset(); },
        action: function () { inst.reset(); },
        step: function (dt) {
          if (S.state !== 'orbit') return;
          const per = 2 * Math.PI * Math.sqrt(Math.pow(r0(), 3) / (G * Mk()));
          const simDt = dt * per / 6, n = 400, h = simDt / n;
          for (let i = 0; i < n; i++) {
            let r = Math.hypot(S.x, S.y), a = -G * Mk() / (r * r * r);
            S.vx += a * S.x * h / 2; S.vy += a * S.y * h / 2;
            S.x += S.vx * h; S.y += S.vy * h;
            r = Math.hypot(S.x, S.y); a = -G * Mk() / (r * r * r);
            S.vx += a * S.x * h / 2; S.vy += a * S.y * h / 2;
            S.t += h;
            if (r < Rp()) { S.state = 'crashed'; break; }
          }
          S.rec += dt;
          if (S.rec > 1 / 60) { S.rec = 0; S.trail.push([S.x, S.y]); if (S.trail.length > 1500) S.trail.shift(); }
          if (Math.hypot(S.x, S.y) > 12 * r0()) S.state = 'escaped';
        },
        draw: function (g, W, H, p, th) {
          const want = Math.min(W, H) * 0.42 / (r0() * 1.9);
          S.sc = S.sc ? S.sc + (want - S.sc) * 0.1 : want;
          const cx = W * 0.5, cy = H * 0.5, sc = S.sc;
          g.fillStyle = th.dark ? '#05070c' : '#0d1220'; g.fillRect(0, 0, W, H);
          for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + (i * 37 % 10) / 20) + ')'; g.fillRect((i * 151) % W, (i * 89) % H, 1.5, 1.5); }
          g.strokeStyle = 'rgba(160,180,220,.35)'; g.setLineDash([4, 6]); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r0() * sc, 0, 7); g.stroke(); g.setLineDash([]);
          const grd = g.createRadialGradient(cx - Rp() * sc * 0.3, cy - Rp() * sc * 0.3, 2, cx, cy, Rp() * sc);
          grd.addColorStop(0, '#6fa8ff'); grd.addColorStop(1, '#1d3f8a');
          g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, Rp() * sc, 0, 7); g.fill();
          g.strokeStyle = 'rgba(255,190,90,.9)'; g.lineWidth = 2; g.beginPath();
          S.trail.forEach((q, i) => { const X = cx + q[0] * sc, Y = cy - q[1] * sc; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
          const X = cx + S.x * sc, Y = cy - S.y * sc;
          g.fillStyle = '#fff'; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill();
          if (S.state === 'orbit') LB.arrow(g, X, Y, X + S.vx / vc() * 40, Y - S.vy / vc() * 40, '#ffd27a', 2);
          T(g, S.state === 'crashed' ? 'Crashed into the planet' : S.state === 'escaped' ? 'Escaped!' : '', W / 2, 30, { col: S.state === 'escaped' ? '#7be0a6' : '#ff8a80', size: 15, weight: 700, align: 'center' });
        },
        graph: function () { },
        readouts: function () {
          const r = Math.hypot(S.x, S.y), v = Math.hypot(S.vx, S.vy), mu = G * Mk();
          const E = v * v / 2 - mu / r, a = -mu / (2 * E);
          return [['Altitude now', f((r - Rp()) / 1000, 0) + ' km'], ['Speed now', f(v / 1000, 2) + ' km/s'], ['Circular speed √(GM/r)', f(vc() / 1000, 2) + ' km/s', 'th'], ['Escape speed √(2GM/r)', f(vc() * Math.SQRT2 / 1000, 2) + ' km/s', 'th'],
            ['Orbital period', E < 0 ? f(2 * Math.PI * Math.sqrt(a * a * a / mu) / 3600, 2) + ' h' : 'no orbit (escapes)'], ['g at launch height', f(mu / (r0() * r0()), 2) + ' N/kg'], ['Status', S.state === 'orbit' ? (E >= 0 ? 'escaping' : Math.abs(p.vf - 1) < 0.005 ? 'circular orbit' : 'elliptical orbit') : S.state]];
        }
      };
      inst.reset();
      return inst;
    }
  });
})(window.RH = window.RH || {});
