/* ============================================================
   V27 sub-page interactions. Everything is delegated from the document,
   so it works on the standalone pages and on the single-file build,
   where every route is already in the page (hidden until opened).
   ============================================================ */
(function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }
    function all(scope, sel) { return [].slice.call(scope.querySelectorAll(sel)); }

    /* ---- collectible cards: tilt with the pointer, flip on press ---- */
    if (fine && !reduce) {
        document.addEventListener('pointermove', function (e) {
            var c = closest(e.target, '.cc');
            all(document, '.cc.tilting').forEach(function (o) {
                if (o !== c) { o.classList.remove('tilting'); o.style.removeProperty('--rx'); o.style.removeProperty('--ry'); }
            });
            if (!c) return;
            var r = c.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
            c.classList.add('tilting');
            c.style.setProperty('--ry', ((x - .5) * 18).toFixed(2) + 'deg');
            c.style.setProperty('--rx', ((.5 - y) * 14).toFixed(2) + 'deg');
            c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
            c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        }, { passive: true });
    }
    document.addEventListener('click', function (e) {
        var c = closest(e.target, '.cc');
        if (c) { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); return; }

        var flipAll = closest(e.target, '[data-fx-flipall]');
        if (flipAll) {
            var deck = flipAll.closest('section').querySelectorAll('.cc');
            var anyFront = [].some.call(deck, function (d) { return d.getAttribute('aria-pressed') !== 'true'; });
            [].forEach.call(deck, function (d, i) {
                setTimeout(function () { d.setAttribute('aria-pressed', anyFront ? 'true' : 'false'); }, reduce ? 0 : i * 60);
            });
            flipAll.textContent = anyFront ? 'Flip them all back' : 'Flip every card';
            return;
        }

        /* problem picker */
        var chip = closest(e.target, '.pk-chip');
        if (chip) {
            var pk = chip.closest('.picker');
            all(pk, '.pk-chip').forEach(function (b) { b.setAttribute('aria-selected', b === chip ? 'true' : 'false'); });
            all(pk, '.pk-card').forEach(function (card) { card.hidden = card.getAttribute('data-i') !== chip.getAttribute('data-i'); });
            return;
        }

        /* results envelope */
        var env = closest(e.target, '.env');
        if (env) {
            var open = env.classList.toggle('open');
            env.setAttribute('aria-expanded', open ? 'true' : 'false');
            var lab = env.parentNode.querySelector('.env-label');
            if (lab) lab.textContent = open ? 'Tap the envelope to close it' : 'Tap the envelope to open your example results';
            return;
        }

        /* sealed plan packs */
        var pack = closest(e.target, '.pack');
        if (pack) { pack.setAttribute('aria-expanded', pack.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); return; }

        /* persona switch */
        var tab = closest(e.target, '.ps-tab');
        if (tab) {
            var ps = tab.closest('.persona');
            all(ps, '.ps-tab').forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); t.tabIndex = t === tab ? 0 : -1; });
            all(ps, '.ps-panel').forEach(function (p) { p.hidden = p.getAttribute('data-i') !== tab.getAttribute('data-i'); });
            return;
        }

        /* the month: play button */
        var play = closest(e.target, '.mo-play');
        if (play) {
            var mo = play.closest('.month'), rng = mo.querySelector('.mo-ctrl input');
            if (mo._timer) { clearInterval(mo._timer); mo._timer = null; play.textContent = 'Play the month'; return; }
            if (reduce) { rng.value = 30; month(mo); return; }
            if (+rng.value >= 30) rng.value = 1;
            play.textContent = 'Pause';
            mo._timer = setInterval(function () {
                rng.value = +rng.value + 1; month(mo);
                if (+rng.value >= 30) { clearInterval(mo._timer); mo._timer = null; play.textContent = 'Play it again'; }
            }, 260);
            month(mo);
        }
    });

    /* arrow keys move between tabs in the persona switch */
    document.addEventListener('keydown', function (e) {
        var tab = closest(e.target, '.ps-tab');
        if (!tab || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
        var tabs = all(tab.closest('.persona'), '.ps-tab'), i = tabs.indexOf(tab);
        var n = tabs[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus(); n.click(); e.preventDefault();
    });

    /* FAQ chat: Lumi "types" for a moment before the answer appears */
    document.addEventListener('toggle', function (e) {
        var q = e.target;
        if (!q.classList || !q.classList.contains('chat-q') || !q.open || reduce) return;
        q.classList.add('typing');
        setTimeout(function () { q.classList.remove('typing'); }, 650);
    }, true);

    /* ---- bento spotlight ---- */
    document.addEventListener('pointermove', function (e) {
        var b = closest(e.target, '.bento > *');
        if (!b) return;
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        b.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    /* ---- savings slider ---- */
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
    function sim(s) {
        var m = +s.querySelector('[data-k=m]').value, y = +s.querySelector('[data-k=y]').value;
        var r = 0.05 / 12, n = y * 12;
        var cash = m * n, grow = m * (Math.pow(1 + r, n) - 1) / r;
        s.querySelector('[data-o=m]').textContent = money(m);
        s.querySelector('[data-o=y]').textContent = y + (y === 1 ? ' year' : ' years');
        s.querySelector('[data-o=cash]').textContent = money(cash);
        s.querySelector('[data-o=grow]').textContent = money(grow);
        s.querySelector('.sim-bar.cash i').style.height = (cash / grow * 82) + '%';
        s.querySelector('.sim-bar.grow i').style.height = '82%';
        s.querySelector('[data-o=gap]').textContent = money(grow - cash);
    }

    /* ---- the 30-day month ---- */
    function month(mo) {
        var d = +mo.querySelector('.mo-ctrl input').value;
        var log = JSON.parse(mo.getAttribute('data-log'));
        all(mo, '.mo-day').forEach(function (c, i) {
            c.classList.toggle('past', i < d);
            c.classList.toggle('now', i === d - 1);
        });
        var phase = d <= 28 ? 0 : d === 29 ? 1 : 2;
        all(mo, '.mo-step').forEach(function (s, i) { s.classList.toggle('on', i === phase); });
        all(mo, '.mo-phase').forEach(function (p, i) { p.hidden = i !== phase; });
        mo.querySelector('.mo-dnum').innerHTML = 'Day ' + d + ' <small>of 30</small>';
        var spent = log.slice(0, Math.min(d, 28)).slice(-4);
        mo.querySelector('.mo-log').innerHTML = phase === 0 ? spent.map(function (x) { return '<span>' + x + '</span>'; }).join('') : '';
        var fg = mo.querySelector('.ring-fg');
        if (fg) fg.style.strokeDashoffset = phase === 2 ? (264 * (1 - .71)).toFixed(1) : '264';
    }

    /* ---- before / after ---- */
    function ba(input) { input.closest('.ba').style.setProperty('--pos', input.value + '%'); }

    document.addEventListener('input', function (e) {
        var t = e.target;
        if (closest(t, '.sim')) sim(closest(t, '.sim'));
        else if (closest(t, '.mo-ctrl')) month(closest(t, '.month'));
        else if (closest(t, '.ba')) ba(t);
    });

    function boot() {
        all(document, '.sim').forEach(sim);
        all(document, '.month').forEach(month);
        all(document, '.ba input').forEach(ba);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
