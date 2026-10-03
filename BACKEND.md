# Lumera backend

The Lumera server is a small Node application in `server/`. It serves the
website from `public/` and the API under `/api`. It has **no npm
dependencies**: it uses only Node's built-in `http`, `sqlite`, `crypto` and
`test` modules.

It provides:

- **Accounts**: sign up, log in, log out, change password, delete account,
  export data. Passwords are hashed with scrypt. Sessions use an httpOnly
  cookie.
- **Saved figures**: each member's questionnaire answers, budget, balances,
  goals and subscriptions are encrypted at rest (AES-256-GCM) and only
  readable by that member.
- **Community**: profiles, posts, likes, replies, connections and reports.
- **Subscription logos**: company names are resolved to a logo once on the
  server, then cached in the database.
- **Admin API and portal**: accounts, moderation, reports, app errors, logos,
  content, feature flags, layout and an audit log.

Without the server (for example when the files are opened from disk or
hosted as static files), the app still works in **local mode**: data stays
in that browser, community features say they need an account, and the admin
portal falls back to an offline editor for that browser only.

---

## 1. Requirements

- **Node.js 22.13 or newer** (for `node:sqlite` without a flag). Check with
  `node -v`.
- **Python 3** to rebuild the static pages (`npm run build`). The server
  does not need it.
- A **persistent disk** for the SQLite database in production.

## 2. Run it locally

```bash
npm start                      # http://127.0.0.1:8787
```

In development the server creates `data/lumera.db` and a development
encryption key at `data/.dev-encryption-key`. Both are git-ignored.

To make yourself an admin locally:

```bash
ADMIN_EMAILS=you@example.com npm start
```

Then sign up in the app with that email, and open `/admin-portal.html`.

## 3. Environment variables

| Variable | Default | What it does |
| --- | --- | --- |
| `NODE_ENV` | `development` | Set to `production` in production. Production requires `DATA_ENCRYPTION_KEY`, listens on `0.0.0.0` and makes cookies `Secure` by default. |
| `PORT` | `8787` | Port to listen on. |
| `HOST` | `127.0.0.1` (dev), `0.0.0.0` (prod) | Interface to bind. |
| `PUBLIC_DIR` | `public` | Folder served as the website. |
| `DATA_DIR` | `data` | Folder for `lumera.db` (and the dev key). Must be on a persistent disk. |
| `DATA_ENCRYPTION_KEY` | none | **Required in production.** 32 bytes as 64 hex characters or base64. Encrypts every member's saved figures. See section 4. |
| `ADMIN_EMAILS` | none | Comma-separated emails that get the admin role when they sign up or log in. |
| `SESSION_TTL_DAYS` | `30` | How long a sign-in lasts. |
| `COOKIE_SECURE` | `true` in production | Set the cookie's `Secure` flag. Keep it on whenever the site is reached over HTTPS, including behind a proxy. |
| `TRUST_PROXY` | `false` | Read the client IP from `X-Forwarded-For`. Turn on **only** behind a proxy you control, or rate limits can be bypassed. |
| `LOGO_DEV_SECRET_KEY` | none | Optional. Logo.dev secret key, used server-side to search company names. |
| `LOGO_DEV_PUBLISHABLE_KEY` | none | Optional. Logo.dev publishable key, used server-side to fetch logo images. |
| `BRANDFETCH_CLIENT_ID` | none | Optional. Brandfetch client ID, a second way to find a company's domain. |
| `LOGO_LOOKUPS` | `true` | Set to `false` to stop all outbound logo lookups (members see monograms; admins can still set domains). |

None of these values ever reach the browser. Logo keys are only used by the
server.

## 4. The encryption key

Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store it in your host's secret manager and set it as `DATA_ENCRYPTION_KEY`.

- **Back it up separately from the database.** Without it, every member's
  saved figures are unreadable. There is no recovery.
- Do not change it on a live database. The data is encrypted with the
  current key, so a new key cannot read it.

## 5. Admins

There are two ways to give someone the admin role:

1. Put their email in `ADMIN_EMAILS`. They become an admin the next time
   they sign up or log in. Use this for the first admin.
2. In the admin portal, go to **Accounts** and choose **Make admin**.

Admins cannot remove their own admin role or disable their own account, so
the portal cannot be left with no admin by accident.

### The admin portal

Open `/admin-portal.html` (also served at `/admin.html`) and sign in with an
admin account. Admins also see a link to it in the app's profile menu and
sidebar. The page itself is public, but it only shows a sign-in form. Every
admin API call is checked on the server (`401` when signed out, `403` for
members). Search engines are asked not to index it.

| Tab | What it changes |
| --- | --- |
| Overview | Live counts: accounts, weekly actives, posts, open reports, app errors, logos, and the plan waitlist (download it as CSV to email people at launch). |
| Accounts | Search accounts, make or remove admins, disable or enable, issue a reset link, delete. Disabling signs the member out everywhere. |
| Community | Hide, show or delete posts. Hiding resolves the post's reports. |
| Reports | Member reports (hide the content and resolve, or resolve) and app errors sent by members' browsers, with stack traces. |
| Product updates, News feed, About & team | Content shown in the app. Saved to the server, so every member sees it. |
| Feature flags, Sections & layout | Which features and worlds are live, and the navigation order. Saved to the server. |
| Subscription logos | Add a company, set its domain (this locks it), look it up again, or remove it. |
| Audit log | The latest 200 admin actions. |

### Password resets

Lumera does not send email. When a member is locked out:

1. Find them in **Accounts** and choose **Reset link**.
2. Send them the link yourself (it works once and expires after one hour).
3. They choose a new password, and all their other sessions are signed out.

To add email later, send that link from `POST /api/admin/users/:id/reset-link`
through your mail provider instead of showing it to the admin.

### Offline mode and the team keys

When no Lumera server answers (opened from disk or a static host), the
portal shows a **team key** screen instead. That mode only edits the
browser it runs in, so it is not a security boundary, but you should still
replace the keys. The roles and the SHA-256 hashes of their keys are in
`ROLES` and `ROLE_KEY_HASHES` in `admin-portal.html`. To set a new key:

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('base64'))" 'your-new-key'
```

Paste the output over the hash for that role. The previous default keys were
printed on the old lock screen, so treat them as public.

## 6. Data

Everything lives in one SQLite file: `DATA_DIR/lumera.db` (WAL mode, so you
will also see `-wal` and `-shm` files next to it).

| Table | Contents |
| --- | --- |
| `users` | Email, name, scrypt password hash, role, status, timestamps. |
| `sessions` | SHA-256 of each session token (the token itself is never stored). |
| `user_state` | Each member's saved figures, encrypted with `DATA_ENCRYPTION_KEY`. |
| `community_profiles`, `posts`, `post_likes`, `replies`, `connections` | Community content. |
| `reports` | Member reports and app error reports. |
| `companies` | Company name, domain and cached logo. |
| `app_config` | Feature flags, layout, product updates, news and About content from the portal. |
| `audit_log` | Admin actions. |
| `password_resets` | SHA-256 of each reset token, with its expiry. |
| `waitlist` | Members who pressed *Notify me* for a paid plan. |

**Migrations** are in `server/db.js` and run automatically on start, in
order. Each is recorded in `schema_migrations`, so a database only ever
moves forward. To change the schema, append a new migration to the list;
never edit one that has already shipped.

**Backups.** Take a consistent copy while the server is running:

```bash
node -e "new (require('node:sqlite').DatabaseSync)('data/lumera.db').exec(\"VACUUM INTO 'lumera-backup.db'\")"
```

Copy the backup off the machine, and keep the encryption key with your
secrets, not with the backup. To restore, stop the server, replace
`lumera.db` (delete any `-wal` and `-shm` files), and start it again with
the same key.

**Scheduled jobs.** None are needed. The server removes expired sessions
every hour on its own.

## 7. Subscription logos

When a member adds a subscription, the app asks the server for that
company's logo (`/api/companies/logo?name=…`, signed-in members only). The
server:

1. Uses an admin-set domain if there is one.
2. Otherwise uses the cached result if it is recent.
3. Otherwise searches Logo.dev (with `LOGO_DEV_SECRET_KEY`), then Brandfetch
   (with `BRANDFETCH_CLIENT_ID`), then tries likely domains from the name.
4. Confirms a domain by fetching its icon (Logo.dev with
   `LOGO_DEV_PUBLISHABLE_KEY`, then DuckDuckGo's and Google's public icon
   services), and stores the image in the database.

Names made only of generic words, such as "Boutique gym app", are not looked up. If nothing is
found, the app shows the company's initial, and an admin can set the domain
in the portal. All keys are optional; the free icon services work without
any.

Outbound hosts the server may call: `api.logo.dev`, `img.logo.dev`,
`api.brandfetch.io`, `icons.duckduckgo.com`, `www.google.com`. Set
`LOGO_LOOKUPS=false` to turn this off.

## 8. Services the browser calls directly

These need no keys and are listed in the app's Content-Security-Policy:

| Service | Used for |
| --- | --- |
| `open.er-api.com` | Exchange rates (cached for six hours; built-in rates are used offline). |
| `api.mymemory.translated.net`, `translate.googleapis.com` | Translating text that has no built-in translation. |
| `d8j0ntlcm91z4.cloudfront.net` | The landing page hero video, loaded only after the visitor agrees. |

Fonts and brand artwork are self-hosted in `assets/`.

## 9. Security summary

- Passwords: scrypt with a per-password salt; minimum 10 characters.
  Unknown emails take the same time to reject as wrong passwords.
- Sessions: random 32-byte token in an `httpOnly`, `SameSite=Lax` cookie
  (`Secure` in production); only its SHA-256 is stored.
- CSRF: every state-changing request must send `X-Lumera: 1` and, when the
  browser sends an `Origin`, it must match the host.
- Rate limits (per minute): sign-in 30 per IP and 8 per email; logo lookups
  120 per IP; error reports 20 per IP; community actions per member.
  Limits are kept in memory, so they reset on restart and are per process.
- Headers: CSP on the app, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  a `Permissions-Policy` that blocks geolocation, camera and payment, and
  HSTS when `COOKIE_SECURE` is on.
- The questionnaire never reads the device's location and never fills in
  an address. Region and city come only from what the member types or
  picks.

## 10. Deploying

The server must run on a host that keeps a **Node process** running and
gives it a **persistent disk** for `DATA_DIR`: a VPS, Render, Railway or
Fly.io with a volume, or similar.

> The current `vercel.json` serves `public/` as static files. That works for
> the marketing site and the app's local mode, but **Vercel's static hosting
> cannot run this server**: there are no accounts, community or admin portal
> there. Point the domain at the Node host instead (or proxy `/api` to it).

Steps:

1. Build the pages: `npm run build` (writes `public/`). Commit the result or
   build on the host.
2. Set `NODE_ENV=production`, `DATA_ENCRYPTION_KEY`, `ADMIN_EMAILS` and
   `DATA_DIR` (on the persistent disk).
3. Put HTTPS in front (the host's TLS, or a proxy such as Caddy or nginx).
   If the proxy is yours, set `TRUST_PROXY=true`.
4. Start with `npm start` (or `node server/index.js`) under a process
   manager that restarts it. It shuts down cleanly on `SIGTERM`.
5. Health check: `GET /api/health` returns `{"ok":true,"service":"lumera"}`.
6. Schedule database backups (section 6).

Run a single instance: SQLite and the in-memory rate limits are per
process.

## 11. Build and test

```bash
npm test          # API tests (node:test, in-memory database, no network)
npm run build     # landing.html -> site pages -> lumera.html -> public/
./sync-public.sh --check   # confirm public/ matches the sources
```

The build reads React, Tailwind and the Babel compiler from `_vendor/`, which
is not committed. On a fresh clone, fetch them once:

```bash
mkdir -p _vendor
curl -sL https://unpkg.com/react@18.3.1/umd/react.production.min.js -o _vendor/react.js
curl -sL https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js -o _vendor/react-dom.js
curl -sL https://unpkg.com/@babel/standalone@7.24.7/babel.min.js -o _vendor/babel.js
curl -sL https://cdn.tailwindcss.com -o _vendor/tailwind.js
```

What the build does:

- `build-site.py` generates the marketing and legal pages from
  `landing.html` and `legal-content.py`.
- `build-onefile.py` bundles the site, app and admin portal into the
  single offline file `lumera.html`.
- `build-app.py` writes `public/app.html`: the app with its JSX compiled
  ahead of time, so visitors do not download a compiler or wait for it.
- `sync-public.sh` copies the sources and `assets/` into `public/` (and runs
  `build-app.py`).

`ui-styles.html` is a component showcase (Brutalism, Neumorphism,
Glassmorphism and Spatial UI). It is copied to `public/` but not linked from
the site.

## 12. Before launch

- [ ] Fill every `[FILL]` placeholder in `legal-content.py` (entity name,
      address, company number, jurisdiction, contact and data protection
      emails, minimum age, hosting provider and region, retention periods,
      liability cap, response time). Then run `npm run build` and have the
      pages reviewed by a lawyer.
- [ ] Confirm you have the licence for the landing page hero video.
- [ ] Confirm the source files of the character artwork and logo carry no
      third-party watermark or licence restriction.
- [ ] Set `DATA_ENCRYPTION_KEY` and back it up.
- [ ] Set `ADMIN_EMAILS`, sign up as the first admin, then replace the
      offline team keys (section 5).
- [ ] Schedule backups and test a restore.
- [ ] Deploy to a Node host with HTTPS (section 10).

## 13. API reference

All responses are JSON. Errors look like `{"error":"Message","code":"…"}`.
State-changing requests need the `X-Lumera: 1` header.

| Method and path | Who | Purpose |
| --- | --- | --- |
| `GET /api/health` | anyone | Liveness. |
| `GET /api/config` | anyone | Feature flags, layout, updates, news, About. |
| `POST /api/auth/signup` | anyone | `{name, email, password, consent:true}`. |
| `POST /api/auth/login` · `POST /api/auth/logout` | anyone | Sign in or out. |
| `GET /api/auth/me` | member | The signed-in account. |
| `POST /api/auth/reset` | anyone with a link | `{token, password}`. |
| `GET` · `PUT /api/me/state` | member | Load or save encrypted figures. |
| `GET /api/me/export` | member | Download everything held about you. |
| `PUT /api/me/password` · `DELETE /api/me` | member | Change password, delete account (needs the password). |
| `GET` · `PUT /api/me/waitlist` | member | Paid plans the member wants to hear about: `{plan, on}`, where `plan` is `Pro` or `Premium`. |
| `GET` · `PUT /api/community/profile` | member | Community profile. |
| `GET /api/community/feed` · `POST /api/community/posts` | member | Feed and new posts. |
| `POST /api/community/posts/:id/like` · `GET`/`POST …/replies` | member | Likes and replies. |
| `DELETE /api/community/posts/:id` · `DELETE /api/community/replies/:id` | author or admin | Delete. |
| `POST /api/community/report` | member | Report a post or reply. |
| `GET /api/community/members` · `GET /api/community/connections` · `POST /api/community/connections/:id` | member | Directory and connections. |
| `GET /api/companies/resolve` · `GET /api/companies/logo?name=` | member | Company lookup and logo. |
| `GET /api/companies/logo/:key` | anyone | A cached logo. |
| `POST /api/reports/error` | anyone | App error report (rate limited, truncated). |
| `/api/admin/*` | admin | Overview, users, posts, reports, companies, config, waitlist, audit. See `server/routes/admin.js`. |
