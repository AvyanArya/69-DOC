"""Write public/app.html: the app with its JSX compiled ahead of time.

Lumera.html compiles itself in the browser with Babel standalone, which is
fine while editing but costs every visitor a 2.9 MB download and seconds of
work on a phone. The copy the server hands out is compiled once, here.

    python3 build-app.py                 # writes public/app.html
    python3 build-app.py some/path.html  # writes somewhere else (sync-public.sh --check)

Needs node and the vendored compiler at _vendor/babel.js (see BACKEND.md).
Without them it copies Lumera.html unchanged, which still works, just slower.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
BABEL = os.path.join(ROOT, '_vendor', 'babel.js')


def compile_jsx(source):
    with tempfile.TemporaryDirectory() as tmp:
        src, out = os.path.join(tmp, 'app.jsx'), os.path.join(tmp, 'app.js')
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write(source)
        script = ("const babel=require(%s);const fs=require('fs');"
                  "fs.writeFileSync(%s, babel.transform(fs.readFileSync(%s,'utf8'),"
                  "{presets:['react'],compact:false,comments:false}).code);"
                  % (json.dumps(BABEL), json.dumps(out), json.dumps(src)))
        subprocess.run(['node', '-e', script], check=True, cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        with open(out, encoding='utf-8') as fh:
            return fh.read()


def build(dest):
    with open(os.path.join(ROOT, 'Lumera.html'), encoding='utf-8') as fh:
        doc = fh.read()
    m = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', doc, re.S)
    if m and os.path.exists(BABEL):
        # A compiled script may contain "</script" inside a string; escape it
        # so the HTML parser does not end the tag early.
        code = compile_jsx(m.group(1)).replace('</script', '<\\/script')
        doc = doc[:m.start()] + '<script>' + code + '</script>' + doc[m.end():]
        doc = re.sub(r'<script src="https://unpkg\.com/@babel/standalone[^"]*"[^>]*></script>\n?', '', doc, count=1)
        note = 'compiled'
    else:
        note = 'copied without compiling (no _vendor/babel.js)'
    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as fh:
        fh.write(doc)
    return note


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public', 'app.html')
    print('built %s (%s)' % (os.path.relpath(target, ROOT), build(target)))
