"""Write public/app.html: the production build of the app.

Lumera.html is the source. It compiles itself in the browser (Babel
standalone, the Tailwind Play CDN, React from unpkg), which is fine while
editing but not for visitors: a multi-megabyte compiler, styles generated on
every page load, and three outside CDNs the app cannot work without.

The production copy is built once, here:
  * the JSX is compiled ahead of time (Babel, from node_modules);
  * the Tailwind classes it uses are compiled to public/app.css;
  * React and ReactDOM are served from public/vendor/ (same origin);
  * the page's Content-Security-Policy drops 'unsafe-eval' and the CDNs;
  * window.__LUMERA_HOSTED tells the app it must talk to the server and may
    never fall back to the password-less, browser-only mode used by the
    offline previews.

    npm ci && python3 build-app.py      # writes public/app.html, app.css, vendor/
    python3 build-app.py OUT_DIR        # writes the same files under OUT_DIR (sync-public.sh --check)
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
NM = os.path.join(ROOT, 'node_modules')
BABEL = os.path.join(NM, '@babel', 'standalone', 'babel.min.js')
TAILWIND = os.path.join(NM, '.bin', 'tailwindcss')
VENDOR = {
    'react.production.min.js': os.path.join(NM, 'react', 'umd', 'react.production.min.js'),
    'react-dom.production.min.js': os.path.join(NM, 'react-dom', 'umd', 'react-dom.production.min.js'),
}


def need(path, what):
    if not os.path.exists(path):
        sys.exit('build-app.py: %s is missing (%s). Run `npm ci` first.' % (what, os.path.relpath(path, ROOT)))


def compile_jsx(source):
    with tempfile.TemporaryDirectory() as tmp:
        src, out = os.path.join(tmp, 'app.jsx'), os.path.join(tmp, 'app.js')
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write(source)
        script = ("const babel=require(%s);const fs=require('fs');"
                  "fs.writeFileSync(%s, babel.transform(fs.readFileSync(%s,'utf8'),"
                  "{presets:['react'],compact:true,comments:false}).code);"
                  % (json.dumps(BABEL), json.dumps(out), json.dumps(src)))
        subprocess.run(['node', '-e', script], check=True, cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        with open(out, encoding='utf-8') as fh:
            return fh.read()


def compile_css(doc, config_js):
    """Tailwind over the source page, with the page's own tailwind.config."""
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'page.html')
        with open(page, 'w', encoding='utf-8') as fh:
            fh.write(doc)
        cfg = os.path.join(tmp, 'tailwind.config.js')
        with open(cfg, 'w', encoding='utf-8') as fh:
            fh.write('const c = (%s);\nc.content = [%s];\nmodule.exports = c;\n' % (config_js, json.dumps(page)))
        src = os.path.join(tmp, 'in.css')
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n')
        out = os.path.join(tmp, 'out.css')
        subprocess.run([TAILWIND, '-c', cfg, '-i', src, '-o', out, '--minify'], check=True, cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, env={**os.environ, 'BROWSERSLIST_IGNORE_OLD_DATA': '1'})
        with open(out, encoding='utf-8') as fh:
            return fh.read()


def build(out_dir):
    for f, what in [(BABEL, 'Babel'), (TAILWIND, 'Tailwind CLI')] + [(p, n) for n, p in VENDOR.items()]:
        need(f, what)
    with open(os.path.join(ROOT, 'Lumera.html'), encoding='utf-8') as fh:
        doc = fh.read()

    # 1. Tailwind: the Play CDN script and its inline config become a stylesheet.
    m = re.search(r'<!-- Tailwind \(Play CDN\) -->\s*<script src="https://cdn\.tailwindcss\.com"></script>\s*'
                  r'<script>\s*tailwind\.config\s*=\s*(\{.*?\n  \})\s*</script>\n?', doc, re.S)
    if not m:
        sys.exit('build-app.py: could not find the Tailwind Play CDN block in Lumera.html')
    css = compile_css(doc, m.group(1))
    doc = doc[:m.start()] + doc[m.end():]
    # The CDN injected its styles at the end of <head>; keep that cascade order.
    doc = doc.replace('</head>', '<link rel="stylesheet" href="app.css">\n</head>', 1)

    # 2. React from our own origin.
    doc = re.sub(r'<script crossorigin src="https://unpkg\.com/react@[^"]*/umd/react\.production\.min\.js"[^>]*></script>',
                 '<script src="vendor/react.production.min.js"></script>', doc, count=1)
    doc = re.sub(r'<script crossorigin src="https://unpkg\.com/react-dom@[^"]*/umd/react-dom\.production\.min\.js"[^>]*></script>',
                 '<script src="vendor/react-dom.production.min.js"></script>', doc, count=1)
    if 'unpkg.com/react' in doc:
        sys.exit('build-app.py: React is still loaded from unpkg; update the patterns above.')

    # 3. JSX compiled ahead of time; Babel standalone removed.
    m = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', doc, re.S)
    if not m:
        sys.exit('build-app.py: no <script type="text/babel"> in Lumera.html')
    # A compiled script may contain "</script" inside a string; escape it so
    # the HTML parser does not end the tag early.
    code = compile_jsx(m.group(1)).replace('</script', '<\\/script')
    doc = doc[:m.start()] + '<script>' + code + '</script>' + doc[m.end():]
    doc = re.sub(r'<script src="https://unpkg\.com/@babel/standalone[^"]*"[^>]*></script>\n?', '', doc, count=1)

    # 4. A tighter page policy: no eval, no CDNs.
    doc = re.sub(r"(<meta http-equiv=\"Content-Security-Policy\" content=\")[^\"]*\"",
                 lambda mm: mm.group(1) + ("default-src 'self' blob:; script-src 'self' 'unsafe-inline'; "
                                           "style-src 'self' 'unsafe-inline'; font-src 'self' data:; "
                                           "connect-src 'self' https://open.er-api.com https://api.mymemory.translated.net https://translate.googleapis.com; "
                                           "img-src 'self' data: blob: https:;\""), doc, count=1)
    if 'cdn.tailwindcss.com' in doc or 'unsafe-eval' in doc:
        sys.exit('build-app.py: a CDN reference or unsafe-eval survived the build.')

    # 5. The hosted app must use the server.
    doc = doc.replace('<head>', '<head>\n<script>window.__LUMERA_HOSTED=true;</script>', 1)

    os.makedirs(os.path.join(out_dir, 'vendor'), exist_ok=True)
    with open(os.path.join(out_dir, 'app.html'), 'w', encoding='utf-8') as fh:
        fh.write(doc)
    with open(os.path.join(out_dir, 'app.css'), 'w', encoding='utf-8') as fh:
        fh.write(css)
    for name, src in VENDOR.items():
        shutil.copyfile(src, os.path.join(out_dir, 'vendor', name))
    return len(doc), len(css)


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public')
    html_len, css_len = build(target)
    print('built %s/app.html (%d KB), app.css (%d KB), vendor/' % (os.path.relpath(target, ROOT), html_len // 1024, css_len // 1024))
