#!/usr/bin/env python3
"""
The legal pages, written against what the site and app actually do.

Every factual statement here was checked against the code:
  - the marketing pages set no cookies at all
  - the app stores everything in localStorage under lumera_* keys, in the
    visitor's own browser, and sends none of it to a server
  - the only third-party requests are web fonts, and, in the app, an
    exchange-rate API and a translation API
  - there is no analytics, no tag manager, no advertising pixel

Anything the operator must supply before launch is wrapped in FILL(), which
renders as a highlighted placeholder rather than a plausible-looking invention.
"""

UPDATED = '9 September 2026'

# Details only the business can supply. Deliberately not guessed.
FILL = lambda t: '<span class="fill">[%s]</span>' % t

ENTITY = FILL('LEGAL ENTITY NAME')
ADDRESS = FILL('REGISTERED ADDRESS')
COMPANY_NO = FILL('COMPANY NUMBER')
JURISDICTION = FILL('COUNTRY / JURISDICTION')
CONTACT = FILL('CONTACT EMAIL')
DPO = FILL('DATA PROTECTION CONTACT')

NOT_ADVICE = (
    'Lumera is an educational tool. It is not a financial adviser, broker, bank or '
    'payment service, and nothing it shows you is a personal recommendation to buy, '
    'sell or hold any financial product. Figures it produces are estimates based on '
    'what you type in.'
)

BANNER = (
    '<div class="callout"><p><strong>Before you publish:</strong> every highlighted '
    'placeholder below needs your real details, and a qualified lawyer in your '
    'jurisdiction should review these pages. They were drafted to match what this '
    'site actually does, but they are not legal advice.</p></div>'
)


def toc(items):
    return '<ul class="toc">%s</ul>' % ''.join(
        '<li><a href="#%s">%s</a></li>' % (i, t) for i, t in items)


# ---------------------------------------------------------------- privacy
PRIVACY_TOC = [('what', 'What we collect'), ('where', 'Where it lives'), ('why', 'Why'),
               ('third', 'Third parties'), ('rights', 'Your rights'), ('children', 'Age'),
               ('retention', 'Retention'), ('contact', 'Contact')]

PRIVACY = '''
<div class="legal">
<p class="updated">Last updated %(updated)s</p>
%(banner)s
%(toc)s

<h2 id="who">Who this is about</h2>
<p>This policy explains what Lumera does with information about you. The controller is
%(entity)s, %(address)s, company number %(company_no)s, registered in %(jurisdiction)s.
Questions go to %(contact)s.</p>

<h2 id="what">What we collect</h2>
<p>Lumera is unusual: <strong>it has no server that stores your data.</strong> Everything you
enter stays in your own browser. We do not receive it, cannot read it, and could not hand
it over if asked.</p>
<table>
<tr><th>What</th><th>Where it goes</th><th>Why</th></tr>
<tr><td>The name and email you type when creating a profile</td><td>Your browser only</td><td>To label your profile and let you return to it on this device</td></tr>
<tr><td>Income, spending, balances, goals, debts and other figures you enter</td><td>Your browser only</td><td>To produce your benchmarks, score and plan</td></tr>
<tr><td>Settings: theme, language, currency, which sections you use</td><td>Your browser only</td><td>To keep the app the way you left it</td></tr>
<tr><td>Streaks, XP and badges</td><td>Your browser only</td><td>To track your progress</td></tr>
<tr><td>Your IP address and browser details</td><td>Seen by our hosting provider and by the font provider, as with any website request</td><td>Unavoidable part of delivering the page</td></tr>
</table>
<p>We do not ask for, and Lumera has no field for, your bank login, card number, national
insurance or social security number, date of birth, or address. We do not use analytics
software, advertising pixels, tag managers, or session recording. There is no
newsletter list, and no profile is built about you anywhere but on your own device.</p>

<h3>The password field</h3>
<p>When you create a profile the app asks for a password so the flow feels familiar. It is
checked for length and then <strong>discarded</strong> — never stored, never transmitted, never
used to protect anything. Because of that, anyone with access to your device or browser
profile can open your Lumera data. Do not reuse an important password here, and do not
put anything in Lumera you would not want a person holding your unlocked laptop to see.</p>

<h2 id="where">Where it lives</h2>
<p>In your browser's local storage, under keys beginning <code>lumera_</code>. Local storage is
not a cookie: it is not sent with requests and no server can read it. It stays until you
clear it, either from Settings inside the app or by clearing site data in your browser.</p>
<p>Because it lives on the device, your data does not follow you to another computer or
another browser, and clearing your browser data deletes it permanently. There is no backup.</p>

<h2 id="why">Why we are allowed to do this</h2>
<p>Where data protection law applies, our lawful basis for the small amount of processing
that does happen — serving the page, and storing your entries on your device so the
service works at all — is <strong>legitimate interests</strong> in delivering the service you asked
for, and, for the on-device storage, the fact that it is strictly necessary to provide a
service you actively requested.</p>

<h2 id="third">Third parties</h2>
<p>These are every outside service the site contacts. There are no others.</p>
<table>
<tr><th>Service</th><th>What it receives</th><th>When</th></tr>
<tr><td>Our hosting provider</td><td>Your IP address and request details, in ordinary server logs</td><td>Every page load</td></tr>
<tr><td>Web font providers (Fontshare, jsDelivr, Google Fonts)</td><td>Your IP address and browser details</td><td>Only after you accept non-essential content; declined by default</td></tr>
<tr><td>Exchange-rate API (open.er-api.com)</td><td>A request for currency rates. No personal data, no figures of yours</td><td>Only inside the app, when you switch currency</td></tr>
<tr><td>Translation API (Google Translate, MyMemory)</td><td>The interface text being translated. Do not use the translation feature on text containing anything private</td><td>Only inside the app, when you switch language</td></tr>
</table>
<p>We do not sell, rent, share or broker your data, and we do not run advertising.</p>

<h2 id="rights">Your rights</h2>
<p>Depending on where you live you may have rights to access, correct, delete, export,
restrict or object to the processing of your personal data, and to complain to a regulator.</p>
<p>For Lumera these are unusually direct: because your data sits in your browser, you can
exercise most of them yourself, immediately, from Settings inside the app — export it,
reset it, or delete it outright. For anything held by our hosting provider in server logs,
write to %(contact)s. In the UK you can complain to the Information Commissioner's Office;
in the EU, to your national supervisory authority; %(dpo)s is our contact point.</p>

<h2 id="children">Age</h2>
<p>Lumera is aimed at students and people early in their careers, so we take this seriously.
You must be at least %(age)s to create a profile. We do not knowingly collect data from
children below the age of digital consent in their country, and because everything stays on
the device we hold nothing to delete if a younger person uses it. If you are a parent or
guardian with a concern, contact %(contact)s.</p>

<h2 id="retention">Retention</h2>
<p>We retain nothing, because we receive nothing. Your entries stay on your device until you
delete them. Hosting logs are kept for the period our provider sets, typically a few weeks.</p>

<h2 id="changes">Changes</h2>
<p>If this policy changes materially we will update the date at the top and, for anything
significant, say so in the app.</p>

<h2 id="contact">Contact</h2>
<p>%(entity)s, %(address)s. Email %(contact)s.</p>
</div>
''' % dict(updated=UPDATED, banner=BANNER, toc=toc(PRIVACY_TOC), entity=ENTITY, address=ADDRESS,
           company_no=COMPANY_NO, jurisdiction=JURISDICTION, contact=CONTACT, dpo=DPO,
           age=FILL('MINIMUM AGE, e.g. 16'))


# ---------------------------------------------------------------- terms
TERMS_TOC = [('agreement', 'The agreement'), ('what', 'What Lumera is'), ('not', 'What it is not'),
             ('account', 'Your profile'), ('acceptable', 'Acceptable use'), ('ip', 'Ownership'),
             ('liability', 'Liability'), ('law', 'Governing law')]

TERMS = '''
<div class="legal">
<p class="updated">Last updated %(updated)s</p>
%(banner)s
%(toc)s

<h2 id="agreement">The agreement</h2>
<p>These terms are between you and %(entity)s (&ldquo;we&rdquo;, &ldquo;us&rdquo;), %(address)s, company number
%(company_no)s. By using Lumera you accept them. If you do not accept them, do not use it.</p>

<h2 id="what">What Lumera is</h2>
<p>Lumera is an educational tool that helps you understand your own money. You type in figures,
and it compares them against general ranges, scores them, explains them and suggests things
you might do. It runs in your browser.</p>

<h2 id="not">What Lumera is not</h2>
<p><strong>%(not_advice)s</strong></p>
<ul>
<li>We are not authorised or regulated as a financial adviser, and we do not hold ourselves out as one.</li>
<li>Benchmarks, projections and scores are illustrative. They are not predictions, promises or guarantees of any outcome.</li>
<li>Market data, company information and news shown in the app are illustrative sample data unless explicitly labelled otherwise. Do not trade on them.</li>
<li>Career, university, admissions and salary information is general guidance that changes over time. Check the source before you rely on it.</li>
<li>Decisions about your money are yours. For advice about your circumstances, speak to a qualified, regulated professional.</li>
</ul>

<h2 id="account">Your profile</h2>
<p>A Lumera profile is stored in your browser, not on our servers. You are responsible for the
device it sits on. Because the password field is not used to protect anything (see the
<a href="privacy.html">Privacy Policy</a>), anyone who can use your device can open your profile.
Clearing your browser data deletes the profile permanently and we cannot restore it.</p>

<h2 id="acceptable">Acceptable use</h2>
<p>Do not: break the law with it; try to break, overload or reverse-engineer the service; scrape
it at scale; use it to give regulated financial advice to other people; upload anything unlawful
where the app lets you write text; or impersonate anyone. We may withdraw access if you do.</p>

<h2 id="ip">Ownership</h2>
<p>The site, the app, their design, text and code belong to us or our licensors. You may use
them for their intended purpose. You keep everything you type in — it never leaves your device,
so we acquire no rights in it whatsoever.</p>

<h2 id="availability">Availability</h2>
<p>Lumera is provided as it is and as it is available. We may change, suspend or discontinue any
part of it, and we do not promise it will be uninterrupted or error-free. It is a young product
and it may contain mistakes.</p>

<h2 id="liability">Liability</h2>
<p>Nothing here limits liability that cannot be limited by law, including for death or personal
injury caused by negligence, or for fraud.</p>
<p>Subject to that: we are not liable for financial loss, lost profits, lost savings, lost
opportunity, or any indirect or consequential loss arising from your use of Lumera or from any
decision you take after using it. Where liability cannot be excluded, it is limited to
%(cap)s.</p>
<p>If you are a consumer, you keep all your statutory rights, and nothing in these terms takes
them away.</p>

<h2 id="third">Third-party links</h2>
<p>Lumera links to outside sites for learning material, news and sources. We do not control them
and are not responsible for their content, their accuracy, or what they do with your data.</p>

<h2 id="law">Governing law</h2>
<p>These terms are governed by the laws of %(jurisdiction)s, and the courts of %(jurisdiction)s
have exclusive jurisdiction, except that if you are a consumer you may also bring proceedings in
the country where you live.</p>

<h2 id="contact">Contact</h2>
<p>%(entity)s, %(address)s. Email %(contact)s.</p>
</div>
''' % dict(updated=UPDATED, banner=BANNER, toc=toc(TERMS_TOC), entity=ENTITY, address=ADDRESS,
           company_no=COMPANY_NO, jurisdiction=JURISDICTION, contact=CONTACT,
           not_advice=NOT_ADVICE, cap=FILL('LIABILITY CAP, e.g. the amount you paid us in the last 12 months'))


# ---------------------------------------------------------------- cookies
COOKIES = '''
<div class="legal">
<p class="updated">Last updated %(updated)s</p>
%(banner)s

<h2 id="short">The short version</h2>
<p><strong>Lumera sets no cookies.</strong> Not one, on any page. It does store things on your device,
and it can load fonts and media from other companies, so this page explains both and lets you
decide about the second.</p>

<h2 id="storage">What is stored on your device</h2>
<table>
<tr><th>Kind</th><th>Examples</th><th>Purpose</th><th>Consent</th></tr>
<tr><td>Local storage, strictly necessary</td><td><code>lumera_v2</code>, <code>lumera_accounts</code>,
<code>lumera_theme</code>, <code>lumera_mode</code>, <code>lumera_skin</code></td>
<td>Holds your profile, figures and settings so the app works at all. Never sent anywhere.</td>
<td>Not required: without it the service you asked for cannot function</td></tr>
<tr><td>Local storage, preferences</td><td><code>lumera_lang</code>, <code>lumera_fx</code>,
<code>lumera_streak_snooze</code></td><td>Remembers language, currency and dismissed prompts</td>
<td>Not required, but you can clear it any time</td></tr>
<tr><td>Cookies</td><td>None</td><td>&mdash;</td><td>&mdash;</td></tr>
<tr><td>Analytics or advertising storage</td><td>None</td><td>&mdash;</td><td>&mdash;</td></tr>
</table>
<p>You can inspect all of it in your browser's developer tools, and delete all of it from
Settings inside the app or by clearing site data.</p>

<h2 id="third">Content loaded from other companies</h2>
<p>Two things on this site come from elsewhere, and loading them reveals your IP address to
those companies:</p>
<ul>
<li><strong>Web fonts</strong> from Fontshare, jsDelivr and Google Fonts.</li>
<li><strong>Background video</strong> on the home page, if enabled.</li>
</ul>
<p>Because that is not strictly necessary to deliver the site, we ask first. Until you accept,
the site uses fonts already on your computer and does not load the video. Nothing breaks; it
simply looks plainer. You can change your mind at any time:</p>
<p><button type="button" class="btn-solid" data-consent-reopen>Change my choice</button></p>

<h2 id="do-i-need">Do you need a banner at all?</h2>
<p>Our reading, which is not legal advice: storage that is strictly necessary to provide a service
the user has actively requested is exempt from consent under the UK and EU ePrivacy rules, and
that covers everything Lumera keeps on your device. The third-party fonts and video are not
exempt, which is why they are the only thing the banner asks about. If you later add analytics,
advertising, or any tracking, that will need consent before it loads, and this page will need
rewriting.</p>

<h2 id="contact">Contact</h2>
<p>%(entity)s, %(address)s. Email %(contact)s.</p>
</div>
''' % dict(updated=UPDATED, banner=BANNER, entity=ENTITY, address=ADDRESS, contact=CONTACT)


# ---------------------------------------------------------------- refunds
REFUNDS = '''
<div class="legal">
<p class="updated">Last updated %(updated)s</p>
%(banner)s

<h2 id="today">Today: nothing to refund</h2>
<p>Lumera is free. We take no payments, hold no card details, and operate no billing system, so
there is currently nothing to refund and nothing to cancel. If you want to stop using Lumera,
delete your data from Settings and close the tab.</p>

<h2 id="future">If and when paid plans launch</h2>
<p>The Pro and Premium plans described on the <a href="pricing.html">pricing page</a> are not
available and cannot be bought. When they launch, these terms will apply, and this page will be
updated before any payment is taken.</p>

<h3>Right to cancel</h3>
<p>If you are a consumer in the UK or EU, you have a statutory right to cancel a purchase of
digital services within <strong>14 days</strong> of buying it. If you ask us to start the service
immediately within that period, you acknowledge you lose the right to cancel once it is fully
performed, and if you cancel part-way you may be charged for what you used.</p>

<h3>Our own policy, on top of the law</h3>
<ul>
<li>Cancel a subscription at any time. It stops at the end of the period you have paid for; we do
not charge again after that.</li>
<li>Refunds requested within 14 days of a charge: full refund, no questions.</li>
<li>After 14 days: no refund for time already elapsed, but you keep access until the period ends.</li>
<li>If we take a payment in error, or the service is materially broken for a sustained period,
you get your money back regardless of timing.</li>
</ul>

<h3>How to ask</h3>
<p>Email %(contact)s from the address on the account, saying what you want refunded and why.
We aim to reply within %(sla)s and to return approved refunds to the original payment method
within 14 days.</p>

<div class="callout"><p><strong>Note for the operator:</strong> before charging anyone, you will
also need a payment provider, correct tax handling for the countries you sell into, and
pre-contract information shown at checkout. Delete this note once that is in place.</p></div>

<h2 id="contact">Contact</h2>
<p>%(entity)s, %(address)s. Email %(contact)s.</p>
</div>
''' % dict(updated=UPDATED, banner=BANNER, entity=ENTITY, address=ADDRESS, contact=CONTACT,
           sla=FILL('RESPONSE TIME, e.g. 5 working days'))
