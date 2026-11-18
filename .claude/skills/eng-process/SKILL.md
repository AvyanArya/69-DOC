---
name: eng-process
description: A real engineering process for building features with AI - interview, short spec, plan in thin vertical slices, test-first implementation, review, and refactor. Use when starting a feature, app or significant change (not a one-line fix), when the user asks for a plan, a PRD, or wants code built "properly", or when work keeps going in circles.
---

# Engineering process

Small steps that each end in working, tested code. Skip steps only for trivial changes.

## 1. Understand (grill)

Run `grill-me` until the goal, users, scope, non-goals and edge cases are clear. Read the
codebase for anything it can answer.

## 2. Spec (one page, `docs/specs/<feature>.md`)

Problem · users and the job they're doing · what "done" looks like (acceptance criteria as a
checklist a test could verify) · out of scope · decisions made · open questions. Agree on
the words: one name per concept, used the same in the spec, code and UI.

## 3. Plan in vertical slices

Break the spec into slices that each cut through every layer (data → server → UI) and leave
the app working and demoable: "a user can see one flight's altitude", then "…and its
speed", not "build all the database tables first". Order by risk: the slice most likely
to change the design goes first. Each slice is small enough to finish and review in one
sitting. List them as a checklist (or as GitHub issues if the user wants).
Slices that don't touch the same files can be built in parallel, each by a subagent in its
own git worktree (`isolation: "worktree"`), then reviewed and merged one at a time.

## 4. Build each slice test-first

- Red: write a failing test for the next acceptance criterion, run it, see it fail for the
  right reason.
- Green: the simplest code that passes (see `lean`).
- Refactor: clean up with the tests green.
- Test behaviour through public interfaces, not implementation details. Use the repo's test
  runner and conventions.
- Commit at each green step with a message saying what now works.

## 5. Review

Run the tests, types and linter. Run `/code-review` on the diff, `ship-secure` if it touches
auth, data, payments or secrets, and `ui-craft` checks for UI. Try the feature in the real
app (`run` skill). Fix before moving on.

## 6. Improve the architecture (periodically)

When a slice was harder than it should have been, look for the cause: shallow modules with
leaky interfaces, logic duplicated across layers, names that don't match the spec. Propose
one focused refactor, behind passing tests.

## Stuck or going in circles?

Stop editing. Write down what's known, what was tried and the exact failure; reproduce it
with the smallest test; form one hypothesis and test it. Don't make the same change twice.
