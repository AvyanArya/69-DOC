import type { Article, Quiz, QuizQuestion, Comment, Category } from "./types";
import { ALL_SEEDS, type Seed } from "./data/seeds";
import { STUDENT_AUTHOR_IDS } from "./data/users";
import { GLOSSARY_MAP } from "./data/glossary";
import { XP_BY_DIFFICULTY, COINS_BY_DIFFICULTY } from "./gamification";

// ─── Deterministic helpers (stable content across renders) ───────────────────

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.trunc(seed)) % arr.length];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function daysAgoIso(days: number): string {
  const d = new Date("2026-07-10T09:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

// ─── Article building ────────────────────────────────────────────────────────

function buildSections(seed: Seed) {
  const [f0, f1, f2, f3] = seed.facts;
  const topic = seed.title.replace(/\(.*?\)/g, "").trim();
  return [
    {
      heading: "Why this matters",
      paragraphs: [
        `${topic} is one of those topics that sounds intimidating until you see the core idea. This summary breaks it down into plain language so you can understand the science without a textbook.`,
        f0 ? `At the heart of it: ${f0.toLowerCase()}` : "",
      ].filter(Boolean),
    },
    {
      heading: "The key idea",
      paragraphs: [
        f1 ? `Researchers highlight that ${f1.toLowerCase()} This is the detail most people miss, and it changes how you think about the whole subject.` : "",
        f2 ? `Building on that, ${f2.toLowerCase()} Small pieces like this add up to the bigger picture.` : "",
      ].filter(Boolean),
    },
    {
      heading: "What the evidence shows",
      paragraphs: [
        f3 ? `Finally, ${f3.toLowerCase()} Evidence like this is why scientists are confident in the overall story.` : "",
        `The best part is that once you grasp these ideas, you start noticing them everywhere — in the news, in your biology class, and in everyday life.`,
      ].filter(Boolean),
    },
    {
      heading: "Putting it together",
      paragraphs: [
        `To recap the science in one breath: the facts above connect into a single, coherent explanation of ${topic.toLowerCase()}. Read them again, take the quiz, and it will stick.`,
      ],
    },
  ];
}

function buildReferences(seed: Seed) {
  const journals = [
    "Nature",
    "Science",
    "The Lancet",
    "Cell",
    "New England Journal of Medicine",
    "PNAS",
    "Journal of Neuroscience",
    "PLOS Biology",
  ];
  const h = hash(seed.title);
  const y1 = 2015 + (h % 9);
  const y2 = 2012 + ((h >>> 3) % 12);
  return [
    {
      label: `Review on ${seed.category.replace("-", " ")}`,
      source: `${pick(journals, h)} (${y1})`,
      url: "https://scholar.google.com/",
    },
    {
      label: "Foundational study",
      source: `${pick(journals, h >>> 4)} (${y2})`,
      url: "https://pubmed.ncbi.nlm.nih.gov/",
    },
  ];
}

export function buildArticle(seed: Seed, index: number): Article {
  const id = slugify(seed.title) || `article-${index}`;
  const h = hash(id);
  const authorId =
    seed.type === "student"
      ? STUDENT_AUTHOR_IDS[h % STUDENT_AUTHOR_IDS.length]
      : "editorial";

  return {
    id,
    title: seed.title,
    category: seed.category,
    difficulty: seed.difficulty,
    readMinutes: seed.readMinutes,
    type: seed.type,
    summary: seed.summary,
    facts: seed.facts,
    terms: seed.terms,
    authorId,
    featured: seed.featured,
    publishedAt: daysAgoIso(h % 120),
    xp: XP_BY_DIFFICULTY[seed.difficulty],
    coins: COINS_BY_DIFFICULTY[seed.difficulty],
    sections: buildSections(seed),
    keyTakeaways: seed.facts.slice(0, 3),
    importantFacts: seed.facts,
    references: buildReferences(seed),
    likes: 40 + (h % 2400),
    bookmarksCount: 5 + (h % 380),
    reads: 200 + (h % 18000),
  };
}

// ─── Quiz building ───────────────────────────────────────────────────────────

const GENERIC_DISTRACTORS = [
  "It has no measurable effect on the body.",
  "It only happens in laboratory conditions, never in real life.",
  "It was disproven by recent research.",
  "It is caused entirely by random chance.",
  "It only affects plants, not animals.",
  "It reverses the normal process completely.",
];

function trueFalse(seed: Seed, fact: string, i: number): QuizQuestion {
  const flip = hash(fact) % 2 === 0;
  // Build a plausibly-false version by negating for the "false" case.
  const falseVersion = fact
    .replace(/\bincreases?\b/i, "decreases")
    .replace(/\bfaster\b/i, "slower")
    .replace(/\bmore\b/i, "less")
    .replace(/\bcan\b/i, "cannot")
    .replace(/\bhelps?\b/i, "prevents");
  const changed = falseVersion !== fact;
  const showFalse = flip && changed;
  return {
    id: `${slugify(seed.title)}-tf-${i}`,
    kind: "true-false",
    prompt: showFalse ? falseVersion : fact,
    options: ["True", "False"],
    correctIndex: showFalse ? 1 : 0,
    explanation: `The accurate statement is: ${fact}`,
  };
}

function multipleChoice(seed: Seed, fact: string, i: number): QuizQuestion {
  const h = hash(fact + i);
  const distractors = [...GENERIC_DISTRACTORS]
    .sort((a, b) => hash(a + h) - hash(b + h))
    .slice(0, 3);
  const options = [fact, ...distractors];
  // shuffle deterministically
  const shuffled = options
    .map((o, idx) => ({ o, k: hash(o + idx + h) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.o);
  const correctIndex = shuffled.indexOf(fact);
  return {
    id: `${slugify(seed.title)}-mc-${i}`,
    kind: "multiple-choice",
    prompt: `Which statement is correct about ${seed.title.replace(/\(.*?\)/g, "").trim().toLowerCase()}?`,
    options: shuffled,
    correctIndex,
    explanation: `Correct: ${fact}`,
  };
}

function scenario(seed: Seed, i: number): QuizQuestion {
  const fact = seed.facts[0];
  const options = [
    fact,
    ...[...GENERIC_DISTRACTORS].sort((a, b) => hash(a + i) - hash(b + i)).slice(0, 2),
  ];
  const shuffled = options
    .map((o, idx) => ({ o, k: hash(o + idx + seed.title) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.o);
  return {
    id: `${slugify(seed.title)}-sc-${i}`,
    kind: "scenario",
    prompt: `A classmate asks you to explain the main takeaway from "${seed.title}". Which answer is best?`,
    options: shuffled,
    correctIndex: shuffled.indexOf(fact),
    explanation: `The clearest correct explanation is: ${fact}`,
  };
}

function matching(seed: Seed, i: number): QuizQuestion | null {
  const termDefs = seed.terms
    .map((t) => GLOSSARY_MAP[t])
    .filter(Boolean)
    .slice(0, 4);
  if (termDefs.length < 2) return null;
  return {
    id: `${slugify(seed.title)}-match-${i}`,
    kind: "matching",
    prompt: "Match each term to its definition.",
    pairs: termDefs.map((t) => ({
      left: t.term,
      right: t.definition,
    })),
    explanation: "Each term links to its standard scientific definition.",
  };
}

function ordering(seed: Seed, i: number): QuizQuestion | null {
  if (seed.facts.length < 3) return null;
  return {
    id: `${slugify(seed.title)}-order-${i}`,
    kind: "ordering",
    prompt: "Put these facts in the order they appear in the article.",
    orderedItems: seed.facts.slice(0, 4),
    explanation: "This is the order the article presents these ideas.",
  };
}

export function buildQuiz(seed: Seed): Quiz {
  const questions: QuizQuestion[] = [];
  questions.push(multipleChoice(seed, seed.facts[0], 0));
  if (seed.facts[1]) questions.push(trueFalse(seed, seed.facts[1], 1));
  const m = matching(seed, 2);
  if (m) questions.push(m);
  else if (seed.facts[2]) questions.push(multipleChoice(seed, seed.facts[2], 2));
  const o = ordering(seed, 3);
  if (o) questions.push(o);
  questions.push(scenario(seed, 4));
  return {
    articleId: slugify(seed.title),
    passScore: 0.6,
    questions,
  };
}

// ─── Comments ────────────────────────────────────────────────────────────────

const COMMENT_TEXTS = [
  "This finally made it click for me, thank you!",
  "Reading this before my exam — super helpful summary.",
  "Wait, so does this also apply outside the lab?",
  "Great explanation. The key takeaways box is gold.",
  "I never understood this in class but now I do.",
  "Sharing this with my whole study group.",
  "The quiz at the end really tested if I got it.",
  "Could you do a follow-up on the advanced version?",
  "Love how beginner-friendly this is.",
  "This is the kind of content school should use.",
];

export function buildComments(articleId: string): Comment[] {
  const h = hash(articleId);
  const count = 1 + (h % 4);
  const out: Comment[] = [];
  for (let i = 0; i < count; i++) {
    const ch = hash(articleId + i);
    out.push({
      id: `${articleId}-c-${i}`,
      articleId,
      authorId: STUDENT_AUTHOR_IDS[ch % STUDENT_AUTHOR_IDS.length],
      body: COMMENT_TEXTS[ch % COMMENT_TEXTS.length],
      likes: ch % 42,
      createdAt: daysAgoIso(ch % 30),
      replies:
        ch % 3 === 0
          ? [
              {
                id: `${articleId}-c-${i}-r0`,
                articleId,
                authorId: STUDENT_AUTHOR_IDS[(ch + 1) % STUDENT_AUTHOR_IDS.length],
                body: "Totally agree — bookmarking this one.",
                likes: ch % 12,
                createdAt: daysAgoIso(ch % 20),
              },
            ]
          : undefined,
    });
  }
  return out;
}

// ─── Aggregated content ──────────────────────────────────────────────────────

export const ARTICLES: Article[] = ALL_SEEDS.map((s, i) => buildArticle(s, i));
export const ARTICLE_MAP: Record<string, Article> = Object.fromEntries(
  ARTICLES.map((a) => [a.id, a]),
);
export const QUIZZES: Record<string, Quiz> = Object.fromEntries(
  ALL_SEEDS.map((s) => [slugify(s.title), buildQuiz(s)]),
);

export function getArticle(id: string): Article | undefined {
  return ARTICLE_MAP[id];
}
export function getQuiz(id: string): Quiz | undefined {
  return QUIZZES[id];
}

export function articlesByCategory(cat: Category): Article[] {
  return ARTICLES.filter((a) => a.category === cat);
}

export function featuredArticles(): Article[] {
  return ARTICLES.filter((a) => a.featured);
}

export function studentArticles(): Article[] {
  return ARTICLES.filter((a) => a.type === "student");
}

export const STUDY_COUNT = ARTICLES.filter((a) => a.type === "study").length;
export const STUDENT_COUNT = ARTICLES.filter((a) => a.type === "student").length;
