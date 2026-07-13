# Vera 🧠

**Make science addictive.** Vera is a gamified learning platform where students read
scientific studies and student-written summaries, take quizzes, build daily streaks, grow a
**Knowledge Tower**, and eventually earn the right to publish their own moderated research.

Think _Duolingo × TikTok × Medium × GitHub_, built for students into science, medicine and research.

## ✨ Features

- **Daily learning loop** — read a study, take a quiz, earn XP + coins, keep your streak alive.
- **Streaks that don't punish** — one free freeze every week, automatic freeze on the first miss,
  earned freezes from achievements. Streaks only reset once freezes run out.
- **Knowledge Tower** — every completed study adds a floor. The tower evolves through milestones
  (Tiny Tower → Stone Tower → Castle → Scientific Institute → City of Knowledge) and is
  ranked on a leaderboard.
- **Discover feed** — TikTok-style vertical, full-screen swipeable study cards with like /
  bookmark / quiz / share.
- **Powerful search** — filter by type, topic, difficulty, and sort by trending / newest / most read.
- **Beautiful reading experience** — top progress bar, live reading %, large typography, tappable
  glossary terms with popup definitions, Key Takeaways, Important Facts and Summary cards,
  references, comments and related studies.
- **Quizzes** — multiple choice, true/false, matching, ordering and scenario questions. Passing
  rewards XP, coins and a tower floor; failing recommends a simpler / similar article instead of
  punishing you.
- **Gamification** — XP, levels & level titles, coins, 13 badges, daily/weekly/monthly goals, and
  five leaderboards (weekly XP, monthly XP, longest streak, tower height, articles read).
- **Write & moderation** — writing unlocks after a configurable number of completed articles or
  active days. Rich Markdown editor with live preview, tags, references, and auto-save. Submissions
  flow through a moderation pipeline (pending → under review → needs changes → approved → published /
  rejected).
- **Admin panel** — moderation queue, user management (ban/unban), analytics, featured studies and
  category management.
- **Profiles** — avatar, bio, streak, XP, level, tower, achievements, published articles, quiz
  accuracy, bookmarks (with folders), following.
- **Accessibility** — keyboard focus states, ARIA roles, screen-reader labels, and a high-contrast mode.

## 🌱 Seed content

- **102+ scientific studies** and **52+ student articles** across biology, chemistry, medicine,
  neuroscience, psychology, genetics, epidemiology, pharmacology, public health and physics.
- A generated quiz for **every** article, a glossary of scientific terms, demo users,
  leaderboards, badges and knowledge towers.

## 🧱 Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Framer Motion** for animations
- Client-side state persisted to `localStorage` (no backend required to run the demo)

> The demo is fully client-side so it runs anywhere with zero setup. The data layer
> (`src/lib/data`, `src/lib/content.ts`) is structured to map cleanly onto a PostgreSQL + Prisma
> schema, and auth is stubbed for Clerk / Auth.js. Deployable to Vercel as-is.

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## 🗂 Project structure

```
src/
  app/                 # routes: home, discover, learn, learn/[id], write,
                       #         profile, tower, leaderboard, notifications,
                       #         bookmarks, admin, topic/[category], user/[id]
  components/          # AppShell, AuthScreen, ArticleReader, Quiz, KnowledgeTower, ui …
  lib/
    data/              # seeds, categories, users, badges, glossary
    content.ts         # builds full articles + quizzes + comments from seeds
    store.tsx          # global state, streaks, XP, badges (React context + reducer)
    gamification.ts    # XP/levels, tower stages, streak & date helpers
    types.ts           # shared domain types
```

_Built as a polished, production-quality demo of what daily science learning could feel like._
