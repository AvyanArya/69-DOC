# Lumera — before launch

What has to happen before real people use Lumera, in order. "Must" items block
launch; "Should" items can follow soon after.

## 1. Legal and company details (must)

The legal pages have yellow placeholders that must be replaced:

- `[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]`, `[COMPANY NUMBER]`,
  `[COUNTRY / JURISDICTION]`, `[CONTACT EMAIL]`, `[DATA PROTECTION CONTACT]`,
  `[HOSTING PROVIDER AND REGION]`, `[LIABILITY CAP …]`.
- Files: `privacy.html`, `terms.html`, `cookies.html`, `refunds.html`, and the
  footer in `landing.html` (these come from `build-site.py` / `landing.html`, so
  edit the source and run `npm run build`).
- Have a lawyer review Privacy, Terms and Refunds. The audience includes
  teenagers, so check the minimum age, parental consent and children's data
  rules (UK Age Appropriate Design Code / GDPR-K, COPPA if US users).
- Financial promotion rules: Lumera gives education, not advice. Keep the
  disclaimer and get it checked for each country you launch in.

## 2. Hosting and server (must)

- Deploy the Node server (`npm start`, Node 22+). Static-only hosting (e.g. plain
  Vercel) cannot run accounts, community or admin.
- Set these environment variables (see `BACKEND.md`):
  - `NODE_ENV=production`
  - `DATA_ENCRYPTION_KEY` — a long random secret; back it up. Losing it means
    losing every user's saved figures.
  - `ADMIN_EMAILS` — the emails that get admin access.
  - `COOKIE_SECURE=true`, and `TRUST_PROXY=true` if behind a proxy/CDN.
  - `DATA_DIR` on a persistent disk (the SQLite database lives there).
  - `SITE_PASSWORD` only while in private beta; remove it at launch.
- HTTPS with a real domain.
- Daily database backups, stored somewhere other than the server, and a test
  restore.
- Uptime monitoring and error logging (e.g. Sentry, Better Stack).

## 3. Accounts and email (must)

- There is no self-service "forgot password" yet: resets are issued by an admin
  (`/api/admin/users/:id/reset-link`). Add an email provider (Postmark, Resend,
  SES) and send reset links and sign-up confirmations by email.
- Email verification on sign-up.
- Account deletion and data export from Settings (GDPR right to erasure and
  access). Admin delete exists; a user-facing button is needed.

## 4. Things that are still example or rule-based (must decide)

- **AI Assistant and AI Recommendations** are rule-based (written logic over the
  user's figures), not a language model. Either keep calling them that honestly,
  or connect a model through the server (never put an API key in the page).
- **Market data and news** are sample data. Either connect a licensed provider
  through the server (Finnhub, Alpha Vantage, Polygon; a news API) or hide those
  pages at launch. The in-app disclaimer says "mock data" and must change if
  you connect live data.
- **Admin analytics** (`#/analytics`) shows only the viewing browser's own
  data. For real product analytics, add Plausible / PostHog / GA4 (needs a
  cookie banner if it sets cookies).
- **Demo account** ("Alex (example)") stays labelled as example data; check
  it is not reachable as a real account.
- **Pricing**: Pro and Premium say "Coming soon"; there is no payment system.
  Payments (Stripe) are only needed when paid tiers launch.

## 5. Third-party services (should)

- Company logos: optional `LOGO_DEV_SECRET_KEY` / `BRANDFETCH_CLIENT_ID` on the
  server for better logos. Without them a public icon service is used.
- The hero video streams from Amazon CloudFront, which sees visitors' IP
  addresses. The pop-up notice was removed, so mention it in the Privacy and
  Cookies pages, or self-host the video.

## 6. Community safety (must, because users are teenagers)

- Moderation: someone checks reported posts in the admin portal daily.
- Community guidelines page and a report button on every post (report exists).
- Decide whether under-16s can post or connect, and enforce it.

## 7. Final pre-launch checks

- `npm test` passes; `./sync-public.sh --check` passes.
- Test sign up → questionnaire → dashboard → log out → log in on a phone and a
  laptop, in Chrome, Safari and Firefox.
- The four worlds (Leaf, Atlas, Shield, Forge) are marked "Coming soon" and
  cannot be opened from the app sidebar.
- Remove `?preview=demo` links from anything public if you do not want the demo
  reachable.
