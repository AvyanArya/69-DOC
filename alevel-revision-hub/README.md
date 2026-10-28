# A-Level Revision Hub

A revision website for **Pearson Edexcel A-level Physics (9PH0), Mathematics (9MA0), Further
Mathematics (9FM0) and Economics A (9EC0)**. You revise subject by subject and topic by topic,
each topic has links to free resources, and an exam-aware planner schedules your revision
around the real Summer 2027 timetable.

## 👀 Just open `preview.html`

**[`preview.html`](preview.html)** is one self-contained file. **Double-click it and it opens in your
browser.** You don't need to install anything or run a server. Everything you do (ratings, notes,
plan, scores) is saved in that browser automatically.

- Fonts load from Google Fonts when you're online. Offline, the page still works and uses system fonts.
- To move your progress to another computer, use **Preferences → Export backup**, then
  **Import backup** on the other machine.

## What's inside

| Page | What it does |
|---|---|
| **Today** | Today's sessions with links to the right notes, videos and questions; mark done and re-rate; countdown to every paper; confidence per subject; weekly hours and streak; "worth revising next" suggestions. |
| **Planner** | Week-by-week calendar of sessions. Criteria panel: strategy presets, weekly hours, holidays and study leave, session length, sliders for weak topics / exam urgency / coverage, subject share of time, spaced repetition, mixing subjects, timed past papers before each exam, exam-eve reviews, "next test only". Export to `.ics` (Apple, Outlook) or `.csv` (Google Calendar). |
| **Exams & tests** | Official dates from the Pearson Edexcel GCE Summer 2027 **final** timetable, readiness bar per paper, switch papers off, and add your own mocks and class tests (pick which topics they cover). |
| **Subjects** | Every spec topic grouped into sub-subjects (e.g. Pure Year 1, Topic 7: Electric & Magnetic Fields, 3.4 Market Structures). Tap red / amber / green per topic, filter by rating or paper, and flag topics "not taught yet". |
| **Topic pages** | Confidence rating, "mark revised today", a spec checklist, exam tips, a notes and mistakes log that saves as you type, and grouped resources: notes and cheat sheets, video tutorials, exam questions, flashcards, past papers. |
| **Paper log** | Log timed past papers. Shows your average and trend per subject. |
| **Resource library** | Every site the hub links to, and the subject-wide resources (past papers, specs, formula booklets, full courses). |
| **How to revise** | A phase-by-phase plan for 2026–27, techniques that work (active recall, spacing, interleaving, past papers, mistakes log), subject-specific strategies, and how the planner decides. |
| **Focus timer** | 25 / 45 / 60 / 90-minute timer linked to a session; chimes when done. |

Further Maths covers Core Pure 1 & 2 plus all eight options (FP1, FS1, FM1, D1, FP2, FS2, FM2, D2).
Pick your two options once and the plan, exams and topic lists only use those.

### Resources linked

Per topic, where the site has it: **Physics & Maths Tutor** (detailed notes, cheat sheets,
definitions, flashcards, questions by topic, core practicals, past papers), **Mad Asmaths** (topic
booklets and IYGB practice papers), **1st Class Maths** (direct video tutorials for Year 1 stats &
mechanics, plus channel search), **TLMaths**, **ExamSolutions**, **Bicen Maths**, **Cognito**,
**Save My Exams**, **Physics Online**, **Isaac Physics**, **EconplusDal**, **tutor2u**, **Two Teachers**,
**Economics Help**, ONS and the Bank of England, and the official **Pearson** specification pages.
Every fixed link was checked and returned HTTP 200 when this was built. Video links open that
channel's YouTube search for the topic, so they always find the channel's latest uploads.

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
    │                     # exams.js (official 2027 timetable), guide.js
    └── app/              # util.js, model.js, planner.js, store.js, views.js, main.js
```

No framework and no dependencies. To change content, edit the files in `src/data/`, then run:

```bash
node build.mjs
```

That rebuilds `preview.html`. To host it, upload the folder to any static host (GitHub Pages,
Netlify, Vercel); `index.html` is the entry point.

> Exam dates come from the Pearson Edexcel GCE Summer 2027 final timetable. Always confirm the
> dates, times and rooms with your school's exams officer.
