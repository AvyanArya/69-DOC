---
name: marketing
description: Small-business marketing built on one shared product context - SEO audit, homepage rewrite for conversions, email and ad plans, pricing, and a "marketing council" where expert viewpoints debate a question. Use when the user asks about marketing, SEO, landing or homepage copy, conversion, ads, launch plans, pricing, positioning, or wants marketing advice on a decision.
---

# Marketing

Claude drafts and recommends; nothing goes live without the user's approval.

## 0. Product context first (every task reads it)

If `marketing/product.md` doesn't exist, create it by asking (one question at a time, see
`grill-me`) and reading the user's site:
- what it is, price, how it's bought;
- the customer: who, their problem in their words, what they use today;
- the pitch in one sentence, and 3 proof points (numbers, testimonials, features);
- competitors and how this differs;
- brand voice (3 adjectives, words to avoid); goal for the next 90 days.
Keep it under one page. Every other task, and `sales-pipeline`, `idea-test` and
`redesign-pitch`, start from it. Update it when facts change.

## Tasks

**SEO audit** — why the site isn't ranking. Check: indexability (robots, sitemap, canonical,
noindex), titles and meta descriptions per page, one H1, page speed and Core Web Vitals,
mobile, internal links, thin or duplicate pages, structured data, and whether any page targets
what customers actually search (query + intent). Output: top 10 fixes ranked by impact ÷
effort, with the exact change.

**Homepage / landing rewrite (conversion)** — above the fold: who it's for, the outcome, one
primary call to action, proof. Then: the problem, how it works in 3 steps, objections
answered, social proof, pricing or next step, repeated CTA. Use the customer's words from the
product context. Apply `humanizer`; for layout apply `ui-craft`. Deliver copy plus what to
measure (one primary conversion).

**Email** — for cold outreach use `sales-pipeline`. For a list: welcome sequence (3–5
emails), launch, and win-back; one idea and one CTA per email, subject lines to A/B test.

**Ads** — channel choice from where the customer already is; 3 angles × 2 creatives; a
small test budget with a kill rule set in advance (e.g. pause anything above 2× target cost
per acquisition after N clicks); weekly keep/kill review.

**Pricing** — anchor on the customer's alternative and its cost, not on our costs. Suggest
2–3 tiers or a single price with a reason, and test it (`idea-test`, then a real pre-order
page).

## Marketing council

For a decision ("should we lower the price?", "TikTok or Google ads?"), run a short debate
among 4–5 distinct viewpoints, e.g. a direct-response copywriter, a brand strategist, a
performance-ads buyer, an SEO lead, and a skeptical CFO. Each gives a position in ≤ 3
sentences grounded in the product context; then one round of rebuttals; then a synthesis:
the recommendation, where they disagreed, and the cheapest test that would settle it. These
are perspectives, not real experts; say so.
