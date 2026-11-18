---
name: code-film
description: Make short animated explainers or film-style clips entirely in code (three.js, canvas, SVG, CSS) in a chosen visual style, with no video model. Use when asked to animate a concept, make an explainer, a "what if" scene, a trailer, or a clip in a named style (pixel art, claymation, chalkboard, VHS, etc.).
---

# Code film

Every frame is written in code. Pick a style, write the beats, render deterministically.

## Process

1. **Brief**: subject, length (10–60 s), aspect (9:16 for shorts, 16:9 otherwise), style.
2. **Beats**: 4–8 shots, each one sentence of narration and one visual idea. Hook in the
   first 2 s.
3. **Engine**: three.js for 3D, canvas 2D for illustrative styles, SVG/CSS for type-led.
   Drive everything from a single `t` (seconds) so any frame is reproducible.
4. **Render**: play in the browser; for files, step `t` frame by frame, capture with
   Playwright screenshots or `canvas.captureStream()` + MediaRecorder, encode with ffmpeg.
5. **Narration** (optional): TTS (ElevenLabs is connected in this environment), then time the
   beats to the audio.

## Short-form reels from one line

Input: one line ("why IKEA makes you walk through the whole store") and a style.

1. **Script (30–60 s, ~130–150 words)**: a hook in the first 1–2 s that opens a question or
   states something surprising; one idea per beat; a payoff; a short close. Hook patterns
   that work: the counter-intuitive fact, "you've noticed X, here's why", the
   objection-answer list ("you might think…, but…").
2. **Voiceover**: TTS (ElevenLabs is connected here); get word timestamps so everything else
   syncs to the words.
3. **Scenes**: one scene per beat from a reusable scene library (title slam, diagram build,
   map zoom, number counter, before/after split, list reveal), restyled per film. Cut every
   2–4 s; something moves at all times.
4. **Kinetic captions**: 1–3 words on screen at a time, synced to the timestamps, the key
   word emphasised (colour or scale); keep them inside the safe area of a 9:16 frame.
5. **Self-review before showing the user**: render a contact sheet (a frame every second)
   and check: hook visible in frame 1; no still stretch over ~1.5 s; captions readable and
   inside safe areas; motion follows `ui-craft` easing (no linear slides, no bounce on
   everything). Fix the weakest three moments, then render.
6. **Render** 1080×1920, 30 fps, H.264 + AAC, with the voiceover mixed over quiet music the
   user owns or has licensed.

Keep a record of which hooks and pacing perform on the user's account, and reuse what works.
Results vary; don't promise views.

## Style recipes

| Style | How to get it |
| --- | --- |
| Pixel art | Render to a small canvas (e.g. 160×90), upscale with `image-rendering: pixelated`, limited palette |
| Low-poly / voxel | Flat-shaded geometry (`flatShading: true`), box instancing |
| Claymation | Rounded geometry, soft subsurface-ish lighting, slight per-frame jitter, 12 fps steps |
| Chalkboard | Dark green/charcoal bg, rough stroke texture, hand-drawn line reveal via `stroke-dashoffset` |
| Blueprint / hand-drawn | Blue bg, white thin lines, grid, wobble noise on paths |
| Neon glow | Black bg, emissive lines, bloom post-processing |
| Comic book | Toon shading (`MeshToonMaterial`), thick outlines, halftone shader, caption boxes |
| Halftone | Fragment shader mapping luminance to dot size |
| Paper cutout | Layered flat shapes with drop shadows, slight parallax, stepped motion |
| Watercolor / ink wash | Noise-displaced edges, paper texture overlay, low-alpha blending |
| Stained glass | Voronoi cells, dark leading lines, saturated jewel tones, backlight |
| Retro VHS | Chromatic aberration, scanlines, tracking noise, 4:3, timestamp overlay |
| PS2-era | Low-res textures, vertex snapping, fog, 480p render target |
| 1930s cartoon | Rubber-hose bounce, black and white, film grain, iris wipe |
| 80s anime | Cel shading, speed lines, sunset gradients, bold outlines |
| Silent film | Sepia/B&W, grain, vignette, flicker, intertitle cards |
| Kinetic type | Type-only; words scale, slide, and snap to the beat |
| Split-flap | Characters flip through glyphs to the target |
| Tilt-shift | Depth-of-field blur top and bottom, saturated, sped-up motion |
| Isometric | Orthographic camera at 35.264°/45° |
| Holographic / hologram | Fresnel rim, scanlines, cyan additive blending, flicker |
| Chrome / glass | Env-map reflections, `MeshPhysicalMaterial` transmission |
| Satellite briefing | Top-down map, HUD overlays, monospace labels, grid ticks |
| Bauhaus / Art Deco / neo-brutalism | Primary geometric shapes; gold geometric ornament; raw thick borders and flat loud colour |
| Realistic | PBR materials, HDRI lighting, shadows, motion blur |

Mix with care: one style per film, applied consistently to every shot.
