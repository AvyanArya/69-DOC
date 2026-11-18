---
name: unslop
description: Review an existing page or UI for the tells that make it look AI-generated (purple gradients, glowing buttons, emoji icons, generic copy, inconsistent spacing) and fix them in the product's own established style. Use when asked to make a site look less like AI, less generic, more designed, or to do a design review/pass of an existing UI.
---

# Unslop: a designer's review of an existing UI

Goal: keep the site, lose the slop. Work on what exists; do not restyle it into a different
aesthetic. Like one review from a designer.

## 1. Learn the product's style first

Before changing anything, read the existing styles and screens and write down (briefly):
- the real brand/accent colour(s) and neutrals in use,
- type families, the scale actually used, weights,
- spacing unit (4/8 px?), radii, border treatment, icon set,
- the tone of the copy.
Every fix must use these. If they are inconsistent, pick the dominant one and converge.

## 2. Find the tells

Go through the page and list each instance, with file and line:

Visual
- Purple/indigo-to-pink gradients, gradient text, "aurora" blobs with no product reason.
- Glowing buttons, neon drop shadows, glassmorphism stacked everywhere.
- Emoji used as icons or bullet markers (🚀 ✨ ⚡).
- Everything centred; three identical feature cards with an icon, a title and two lines.
- Random radii and spacing values (13px, 18px, 22px) instead of a scale.
- Multiple competing accent colours; accent used on everything so nothing stands out.
- Default hero: huge gradient headline + "Get started" + "Learn more" pair.
- Stock-y dashboard tiles with fake trend arrows.
- ✨ Sparkle icon on every button ("AI, everywhere"): if everything sparkles, nothing
  stands out.
- Fake terminal window in the hero (`$ npx … ✓ Ready in 0.3s`) for a product its users will
  never install from a terminal.

Copy
- "Unlock", "supercharge", "seamless", "elevate", "revolutionize", "harness the power of".
- "Not just X, it's Y"; rule-of-three lists for rhythm; vague benefits with no specifics.
- Title Case Everywhere; exclamation marks; straight quotes.
- Em dashes everywhere: one is fine; three in a paragraph reads like a chatbot wrote it.
- Made-up stats with no source ("10x faster", "99.9% uptime", "120+ integrations").
- Fake-deep taglines ("It's not a to-do list. It's a second brain.").

## 3. Fix in the product's style

- Replace gradients with the product's flat surface colours; keep at most one deliberate
  gradient (interpolated `in oklch`).
- Replace emoji with icons from the existing icon set, stroke matched to text weight.
- Collapse to one accent (see `ui-craft` → Color) used only where the eye should land.
- Snap spacing and radii to the scale; nested radius = outer − padding.
- Rewrite copy to be specific: what it does, for whom, with a real number or noun.
- Introduce hierarchy: one primary action per view; left-align body text.
- Feature cards: give the most important feature more room (a wide card with a real
  screenshot) instead of three equal icon-title-two-lines cards.
- Headings and buttons: let the words do the work. Name the action ("Summarize notes",
  "Draft follow-up email"), not the technology ("AI magic"); drop emoji and sparkles.
- Taglines: say what the product does for people ("Plan your week in 5 minutes").
- Stats: replace invented numbers with a real, attributed proof point (a named customer
  quote, a case study link) or remove them.
- Hero: show the real product people will use (an actual screen or short clip), not a
  terminal.
- Punctuation: short sentences, one idea each; at most one em dash per section.
- Apply the `ui-craft` rules while touching each component.

### Dashboards specifically

- **Align the grid**: cards share column edges, gutters and heights; equal spacing
  everywhere.
- **Lead with the numbers**: the metrics people open the dashboard for are the largest
  things on screen; labels and chrome recede.
- **Replace the greeting** ("Welcome back, Alex 👋") with the context that matters: the
  reporting period ("October 2026"), and the data's freshness.
- **Every trend says what it's compared to**: "+12% vs September", not "↑ 12%". Show
  whether up is good (green) or bad for that metric.
- **Colour encodes meaning, not decoration**: use it to tell categories apart (plans,
  regions, segments), consistently across every chart and table. Glow and gradients go.
- **Icons, not emoji**, from one icon set; then follow the `dataviz` skill for the charts.

## 4. Report

List: tells found → what replaced each. Note anything left alone on purpose and why.
