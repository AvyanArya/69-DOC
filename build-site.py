#!/usr/bin/env python3
"""
Build every marketing page of the Lumera site from one template.

landing.html is hand-maintained (it owns the video hero and the stylesheet).
Everything else is generated from the content below, reusing the landing's
<style>, nav and footer verbatim, so the site is one design system rather
than a set of lookalikes. Re-run after editing landing.html or this file:

    python3 build-site.py && ./sync-public.sh
"""

import re
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

import importlib.util as _ilu
_lspec = _ilu.spec_from_file_location('legal_content', os.path.join(ROOT, 'legal-content.py'))
_legal = _ilu.module_from_spec(_lspec)
_lspec.loader.exec_module(_legal)

SRC = open(os.path.join(ROOT, 'landing.html')).read()

# ---------------------------------------------------------------- shared shell
STYLE = SRC[SRC.index('<style>'):SRC.rindex('</style>') + len('</style>')]
HEAD_LINKS = SRC[SRC.index('<link rel="icon"'):SRC.index('<style>')]
FOOTER = SRC[SRC.index('    <footer class="site-footer">'):
             SRC.index('    </footer>') + len('    </footer>')]
ATMO = SRC[SRC.index('<div class="atmo"'):SRC.index('</div>', SRC.index('<span class="grain">')) + 6]

# The header, consent box and its script come from landing.html too, so the
# logo, the Log In / Sign Up pair and the consent wording exist exactly once.
NAV = ('            <a class="skip-link" href="#main">Skip to content</a>\n'
       + SRC[SRC.index('            <header>'):SRC.index('            </header>') + len('            </header>')])
CONSENT_HTML = '\n' + SRC[SRC.index('<aside class="consent"'):SRC.index('</aside>', SRC.index('<aside class="consent"')) + len('</aside>')] + '\n'
_cs = SRC.index('/* ============================================================\n   Third-party content switch.')
CONSENT_JS = SRC[_cs:SRC.index('})();', _cs) + len('})();')]

SUB_CSS = '''
<style>
/* Sub-pages share the landing's system; only the header band differs. */
.page-top { position: relative; z-index: 1; overflow: hidden; padding-bottom: 1rem; }
.page-top .wash {
    position: absolute; top: -320px; left: 50%; transform: translateX(-50%);
    width: 1100px; height: 620px; pointer-events: none;
    background: radial-gradient(circle, var(--accent-b), transparent 68%);
    filter: blur(70px); opacity: .55;
}
.page-hero { position: relative; max-width: 1180px; margin: 0 auto; padding: 5rem 2rem 1rem; }
.page-title {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 6vw, 4.6rem);
    font-weight: 400; line-height: 1.04; letter-spacing: -.026em;
}
.page-title .grad {
    background-clip: text; -webkit-background-clip: text;
    color: transparent; -webkit-text-fill-color: transparent;
    background-image: var(--lg-sweep);
}
.page-lede { color: hsl(var(--hero-sub)); opacity: .8; font-size: 1.1rem; line-height: 1.75; max-width: 40rem; margin-top: 1.1rem; }
.page-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 2rem; }
.section.tight { padding-top: 3.5rem; }
.sec-head.left { margin-left: 0; text-align: left; }
.prose p { color: hsl(var(--hero-sub)); opacity: .78; line-height: 1.75; font-size: .97rem; }
.prose p + p { margin-top: .9rem; }
.person { display: flex; gap: 1rem; align-items: flex-start; }
.person .avatar {
    width: 56px; height: 56px; border-radius: 16px; flex: 0 0 auto;
    display: grid; place-items: center; font-weight: 700; font-size: 1.1rem;
    background-image: linear-gradient(160deg, var(--accent-b), var(--accent-a));
}
.person .role { font-size: .72rem; letter-spacing: .18em; text-transform: uppercase; color: hsl(var(--foreground)/.5); margin-top: .15rem; }
.tool-list { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .6rem 1.5rem; margin-top: 1.4rem; }
.tool-list li { display: flex; gap: .6rem; align-items: flex-start; font-size: .95rem; color: #fff; opacity: .92; line-height: 1.6; }
.tool-list li::before { content: ""; flex: 0 0 auto; width: 6px; height: 6px; margin-top: .58rem; border-radius: 50%; background: var(--accent-b); }
/* Vibrant pages: every page is lit in its own accent colours. */
body {
    background:
        radial-gradient(1300px 900px at -5% -10%, color-mix(in srgb, var(--accent-b) 70%, transparent), transparent 60%),
        radial-gradient(1100px 800px at 105% 25%, color-mix(in srgb, var(--accent-a) 60%, transparent), transparent 62%),
        radial-gradient(1000px 800px at 40% 115%, color-mix(in srgb, var(--accent-c) 30%, transparent), transparent 62%),
        linear-gradient(180deg, #16122C, #110E22);
    background-attachment: fixed;
}
.page-top .wash { opacity: .9; }
.page-title .grad { background-image: linear-gradient(100deg, var(--accent-c), var(--accent-b) 55%, #ffffff); }
.rest .panel.lg-panel, .rest .lg-panel {
    background: linear-gradient(160deg, color-mix(in srgb, var(--accent-b) 38%, transparent), color-mix(in srgb, var(--accent-b) 12%, transparent) 70%), rgba(30,24,52,.6);
    border-color: color-mix(in srgb, var(--accent-b) 38%, rgba(255,255,255,.08));
}
.rest .panel h3, .rest .eyebrow { color: color-mix(in srgb, var(--accent-c) 70%, #ffffff); }
.soon-banner { display: inline-block; margin-bottom: 1rem; padding: .45rem .95rem; border-radius: 999px; font-size: .78rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #1A1206; background: linear-gradient(100deg,#FCD34D,#F59E0B); box-shadow: 0 8px 22px -8px #F59E0B; }
.page-hero.has-art { display: grid; grid-template-columns: minmax(180px, 320px) 1fr; gap: 2.5rem; align-items: center; }
.hero-mascot { width: 100%; height: auto; pointer-events: none;
    filter: drop-shadow(0 30px 60px color-mix(in srgb, var(--accent-b) 75%, transparent)); animation: heroFloat 6s ease-in-out infinite; }
@keyframes heroFloat { 50% { transform: translateY(-12px); } }
@media (prefers-reduced-motion: reduce) { .hero-mascot { animation: none; } }
@media (max-width: 760px) { .page-hero.has-art { grid-template-columns: 1fr; gap: 1rem; } .hero-mascot { width: 170px; } }
/* Cards float when you point at them. */
.rest .panel { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .3s ease; }
.rest .panel:hover { transform: translateY(-8px); box-shadow: 0 26px 50px -24px color-mix(in srgb, var(--accent-b) 80%, transparent); border-color: color-mix(in srgb, var(--accent-b) 65%, transparent); }
.card-mascot { display: block; width: 76px; height: 76px; object-fit: contain; object-position: center 40%; margin-bottom: .6rem;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,.4)); transition: transform .35s ease; }
.panel:hover .card-mascot { transform: translateY(-4px) scale(1.06); }
/* V24: livelier pages. Cards take turns in the world colours, each section
   glows in its own colour, a slow aurora drifts behind the page, and a
   mascot peeks over every section heading. */
.rest::before {
    content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background:
        radial-gradient(40vw 34vw at 16% 28%, rgba(244,114,182,.20), transparent 70%),
        radial-gradient(42vw 36vw at 86% 60%, rgba(45,212,191,.16), transparent 70%),
        radial-gradient(38vw 30vw at 50% 98%, rgba(251,191,36,.15), transparent 70%);
    animation: auroraDrift 36s ease-in-out infinite alternate;
}
@keyframes auroraDrift { 50% { transform: translate3d(3vw,-2vh,0) scale(1.05); } 100% { transform: translate3d(-3vw,2vh,0) scale(1.02); } }
.rest .section { position: relative; }
.rest .section::before {
    content: ""; position: absolute; inset: 4% 0 8%; z-index: -1; pointer-events: none;
    background: radial-gradient(60% 55% at 50% 50%, color-mix(in srgb, var(--sg, #A78BFA) 22%, transparent), transparent 72%);
}
.rest .section:nth-of-type(4n+2)::before { --sg: #F472B6; }
.rest .section:nth-of-type(4n+3)::before { --sg: #2DD4BF; }
.rest .section:nth-of-type(4n+4)::before { --sg: #FBBF24; }
.rest div.panel.lg-panel {
    --pc: #A78BFA; --accent-b: var(--pc);
    background: linear-gradient(160deg, color-mix(in srgb, var(--pc) 32%, transparent), color-mix(in srgb, var(--pc) 8%, transparent) 72%), rgba(28,22,50,.66);
    border-color: color-mix(in srgb, var(--pc) 46%, rgba(255,255,255,.08));
    box-shadow: inset 0 3px 0 color-mix(in srgb, var(--pc) 80%, #ffffff), 0 22px 44px -30px var(--pc);
}
.rest div.panel.lg-panel:nth-child(5n+2) { --pc: #F472B6; }
.rest div.panel.lg-panel:nth-child(5n+3) { --pc: #34D399; }
.rest div.panel.lg-panel:nth-child(5n+4) { --pc: #FBBF24; }
.rest div.panel.lg-panel:nth-child(5n+5) { --pc: #60A5FA; }
.rest div.panel.lg-panel h3 { color: color-mix(in srgb, var(--pc) 50%, #ffffff); }
.rest div.panel.lg-panel:hover { border-color: var(--pc); box-shadow: inset 0 3px 0 var(--pc), 0 30px 56px -26px var(--pc); }
.rest .sec-head { position: relative; padding-right: 100px; }
.sec-peek {
    position: absolute; right: 0; top: -14px; width: 86px; height: auto; pointer-events: none;
    filter: drop-shadow(0 14px 22px rgba(0,0,0,.45)); transform-origin: 50% 100%; animation: peekBob 5.5s ease-in-out infinite;
}
@keyframes peekBob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-9px) rotate(4deg); } }
@media (max-width: 720px) { .rest .sec-head { padding-right: 62px; } .sec-peek { width: 56px; top: -6px; } }
@media (prefers-reduced-motion: reduce) { .rest::before, .sec-peek { animation: none; } }
@media (max-width: 720px) {
    .page-hero { padding: 3.5rem 1.25rem .5rem; }
    .tool-list { grid-template-columns: 1fr; }
}


/* ===== consent ===== */
.consent {
    position: fixed; z-index: 70; left: 1rem; right: 1rem; bottom: 1rem;
    max-width: 44rem; margin: 0 auto;
    background: rgba(10, 8, 20, .96);
    border: 1px solid hsl(var(--foreground) / .16);
    border-radius: 18px; padding: 1.2rem 1.3rem;
    box-shadow: 0 30px 70px -30px rgba(0,0,0,.95);
    display: none;
}
.consent[data-open] { display: block; }
.consent h2 { font-family: var(--font-display); font-size: 1.05rem; font-weight: 500; margin-bottom: .4rem; }
.consent p { font-size: .88rem; line-height: 1.65; color: hsl(var(--hero-sub)); opacity: .85; }
.consent p a { color: hsl(var(--foreground)); text-decoration: underline; text-underline-offset: 3px; }
.consent-actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1rem; }
.consent-actions button {
    font-family: inherit; font-size: .85rem; font-weight: 600; cursor: pointer;
    padding: .6rem 1.2rem; border-radius: 999px; border: 1px solid transparent;
}
.consent-accept { background: linear-gradient(to left, #fcd34d, #f5b642); color: #17110a; }
.consent-decline { background: rgba(255,255,255,.04); border-color: hsl(var(--foreground) / .2); color: hsl(var(--foreground)); }
.consent-decline:hover { background: rgba(255,255,255,.1); }
@media (max-width: 560px) { .consent-actions button { flex: 1 1 100%; } }

/* ===== keyboard access ===== */
.skip-link {
    position: absolute; left: 1rem; top: -3rem; z-index: 60;
    background: #fcd34d; color: #17110a; font-weight: 600; font-size: .9rem;
    padding: .6rem 1.1rem; border-radius: 0 0 10px 10px; text-decoration: none;
    transition: top .2s ease;
}
.skip-link:focus { top: 0; }

/* Every interactive thing shows where the keyboard is. */
a:focus-visible, button:focus-visible, [tabindex]:focus-visible,
input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 3px solid #fcd34d;
    outline-offset: 3px;
    border-radius: 6px;
}

/* ===== legal pages ===== */
.legal { max-width: 46rem; }
.legal h2 {
    font-family: var(--font-display); font-weight: 500;
    font-size: 1.45rem; letter-spacing: -.018em;
    margin: 2.8rem 0 .9rem; scroll-margin-top: 2rem;
}
.legal h3 { font-family: var(--font-display); font-weight: 500; font-size: 1.08rem; margin: 1.6rem 0 .5rem; }
.legal p, .legal li { color: hsl(var(--hero-sub)); opacity: .82; line-height: 1.8; font-size: .97rem; }
.legal p + p { margin-top: .9rem; }
.legal ul, .legal ol { margin: .8rem 0 .8rem 1.2rem; }
.legal li { margin-bottom: .45rem; }
.legal a { color: hsl(var(--foreground)); text-decoration: underline; text-underline-offset: 3px; }
.legal strong { color: hsl(var(--foreground)); font-weight: 600; }
.legal table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
@media (max-width: 640px) { .legal table { display: block; overflow-x: auto; } .legal th, .legal td { min-width: 9rem; } }
.legal th, .legal td {
    text-align: left; padding: .7rem .8rem; vertical-align: top;
    border-bottom: 1px solid hsl(var(--foreground) / .1);
    color: hsl(var(--hero-sub));
}
.legal th { color: hsl(var(--foreground)); font-weight: 600; font-size: .8rem; letter-spacing: .04em; }
.legal .updated { font-size: .82rem; color: hsl(var(--foreground) / .55); margin-bottom: 1.5rem; }
.legal .toc { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.5rem 0 0; padding: 0; list-style: none; }
.legal .toc li { margin: 0; }
.legal .toc a {
    display: inline-block; font-size: .82rem; text-decoration: none;
    padding: .35rem .8rem; border-radius: 999px;
    background: rgba(255,255,255,.04); color: hsl(var(--foreground) / .8);
}
.legal .toc a:hover { background: rgba(255,255,255,.09); color: hsl(var(--foreground)); }
/* Anything the operator must fill in before launch is marked, not hidden. */
.fill {
    background: rgba(252, 211, 77, .13); color: #fcd34d;
    border-radius: 5px; padding: .05em .4em; font-weight: 600;
    font-size: .95em; white-space: normal; overflow-wrap: anywhere;
}
.callout {
    border-radius: 16px; padding: 1.1rem 1.3rem; margin: 1.6rem 0;
    background: rgba(255,255,255,.03);
}
.callout p { margin: 0; opacity: .85; }
</style>
'''

FX_CSS = open(os.path.join(ROOT, 'site-fx.css'), encoding='utf-8').read()
FX_JS = open(os.path.join(ROOT, 'site-fx.js'), encoding='utf-8').read()
SUB_CSS = SUB_CSS.replace('</style>', FX_CSS + '\n</style>', 1) if '</style>' in SUB_CSS else SUB_CSS + FX_CSS
SCRIPT = '<script>\n' + CONSENT_JS + '\n' + FX_JS + '''

(function () {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    var items = [].slice.call(document.querySelectorAll('.reveal'));
    items.forEach(function (el, i) { el.style.transitionDelay = ((i % 4) * 0.07) + 's'; });

    /* An IntersectionObserver alone loses anything a fast scroll or a jump
       link skips past, because it never crosses the threshold while observed.
       So the observer handles the animation, and a cheap scroll pass catches
       whatever the viewport has already gone by. */
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            e.target.classList.add('in');
            io.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (el) { io.observe(el); });

    var ticking = false;
    function sweep() {
        ticking = false;
        var h = window.innerHeight;
        items.forEach(function (el) {
            if (el.classList.contains('in')) return;
            var r = el.getBoundingClientRect();
            if (r.top < h * 0.92) { el.classList.add('in'); io.unobserve(el); }
        });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', sweep);
    /* Web fonts land after first paint and make the page taller, so anything
       that ends up below the fold needs another look. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sweep);
    if (window.ResizeObserver) new ResizeObserver(onScroll).observe(document.body);
    sweep();
})();
</script>'''


def page(fname, title, desc, accents, head, grad, lede, body, actions=None):
    a, b, c = accents
    art = {'leaf.html': 'sprout', 'atlas.html': 'nova', 'shield.html': 'sentinel', 'forge.html': 'blaze', 'worlds.html': 'family',
           'features.html': 'lumi', 'how-it-works.html': 'lumi', 'pricing.html': 'lumi'}.get(fname)
    mascot = ('<img class="hero-mascot" src="assets/brand/%s.webp" alt="" aria-hidden="true">' % art) if art else ''
    actions_html = ''
    if actions:
        actions_html = '<div class="page-actions">' + ''.join(
            ('<a class="btn-solid" href="%s">%s</a>' % (h, t)) if primary else
            ('<a class="hero-secondary liquid-glass" style="padding:1rem 1.9rem" href="%s">%s</a>' % (h, t))
            for t, h, primary in actions) + '</div>'

    html = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%s</title>
<meta name="description" content="%s">
%s%s
<style>:root { --accent-a: %s; --accent-b: %s; --accent-c: %s; }</style>
%s
</head>
<body>

%s

<div class="page-top">
    <div class="wash"></div>
%s
    <div class="page-hero%s">
        %s
        <div class="hero-text">
        %s<h1 class="page-title">%s <span class="grad">%s</span></h1>
        <p class="page-lede">%s</p>
        %s
        </div>
    </div>
</div>

<main class="rest" id="main">
%s

%s
</main>

%s
%s
</body>
</html>
''' % (title, desc, HEAD_LINKS, STYLE, a, b, c, SUB_CSS, ATMO, NAV,
       (' has-art' if mascot else ''), mascot, ('<span class="soon-banner">Coming soon &middot; not out yet</span>' if mascot else ''), head, grad, lede, actions_html, body, FOOTER, CONSENT_HTML, SCRIPT)

    open(os.path.join(ROOT, fname), 'w').write(html)
    return fname


def panels(items, cols=3):
    return '<div class="grid-%d">%s</div>' % (cols, ''.join(
        '<div class="panel lg-panel reveal"><h3>%s</h3><p>%s</p></div>' % (t, d) for t, d in items))


# V24: a world mascot peeks over each section heading, taking turns.
_PEEKS = ['lumi', 'sprout', 'nova', 'sentinel', 'blaze']
_peek_n = [0]


def sec(eyebrow, head, grad, sub='', body=''):
    peek = _PEEKS[_peek_n[0] % len(_PEEKS)]
    _peek_n[0] += 1
    return '''    <section class="section">
        <div class="sec-head left reveal">
            <img class="sec-peek" src="assets/brand/''' + peek + '''.webp" alt="" aria-hidden="true">
            <div class="eyebrow">%s</div>
            <h2 class="sec-title">%s <span class="grad">%s</span></h2>
            %s
        </div>
        %s
    </section>
''' % (eyebrow, head, grad, ('<p class="sec-sub">%s</p>' % sub) if sub else '', body)


# ---------------------------------------------------------------- the content
WORLDS = [
    dict(key='leaf', name='Leaf', tag='Learn &amp; grow', accents=('#0E7A3A', '#20B257', '#86EFAC'),
         head='Money education', grad='that does not bore you',
         lede='Bite-size lessons, a daily word, flashcards that stick and a knowledge hub that goes as deep as you want. No lectures, no assumed head start.',
         tools=[('Lessons', 'Two-minute lessons that explain one idea properly and then get out of the way.'),
                ('Money Quiz', 'Spaced-repetition flashcards, so what you learn on Monday is still there in March.'),
                ('Challenges', 'Short streak-based challenges that turn a habit into a month of evidence.'),
                ('Knowledge Hub', 'A curated shelf of the best places to learn, sorted by what you actually need.'),
                ('Word of the Day', 'One money word a day, with a quick check that you really know it.'),
                ('Money Habits', 'Tick off small daily habits and watch a streak build.'),
                ('Glossary', 'Every term explained in plain English, one tap from wherever it appears.'),
                ('Badges & streaks', 'Progress you can see, from your first lesson to a hundred-day streak.')],
         inside=['Two-minute lessons', 'Word of the day', 'Money quiz and flashcards', 'Weekly challenges',
                 'Knowledge hub', 'Badges and streaks']),
    dict(key='atlas', name='Atlas', tag='Markets &amp; investing', accents=('#1747B0', '#2D68E2', '#93C5FD'),
         head='Markets,', grad='decoded',
         lede='Every index, sector and stock with a plain-English read on why it moved. Spin the globe, watch the exchanges wake, and learn the language of money while you watch it.',
         tools=[('Investing', 'Educational pathways from emergency fund to a diversified portfolio.'),
                ('Stock Market', 'Indices, sectors and stocks, each with a why-it-matters in human words.'),
                ('Global Markets', 'A globe of exchanges you can spin, with regional news as they open.'),
                ('World Monitor', 'The events moving markets, linked to the sources they came from.'),
                ('How Markets Work', 'Exchanges, orders and indices explained from the ground up.'),
                ('Market News', 'Plain-English headlines and what each one means for you.'),
                ('Stock Insights', 'A clear read on any stock: what it does, what moves it, what to watch.'),
                ('Sectors', 'Which parts of the market are rising or falling today, and why.')],
         inside=['Investment pathways', 'Indices and sectors', 'Stock insights', 'How markets work',
                 'Globe of exchanges', 'Plain-English news']),
    dict(key='shield', name='Shield', tag='Protect &amp; plan', accents=('#2F3848', '#5B6B84', '#CBD5E1'),
         head='Nothing', grad='catches you',
         lede='Credit building, debt payoff, insurance and the long horizon. The grown-up decisions, explained on your terms and sized to the life you actually have.',
         tools=[('Credit', 'What actually moves a score, and the order to do things in.'),
                ('Debt', 'Avalanche and snowball side by side on your real numbers.'),
                ('Insurance', 'A risk score, then only the cover that matches it.'),
                ('Retirement', 'Projections that survive inflation, not just a compound-interest toy.'),
                ('Emergency Fund', 'Your true safety number and the fastest way to reach it.'),
                ('Credit Cards', 'How cards really work, and how to use one without paying for it.'),
                ('Net Worth', 'What you own and owe on one line, tracked month to month.'),
                ('Safety Benchmarks', 'How protected you are compared with people like you.')],
         inside=['Credit building', 'Debt payoff planner', 'Insurance risk score', 'Retirement projections',
                 'Emergency fund', 'Safety benchmarks']),
    dict(key='forge', name='Forge', tag='Career &amp; income', accents=('#B4650A', '#E38F11', '#FCD34D'),
         head='Earn more,', grad='not just spend less',
         lede='Careers, firms, universities, admissions tests and what roles really pay. The fastest way to change your finances at nineteen is not a budget, it is a decision about what you do next.',
         tools=[('Finance Careers', 'What each path actually involves, and how people get in.'),
                ('Universities', 'Shortlists with the admissions data behind them, not just rankings.'),
                ('Test Centre', 'SAT, TMUA and the rest: tips, a score calculator, and what your score reaches.'),
                ('Salary Check', 'Benchmarks by role and level, per year or per month.'),
                ('Top Finance Firms', 'Who the big employers are and what working there is like.'),
                ('Subject Selection', 'Which subjects open which doors, by career path.'),
                ('Career Prep Hub', 'Skill roadmaps and interview practice for each route in.'),
                ('CV & LinkedIn Lab', 'CV templates, best practice and a stronger LinkedIn profile.'),
                ('Opportunities', 'Internships, competitions, programmes and scholarships.'),
                ('Side Income', 'Realistic ways to earn alongside study or work.'),
                ('Finance vs Economics', 'The difference between the two, and which suits you.')],
         inside=['Finance careers', 'Top firms', 'Universities', 'Admissions tests',
                 'Subject selection', 'CV and interview prep', 'Opportunities', 'Salary benchmarks']),
]

FEATURES = [
    ('AI Financial Twin', 'A cinematic profile of your money personality, strengths and biggest leak.'),
    ('Wealth Simulator', 'Drag a few habits and watch your 10-year future recalculate in real time.'),
    ('Benchmark Dashboard', 'See every category against realistic ranges for your region and income.'),
    ('Investment Guidance', 'Educational pathways from emergency fund to diversified portfolio.'),
    ('Market Intelligence', 'Indices, sectors and stock insights, explained for humans.'),
    ('AI Assistant', 'Ask anything about your money and get calm, contextual answers.'),
    ('Subscription Detector', 'Surface the quiet recurring spend draining your account.'),
    ('Emergency Fund', 'Know your true safety number and the fastest way to reach it.'),
    ('Budget & Goals', 'Your own categories, your own targets, and progress that updates itself.'),
    ('Net Worth', 'Everything you own and owe on one line, tracked month over month.'),
    ('Debt Payoff', 'Avalanche or snowball, costed on your real balances and rates.'),
    ('Community', 'Others on the same path, and the opportunities they are sharing.'),
]

STEPS = [
    ('Track one month', 'Spend 30 days noticing where money actually goes. No spreadsheets, no judgement, no connecting your bank.'),
    ('Enter and compare', 'Put in income and spending. Lumera benchmarks every category against realistic ranges for people like you.'),
    ('Get your plan', 'A health score, the leaks worth closing first, and a 30-day plan you can actually follow.'),
]


# ---------------------------------------------------------------- V27 pieces
import html as _h
_IMG = {'leaf': 'sprout', 'atlas': 'nova', 'shield': 'sentinel', 'forge': 'blaze', 'hub': 'lumi'}
_COL = {'leaf': ('#16A34A', '#86EFAC'), 'atlas': ('#2563EB', '#93C5FD'), 'shield': ('#64748B', '#CBD5E1'),
        'forge': ('#D97706', '#FCD34D'), 'hub': ('#7C3AED', '#F0ABFC')}


def collect_card(c, c2, name, num, art, kind, txt, foot_l, foot_r, back, label, photo=False, chips=''):
    """A collectible card: front and back, flips on press, tilts under the pointer."""
    return ('<button type="button" class="cc" aria-pressed="false" aria-label="%s" style="--c:%s;--c2:%s"><span class="cc-in">'
            '<span class="cc-face cc-front">'
            '<span class="cc-top"><span class="cc-name">%s</span><span class="cc-num">%s</span></span>'
            '<span class="cc-art%s">%s</span>'
            '<span class="cc-type">%s</span>%s'
            '<span class="cc-txt">%s</span>'
            '<span class="cc-foot"><span>%s</span><span>%s</span></span></span>'
            '<span class="cc-face cc-back">%s<span class="cc-turn">Tap to turn back</span></span>'
            '</span></button>') % (label, c, c2, name, num, ' photo' if photo else '', art, kind, chips, txt, foot_l, foot_r, back)


def world_deck(worlds):
    out = []
    for i, w in enumerate(worlds):
        c, c2 = _COL[w['key']]
        back = ('<span class="cc-h">What %s will hold</span><span class="cc-scroll"><span class="cc-list">%s</span></span>'
                % (w['name'], ''.join('<span>%s</span>' % t for t, _ in w['tools'])))
        card = collect_card(c, c2, w['name'], 'No. %02d / %02d' % (i + 1, len(worlds)),
                            '<img src="assets/brand/%s.webp" alt="">' % _IMG[w['key']], w['tag'],
                            w['lede'].split('.')[0] + '.', '%d tools' % len(w['tools']), 'Coming soon', back,
                            '%s card: %s. Press to flip and see its tools.' % (w['name'], w['tag']))
        out.append('<div class="cc-slot reveal">%s<a class="cc-link" style="--c2:%s" href="%s.html">Explore %s &rarr;</a></div>'
                   % (card, c2, w['key'], w['name']))
    return '<div class="cc-deck">' + ''.join(out) + '</div>'


def orbit(worlds):
    n = len(worlds)
    pl = ''.join(('<div class="pl" style="--a:%ddeg"><a class="pl-body" href="%s.html" style="--c:%s;--c2:%s">'
                  '<span class="pl-ball"><img src="assets/brand/%s.webp" alt=""></span>'
                  '<span class="pl-name">%s</span><span class="pl-tag">%s</span></a></div>')
                 % (i * 360 // n - 90, w['key'], _COL[w['key']][0], _COL[w['key']][1], _IMG[w['key']], w['name'], w['tag'])
                 for i, w in enumerate(worlds))
    return ('<div class="orbit reveal"><div class="orbit-hub"><img src="assets/brand/lumi.webp" alt=""><b>Lumera</b><small>Live now</small></div>'
            '<div class="orbit-ring">%s</div></div><p class="fx-hint">Hover a world to stop the orbit. Each one opens its page.</p>' % pl)


def world_strip(worlds):
    return '<div class="wstrip">' + ''.join(
        '<a class="reveal" href="%s.html" style="--c:%s"><img src="assets/brand/%s.webp" alt=""><span><b>%s</b><small>%s</small></span></a>'
        % (w['key'], _COL[w['key']][0], _IMG[w['key']], w['name'], w['tag']) for w in worlds) + '</div>'


PROBLEMS = [  # (the problem in your words, feature index in FEATURES, world)
    ("I don't know what kind of spender I am", 0, 'hub'),
    ("I can't picture where my habits lead", 1, 'hub'),
    ("Is my spending even normal?", 2, 'hub'),
    ("I'm paying for things I forgot about", 6, 'hub'),
    ("My money runs out before the month does", 8, 'hub'),
    ("I have a money question and no one to ask", 5, 'hub'),
    ("One surprise bill would wreck my month", 7, 'shield'),
    ("I owe money and don't know what to pay first", 10, 'shield'),
    ("I can't tell if I'm getting anywhere", 9, 'shield'),
    ("Investing feels like a closed club", 3, 'atlas'),
    ("Market news goes over my head", 4, 'atlas'),
    ("None of my friends talk about money", 11, 'hub'),
]
_WNAME = {'hub': 'Part of the Lumera hub', 'leaf': 'Part of Leaf', 'atlas': 'Part of Atlas (coming soon)',
          'shield': 'Part of Shield (coming soon)', 'forge': 'Part of Forge (coming soon)'}


def picker():
    chips = ''.join('<button type="button" class="pk-chip" role="tab" aria-selected="%s" data-i="%d" style="--c:%s">%s</button>'
                    % ('true' if i == 0 else 'false', i, _COL[w][0], _h.escape(q)) for i, (q, f, w) in enumerate(PROBLEMS))
    cards = ''.join(('<div class="pk-card" role="tabpanel" data-i="%d" style="--c:%s"%s><div class="pk-kicker">The fix</div>'
                     '<h3>%s</h3><p>%s</p><span class="pk-world"><img src="assets/brand/%s.webp" alt="">%s</span>'
                     '<span class="pk-big" aria-hidden="true">%02d</span></div>')
                    % (i, _COL[w][0], '' if i == 0 else ' hidden', FEATURES[f][0], FEATURES[f][1], _IMG[w], _WNAME[w], f + 1)
                    for i, (q, f, w) in enumerate(PROBLEMS))
    return ('<div class="picker reveal"><div class="pk-chips" role="tablist" aria-label="Pick a money problem">%s</div>'
            '<div class="pk-out" aria-live="polite">%s</div></div>' % (chips, cards))


def savings_sim():
    return ('<div class="sim reveal"><div>'
            '<label>Put aside each month <output data-o="m">£150</output><input type="range" min="10" max="1000" step="10" value="150" data-k="m" aria-label="Amount each month"></label>'
            '<label>For <output data-o="y">10 years</output><input type="range" min="1" max="40" value="10" data-k="y" aria-label="Number of years"></label>'
            '<p style="margin:0;font-size:1rem;line-height:1.5">Growth adds <b data-o="gap" style="color:#FDE68A">£5,293</b> on top of what you put in.</p></div>'
            '<div class="sim-bars" aria-live="polite">'
            '<div class="sim-bar cash"><i></i><b data-o="cash">£18,000</b><small>Kept as cash</small></div>'
            '<div class="sim-bar grow"><i></i><b data-o="grow">£23,293</b><small>Growing at 5% a year</small></div></div>'
            '<p class="sim-note">An illustration at a steady 5% a year, not a forecast or advice. Real returns go up and down. '
            'The Wealth Simulator in the app uses your own figures.</p></div>')


# ---------------------------------------------------------------- the pages
WORLD_CARD = ('<a class="panel lg-panel world-card reveal" href="{key}.html" style="text-decoration:none;color:inherit;background:linear-gradient(165deg,{c}55,{c}1A 70%),rgba(26,22,44,.7) !important;border-color:{c}AA !important;box-shadow:0 22px 44px -26px {c}">'
              '<span class="wash" style="background:{c}"></span>'
              '<img class="card-mascot" src="assets/brand/{img}.webp" alt="" aria-hidden="true">'
              '<span class="tag" style="color:{c}">{tag}</span>'
              '<h3>{name}</h3><p>{blurb}</p>'
              '<span class="link" style="color:{c}">Coming soon &middot; see what&rsquo;s planned &rarr;</span></a>')

MINI_CARD = ('<a class="panel lg-panel reveal" href="{key}.html" style="text-decoration:none;color:inherit;background:linear-gradient(165deg,{c}55,{c}1A 70%),rgba(26,22,44,.7) !important;border-color:{c}AA !important;box-shadow:0 22px 44px -26px {c}">'
             '<img class="card-mascot" src="assets/brand/{img}.webp" alt="" aria-hidden="true">'
             '<h3 style="color:#fff">{name}</h3><p style="color:{c};font-weight:600">{tag}</p></a>')


def world_cards(worlds, tpl=WORLD_CARD):
    img = {'leaf': 'sprout', 'atlas': 'nova', 'shield': 'sentinel', 'forge': 'blaze'}
    return ''.join(tpl.format(key=w['key'], c=('#94A8C8' if w['key']=='shield' else w['accents'][1]), initial=w['name'][0], tag=w['tag'], img=img[w['key']],
                              name=w['name'], blurb=w['lede'].split('.')[0] + '.') for w in worlds)


def actions_row(pairs):
    return '<div class="page-actions">' + ''.join(
        ('<a class="btn-solid" href="%s">%s</a>' % (h, t)) if primary else
        ('<a class="hero-secondary liquid-glass" style="padding:1rem 1.9rem" href="%s">%s</a>' % (h, t))
        for t, h, primary in pairs) + '</div>'


def build():
    made = []

    made.append(page('worlds.html', 'The Lumera family | Lumera',
        'Four worlds, one financial life. Leaf, Atlas, Shield and Forge.',
        ('#8E7BFF', '#6E6CF6', '#EBC77A'),
        'Four worlds,', 'coming soon',
        'Lumera is the hub, and it is live now. These four worlds are coming soon: none of them is out yet. Here is what each one will hold.',
        '    <section class="section tight">' + world_deck(WORLDS) + '<p class="fx-hint">Tap a card to flip it and see what that world will hold.</p></section>\n'
        + sec('Everything in one place', 'One account,', 'every world',
              'Lumera is the hub in the middle. Sign up once, and your figures, streak and progress will follow you to every world as it opens.',
              orbit(WORLDS) + '<div class="fx-center">' + actions_row([('Start your 30-day review', 'app.html#/signup', True)]) + '</div>'),
        actions=[('Start free', 'app.html#/signup', True), ('Open the app', 'app.html#/login', False)]))

    for w in WORLDS:
        others = [o for o in WORLDS if o['key'] != w['key']]
        inside = '<ul class="tool-list">' + ''.join('<li>%s</li>' % i for i in w['inside']) + '</ul>'
        body = ('    <section class="section tight">' + panels(w['tools'], 2) + '</section>\n'
                + sec('What is inside', 'The tools', 'you get',
                      '%s is not out yet. These are the tools it will have when it arrives.' % w['name'], inside)
                + sec('The rest of the family', 'It does not', 'stop here',
                      'The other three worlds are on their way too.',
                      '<div class="grid-3">' + world_cards(others, MINI_CARD) + '</div>'))
        made.append(page('%s.html' % w['key'],
            '%s by Lumera | %s' % (w['name'], w['tag'].replace('&amp;', '&')),
            w['lede'][:150], w['accents'], w['head'], w['grad'], w['lede'], body,
            actions=[('Sign up', 'app.html#/signup', True),
                     ('See all four worlds', 'worlds.html', False)]))

    made.append(page('features.html', 'Features | Lumera',
        'Everything your money needs, in one calm place.',
        ('#4f46e5', '#8b5cf6', '#c4b5fd'),
        'Everything your money needs,', 'in one calm place',
        'Not another budgeting tab. A financial operating system that understands the invisible patterns behind your spending.',
        '    <section class="section tight">' + picker() + '</section>\n'
        + sec('Try one now', 'Small habits,', 'big numbers',
              'Drag the sliders. This is a taste of the Wealth Simulator.', savings_sim())
        + sec('Where they live', 'Split across', 'four worlds',
              'Every feature belongs to a world, so the app stays calm instead of showing you all of it at once.',
              world_strip(WORLDS)),
        actions=[('Start free', 'app.html#/signup', True), ('How it works', 'how-it-works.html', False)]))

    LOG = ['Groceries £24', 'Bus £2.80', 'Coffee £3.40', 'Streaming £10.99', 'Lunch £7.50', 'Phone £15', 'Takeaway £18',
           'Groceries £31', 'Gym £25', 'Bus £2.80', 'Cinema £11', 'Coffee £3.40', 'Rent £650', 'Lunch £6.20', 'Music £10.99',
           'Groceries £27', 'Haircut £14', 'Takeaway £22', 'Bus £5.60', 'Gift £20', 'Coffee £3.40', 'Groceries £29', 'Books £9',
           'Lunch £8', 'Taxi £12', 'Takeaway £16', 'Groceries £25', 'Cloud storage £2.99']
    DOT = ['#22C55E', '#38BDF8', '#F59E0B', '#EC4899', '#A78BFA', '#F472B6', '#FB923C']
    import json as _j
    cal = ''.join('<span class="mo-day" style="--d:%s">%d</span>' % (DOT[i % len(DOT)], i + 1) for i in range(30))
    rail = ''.join('<div class="mo-step%s"><b>Step %d</b><span>%s</span></div>' % (' on' if i == 0 else '', i + 1, t) for i, (t, d) in enumerate(STEPS))
    phases = ''.join('<div class="mo-phase"%s><h3>%s</h3><p>%s</p></div>' % ('' if i == 0 else ' hidden', t, d) for i, (t, d) in enumerate(STEPS))
    month_html = ('<div class="month reveal" data-log="%s"><div>' % _h.escape(_j.dumps(LOG)) + '<div class="mo-rail">' + rail + '</div>'
                  '<div class="mo-cal" aria-hidden="true">' + cal + '</div>'
                  '<div class="mo-ctrl"><button type="button" class="fx-btn mo-play">Play the month</button>'
                  '<input type="range" min="1" max="30" value="6" aria-label="Day of the month"></div></div>'
                  '<div class="mo-read" aria-live="polite"><div class="mo-dnum">Day 6 <small>of 30</small></div>' + phases +
                  '<div class="mo-log"></div>'
                  '<div class="mo-phase" hidden></div>'
                  '<div class="mo-score"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/>'
                  '<circle class="ring-fg" cx="50" cy="50" r="42" fill="none" stroke="#5EEAD4" stroke-width="10" stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264" transform="rotate(-90 50 50)"/>'
                  '<text x="50" y="57" text-anchor="middle" fill="#fff" font-size="24" font-weight="700">71</text></svg>'
                  '<p style="font-size:.85rem">Alex (example) finishes the month with a health score of 71. The ring fills on day 30.</p></div>'
                  '</div></div>')
    envelope = ('<div class="env-wrap reveal"><button type="button" class="env" aria-expanded="false" aria-label="Open the example results envelope">'
                '<span class="env-back"></span>'
                '<span class="env-card c1"><b>Health score</b><strong>71 / 100</strong><p>One number from seven benchmarked pillars, so progress is visible month to month.</p></span>'
                '<span class="env-card c2"><b>Your biggest leak</b><strong>Takeaways</strong><p>The single category costing you most against people like you.</p></span>'
                '<span class="env-card c3"><b>A 30-day plan</b><strong>3 moves</strong><p>Sized to your actual income, not generic advice.</p></span>'
                '<span class="env-front"><span>Your results &middot; Alex (example)</span></span><span class="env-flap"></span><span class="env-seal">L</span>'
                '</button><div class="env-label">Tap the envelope to open your example results</div></div>')
    nevers = ('<div class="never">'
              '<div class="never-card reveal"><span class="stamp">NEVER</span><h3>Ask for your bank login</h3><p>You type in what you want Lumera to see. Nothing is pulled from your bank.</p></div>'
              '<div class="never-card reveal"><span class="stamp">NEVER</span><h3>Recommend a product</h3><p>Lumera explains and benchmarks. It is educational, not financial advice.</p></div>'
              '</div>')
    made.append(page('how-it-works.html', 'How it works | Lumera',
        'Three steps, thirty days: track, compare, and get your plan.',
        ('#0f766e', '#14b8a6', '#5eead4'),
        'Three steps,', 'thirty days',
        'One month of ordinary behaviour is enough to tell you what is actually going on with your money. Here is the whole process.',
        sec('Scrub through a month', 'Thirty days', 'in ten seconds',
            'Drag the slider or press play to follow Alex (example), a made-up user, through the month.', month_html)
        + sec('What you get at the end', 'A plan,', 'not a chart',
              'A score you can move, the leaks worth closing first, and the order to do them in.', envelope)
        + sec('What it never does', 'No bank login.', 'No advice.',
              'Lumera is educational. It explains and benchmarks; it never recommends a product or asks for banking credentials.',
              nevers + actions_row([('Start your 30-day review', 'app.html#/signup', True),
                                    ('Read the privacy page', 'privacy.html', False)])),
        actions=[('Start free', 'app.html#/signup', True), ('See the features', 'features.html', False)]))

    # My Team. Photos and details arrive person by person; anyone without a
    # photo yet shows their initials.
    import json as _json
    TEAM = [(t['name'], t['role'], t['quote'], t['why'], t['photo'], t['words'], t['interests'])
            for t in _json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'team.json'), encoding='utf-8'))]
    import html as _html
    FACES = ''.join(('<span><img src="assets/team/%s.webp" alt="%s" loading="lazy"></span>' % (t[4], _h.escape(t[0]))) if t[4] else '<span>%s</span>' % ''.join(w[0] for w in t[0].split())[:2] for t in TEAM)
    PAL = [('#7C3AED', '#F0ABFC'), ('#DB2777', '#FBCFE8'), ('#2563EB', '#93C5FD'), ('#16A34A', '#86EFAC'),
           ('#D97706', '#FCD34D'), ('#0D9488', '#5EEAD4'), ('#C026D3', '#F5D0FE'), ('#E11D48', '#FECDD3')]
    def member(i, n, role, quote, why, img, words, interests):
        e = _h.escape
        c, c2 = PAL[i % len(PAL)]
        initials = ''.join(w[0] for w in n.split())[:2]
        art = ('<img src="assets/team/%s.webp" alt="" loading="lazy">' % img) if img else '<span class="initials">%s</span>' % initials
        chips = ('<span class="cc-chips">%s</span>' % ''.join('<span>%s</span>' % e(w) for w in words)) if words else ''
        first = n.split()[0]
        back = '<span class="cc-h">%s</span><span class="cc-scroll">' % e(n)
        if quote: back += '<span class="cc-quote">&ldquo;%s&rdquo;</span>' % e(quote)
        if why: back += '<span class="cc-p"><b>Why Lumera:</b> %s</span>' % e(why)
        if interests: back += '<span class="cc-p"><b>Into:</b> %s</span>' % e(' · '.join(interests))
        if not (quote or why or interests): back += '<span class="cc-p">More about %s soon.</span>' % e(first)
        back += '</span>'
        card = collect_card(c, c2, e(n), 'No. %02d' % (i + 1), art, e(role) or 'Role coming soon',
                            '', 'Lumera team', 'Tap to flip', back,
                            '%s, %s. Press to flip and read more.' % (e(n), e(role) or 'team member'), photo=bool(img), chips=chips)
        return '<div class="cc-slot reveal">%s</div>' % card
    team_cards = ''.join(member(i, *t) for i, t in enumerate(TEAM))
    made.append(page('team.html', 'Our Team | Lumera', 'The people building Lumera.',
        ('#7c3aed', '#a855f7', '#f0abfc'),
        'Our Team:', 'the people building Lumera',
        'Students and early-career builders who want financial understanding to be for everyone. Collect the set: every card flips.',
        '    <section class="section tight"><div class="cc-deck">' + team_cards + '</div>'
        '<div class="fx-center"><button type="button" class="fx-btn" data-fx-flipall>Flip every card</button></div></section>\n'
        + sec('Why we are building it', 'Financial clarity,', 'made accessible',
              'Lumera exists to give students and early-career professionals the financial intelligence that used to be reserved for the wealthy.',
              actions_row([('Read about Lumera', 'about.html', True),
                           ('See the team in the app', 'app.html#/team', False)])),
        actions=[('About Lumera', 'about.html', True)]))

    made.append(page('about.html', 'About Lumera | All financial intelligence. One place.',
        'Lumera turns the financial intelligence once reserved for the wealthy into something anyone can use.',
        ('#7c3aed', '#a855f7', '#f0abfc'),
        'Financial clarity,', 'made accessible',
        'Lumera turns the financial intelligence once reserved for the wealthy into something anyone can use. Clear, calm, and jargon-free.',
        '    <section class="section tight"><div class="ba reveal">'
        '<div class="ba-side ba-before"><div class="eyebrow">The problem we solve</div><p>Most people do not understand their money, not because they are bad with it, '
        'but because no one ever taught them.</p></div>'
        '<div class="ba-side ba-after"><div class="eyebrow" style="color:#fff">Our mission</div><p>Lumera closes that gap with tools that explain themselves. '
        'No jargon, no complexity, just clarity.</p></div>'
        '<input type="range" min="4" max="96" value="50" aria-label="Slide between the problem and our mission"><span class="ba-line"></span></div>'
        '<p class="fx-hint">Drag across to move from the problem to the mission.</p></section>\n'
        + sec('What Lumera gives you', 'Six things it does', 'from day one', '',
              '<div class="bento">'
              '<div class="b-wide reveal" style="--c:#7C3AED"><img src="assets/brand/lumi.webp" alt=""><span class="b-n">01</span><h3>Benchmark clarity</h3><p>See every spending category against realistic ranges for your income and region.</p></div>'
              '<div class="b-tall reveal" style="--c:#16A34A"><img src="assets/brand/sprout.webp" alt=""><span class="b-n">02</span><h3>A learning engine</h3><p>Two-minute lessons, quizzes and a glossary that turn jargon into confidence.</p></div>'
              '<div class="reveal" style="--c:#DB2777"><span class="b-n">03</span><h3>Real tools</h3><p>Budget, goals, net worth, debt payoff, credit, investing and a wealth simulator.</p></div>'
              '<div class="reveal" style="--c:#2563EB"><img src="assets/brand/nova.webp" alt=""><span class="b-n">04</span><h3>Markets, decoded</h3><p>Live-style markets, a world monitor and plain-English news with the why.</p></div>'
              '<div class="reveal" style="--c:#D97706"><img src="assets/brand/blaze.webp" alt=""><span class="b-n">05</span><h3>A career head-start</h3><p>Finance careers, universities, CV lab and interview prep.</p></div>'
              '<div class="reveal" style="--c:#0D9488"><span class="b-n">06</span><h3>A community</h3><p>Connect with others on the same path and share opportunities.</p></div>'
              '</div>')
        + sec('Who it is for', 'Built for people', 'starting out', 'Pick the one that sounds most like you.',
              '<div class="persona reveal"><div class="ps-tabs" role="tablist" aria-label="Who Lumera is for">'
              '<button type="button" class="ps-tab" role="tab" aria-selected="true" data-i="0" style="--c:#16A34A"><img src="assets/brand/sprout.webp" alt=""><b>Students</b></button>'
              '<button type="button" class="ps-tab" role="tab" aria-selected="false" tabindex="-1" data-i="1" style="--c:#D97706"><img src="assets/brand/blaze.webp" alt=""><b>Young professionals</b></button>'
              '<button type="button" class="ps-tab" role="tab" aria-selected="false" tabindex="-1" data-i="2" style="--c:#7C3AED"><img src="assets/brand/lumi.webp" alt=""><b>Anyone starting out</b></button>'
              '</div><div class="ps-stage" aria-live="polite">'
              '<div class="ps-panel" role="tabpanel" data-i="0"><img src="assets/brand/sprout.webp" alt=""><div class="ps-say"><b>Students</b><p>Build money habits early, while the stakes are low and the upside is decades long.</p></div></div>'
              '<div class="ps-panel" role="tabpanel" data-i="1" hidden><img src="assets/brand/blaze.webp" alt=""><div class="ps-say"><b>Young professionals</b><p>Turn your first real income into a foundation for lasting wealth.</p></div></div>'
              '<div class="ps-panel" role="tabpanel" data-i="2" hidden><img src="assets/brand/lumi.webp" alt=""><div class="ps-say"><b>Anyone starting out</b><p>It is never too late to start your financial journey.</p></div></div>'
              '</div></div>')
        + sec('Our Team', 'The people', 'building it',
              'Students and early-career builders. Each one has a card you can flip.',
              '<div class="faces reveal">' + FACES + '</div>' + actions_row([('Meet the team', 'team.html', True)])),
        actions=[('Start free', 'app.html#/signup', True), ('See the features', 'features.html', False)]))

    PLANS = [('Free', 'Available now', True,
              ['Monthly expense review', 'Financial health score', 'Budget &amp; savings tools', 'Subscription leak detector', 'Lumi, your money assistant']),
             ('Pro', 'Coming soon', False,
              ['Advanced AI coach', 'Unlimited simulations', 'Full benchmark analytics', 'Monthly reports', 'Subscription &amp; debt tools']),
             ('Premium', 'Coming soon', False,
              ['Portfolio analytics', 'Family budgeting', 'Tax optimisation', 'Priority AI', 'Advisor-ready summaries'])]
    free = PLANS[0]
    plans_html = ('<div class="plans"><div class="pass reveal"><div class="ps-k">Lumera pass &middot; %s</div><div class="ps-price">£0</div>'
                  '<div class="ps-sub">%s. Forever, no card.</div><div class="ps-cut"></div><ul>%s</ul>'
                  '<a class="ps-go" href="app.html#/signup">Start free</a></div>'
                  % (free[0], free[1], ''.join('<li>%s</li>' % f for f in free[3])))
    for (n, b, now, feats), c in zip(PLANS[1:], [('#7C3AED', '#F0ABFC'), ('#DB2777', '#FBCFE8')]):
        plans_html += ('<button type="button" class="pack reveal" aria-expanded="false" style="--c:%s;--c2:%s" aria-label="%s plan, coming soon. Press to see what it will include.">'
                       '<span class="pack-inside"><h3>%s</h3><span style="font-size:.8rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.75">%s &middot; will include</span>'
                       '<span class="pk-l">%s</span><span style="margin-top:auto;font-size:.8rem;opacity:.7">Tap to seal it again</span></span>'
                       '<span class="pack-wrap"><span class="pack-seal">Coming<br>soon</span><h3>%s</h3><span class="pack-tear">Tap to peek inside</span></span></button>'
                       % (c[0], c[1], n, n, b, ''.join('<span>%s</span>' % f for f in feats), n))
    plans_html += '</div>'
    FAQ = [('Is the free plan really free?', 'Yes. Every tool listed under Free is available now, with no card and no trial clock.'),
           ('Do I need to connect my bank?', 'No. Lumera never asks for banking credentials. You enter what you want it to see.'),
           ('Is this financial advice?', 'No. Lumera is educational: it explains, benchmarks and projects, but never recommends a product.'),
           ('What happens to my data?', 'Your figures are stored encrypted on our servers so they follow you between devices. You can export or delete everything at any time from Settings.')]
    chat = '<div class="chat">' + ''.join(
        '<details class="chat-q reveal"%s><summary><span class="bubble-me">%s</span></summary>'
        '<div class="chat-a"><img src="assets/brand/lumi.webp" alt="Lumi"><div class="bubble-lumi"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="ans">%s</span></div></div></details>'
        % (' open' if i == 0 else '', q, a) for i, (q, a) in enumerate(FAQ)) + '</div>'
    made.append(page('pricing.html', 'Pricing | Lumera', 'Free today. Built for what is next.',
        ('#b45309', '#f59e0b', '#fcd34d'),
        'Free today.', 'Built for what is next.',
        'Everything you need for your first 30-day review costs nothing. Paid tiers arrive when the tools behind them do.',
        '    <section class="section tight">' + plans_html + '</section>\n'
        + sec('Questions', 'Ask Lumi', 'anything', 'Tap a question and Lumi answers.', chat),
        actions=[('Start free', 'app.html#/signup', True), ('Open the app', 'app.html#/login', False)]))

    # ---- legal ----
    made.append(page('privacy.html', 'Privacy Policy | Lumera',
        'What Lumera does with information about you. Everything you enter stays in your browser.',
        ('#1d4ed8', '#3b82f6', '#67e8f9'),
        'Privacy', 'Policy',
        'Everything you type into Lumera stays in your own browser. We have no server that stores it, '
        'cannot read it, and could not hand it over if asked. Here is the whole picture.',
        '    <section class="section tight">' + _legal.PRIVACY + '</section>\n',
        actions=[('Cookies & storage', 'cookies.html', False), ('Terms', 'terms.html', False)]))

    made.append(page('terms.html', 'Terms & Conditions | Lumera',
        'The terms you agree to when you use Lumera.',
        ('#4f46e5', '#8b5cf6', '#c4b5fd'),
        'Terms &amp;', 'Conditions',
        'Lumera is an educational tool, not a financial adviser. These are the terms you accept '
        'when you use it.',
        '    <section class="section tight">' + _legal.TERMS + '</section>\n',
        actions=[('Privacy Policy', 'privacy.html', False), ('Refunds', 'refunds.html', False)]))

    made.append(page('cookies.html', 'Cookies & storage | Lumera',
        'Lumera sets one cookie, to keep you logged in. Here is what it stores in your browser, and what it loads from elsewhere.',
        ('#0f766e', '#14b8a6', '#5eead4'),
        'Cookies', '& storage',
        'Lumera sets one cookie, to keep you logged in, and no tracking of any kind. Your figures are '
        'stored encrypted on our servers; a few preferences live in your browser. All of it is listed here.',
        '    <section class="section tight">' + _legal.COOKIES + '</section>\n',
        actions=[('Privacy Policy', 'privacy.html', False)]))

    made.append(page('refunds.html', 'Refunds & cancellation | Lumera',
        'Lumera is free, so there is nothing to refund. These terms apply if paid plans launch.',
        ('#b45309', '#f59e0b', '#fcd34d'),
        'Refunds &', 'cancellation',
        'Lumera is free today, so there is nothing to refund and nothing to cancel. These are the '
        'terms that will apply if the paid plans launch.',
        '    <section class="section tight">' + _legal.REFUNDS + '</section>\n',
        actions=[('Pricing', 'pricing.html', False), ('Terms', 'terms.html', False)]))

    # ---- 404: served for any unknown address, so links are root-relative ----
    made.append(page('404.html', 'Page not found | Lumera', 'That page does not exist.',
        ('#6d28d9', '#8b5cf6', '#c4b5fd'),
        'This page', 'is not here',
        'The link may be old, or the address mistyped. Everything Lumera has is one click away.',
        '',
        actions=[('Go to the home page', 'index.html', True), ('Open the app', 'app.html', False)]))
    p404 = os.path.join(ROOT, '404.html')
    html = open(p404).read().replace('<head>', '<head>\n<base href="/">\n<meta name="robots" content="noindex">', 1)
    open(p404, 'w').write(html)

    return made


if __name__ == '__main__':
    for f in build():
        print('built', f)
