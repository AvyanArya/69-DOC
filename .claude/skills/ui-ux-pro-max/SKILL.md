# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications containing 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 technology stacks.

## When to Apply

Use this skill for tasks involving **UI structure, visual design decisions, interaction patterns, or user experience quality control**. Skip it for pure backend logic, API design, infrastructure work, or non-visual scripts.

## Rule Categories by Priority (1-10)

The guide organizes recommendations from **CRITICAL** (Accessibility, Touch & Interaction, Performance) through **LOW** (Charts & Data):

**CRITICAL priorities** include ensuring "Minimum 4.5:1 contrast ratio for normal text" and maintaining "minimum 44×44pt touch targets with 8px+ spacing."

**HIGH priorities** cover style consistency, responsive layout with "mobile-first breakpoints," and navigation patterns using "bottom navigation ≤5 items."

**MEDIUM priorities** address typography, animation timing ("150–300ms for micro-interactions"), and form feedback with "visible labels" and "error placement below fields."

## Key Sections

- **Accessibility**: Color contrast, focus states, alt text, keyboard navigation, screen reader support
- **Touch & Interaction**: Target sizing, spacing, loading states, gesture feedback
- **Performance**: Image optimization, lazy loading, layout shift prevention (CLS < 0.1)
- **Style Selection**: Matching product type, icon consistency, state clarity
- **Layout & Responsive**: Viewport configuration, mobile-first design, breakpoint systems
- **Typography & Color**: Line height (1.5-1.75), semantic color tokens, dark mode parity
- **Animation**: Duration/easing standards, reduced-motion support, interruptible interactions
- **Forms & Feedback**: Input labels, error messages, validation timing, recovery paths
- **Navigation Patterns**: Bottom nav limits, back behavior consistency, deep linking support
- **Charts & Data**: Type selection, accessible colors, tooltips, responsive adaptation

## How to Use

Follow a four-step workflow:

1. **Analyze requirements** — Extract product type, audience, style keywords, and tech stack
2. **Generate design system** — Use `--design-system` flag for comprehensive recommendations with reasoning
3. **Supplement with detailed searches** — Use `--domain` searches for specific areas needing depth
4. **Apply stack guidelines** — Get implementation-specific best practices for your technology

## Common Professional Standards

Avoid emoji as structural icons; use vector-based alternatives. Maintain consistent icon families and stroke widths. Ensure pressed states don't shift layouts. All text must meet contrast requirements in both light and dark modes. Touch targets require minimum 44×44pt areas.

## Pre-Delivery Checklist

Verify no emoji icons, consistent icon families, official brand assets, non-layout-shifting interaction feedback, semantic token usage, proper touch target sizing, 150-300ms micro-interaction timing, clear disabled states, matching screen reader focus order, safe area respect, 4/8dp spacing rhythm, and tested light/dark mode contrast before delivery.
