# A-Level Revision Hub

A revision website for **Pearson Edexcel A-level Physics (9PH0), Mathematics (9MA0), Further
Mathematics (9FM0) and Economics A (9EC0)**. It plans every revision session at a real time around
your school day and activities, sets **weekly deliverables** you have to hand in, marks your exam
answers with an **AI checker** (modelled on Medly), and tracks real focus time with an optional
**webcam focus tracker**. Each subject is laid out as a course of numbered lessons (in the style of
Cognito and Save My Exams), and every lesson takes you through the same steps in order.

## 👀 Just open `preview.html`

**[`preview.html`](preview.html)** is one self-contained file. Double-click it and it opens in your
browser, with nothing to install. Everything you do is saved in that browser automatically.

- The AI checker needs Claude. On claude.ai it uses your own Claude account. In `preview.html`,
  add an Anthropic API key in **Settings** (it stays in that browser only).
- The webcam focus tracker works in `preview.html` (Chrome, Edge, Firefox, Safari). claude.ai blocks
  cameras for pages, so it is switched off there.
- The first PDF upload and the first tracker start need internet to load their libraries.
- Move your progress between computers with **Settings → Export backup / Import backup**.

## How it's laid out

Five places in the menu along the top (a tab bar at the bottom on phones). The bar under the menu lists
the pages in that area.

| Area | Pages |
|---|---|
| **Home** | Pick up the lesson you're on, today's timeline (school, activities, timed sessions, free time), what's next, this week's deliverables, your courses, flashcards due, exam countdown. |
| **Learn** | Your courses: Physics, Maths, Further Maths, Economics. Each course is numbered sections of numbered lessons, plus How to revise and Resources. |
| **Practise** | Past papers, Check an answer (AI marking), Marked answers, Flashcards. |
| **Plan** | This week (time grid), Deliverables, Routine, Exams, Strategy. |
| **Focus** | Pomodoro, countdown, exam timer and stopwatch, plus the focus tracker. |

### A lesson, step by step

There are no tabs. Each lesson is one page you work down in order, with the course contents beside it:

1. **Watch**: the best video for the topic up front, more below it.
2. **Learn the key points**: the specification points to tick off, an exam tip, the notes to read, and your own notes.
3. **Test yourself**: a 10-minute blurt test and flashcards.
4. **Exam questions**: question packs with mark schemes, and Claude marking your answer.
5. **Finish**: rate your confidence, then *Complete lesson* takes you straight to the next one.

Ticks show which steps and lessons are done, and each course shows how far through you are.
Lessons use each subject's own numbering (Physics topics, the Maths textbook chapters, the Economics
specification numbers).

## What's new in this version

| Feature | What it does |
|---|---|
| **Course layout** | A new interface, styled like a course site. Subjects are courses, sections are numbered, and each lesson is one ordered page (watch, learn, test yourself, exam questions, finish) instead of separate tabs. Home picks up the lesson you're on. |
| **Routine** | For each day: school on/off and times, wake-up and bedtime, how many hours you want to revise and how many hours of free time to protect. Plus travel time, a break after school, getting-ready and wind-down time, earliest/latest revision, session length, breaks, longest stretch, regular commitments (sport, a job, clubs, meals) with days and times, one-off plans, and holidays with their own hours. It shows how your week splits (sleep, school, activities, revision, free time) and warns when your targets don't fit. |
| **Timed plan** | Every session gets a start time inside your free windows. It never clashes with school, activities or meals, never goes over your daily target and never eats your protected free time. The week view is a calendar grid; on phones it's a day-by-day timeline. Exports to `.ics` / `.csv` with times. |
| **Weekly deliverables** | Each week the planner sets 3–8 things to hand in by your deadline (default Sunday 20:00), taken from that week's plan: a timed paper or 20 marks of exam questions, one-page summaries, 3 answers marked in Check, a focus-hours target, flashcard reviews, a blurt test. Hand-ins need proof (a photo, your score, what you wrote) and can be checked by Claude, which sends weak work back. Automatic ones (focus, flashcards, Check) count themselves. You sign a weekly commitment; a copyable report can go to a parent or tutor. When the deadline passes you must close the week: missed work carries over, strict mode adds a catch-up task and keeps Home locked until you do. Your streak counts fully delivered weeks. |
| **AI answer checker** | Type or photograph the question, mark scheme and your answer (or pick a question from an uploaded past paper, cropped for you). Claude marks it the Edexcel way — M/A/B marks for Maths, units/s.f./ecf for Physics, KAA and evaluation levels for Economics — mark by mark, quoting your own words. Then: how to get full marks (with example rewrites), what you did well, an exam tip, a hidden full-mark answer, and a follow-up chat. Improve and resubmit to see your mark go up, or get a similar practice question with a hidden mark scheme. Weak answers go into that topic's mistakes log. |
| **Focus tracker** | Turn on your webcam on the Focus page. Face detection (MediaPipe, run on your device; nothing is recorded or uploaded) checks you're at your desk. Leave for 20 seconds (adjustable) and the timer pauses and stops counting; sit back down and it resumes. Looking sideways at a phone can count as not focused. Focused minutes feed your weekly focus deliverable. |

Earlier features are all still here: the past-paper exam portal (PDF split into questions, timed
exam, marking against the mark scheme), the Leitner flashcard terminal with Quizlet/Gizmo/Anki
import, the strategy presets, and the official Summer 2027 timetable.

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
    └── app/              # util.js, model.js, routine.js (time slots), planner.js, store.js, ai.js (Claude),
                          # ui.js, deliverables.js, views.js, home.js, study.js (courses & lessons), plan.js, focus.js,
                          # cards.js, portal.js, checker.js, settings.js, main.js (router)
```

No framework and no build dependencies. To change content, edit the files in `src/data/`, then run:

```bash
node build.mjs
```

That rebuilds `preview.html`. To host it, upload the folder to any static host (GitHub Pages,
Netlify, Vercel); `index.html` is the entry point.

> Exam dates come from the Pearson Edexcel GCE Summer 2027 final timetable. Always confirm the
> dates, times and rooms with your school's exams officer.
