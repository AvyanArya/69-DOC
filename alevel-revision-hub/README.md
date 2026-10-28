# A-Level Revision Hub

A revision website for **Pearson Edexcel A-level Physics (9PH0), Mathematics (9MA0), Further
Mathematics (9FM0) and Economics A (9EC0)**. It's organised subject → section → sub-topic, and every
sub-topic has hand-picked videos, notes, practice questions, flashcards and a spec checklist. It also
has an exam-aware planner built around the real Summer 2027 timetable, an **exam portal** that turns
past-paper PDFs into timed exams, a **Leitner flashcard terminal** and **Pomodoro / exam timers**.

## 👀 Just open `preview.html`

**[`preview.html`](preview.html)** is one self-contained file. **Double-click it and it opens in your
browser.** You don't need to install anything or run a server. Everything you do (ratings, notes,
plan, flashcards, scores) is saved in that browser automatically.

- Fonts load from Google Fonts when you're online. Offline, the page still works with system fonts.
- The exam portal loads its PDF reader (pdf.js, from cdnjs) the first time you upload a paper, so
  that part needs an internet connection.
- To move your progress to another computer, use **Settings → Export backup**, then **Import
  backup** on the other machine. Uploaded PDFs stay on the device you uploaded them on.

## How it's laid out

The sidebar (bottom tab bar on phones) has five areas: **Today**, **Learn**, **Plan**, **Practise** and
**Tools**. Every page uses the same tabs pattern, so you always know where things are.

| Level | Tabs |
|---|---|
| **Subject** (e.g. Physics) | Sections · Past papers & resources · Whole-course / exam-technique videos · Flashcards |
| **Section** (e.g. Topic 2: Mechanics, Pure Year 1, 3.4 Market Structures) | Sub-topics (rate each one red/amber/green) · Notes · Practice & papers · More |
| **Sub-topic** (e.g. Motion, vectors & SUVAT) | **Videos** (opens first) · Notes · Practice · Flashcards · Checklist (with a 10-minute blurt test) · My notes (notes, mistakes log and your own links) |

## What's inside

| Page | What it does |
|---|---|
| **Today** | A 3-step setup checklist, today's sessions with direct links to videos/notes/questions, "worth revising next", flashcards due, countdown to every paper, confidence per subject, weekly hours and streak. |
| **Planner** | *Calendar*: week view of sessions, export to `.ics` (Apple, Outlook) or `.csv` (Google Calendar). *Criteria*: six numbered panels covering strategy presets, when you can revise (weekly hours and holidays), session length, what matters most (weak topics, exam urgency, coverage, past-paper weeks), subject share of time, and rules (spaced repetition, mixing subjects, exam-eve review, skip untaught, next test only). *Exams & tests*: the official 2027 timetable with readiness per paper, plus your own mocks and class tests. |
| **Exam portal** | Upload a question paper PDF (and optionally its mark scheme). It reads the paper code, subject, time allowed and total marks from the cover, then splits the paper into questions using Edexcel's "(Total for Question N = M marks)" lines. Sit the full paper or a single question: big countdown, pace guide ("3 min ahead"), time per question, flag and "done" markers, pause (or strict exam conditions), extra time (10/25/50%), full screen, and warnings at 30/10/5 minutes. Then mark it question by question with the mark scheme page alongside. Lost marks can go straight into that topic's mistakes log, and every result goes into *Results* with a trend per subject. Economics "answer one of Q7 or Q8" sections are detected so totals stay right. |
| **Flashcard terminal** | Leitner system with 5 boxes (reviewed after 1, 2, 4, 8, 16 days; a miss goes back to box 1). Import from **Quizlet** (Export → copy text), **Gizmo**, **Anki** (plain-text export) or any CSV/TSV, with separator detection and a live preview, and keep a link back to the original set. Study modes: Leitner review, flip through, type the answer (typo-tolerant), multiple choice and a timed match game. Keyboard shortcuts, a Pomodoro button inside study sessions, and four starter decks (Physics definitions, Economics definitions, Maths and Further Maths results to know by heart). Decks can be linked to a subject or sub-topic and show up on those pages. |
| **Timers** | Pomodoro (focus / short / long breaks, cycles, auto-start, sound), exam timer (pick any of your papers, extra time, 30/10/5-minute warnings), countdown and stopwatch with laps. The timer keeps running in the top bar while you use the rest of the site, and can be started from any session. |
| **Resource library / How to revise / Settings** | Every site linked; a phase-by-phase plan for 2026–27, study techniques and subject strategies; your name, theme, Further Maths options and backups. |

Further Maths covers Core Pure 1 & 2 plus all eight options (FP1, FS1, FM1, D1, FP2, FS2, FM2, D2).
Pick your two options once (FS1 + FM1 are suggested, matching Mr Gale's coverage) and the plan, exams
and topic lists only use those.

### Videos and resources

- **Videos first**: about 820 direct videos across the sub-topics, so every tab opens on something
  to watch. Economics uses **EconplusDal** throughout (hand-matched to each spec section, plus his
  exam-technique series for every question type). Maths uses **Mr Gale**, Bicen Maths, 1st Class Maths,
  TLMaths and ExamSolutions. Physics uses **Physics Online** and **Physics With Mr Gill**. Each sub-topic also has
  search links into those channels for more.
- **Mr Gale's Resources** (mrgaleresources.com): chapter pages, notes, worksheets, exam-question
  packs and past-paper pages for Pure 1 & 2, Statistics & Mechanics 1 & 2, Core Pure, FM1 Statistics
  and FM1 Mechanics, attached to the matching sub-topics and sections.
- Per topic, where the site has it: **Physics & Maths Tutor**, **Mad Asmaths**, **Cognito**, **Save
  My Exams**, **Isaac Physics**, **tutor2u**, **Economics Help**, the official **Pearson** pages
  and more.

The Mr Gale pages, a sample of the downloads and a sample of the video IDs were all checked live
when this was built.

## How the planner works

For every day from today to your last exam it works out the minutes you have (normal week or
holiday), then fills them:

1. **Exam-eve review**: the day before a paper is a light review of that paper's topics.
2. **Timed past papers**: in the last *N* weeks before each exam (default 8), full papers are booked
   on days with enough time, more often as the exam gets closer.
3. **Topic sessions**: each topic is scored on weakness (not started > red > amber > green),
   urgency (days until the next paper it appears in), whether it's been covered yet, and whether
   it's due a spaced-repetition review (2, 5, 10, 21, 35 days). The score is then balanced against
   each subject's share of time. The top topic gets the session as *Learn & condense*,
   *Exam questions* or *Active recall*, depending on how far along it is.

Finished sessions are always kept when you rebuild. Rate topics, mark sessions done, and rebuild
every week or two so the plan follows how you're actually doing.

## Project structure

```
alevel-revision-hub/
├── index.html            # the site (loads the files below; works from a web server or file://)
├── preview.html          # generated: the whole site inlined into one file
├── build.mjs             # node build.mjs → regenerates preview.html
└── src/
    ├── styles.css
    ├── data/             # sites.js, physics.js, maths.js, further-maths.js, economics.js,
    │                     # exams.js (official 2027 timetable), guide.js,
    │                     # videos.js (direct videos + Mr Gale resources), decks.js (starter flashcards)
    └── app/              # util.js, model.js, planner.js, store.js, ui.js (shared components),
                          # views.js (core pages), timers.js, cards.js, portal.js, main.js (router)
```

No framework and no build dependencies. To change content, edit the files in `src/data/`, then run:

```bash
node build.mjs
```

That rebuilds `preview.html`. To host it, upload the folder to any static host (GitHub Pages,
Netlify, Vercel); `index.html` is the entry point.

> Exam dates come from the Pearson Edexcel GCE Summer 2027 final timetable. Always confirm the
> dates, times and rooms with your school's exams officer.
