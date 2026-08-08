# Eikon Luxury Salon — website

A colourful, static marketing site for Eikon Luxury Salon (Sector 23, Gurugram).
No build tooling, no dependencies — three files and a browser.

The design is jewel-toned and colour-coded: an animated plum/rose/teal mesh in the
hero, a gradient ticker and marquee, three gradient "signature" cards, and nine
service cards that each carry their own accent colour through the top bar, icon
tile, number and tag pills.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The page — all copy, structure and schema.org markup |
| `styles.css` | Full stylesheet — palette lives in the `:root` block at the top |
| `script.js` | Sticky nav, mobile menu, service filters, scroll reveal, booking form |
| `preview.html` | **Self-contained single file** — CSS and JS inlined, just double-click it |
| `build-preview.py` | Regenerates `preview.html` from the three source files |
| `assets/` | Drop real salon photography here (see below) |

## Viewing it

Open `preview.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

After editing `index.html`, `styles.css` or `script.js`, refresh the preview:

```bash
python3 build-preview.py
```

## Adding real photography

Every image slot currently renders as a warm gradient placeholder marked with a
`data-slot` attribute — the design works without photos, and improves with them.
To swap in real pictures, add one rule per slot:

```css
[data-slot="interior"] { background-image: url("assets/interior.jpg"); background-size: cover; background-position: center; }
[data-slot="g1"]       { background-image: url("assets/balayage.jpg");  background-size: cover; background-position: center; }
```

Slots in use: `interior`, `colour`, `spa` (story collage), `prince`, `mahesh`,
`ruby`, `shaan` (team), and `g1`–`g6` (gallery). Team portraits are square,
gallery tiles 4:5. A photo replaces that element's gradient, so the layout
holds either way.

## Booking form

The site is static, so the form has no server. On submit it validates the input
and opens WhatsApp with the request pre-filled against the salon's number
(`919650117701`, set as `PHONE` at the top of the booking block in `script.js`).
To post to a real backend or a form service instead, replace the `window.open`
call in `script.js` with a `fetch` to your endpoint.

## Business details baked into the page

- **Address** — Gate No 4, 3330, Market Rd, near Ansal Plaza, Sector 23, Gurugram, Haryana 122017
- **Phone** — 096501 17701
- **Hours** — 10:00 am – 8:00 pm, all seven days
- **Rating** — 4.9 across 754 Google reviews (also emitted as JSON-LD for search results)

Update these in `index.html` (visible copy, the `<script type="application/ld+json">`
block, and the footer) and in the `PHONE` constant in `script.js`.

## Colour system

All colours are CSS custom properties in `:root` — `--rose`, `--coral`,
`--marigold`, `--teal`, `--lime`, `--sky`, `--violet`, `--indigo`, `--magenta`
over `--plum` ink and the `--cream` / `--blush` / `--lav` / `--mint` surfaces.
Change a value there and it propagates everywhere: chips, cards, tags, icon
tiles, quote borders and the visit list all read their accent from a `--c`
(and sometimes `--c2`) set inline in `index.html`.

## Notes

- Fonts load from Google Fonts (Fraunces + Outfit) with Georgia/system
  fallbacks, so the page degrades gracefully offline.
- Responsive from 360 px up; no horizontal scroll at any width.
- Respects `prefers-reduced-motion`; includes a print stylesheet.
- Testimonial quotes are condensed from the salon's public Google reviews.
