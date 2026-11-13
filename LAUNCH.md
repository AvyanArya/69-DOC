# Lumera — launch checklist

Status on 12 November 2026. Severity says what blocks what:

- **Critical**: blocks the public launch.
- **High**: fix before, or immediately after, the public launch.
- **Medium**: plan it in the first weeks.
- **Low**: nice to have.

Nothing here blocks the **private team preview**, apart from deploying it
(item 1). How to deploy is in [DEPLOY.md](DEPLOY.md); configuration and
security details are in [BACKEND.md](BACKEND.md).

## Needs your input, credentials or approval

| # | Severity | What | Why it is open | What to do |
| --- | --- | --- | --- | --- |
| 1 | Critical | **Hosting** for staging and production | Needs your hosting account and payment method. Nothing is deployed yet. | DEPLOY.md §1 (staging, ~15 min) and §2 (production). |
| 2 | Critical | **Encryption keys** (`DATA_ENCRYPTION_KEY`), one per environment | Only you should hold them. | `openssl rand -hex 32` for each environment; store both in your password manager before first use. |
| 3 | Critical | **Legal details** in the legal pages: entity name, registered address, company number, jurisdiction, contact and data-protection emails, hosting provider and region, liability cap | They are yellow `[PLACEHOLDERS]` in `legal-content.py` (and the footer). They are company facts only you can supply. | Fill them in, run `npm run build`, and have Privacy, Terms, Cookies and Refunds reviewed by a lawyer. |
| 4 | Critical | **Age and consent rules** for teenagers | The app asks people to confirm they are 16+ (`MIN_AGE` in `Lumera.html`), but it cannot verify age. Rules differ by country (UK Children's Code, GDPR-K, COPPA). | Decide the minimum age per market with your lawyer; adjust `MIN_AGE` and the Terms. |
| 5 | High | **Email** for password resets (Resend API key, verified sending domain, `MAIL_FROM`) | Needs your account and DNS access. Until then, locked-out members must contact support and an admin sends a link. | DEPLOY.md §4. |
| 6 | High | **Hero video and artwork licences** | The landing video is streamed from a CloudFront address that is not yours. The character artwork and logo origin should be confirmed too. | Confirm the licence. Ideally self-host the video (put it in `assets/` and update `landing.html`), which also removes the only third party on the home page. |
| 7 | High | **"AI" wording** | The assistant, recommendations and Financial Twin are rule-based (they work from the member's figures; no AI model). The assistant page now says so, but the home page promises "AI insights" and the features list an "AI Financial Twin". | Either connect a language model through the server (needs an API key, a budget and a safeguarding review for teen users), or change "AI" in the marketing copy. Your call. |
| 8 | High | **Community moderation** owner | Members can be 16 or 17. Reports arrive in the admin portal; someone must act on them. | Name a moderator, check Reports daily, and publish community guidelines. |
| 9 | High | **Backups** off the host, and a tested restore | Render keeps 7 days of disk snapshots; your own copies need your storage. | DEPLOY.md §6. Test a restore on staging. |

## Engineering follow-ups (no input needed from you)

| # | Severity | What | Notes |
| --- | --- | --- | --- |
| 10 | Medium | **Email verification at sign-up** | Today anyone can sign up with an address they do not own. Add once email (5) is on. |
| 11 | Medium | **Machine translation** uses Google's unofficial `translate_a` endpoint (and MyMemory) | It works, but it is not a supported API and can stop or be rate limited. Figures, names and posts are already excluded. Replace with a paid API through the server (DeepL or Google Cloud Translation, needs a key), or rely on the built-in translations. |
| 12 | Medium | **Error tracking** | Server logs carry request ids and the portal shows browser crashes. Sentry (or similar) would add alerting; it needs an account. |
| 13 | Medium | **Single instance** | SQLite and the in-memory rate limits mean one server process per environment. Fine for thousands of members; moving to Postgres and Redis is the next step if traffic needs it. |
| 14 | Medium | **Exchange-rate feed terms** | `open.er-api.com` is free; check whether its terms need an attribution link on the site. |
| 15 | Low | **Team page** | Three UI & UX members have no photo or bio yet (`team.json`). |
| 16 | Low | **Inline scripts in the CSP** | The policy allows inline scripts because the pages carry them inline. Moving them into files would allow a stricter policy. |
| 17 | Low | **Paid plans** | Pro and Premium show "Coming soon" with a working waitlist. Payments (Stripe) are not built. |
| 18 | Low | **The four worlds** | Leaf, Atlas, Shield and Forge show "Coming soon", even by URL. Before launching one, replace its example data (markets, news, IPOs) with real sources, then switch it on in Sections & layout. |
| 19 | Low | **Offline team keys** | The offline single-file build's admin key hashes are unsalted SHA-256. They only unlock that file's local storage, never server data. |

## Already done and verified

- Server hardened and tested: access control between members and for every
  admin route, CSRF, rate limits (including forged `X-Forwarded-For`), SQL
  injection, stored script, cookies, security headers, password policy,
  password reset, error hygiene, static-file rules.
  30 API tests (`npm test`).
- 47 browser checks against a real server (`npm run e2e`): every site page
  at 1440 and 390 px, links, sign-up to dashboard, saving and reloading,
  community, feedback, log out and in, admin, outage handling, the demo, and
  accessibility (axe-core, WCAG 2 A/AA: no serious or critical issues).
- No CDN at runtime: CSS and JS are compiled at build time; responses are
  compressed. `npm audit`: 0 vulnerabilities.
- Production refuses to start without an encryption key, hides previews,
  and is indexable; staging is password-protected and `noindex`.

## Launch day

1. `npm run check` and `npm run e2e` pass on the commit you will launch.
2. Items 1 to 9 are done.
3. Production: push the `production` branch, deploy, add the domain,
   confirm `https://<domain>/api/health` says `"env":"production"`.
4. Sign up as the first admin (`ADMIN_EMAILS`), check the admin overview
   shows *Email on*, and publish at least one product update.
5. From a phone and a laptop (Chrome, Safari, Firefox): sign up, complete
   the questionnaire, reload, log out, use *Forgot password*, log back in.
6. Take a first backup (`node scripts/backup.js`) and download it.
7. Set up the uptime check on `/api/health`.
