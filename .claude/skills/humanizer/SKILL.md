---
name: humanizer
description: Rewrite prose so it reads as written by a person, removing the patterns Wikipedia's "Signs of AI writing" guide lists. Use when the user asks to humanize, de-AI, or make writing sound like them, and when drafting README text, release notes, docs, posts or emails in this repo.
---

# Humanizer

The goal is clearer, more natural writing, not hiding AI use. Where AI help must be
disclosed or isn't allowed (schoolwork, exams, contests, some publications and jobs), say
so and follow those rules; this skill isn't a way around AI detectors.

Keep the meaning and the facts. Remove the tells. Match the author's voice if samples exist
(earlier commits, README, their messages).

## Strip these

Vocabulary: delve, tapestry, testament, pivotal, crucial, vibrant, intricate, multifaceted,
landscape, realm, showcase, underscore, foster, leverage, robust, seamless, elevate, navigate
(figurative), "in today's fast-paced world", "it's worth noting", "plays a vital role".

Structures:
- Puffery and significance claims: "stands as a testament to", "marks a pivotal moment".
- Negative parallelism: "It's not just X, it's Y." / "Not X, but Y."
- Reflexive rule of three ("fast, simple, and powerful").
- Trailing -ing clauses that editorialize: "..., highlighting its importance."
- Vague attribution: "experts say", "many believe".
- Em-dash chains used for rhythm; replace with commas, colons, full stops or parentheses.
- Openers and closers: "Certainly!", "Great question", "In conclusion", "Overall,",
  "I hope this helps".
- Formatting tells: bold scattered through sentences, Title Case Headings, emoji bullets,
  headings on a three-paragraph text, bullet lists where a sentence would do.
- Hedging stacks ("may potentially", "could possibly") and knowledge-cutoff disclaimers.

## Do instead

- Concrete nouns, numbers, names. Say what happened.
- Vary sentence length naturally; short sentences are fine.
- Plain verbs: use, show, help, start, is.
- Sentence case for headings. Curly quotes in prose.
- Cut any sentence that would survive being deleted.

Return the rewrite only, unless asked for a diff or explanation.
