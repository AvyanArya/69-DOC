# Lumera backend

The Lumera server is a small Node application in `server/`. It serves the
website from `public/` and the API under `/api`. It has **no runtime
dependencies**: it uses only Node's built-in `http`, `sqlite`, `crypto`,
`zlib` and `test` modules. (npm packages are used only to *build* the site
and to run the browser tests.)

It provides:

- **Accounts**: sign up, log in, log out, forgot password (by email), change
  password, delete account, export data. Passwords are hashed with scrypt.
  Sessions use an httpOnly cookie.
- **Saved figures**: each member's questionnaire answers, budget, balances,
  goals and subscriptions are encrypted at rest (AES-256-GCM) and only
  readable by that member.
- **Community**: profiles, posts, likes, replies, connections and reports.
- **Team feedback**: the in-app *Feedback* button (on for staging).
- **Subscription logos**: company names are resolved to a logo once on the
  server, then cached in the database.
- **Admin API and portal**: accounts, moderation, reports, app errors,
  feedback, logos, content, feature flags, layout and an audit log.

The hosted app (`public/app.html`) **always uses the server**. If it cannot
reach it, it says so and offers a retry; it never falls back to the
password-less browser-only mode. That mode exists only in the offline files
(`lumera.html` and `dist-previews/`, opened from disk).

Deployment, staging and rollback are in **[DEPLOY.md](DEPLOY.md)**. What is
left before launch is in **[LAUNCH.md](LAUNCH.md)**.

---

## 1. Requirements

- **Node.js 22.13 or newer** (for `node:sqlite` without a flag).
- **Python 3** and `npm ci` to rebuild the site (`npm run build`). The server
  itself needs neither.
- A **persistent disk** for the SQLite database in staging and production.

## 2. Run it locally

```bash
npm ci                         # build and test tools (Tailwind, Babel, React, Playwright)
npm run build                  # writes public/
npm start                      # http://127.0.0.1:8787
```

In development the server creates `data/lumera.db` and a development
encryption key at `data/.dev-encryption-key`. Both are git-ignored. To make
yourself an admin locally: `ADMIN_EMAILS=you@example.com npm start`, sign up
with that email, and open `/admin-portal.html`.

To use a settings file: copy `.env.example` to `.env` and run
`node --env-file=.env server/index.js`. Never commit `.env`.

## 3. Environment variables

`.env.example` lists them all. None of these values ever reach the browser.

| Variable | Default | What it does |
| --- | --- | --- |
| `APP_ENV` | `production` if `NODE_ENV=production`, else `development` | Which deployment this is: `production`, `staging` or `development`. Staging gets `noindex`, the feedback button and the previews by default. |
| `NODE_ENV` | `development` | `production` in staging and production. Requires `DATA_ENCRYPTION_KEY`, listens on `0.0.0.0`, makes cookies `Secure` and logs requests. |
| `PORT` | `8787` | Port to listen on. |
| `HOST` | `127.0.0.1` (dev), `0.0.0.0` (prod) | Interface to bind. |
| `PUBLIC_DIR` | `public` | Folder served as the website. |
| `DATA_DIR` | `data` | Folder for `lumera.db` and backups. Must be on a persistent disk. |
| `PUBLIC_URL` | none | The site's address, e.g. `https://lumera.example`. Used to build links in emails (never the request's `Host` header). |
| `DATA_ENCRYPTION_KEY` | none | **Required with `NODE_ENV=production`.** 32 bytes as 64 hex characters or base64. Encrypts every member's saved figures. See section 4. |
| `ADMIN_EMAILS` | none | Comma-separated emails that get the admin role when they sign up or log in. |
| `SESSION_TTL_DAYS` | `30` | How long a sign-in lasts. |
| `COOKIE_SECURE` | `true` in production | The cookie's `Secure` flag, plus HSTS. Keep on whenever the site is reached over HTTPS, including behind a proxy. |
| `TRUST_PROXY` | `false` | Read the client IP from `X-Forwarded-For` (the right-most entry, the one your proxy adds). Turn on **only** behind a proxy, as on Render, Fly or a load balancer. |
| `RESEND_API_KEY`, `MAIL_FROM` | none | Email through [Resend](https://resend.com). With both (and `PUBLIC_URL`) set, "Forgot password" emails a reset link and admin reset links are emailed too. Without them, members are told to contact support. |
| `SUPPORT_EMAIL` | none | Shown to members who need help, e.g. when email is off. |
| `SITE_PASSWORD` | none | Locks the whole site behind one password (HTTP Basic, any username). For the team preview. `/api/health` stays open. Wrong guesses are rate limited. |
| `NOINDEX` | on unless `APP_ENV=production` | `X-Robots-Tag: noindex` on every response and a `robots.txt` that disallows everything. |
| `FEEDBACK_ENABLED` | on unless `APP_ENV=production` | The in-app *Feedback* button and `POST /api/feedback`. |
| `SERVE_PREVIEWS` | on unless `APP_ENV=production` | Serve the design previews and the offline single-file build (`/lumera.html`, `/previews/`, `/ui-styles.html`). Production answers 404. |
| `LOG_REQUESTS` | on when `NODE_ENV=production` | One JSON line per API request on stdout: time, request id, method, path, status, duration, member id. |
| `LOGO_DEV_SECRET_KEY`, `LOGO_DEV_PUBLISHABLE_KEY`, `BRANDFETCH_CLIENT_ID` | none | Optional, server-side only. Better company logos. |
| `LOGO_LOOKUPS` | `true` | `false` stops all outbound logo lookups (members see monograms). |

## 4. The encryption key

Generate one: `openssl rand -hex 32` (or
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Store it in your host's secret manager as `DATA_ENCRYPTION_KEY`.

- **Use a different key for staging and production.**
- **Back it up separately from the database.** Without it, every member's
  saved figures are unreadable. There is no recovery.
- Do not change it on a live database: the data is encrypted with the current
  key, so a new key cannot read it.

## 5. Admins

There are two ways to give someone the admin role:

1. Put their email in `ADMIN_EMAILS`. They become an admin the next time
   they sign up or log in. Use this for the first admin.
2. In the admin portal, go to **Accounts** and choose **Make admin**.

Admins cannot remove their own admin role or disable their own account.

### The admin portal

Open `/admin-portal.html` (also `/admin.html`) and sign in with an admin
account. The page is public but only shows a sign-in form; every admin API
call is checked on the server (`401` signed out, `403` for members). The
in-app *Analytics* page is also admin-only, decided by the server.

| Tab | What it changes |
| --- | --- |
| Overview | Live counts (accounts, weekly actives, posts, open reports, app errors, feedback, logos, plan waitlist) and the server's status: environment, email on/off, feedback, site password. |
| Accounts | Search, make or remove admins, disable or enable, issue a reset link (emailed when email is on), delete. Disabling signs the member out everywhere. |
| Community | Hide, show or delete posts. Hiding resolves the post's reports. |
| Reports | Member reports and app errors sent by members' browsers, with stack traces. |
| Team feedback | What people sent with the *Feedback* button: bugs, ideas and opinions, with the page and browser. Mark done or reopen. |
| Product updates, News feed, About & team | Content shown in the app. The dashboard's *Financial headlines* show only what you publish under News feed. |
| Feature flags, Sections & layout | Which features and worlds are visible, which worlds are **launched**, and the navigation order. |
| Subscription logos | Add a company, set its domain (this locks it), look it up again, or remove it. |
| Audit log | The latest 200 admin actions. |

### Launching a world

Leaf, Atlas, Shield and Forge are not launched: their pages show a
*Coming soon* screen, even when opened by URL. Some of their tools still run
on example data (markets, news, IPOs). To launch one, replace its example
data with real sources, then press **Coming soon → Launched** next to it in
**Sections & layout**. Individual pages can also be moved into Lumera from
the same tab.

### Password resets

- With email on: members use **Forgot your password?** on the login page.
  They get a link that works once and expires after an hour. The response is
  the same whether or not the address has an account. Asking again
  invalidates the previous link.
- With email off: the page tells them to contact `SUPPORT_EMAIL`. An admin
  issues a link from **Accounts → Reset link** and sends it.
- Either way, resetting signs the member out of every device.

### Offline files

The offline single-file build (`lumera.html`, opened from disk) includes the
portal with a **team key** screen that edits only that browser's storage. On
the hosted site the portal always uses the server. The role key hashes are in
`ROLE_KEY_HASHES` in `admin-portal.html`.

## 6. Data

Everything lives in one SQLite file: `DATA_DIR/lumera.db` (WAL mode, so you
will also see `-wal` and `-shm` files next to it).

| Table | Contents |
| --- | --- |
| `users` | Email, name, scrypt password hash, role, status, timestamps. |
| `sessions` | SHA-256 of each session token (the token itself is never stored). |
| `user_state` | Each member's saved figures, encrypted with `DATA_ENCRYPTION_KEY`. Max 512 KB per member. |
| `community_profiles`, `posts`, `post_likes`, `replies`, `connections` | Community content. |
| `reports` | Member reports and app error reports (the newest 2,000 errors are kept). |
| `feedback` | Team feedback from the *Feedback* button. |
| `companies` | Company name, domain and cached logo. |
| `app_config` | Feature flags, layout, product updates, news and About content. |
| `audit_log` | Admin actions. |
| `password_resets` | SHA-256 of each reset token, its kind (`admin` or `self`) and expiry. |
| `waitlist` | Members who pressed *Notify me* for a paid plan. |

Foreign keys cascade, so deleting an account removes its figures, posts,
likes, replies, connections, sessions and waitlist entries.

**Migrations** are in `server/db.js` and run automatically on start, in
order, each in a transaction. Each is recorded in `schema_migrations`, so a
database only moves forward. To change the schema, append a new migration;
never edit one that has shipped.

**Backups**: `node scripts/backup.js` takes a consistent snapshot while the
server runs (`VACUUM INTO`), checks its integrity, and keeps the newest 14 in
`DATA_DIR/backups/` (`KEEP=30` to keep more, or pass a folder). Copy backups
off the machine. Restoring needs the same encryption key. See DEPLOY.md.

**Housekeeping**: every hour the server deletes expired sessions and reset
links and trims old error reports. No external scheduler is needed.

## 7. Subscription logos

When a member adds a subscription, the app asks the server for that
company's logo (`/api/companies/logo?name=…`, signed-in members only). The
server uses an admin-set domain if there is one, otherwise a recent cached
result, otherwise searches Logo.dev and Brandfetch (with keys) and tries
likely domains, confirming each by fetching its icon (Logo.dev, then
DuckDuckGo's and Google's public icon services). The image is stored in the
database. Generic names ("Boutique gym app") get a monogram.

Outbound hosts the server may call: `api.logo.dev`, `img.logo.dev`,
`api.brandfetch.io`, `icons.duckduckgo.com`, `www.google.com`, and
`api.resend.com` for email.

## 8. Services the browser calls directly

These need no keys and are the only outside hosts the Content-Security-Policy
allows:

| Service | Used for |
| --- | --- |
| `open.er-api.com` | Exchange rates (cached for six hours; built-in rates are used offline). |
| `translate.googleapis.com`, `api.mymemory.translated.net` | Machine translation of interface text with no built-in translation. Text containing digits, the member's name or email, and community posts (`translate="no"`) are never sent. Members can switch it off in Settings. |
| `d8j0ntlcm91z4.cloudfront.net` | The landing page's background video. Visitors can switch it off on the Cookies page; it is then never requested. |
| Any `https:` image | Company logos fall back to public icon services; admin-published news images. |

Fonts, brand artwork, React and the compiled CSS are all served by Lumera.

## 9. Security summary

What is enforced, and where it is tested (`server/test/*.test.js`):

- **Passwords**: scrypt with a per-password salt; 10 to 200 characters; the
  most common leaked passwords are refused. Unknown emails take as long to
  reject as wrong passwords.
- **Sessions**: random 32-byte token in an `HttpOnly`, `SameSite=Lax`,
  host-only cookie (`Secure` in production); only its SHA-256 is stored.
  Logging out, resetting a password or being disabled ends sessions.
- **Access control**: every member route reads only the caller's own rows;
  every admin route requires the admin role (tested route by route).
- **CSRF**: state-changing requests must send `X-Lumera: 1`, and a browser's
  `Origin`, when present, must match the host. Cross-site forms cannot do
  either.
- **Injection**: every SQL statement is parameterised; LIKE wildcards are
  stripped from searches. Posts are stored as text and rendered as text.
- **Rate limits**: sign-in 30 per IP and 8 per email per minute plus 40 per
  email per hour; sign-ups 20 per IP per hour; forgot-password 5 per email
  per hour; password change and deletion 10 per member per 15 minutes;
  feedback 10 per 10 minutes; logo lookups, error reports and community
  actions limited too. Limits are in memory and per process.
- **Headers**: a strict Content-Security-Policy on every page (no eval, no
  plugins, only the hosts in section 8, `frame-ancestors 'self'`),
  `X-Frame-Options`, `nosniff`, `Referrer-Policy`, a `Permissions-Policy`
  that blocks geolocation, camera and payment, HSTS when `COOKIE_SECURE` is
  on, and `X-Robots-Tag: noindex` outside production.
- **Errors**: the browser gets a message and a request id, never a stack
  trace; the detail goes to the server log with the same id.
- **Static files**: no path traversal, no dotfiles, malformed URLs get 400.
- **Secrets**: only in environment variables; production refuses to start
  without an encryption key.
- The questionnaire never reads the device's location and never fills in an
  address.

## 10. Build and test

```bash
npm ci            # once, or after package-lock.json changes
npm run build     # landing.html -> site pages -> lumera.html -> public/
npm run check     # public/ matches the sources, then the API tests
npm test          # API and security tests only (30)
npm run e2e       # real server + Chromium: every page, the main journeys, accessibility
```

Set `CHROMIUM_PATH` for `npm run e2e` if Playwright's own browser is not
installed (`npx playwright install chromium` installs it). The same checks run
in CI (`.github/workflows/lumera-ci.yml`).

What the build does:

- `build-site.py` generates the marketing, legal and 404 pages from
  `landing.html` and `legal-content.py`.
- `build-onefile.py` bundles the site, app and admin portal into the offline
  file `lumera.html`.
- `build-app.py` writes `public/app.html`, `public/app.css` and
  `public/vendor/`: the JSX compiled ahead of time, Tailwind compiled to CSS,
  React served from our own origin, and a stricter policy than the editable
  source. No CDN is needed at runtime.
- `sync-public.sh` copies the sources and `assets/` into `public/` and runs
  `build-app.py`; `--check` fails if anything is stale.

`Lumera.html` is the editable source and still compiles itself in the
browser (Tailwind Play CDN, Babel), which is fine for editing; visitors only
ever get the built `public/app.html`.

## 11. API reference

All responses are JSON. Errors look like `{"error":"Message","code":"…"}`
(500s add `requestId`). State-changing requests need the `X-Lumera: 1`
header.

| Method and path | Who | Purpose |
| --- | --- | --- |
| `GET /api/health` | anyone | Liveness and database check (503 if the database cannot be read). |
| `GET /api/config` | anyone | Feature flags, layout, updates, news, About, and `server` (env, mail, feedback, supportEmail). |
| `POST /api/auth/signup` | anyone | `{name, email, password, consent:true}`. |
| `POST /api/auth/login` · `POST /api/auth/logout` | anyone | Sign in or out. |
| `GET /api/auth/session` | anyone | `{user}` or `{user:null}` (always 200). |
| `GET /api/auth/me` | member | The signed-in account (401 otherwise). |
| `POST /api/auth/forgot` | anyone | `{email}`. Emails a reset link if the account exists; same answer either way. |
| `POST /api/auth/reset` | anyone with a link | `{token, password}`. |
| `GET` · `PUT /api/me/state` | member | Load or save encrypted figures. |
| `GET /api/me/export` | member | Download everything held about you. |
| `PUT /api/me/password` · `DELETE /api/me` | member | Change password, delete account (needs the password). |
| `GET` · `PUT /api/me/waitlist` | member | `{plan, on}`, where `plan` is `Pro` or `Premium`. |
| `GET` · `PUT /api/community/profile` | member | Community profile. |
| `GET /api/community/feed` · `POST /api/community/posts` | member | Feed and new posts. |
| `POST /api/community/posts/:id/like` · `GET`/`POST …/replies` | member | Likes and replies. |
| `DELETE /api/community/posts/:id` · `DELETE /api/community/replies/:id` | author or admin | Delete. |
| `POST /api/community/report` | member | Report a post or reply. |
| `GET /api/community/members` · `GET /api/community/connections` · `POST /api/community/connections/:id` | member | Directory and connections. |
| `GET /api/companies/resolve` · `GET /api/companies/logo?name=` | member | Company lookup and logo. |
| `GET /api/companies/logo/:key` | anyone | A cached logo. |
| `POST /api/reports/error` | anyone | App error report (rate limited, truncated). |
| `POST /api/feedback` | anyone (when enabled) | `{kind: bug\|idea\|opinion, message, page?, contact?}`. |
| `/api/admin/*` | admin | Overview, users, posts, reports, feedback, companies, config, waitlist, audit. See `server/routes/admin.js`. |

## 12. Retired pages

Earlier versions of Lumera (`launch.html`, `hero.html`, `font-options.html`,
`font-preview.html`, `character-preview.html`, `landing.html`) answer
`301 → /` from the server (`LEGACY` in `server/app.js`) and from
`vercel.json`. Unknown addresses get the 404 page.
