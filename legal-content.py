#!/usr/bin/env python3
"""
The legal pages, written against what the site and app actually do.

Every factual statement here was checked against the code:
  - accounts live on the Lumera server (server/): name, email and a scrypt
    password hash; financial figures and questionnaire answers are stored
    encrypted with AES-256-GCM (server/security.js)
  - the only cookie is lm_sid, an httpOnly session cookie (server/routes/auth.js)
  - community content is visible to other members by design
  - fonts are self-hosted; the third-party requests are the hero video,
    the exchange-rate and translation APIs, and server-side logo lookups
  - there is no analytics, no tag manager, no advertising pixel
  - an offline copy opened from a file keeps everything in the browser

Anything the operator must supply before launch is wrapped in FILL(), which
renders as a highlighted placeholder rather than a plausible-looking invention.
"""

UPDATED = '3 October 2026'

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
PRIVACY_TOC = [('what', 'What we collect'), ('where', 'Who can see it'), ('why', 'Why'),
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
<p>We collect what you give us to run your account, and nothing else.</p>
<table>
<tr><th>What</th><th>Where it is kept</th><th>Why</th></tr>
<tr><td>Your name and email address</td><td>Our servers</td><td>To create and secure your account and let you log in</td></tr>
<tr><td>Your password</td><td>Our servers, only as a salted scrypt hash. We never store or see the password itself</td><td>To check it is you when you log in</td></tr>
<tr><td>Income, spending, balances, goals, subscriptions, questionnaire answers and settings</td><td>Our servers, <strong>encrypted</strong> (AES-256-GCM) and decrypted only to show them to you</td><td>To produce your benchmarks, score and plan, and to keep them between devices</td></tr>
<tr><td>Streaks, XP and badges</td><td>With your figures, encrypted</td><td>To track your progress</td></tr>
<tr><td>What you choose to post in the community: a display name, an optional headline and LinkedIn link, posts, replies, likes and connections</td><td>Our servers. <strong>Visible to other members</strong></td><td>To run the community you choose to join</td></tr>
<tr><td>Names of subscriptions you add</td><td>Our servers, with your figures; the company name also goes into a shared, anonymous list of company logos</td><td>To show the right logo</td></tr>
<tr><td>Paid plans you ask to hear about, if you press <em>Notify me</em> on the pricing page</td><td>Our servers, with your email address</td><td>To email you once when that plan launches. Leave the waitlist from the same button at any time</td></tr>
<tr><td>Error reports if the app crashes: the error message, the page and the browser type</td><td>Our servers</td><td>To find and fix faults. Never includes your figures</td></tr>
<tr><td>Your IP address and request details</td><td>Seen by our hosting provider, and briefly held in memory to limit repeated login attempts</td><td>Unavoidable part of delivering the service and keeping it secure</td></tr>
</table>
<p>We do not ask for your bank login, card number, national insurance or social security number,
date of birth, or address. Lumera never asks for your location and the site tells browsers not to
offer it. We do not use analytics software, advertising pixels, tag managers or session recording.</p>

<h2 id="where">Where it lives and who can see it</h2>
<p>On servers run for us by %(host)s. Your figures are encrypted where they are stored, and the
key is held separately from the database. People who administer Lumera can see your name, email,
when you joined and last logged in, and anything you posted in the community, so they can run and
moderate the service. The admin tools do not show your figures.</p>
<p>The only cookie Lumera sets is a session cookie that keeps you logged in (see the
<a href="cookies.html">cookie page</a>).</p>
<p>If you use an offline copy of Lumera opened from a file, none of this applies: everything you
enter stays in that browser and nothing reaches our servers.</p>

<h2 id="why">Why we are allowed to do this</h2>
<p>Where data protection law applies, our lawful basis is <strong>contract</strong>: we need your
details and figures to provide the service you signed up for. For security measures such as
limiting login attempts and investigating errors, it is our <strong>legitimate interest</strong> in
keeping the service safe and working. Community posts are published because you choose to post them.</p>

<h2 id="third">Third parties</h2>
<p>These are every outside service involved. There are no others.</p>
<table>
<tr><th>Service</th><th>What it receives</th><th>When</th></tr>
<tr><td>Our hosting provider (%(host)s)</td><td>Your IP address and request details, and the encrypted data we store</td><td>Whenever you use Lumera</td></tr>
<tr><td>Amazon CloudFront</td><td>Your IP address</td><td>When the background video on the home page loads, unless you switch it off</td></tr>
<tr><td>Exchange-rate API (open.er-api.com)</td><td>A request for currency rates. No personal data, no figures</td><td>Inside the app, when rates refresh</td></tr>
<tr><td>Translation API (Google Translate, MyMemory)</td><td>The interface text being translated. Do not use translation on anything private</td><td>Inside the app, when you switch language</td></tr>
<tr><td>Logo services (Logo.dev, Brandfetch, DuckDuckGo, Google)</td><td>A company name or website, sent <strong>by our server</strong>. They do not receive your IP address or anything about you</td><td>The first time anyone adds a subscription from a company we do not have a logo for</td></tr>
</table>
<p>We do not sell, rent, share or broker your data, and we do not run advertising.</p>

<h2 id="rights">Your rights</h2>
<p>Depending on where you live you may have rights to access, correct, delete, export, restrict or
object to the processing of your personal data, and to complain to a regulator.</p>
<p>You can use the main ones yourself, immediately, from <strong>Settings</strong> or the
<strong>Privacy</strong> page in the app: <strong>export</strong> downloads everything we hold about
you as a file, <strong>delete my account</strong> erases your account, figures, posts, replies and
connections straight away. For anything else write to %(contact)s. In the UK you can complain to the
Information Commissioner's Office; in the EU, to your national supervisory authority; %(dpo)s is our
contact point.</p>

<h2 id="children">Age</h2>
<p>Lumera is aimed at students and people early in their careers. You must be at least %(age)s to
create an account. We do not knowingly collect data from children below the age of digital consent
in their country; if we learn that we have, we delete the account. If you are a parent or guardian
with a concern, contact %(contact)s.</p>

<h2 id="retention">Retention</h2>
<p>We keep your account and figures until you delete your account; deletion is immediate. Community
posts you delete, or that moderators remove, are deleted. Error reports are kept for %(errors)s.
Login sessions expire after 30 days. Backups held by our hosting provider are kept for %(backups)s
and then overwritten.</p>

<h2 id="changes">Changes</h2>
<p>If this policy changes materially we will update the date at the top and, for anything
significant, say so in the app.</p>

<h2 id="contact">Contact</h2>
<p>%(entity)s, %(address)s. Email %(contact)s.</p>
</div>
''' % dict(updated=UPDATED, banner=BANNER, toc=toc(PRIVACY_TOC), entity=ENTITY, address=ADDRESS,
           company_no=COMPANY_NO, jurisdiction=JURISDICTION, contact=CONTACT, dpo=DPO,
           age=FILL('MINIMUM AGE, e.g. 16'), host=FILL('HOSTING PROVIDER AND REGION'),
           errors=FILL('ERROR REPORT RETENTION, e.g. 90 days'), backups=FILL('BACKUP RETENTION, e.g. 30 days'))


# ---------------------------------------------------------------- terms
TERMS_TOC = [('agreement', 'The agreement'), ('what', 'What Lumera is'), ('not', 'What it is not'),
             ('account', 'Your account'), ('community', 'The community'), ('acceptable', 'Acceptable use'), ('ip', 'Ownership'),
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
you might do. It also has a community where members can share updates and opportunities.</p>

<h2 id="not">What Lumera is not</h2>
<p><strong>%(not_advice)s</strong></p>
<ul>
<li>We are not authorised or regulated as a financial adviser, and we do not hold ourselves out as one.</li>
<li>Benchmarks, projections and scores are illustrative. They are not predictions, promises or guarantees of any outcome.</li>
<li>Market data, company information and news shown in the app are illustrative sample data unless explicitly labelled otherwise. Do not trade on them.</li>
<li>Career, university, admissions and salary information is general guidance that changes over time. Check the source before you rely on it.</li>
<li>Decisions about your money are yours. For advice about your circumstances, speak to a qualified, regulated professional.</li>
</ul>

<h2 id="account">Your account</h2>
<p>Give accurate details and keep your password to yourself; you are responsible for what happens
under your account. Tell us at %(contact)s if you think someone else has used it. You can export
your data or delete your account from Settings at any time. We may suspend or close an account that
breaks these terms, and will tell you why unless the law or safety prevents it.</p>

<h2 id="community">The community</h2>
<p>What you post is visible to other members. Post only what you have the right to share, and nothing
unlawful, abusive, misleading or commercial spam. Do not post personal financial advice for other
people. Members can report posts, and we may remove content or restrict accounts that break these
terms. Views in the community are members' own, not ours.</p>

<h2 id="acceptable">Acceptable use</h2>
<p>Do not: break the law with it; try to break, overload or reverse-engineer the service; scrape
it at scale; use it to give regulated financial advice to other people; upload anything unlawful
where the app lets you write text; or impersonate anyone. We may withdraw access if you do.</p>

<h2 id="ip">Ownership</h2>
<p>The site, the app, their design, text and code belong to us or our licensors. You may use
them for their intended purpose. You keep everything you type in. We use your figures only to
provide the service to you. For community posts, you give us a licence to display them to other
members for as long as they stay up; deleting a post ends it.</p>

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
<p><strong>Lumera sets one cookie</strong>: a session cookie that keeps you logged in. It is strictly
necessary, so it does not need consent. There are no analytics or advertising cookies. The only
thing loaded from another company on our pages is the background video on the home page, and you
can switch that off.</p>

<h2 id="cookies">Cookies</h2>
<table>
<tr><th>Name</th><th>Purpose</th><th>Lasts</th><th>Consent</th></tr>
<tr><td><code>lm_sid</code></td><td>Keeps you logged in. It holds a random token; it cannot be read by
scripts on the page (<code>HttpOnly</code>) and is only sent to Lumera.</td><td>30 days, or until you log out</td>
<td>Not required: strictly necessary for a service you asked for</td></tr>
</table>

<h2 id="storage">What is stored in your browser</h2>
<table>
<tr><th>Kind</th><th>Examples</th><th>Purpose</th></tr>
<tr><td>Preferences</td><td><code>lumera_theme</code>, <code>lumera_mode</code>, <code>lumera_skin</code>,
<code>lumera_v2</code> (language), <code>lumera_fx</code> (currency rates)</td><td>Remembers how you like the app</td></tr>
<tr><td>Working copies</td><td><code>lumera_subs</code>, <code>lumera_goals</code></td><td>Tools keep a copy while you
use them; it is saved to your account and cleared when you log out</td></tr>
<tr><td>Dismissed prompts</td><td><code>lumera_streak_snooze</code>, <code>lumera_seen_update</code></td><td>So a prompt you closed stays closed</td></tr>
<tr><td>Activity on this device</td><td><code>lumera_analytics</code></td><td>A count of the pages you open, kept only in
this browser for the app&rsquo;s own activity view. It is never sent to us</td></tr>
<tr><td>Your choice about the video</td><td><code>lumera_consent_thirdparty</code></td><td>Remembers whether you switched it off</td></tr>
</table>
<p>None of this is sent anywhere. If you use an offline copy of Lumera opened from a file, your
profile and figures are also kept here, under <code>lumera_v2</code> and <code>lumera_accounts</code>.</p>

<h2 id="third">Content loaded from other companies</h2>
<p>Fonts are served by Lumera itself. The one exception on our pages is the <strong>background video</strong>
on the home page, streamed from Amazon CloudFront, which sees your IP address when it loads. It is not
strictly necessary, so you can turn it off and the page works the same:</p>
<p><button type="button" class="btn-solid" data-consent-reopen>Change my choice</button></p>
<p>If analytics, advertising or any tracking is ever added, it will ask for consent <em>before</em> it
loads, and this page will be rewritten.</p>

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
delete your account from Settings.</p>

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
