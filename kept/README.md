# KEPT — *Attention, kept.*

A premium digital-detox, deep-focus and study companion for students aged 13–22.
Complete product design: brand, information architecture, 32 high-fidelity screens, a
reusable design system, and a **fully interactive prototype** — one HTML file, no build,
no dependencies.

**Open `app.html` in a browser.** The top bar switches between **Prototype** and
**Design System**; the ☰ button opens an index of all 32 designed screens.

---

## The idea

> "I want to study, but my phone keeps stealing my attention."

KEPT answers that without shaming anyone. Nothing in the product ever says *you wasted
five hours*. It says **you kept 2h 02m**. When a session collapses it says *"That didn't
go as planned. Want ten minutes instead?"* When the day's goal is met it says
**"You're done. Go live."** — the app's stated ambition is to become unnecessary.

### The name

Two meanings, one word.

- **Kept time** — the minutes you protected. It's the app's only headline metric.
- **A keep** — the stronghold you build with them. It's the app's progression world.

The metric and the world share a name, so earning one visibly builds the other.

---

## What's actually interactive

Not a click-through of static frames. State is real and everything writes back into it:

| Do this | And this happens |
|---|---|
| Start a session and let it finish | Today's total, the week bars, subject + topic progress, the recent list, two milestone bars and the Keep's tiers/lit windows all move |
| Try to leave mid-session (or switch browser tabs) | The distraction intervention appears — *"Wait. Is this what you want to be doing?"* |
| Answer *"What are you checking?"* | The reason is logged and fed back to you |
| End a session early | The non-shaming failure state, not a "session failed" |
| Add a subject / add an exam / tick a task / finish a topic | Persisted; the planner, countdowns and pace advice recalculate |
| Delete every subject | The real empty state — reachable, not mocked up |
| Start a detox | Full-screen ambient countdown; home shows a live banner |
| Switch theme, or simulate time of day in Settings | Home rewrites its greeting, message and primary action |

Sessions run at **×60** so a 45-minute block finishes in 45 seconds. The `DEMO ×60`
pill inside Focus Mode switches to ×300 or real time.

---

## The 32 screens

**Onboarding** Splash · Welcome · Onboarding questions · Goal selection
**Core focus loop** Home · Quick Focus · Timer selection · Active timer · Pause ·
Distraction intervention · Completed session · Break
**Detox** Detox setup · Active detox
**Study planning** Planner · Subject · Topic · Exam countdown
**Progress** Daily progress & attention score · Insights · Weekly report · The Keep · Rewards
**Evening** Wind-down · Daily reflection
**Social & account** Focus Together · Settings · Profile · Notifications
**States** Empty · Error · Success

Navigation is five destinations — Home, Plan, **Focus** (raised, centre), Insights, Keep —
with Profile behind the avatar.

---

## Design system

**Colour — ink and lichen.** Deliberately not the cream/serif/terracotta or
purple-gradient defaults. Semantic use is fixed: lichen = focus and forward motion,
brass = duration and reward, dusk = night and disconnection, clay = a logged distraction.
Clay is *data*, never a warning — nothing in KEPT turns red.

| | Light | Dark |
|---|---|---|
| Ground | `#F1F0EA` | `#101311` |
| Text | `#191C1A` | `#ECEFE9` |
| Lichen (accent) | `#5E8B6C` | `#8FBF9C` |
| Brass (streak, reward) | `#B0812F` | `#DDA85C` |
| Dusk (night, detox) | `#5E77A2` | `#93A9D1` |
| Clay (distraction data) | `#B0644C` | `#D68A72` |

Both themes are token-defined and respect an explicit `data-theme` choice, the OS
preference, and the un-stamped default.

**Type — three roles.** Familjen Grotesk (display; the 88px timer, tabular numerals) ·
Onest (UI and body) · IBM Plex Mono (micro-labels and data readouts — "instrument",
never "code").

**Motion.** Screen change 420ms · entering Focus Mode 700ms with a 1.06→1 scale ·
sheets 460ms, springless · timer ring 1000ms *linear* (easing a clock reads as a lie) ·
completion an 800ms spring, 46 particles, then stillness. Everything collapses under
`prefers-reduced-motion`, and the ambient canvases render a single still frame.

**Focus Mode is not a screen.** It's a separate near-black environment that ignores the
app's theme entirely — entering focus should feel like walking into a different room.

---

## Gamification, deliberately restrained

The Keep is drawn procedurally: every 5 hours kept adds a tier, every session lights two
windows, the streak is the lantern's flame and the stones on the path. A 60-minute
session builds six times what a 10-minute one does — and the 10 still counts.

What is **not** here: no daily chests, no random rewards, no infinite scroll, no social
feed, no leaderboard, no plant that dies when you open Instagram. Missing a day dims the
lantern; it doesn't extinguish it, and ten minutes relights it.

Focus Together shows a count of people working and nothing else. You can't message
anyone from inside a session — that's the feature.

---

## Accessibility & privacy

Body text clears 4.5:1 in both themes and the timer clears 7:1; every target is at least
44×44; keyboard focus is visible; colour is never the only signal (distraction bars carry
a border, "Never left" is a word, the streak shows a number beside the flame).

The privacy story is in the UI, not buried: app blocking is enforced on-device and KEPT
never receives a list of what you opened; the only distraction data that exists is what
you tapped yourself; sync is off by default.

---

## Files

- `app.html` — the whole thing. Prototype, design system, brand, sample data.
- Sample student: Alex, Year 12 — Mathematics, Economics, Physics; 3h daily goal,
  2h 02m kept today, 12-day run, attention score 82, 41h 20m lifetime, Keep at level 8.
