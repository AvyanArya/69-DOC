"""Write standalone preview files: one self-contained .html per interface.

Each opens on its own (double-click, no server), so they can be shared or
attached. App screens open in the demo account and say so; the admin preview
runs the real portal on example data. They are built from lumera.html (the
single-file build), so run `npm run build` first.

    python3 build-previews.py            # writes dist-previews/
"""
import importlib.util
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'dist-previews')

PREVIEWS = [
    # file name, route in lumera.html, flag set on the outer page
    ('lumera-website', '#/', None),
    ('lumera-dashboard', '#/app/dashboard', '__LUMERA_DEMO'),
    ('lumera-financial-twin', '#/app/twin', '__LUMERA_DEMO'),
    ('lumera-community', '#/app/community', '__LUMERA_DEMO'),
    ('lumera-questionnaire', '#/app/onboarding', '__LUMERA_DEMO'),
    ('lumera-subscriptions', '#/app/subscriptions', '__LUMERA_DEMO'),
    ('lumera-goals', '#/app/goals', '__LUMERA_DEMO'),
    ('lumera-admin-portal', '#/admin', '__LUMERA_ADMIN_PREVIEW'),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    one = open(os.path.join(ROOT, 'lumera.html'), encoding='utf-8').read()
    for name, route, flag in PREVIEWS:
        boot = '<script>if(!location.hash||location.hash==="#")history.replaceState(null,"","%s");%s</script>' % (
            route, ('window.%s=true;' % flag) if flag else '')
        doc = one.replace('<head>', '<head>\n' + boot, 1)
        open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8').write(doc)
        print('built dist-previews/%s.html' % name)
    # The style showcase, with its fonts and logo inlined.
    spec = importlib.util.spec_from_file_location('onefile_assets', os.path.join(ROOT, 'build-onefile.py'))
    src = open(os.path.join(ROOT, 'build-onefile.py'), encoding='utf-8').read()
    ns = {'__file__': os.path.join(ROOT, 'build-onefile.py'), 'os': os}
    head = src[:src.index('def defer_images')]          # imports, ROOT, asset helpers only
    exec(compile(head, 'build-onefile.py', 'exec'), ns)
    html = open(os.path.join(ROOT, 'ui-styles.html'), encoding='utf-8').read()
    open(os.path.join(OUT, 'lumera-ui-styles.html'), 'w', encoding='utf-8').write(ns['inline_assets'](html))
    print('built dist-previews/lumera-ui-styles.html')
    # One file per style, with the same components.
    shown = ns['inline_assets'](html)
    for sid, label in [('brutalism', 'Brutalism'), ('neumorphism', 'Neumorphism'), ('glassmorphism', 'Glassmorphism'), ('liquid', 'Liquid Glass')]:
        doc = shown.replace("document.getElementById('styles').innerHTML = STYLES.map(section)",
                            "document.getElementById('styles').innerHTML = STYLES.filter(function(s){ return s.id==='%s'; }).map(section)" % sid)
        doc = doc.replace('<title>Lumera — UI styles</title>', '<title>Lumera — %s</title>' % label)
        doc = doc.replace('</style>', '  .jump a, .intro{ display:none; }\n</style>', 1)
        name = 'lumera-style-%s.html' % sid.replace('liquid', 'liquid-glass')
        open(os.path.join(OUT, name), 'w', encoding='utf-8').write(doc)
        print('built dist-previews/' + name)


if __name__ == '__main__':
    main()
