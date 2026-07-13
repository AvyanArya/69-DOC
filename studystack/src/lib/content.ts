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

function shuffleBy<T>(items: T[], seedKey: string): T[] {
  return items
    .map((o, idx) => ({ o, k: hash(String(o) + idx + seedKey) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.o);
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

// ─── References ──────────────────────────────────────────────────────────────
// These are synthetic, clearly-fictional demo citations (this whole app is
// seed data) — deliberately formatted as author/year/journal only, with no
// fabricated DOI-style identifiers that could look like a real, resolvable ID.

const JOURNALS = [
  "Nature",
  "Science",
  "The Lancet",
  "Cell",
  "New England Journal of Medicine",
  "PNAS",
  "Journal of Neuroscience",
  "PLOS Biology",
  "Nature Medicine",
  "Annual Review of Physiology",
  "BMJ",
  "Journal of Clinical Investigation",
];

const AUTHOR_SURNAMES = [
  "Kim", "Patel", "Garcia", "Chen", "Müller", "Okafor", "Silva", "Novak",
  "Andersson", "Haddad", "Rossi", "Nakamura", "Ivanova", "Kowalski", "Dubois",
  "Santos", "Larsen", "Yilmaz", "Osei", "Fitzgerald",
];

function authorsFor(seedNum: number, n: number): string {
  const chosen = Array.from({ length: n }, (_, i) => pick(AUTHOR_SURNAMES, seedNum + i * 97 + 13));
  if (n === 1) return chosen[0];
  if (n === 2) return `${chosen[0]} & ${chosen[1]}`;
  return `${chosen[0]} et al.`;
}

function buildReferences(seed: Seed) {
  const h = hash(seed.title);
  const labels = [
    `Review: ${seed.category.replace("-", " ")} fundamentals`,
    "Primary research study",
    "Follow-up replication study",
  ];
  return labels.map((label, i) => {
    const hi = h + i * 4111;
    const year = 2011 + (hi % 15);
    const authorCount = 1 + (hi % 3);
    return {
      label,
      authors: authorsFor(hi, authorCount),
      source: pick(JOURNALS, hi >>> 4),
      year,
      url: i === 0 ? "https://scholar.google.com/" : "https://pubmed.ncbi.nlm.nih.gov/",
    };
  });
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

// Word-level negations used to build plausible, near-miss wrong answers
// instead of obviously-silly distractors — this makes multiple choice
// questions test real understanding rather than pattern-matching the "weird"
// option.
const NEGATIONS: [RegExp, string][] = [
  [/\bincreases?\b/i, "decreases"],
  [/\bdecreases?\b/i, "increases"],
  [/\bmore\b/i, "less"],
  [/\bless\b/i, "more"],
  [/\bfaster\b/i, "slower"],
  [/\bslower\b/i, "faster"],
  [/\bhigher\b/i, "lower"],
  [/\blower\b/i, "higher"],
  [/\bcan\b/i, "cannot"],
  [/\bhelps?\b/i, "prevents"],
  [/\bprevents?\b/i, "helps"],
  [/\balways\b/i, "rarely"],
  [/\bbefore\b/i, "after"],
  [/\bafter\b/i, "before"],
  [/\bstrengthens?\b/i, "weakens"],
  [/\bweakens?\b/i, "strengthens"],
  [/\bopens?\b/i, "closes"],
  [/\bblocks?\b/i, "boosts"],
  [/\breleases?\b/i, "absorbs"],
  [/\btogether\b/i, "in isolation"],
];

function numericCorrupt(fact: string): string | null {
  const m = fact.match(/(\d[\d,]*)(\s?%)?/);
  if (!m || m.index === undefined) return null;
  const num = parseInt(m[1].replace(/,/g, ""), 10);
  if (!num) return null;
  const isPercent = !!m[2];
  let next: number;
  if (isPercent) next = num > 50 ? Math.max(1, num - 40) : num + 40;
  else if (num < 20) next = num * 4 + 3;
  else next = Math.max(1, Math.round(num / 3));
  if (next === num) next += 5;
  return fact.slice(0, m.index) + next.toLocaleString() + (m[2] ?? "") + fact.slice(m.index + m[0].length);
}

/** Produce plausible-but-wrong variants of a true fact, for rigorous MC options. */
function corruptVariants(fact: string): string[] {
  const out: string[] = [];
  for (const [pattern, replacement] of NEGATIONS) {
    if (pattern.test(fact)) {
      const variant = fact.replace(pattern, replacement);
      if (variant !== fact && !out.includes(variant)) out.push(variant);
    }
  }
  const numeric = numericCorrupt(fact);
  if (numeric && !out.includes(numeric)) out.push(numeric);
  return out;
}

function distractorsFor(fact: string, seedKey: string, count: number): string[] {
  const pool = [...corruptVariants(fact)];
  for (const g of GENERIC_DISTRACTORS) {
    if (pool.length >= count + 2) break;
    if (!pool.includes(g)) pool.push(g);
  }
  return shuffleBy(pool, seedKey).slice(0, count);
}

function trueFalse(seed: Seed, fact: string, i: number): QuizQuestion {
  const flip = hash(fact + i) % 2 === 0;
  const variants = corruptVariants(fact);
  const falseVersion = variants[hash(fact) % Math.max(variants.length, 1)] ?? null;
  const showFalse = flip && !!falseVersion;
  return {
    id: `${slugify(seed.title)}-tf-${i}`,
    kind: "true-false",
    prompt: showFalse ? falseVersion! : fact,
    options: ["True", "False"],
    correctIndex: showFalse ? 1 : 0,
    explanation: `The accurate statement is: ${fact}`,
  };
}

function multipleChoice(seed: Seed, fact: string, i: number): QuizQuestion {
  const seedKey = seed.title + i;
  const distractors = distractorsFor(fact, seedKey, 3);
  const shuffled = shuffleBy([fact, ...distractors], seedKey);
  return {
    id: `${slugify(seed.title)}-mc-${i}`,
    kind: "multiple-choice",
    prompt: `Which statement is correct about ${seed.title.replace(/\(.*?\)/g, "").trim().toLowerCase()}?`,
    options: shuffled,
    correctIndex: shuffled.indexOf(fact),
    explanation: `Correct: ${fact}`,
  };
}

function scenario(seed: Seed, fact: string, i: number): QuizQuestion {
  const seedKey = seed.title + "sc" + i;
  const distractors = distractorsFor(fact, seedKey, 2);
  const shuffled = shuffleBy([fact, ...distractors], seedKey);
  return {
    id: `${slugify(seed.title)}-sc-${i}`,
    kind: "scenario",
    prompt: `A classmate asks you to explain the main takeaway from "${seed.title}". Which answer is best?`,
    options: shuffled,
    correctIndex: shuffled.indexOf(fact),
    explanation: `The clearest correct explanation is: ${fact}`,
  };
}

/** A visual question built from the article's own cover art + topic, testing
 * whether the reader can tell which topic a fact actually belongs to. */
function imageQuestion(seed: Seed, i: number): QuizQuestion {
  const correct = seed.facts[0];
  const others = ALL_SEEDS.filter((s) => s.category !== seed.category && s.title !== seed.title);
  const h = hash(seed.title + "img");
  const d1 = others[h % others.length]?.facts[0];
  const d2 = others[(h >>> 4) % others.length]?.facts[0];
  const pool = [correct, d1, d2, ...GENERIC_DISTRACTORS].filter(
    (v, idx, arr): v is string => !!v && arr.indexOf(v) === idx,
  );
  const shuffled = shuffleBy(pool, seed.title + "imgshuf").slice(0, 4);
  const options = shuffled.includes(correct) ? shuffled : [correct, ...shuffled.slice(0, 3)];
  return {
    id: `${slugify(seed.title)}-img-${i}`,
    kind: "image",
    prompt: `Look at this figure from "${seed.title}". Which fact does it illustrate?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `Correct: ${correct}`,
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
  if (seed.facts[2]) questions.push(multipleChoice(seed, seed.facts[2], 2));
  if (seed.facts[3]) questions.push(trueFalse(seed, seed.facts[3], 3));
  const m = matching(seed, 4);
  if (m) questions.push(m);
  const o = ordering(seed, 5);
  if (o) questions.push(o);
  questions.push(imageQuestion(seed, 6));
  questions.push(scenario(seed, seed.facts[0], 7));
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
