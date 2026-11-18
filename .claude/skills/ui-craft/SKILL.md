---
name: ui-craft
description: Concrete CSS, typography, color, motion and mobile rules to apply to every UI built or edited in this repo. Use whenever writing or changing HTML/CSS/TS that renders interface (client/src/ui, client/src/styles), building a component, picking colors, or when asked to make something look or feel polished, designed, native or less generic.
---

# UI craft

Apply these by default. They are small, mechanical, and each fixes a defect people notice
without being able to name it. Do not stop when a component *works*: iterate until it looks
designed, then until it feels alive, then until it feels polished.

## Principles (Apple-style clean and minimal)

- **Clarity**: every element has one purpose; text is legible at every size; icons are
  precise and unambiguous.
- **Deference**: the UI frames the content, not the other way round. Chrome is quiet,
  translucent or neutral; the content carries the colour.
- **Depth**: layers, motion and translucency show where things come from and how they
  relate (sheets slide over, back goes back).
- **Hierarchy**: one primary action per screen; size, weight and position tell you what
  matters before you read.
- **Consistency**: same control, same look and behaviour everywhere; follow platform
  conventions people already know.
- **Direct manipulation and feedback**: things respond the instant they're touched (see
  Motion).
- **Generous whitespace** and alignment to a grid; fewer, larger elements beat many small
  ones.
- **System fonts** (`font-family: system-ui, -apple-system, …`) unless the brand needs
  otherwise; a small type scale (4–6 sizes).
- **Comfortable targets** (≥ 44 px), and every control reachable by keyboard with a
  visible focus ring.
- **Accessibility is part of the design**: contrast ≥ 4.5:1 for text, Dynamic-Type-like
  scaling (`rem`), labels on every control, reduced-motion support.

## Typography

- **Tabs and toggles that go bold when selected**: reserve the bold width so selection never
  shifts the row. Make the tab `display: inline-grid`, and stack a hidden bold copy in the
  same cell:
  `.tab::after { content: attr(data-text); font-weight: 700; visibility: hidden; grid-area: 1 / 1 }`
  with the label also in `grid-area: 1 / 1`.
- **Labels and buttons**: `text-box-trim: trim-both; text-box-edge: cap alphabetic;` so the
  text is optically centred (fonts reserve descender space below the baseline).
- **Links**: `text-underline-offset: 0.2em` so underlines clear g, j, p, q, y.
- **Superscripts**: `sup { line-height: 0; position: relative; vertical-align: baseline; top: -0.5em }`
  so they don't push lines apart.
- **Headlines**: `font-size: clamp(2rem, 1rem + 5vw, 4rem)` (tune the numbers) instead of
  jumping sizes at breakpoints.
- **Acronyms and labels in caps**: `font-variant-caps: all-small-caps` reads quieter than
  `text-transform: uppercase`; when uppercase stays, add `letter-spacing: 0.04em–0.08em`.
- **Quotes and apostrophes in UI copy**: curly (“ ” ‘ ’), never straight.
- **Numbers that update** (counters, telemetry, clocks, tables):
  `font-variant-numeric: tabular-nums` so digits are equal width and nothing jitters.
- **File names**: truncate in the middle so the extension stays visible. In a flex row:
  `.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0 }`
  and `.ext { flex-shrink: 0 }`.
- **Narrow columns**: `hyphens: auto` (requires `lang="en"` on `<html>`) to avoid rivers of
  space.
- **Card titles**: cap at two lines so cards stay equal height:
  `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden`.

- **Line length**: 45–75 characters for body text (`max-width: 65ch`).
- **Widows and orphans** (a lone last word on a line, or a lone line stranded at the top of
  a column/page): `text-wrap: pretty` on paragraphs, `text-wrap: balance` on headings;
  `orphans: 2; widows: 2` for print and columns.
- **Kerning and tracking**: keep `font-kerning: normal`; tighten large headlines slightly
  (`letter-spacing: -0.01em` to `-0.02em`), loosen small caps and uppercase labels.
- **x-height**: fonts with different x-heights look different sizes at the same
  `font-size`; when mixing fonts or falling back, match with `font-size-adjust`.
- **Optical centre**: geometric centre looks low; nudge icons in circles and play triangles,
  and text in pills, by a pixel or two (play icons right, text up) until it *looks* centred.

## Shape, borders, depth

- **Nested rounded corners**: inner radius = outer radius − padding (never equal radii).
- **Borders**: alpha colours, e.g. `rgb(0 0 0 / 0.12)` or `rgb(255 255 255 / 0.12)`, not
  solid hex, so they blend with whatever is behind them.
- **Icons**: match the icon's stroke width to the weight of the adjacent text.
- **Tinted neutrals**: give greys a hint of the brand hue (OKLCH chroma ~0.005–0.02 at the
  brand's hue) so they look chosen, not default.
- **Dark mode**: show depth with progressively lighter surfaces; shadows barely read on dark.
- **Product shots on white**: `mix-blend-mode: multiply` makes the white disappear on a
  light, tinted surface.

## Color

- **Build palettes in OKLCH**, not HSL: equal L looks equally light; HSL lies.
- **Gradients**: interpolate in OKLCH, `linear-gradient(90deg in oklch, blue, orange)`, so
  the middle doesn't go grey and muddy.
- **One accent, used sparingly** (Von Restorff effect): one colour that marks the one thing
  the eye should land on. Everything else is neutral.
- **Give the accent a job, don't just add it.** Start from two base colours, then place the
  accent only on what should be seen first: the primary button, the hero subject, the
  key word or headline. If it's decoration, remove it. Examples: sky blue + cloud white →
  scarlet red on the hero's shoes and the CTA; midnight ink + azure blue → vermilion orange
  on the CTA and artwork highlights; mandarin orange + forest green → crest yellow on the
  headline and "Shop now".
- **Pick the accent from across the colour wheel**:
  - Warm page (sand, cream, terracotta, bone) → cool accent (cobalt, teal, indigo).
  - Cool page (glacier blue, navy, slate) → warm accent (lemon, orange, vermilion, gold).
  - Muted or washed-out palette → one saturated complementary pop (e.g. orchid on cream/ink).
  The complement of the dominant hue is the default accent.
- **Starting palettes by industry** (base colours, then the one accent; hex values are
  starting points, tune them in OKLCH and check contrast):

  | Industry | Base | Accent |
  | --- | --- | --- |
  | Tech | midnight navy `#0B1B3A`, ice blue `#D6E8F5`, electric blue `#2F6BFF` | chartreuse `#C6F432` |
  | Café / food | toffee brown `#7A4A2A`, oat milk `#EFE6D8`, strawberry pink `#F2A1B0` | olive `#6B7A3A` |
  | Law / finance | deep teal `#0F4C4C`, slate blue `#4A5A78`, stone `#D8D3C8` | burnt orange `#C4581E` |
  | Skincare / beauty | terracotta `#C66B4E`, nude `#E8CDB9`, cream `#FAF4EA` | gold `#C9A24A` |

  If the product already has brand colours, use those instead.

## Backgrounds and textures

A texture gives a page character that flat colour and purple gradients can't. Rules: one
texture per page, behind content, low contrast where text sits on it (check 4.5:1), as a
small tiling image or CSS/SVG/shader (not a heavy video), static or very slow, and still
under `prefers-reduced-motion`.

| Texture | How to make it |
| --- | --- |
| Grainy gradient | Gradient `in oklch` + SVG `feTurbulence` noise overlay at 5–15% opacity, `mix-blend-mode: overlay` |
| Stippled gradient / halftone | Dots whose size or density follows the gradient: `radial-gradient` dot pattern masked by a linear gradient, or a shader |
| Square-dot grid / blueprint grid | `background-image: radial-gradient(...)` dots or `linear-gradient` lines at 16–32 px; blueprint = white lines on deep blue |
| Contour lines | SVG of topographic lines (marching squares over noise), thin strokes in a tinted neutral |
| Paper / felt / speckled graphite | A small seamless noise or fibre texture image, multiply-blended; speckles = sparse dark noise |
| Fluted / reeded glass | Vertical repeating `linear-gradient` strips over a blurred image, or a refraction shader |
| Thermal gradient | Multi-stop heat palette (deep blue → magenta → orange → yellow) on blurred blobs |
| Water ripples / lens distortion | WebGL displacement shader on the image (or SVG `feDisplacementMap`); keep it subtle |
| Single-hue landscape / clouds and sky | One hue at several lightness steps, layered silhouettes or a soft photo, duotoned |
| Blurred photo | Real photo, `filter: blur(40px) saturate(1.2)`, scaled up to hide edges |
| Iridescent shapes | Conic gradient `in oklch` with hue shift + soft blur, or a thin-film shader |
| Impressionist painting / textured image | A painterly image (public domain or licensed) with a grain overlay |
| Pixel mosaic / ASCII | Downsample an image to a grid; render as squares or as characters by brightness (`.:-=+*#%@`) in a monospace font |
| Grass / natural texture | Photographic texture, desaturated or tinted to the palette |

## Motion and interaction

From building a polished picker/dial; the principles generalize:

- **Fitts's law**: make targets big. A drag control can use its whole width as the target.
- **Visual hierarchy**: the value being chosen is the largest thing on screen.
- **Object constancy**: values slide or morph instead of swapping, so the eye can follow.
- **Animate only the delta**: if one digit changes, only that digit moves.
- **Snapping**: continuous input settles on a valid value.
- **Inertia**: a flick carries momentum and decelerates to a stop.
- **Natural mapping**: direction of gesture matches direction of change (up = more).
- **Motion blur** on fast transitions; blur the outgoing icon in icon swaps
  (`filter: blur(4px)` while it fades).
- **Feedback**: hover/focus glow signals interactivity before touch; pair visual with subtle
  sound or haptics where appropriate.
- **Skeuomorphic affordance** when it removes the need for instructions (a dial looks and
  moves like a dial).
- **Carousels / horizontal scrollers**: fade the edges with
  `mask: linear-gradient(90deg, transparent, black 15% 85%, transparent)`.

### Timing and easing

- **Entrances**: ease-out (`cubic-bezier(0.16, 1, 0.3, 1)` or similar). **Movement of
  something already on screen**: ease-in-out.
- **Dropdowns, menus, popovers**: 150–250 ms. **Exits ~20% shorter** than the entrance.
- **No spring bounce** for everyday UI transitions; save overshoot for playful moments.
- **Direct manipulation is never tweened**: while a finger or pointer holds an element, it
  tracks the pointer 1:1. Animate only after release.
- **Crossfade states**: bring the new state in while the old one leaves, never a blank gap.

### Origin and shape

- **Popovers start at `scale(0.95)`**, not 0, combined with a fade.
- **Grow from the trigger, shrink back to the trigger**: set `transform-origin` to the
  trigger's side (Radix exposes `--radix-popover-content-transform-origin`). Don't fade into
  the centre of the screen.
- **Objects travel in arcs**, not straight lines, when moving across the screen.
- **Reveals and colour changes use a mask** (`clip-path` or `mask-image` animation) rather
  than fading opacity.
- **Shared elements**: give the same element the same identity across views
  (`view-transition-name`, or Motion's `layoutId`) so it morphs from one place to the other.

### Micro-interactions

- **Buttons press to `scale(0.97)`** on `:active`.
- **Toggle knobs stretch ~12%** along the direction of travel while moving, then settle.
- **Stagger list rows by ~30 ms**; stagger the details of a card as it settles rather than
  popping them in together.
- **Confirm success with a single pulse** (brief scale or ring), not a lingering effect.
- **Icon swaps**: crossfade with scale (0.8 ↔ 1) and blur.
- **Drag past a boundary rubber-bands**: resistance grows with distance, then springs back.

### Implementation details

- **Entrances start at `scale: 0.97; opacity: 0`**, never `scale(0)`.
- **Press**: `button:active { scale: 0.97 }` with `transition: scale 150ms ease-out`.
- **Wrong password / invalid input**: turn it red *and* shake it:
  `@keyframes shake { 0%,100% { translate: 0 } 17% { translate: -10px } 33% { translate: 10px } 50% { translate: -6px } 67% { translate: 6px } 83% { translate: -3px } }`
  over 360 ms.
- **Steppers and wizards**: slide the next step in from the direction of travel (forward
  from the right, back from the left), not a crossfade.
- **Accordions**: `:root { interpolate-size: allow-keywords }` so `height: auto` animates
  (fallback: animate `grid-template-rows: 0fr → 1fr`).
- **Animate `transform`/`translate`/`scale`/`opacity` only**, never `top`/`left`/`width`,
  which repaint every frame.
- **Theme switches**: add `.theme-switching * { transition: none !important }` to the root
  for one frame while swapping themes, so every colour transition doesn't fire at once.
- **Tooltips**: delay only the first (~400–600 ms); while one is open or just closed,
  show the next instantly.
- **Release after a flick or drag**: hand off to a spring that keeps the release velocity,
  e.g. Motion's `animate(y, 0, { type: "spring", duration: 0.5, bounce: 0, velocity })`,
  not a fixed-duration transition.
- **Past the end of a carousel or scroll**: resistance that grows with distance
  (e.g. `offset * 0.35` easing toward a max), then spring back on release.

- Always honour `@media (prefers-reduced-motion: reduce)`.

## States and behaviour

- **No layout shift**: reserve space for images (`width`/`height` or `aspect-ratio`),
  ads, embeds, fonts (`font-display` with metric-matched fallbacks) and late content.
- **Skeleton screens** while loading: grey shapes matching the real layout, so content
  slots in without jumping. A spinner only for short, unknown waits on small areas.
- **Empty states**: every list, table and dashboard designs its "nothing here yet" view: what
  goes here, why it's empty, and one action to fill it.
- **Optimistic updates**: show the result of likes, toggles, renames and reorders immediately,
  sync in the background, and roll back with a clear message if it fails.
- **Interruptible animations**: a new input mid-animation retargets from the current
  position and velocity; never make the user wait for an animation to finish.
- **Progressive disclosure**: show the essentials; tuck advanced options behind "More",
  an expander or a second step.
- **Affordance**: things that can be clicked, dragged or typed into look like it (cursor,
  hover, borders, handles); things that can't, don't.
- **Comboboxes and custom selects**: follow the WAI-ARIA combobox pattern (keyboard arrows,
  Enter, Esc, `aria-expanded`, `aria-activedescendant`), or use a native `<select>` /
  `<datalist>`.

## Mobile feel (make a site feel native on a phone)

- `100dvh` (or `svh`/`lvh`), never `100vh`: Safari's toolbar breaks `vh`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  and pad edges with `env(safe-area-inset-*)`.
- Touch targets ≥ 44×44 px; nothing important hidden behind `:hover`. Wrap hover styles in
  `@media (hover: hover)`.
- Form inputs `font-size: 16px` or larger so iOS doesn't zoom on focus.
- `touch-action: manipulation` on controls (kills double-tap delay);
  `-webkit-tap-highlight-color: transparent` plus a real `:active` state.
- `overscroll-behavior: contain` on scroll panes and sheets so the page doesn't rubber-band
  behind them.
- Prefer bottom sheets and thumb-reachable controls over top-corner buttons.
- `user-select: none` on controls (not on content).

## Before handing a UI back

1. Resize from 320 px to wide desktop; nothing overflows horizontally.
2. Toggle dark/light; borders and depth still read.
3. Click every tab/toggle; no layout shift.
4. Run the `unslop` checklist for generic AI tells.
