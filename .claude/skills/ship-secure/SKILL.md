---
name: ship-secure
description: Security checklist for AI-built web apps before they go live - database row-level security, secret keys, storage, auth in every server action, role/credit tampering, Stripe webhooks, AI spend limits, key rotation, fake packages, framework patches, and a final security review. Use before deploying or launching an app, when adding auth, payments, AI calls, a database or file uploads, or when asked whether an app is secure or could get hacked.
---

# Ship secure

Go through every item that applies, fix what fails, and report pass / fixed / not applicable
for each. Examples use Supabase, Next.js and Stripe; the same checks apply to any stack.

## Data

1. **Row-level security on every table.** In Supabase, `alter table … enable row level
   security;` on all tables, with policies like `using (auth.uid() = user_id)` for reads and
   `with check (auth.uid() = user_id)` for writes. A table with RLS off is readable by anyone
   with the public anon key, which ships in the browser.
2. **Lock down file storage.** Buckets private by default; storage policies scoped to the
   owner's folder (`(storage.foldername(name))[1] = auth.uid()::text`); signed URLs with
   short expiry for private files; check file type and size on upload.
3. **Users can't edit their own role, credits, plan or balance.** Keep those columns out of
   anything the client can update: a separate table with no client write policy, or
   column privileges (`revoke update (role, credits) on profiles from authenticated`).
   Change them only on the server, after verifying the action that earns them.

## Secrets

4. **Secret keys never in browser code.** Only public keys may use `NEXT_PUBLIC_` (or
   `VITE_`) prefixes. Service-role keys, Stripe secret keys and AI API keys stay
   server-side. Search the built client bundle for `sk_`, `service_role`, `-----BEGIN`.
5. **Leaked a key? Rotate it.** Deleting it from the code isn't enough: it's in git history,
   caches and forks. Revoke and reissue at the provider, update env vars, then remove it from
   history if needed. Keep `.env` in `.gitignore`; commit `.env.example` with placeholders
   only.

## Server

6. **Check auth inside every server action and API route**, not only in middleware or the
   UI: get the user from the session on the server, then check they own the resource
   they're touching. Never trust a `userId` sent by the client.
7. **Verify every Stripe webhook signature** with
   `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` on the raw body. Grant
   paid features from verified webhook events, never from a client redirect like
   `?success=true`. Handle duplicate events idempotently.
8. **Rate-limit AI calls and cap the spend.** Per-user rate limits (e.g. N requests a
   minute), a per-user daily quota, a max-tokens limit on each call, and a hard monthly
   budget alert/limit at the provider. Require login before any paid API call.

## Dependencies

9. **Check every package Claude installs is real.** AI can invent package names, and
   attackers register them ("slopsquatting"). Before installing: does it exist on the
   registry, is it the well-known one (downloads, repo, maintainer), is the spelling exact?
   Commit the lockfile.
10. **Patch the framework the day a security fix drops.** Watch Next.js (and other core
    dependencies') security advisories; `npm audit`; turn on Dependabot or Renovate.

## Common attacks and their fixes

From a list of 20 ways AI-built apps get hacked. Check each that applies.

| Attack | Fix |
| --- | --- |
| Next.js middleware bypass (a crafted `x-middleware-subrequest` header skipped auth; CVE-2025-29927) | Patch Next.js; re-check auth in each route/action (item 6), never in middleware alone |
| Exposed `.git` folder | Deploy only build output; block `/.git` and other dotfiles at the server/CDN |
| Public storage buckets | Item 2 |
| Price sent from the browser | Look up prices and recalculate totals on the server; never trust client amounts |
| Credential stuffing | Rate-limit and slow down logins per account and IP; reject breached passwords; offer MFA; CAPTCHA after failures |
| Open database | Item 1; databases (Postgres, Mongo, Redis, Elastic) never on a public port without auth; firewall to the app only |
| Compromised third-party script (polyfill.io) | Self-host scripts or pin with Subresource Integrity; Content-Security-Policy `script-src` allowlist |
| SMS pumping (fake OTP texts billed to you) | Rate-limit SMS per number/IP, allowlist countries, CAPTCHA before sending, enable the provider's fraud guard |
| Prompt injection | Treat model output and fetched content as untrusted; least-privilege tools; human approval for actions; no secrets in prompts |
| Weak JWT secret | 256-bit random secret (or asymmetric keys); reject `alg: none`; short expiry |
| Race conditions (redeem a coupon or spend credits twice) | Atomic updates (`update … set credits = credits - 1 where credits > 0`), transactions, unique constraints, idempotency keys |
| Account pre-hijacking | Require email verification before an account works; link OAuth only to verified emails; end other sessions on verification |
| Subdomain takeover | Delete DNS records pointing at services you've removed (old Vercel, Heroku, S3, GitHub Pages) |
| SSRF (server fetches a URL the user gave) | Allowlist hosts; block private and link-local IPs incl. `169.254.169.254`; re-check after redirects; IMDSv2 on AWS |
| Path traversal | Never build file paths from user input; use IDs; resolve and confirm the path stays in the allowed directory |
| Password-reset poisoning | Build reset links from a configured base URL, never the request's `Host` header |
| Public source maps | Don't serve production source maps (upload them privately to your error tracker); nothing secret in client code anyway |
| Clickjacking | `Content-Security-Policy: frame-ancestors 'none'` (or `X-Frame-Options: DENY`) |
| Open redirect (`?next=https://evil.com`) | Only allow relative paths or an allowlist of destinations |

## Before shipping

11. **Run your platform's checks**: Supabase → Advisors → Security Advisor (and Performance);
    fix every error-level item.
12. **Run `/security-review`** on the branch, and fix what it finds before deploying.

Also worth a minute: HTTPS only; secure, `httpOnly`, `sameSite` cookies; validate all input
on the server (e.g. zod); no detailed error messages or stack traces to users.
