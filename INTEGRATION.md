# Lumera — Going Live: Mock → Production Integration Guide

Lumera currently runs as a **single offline `Lumera.html` file**. That's perfect for design, demos and testing, but three things genuinely **cannot** run inside one static file and need a tiny backend or third‑party service + API keys:

1. **Real OAuth** (Google / Apple / Microsoft / Facebook sign‑in)
2. **Live market data** (real stock prices, indices, news)
3. **Real product analytics** (true user counts, retention, funnels)

This guide shows exactly how to wire each one up. Everything in the app is already structured with a clean "seam" so these drop in without a rewrite.

> Why not in the single file? Browsers block a static file from holding secret API keys, completing OAuth redirects, or recording analytics for *other* users. All three need code that runs on a server (or a managed service) that you control.

---

## 0. Recommended foundation (15 minutes)

The fastest path to a real beta is **Vite + Firebase** (free tiers cover thousands of users):

```bash
npm create vite@latest lumera -- --template react
cd lumera && npm install firebase
```

Then split `Lumera.html` into modules (the code is already organised into the sections listed in `Lumera-Code.md`):
- `src/data.js` — mock data + benchmarks + finance engine
- `src/i18n.js` — translations
- `src/components/…` and `src/pages/…`
- `src/services/` — **new**: `auth.js`, `market-api.js`, `analytics.js`, `news.js`

Host on **Vercel**, **Netlify**, or **Firebase Hosting** (all free, all give you HTTPS, which OAuth requires).

---

## Step 1 — Real Authentication (Google / Apple / Microsoft / Facebook + Email)

**Use Firebase Authentication** (alternatives: Auth0, Clerk, Supabase Auth — same idea).

### 1a. Set up
1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Get started.**
3. Enable providers: Email/Password, Google, Apple, Microsoft, Facebook.
   - Google: works immediately.
   - Apple: requires an Apple Developer account ($99/yr) + a Services ID.
   - Facebook/Microsoft: create an app in their developer consoles, paste the App ID/Secret into Firebase.
4. **Authentication → Settings → Authorized domains:** add your live domain.

### 1b. Code (`src/services/auth.js`)
```js
import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, OAuthProvider, FacebookAuthProvider,
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, onAuthStateChanged, signOut
} from "firebase/auth";

const app = initializeApp({ /* your firebaseConfig from the console */ });
export const auth = getAuth(app);

const providers = {
  google:    new GoogleAuthProvider(),
  apple:     new OAuthProvider("apple.com"),
  microsoft: new OAuthProvider("microsoft.com"),
  facebook:  new FacebookAuthProvider(),
};

export const loginProvider = (key) => signInWithPopup(auth, providers[key]); // real consent screen
export const signupEmail   = async (email, pw) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pw);
  await sendEmailVerification(cred.user);              // email verification
  return cred.user;
};
export const loginEmail  = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const resetPw     = (email) => sendPasswordResetEmail(auth, email);
export const watchUser   = (cb) => onAuthStateChanged(auth, cb); // returning-user detection
export const logout      = () => signOut(auth);
```

### 1c. Where it plugs into the current app
In `App()` (see `Lumera-Code.md`), replace the mock functions:
- `loginProvider(p)` → call `loginProvider(p)` above (this opens the **real** Google/Apple popup instead of the prototype modal).
- `signup()` / `login()` → call `signupEmail` / `loginEmail`.
- Wrap the app in `watchUser()` so returning users are detected automatically — the existing **"Welcome back — update your values?"** popup already handles the rest.
- Keep the financial data in Firestore (Step 6) keyed by `user.uid`, so the same data follows the user across devices and login methods.

The app already: gates pages behind auth, remembers onboarding, shows a logout **confirmation**, and never re-runs the quiz for returning users. You're only swapping the auth engine.

---

## Step 2 — Live Market Data (real prices, indices, news)

The app shows **clearly-labelled simulated data** today (it never fabricates a price as "live"). Swap in a real feed:

### 2a. Pick a provider (free tiers)
| Provider | Free tier | Good for |
|---|---|---|
| **Finnhub** | 60 calls/min | Quotes, company news, profiles |
| **Alpha Vantage** | 25 calls/day | Quotes, fundamentals |
| **Twelve Data** | 800 calls/day | Quotes, indices, FX, crypto |
| **Polygon.io** | limited | Pro-grade, delayed on free |
| **Financial Modeling Prep** | 250 calls/day | Fundamentals, ratios |

### 2b. The key problem: secrets + CORS
Never put your API key in the browser — it would be stolen. Put it behind a **serverless function** (Vercel/Netlify functions or Firebase Functions):

```js
// /api/quote.js  (Vercel serverless function)
export default async function handler(req, res) {
  const { symbol } = req.query;
  const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY}`);
  const data = await r.json();
  res.setHeader("Cache-Control", "s-maxage=15"); // cache 15s to respect rate limits
  res.json(data);
}
```

### 2c. Front-end module (`src/services/market-api.js`)
```js
export async function getQuote(symbol) {
  const r = await fetch(`/api/quote?symbol=${symbol}`);
  if (!r.ok) return { symbol, unavailable: true };       // never fabricate — show "unavailable"
  const q = await r.json();
  return { symbol, price: q.c, change: q.d, changePct: q.dp, updated: Date.now() };
}
export async function getProfile(symbol) { /* /api/profile → marketCap, peRatio, dividendYield */ }
export async function getIndices() { /* SPX, IXIC, DJI, UKX, NKY */ }
```

### 2d. Wire it in
In `Market()` replace the `STOCKS` / `MARKET_INDICES` arrays with `useEffect` calls to `getQuote`/`getIndices`, store in state, and render:
- Price, Change, % Change, **Market Cap, P/E, Dividend Yield** (already have tooltips/glossary for these terms), **52-week high/low**, and a **"Last updated HH:MM · source: Finnhub (15-min delayed)"** label.
- If `unavailable`, show the existing "data unavailable" state — **do not** invent numbers.

Analyst ratings: the educational Strong Buy → Sell labels can stay as your own model, **or** pull consensus ratings from Finnhub `/stock/recommendation`. Keep the "educational, not advice" disclaimer either way.

---

## Step 3 — Real Product Analytics (the owner-only portal)

The in-app **Admin Analytics Portal** (visit `#/analytics`, key: `lumera-admin-2026` — change this) currently shows **sample** numbers. A static file literally cannot count real users — analytics must be collected on a server. Use a managed product:

| Tool | Why |
|---|---|
| **PostHog** (free 1M events/mo) | Funnels, retention, session replay, self-hostable |
| **Plausible** | Lightweight, privacy-first, GDPR-friendly |
| **Google Analytics 4** | Free, ubiquitous |

### 3a. Install (PostHog example)
```html
<script>
  !function(t,e){/* PostHog snippet from your project settings */}();
  posthog.init('phc_YOUR_KEY', { api_host:'https://eu.posthog.com' });
</script>
```
### 3b. Track the events that matter
```js
posthog.capture('signup', { method:'google' });
posthog.capture('onboarding_complete');
posthog.capture('feature_used', { feature:'wealth_simulator' });
posthog.capture('data_updated');
```
### 3c. View it
Real DAU/MAU, retention, funnels, region and language breakdowns then live in your **PostHog dashboard** (which is already private and login-protected — that *is* your separate owner portal). Optionally embed PostHog's shared insights into the in-app `/analytics` page via iframe, or hit PostHog's API from a serverless function and render the real numbers in the existing charts.

> Keep the in-app portal passcode-gated (done) **and** behind your own login in production — never expose analytics to end users.

---

## Step 4 — Live News Headlines (daily, clickable, real links)

Use **Finnhub `/news`**, **NewsAPI.org**, **GNews**, or **Marketaux** (free tiers). Same serverless-proxy pattern as market data:

```js
// /api/news.js
const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_KEY}`);
```
Render each item with **headline, source, date, summary** and link straight to `item.url` (the app already opens headlines in a new tab). Add a "Top headlines today" widget on the dashboard that calls `/api/news` on load and a "View all" link to a `/news` page. Refresh on an interval or on each visit so it updates automatically.

---

## Step 5 — Real Notifications (reminders & alerts)

The app already requests **browser notification permission** (Settings → Notifications). For reminders that fire when the app is **closed**, add Web Push:
1. Add a **service worker** (`sw.js`) and register it.
2. Use **Firebase Cloud Messaging (FCM)** to send push from your backend.
3. Schedule reminders (subscription renewals, goal milestones, savings nudges) with a cron job (Vercel Cron / Firebase Scheduled Functions) that sends FCM messages to the user's saved token.

---

## Step 6 — Cross-device persistence (replace localStorage)

Today data is saved per-browser in `localStorage`. For real accounts that sync across devices, store it in **Firestore** (or Supabase) keyed by `user.uid`:
```js
import { doc, setDoc, getDoc } from "firebase/firestore";
export const saveUserData = (uid, data) => setDoc(doc(db, "users", uid), data, { merge: true });
export const loadUserData = (uid) => getDoc(doc(db, "users", uid)).then(s => s.data());
```
Call `saveUserData` wherever the app currently writes to `localStorage`, and `loadUserData` after `watchUser` fires. The "Welcome back / Update now" flow then works across any device.

---

## Security & privacy checklist before public beta
- [ ] All API keys live in server env vars — **never** in client code.
- [ ] HTTPS only; OAuth redirect/authorized domains locked to your domain.
- [ ] Firestore security rules: a user can read/write **only** their own `users/{uid}` doc.
- [ ] Email verification on; rate-limit password attempts.
- [ ] Privacy policy live; honour export & delete (the UI buttons exist — wire them to delete the Firestore doc + Firebase user).
- [ ] Never sell data (already your stated policy); add a cookie/analytics consent banner for GDPR.
- [ ] Keep every market figure labelled with source + timestamp; show "unavailable" rather than stale/fake data.

---

### Summary
| Capability | In the file today | To go live |
|---|---|---|
| Email + social sign-in | Validated forms + realistic provider consent screen (mock) | Step 1 — Firebase Auth (real popups) |
| Stock prices / indices / fundamentals | Labelled simulated data, never shown as live | Step 2 — Finnhub/Twelve Data via serverless proxy |
| News headlines | Plain-English explainers + clickable to source search | Step 4 — real news API |
| Product analytics | Owner-only passcode portal with sample metrics | Step 3 — PostHog/Plausible/GA4 |
| Notifications | Browser permission prompt + in-app reminders | Step 5 — Web Push + FCM |
| Data storage | Per-browser localStorage (per account) | Step 6 — Firestore/Supabase |

Everything else — the dashboard, budgeting, benchmarks, money-leak detector, wealth simulator, investing guidance, credit & insurance tools, learning hub, AI assistant, gamification, 5-language UI with RTL — already runs fully client-side and needs no backend.

---

## Appendix — How to view your analytics dashboard (no coding)

"No data found in this origin" happens because a double-clicked `.html` file runs in its own isolated sandbox, so two separate files can't share storage. Pick whichever is easiest:

**A. Easiest — use the built-in dashboard (zero setup).**
The same comprehensive, live, auto-refreshing dashboard is *inside* Lumera, so it always has the data. In Lumera, go to the address bar and append `#/analytics` to the URL (e.g. `…/Lumera.html#/analytics`), enter the key `lumera-admin-2026`. Done — real metrics, updating every 3 seconds. You don't need `admin-portal.html` at all unless you want it on a separate screen.

**B. Load a snapshot into the standalone portal.**
In Lumera's analytics, click **Export** (downloads a JSON file). Open `admin-portal.html`, and use **Option B → choose the file**. Instant dashboard from that snapshot.

**C. Live, shared, still no real coding — run a tiny local server (one command).**
Put `Lumera.html` and `admin-portal.html` in the same folder. Open Terminal in that folder and run:
```
python3 -m http.server 8000
```
Then visit `http://localhost:8000/Lumera.html` and `http://localhost:8000/admin-portal.html`. Now they share one origin, so the portal reads the data **and updates live** as you use Lumera (via BroadcastChannel). Stop the server with Ctrl-C.

**For real users across the world / all devices:** host both files on the same domain (Netlify, Vercel or GitHub Pages — drag-and-drop, free) and add a hosted analytics service (PostHog/GA4, Step 3). That hosted analytics site becomes your private, always-on developer dashboard with true aggregated numbers.

---

## Step 7 — Live UI translation (translate *everything*, including AI replies)

Lumera now has a two-layer translation system so the whole app changes language, not just the menus:

1. **Built-in dictionary (`UI_TR`)** — instant, offline, for common interface text (headings, buttons, labels, statuses).
2. **Runtime machine-translation (`MT`)** — for everything else (AI assistant replies, computed insight sentences). It calls a translation API as the page renders, **caches every result in `localStorage`** (`lumera_mt_<lang>`), so each phrase is fetched once and is instant/offline afterwards. Toggle it in **Settings → Auto-translate everything**.

### What's in the file already (works as-is)
The in-file `MT` module uses the free **MyMemory** endpoint with a **Google** fallback — no key needed, good for prototypes. Caveats: it's rate-limited (~1k words/day anonymous), unofficial for the Google fallback, and only runs when the page is served over **http/https** (browsers block cross-site `fetch` from a bare `file://` page — so use the local-server or hosting method below, then pick Arabic and watch it fill in).

### Upgrade to a production translation API (recommended for launch)
Use **DeepL** (best quality) or **Google Cloud Translation**. Keep the key on a server (never in the browser):

```js
// /api/translate.js  (Vercel serverless function)
export default async function handler(req, res) {
  const { q, target } = req.body;                       // q: string[]  target: 'ar'
  const r = await fetch('https://api-free.deepl.com/v2/translate', {
    method:'POST',
    headers:{ 'Authorization':'DeepL-Auth-Key '+process.env.DEEPL_KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ text:q, target_lang:target.toUpperCase(), source_lang:'EN' })
  });
  const j = await r.json();
  res.json({ translations: j.translations.map(t=>t.text) });   // batched = fast + cheap
}
```
Then point the app's `MT.fetchOne` (or a new batched `MT.fetchMany`) at `/api/translate`. Because results are cached per phrase, you only pay once per unique string per language.

### Make it scale & stay clean
- **Batch** requests (DeepL/Google accept arrays) instead of one-per-phrase.
- **Pre-translate** the ~300 static + generated strings at build time into `/locales/ar.json` etc., ship them, and fall back to the live API only for anything new — fastest and lowest-cost.
- **Quality:** review the auto-translations for finance terms with a native speaker before launch; keep brand names, tickers and currency codes untranslated (the app already keeps numerals/tickers LTR).

### Privacy note
Auto-translate sends the on-screen English text (which can include sentences containing the user's figures) to the translation service. Disclose this, and keep the **Settings toggle** (off = no external calls) — both are already in the app.
