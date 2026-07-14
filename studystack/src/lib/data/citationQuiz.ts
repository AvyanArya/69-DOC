import type { QuizQuestion } from "../types";

// A standalone skills-check required before a student may submit an article
// for moderation. Tests referencing, citation and source-credibility
// judgement — not simple recall — so guessing from "obviously silly" wrong
// answers doesn't work; every distractor here is a plausible, common mistake.

export const CITATION_QUIZ_PASS_SCORE = 0.8;

export const CITATION_QUIZ: QuizQuestion[] = [
  {
    id: "cite-1",
    kind: "multiple-choice",
    prompt: "Why do scientific and student articles need references?",
    options: [
      "So readers can trace every claim back to its source and judge the evidence for themselves",
      "So the article reaches a required word count",
      "So the article looks more professional to casual readers",
      "So the author can't be asked to justify individual claims later",
    ],
    correctIndex: 0,
    explanation: "References exist so a reader can independently verify a claim — not as decoration or padding.",
  },
  {
    id: "cite-2",
    kind: "true-false",
    prompt: "Rewriting a source's sentence in your own words removes the need to cite it, as long as you don't copy the exact wording.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Paraphrasing changes the wording, not the ownership of the idea — you still need a citation whenever an idea isn't your own.",
  },
  {
    id: "cite-3",
    kind: "multiple-choice",
    prompt: "A source has been cited by hundreds of other articles online. What does that tell you on its own?",
    options: [
      "Only that it's widely referenced — popularity isn't the same as being correct or peer-reviewed",
      "That it is definitely accurate and safe to cite without further checking",
      "That it must be a peer-reviewed primary source",
      "That every one of those citing articles independently verified it",
    ],
    correctIndex: 0,
    explanation: "A claim can spread widely while tracing back to one weak or outdated original source. Citation count isn't a credibility guarantee.",
  },
  {
    id: "cite-4",
    kind: "multiple-choice",
    prompt: "What's the key difference between a primary and a secondary source?",
    options: [
      "A primary source reports original research or data; a secondary source discusses or summarises someone else's work",
      "A primary source is always a website; a secondary source is always a book",
      "A primary source is newer; a secondary source is older",
      "There's no real difference — the terms are interchangeable",
    ],
    correctIndex: 0,
    explanation: "Primary sources are the original study or data; secondary sources (like reviews or news articles) interpret or summarise primary work.",
  },
  {
    id: "cite-5",
    kind: "true-false",
    prompt: "If the same claim appears on several different websites, that alone confirms it's accurate.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Many sites often copy from the same single original source — repetition isn't independent confirmation.",
  },
  {
    id: "cite-6",
    kind: "scenario",
    prompt: "You cited a study supporting your claim, but a more recent, larger study reached the opposite conclusion. What should you do?",
    options: [
      "Update your article to reflect the newer, stronger evidence, or present both and explain why the evidence has shifted",
      "Keep citing only the older study since you already wrote your section around it",
      "Cite both studies without mentioning that they disagree",
      "Remove all citations so readers can't compare them",
    ],
    correctIndex: 0,
    explanation: "Good science writing follows the strongest current evidence, not just whichever source you found first.",
  },
  {
    id: "cite-7",
    kind: "multiple-choice",
    prompt: "A study finds two things are correlated. What can you responsibly claim in your article?",
    options: [
      "That they are associated — without claiming one causes the other unless the study specifically tested that",
      "That one directly causes the other, since a correlation was found",
      "Nothing at all — correlational studies can never be mentioned",
      "That the finding applies to every individual, not just the studied population on average",
    ],
    correctIndex: 0,
    explanation: "\"Correlation isn't causation\" — you can report an association, but claiming causation needs evidence designed to test causation directly.",
  },
  {
    id: "cite-8",
    kind: "true-false",
    prompt: "A preprint (posted online before peer review) is exactly as reliable to cite as a peer-reviewed publication.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Preprints haven't been independently checked by other experts yet — they can still be useful, but should be flagged as unreviewed.",
  },
  {
    id: "cite-9",
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
    id: "cite-10",
    kind: "multiple-choice",
    prompt: "Two credible, peer-reviewed sources disagree on a finding. What's the most honest way to handle this in your article?",
    options: [
      "Note that the evidence is mixed, and briefly explain what might account for the disagreement (different methods, sample sizes, populations)",
      "Only cite whichever source agrees with the point you already wanted to make",
      "Ignore both and state your own opinion instead",
      "Average the two conclusions together and present that as fact",
    ],
    correctIndex: 0,
    explanation: "When credible sources genuinely disagree, that disagreement itself is worth reporting honestly, not hidden by cherry-picking.",
  },
  {
    id: "cite-11",
    kind: "scenario",
    prompt: "You want to cite an effectiveness statistic from a company's own marketing page about its own product. What's the best practice?",
    options: [
      "Look for the independent study the claim is based on, or clearly flag it as the company's own claim rather than independent evidence",
      "Cite the marketing page directly as if it were neutral scientific evidence",
      "Round the statistic up to make the claim sound stronger",
      "Leave out the source entirely and just state the number"
    ],
    correctIndex: 0,
    explanation: "A company describing its own product has an obvious conflict of interest — treat self-reported marketing claims differently from independent research.",
  },
  {
    id: "cite-12",
    kind: "true-false",
    prompt: "It's fine to cite a source you only saw quoted inside another article, without ever checking the original source yourself.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Quotes get simplified, exaggerated or taken out of context as they're passed along — always trace a claim back to the original before citing it.",
  },
  {
    id: "cite-13",
    kind: "multiple-choice",
    prompt: "What matters most when you summarise a study's findings in your own words?",
    options: [
      "Representing the actual strength and scope of the finding accurately, not exaggerating it for a punchier sentence",
      "Making the finding sound as dramatic and certain as possible",
      "Shortening it as much as possible, even if nuance is lost",
      "Matching the tone of the rest of your article, regardless of what the study actually found",
    ],
    correctIndex: 0,
    explanation: "A technically \"true-ish\" summary that overstates certainty or scope is still misleading — accuracy matters more than punchiness.",
  },
  {
    id: "cite-14",
    kind: "scenario",
    prompt: "You can't find the original study behind a widely repeated claim, no matter how much you search. What should you do?",
    options: [
      "Leave the claim out, or clearly say it's unverified — don't present it as an established fact",
      "Cite the first website that repeated the claim, even though it isn't the original source",
      "State it as fact since it's widely believed",
      "Invent a plausible-sounding citation so the article looks complete",
    ],
    correctIndex: 0,
    explanation: "If a claim can't be traced to a real source, it doesn't belong in your article stated as verified fact.",
  },
];
