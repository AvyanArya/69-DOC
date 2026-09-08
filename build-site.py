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
SRC = open(os.path.join(ROOT, 'landing.html')).read()

# ---------------------------------------------------------------- shared shell
STYLE = SRC[SRC.index('<style>'):SRC.rindex('</style>') + len('</style>')]
HEAD_LINKS = SRC[SRC.index('<link rel="preconnect"'):SRC.index('<style>')]
FOOTER = SRC[SRC.index('    <footer class="site-footer">'):
             SRC.index('    </footer>') + len('    </footer>')]
ATMO = SRC[SRC.index('<div class="atmo"'):SRC.index('</div>', SRC.index('<span class="grain">')) + 6]

LOGO = '''<a class="nav-logo" href="index.html">
                        <!-- Logo placeholder: swap this block for the real mark. -->
                        <span class="mark" title="Logo placeholder, upload in Admin">
                            <svg width="15" height="15" viewBox="0 0 10 10" aria-hidden="true">
                                <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#E7C87A" opacity=".85"/>
                            </svg>
                        </span>
                        <span class="wordmark">Lumera</span>
                    </a>'''

NAV = '''            <header>
                <nav class="navbar">
                    ''' + LOGO + '''

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
            </header>'''

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
    background-image: linear-gradient(to left, #6366f1, #a855f7, #fcd34d);
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
.tool-list li { display: flex; gap: .6rem; align-items: flex-start; font-size: .95rem; color: hsl(var(--hero-sub)); opacity: .82; line-height: 1.6; }
.tool-list li::before { content: ""; flex: 0 0 auto; width: 6px; height: 6px; margin-top: .58rem; border-radius: 50%; background: var(--accent-b); }
@media (max-width: 720px) {
    .page-hero { padding: 3.5rem 1.25rem .5rem; }
    .tool-list { grid-template-columns: 1fr; }
}
</style>
'''

SCRIPT = '''<script>
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
    <div class="page-hero">
        <h1 class="page-title">%s <span class="grad">%s</span></h1>
        <p class="page-lede">%s</p>
        %s
    </div>
</div>

<main class="rest">
%s

%s
</main>

%s
</body>
</html>
''' % (title, desc, HEAD_LINKS, STYLE, a, b, c, SUB_CSS, ATMO, NAV,
       head, grad, lede, actions_html, body, FOOTER, SCRIPT)

    open(os.path.join(ROOT, fname), 'w').write(html)
    return fname


def panels(items, cols=3):
    return '<div class="grid-%d">%s</div>' % (cols, ''.join(
        '<div class="panel liquid-glass reveal"><h3>%s</h3><p>%s</p></div>' % (t, d) for t, d in items))


def sec(eyebrow, head, grad, sub='', body=''):
    return '''    <section class="section">
        <div class="sec-head left reveal">
            <div class="eyebrow">%s</div>
            <h2 class="sec-title">%s <span class="grad">%s</span></h2>
            %s
        </div>
        %s
    </section>
''' % (eyebrow, head, grad, ('<p class="sec-sub">%s</p>' % sub) if sub else '', body)


# ---------------------------------------------------------------- the content
WORLDS = [
    dict(key='leaf', name='Leaf', tag='Learn &amp; grow', accents=('#15803d', '#22C55E', '#86efac'),
         head='Money education', grad='that does not bore you',
         lede='Bite-size lessons, a daily word, flashcards that stick and a knowledge hub that goes as deep as you want. No lectures, no assumed head start.',
         tools=[('Lessons', 'Two-minute lessons that explain one idea properly and then get out of the way.'),
                ('Money Quiz', 'Spaced-repetition flashcards, so what you learn on Monday is still there in March.'),
                ('Challenges', 'Short streak-based challenges that turn a habit into a month of evidence.'),
                ('Knowledge Hub', 'A curated shelf of the best places to learn, sorted by what you actually need.')],
         inside=['Two-minute lessons', 'Word of the day', 'Money quiz and flashcards', 'Weekly challenges',
                 'Knowledge hub', 'Badges and streaks']),
    dict(key='atlas', name='Atlas', tag='Markets &amp; investing', accents=('#1d4ed8', '#3B82F6', '#93c5fd'),
         head='Markets,', grad='decoded',
         lede='Every index, sector and stock with a plain-English read on why it moved. Spin the globe, watch the exchanges wake, and learn the language of money while you watch it.',
         tools=[('Investing', 'Educational pathways from emergency fund to a diversified portfolio.'),
                ('Stock Market', 'Indices, sectors and stocks, each with a why-it-matters in human words.'),
                ('Global Markets', 'A globe of exchanges you can spin, with regional news as they open.'),
                ('World Monitor', 'The events moving markets, linked to the sources they came from.')],
         inside=['Investment pathways', 'Indices and sectors', 'Stock insights', 'How markets work',
                 'Globe of exchanges', 'Plain-English news']),
    dict(key='shield', name='Shield', tag='Protect &amp; plan', accents=('#475569', '#94A3B8', '#cbd5e1'),
         head='Nothing', grad='catches you',
         lede='Credit building, debt payoff, insurance and the long horizon. The grown-up decisions, explained on your terms and sized to the life you actually have.',
         tools=[('Credit', 'What actually moves a score, and the order to do things in.'),
                ('Debt', 'Avalanche and snowball side by side on your real numbers.'),
                ('Insurance', 'A risk score, then only the cover that matches it.'),
                ('Retirement', 'Projections that survive inflation, not just a compound-interest toy.')],
         inside=['Credit building', 'Debt payoff planner', 'Insurance risk score', 'Retirement projections',
                 'Emergency fund', 'Safety benchmarks']),
    dict(key='forge', name='Forge', tag='Career &amp; income', accents=('#b45309', '#E0A94E', '#fcd34d'),
         head='Earn more,', grad='not just spend less',
         lede='Careers, firms, universities, admissions tests and what roles really pay. The fastest way to change your finances at nineteen is not a budget, it is a decision about what you do next.',
         tools=[('Finance Careers', 'What each path actually involves, and how people get in.'),
                ('Universities', 'Shortlists with the admissions data behind them, not just rankings.'),
                ('Test Centre', 'SAT, TMUA and the rest: tips, a score calculator, and what your score reaches.'),
                ('Salary Check', 'Benchmarks by role and level, per year or per month.')],
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


# ---------------------------------------------------------------- the pages
WORLD_CARD = ('<a class="panel liquid-glass world-card reveal" href="{key}.html" style="text-decoration:none;color:inherit">'
              '<span class="wash" style="background:{c}"></span>'
              '<span class="badge" style="background:{c}22;color:{c}">{initial}</span>'
              '<span class="tag" style="color:{c}">{tag}</span>'
              '<h3>{name}</h3><p>{blurb}</p>'
              '<span class="link" style="color:{c}">Explore {name} &rarr;</span></a>')

MINI_CARD = ('<a class="panel liquid-glass reveal" href="{key}.html" style="text-decoration:none;color:inherit">'
             '<span class="badge" style="background:{c}22;color:{c}">{initial}</span>'
             '<h3>{name}</h3><p>{tag}</p></a>')


def world_cards(worlds, tpl=WORLD_CARD):
    return ''.join(tpl.format(key=w['key'], c=w['accents'][1], initial=w['name'][0], tag=w['tag'],
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
        ('#6366f1', '#a855f7', '#fcd34d'),
        'Four worlds,', 'one financial life',
        'Lumera is the hub. Each world below is its own space, with its own tools, colour and guide, and you only ever see the ones you switch on.',
        '    <section class="section tight"><div class="grid-4">' + world_cards(WORLDS) + '</div></section>\n'
        + sec('Everything in one place', 'One account,', 'every world',
              'Sign up once. Your figures, streak and progress follow you across all four.',
              actions_row([('Start your 30-day review', 'app.html#/signup', True),
                           ('Open the family hub', 'app.html#/hub', False)])),
        actions=[('Start free', 'app.html#/signup', True), ('Open the app', 'app.html#/login', False)]))

    for w in WORLDS:
        others = [o for o in WORLDS if o['key'] != w['key']]
        inside = '<ul class="tool-list">' + ''.join('<li>%s</li>' % i for i in w['inside']) + '</ul>'
        body = ('    <section class="section tight">' + panels(w['tools'], 2) + '</section>\n'
                + sec('What is inside', 'The tools', 'you get',
                      'Every one of these lives inside %s, and opens the moment you sign up.' % w['name'], inside)
                + sec('The rest of the family', 'It does not', 'stop here',
                      'Lumera is the hub, and the other three worlds are one click away.',
                      '<div class="grid-3">' + world_cards(others, MINI_CARD) + '</div>'))
        made.append(page('%s.html' % w['key'],
            '%s by Lumera | %s' % (w['name'], w['tag'].replace('&amp;', '&')),
            w['lede'][:150], w['accents'], w['head'], w['grad'], w['lede'], body,
            actions=[('Open %s' % w['name'], 'app.html#/%s' % w['key'], True),
                     ('See all four worlds', 'worlds.html', False)]))

    made.append(page('features.html', 'Features | Lumera',
        'Everything your money needs, in one calm place.',
        ('#4f46e5', '#8b5cf6', '#c4b5fd'),
        'Everything your money needs,', 'in one calm place',
        'Not another budgeting tab. A financial operating system that understands the invisible patterns behind your spending.',
        '    <section class="section tight">' + panels(FEATURES, 3) + '</section>\n'
        + sec('Where they live', 'Split across', 'four worlds',
              'Every feature belongs to a world, so the app stays calm instead of showing you all of it at once.',
              '<div class="grid-4">' + world_cards(WORLDS, MINI_CARD) + '</div>'),
        actions=[('Start free', 'app.html#/signup', True), ('How it works', 'how-it-works.html', False)]))

    steps_html = '<div class="grid-3">' + ''.join(
        '<div class="panel liquid-glass reveal"><span class="step-n">%02d</span><h3>%s</h3><p>%s</p></div>'
        % (i + 1, t, d) for i, (t, d) in enumerate(STEPS)) + '</div>'
    made.append(page('how-it-works.html', 'How it works | Lumera',
        'Three steps, thirty days: track, compare, and get your plan.',
        ('#0f766e', '#14b8a6', '#5eead4'),
        'Three steps,', 'thirty days',
        'One month of ordinary behaviour is enough to tell you what is actually going on with your money. Here is the whole process.',
        '    <section class="section tight">' + steps_html + '</section>\n'
        + sec('What you get at the end', 'A plan,', 'not a chart',
              'A score you can move, the leaks worth closing first, and the order to do them in.',
              panels([('A health score', 'One number from seven benchmarked pillars, so progress is visible month to month.'),
                      ('Your biggest leak', 'The single category costing you most against people like you.'),
                      ('A 30-day plan', 'Three or four moves, sized to your actual income, not generic advice.')], 3))
        + sec('What it never does', 'No bank login.', 'No advice.',
              'Lumera is educational. It explains and benchmarks; it never recommends a product or asks for banking credentials.',
              actions_row([('Start your 30-day review', 'app.html#/signup', True),
                           ('Read the privacy page', 'privacy.html', False)])),
        actions=[('Start free', 'app.html#/signup', True), ('See the features', 'features.html', False)]))

    team_cards = ''.join(
        '<div class="panel liquid-glass reveal"><div class="person"><span class="avatar">%s</span>'
        '<div><h3 style="margin:0">%s</h3><div class="role">%s</div></div></div></div>' % (c, n, r)
        for n, r, c in [('Founding team', 'Add names in Admin', 'L'), ('Product', 'Add names in Admin', 'P'),
                        ('Engineering', 'Add names in Admin', 'E'), ('Design', 'Add names in Admin', 'D'),
                        ('Research', 'Add names in Admin', 'R'), ('Operations', 'Add names in Admin', 'O')])
    made.append(page('team.html', 'The team | Lumera', 'The people building Lumera.',
        ('#7c3aed', '#a855f7', '#f0abfc'),
        'The people', 'building it',
        'Roles, bios and photos are managed in the admin portal, so this page stays current without a deploy.',
        '    <section class="section tight"><div class="grid-3">' + team_cards + '</div></section>\n'
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
        '    <section class="section tight"><div class="grid-2">'
        '<div class="panel liquid-glass reveal"><div class="eyebrow">Our mission</div><div class="prose">'
        '<p>Lumera exists to give students and early-career professionals the financial intelligence that used to be '
        'reserved for the wealthy. No jargon, no complexity, just clarity.</p></div></div>'
        '<div class="panel liquid-glass reveal"><div class="eyebrow">The problem we solve</div><div class="prose">'
        '<p>Most people do not understand their money, not because they are bad with it, but because no one ever taught '
        'them. Lumera closes that gap with tools that explain themselves.</p></div></div>'
        '</div></section>\n'
        + sec('What Lumera gives you', 'Six things it does', 'from day one', '',
              panels([('Benchmark clarity', 'See every spending category against realistic ranges for your income and region.'),
                      ('A learning engine', 'Two-minute lessons, quizzes and a glossary that turn jargon into confidence.'),
                      ('Real tools', 'Budget, goals, net worth, debt payoff, credit, investing and a wealth simulator.'),
                      ('Markets, decoded', 'Live-style markets, a world monitor and plain-English news with the why.'),
                      ('A career head-start', 'Finance careers, universities, CV lab and interview prep.'),
                      ('A community', 'Connect with others on the same path and share opportunities.')], 3))
        + sec('Who it is for', 'Built for people', 'starting out', '',
              panels([('Students', 'Build money habits early, while the stakes are low and the upside is decades long.'),
                      ('Young professionals', 'Turn your first real income into a foundation for lasting wealth.'),
                      ('Anyone starting out', 'It is never too late to start your financial journey.')], 3))
        + sec('The team', 'The people', 'building it',
              'Roles, bios and photos are managed in the admin portal.',
              actions_row([('Meet the team', 'team.html', True)])),
        actions=[('Start free', 'app.html#/signup', True), ('See the features', 'features.html', False)]))

    PLANS = [('Free', 'Available now', True,
              ['Monthly expense review', 'Financial health score', 'Budget &amp; savings tools', 'Market news', 'Limited AI assistant']),
             ('Pro', 'Coming soon', False,
              ['Advanced AI coach', 'Unlimited simulations', 'Full benchmark analytics', 'Monthly reports', 'Subscription &amp; debt tools']),
             ('Premium', 'Coming soon', False,
              ['Portfolio analytics', 'Family budgeting', 'Tax optimisation', 'Priority AI', 'Advisor-ready summaries'])]
    plans_html = '<div class="grid-3">' + ''.join(
        '<div class="panel liquid-glass reveal"><div class="plan-head"><h3 style="margin:0">%s</h3>'
        '<span class="pill%s">%s</span></div><p>%s</p><ul class="plan-list">%s</ul></div>'
        % (n, ' now' if now else '', 'Current' if now else 'Future', b, ''.join('<li>%s</li>' % f for f in feats))
        for n, b, now, feats in PLANS) + '</div>'
    made.append(page('pricing.html', 'Pricing | Lumera', 'Free today. Built for what is next.',
        ('#b45309', '#f59e0b', '#fcd34d'),
        'Free today.', 'Built for what is next.',
        'Everything you need for your first 30-day review costs nothing. Paid tiers arrive when the tools behind them do.',
        '    <section class="section tight">' + plans_html + '</section>\n'
        + sec('Questions', 'The things people', 'ask first', '',
              panels([('Is the free plan really free?', 'Yes. Every tool listed under Free is available now, with no card and no trial clock.'),
                      ('Do I need to connect my bank?', 'No. Lumera never asks for banking credentials. You enter what you want it to see.'),
                      ('Is this financial advice?', 'No. Lumera is educational: it explains, benchmarks and projects, but never recommends a product.'),
                      ('What happens to my data?', 'It lives in your browser. You can export or delete everything at any time.')], 2)),
        actions=[('Start free', 'app.html#/signup', True), ('Open the app', 'app.html#/login', False)]))

    made.append(page('privacy.html', 'Privacy &amp; trust | Lumera',
        'How Lumera treats your data and your decisions.',
        ('#1d4ed8', '#3b82f6', '#67e8f9'),
        'Built private.', 'Built to be trusted.',
        'Trust is not a banner, it is an architecture. Here is exactly how Lumera treats your data and your decisions.',
        '    <section class="section tight">' + panels([
            ('Your data is never sold', 'We do not sell, rent, or share your financial data for advertising, ever. Our business model will be subscriptions, not surveillance.'),
            ('You own and control it', 'Export everything or permanently delete your account and all associated data at any time, with no friction and no retention games.'),
            ('Bank connections are consent-based', 'Future Open-Banking links will use secure, revocable consent through regulated providers. We never see or store your banking credentials.'),
            ('Private by architecture', 'Data is minimised and encrypted. We only ask for what makes your insights better, and you can skip anything.'),
            ('Educational, not advisory', 'Lumera provides educational guidance only. It is not licensed financial, investment, tax or legal advice.'),
            ('Honest about the prototype', 'Market data shown here is illustrative. Projections are illustrations, not promises. Always do your own research.')], 3) + '</section>\n'
        + sec('Your controls', 'Everything is', 'yours to take back',
              'Export, reset and delete all live inside the app, under Settings.',
              actions_row([('Open your data controls', 'app.html#/settings', True),
                           ('Read the full disclaimer', 'app.html#/privacy', False)])
              + '<div class="disclaimer liquid-glass" style="margin-left:0">Lumera is an educational tool, not a '
                'financial adviser. Figures are estimates based on what you enter, and nothing here is a recommendation '
                'to buy, sell or hold any product.</div>'),
        actions=[('Open the app', 'app.html#/login', False)]))

    return made


if __name__ == '__main__':
    for f in build():
        print('built', f)
