# Attaché

A private daily briefing on geopolitics, world affairs, markets, technology and culture, written to help you hold informed conversations.

**Live page:** https://claude.ai/artifact/WQnKwJeBcEf5giipYJGZ5S

## What each edition contains

Each edition is a two-minute read, written for a phone on the way out in the morning.

| Section | Purpose |
| --- | --- |
| **The one thing** | The day's main story in two sentences, plus one line you can say aloud. |
| **The essentials** | Five stories, ranked by importance. Each has a headline, a one- or two-sentence brief, and a line to *say*. Tap **More** for background, a question to ask, names, what to watch, and sources. |
| **This week** | Three or four dates to know. |
| **Before you go** | One number, one word of the day, one conversation opener, and one topic to handle with care. |
| **And finally** | A lighter closing line, often local to the UAE. |

**Brief me aloud** reads the front page to you in a British English voice, highlighting each story as it goes.

**Ask Attaché** is a concierge that answers questions about the current edition, for example "prepare me for dinner with a banker" or "go deeper on Hormuz". It runs on the viewer's own Claude account.

## How it runs

- `index.html` is the page. Inside claude.ai it reads editions from the artifact's database (collection `briefs`, one document per date) and uses Claude for the concierge.
- A scheduled Claude Code task runs every day at **06:40 Asia/Dubai**. It researches the news, writes the edition and files it to the database. Its instructions are in [`EDITOR.md`](./EDITOR.md).
- `briefs/` holds a copy of each edition as JSON. Edition No. 1 (2 November 2026) is checked in.

## Running it outside claude.ai

The page also works as a static site. Without the claude.ai runtime it loads `briefs/index.json` and the dated JSON files beside it, and the concierge is hidden.

```bash
cd attache && python3 -m http.server 8000
```

Then open http://localhost:8000. To add an edition, save it as `briefs/YYYY-MM-DD.json` following the schema in `EDITOR.md` and add its date to the front of `briefs/index.json`.
