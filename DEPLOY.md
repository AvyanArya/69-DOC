# Deploying Lumera

Lumera is one Node process (`server/`) serving the built site (`public/`) and
an API, with a SQLite database on a persistent disk. Any host that runs a
Docker image or a Node process with a disk works. This guide uses **Render**
because `render.yaml` sets everything up; the same steps apply to Fly.io,
Railway or a VPS (see the end).

> Static hosting (plain Vercel, Netlify, GitHub Pages) **cannot** run Lumera:
> there would be no accounts, no saved figures, no community and no admin.
> The hosted app shows "We can't reach Lumera" without the server, by design.

## Environments

| | Staging (team preview) | Production (public) |
| --- | --- | --- |
| Purpose | The team explores and sends feedback | Real members |
| Service | `lumera-staging` | `lumera-production` |
| Deploys | Automatically from `main` | Manually, from the `production` branch |
| `APP_ENV` | `staging` | `production` |
| Access | `SITE_PASSWORD` (one shared password) | Public |
| Search engines | Blocked (`noindex`, `robots.txt`) | Allowed (app and admin excluded) |
| Feedback button | On | Off |
| Database and key | Its own disk and `DATA_ENCRYPTION_KEY` | Its own disk and a **different** key |
| Email | Optional | Required (password resets) |

Nothing is shared between them, so test data on staging never reaches
production. Never copy the staging database into production.

## 1. Team preview on Render (about 15 minutes)

You need: a Render account with a payment method (a persistent disk needs
the Starter plan, about US$7 a month), and this GitHub repository.

1. Merge this branch into `main` (or set `branch:` in `render.yaml` to the
   branch you want staged).
2. In Render: **New → Blueprint**, pick this repository. Render reads
   `render.yaml` and proposes `lumera-staging` and `lumera-production`.
   To start with only staging, delete the production block before you
   create it, or create both and leave production suspended.
3. Render asks for the secret values (`sync: false`). For staging:
   - `SITE_PASSWORD`: the password you will give the team.
   - `DATA_ENCRYPTION_KEY`: run `openssl rand -hex 32`; save it in your
     password manager **now**.
   - `ADMIN_EMAILS`: your email (comma-separate several).
   - `PUBLIC_URL`: the service URL Render shows, e.g.
     `https://lumera-staging.onrender.com`.
   - `SUPPORT_EMAIL`: where locked-out people should write.
   - `RESEND_API_KEY`, `MAIL_FROM`: leave empty for now, or see section 4.
4. Wait for the deploy, then open `https://…/api/health` (no password
   needed). It should say `"ok":true` and `"env":"staging"`.
5. Open the site, enter any username and the site password, sign up with
   your `ADMIN_EMAILS` address, and open `/admin-portal.html`. The overview
   shows the environment, whether email is on, and the site password.

**Share with the team**: send the URL and the site password separately
(different channels). Ask them to sign up with their own email; their
accounts are ordinary member accounts, so they cannot open the admin portal.
Feedback they send with the **Feedback** tab on the right edge of the app
appears under **Team feedback** in the portal.

To revoke access, change `SITE_PASSWORD` in Render (the service restarts).

## 2. Production

1. Create the `production` branch from the commit you want to launch:
   `git push origin <commit>:refs/heads/production`.
2. In Render, set the production secrets (a new `DATA_ENCRYPTION_KEY`, your
   `ADMIN_EMAILS`, `PUBLIC_URL`, email settings).
3. Press **Manual Deploy** on `lumera-production`.
4. Add your domain (section 3), then run the checks in LAUNCH.md.

## 3. Domain and HTTPS

In Render: service → **Settings → Custom Domains**, add `lumera.example` and
`www.lumera.example`, and create the DNS records it shows at your registrar.
Render issues and renews the TLS certificate. Then:

- set `PUBLIC_URL=https://lumera.example` (emails link there);
- keep `COOKIE_SECURE=true` and `TRUST_PROXY=true` (both set by
  `render.yaml`);
- HSTS is sent automatically. Only add your domain to the browser preload
  list once you are sure every subdomain will always be HTTPS.

For staging you can keep the `onrender.com` address, or use
`staging.lumera.example`.

## 4. Email (password resets)

1. Create a [Resend](https://resend.com) account and verify your sending
   domain (it gives you DNS records: SPF, DKIM).
2. Create an API key with *sending access* only.
3. Set `RESEND_API_KEY`, `MAIL_FROM` (e.g. `Lumera <hello@lumera.example>`)
   and `PUBLIC_URL` on the service.
4. In the app, use **Forgot your password?** with your own account; the email
   should arrive within a minute. The admin overview shows *Email on*.

Without email, members are told to contact `SUPPORT_EMAIL`, and admins send
reset links from **Accounts**.

## 5. Deploying a change, and rolling back

**Every change** goes through the same gate:

```bash
npm ci && npm run build      # rebuild public/ from the sources
npm run check                # public/ in sync + API and security tests
npm run e2e                  # browser checks against a real server
git commit && git push       # CI runs the same checks
```

1. Push to `main`: staging deploys automatically. Check it.
2. Promote to production: `git push origin main:production`, then **Manual
   Deploy** on `lumera-production`.
3. Watch `GET /api/health` and the logs for a few minutes.

**Rollback** (the database is not touched by a code rollback):

- Render: service → **Events**, choose the last good deploy → **Rollback**.
  Or `git push --force-with-lease origin <good-commit>:production` and deploy.
- If a release included a **migration**, the old code still runs on the
  migrated database as long as migrations only add things (which is the
  rule in `server/db.js`: append, never edit). If a migration ever has to
  change or remove data, take a backup first (section 6) and restore it if
  you roll back.

## 6. Backups and recovery

- Render takes a daily snapshot of every disk (kept for 7 days); restore it
  from the disk's settings page.
- For your own copies, run the backup script on the server (Render: **Shell**
  tab, or a Render Cron Job using the same image):

  ```bash
  node scripts/backup.js            # /data/backups/lumera-<time>.db, keeps 14
  ```

  Download the file and store it off Render (encrypted storage you control).
- **The encryption key is not in the backup.** Keep `DATA_ENCRYPTION_KEY`
  for each environment in your password manager. A backup without its key
  cannot be read.
- **Restore**: stop the service (Render: *Suspend*), replace
  `/data/lumera.db` with the backup and delete `/data/lumera.db-wal` and
  `/data/lumera.db-shm`, then resume. Use the same encryption key.
- Test a restore on staging before launch, and every few months after.

## 7. Monitoring and logs

- **Health**: `GET /api/health` returns 200 with `"ok":true`, or 503 if the
  database cannot be read. Render restarts an unhealthy instance. Add an
  outside uptime check (UptimeRobot, Better Stack) on the same URL.
- **Logs**: with `NODE_ENV=production` the server writes one JSON line per
  API request (`rid`, method, path, status, duration, member id) plus
  warnings and errors. Every 500 response carries a `requestId` that matches
  the log line. Render keeps recent logs; for longer retention add a log
  stream (Better Stack, Datadog) in Render's settings.
- **App errors**: crashes in members' browsers are reported to the server and
  shown in the admin portal under **Reports → App errors**.
- An error-tracking service (Sentry) can be added later; it needs its own
  account and DSN.

## 8. Scale and limits

Run **one instance** per environment: SQLite and the in-memory rate limits
belong to one process. One instance comfortably serves thousands of members.
If you outgrow it, the next step is Postgres and a shared rate limiter
(Redis), which is a code change, not a configuration one.

## Other hosts

- **Fly.io**: `fly launch` (it detects the Dockerfile), `fly volumes create
  lumera_data --size 1`, mount it at `/data` in `fly.toml`, set the same
  secrets with `fly secrets set`, and `TRUST_PROXY=true`.
- **Railway**: deploy from the repo (Dockerfile), add a volume at `/data`,
  set the variables.
- **A VPS**: `docker run -d --restart=always -p 127.0.0.1:8080:8080 -v
  /srv/lumera:/data --env-file /srv/lumera.env lumera`, with Caddy or nginx in
  front for HTTPS and `TRUST_PROXY=true`.
