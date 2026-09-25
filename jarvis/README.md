# Jarvis

A one-file dashboard and voice assistant for the Wharton Global High School Investment Competition.

## Use it

1. Keep `jarvis.html` and `data.js` in the same folder.
2. Double-click `jarvis.html` and open it in **Chrome**, because speech recognition works best there.
3. The `data.js` in this folder is **SAMPLE** data. Replace it with your real daily `data.js` from the briefing.

## AI brain (free, no key)

1. Install Ollama from ollama.com, then run `ollama pull llama3.1` once.
2. Run `ollama serve` (if the Ollama app is already running in your menu bar or tray, skip this).
3. If Jarvis still says Ollama is off, Ollama is blocking requests from a local file. Quit Ollama and start it with:
   - Mac or Linux: `OLLAMA_ORIGINS=* ollama serve`
   - Windows (Command Prompt): `set OLLAMA_ORIGINS=*` then `ollama serve`

Without Ollama these quick commands still work: brief me, urgent, deadlines, portfolio, buckets, drift, market, news, picks, any ticker, study.

Simulated competition research tool. Not financial advice.
