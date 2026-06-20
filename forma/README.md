# FORMA

**The first personal style OS.** Discover your Style DNA, build a digital closet, generate outfits, and score your wardrobe — a premium, identity-first fashion experience.

> Where identity becomes wardrobe.

## Run it

No build step, no dependencies. Open the file in any modern browser:

```bash
open forma/index.html        # macOS
xdg-open forma/index.html    # Linux
# or just double-click index.html
```

Everything runs client-side. State (your Style DNA, closet, saved looks, outfits) persists in `localStorage`, so it survives refreshes on the same browser.

## What's implemented

| Feature | Status |
|---|---|
| **Homepage** (logged-out, editorial hero) | ✅ |
| **Style DNA Quiz** — 10 visual questions, tiles + sliders, auto-advance, page-turn transitions | ✅ |
| **Style DNA Result** — animated breakdown bars, count-up %, colour story, shareable card | ✅ |
| **Style Explorer** — masonry feed, aesthetic filter pills, infinite scroll, save looks | ✅ |
| **Digital Closet** — real photo upload (compressed client-side), auto-tag UI, sample wardrobe seed | ✅ |
| **Outfit Engine** — occasion-aware generation from closet + DNA, save / regenerate / share | ✅ |
| **Style Lab** — colour harmony / versatility / consistency / efficiency scores + gentle insights | ✅ |
| **Profile** — Style DNA page, wardrobe stats, retake / reset | ✅ |

## Design system

Built straight from the FORMA brand spec — dark-mode-first, editorial typography (Fraunces + Inter), reduction-as-luxury.

- **Palette:** Void `#0A0A0A`, Chalk `#F5F4F0`, Bone `#E8E3D9`, with Gold / Sage / Clay accents used sparingly.
- **Motion:** page drift, count-ups, blur-to-sharp image loads, ring animations — all respecting `prefers-reduced-motion`.
- **Imagery:** real Unsplash editorial photos load progressively over on-brand gradient fallbacks, so nothing ever appears broken or empty (works fully offline).

## Architecture notes

Single self-contained `index.html`:
- Hash-based router (`#/`, `#/quiz`, `#/explore`, `#/closet`, `#/outfits`, `#/lab`, `#/profile`)
- `localStorage`-backed state module
- Rule-based **Style DNA engine** — weighted answer → aesthetic matrix across 8 archetypes, normalised to percentages
- Rule-based **outfit + lab engines** (the deliberate MVP choice: APIs/models come later, once there's data worth training on)

This is the working prototype for the strategy defined in the founding doc — the piece that proves the experience before any backend exists.
