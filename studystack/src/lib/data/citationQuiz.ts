import type { QuizQuestion } from "../types";

// A standalone skills-check required before a student may submit an article
// for moderation. Tests referencing, citation and source-credibility basics —
// not article content — so it only needs to be passed once.

export const CITATION_QUIZ_PASS_SCORE = 0.7;

export const CITATION_QUIZ: QuizQuestion[] = [
  {
    id: "cite-1",
    kind: "multiple-choice",
    prompt: "Why do scientific and student articles need references?",
    options: [
      "To show where claims and facts came from, so readers can verify them",
      "To make the article look longer",
      "Because moderators require a minimum word count",
      "To make the article harder to copy",
    ],
    correctIndex: 0,
    explanation: "References let readers trace every claim back to its source and judge how trustworthy it is.",
  },
  {
    id: "cite-2",
    kind: "true-false",
    prompt: "Copying a sentence from a source word-for-word without quotation marks or a citation is acceptable as long as you read the source.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "That's plagiarism. Direct wording needs quotation marks plus a citation; ideas you paraphrase still need a citation.",
  },
  {
    id: "cite-3",
    kind: "multiple-choice",
    prompt: "Which source is generally the most credible to cite for a scientific claim?",
    options: [
      "A peer-reviewed journal article",
      "An anonymous forum comment",
      "A social media post with no sources",
      "A blog post that doesn't cite any studies",
    ],
    correctIndex: 0,
    explanation: "Peer review means other experts checked the methods and conclusions before publication — it's not perfect, but it's the strongest signal of credibility.",
  },
  {
    id: "cite-4",
    kind: "multiple-choice",
    prompt: "What's the difference between quoting and paraphrasing?",
    options: [
      "Quoting uses the source's exact words in quotation marks; paraphrasing restates the idea in your own words — both need a citation",
      "Quoting never needs a citation; paraphrasing always does",
      "They are the same thing",
      "Paraphrasing means you can skip the reference list",
    ],
    correctIndex: 0,
    explanation: "Both borrow from a source, so both need attribution — the difference is only in wording, not whether you must cite.",
  },
  {
    id: "cite-5",
    kind: "matching",
    prompt: "Match each part of a reference to what it tells the reader.",
    pairs: [
      { left: "Author(s)", right: "Who carried out or wrote the work" },
      { left: "Year", right: "When the work was published" },
      { left: "Title", right: "What the work is about" },
      { left: "Journal / source", right: "Where the work was published" },
    ],
    explanation: "A complete reference lets someone else find the exact same source you used.",
  },
  {
    id: "cite-6",
    kind: "true-false",
    prompt: "A single well-known study can be cited to support a sweeping, absolute claim like 'this always works for everyone.'",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "One study almost never proves something for everyone. Good science writing matches the strength of a claim to the strength of the evidence.",
  },
  {
    id: "cite-7",
    kind: "multiple-choice",
    prompt: "You read a claim in a listicle but can't find the original study it's based on. What should you do?",
    options: [
      "Leave it out, or keep looking until you find (and cite) the original source",
      "Cite the listicle as if it were the original research",
      "State it as fact without any citation",
      "Make up a plausible-sounding source",
    ],
    correctIndex: 0,
    explanation: "If you can't trace a claim to its original source, don't present it as verified fact — inventing a citation is worse than omitting the claim.",
  },
  {
    id: "cite-8",
    kind: "scenario",
    prompt: "Your article says 'exercise reduces stress.' What's the strongest way to back that up?",
    options: [
      "Cite a specific study or review on exercise and stress, and describe what it actually found",
      "Just say 'everyone knows this'",
      "Add a reference list at the end that doesn't match anything said in the body",
      "Link to an unrelated homepage",
    ],
    correctIndex: 0,
    explanation: "Every specific claim should trace to a specific, relevant source — not a generic reference list bolted on at the end.",
  },
];
