# Lumera — launch film

A 32.6-second launch video for Lumera, built as a frame-accurate motion-graphics
composition in HTML/Canvas, rendered at 1080p60, with an original score played on
recorded instruments, sound design and a narrated voiceover.

**Watch:** [`lumera-launch.mp4`](lumera-launch.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause, drag the timeline).

## The story

| Time | Beat |
| --- | --- |
| 0 – 5.5s | Pages fly at the camera: books, PDFs, statements, spreadsheets, receipts, stock tips. A counter races past 24,000 pages. Questions pile up, everything turns grey: *"There is too much to make sense of."* |
| 5.5 – 7s | Time freezes and the music stops dead, then every page is sucked into a single point of light. |
| 7 – 12s | The point stretches into a search bar and types *"Simplify all of this information into one website."* The cursor clicks send. The camera pushes in, everything implodes, two frames of black and silence… |
| 12 – 15.3s | **Explosion.** White flash, full-frame shake, a colour bloom, shockwave rings, rays, sparks and the pages returning as confetti. The Lumera mark draws itself and the word slams in: *"Introducing Lumera."* |
| 15.3 – 28.3s | The word becomes the website: a capsule full of the site's own swirling background film grows into a browser window on white. A cursor clicks through the real Lumera site: Worlds (hovering Leaf, Atlas, Shield, Forge), then *Open the app* wipes into the dashboard: health score, savings rate, safety net, score breakdown. |
| 28.3 – 32.6s | The logo lifts off the app into the end card: *LUMERA — All financial intelligence. One place.* The cursor clicks **Start your 30-day review**. |

Narration (warm, calm male voice, seven short lines): *Your money lives in a hundred
different places. · What if it all came together? · Introducing Lumera. · All your
financial intelligence, in one place. · Four worlds. One financial life. · Know exactly
where you stand, and what to do next. · Lumera. Start your thirty-day review.*

## Files

```
index.html                 the whole composition; seek(t) draws any frame
render.js                  Playwright + ffmpeg renderer (parallel workers)
assets/                    fonts, artwork and hero background frames from the Lumera site, soundtrack.m4a
audio/fetch_samples.py     downloads the recorded instrument and UI samples (not committed)
audio/build_soundtrack.py  score, sound design and mix
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

# 2. sound: fetch the samples once, export event timings from the page, then mix
python audio/fetch_samples.py
node render.js --events-only
python audio/build_soundtrack.py

# 3. picture: render every frame and mux the soundtrack
node render.js --workers 4            # -> lumera-launch.mp4
node render.js --from 12 --to 16      # render a slice while iterating
```

Requires Node with Playwright (Chromium) and ffmpeg.

## Credits

Typography: Instrument Serif and Manrope (SIL Open Font License), as self-hosted on the
Lumera site. Artwork (logo, wordmark, the four world mascots, Lumi and the hero background
film) from the Lumera site. Narration generated with Kokoro-82M (Apache 2.0).

Instrument samples: Salamander Grand Piano by Alexander Holm (CC-BY 3.0); harp, violin,
cello and electric bass from nbrosowsky/tonejs-instruments (CC-BY 3.0). Interface sounds:
Kenney "Interface Sounds" (CC0). Drums, risers and whooshes are synthesized in
`audio/build_soundtrack.py`.
