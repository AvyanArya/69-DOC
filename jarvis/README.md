# Jarvis

A one-file dashboard and voice assistant for the Wharton Global High School Investment Competition.

## Use it

1. Keep `jarvis.html` and `data.js` in the same folder.
2. Double-click `jarvis.html` and open it in **Chrome**, because speech recognition works best there.
3. The `data.js` in this folder is **SAMPLE** data. Replace it with your real daily `data.js` from the briefing.

## Pages

- **Briefing**: urgent deadlines, key facts, portfolio, picks (with the full case, every data point and fit checks), market, study card and the competition timeline.
- **Workshop**: *Report review* checks a pasted IPS, Trading Notes Analysis or Final Report and, with Ollama, gives judge-style feedback without rewriting it. *Strategy lab* re-ranks today's picks for your strategy and builds a model allocation.
- **Rules & regulations**: competition rules researched from the official Wharton pages on 25 Sep 2026, with unverified items clearly marked. Your SurveyMonkey Apply packet overrides it.

`jarvis-preview.html` is the same app with the sample data built in, for a quick look.

## AI brain (free, no key)

1. Install Ollama from ollama.com, then run `ollama pull llama3.1` once.
2. Run `ollama serve` (if the Ollama app is already running in your menu bar or tray, skip this).
3. If Jarvis still says Ollama is off, Ollama is blocking requests from a local file. Quit Ollama and start it with:
   - Mac or Linux: `OLLAMA_ORIGINS=* ollama serve`
   - Windows (Command Prompt): `set OLLAMA_ORIGINS=*` then `ollama serve`

Without Ollama these quick commands still work: brief me, urgent, deadlines, portfolio, buckets, drift, market, news, picks, any ticker, study, rules.

Simulated competition research tool. Not financial advice.
