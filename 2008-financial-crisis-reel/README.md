# The 2008 Financial Crisis — documentary Reel

A 9:16 documentary short (1080 × 1920, 30 fps, 84 s) on the 2008 global financial crisis:
the fall of Lehman Brothers, subprime mortgages, securitisation, contagion and the bailouts.

* **Finished film:** [`2008_financial_crisis_reel.mp4`](2008_financial_crisis_reel.mp4)
* **Sources and licences:** [`CREDITS.md`](CREDITS.md) (includes the credit block to paste into the caption)

The whole film is code and data: change a line, re-run a script, get a new master.

## How it is put together

```
narration script ─▶ generate_vo.py ─▶ public/audio/vo/*.wav + src/data/vo.json (word timings)
                                             │
                                  build_timeline.py ─▶ src/data/timeline.json   ◀── single source of truth
                                             │                │
                     build_audio.py (score, effects, mix)     └─▶ Remotion scenes (src/scenes/*.tsx)
                                             │                              │
                              public/audio/mix.wav                out/reel_picture.mp4
                                             └──────── render.sh (grain, encode, mux) ───────┘
                                                              │
                                              2008_financial_crisis_reel.mp4
```

The cut is **driven by the narration**. `timeline.json` holds every scene boundary and every
sync point ("cue") as a time in seconds, derived from the spoken words. The picture and the
soundtrack both read that file, so a stamp lands on its thud and "BANKRUPTCY" lands on its word
even after the voice-over is replaced.

## Folder map

| Path | What is in it |
|---|---|
| `src/scenes/S1Hook.tsx … S7Final.tsx` | The seven scenes. Each is a pure function of time. |
| `src/components/` | Reusable pieces: depth parallax, dotted globe, captions, paper props, overlays. |
| `src/papers/` | The front pages (`specs.ts` holds the text, `FrontPage.tsx` the layout). |
| `src/lib/` | `anim.ts` easing/shake helpers · `time.tsx` time hook + real motion blur · `timeline.ts` cue lookup. |
| `src/data/` | `timeline.json`, `vo.json`, `market.json` (chart data), `photos.json`, `landDots.json`. |
| `public/img`, `public/papers`, `public/textures`, `public/video`, `public/fonts` | Render-ready assets. |
| `public/audio` | Narration WAVs and the final mix. |
| `assets_src/raw` | The archival downloads exactly as fetched. `assets_src/manifest.json` records author, licence and source of each. |
| `assets_src/data` | Raw Case-Shiller, S&P 500 and labour-market data. |
| `assets_src/audio_stems` | Narration / music / effects stems (FLAC) for re-mixing in a DAW. |
| `scripts/` | The pipeline (below). |

## Rebuilding

Requirements: Node 20+, Python 3.10+, FFmpeg, FluidSynth with the FluidR3 GM SoundFont
(`apt install fluidsynth fluid-soundfont-gm`), and
`pip install numpy scipy pillow soundfile pyloudnorm mido kokoro-onnx faster-whisper onnxruntime opencv-python-headless`.

```bash
npm install
```

```bash
npm run render
```

That renders the picture, adds film grain, muxes the soundtrack and writes
`2008_financial_crisis_reel.mp4` (about 25 minutes on 4 cores; most of that is the
motion-blurred opening).

Each stage can be run on its own:

| Command | Does |
|---|---|
| `python3 scripts/fetch_assets.py` | Downloads the archival photos listed in the manifest (paced, resumable). |
| `python3 scripts/make_textures.py` | Generates the paper textures. |
| `python3 scripts/prepare_assets.py` | Grades the photos, estimates depth maps, cuts layers, makes halftones. Needs `depth_anything_v2_small.onnx` in `.cache/`. |
| `bash scripts/bake_papers.sh` | Renders the front pages to textures in `public/papers`. |
| `python3 scripts/generate_vo.py` | Synthesises the narration (needs the Kokoro model files in `.cache/kokoro/`) and extracts word timings. |
| `python3 scripts/build_timeline.py` | Rebuilds `timeline.json` from the narration. |
| `python3 scripts/build_audio.py` | Composes the score, places the effects, mixes and masters. |
| `python3 scripts/qc_audio.py` | Measures the mix and checks the narration is intelligible in it. |
| `bash scripts/render.sh [--audio] [--finish]` | Renders and finishes the film. |
| `python3 scripts/qc_video.py 2008_financial_crisis_reel.mp4` | Inspects the finished file and writes contact sheets to `out/qc`. |
| `npm run studio` | Opens Remotion Studio to scrub through the edit with sound. |

Model files are not stored in the repository:
[Kokoro v1.0 ONNX + voices](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0) →
`.cache/kokoro/`, and
[Depth Anything V2 Small (ONNX)](https://huggingface.co/onnx-community/depth-anything-v2-small) →
`.cache/depth_anything_v2_small.onnx`.

## Common edits

**Use your own voice-over.** Record the seven scenes, save them over `public/audio/vo/s1_hook.wav`
… `s7_final.wav` (48 kHz mono), then:

```bash
python3 scripts/generate_vo.py --timings-only
```

```bash
bash scripts/render.sh --audio
```

Every cut, caption, stamp and impact moves to the new timing.

**Change the wording.** Edit `scripts/vo_script.json` (narration) and the `CAPTIONS` table in
`scripts/build_timeline.py` (subtitles), regenerate the voice, then render with `--audio`.

**Turn the subtitles off.** In `src/Reel.tsx`, change `<Captions />` to `<Captions show={false} />`.

**Change a headline or a front page.** Edit `src/papers/specs.ts`, then `bash scripts/bake_papers.sh`.

**Retime or restyle a scene.** Each scene reads its sync points with `cue("s5.bankruptcy")`.
Cues are defined in `scripts/build_timeline.py`; the look lives in the scene file.

**Re-mix.** Bus levels and ducking depths are a handful of numbers near the end of
`scripts/build_audio.py`. The stems in `assets_src/audio_stems` open in any DAW.

## Technique notes

**How the photographs move.** The archival pictures are stills. `prepare_assets.py` estimates a
depth map for each one; `<ParallaxPhoto>` feeds it to an SVG displacement filter so near objects
shift further than far ones as the virtual camera trucks or pushes in. Where there is a clear
foreground (the statue on Wall Street) the picture is split into two planes that move
independently. Nothing in the image is invented: the pixels are only shifted.

**Motion blur.** Animation is a function of time in seconds (`useT()`), so `<MotionBlur>` can
render the scene at several instants inside the shutter interval and average them. The opening
and the dive through the newspaper use 6 to 10 samples per frame.

**The zoom-through.** One exponential camera move across four layers: the newspaper pile, a
macro paper-fibre texture, a coarse halftone print of the Wall Street photograph (multiplied
into the paper so it appears printed on the sheet), and the photograph itself.

**Sound.** Every effect is synthesised (`scripts/audio_lib.py`). The score is written as note
lists in `build_audio.py` and performed by FluidSynth. Music and effects duck under the voice;
the master is −14 LUFS with true peak under −1 dBTP.

## Honesty about the imagery

See `CREDITS.md` for the full account. In short: the dated Wall Street and Lehman pictures, the
bank-run, foreclosure and job-fair photographs, the White House photograph, the congressional
footage and the Wikinews pages are genuine and credited on screen. The dramatic broadsheet front
pages are stylised recreations marked "ILLUSTRATIVE EDITION". A few general photographs
(suburbs, an empty office) are real but not from 2008 and are labelled "PHOTO", not "ARCHIVE".
