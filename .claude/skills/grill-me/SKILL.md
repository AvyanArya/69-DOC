---
name: grill-me
description: Interview the user one question at a time before building anything, until the plan is concrete and consistent. Use when the user says "grill me", asks to be interviewed or challenged on a plan, or starts a new feature/project whose requirements are vague.
---

# Grill me

Do not write code or a plan yet. Interview first.

Rules:
- **One question per message.** Wait for the answer before asking the next.
- Each question targets the biggest remaining unknown or contradiction, not trivia.
- Offer a recommended answer with each question when one is sensible, so the user can just
  say "yes".
- Read the codebase to answer what it can answer; never ask the user something the code tells
  you.
- Push back when an answer conflicts with an earlier one or with the code. Say which.
- Cover, in roughly this order: the goal and who it's for; what "done" looks like;
  scope and explicit non-goals; inputs, outputs, data; edge cases and failure modes;
  constraints (performance, cost, deadlines, platforms); how it will be tested.

Stop when you could explain the plan to a stranger without hand-waving. Then write it back as
a short spec (goal, scope, non-goals, decisions, open risks) and ask for a go-ahead.
