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
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# The page content lives in one place, next door, so the single file and the
# multi-file site can never disagree about what the sections say.
import importlib.util as _ilu
_spec = _ilu.spec_from_file_location('lumera_content',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build-site.py'))
_content = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_content)
WORLDS, FEATURES, STEPS = _content.WORLDS, _content.FEATURES, _content.STEPS

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
    ('privacy', 'privacy.html', 'Privacy Policy'),
    ('terms', 'terms.html', 'Terms & Conditions'),
    ('cookies', 'cookies.html', 'Cookies & storage'),
    ('refunds', 'refunds.html', 'Refunds & cancellation'),
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
# the third-party switch travels with the single file too, so the cookies
# page's button works there and the choice is honoured
_ca = landing.index('<aside class="consent"')
consent_box = landing[_ca:landing.index('</aside>', _ca) + len('</aside>')]
# the landing's own section script (worlds, the feature deck, the flow, trust)
# travels with the single file, or those sections arrive empty
_sa = landing.index('/* ============================================================\n   The rest of the page: content is data, rendered once.')
_sb = landing.index('})();', landing.index('items.forEach(el => io.observe(el));', _sa)) + 5
sections_js = landing[_sa:_sb]

_ja = landing.index('/* ============================================================\n   Third-party content switch.')
consent_js = landing[_ja:landing.index('})();', landing.index('data-consent-reopen', _ja)) + 5]

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
    hero = s[s.index('    <div class="page-hero">'):s.index('</div>\n</div>\n\n<main class="rest" id="main">')]
    main = s[s.index('<main class="rest" id="main">') + len('<main class="rest" id="main">'):s.index('    <footer class="site-footer">')]
    return ('<div class="page-top"><div class="wash"></div>\n' + hero + '</div></div>\n'
            + '<div class="rest">' + main + '</div>')


def landing_grids(html):
    """The landing now writes its own sections from its own script, which
    travels with the page, so there is nothing to pre-render here."""
    return html


def home_body():
    """The landing: video hero, marquee, and its own sections."""
    s = landing
    wrap = s[s.index('<div class="page-wrap">'):s.index('<main class="rest" id="main">')]
    main = s[s.index('<main class="rest" id="main">') + len('<main class="rest" id="main">'):s.index('    <footer class="site-footer">')]
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

def compile_jsx(source):
    """Run the app's JSX through Babel once, at build time, using node."""
    import json
    import subprocess
    import tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.jsx', delete=False) as fh:
        fh.write(source)
        src_path = fh.name
    out_path = src_path + '.out'
    script = (
        "const babel=require(%s);const fs=require('fs');"
        "const code=fs.readFileSync(%s,'utf8');"
        "const out=babel.transform(code,{presets:['react'],compact:false,comments:false}).code;"
        "fs.writeFileSync(%s,out);"
        % (json.dumps(os.path.join(ROOT, '_vendor', 'babel.js')),
           json.dumps(src_path), json.dumps(out_path))
    )
    subprocess.run(['node', '-e', script], check=True, cwd=ROOT,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out = open(out_path).read()
    os.unlink(src_path)
    os.unlink(out_path)
    return out


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

    # A framed document has an opaque origin, where even *reading*
    # window.localStorage throws SecurityError, and the property cannot be
    # redefined. So the payload's own references are pointed at a shim that
    # uses the real storage when it works and memory when it does not.
    shim = '''<script>
window.__LS = (function () {
  function memory() {
    var map = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setItem: function (k, v) { map[k] = String(v); },
      removeItem: function (k) { delete map[k]; },
      clear: function () { map = {}; },
      key: function (i) { return Object.keys(map)[i] || null; },
      get length() { return Object.keys(map).length; }
    };
  }
  try {
    var s = window.localStorage;
    s.setItem('__probe', '1'); s.removeItem('__probe');
    return s;
  } catch (e) { return memory(); }
})();
/* Fragment navigation does nothing in a framed document, so the app's route
   lives here instead. The frame's name carries the page to open on. */
window.__hash = (window.name && window.name.charAt(0) === '/') ? '#' + window.name : '#/';
window.__go = function (to) {
  var next = (String(to).charAt(0) === '#') ? String(to) : '#' + String(to);
  if (next === window.__hash) return;
  window.__hash = next;
  try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
  catch (e) { var ev = document.createEvent('Event'); ev.initEvent('hashchange', true, true); window.dispatchEvent(ev); }
  try { window.scrollTo(0, 0); } catch (e) {}
};

window.__SS = (function () {
  try {
    var s = window.sessionStorage;
    s.setItem('__probe', '1'); s.removeItem('__probe');
    return s;
  } catch (e) { return window.__LS; }
})();
</script>
'''
    # A blob: document ignores fragment navigation: setting location.hash is a
    # no-op there, so every button in the app did nothing. Route in memory
    # instead, and let the frame's name carry the page to open on.
    doc = doc.replace("useState(()=> (location.hash.replace('#','')||'/'))",
                      "useState(()=> (window.__hash.replace('#','')||'/'))")
    doc = doc.replace("setRoute(location.hash.replace('#','')||'/')",
                      "setRoute(window.__hash.replace('#','')||'/')")
    doc = doc.replace("const nav = useCallback((to)=>{ location.hash = to; },[]);",
                      "const nav = useCallback((to)=>{ window.__go(to); },[]);")
    doc = doc.replace("location.hash=redirect;", "window.__go(redirect);")
    doc = re.sub(r"location\.replace\('[^']*'\);", "window.__go('/');", doc)

    doc = re.sub(r'\blocalStorage\b', '__LS', doc)
    doc = re.sub(r'\bsessionStorage\b', '__SS', doc)
    doc = doc.replace('<head>', '<head>\n' + shim, 1)

    # A stylesheet blocks every script after it until it resolves. Inside this
    # file the font requests are the only network calls left, and while they
    # are pending nothing in the app or the portal runs, which looked like a
    # dead page. Loaded with media="print" they never block; the onload puts
    # them back for real once they arrive.
    doc = re.sub(r'<link href="(https://(?:fonts\.googleapis|api\.fontshare|cdn\.jsdelivr)[^"]*)" rel="stylesheet">',
                 r'<link href="\1" rel="stylesheet" media="print" onload="this.media=\'all\'">', doc)
    doc = re.sub(r'<link rel="stylesheet" href="(https://[^"]*)">',
                 r'<link rel="stylesheet" href="\1" media="print" onload="this.media=\'all\'">', doc)

    # Compile the JSX here rather than in the browser. Babel-in-the-page took
    # twenty seconds or more on a big file and needed a 2.9MB compiler along
    # for the ride; precompiled, the app paints almost immediately.
    m = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', doc, re.S)
    if m:
        compiled = compile_jsx(m.group(1))
        doc = doc[:m.start()] + '<script>' + compiled + '</script>' + doc[m.end():]
        doc = re.sub(r'<script src="https://unpkg\.com/@babel/standalone[^"]*"[^>]*></script>', '', doc, count=1)

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
        # Library sources contain both "</script>" and "<script>" inside string
        # literals. Either one ends the tag they are inlined into as far as the
        # HTML parser is concerned, which silently drops the rest of the file.
        # \x3c is a valid JS escape for "<", so the strings keep their meaning.
        code = (open(path).read()
                .replace('</script', '<\\/script')
                .replace('<script', '\\x3cscript'))
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
    function deepLink() {
        var rest = (location.hash || '').replace(/^#\/(app|admin)\/?/, '');
        return rest ? '/' + rest : '/';
    }
    function frameFor(which) {
        if (frames[which]) return frames[which];
        var node = document.getElementById('payload-' + which);
        if (!node) return null;
        var bin = atob(node.textContent.trim());
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var html = new TextDecoder('utf-8').decode(bytes);

        var f = document.createElement('iframe');
        f.className = 'app-frame';
        f.setAttribute('title', which === 'app' ? 'Lumera app' : 'Admin portal');
        /* The page to open on, read by the payload before it boots. */
        f.name = deepLink();
        f.hidden = true;
        document.body.appendChild(f);

        /* Write the document in on the next tick rather than pointing at a
           blob: URL. A blob document is a foreign, non-secure origin, where
           window.crypto.subtle is missing (which broke the portal's key) and
           storage throws. Written into the frame it shares this page's origin
           and behaves like the file you opened. The tick matters: the frame's
           own about:blank load would otherwise clear what we just wrote. */
        setTimeout(function () {
            var d = f.contentDocument || (f.contentWindow && f.contentWindow.document);
            if (!d) return;
            d.open();
            d.write(html);
            d.close();
        }, 0);

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

    }

    function hideFrames() {
        document.body.classList.remove('on-app');
        ['app', 'admin'].forEach(function (w) { if (frames[w]) frames[w].hidden = true; });

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

<a class="skip-link" href="#main">Skip to content</a>

%s

<div class="site-nav">
%s
</div>

%s

%s

%s

%s
</body>
</html>
''' % (head_links, style, sub_style, EXTRA_CSS, atmo, consent_box, NAV,
       '\n\n'.join(sections), hashify(footer), PAYLOADS,
       ROUTER + '\n<script>' + sections_js + '</script>\n<script>' + consent_js + '</script>')

path = os.path.join(ROOT, 'lumera.html')
open(path, 'w').write(out)
print('built lumera.html  (%d KB, %d pages)' % (len(out) // 1024, len(PAGES)))
