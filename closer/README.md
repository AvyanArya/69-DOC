# Closer — AI Cold Calling Training Platform

> **Become impossible to hang up on.**
> Train against AI versions of legendary salespeople, CEOs, difficult prospects, and
> real-world buyers. Get instant coaching after every call.

Closer is a premium, dark-themed training platform for cold calling, sales,
persuasion, and business communication — the "Duolingo of cold calling".
Built with React + Vite, no backend required: voice runs on the browser's
Web Speech API and all progress persists locally.

## Run it

```bash
cd closer
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build → dist/
```

**Voice support:** live speech input uses the Web Speech API (best in Chrome/Edge,
mic permission required). Where recognition is unavailable, the phone automatically
falls back to a type-to-speak bar (⌨️ keypad button toggles it any time). AI voices
use the browser's speech synthesis with per-character gender/accent/speed.

## What's inside

### 📞 AI Phone Simulator (the centerpiece)
A realistic smartphone: lock screen + unlock animation, home screen, contacts,
dial pad, recents, incoming & outgoing call UI, active call screen with timer,
mute/speaker controls, live captions, dynamic waveform, and an optional
**whisper coach** feeding live tips ("Mirror their last sentence", "They're
losing interest") during the call.

### 🎭 21 AI characters
Jordan Belfort, Grant Cardone, Steve Jobs, Elon Musk, Warren Buffett, Mark Cuban,
Barbara Corcoran, plus buyer archetypes (Angry Prospect, Cold CFO, Busy CEO,
Procurement Manager, …). Each has difficulty, personality, speaking speed,
interruptiveness, objection style, industry, and sales style — driving a
conversation engine with interest/patience state, phase progression
(opening → discovery → objection → closing), hangups, and closes.

### 🏁 21 challenge modes · 🧪 Scenario Lab
Selling a Pen, Cold Call, Discovery, Objection Handling, Closing, Negotiation,
Price Increase, Retention, Investor Pitch, Real Estate Listing, Luxury, B2B SaaS,
Door-to-door and more — plus a free-text scenario generator
("I need to sell accounting software to a dentist") that builds the prospect,
stakes, and objectives instantly.

### 🎧 Call Review
Overall 0–100 score plus 15 skill scores (confidence, tonality, pacing, energy,
empathy, listening, question quality, objection handling, closing, product
knowledge, rapport, control, persuasiveness, authority, professionalism),
talk-to-listen ratio, filler-word breakdown, repeated words, confidence trend,
great moments & mistake timeline with better alternative lines, full transcript
**replay with synced audio**, "What should I have said here?" coach
demonstrations, voice analysis, and JSON export.

### 🎓 Skill Academy — 29 modules
Articulation, Confidence, Storytelling, Negotiation, Persuasion, Mirroring,
Objection Handling, Closing, Discovery Questions, Tone Control, Executive
Presence, Sales Psychology, Behavioral Economics and more — each with lessons,
a drill, an AI practice call, and an interactive quiz with explanations.

### 📊 Progress & gamification
XP, levels, 7 ranks (Beginner → Legend), achievements, daily streaks, habit
tracker, weekly goals, skills radar, activity heatmap, score trends, weakness
tracker, improvement projections, leaderboards, weekly challenges, tournaments,
and practice rooms.

### 🧠 AI Coach & 🧰 Toolkit
A persistent mentor that reads your call history, surfaces recurring weaknesses,
assigns homework, and answers questions. The toolkit adds 10 extra simulators
(interview, salary negotiation, boardroom, media, crisis…), an AI script
generator, industry playbooks, cold email & LinkedIn practice, performance
certificates, and a custom character builder.

## Tech

- **React 18 + Vite + React Router** (hash routing → works on any static host)
- Hand-rolled SVG charts (radar, trend + crosshair tooltips, heatmap, bars) on a
  CVD-validated dark palette
- Web Speech API for STT/TTS with graceful fallbacks
- `localStorage` persistence with a seeded demo profile
- Zero runtime dependencies beyond React — deploys as a static site (`vercel.json` included)

> Demo build: authentication is simulated and community data is seeded.
> Settings → Account → Reset wipes local training data.
