# Attaché

A private daily briefing on geopolitics, world affairs, markets, technology and culture, written to help you hold informed conversations.

**Live page:** https://claude.ai/artifact/WQnKwJeBcEf5giipYJGZ5S

## What each edition contains

| Section | Purpose |
| --- | --- |
| **The one thing** | The story everyone will be talking about, plus a one-sentence version you can say aloud. |
| **If you read nothing else** | Five one-line essentials. |
| **Dispatches** | 7–10 stories ranked by importance, each with background and why it matters. A margin column gives a line to *say*, a question to *ask them*, the *names to know*, and what to *watch next*. Every story links its sources and carries a status (confirmed, developing, disputed or scheduled). |
| **The days ahead** | Scheduled events over the next fortnight. |
| **Figures worth remembering** | A few numbers worth knowing, each with its source. |
| **Lexicon** | Terms from the day's news, explained. |
| **At the table** | Conversation openers, and how to handle sensitive topics gracefully. |
| **Coda** | A lighter closing note, often local to the UAE. |

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
