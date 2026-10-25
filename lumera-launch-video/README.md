# Lumera — launch film

A 32.6-second launch video for Lumera, built as a frame-accurate motion-graphics
composition in HTML/Canvas, rendered at 1080p60, with an original synthesized score,
sound design and a narrated voiceover.

**Watch:** [`lumera-launch.mp4`](lumera-launch.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause, drag the timeline).

## The story

| Time | Beat |
| --- | --- |
| 0 – 5.5s | Pages fly at the camera: books, PDFs, statements, spreadsheets, receipts, stock tips. A counter races past 24,000 pages. Questions pile up, everything turns grey: *"There is too much to make sense of."* |
| 5.5 – 7s | Time freezes (tape-stop), then every page is sucked into a single point of light. |
| 7 – 12s | The point stretches into a search bar and types *"Simplify all of this information into one website."* The cursor clicks send. Riser, one beat of silence… |
| 12 – 15.3s | **Explosion.** The world floods white, confetti and shockwaves, the Lumera mark draws itself and the wordmark lands: *"Introducing Lumera."* |
| 15.3 – 28.3s | The word becomes the website: a dark capsule grows into a browser window on white. A cursor clicks through the real Lumera site: Worlds (hovering Leaf, Atlas, Shield, Forge), then *Open the app* wipes into the dashboard: health score, savings rate, safety net, score breakdown. |
| 28.3 – 32.6s | The logo lifts off the app into the end card: *LUMERA — All financial intelligence. One place.* The cursor clicks **Start your 30-day review**. |

Narration (deep, calm male voice, seven short lines): *Your money lives in a hundred
different places. · What if it all… came together? · Introducing Lumera. · All your
financial intelligence. In one place. · Four worlds. One financial life. · Know exactly
where you stand… and what to do next. · Lumera. Start your thirty-day review.*

## Files

```
index.html                 the whole composition; seek(t) draws any frame
render.js                  Playwright + ffmpeg renderer (parallel workers)
assets/                    fonts and artwork from the Lumera site, soundtrack.m4a
audio/build_soundtrack.py  score, SFX and mix (numpy/scipy synthesis, no samples)
audio/make_vo.py           voiceover via the Kokoro neural TTS model
audio/vo_lines.json        narration script and timings
audio/vo/                  rendered narration lines
audio/events.json          SFX timing exported from the page (typing, clicks, hovers…)
```

## Rebuilding

```bash
# 1. narration (optional, the rendered lines are committed)
pip install kokoro-onnx soundfile scipy numpy
#    model files: github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx, voices-v1.0.bin)
python audio/make_vo.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin

# 2. sound: export event timings from the page, then synthesize and mix
node render.js --events-only
python audio/build_soundtrack.py

# 3. picture: render every frame and mux the soundtrack
node render.js --workers 4            # -> lumera-launch.mp4
node render.js --from 12 --to 16      # render a slice while iterating
```

Requires Node with Playwright (Chromium) and ffmpeg.

## Credits

Typography: Instrument Serif and Manrope (SIL Open Font License), as self-hosted on the
Lumera site. Artwork (logo, wordmark, the four world mascots and Lumi) from the Lumera
site. Narration generated with Kokoro-82M (Apache 2.0). Music and sound effects are
synthesized from scratch in `audio/build_soundtrack.py`.
