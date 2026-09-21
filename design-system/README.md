# Lumera design system

The surfaces Lumera is built from, pulled out of the app so they can be worked on
on their own — in Claude Design, or just opened in a browser.

## What is here

```
styles/lumera.css          the landing stylesheet, extracted verbatim from landing.html
styles/app.css             the app surfaces the previews need, restated unscoped
components/*.html          one self-contained preview per group
```

Each preview opens on its own with no build step and no network: double-click it,
or serve the folder.

| Preview | Covers |
| --- | --- |
| `foundations.html` | surface and ink, the four section accents, the brand sweep, the type scale |
| `buttons.html` | primary buttons on the site and in the app, quiet controls, pills, neon tags, focus |
| `neon-surfaces.html` | the neon-morphism plate at each accent, trust rows, section heads |
| `feature-deck.html` | the flickable feature deck, with its real behaviour |
| `flow-steps.html` | the three-step plan with the travelling pulse |
| `pricing.html` | the lit price against two dim outlines |
| `worlds.html` | the four world slabs and the family chips |
| `app-surfaces.html` | top bar, sidebar, stat tiles |

## Two rules worth keeping

**Neon morphism, not frosted glass.** A near-black plate (`#0c0918`), a crisp lit
edge in the section's accent, an outer bloom and a faint inner rim. The lit top
edge is brightest in the middle — that is the signature. Every section sets
`--neon` to its own colour and everything inside inherits it.

**The brand sweep is for text, not for fills.** `--nova-grad`
(`#6366f1 → #a855f7 → #fcd34d`) ends on a pale gold. Clipped to text it reads
well. Filling a pill or a 3px rail, that end shows up as a white-looking fragment
stuck to the control, so filled surfaces use `--nova-fill`
(`#6366f1 → #a855f7`) with white text.

## Where the real code lives

`landing.html` is the source of truth for the site. It is fed through
`build-site.py` → the sub-pages → `build-onefile.py` → `lumera.html` →
`sync-public.sh` → `public/`. The app is `Lumera.html`; the admin portal is
`admin-portal.html`.

`styles/lumera.css` is a copy, regenerated from `landing.html`. Do not hand-edit
it — changes belong in `landing.html`, or come back in through a sync.

## Taking this to Claude Design

This folder is shaped for `/design-sync`, which pushes a local component library
into a claude.ai/design design-system project one component at a time. Each
preview carries a `@dsCard` marker on its first line, which is what the Design
System pane builds its card index from.

The sync needs a design-system authorization that a Claude Code **web** session
cannot obtain. To push:

1. Clone this branch and open it in Claude Code on your own machine.
2. Run `/design-login` once.
3. Run `/design-sync` and point it at this folder.

Coming the other way — work done in Claude Design — use its **Send to Claude Code
Web** button, which seeds the project into a workspace here.
