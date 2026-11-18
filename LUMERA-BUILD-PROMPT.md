# LUMERA — COMPLETE BUILD SPECIFICATION

You are building **Lumera**, a gamified personal-finance web application for young adults
(students and early-career professionals, roughly ages 16–34). This document is the complete
specification. Build it faithfully in structure, content and behaviour. Where this document
does not state something, use your own judgement — but never contradict what it does state.

Read the whole document before writing any code.

---

## 0. WHAT LUMERA IS, IN ONE PARAGRAPH

Most people do not have a money problem. They have a **visibility** problem. They earn, they
spend, and the month disappears. Budgeting apps hand them charts but never tell them whether
their spending is *normal*, where the silent leaks are, or what to actually do next. Lumera
takes one month of a person's real behaviour and turns it into a clear, benchmarked,
personalised plan — then wraps the whole thing in a gamified layer (XP, levels, streaks,
quests, badges) so a nineteen-year-old actually comes back tomorrow.

The founding belief, which should be visible in the product's tone: **financial understanding
should not depend on who your parents are.** Lumera exists to give students and early-career
people the financial intelligence that used to be reserved for the wealthy. No jargon, no
complexity, no condescension.

**Critical framing:** Lumera is **educational, never advisory**. It never gives licensed
financial advice. It explains, benchmarks, and suggests. This must be stated in the product
UI (footer, trust section, onboarding), not just in legal text.

---

## 1. PRODUCT ARCHITECTURE — "THE LUMERA FAMILY"

Lumera is not one app. It is a **hub plus four worlds**. This is the single most important
structural idea in the product. Get this right and everything else follows.

| Key | Name | Tagline | Colour | Emoji | What it is |
|---|---|---|---|---|---|
| `lumera` | **Lumera** | Core money | `#8B5CF6` violet | 🪙 | The parent and hub. Everyday money HQ: budgeting, goals, net worth, wealth simulator. |
| `leaf` | **Leaf** | Learn & grow | `#22C55E` green | 🌿 | Money education that doesn't bore you. Bite-size lessons, quizzes, a deep knowledge hub. |
| `atlas` | **Atlas** | Markets & investing | `#3B82F6` blue | 🛰️ | Markets explained for humans. Stocks, indices, a spinnable globe of exchanges, plain-English news. |
| `shield` | **Shield** | Protect & plan | `#64748B` slate | 🛡️ | The grown-up stuff on your terms. Credit building, insurance, debt payoff, retirement. |
| `forge` | **Forge** | Career & income | `#C0873A` amber | 🔥 | Grow what you *earn*, not just what you save. Careers, firms, universities, CV lab, salaries. |

### Rules for the family

1. **Each world is its own space.** Entering a world recolours the *entire shell* — sidebar,
   buttons, accents, progress bars, glows, focus rings, the AI guide. Not a small accent
   badge: the world's colour becomes the dominant colour of the interface.
2. **Each world's colour is the MAIN colour, not an accent.** In Leaf, green is the primary
   button colour, the active-nav colour, the link colour, the chart colour. Do not render a
   green dot next to an otherwise violet UI.
3. **Each world has its own left sidebar** listing only that world's tools, with a "← Back to
   Lumera" control at the top.
4. **Each world has its own AI guide character** (see §6).
5. **Each world has its own daily challenge** worth bonus XP.
6. On the Lumera hub sidebar, the four worlds are listed under the heading **"The Lumera
   family"**. Each is a button carrying its own colour: when active it gets the world's full
   gradient with white text and a coloured drop shadow; when inactive it gets a low-alpha tint
   of its own colour as the background with a stronger tint as the border. Never render these
   as neutral grey rows.
7. There is **no "All products" selector**. The family list itself is the navigation.

---

## 2. VISUAL IDENTITY

### 2.1 The logo

The Lumera mark is a **layered wave rising into a four-point star**.

- Roughly ten thin, evenly spaced strands sweep in a shallow S-curve from lower-left to
  upper-right. They fan out — each successive strand drops slightly lower and its tail splays
  slightly wider — so they read as separate ribbons, never merging into a solid blob. Even
  spacing and thin strokes are essential; if the strands touch, the mark fails.
- The strands carry a single gradient running along the sweep: **gold at both tails, violet
  through the middle**. Suggested stops: `#E7C87A` → `#C9A0E8` → `#8B5CF6` → `#C9A0E8` →
  `#F0D289`.
- At the upper-right crest sits a **four-point star** (a sparkle: long vertical axis, short
  horizontal axis, concave edges) in gold, gradient `#F5DFA0` → `#D9B45F`.
- Soft violet glow beneath: `drop-shadow(0 2px 10px rgba(139,92,246,.35))`.

The wordmark is **LUMERA** in the display serif, all caps, with wide letter-spacing (~`.22em`).

The tagline is: **"All financial intelligence. One place."** — rendered in small caps, wide
tracking, muted colour, usually under a thin gold rule with a small star at its centre.

The mark must be drawn as inline SVG so it stays sharp at any size and themes correctly.

### 2.2 Typography — two faces, strictly divided

This is a rule the product got wrong once and had to fix. Do not repeat the mistake.

- **Display face: Fraunces** (a soft, optical-sized serif). Used for: the wordmark, all
  headings `h1`–`h3`, page titles, card titles, big numbers, and **long descriptive
  paragraphs** (the standfirst under a heading). For long paragraphs use weight 400 with
  slightly open tracking, never a bold weight — bold Fraunces at paragraph size reads as
  shouting and looks broken.
- **UI face: Inter.** Used for: everything small. Labels, buttons, table cells, form controls,
  nav items, badges, numbers in tables, captions, 10–13px text of any kind. A serif at 11px
  turns to mush.

Implement this as: `body { font-family: Inter }`, `h1,h2,h3,.font-serif { font-family:
Fraunces }`, plus a dedicated `.lede` class (Fraunces, weight 400) applied to long sub-copy.

Also load a Naskh Arabic face as a fallback in both stacks, for RTL languages.

### 2.3 Colour system

Every colour is a **CSS custom property holding R G B channels**, so a theme flip is a single
variable change and alpha modifiers still work: `rgb(var(--c-gold) / <alpha>)`.

Themes are driven by attributes on the root element:
- `data-theme="light" | "dark"`
- `data-mode="calm" | "spark"` — Calm is the restrained, editorial, warm-neutral mode; Spark
  is the gamified purple/blue mode. **Spark + dark is the default.**
- `data-product="lumera" | "leaf" | "atlas" | "shield" | "forge"` — recolours the shell.

**Calm palette (light):** warm off-whites and parchment. Ivory `#F6F2EB`, cream `#FCFAF6`,
card `#FFFDFA`, line `#E9E2D5`, charcoal text `#272320`, muted `#7C7264`, accent gold
`#BFA06A` with a deeper `#9E7E45`, sage `#6E8B6A`, clay `#C0714F`.

**Calm palette (dark):** warm near-blacks ascending in lightness. Ivory `#14110D`, cream
`#1E1A14`, card `#251F19`, line `#3A3227`, text `#EDE7DC`, muted `#A69D8E`, gold lifted to
`#D0B27A`.

**Spark dark base ("Nebula"):** cool near-blacks. Ivory `#0E0E13`, cream `#181820`, card
`#1A1A23`, line `#2A2A38`, text `#E9EAF4`, muted `#9EA0B4`. The page background carries two
large radial glows in the current world's colour.

**Per-world token overrides** set `--gold`, `--goldd`, `--glow`, and a primary button pair
`--p1`/`--p2`:

| World | `--gold` | `--p1` → `--p2` |
|---|---|---|
| lumera | `#8B5CF6` | `#8B5CF6` → `#6D28D9` |
| leaf | `#22C55E` | `#22C55E` → `#15803D` |
| atlas | `#3B82F6` | `#3B82F6` → `#1D4ED8` |
| shield | `#94A3B8` | `#64748B` → `#334155` |
| forge | `#D97706` | `#D97706` → `#92400E` |

**Dark-mode lift.** On a near-black ground, mid-tone accents stop reading, so in dark mode
each world's accent is lifted (violet → `#A78BFA`, green → `#4ADE80`, blue → `#60A5FA`,
amber → `#FBBF24`).

**Two colour traps you must avoid — both were real bugs in the original:**

1. **Do not build a primary-button gradient from `accent → accentDark` if dark mode lifts
   `accentDark` lighter than `accent`.** The gradient inverts and the button turns pale and
   washed out. Drive primary buttons from a dedicated deep pair (`--p1`/`--p2`) that stays
   saturated in both themes.
2. **Alpha variants of "light text" tokens.** If `text-cream` is overridden in dark mode but
   `text-cream/70` is not, the alpha variant resolves against the *token* — which in dark mode
   is a near-black surface colour — and the text vanishes into its own panel. Override the
   alpha variants too.

### 2.4 Surfaces, shape and depth

- Cards: gradient-filled rounded rectangles (`180deg` from slightly lighter to slightly
  darker), 1px border in the line token, radius ~16–20px, generous padding (20–24px).
- Radii scale: `xl` 12px, `xl2` 16px, `xl3` 20px+.
- Hover lift: translate up 2–4px, border takes on a low-alpha world colour, plus a wide soft
  shadow tinted with the world's glow.
- Glass: translucent panels with `backdrop-filter: blur()` for the sticky header and modals.
  **Warning:** an element with `backdrop-filter` creates a containing block, so a
  `position: fixed` overlay placed *inside* it will be trapped. Put overlays at the root.

---

## 3. MOTION

Motion is a feature here, not decoration — the audience is young and the product is
competing with apps that move. Build a **named, reusable motion kit** so movement feels like
one hand drew it, rather than each page inventing its own.

The kit, all of which should exist:

- `fadeUp`, `fadeIn`, `scaleIn`, `slideIn`, `popIn`, `dropIn` — entrances.
- `floaty` — slow 6s vertical bob, for mascots and hero art.
- `stagger` — a container class that delays each child by ~60ms in sequence, up to ~8 children.
- `reveal` — intersection-observer driven; elements fade and rise as they scroll into view.
- `shimmer` / `skel` — loading skeletons.
- `ringdraw` — SVG progress rings draw themselves from 0 to their value on mount.
- `sweep` — a light band that travels across a card on hover.
- `flamePulse` — a flame that scales and rotates gently with a warm drop-shadow, for streaks.
- `emberRise` — small glowing particles drifting upward behind the streak header.
- `barShimmer` — a light band travelling along a filled progress bar.
- `tilt` — cards rotate 2° toward the cursor in perspective on hover.
- `halo` — a soft radial glow in the world's colour that fades in behind a card on hover.
- `tick` — numbers flip up when they change.
- `nudge` — a rare, subtle horizontal wobble to draw the eye to one CTA.
- `hueDrift` — gradient text slowly drifting its gradient position.
- `capesway`, `blink` — mascot idle animations.
- Count-up: numbers tween to their value. **Tween from the current value, not from zero**, or
  every re-render restarts the animation and the number visibly glitches. Small deltas (under
  25% change) should settle fast (~220ms) so slider drags don't flicker.

**Every looping animation must be disabled under `prefers-reduced-motion: reduce`.**

---

## 4. THEME, LANGUAGE, CURRENCY, REGION

- **Theme toggle:** light / dark, persisted.
- **Mode toggle:** Calm / Spark, persisted.
- **7 languages** with full RTL support: English, Arabic (RTL), French, Spanish, Hindi, Urdu
  (RTL), German. Selecting a language sets `document.documentElement.dir` and `lang`. Ship a
  hand-written string table for the core UI, and fall back to machine translation for the long
  tail, cached in local storage. When the language changes, force a remount so no stale
  translated strings linger.
- **3 regions**, each with a default city and currency: 🇦🇪 United Arab Emirates / Dubai / AED
  (the default), 🇺🇸 United States / New York / USD, 🇬🇧 United Kingdom / London / GBP.
  Region drives which benchmark set is used.
- **Currency switcher** with live FX rates fetched from a public API and cached; all money
  values format to the chosen currency.

---

## 5. THE GAMIFICATION LAYER (Spark mode)

- **XP and levels.** `level = floor(sqrt(xp / 40)) + 1`, so `xpForLevel(n) = 40·(n−1)²`. Levels
  come slowly enough to feel earned. Show a level chip and an XP progress bar in the header.
- **Daily quests.** Three per day, reset at midnight, each worth XP and each deep-linking to
  the tool that completes it. Defaults: *Open your Budget* (10 XP), *Review your subscriptions*
  (20 XP), *Open a 2-minute lesson* (25 XP).
- **Daily challenge per world**, worth bonus XP, verified by actually visiting the relevant
  tool — not by clicking "done".
- **Streaks.** A day-by-day check-in counter with a best-streak record. Streak milestone tiers,
  each with a name, emoji and XP reward: **Spark** (3 days, +25), **Kindling** (7, +50),
  **Blaze** (14, +100), **Wildfire** (30, +250), **Inferno** (60, +500), **Supernova**
  (100, +1000).
- **XP burst.** When XP is awarded by an explicit action, fire a small particle burst. **Do not
  fire celebration effects merely because a page was visited** — award silently in that case.
  Random confetti on page load is a bug, not a delight.

### 5.1 Badges / achievements

Fourteen badges across three tiers (**Foundational**, **Milestone**, **Prestige**) and five
rarities (**Common**, **Uncommon**, **Rare**, **Epic**, **Legendary**):

| Badge | Tier | Rarity | Earned by |
|---|---|---|---|
| 🌱 First Step | Foundational | Common | Created your account |
| ✨ Clarity Achieved | Foundational | Common | Generated your first health score |
| 🧾 Budget Builder | Foundational | Uncommon | Set up your first budget |
| 🔥 30-Day Tracker | Milestone | Rare | Checked in 30 days in a row |
| 🐖 Consistent Saver | Milestone | Uncommon | Reached a 15%+ savings rate |
| 📺 Subscription Optimiser | Milestone | Uncommon | Cut unused recurring spend |
| 🎯 Smart Spender | Milestone | Rare | All lifestyle categories within benchmark |
| 🛡️ Safety Net | Milestone | Rare | Built a 3-month emergency fund |
| ⛓️ Debt Crusher | Prestige | Epic | Kept debt under 10% of income |
| 📈 Investment Ready | Prestige | Epic | Buffer set, debts controlled, surplus flowing |
| 💎 In the Black | Prestige | Epic | Reached a positive net worth |
| 📚 Lifelong Learner | Prestige | Rare | Completed a learning path |
| 🚀 Momentum | Prestige | Legendary | Improved your score two months running |
| 🏆 Goal Achiever | Prestige | Legendary | Completed a savings goal |

The achievements page is a **full page inside the gamified section**, not a settings tab. It
opens with a gradient hero, then rarity counts, then a "closest to unlocking" strip, then
rarity filters, then the grid.

**Rarity percentages:** show "X% of members have this" *only* once a minimum sample of real
users exists (~25). Below that, display "Rarity opens up as the community grows". Showing
"0% of members have this" to every early user is meaningless and looks broken.

---

## 6. THE AI GUIDE CHARACTERS

Each world has its own character. They are **stylised mascots with distinct silhouettes** —
give each a different head topper and colour so they read as five individuals. Do not describe
them in copy as animals or objects; describe personality only.

| Character | World | Emoji | Tagline | Personality |
|---|---|---|---|---|
| **Lumi** | Lumera | 🦉 | your money guide | Calm and a bit knowing. Shows you round the HQ, explains XP and quests, sends you to the right world. |
| **Sprout** | Leaf | 🌱 | your learning buddy | Warm and keen. Wants money to click for you, and will not shut up about your streak. |
| **Nova** | Atlas | 🛰️ | your markets co-pilot | Cool-headed and precise. Takes the markets and the noise around them and says what it actually means. |
| **Sentinel** | Shield | 🛡️ | your protection guide | Steady, slightly serious. Credit, debt, planning ahead. Makes sure nothing catches you out. |
| **Blaze** | Forge | 🔥 | your income coach | Loud and pushy in a good way. Careers, firms, salaries, your CV. Wants you aiming higher. |

### Mascot construction

A small SVG figure with: a swaying cape behind, a rounded body in a vertical gradient of the
world's colour, a chest medallion carrying the character's emoji, a round head, a visor or
mask across the eyes with two blinking white eyes, a slight smile, and — the distinguishing
part — a **unique head topper** per character: pointed tufts, a sprouting two-leaf stem, an
antenna with a satellite dish and orbital ring, a crested helm plate, a triple-layered flame.
The markets character wears a **glowing visor** instead of eyes.

Idle animations: the whole figure floats, the cape sways, the eyes blink.

### Chat behaviour — the important part

- **One shared conversation across all five worlds.** The character changes; the history does
  not. Ask Lumi something on the dashboard, walk into Atlas, and Nova still knows the thread.
- **Greetings are NOT part of that history.** This is the subtle bug to avoid: if each guide
  appends its greeting to the shared thread, then arriving in a new world replays every
  previous character's introduction above the new one's. Instead, render the current guide's
  opening line as a **pinned bubble** at the top of the panel — tinted in that world's colour —
  with an "Earlier in this chat" divider below it, and persist only real conversation.
- Each stored message carries a `who` field so past messages show the character who said them.
- The chat panel is a floating bottom-right widget with a coloured header (mascot, name,
  tagline, "online"), a scrollable message area, quick-reply chips, and an input.
- Replies should read the user's *actual* numbers and answer with them — savings rate,
  emergency-fund months, biggest leak, score — not generic filler.

### First-run walkthrough

A short blocking walkthrough (4 steps, with dots, Back/Next, and an always-present **"Skip the
tour"**) introduces the first world you enter. **It runs once, globally — not once per world.**
Every world after the first gets a small non-blocking card at the top of the screen: "*Nova* is
your guide here — your markets co-pilot · your chat history carries over", dismissible. Four
consecutive forced tutorials is the thing to avoid.

---

## 7. POPUP SEQUENCING — BUILD THIS PROPERLY

The app has four things that interrupt the user. If each decides independently when to appear,
they stack on top of each other on one page load, which is what happened in the original.

Build a **popup queue**: a tiny module-level store that popups register a *want* with, and
which exposes exactly one *active* popup at a time, chosen by a fixed priority order:

```
1. guide      — the first-run walkthrough
2. checkin    — the daily streak card
3. wotd       — word of the day (Leaf only)
4. whatsnew   — product updates
```

Each popup component asks for a slot and renders only when it is granted; releasing the slot
promotes the next. Popups appear only on the **dashboard** (except word of the day, which is a
Leaf-entry popup), never on arbitrary pages.

---

## 8. ONBOARDING

Two stages, deliberately separated:

**Stage 1 — the profile survey.** Seven questions, no more. Each question shows a "why we ask"
line, because asking a nineteen-year-old for personal data without justification loses them.

1. **Where are you based?** (region picker) — *So we compare your spending against the right region, and set your currency.*
2. **Your age range?** — Under 16 / 16–17 / 18–24 / 25–27 / 28–34 / 35–44 / 45–54 / 55+ — *Benchmarks and priorities differ by life stage. Lumera is built for every age, including students.*
3. **What brings you to Lumera?** (multi-select, plus "other") — Get on top of my spending / Start saving properly / Learn how money works / Start investing / Pay off debt / Build my credit / Plan my career / Find side income / Choose a university or subjects / Prepare for retirement — *We surface the tools that match your goals first.*
4. **Your employment status?** — Employed full-time / Self-employed / Part-time / Student / Between jobs — *Income stability affects your recommended buffer.*
5. **Your housing situation?** — Renting / Mortgage / Live with family / Own outright — *Housing is usually the largest line.*
6. **How would you rate your financial knowledge?** — Just starting / Beginner+ / Comfortable / Advanced — *We tune explanations to your level, never condescending.*
7. **How did you hear about us?** (multi-select, optional) — friend or family / Instagram / TikTok / LinkedIn / YouTube / X / search engine / school or university / a podcast / an event.

The answers infer a starting savings goal (mentions of retirement → Retirement; investing →
Investing; debt or default → Emergency fund).

**Stage 2 — the financial review.** A grouped, step-by-step entry of one month of figures
(income, housing, essentials, lifestyle, obligations, savings) plus balances. Show running
totals and let people skip lines.

**Onboarding must never trap the user.** Only the personal-finance tools that genuinely need
figures should redirect to onboarding: dashboard, budget, goals, emergency fund,
subscriptions, net worth, simulator, financial twin, analytics, benchmarks, recommendations.
Everything else — all four worlds, learning, careers, community, markets — is open the moment
you sign up.

---

## 9. THE FINANCIAL ENGINE

This is what makes Lumera more than a pretty shell. Implement it properly.

### 9.1 Expense taxonomy

Every expense line is an object: `id`, group, label, icon, and a benchmark band expressed as
**a fraction of income** (`lo`, `hi`). Some are region-sensitive; some are "good" lines where
*more* is better (savings, investments, pension).

Groups and representative lines with their benchmark bands:

- **Income** (no benchmark): monthly take-home, other income, irregular/freelance income.
- **Housing:** rent or mortgage `.22–.34`, service charges `.004–.02`, home insurance
  `.002–.01`, maintenance `.004–.018`, furnishing `.004–.025`.
- **Essentials:** groceries `.07–.14` (regional), electricity `.012–.038`, water `.003–.014`,
  gas `.003–.014`, internet `.006–.018`, mobile `.005–.018`, public transport `.008–.035`
  (regional), fuel `.012–.05` (regional), insurance `.008–.03`, healthcare `.005–.03` (regional).
- **Lifestyle:** eating out, coffee, delivery, subscriptions, shopping, entertainment, travel,
  fitness, personal care, gifts — each with its own band, all discretionary.
- **Obligations:** credit cards, loans, childcare, education, family support.
- **Savings (good lines):** savings, investments, pension.

### 9.2 Derived metrics

From income, expenses and balances compute:

- Totals per group; consumption; leftover.
- **Savings rate** = savings total ÷ income.
- **Emergency-fund months** = emergency fund balance ÷ monthly essentials.
- **Per-line benchmark rows**: for each line, its amount, its band for this income and region,
  and a status of `within` / `over` / `under` (inverted for "good" lines), plus the overage.
- **Savings opportunity**, in three flavours: *conservative* (half the total overage),
  *realistic* (total overage), *aggressive* (pull discretionary lines to mid-band plus a share
  of the rest).
- **Top leaks**: the five biggest overages, descending.

### 9.3 The health score (0–100)

Seven sub-scores, each clamped 0–100:

| Sub-score | Formula | Weight |
|---|---|---|
| Savings rate | `savingsRate / 0.22 × 100` | 0.22 |
| Emergency fund | `efMonths / 6 × 100` | 0.18 |
| Debt pressure | `100 − (debt/income) / 0.18 × 100` | 0.16 |
| Spending efficiency | `100 − (overage/income) / 0.18 × 100` | 0.16 |
| Investment readiness | buffer 40 pts + investing 25 pts + savings rate 20 pts + low debt 15 pts | 0.12 |
| Income stability | mapped from status: very stable 100, stable 82, somewhat 60, unstable 35 | 0.08 |
| Lifestyle control | `100 − max(0, lifestyle/income − 0.18) / 0.18 × 100` | 0.08 |

Then apply an **encouragement curve**: `overall = 38 + weightedBlend × 0.62`. This keeps the
score honest in its *movement* while never handing a struggling nineteen-year-old a 6/100.
The score should feel realistic but motivating, never punishing.

### 9.4 Archetypes — the Financial Twin

Classify the user into a **money archetype**, each with a name, a one-line tag, a blurb,
strengths, weaknesses and a colour. At minimum:

- **The Lifestyle Spender** — *lives well, saves later.* Strong income, rich lifestyle, but
  discretionary spending is quietly capping wealth growth.
- **The Careful Saver** — *disciplined, slightly cautious.* Enviable savings rate; the next
  frontier is putting idle cash to work before inflation erodes it.
- **High Earner, Low Retainer** — *earns a lot, keeps too little.* The gap between what they
  make and what they keep is the single biggest opportunity.
- **The Subscription Leaker** — recurring spend is the dominant leak.
- Plus: a debt-pressured archetype, an investing-ready archetype, and a beginner archetype.

**Consistency rule:** the archetype and the headline leak must agree. If the user is classified
as a Subscription Leaker, the "your biggest money leak" callout must lead with subscriptions,
not with eating out. Contradicting yourself on the same screen destroys trust in the engine.

The Financial Twin page is deep: archetype card, a what-if simulator, side-by-side "you now"
vs "you if you change one thing", leak breakdown, and a projected timeline.

---

## 10. FULL PAGE INVENTORY

Build all of these. Hash-based routing (`#/route`) is fine.

### Public
`/` landing · `/login` · `/signup` · `/forgot` · `/pricing` · `/privacy`

### Onboarding
`/onboarding` (7-question survey) · `/review` (financial figures)

### Lumera core
`/hub` product hub · `/dashboard` · `/benchmarks` · `/recommendations` · `/budget` ·
`/goals` · `/emergency` · `/subscriptions` · `/networth` · `/simulator` (wealth simulator) ·
`/twin` (financial twin) · `/analytics` · `/chats` (chat history) · `/community` ·
`/badges` · `/assistant` · `/settings` · `/updates` · `/about` · `/team`

### Leaf (learn)
`/leaf` world home · `/learn` lessons · `/quiz` money quiz · `/challenges` · `/resources`
knowledge hub · `/habits`

### Atlas (markets)
`/atlas` · `/invest` · `/market` · `/exchanges` · `/globe` (spinnable globe) · `/world`
(world monitor) · `/news`

### Shield (protect)
`/shield` · `/credit` · `/debt` · `/insurance` · `/retirement`

### Forge (career)
`/forge` · `/careers` finance careers · `/firms` top finance firms · `/universities` ·
`/subjects` subject selection · `/finance-vs-econ` · `/prep` career prep hub · `/career-lab`
CV & LinkedIn Lab · `/opportunities` · `/sideincome` · `/salary` salary check

---

## 11. KEY PAGES IN DETAIL

### 11.1 Landing page

Sticky glass header: logo, section links (Problem, Family, Features, Markets, Trust, Pricing),
theme toggle, language switcher, "Log in", "Get started". **Keep header labels short** — long
CTA labels plus six nav links overflow the bar and push the primary button off-screen. Test at
390 / 768 / 1024 / 1280 / 1440px.

Sections, in order:

1. **Hero.** Pill ("Global · Multilingual"), headline *"Your personal financial intelligence
   system."* with the last two words in the drifting gradient, sub-copy in the lede face, three
   CTAs (Start your 30-day review / Explore market intelligence / See how it works), and a trust
   row (Privacy-first · No bank login required · Educational only). Beside it, a **live preview
   card** showing a health-score ring, a savings-opportunity figure, and an AI insight.
2. **The problem.** *"Most people don't have a money problem. They have a **visibility**
   problem."* Then three cards: **Invisible leaks**, **No benchmark**, **No next step** — the
   last with the line *"Data without a plan is just anxiety with a dashboard."*
3. **The Lumera family.** *"Four worlds, one financial life."* Four cards, each with its own
   colour gradient header, emoji, name, tagline and blurb.
4. **Features.** *"Everything your money needs, in one calm place."*
5. **Markets.** *"Serious market intelligence, in plain English."*
6. **Achievements.** *"Milestones that feel like achievements, not arcade points."*
7. **Trust.** *"Your data is yours. Full stop."* Four cards: Never sold, You own it,
   Consent-based, Educational.
8. **Pricing teaser**, then footer.

**Centre the section heads.** Eyebrow, heading and standfirst centred in a `max-w-2xl mx-auto`
column. The same applies to in-app page headers: centred by default, with any action button
pinned right *without* knocking the heading off centre.

### 11.2 Dashboard

Health-score ring with count-up; score breakdown by sub-score; allocation donut; top leaks;
savings opportunity in three flavours; a 30-day action plan; quick links to tools; quests; XP
and streak in the header.

### 11.3 Benchmarks

Every expense line as a horizontal band chart: the benchmark range as a track, the user's
value as a marker, colour-coded within / over / under, with the plain-English "is this normal
for someone like you" answer.

### 11.4 Leaf — Word of the Day

On entering Leaf each day, a popup asks **three vocabulary questions, four options each**.
Backed by **spaced repetition**: Anki-style boxes 1–5 with intervals of `[0,1,2,4,8,16]` days.
A right answer promotes the word a box and pushes its due date out; a wrong answer drops it
straight back to box 1 so it returns sooner. Ship ~18+ finance terms with definitions.
Do not also keep a separate static glossary page — the popup replaces it.

### 11.5 Leaf — Money Quiz

Colourful, well laid out, one question per screen with progress, immediate feedback with an
explanation, and a score at the end. This must not look like a grey form.

### 11.6 Atlas — Global Markets and World Monitor

- **Spinnable globe**: an orthographic projection you can drag to rotate, auto-rotating when
  idle, with selectable financial centres that light up. Pure SVG maths, no heavy 3D library —
  a lazily-loaded globe was a source of load failures and was removed in favour of rendering it
  directly.
- **World Monitor**: a world map with per-region economic cards.
- **Stocks**: clicking any stock opens an **AI insight panel** explaining what the company does,
  why the price moved, and what it means for a beginner. Not a generic canned response.
- **News**: every item carries a plain-English "why this matters to *you*" line.

### 11.7 Shield — Credit

Credit-score cards with proper alignment and a score gauge. Factors, what moves them, and
concrete steps to improve.

### 11.8 Forge — the career suite

This is a genuinely large section and a major differentiator:

- **Finance Careers** (~9 detailed paths: investment banking, private equity, hedge funds,
  asset management, consulting, quant, corporate finance, accounting, fintech). Each with what
  the job is, skills needed, typical route in, progression ladder, and a link out. Clicking
  anywhere on a career banner opens the detail — not just a small chevron.
- **Top Finance Firms** (~9+ firms across MBB, bulge-bracket banks, elite boutiques, PE, asset
  managers) with what they're known for, what they test for, interview process, compensation
  shape, culture, and notable facts. Make this **detailed**, not a logo wall.
- **Universities** (~20 ranked) with colourful, varied cards. **Do not render this as a red-on-
  black table** — it reads as a warning screen. Give each card its own hue from a rotating
  palette.
- **Subject Selection** — which subjects to take and when. Use correct terminology: **IGCSE**
  and **GCSE** (not "IGC" / "a level/IGC").
- **Finance vs Economics** — a head-to-head explainer.
- **Career Prep Hub** — a mastery ring plus clickable three-tier skill segments (aware →
  practising → strong), persisted.
- **CV & LinkedIn Lab** — see below.
- **Opportunities** — internships, competitions, programmes.
- **Side Income** and **Salary Check**.

### 11.9 The CV & LinkedIn Lab — build it as an actual laboratory

The audience is young; this page should feel like a game, not a checklist.

- The page sits on a **dark laboratory bench**: a deep indigo/navy gradient
  (`#0F172A → #1E1B4B → #0B1120`) with slow drifting particles.
- On the left, a **measuring cylinder** in SVG: glass body with highlight gradients, graduation
  marks, a coloured liquid that **fills as you complete items**, an animated wavy liquid
  surface, and bubbles rising through it. Beneath it a percentage and a verdict: *Empty bench*
  → *Just started* → *Taking shape* → *Nearly there* → **Interview-ready**.
- On the right, a grid of **reagent bottles** — each one a CV or LinkedIn best-practice item.
  Clicking a bottle "pours" it: the bottle tips, glows, and the cylinder level rises.
- Two tabs: **CV Building** (violet liquid) and **LinkedIn Optimisation** (sky-blue liquid).
- Progress persists.

### 11.10 Community

A hub where Lumera members interact: post updates, share LinkedIn post links, share
opportunities, connect with each other. Posts carry a name, a headline, text, an optional link,
a tag and a like count.

### 11.11 Founding team page

Three across on desktop. Each person is a card: a **rectangular 4:3 portrait** at the top
(placeholder initials on a coloured gradient when no photo), then the **name large in the
display serif**, then the **role smaller and faded** in that card's hue, then a **short
description smaller again**, then an optional LinkedIn link. Content must be editable from the
admin portal (§12), with placeholders until filled.

---

## 12. THE ADMIN PORTAL

A **separate page** from the app, sharing the same local storage keys. Gated by a role key
(hashed, never stored in plain text), with four roles and scoped tab access:

- **Founder** — everything.
- **Operations Associate** — dashboard, insights, usage, updates, news, about, permissions.
- **Product Dev Associate** — dashboard, feedback, features, updates, about, permissions.
- **Innovation & Research** — dashboard, trends, market, news, offers, permissions.

Tabs: Dashboard (KPIs, live snapshot), User insights, Usage reports, Product updates, News
feed, Discounts & offers, **About & team**, User feedback, **Feature flags**, Trend monitor,
Market tracker, Permissions.

### Feature flags — tri-state

Every flagged feature is **Off / Beta / Live**, not a boolean:

- **Off** — hidden from everyone, and unreachable by direct URL.
- **Beta** — visible only in beta preview, entered via `?beta=1` and remembered for the session.
- **Live** — visible to everyone.

The portal shows counts, per-feature chips, links to "Open beta preview" and "Open live site",
and a "Promote all beta to live" action. Flags cover: Community, CV & LinkedIn Lab, Side
Income, Opportunities, Salary Check, Universities, Subject Selection, Career Prep Hub, Word of
the Day, World Monitor, Global Markets.

### About & team editor

Edits the public About and Team pages: headline, standfirst, mission, team eyebrow/headline/
standfirst, join-us heading and text, contact email; and per person: name, title, focus, short
description, LinkedIn URL, and a photo upload (cap around 1.5 MB, stored as a data URL), with
add and delete. Changes broadcast to any open app tab so they appear live.

---

## 13. CROSS-CUTTING FEATURES

- **Global search** — `Ctrl/⌘ + K` command palette across every tool and page, with voice input
  via the browser speech API.
- **Profile menu** — avatar dropdown with photo upload.
- **All dropdowns close on outside click and on Escape.** Implement with a document-level
  `pointerdown` listener in the capture phase — an absolutely-positioned invisible overlay will
  be trapped inside any ancestor that has `backdrop-filter`.
- **Error boundary** that **resets on route change.** A boundary that latches forever means one
  crash on one page breaks every page afterwards until reload.
- **Charts:** line charts with axis value labels, theme-aware gridlines, and a fine "nice
  scale" ladder for the axis maximum — a coarse ladder makes small series look wrong.
- **Progress rings:** theme-aware track colour, and inner text padded away from the stroke
  (`padding = strokeWidth + 6`) with a font size that scales with the ring.
- **Tabular numerals** everywhere numbers align in columns.
- **Filter chips** need a real defined style, both resting and selected.
- **Persistence:** everything in local storage — profile, expenses, balances, XP, quests,
  streaks, badges, chat, flags, per-tool state, and a per-account store so multiple accounts on
  one browser keep separate data. Merge persisted profiles over the defaults
  (`{...DEFAULT_PROFILE, ...persisted}`) so a profile saved by an older build, missing newer
  keys such as `region`, can never render `undefined` into a lookup and crash. Guard every
  lookup into region/currency maps with a fallback.

---

## 14. VOICE AND COPY RULES

- Plain, spoken English. Explain, never lecture.
- Never condescending, regardless of the user's stated knowledge level.
- Every number comes with a "what this means for you".
- Say "educational, never advisory" and mean it.
- Avoid marketing filler: no *seamless*, *empower*, *unlock*, *elevate*, *journey*.
- Headline copy can be bold and declarative; body copy should be calm.
- British spellings (*optimise*, *personalised*, *behaviour*).

---

## 15. QUALITY BAR — THE MISTAKES TO NOT REPEAT

Each of these was a real defect. Treat this as a pre-launch checklist.

1. Text the same colour as its own background in dark mode (alpha token variants).
2. Primary buttons washed out because the gradient inverted in dark mode.
3. Everything in one serif, making 11px labels mushy and sub-copy look bold.
4. Page headings left-aligned on some pages, centred on others.
5. Four blocking tutorials, one per world, on a first session.
6. Popups stacking on top of each other on the same page load.
7. Every guide replaying the previous guides' introductions.
8. Confetti firing on plain page visits.
9. Count-up numbers restarting from zero on every re-render and visibly glitching.
10. Dropdowns that don't close on outside click.
11. An error boundary that latches and breaks every subsequent page.
12. "0% of members have this" on every achievement at launch.
13. The archetype saying "Subscription Leaker" while the headline leak says "eating out".
14. A university ranking page rendered red-on-black so it reads as a danger warning.
15. Onboarding gating pages that don't need financial figures.
16. A header CTA overflowing off-screen at common viewport widths.
17. Percentage text inside progress rings touching the ring stroke.
18. Achievements buried as a settings tab instead of a real page.
19. Duplicate icons across different features.
20. Any looping animation that ignores `prefers-reduced-motion`.

---

## 16. WHAT "DONE" LOOKS LIKE

- Every route renders with no console errors, signed in and signed out.
- Light and dark, Calm and Spark, and all five world colourways are each legible — no text
  lost against its own surface.
- All 7 languages switch cleanly, and both RTL languages mirror the layout.
- No horizontal overflow at 390, 768, 1024, 1280 and 1440px.
- A brand-new user can sign up, answer 7 questions, enter figures, and land on a populated
  dashboard with a score, leaks and a plan — without hitting a dead end.
- At most one popup on screen at any moment.
- The gamified layer is present but never patronising, and never fires celebrations for
  nothing.

---

*Build it as if a nineteen-year-old will open it, understand their money in ninety seconds,
and come back tomorrow for the streak.*
