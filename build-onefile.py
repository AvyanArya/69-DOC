#!/usr/bin/env python3
"""
Fold the whole marketing site into a single self-contained HTML file.

Every page becomes a section in one document, switched by the hash, so
lumera.html on its own is the entire site: no other files, no server, no
folder to keep together. Run after build-site.py:

    python3 build-site.py && python3 build-onefile.py
"""

import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

# The pages, in nav order. Each becomes #/<key>.
PAGES = [
    ('home', 'landing.html', 'Lumera | All financial intelligence. One place.'),
    ('worlds', 'worlds.html', 'The Lumera family'),
    ('leaf', 'leaf.html', 'Leaf by Lumera'),
    ('atlas', 'atlas.html', 'Atlas by Lumera'),
    ('shield', 'shield.html', 'Shield by Lumera'),
    ('forge', 'forge.html', 'Forge by Lumera'),
    ('features', 'features.html', 'Features'),
    ('how-it-works', 'how-it-works.html', 'How it works'),
    ('about', 'about.html', 'About Lumera'),
    ('team', 'team.html', 'The team'),
    ('pricing', 'pricing.html', 'Pricing'),
    ('privacy', 'privacy.html', 'Privacy & trust'),
]

src = {}
for key, fname, _ in PAGES:
    src[key] = open(os.path.join(ROOT, fname)).read()

landing = src['home']

# ---------------------------------------------------------------- shared bits
head_links = landing[landing.index('<link rel="preconnect"'):landing.index('<style>')]
style = landing[landing.index('<style>'):landing.rindex('</style>') + len('</style>')]
sub_style = src['about'][src['about'].index('<style>\n/* Sub-pages'):]
sub_style = sub_style[:sub_style.index('</style>') + len('</style>')]
atmo = landing[landing.index('<div class="atmo"'):landing.index('</div>', landing.index('<span class="grain">')) + 6]
footer = landing[landing.index('    <footer class="site-footer">'):
                 landing.index('    </footer>') + len('    </footer>')]

# accent triples, read back out of each generated page
def accents(key):
    m = re.search(r'--accent-a: (#\w+); --accent-b: (#\w+); --accent-c: (#\w+)', src[key])
    return m.groups() if m else ('#6366f1', '#a855f7', '#fcd34d')


def body_of(key):
    """The hero band plus the page body, for a generated sub-page."""
    s = src[key]
    hero = s[s.index('    <div class="page-hero">'):s.index('</div>\n</div>\n\n<main class="rest">')]
    main = s[s.index('<main class="rest">') + len('<main class="rest">'):s.index('    <footer class="site-footer">')]
    return ('<div class="page-top"><div class="wash"></div>\n' + hero + '</div></div>\n'
            + '<div class="rest">' + main + '</div>')


def home_body():
    """The landing: video hero, marquee, and its own sections."""
    s = landing
    wrap = s[s.index('<div class="page-wrap">'):s.index('<main class="rest">')]
    main = s[s.index('<main class="rest">') + len('<main class="rest">'):s.index('    <footer class="site-footer">')]
    return wrap + '<div class="rest">' + main + '</div>'


# nav + footer links become hash routes; the app stays an outside link
def hashify(html):
    for key, fname, _ in PAGES:
        target = '#/' if key == 'home' else '#/' + key
        html = html.replace('href="%s"' % fname, 'href="%s"' % target)
    html = html.replace('href="index.html"', 'href="#/"')
    return html


NAV = hashify('''            <header>
                <nav class="navbar">
                    <a class="nav-logo" href="index.html">
                        <!-- Logo placeholder: swap this block for the real mark. -->
                        <span class="mark" title="Logo placeholder, upload in Admin">
                            <svg width="15" height="15" viewBox="0 0 10 10" aria-hidden="true">
                                <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#E7C87A" opacity=".85"/>
                            </svg>
                        </span>
                        <span class="wordmark">Lumera</span>
                    </a>

                    <div class="nav-center">
                        <a class="nav-btn" href="worlds.html">Worlds</a>
                        <a class="nav-btn" href="features.html">Features</a>
                        <a class="nav-btn" href="how-it-works.html">How it works</a>
                        <a class="nav-btn" href="pricing.html">Pricing</a>
                        <a class="nav-btn" href="about.html">About</a>
                    </div>

                    <a class="hero-secondary liquid-glass nav-signup" href="app.html#/signup">Sign Up</a>
                </nav>
                <div class="nav-divider"></div>
            </header>''')

sections = []
for key, fname, title in PAGES:
    body = home_body() if key == 'home' else body_of(key)
    a, b, c = accents(key)
    sections.append(
        '<section class="route" id="route-%s" data-route="%s" data-title="%s" '
        'data-a="%s" data-b="%s" data-c="%s" hidden>\n%s\n</section>'
        % (key, key, title.replace('"', '&quot;'), a, b, c, hashify(body)))

EXTRA_CSS = '''
<style>
/* One document, many pages: the router shows one .route at a time. */
.route[hidden] { display: none !important; }
.site-nav { position: relative; z-index: 3; }
.nav-btn.on { color: hsl(var(--foreground)); }
.nav-btn.on::after {
    content: ""; display: block; height: 2px; margin-top: 4px; border-radius: 2px;
    background: linear-gradient(to left, #6366f1, #a855f7, #fcd34d);
}
/* The landing keeps its own header inside the video hero, so the shared one
   only shows on the other pages. */
#route-home .site-nav { display: none; }
</style>
'''

ROUTER = '''<script>
/* ============================================================
   The whole site in one file. Each page is a <section class="route">
   and the hash picks which one is on screen.
   ============================================================ */
(function () {
    var routes = [].slice.call(document.querySelectorAll('.route'));
    var root = document.documentElement;

    function keyFromHash() {
        var h = (location.hash || '').replace(/^#\\/?/, '').trim();
        if (!h) return 'home';
        return routes.some(function (r) { return r.dataset.route === h; }) ? h : 'home';
    }

    function reveal(scope) {
        var items = [].slice.call(scope.querySelectorAll('.reveal'));
        items.forEach(function (el, i) { el.style.transitionDelay = ((i % 4) * 0.07) + 's'; });
        var h = window.innerHeight;
        items.forEach(function (el) {
            if (el.getBoundingClientRect().top < h * 0.92) el.classList.add('in');
        });
        return items;
    }

    var observed = null;
    function show(key) {
        var current = null;
        routes.forEach(function (r) {
            var on = r.dataset.route === key;
            r.hidden = !on;
            if (on) current = r;
        });
        if (!current) return;

        root.style.setProperty('--accent-a', current.dataset.a);
        root.style.setProperty('--accent-b', current.dataset.b);
        root.style.setProperty('--accent-c', current.dataset.c);
        document.title = current.dataset.title;

        document.querySelectorAll('.nav-btn').forEach(function (a) {
            var href = a.getAttribute('href') || '';
            a.classList.toggle('on', href === '#/' + key);
        });

        window.scrollTo(0, 0);
        observed = reveal(current);

        var video = current.querySelector('video.bg-video');
        if (video) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }

    var ticking = false;
    function sweep() {
        ticking = false;
        if (!observed) return;
        var h = window.innerHeight;
        observed.forEach(function (el) {
            if (!el.classList.contains('in') && el.getBoundingClientRect().top < h * 0.92) {
                el.classList.add('in');
            }
        });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sweep);

    window.addEventListener('hashchange', function () { show(keyFromHash()); });
    show(keyFromHash());

    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
})();

/* ============================================================
   Landing extras: the video fade loop and the logo marquee.
   ============================================================ */
(function () {
    var video = document.getElementById('bgVideo');
    if (video) {
        var FADE = 0.5, raf = null;
        var tick = function () {
            var d = video.duration;
            if (d && isFinite(d)) {
                var t = video.currentTime, o = 1;
                if (t < FADE) o = t / FADE;
                else if (t > d - FADE) o = Math.max(0, (d - t) / FADE);
                video.style.opacity = String(o);
            }
            raf = requestAnimationFrame(tick);
        };
        var start = function () {
            video.currentTime = 0;
            video.style.opacity = '0';
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
            if (raf === null) raf = requestAnimationFrame(tick);
        };
        video.addEventListener('loadedmetadata', start);
        video.addEventListener('ended', function () {
            video.style.opacity = '0';
            setTimeout(start, 100);
        });
        if (video.readyState >= 1) start();
    }

    var track = document.getElementById('marqueeTrack');
    if (track) {
        var LOGOS = [
            { name: 'Lumera', c1: '#8B5CF6', c2: '#4C1D95' },
            { name: 'Leaf',   c1: '#22C55E', c2: '#14532D' },
            { name: 'Atlas',  c1: '#3B82F6', c2: '#1E3A8A' },
            { name: 'Shield', c1: '#64748B', c2: '#1E293B' },
            { name: 'Forge',  c1: '#C0873A', c2: '#5C3A12' }
        ];
        var row = LOGOS.map(function (l) {
            return '<div class="logo-item"><span class="icon liquid-glass" style="background-image:linear-gradient(160deg,'
                + l.c1 + ',' + l.c2 + ')">' + l.name[0] + '</span><span class="name">' + l.name + '</span></div>';
        }).join('');
        track.innerHTML = row + row;
    }
})();
</script>'''

out = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lumera | All financial intelligence. One place.</title>
<meta name="description" content="Lumera turns one month of your behaviour into a clear, benchmarked plan. Four worlds, one financial life.">
%s%s
%s
%s
</head>
<body>

%s

<div class="site-nav">
%s
</div>

%s

%s

%s
</body>
</html>
''' % (head_links, style, sub_style, EXTRA_CSS, atmo, NAV,
       '\n\n'.join(sections), hashify(footer), ROUTER)

path = os.path.join(ROOT, 'lumera.html')
open(path, 'w').write(out)
print('built lumera.html  (%d KB, %d pages)' % (len(out) // 1024, len(PAGES)))
