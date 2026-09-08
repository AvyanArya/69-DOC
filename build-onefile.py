#!/usr/bin/env python3
"""
Fold the whole marketing site into a single self-contained HTML file.

Every page becomes a section in one document, switched by the hash, so
lumera.html on its own is the entire site: no other files, no server, no
folder to keep together. Run after build-site.py:

    python3 build-site.py && python3 build-onefile.py
"""

import base64
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
    # the app and the portal live in this file too, as framed routes
    html = re.sub(r'href="app\.html#/([a-z-]+)"', r'href="#/app/\1"', html)
    html = html.replace('href="app.html"', 'href="#/app"')
    html = html.replace('href="admin.html"', 'href="#/admin"')
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

def payload(fname):
    """The app and the portal, parked in the document as inert text.

    They are full HTML documents with their own stylesheets and React
    runtime, so they cannot share this page's DOM. Kept in a
    <script type="text/plain"> they parse as nothing, and the router
    turns one into a Blob URL for an iframe when you open that route.
    Their meta CSP is dropped because a blob: document has no origin of
    its own for 'self' to resolve against."""
    doc = open(os.path.join(ROOT, fname)).read()
    doc = re.sub(r'<meta http-equiv="Content-Security-Policy".*?>\n', '', doc, flags=re.S)
    # Inside the frame there is no sibling file to open, so links between the
    # app and the portal are neutralised; the bar at the bottom switches them.
    doc = re.sub(r'href="(app|admin-portal|index)\.html[^"]*"', 'href="#"', doc)
    doc = re.sub(r"'(app|admin-portal|index)\.html'", "'#'", doc)

    # Inline the runtime the app loads from a CDN. A file opened from disk
    # cannot always reach the network, and a blob: document has no base URL
    # to resolve a relative fallback against, so the libraries travel with it.
    vendor = [
        (r'<script crossorigin src="https://unpkg\.com/react@[^"]*"[^>]*></script>', 'react.js'),
        (r'<script crossorigin src="https://unpkg\.com/react-dom@[^"]*"[^>]*></script>', 'react-dom.js'),
        (r'<script src="https://unpkg\.com/@babel/standalone[^"]*"[^>]*></script>', 'babel.js'),
        (r'<script src="https://cdn\.tailwindcss\.com[^"]*"></script>', 'tailwind.js'),
    ]
    for pattern, lib in vendor:
        path = os.path.join(ROOT, '_vendor', lib)
        if not os.path.exists(path):
            continue
        code = open(path).read().replace('</script>', '<\\/script>')
        doc = re.sub(pattern, lambda m, c=code: '<script>' + c + '</script>', doc, count=1)

    # Base64, not raw text. A payload holding HTML comments and the string
    # "<script" pushes the parser into its double-escaped state, where the
    # container never closes and every script after it is swallowed, which is
    # exactly what happened. Base64 has no characters the parser reacts to.
    return base64.b64encode(doc.encode('utf-8')).decode('ascii')


PAYLOADS = '''
<script id="payload-app" type="text/plain">%s</script>
<script id="payload-admin" type="text/plain">%s</script>
''' % (payload('Lumera.html'), payload('admin-portal.html'))

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
/* The landing carries its own header inside the video hero, so the shared bar
   is hidden while the landing is on screen. */
body.on-home .site-nav { display: none; }
/* The app and the portal run in their own document, framed full-bleed. */
.app-frame { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 40; background: #080610; }
body.on-app .site-nav, body.on-app .atmo, body.on-app .site-footer { display: none; }
.frame-bar {
    position: fixed; z-index: 41; left: 50%; transform: translateX(-50%); bottom: 18px;
    display: flex; gap: .5rem; align-items: center;
    background: rgba(8,6,16,.86); backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,.14); border-radius: 999px; padding: .4rem .5rem;
    box-shadow: 0 18px 40px -20px rgba(0,0,0,.9);
}
.frame-bar a {
    font-size: .8rem; font-weight: 600; text-decoration: none; padding: .4rem .9rem; border-radius: 999px;
    color: hsl(var(--foreground) / .8);
}
.frame-bar a:hover { background: rgba(255,255,255,.08); color: hsl(var(--foreground)); }
.frame-bar a.on { background: linear-gradient(to left, #6366f1, #a855f7, #fcd34d); color: #17110a; }
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
        if (h === 'app' || h.indexOf('app/') === 0) return 'app';
        if (h === 'admin') return 'admin';
        return routes.some(function (r) { return r.dataset.route === h; }) ? h : 'home';
    }

    /* The app and the portal are whole documents. Each is turned into a Blob
       URL once, then framed, so their styles and scripts never touch this page. */
    var frames = {};
    function frameFor(which) {
        if (frames[which]) return frames[which];
        var node = document.getElementById('payload-' + which);
        if (!node) return null;
        var bin = atob(node.textContent.trim());
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var html = new TextDecoder('utf-8').decode(bytes);
        var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        var f = document.createElement('iframe');
        f.className = 'app-frame';
        f.setAttribute('title', which === 'app' ? 'Lumera app' : 'Admin portal');
        f.src = url;
        f.hidden = true;
        document.body.appendChild(f);
        frames[which] = f;
        return f;
    }

    function showFrame(which) {
        document.body.classList.add('on-app');
        ['app', 'admin'].forEach(function (w) {
            var f = frames[w];
            if (f && w !== which) f.hidden = true;
        });
        var f = frameFor(which);
        if (!f) return;
        f.hidden = false;
        /* Carry a deep link through: #/app/signup opens the app on signup. */
        var deep = (location.hash || '').replace(/^#\\/(app|admin)\\/?/, '');
        var target = f.src.split('#')[0] + (deep ? '#/' + deep : '');
        if (f.getAttribute('data-at') !== target) {
            f.setAttribute('data-at', target);
            f.src = target;
        }
        document.title = which === 'app' ? 'Lumera app' : 'Lumera admin portal';
        document.querySelectorAll('.frame-bar a').forEach(function (a) {
            a.classList.toggle('on', a.getAttribute('href') === '#/' + which);
        });
        var bar = document.querySelector('.frame-bar');
        if (bar) bar.hidden = false;
    }

    function hideFrames() {
        document.body.classList.remove('on-app');
        ['app', 'admin'].forEach(function (w) { if (frames[w]) frames[w].hidden = true; });
        var bar = document.querySelector('.frame-bar');
        if (bar) bar.hidden = true;
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
        if (key === 'app' || key === 'admin') { 
            routes.forEach(function (r) { r.hidden = true; });
            showFrame(key);
            return;
        }
        hideFrames();
        document.body.classList.toggle('on-home', key === 'home');
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

<div class="frame-bar" hidden>
    <a href="#/">&larr; Site</a>
    <a href="#/app">The app</a>
    <a href="#/admin">Admin portal</a>
</div>

%s

%s
</body>
</html>
''' % (head_links, style, sub_style, EXTRA_CSS, atmo, NAV,
       '\n\n'.join(sections), hashify(footer), PAYLOADS, ROUTER)

path = os.path.join(ROOT, 'lumera.html')
open(path, 'w').write(out)
print('built lumera.html  (%d KB, %d pages)' % (len(out) // 1024, len(PAGES)))
