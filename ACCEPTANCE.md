# Lumera — acceptance criteria (final website update)

Each item is pass/fail and is checked in a real browser against the built
site (`public/`, served by `npm start`) and the single-file build
(`lumera.html`), at 1440, 1280, 820 and 390 px wide. Fixes (section A) come
before visual polish (section B).

## A. Fixes

### A1. One Lumera — no old version reachable
- [ ] The app has no landing page of its own. `app.html`, `app.html#/` and
      any unknown route redirect (replacing history, not pushing) to the
      dashboard when signed in, otherwise to Log In.
- [ ] Log out, and the logo on sign-in pages, go to the site's landing page
      (`index.html`), never to an in-app page.
- [ ] From the landing page: Sign Up → questionnaire → browser Back → landing
      page. No step shows a different-looking Lumera. Pressing Back never
      needs two presses to leave a page (no redirect loops).
- [ ] Legacy pages (`launch.html`, `hero.html`, `font-options.html`,
      `font-preview.html`, `character-preview.html`) are deleted, and their
      URLs redirect (301) to `/` on the Lumera server and in `vercel.json`.
- [ ] Single-file build: Log In / Sign Up / opening the app show the current
      app inside the frame; the frame never loads a second copy of the site.

### A2. Authentication
- [ ] Log In and Sign Up on every site page link to `app.html#/login` and
      `app.html#/signup`, which render the current auth screens.
- [ ] Successful sign-up replaces the history entry with the questionnaire;
      successful log-in replaces it with the dashboard.

### A3. Questionnaire navigation
- [ ] Back, Skip and Continue sit in one action bar pinned to the bottom of
      the viewport; their position does not change between questions.
- [ ] The bar never covers the last option (content has bottom padding equal
      to the bar's height).
- [ ] Back is disabled on the first question (it does not leave the flow).
- [ ] Every control is reachable by keyboard and has a visible focus state.

### A4. Location / address
- [ ] A new account's questionnaire has no region, city or address filled in.
- [ ] No code path reads geolocation; `Permissions-Policy` blocks it.
- [ ] Inputs that could attract address autofill have autofill disabled.
- [ ] Server state after onboarding contains only what the user entered.

### A5. Subscription logos
- [ ] Known companies show their real logo in every mode: from the server
      cache when the server runs, otherwise from a public icon service by
      domain (no API key in the browser).
- [ ] Unknown or generic names show a monogram; no broken image icon.
- [ ] The logo is a compact tile (≤ 44 px) beside the name; the card leads
      with company, plan, cost.

### A6. Content fixes
- [ ] Monthly Expense Review says plainly that it is for people with income.
- [ ] "What to have ready" is a set of scannable cards with icons, not a
      paragraph.
- [ ] "On this device" is replaced with explicit wording, or removed.
- [ ] The Home / Money switcher is gone; language and currency selectors sit
      in the top bar.
- [ ] "Update my figures" and "Financial Twin" are compact actions in the
      dashboard header corner.
- [ ] No demo score of 67 anywhere; demo figures are labelled as examples.
- [ ] Emergency Fund shows a visual; Monthly Plan is concise; AI
      Recommendations are compact.

### A7. Goals and demo
- [ ] Each goal card shows imagery chosen from its type (car, education,
      travel, home, emergency, wedding, tech, business, investing, other),
      with a consistent aspect ratio and a fallback.
- [ ] The demo account has example content on Dashboard, Goals,
      Subscriptions, Financial Twin, Community and Recommendations, labelled
      as example data. Community demo posts are marked "Example".
- [ ] Real accounts never see demo content; real Community still works.

## B. Visual polish

### B1. Liquid Glass design system
- [ ] One token set (`--lg-*`) drives landing, auth, questionnaire, app,
      admin and previews: translucent fills, backdrop blur on floating
      layers only, a light top highlight, a refraction gradient edge, soft
      shadows, and colour-lit backgrounds (aurora, not flat black).
- [ ] Spatial UI tokens and copy are gone from user-facing code.
- [ ] Blur is limited to floating elements (header, sidebar, dock, menus,
      modals, hero panels); content cards use a cheaper translucent fill.
- [ ] `prefers-reduced-motion` and `prefers-reduced-transparency` give
      solid, static surfaces.

### B2. Typography
- [ ] Instrument Serif only for hero/editorial headings and large figures;
      Manrope for everything else. One type scale.

### B3. Flagship screens
- [ ] Dashboard: overview first (score, cash flow, net worth), then
      insights, goals, recommendations, actions; varied card sizes.
- [ ] Financial Twin: lighter surfaces, charts (spending mix, projection,
      health factors), insights, all computed from the user's own figures.

### B4. Previews and showcase
- [ ] `previews/` holds separate files: site, dashboard, twin, community,
      admin, questionnaire, subscriptions, and the style showcase.
- [ ] The admin preview uses clearly labelled example data and is separate
      from the real portal.
- [ ] `ui-styles.html` shows Brutalism, Neumorphism, Glassmorphism and
      Liquid Glass (no Spatial UI), each with the same components.

### B5. Quality
- [ ] No horizontal scroll at 390 px; no console errors on any page.
- [ ] Text contrast ≥ 4.5:1 (3:1 for large text) on glass surfaces.
- [ ] API tests pass (`npm test`); `./sync-public.sh --check` passes.
