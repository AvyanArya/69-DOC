import type { Article, Category } from "./types";
import { CATEGORIES } from "./data/categories";

// Alternate names, adjacent fields and buzzwords for each topic, so a search
// for "neurology" still finds neuroscience articles, "economics" still finds
// finance articles, and so on — without requiring the exact category name.
export const CATEGORY_SYNONYMS: Record<Category, string[]> = {
  biology: ["bio", "life science", "living things", "organisms", "ecology"],
  chemistry: ["chem", "chemical science", "reactions", "molecules"],
  medicine: ["medical", "clinical", "healthcare", "health care", "doctor", "disease"],
  neuroscience: ["neurology", "neurological", "neuro", "brain science", "the brain"],
  psychology: ["psych", "behavioural science", "behavioral science", "mental health", "mind"],
  genetics: ["genomics", "genome", "heredity", "dna", "gene editing"],
  epidemiology: ["public health data", "disease spread", "epi", "outbreaks"],
  pharmacology: ["pharma", "drug science", "medications", "drugs"],
  "public-health": ["community health", "population health", "wellbeing", "sanitation"],
  physics: ["physical science", "mechanics", "energy"],
  business: ["entrepreneurship", "management", "commerce", "corporate", "startups", "marketing", "economy"],
  finance: ["economics", "econ", "money", "investing", "financial literacy", "personal finance", "wealth", "banking"],
};

// Fields that are conceptually adjacent enough that a search for one should
// also surface the other, even without a shared synonym term.
const RELATED_CATEGORIES: Partial<Record<Category, Category[]>> = {
  business: ["finance"],
  finance: ["business"],
  neuroscience: ["psychology"],
  psychology: ["neuroscience"],
  genetics: ["medicine"],
  epidemiology: ["public-health"],
  "public-health": ["epidemiology"],
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Every category whose name/id/synonyms (or a related field) match the query. */
export function categoriesForQuery(query: string): Set<Category> {
  const q = normalize(query);
  const matched = new Set<Category>();
  if (q.length < 3) return matched;

  for (const c of CATEGORIES) {
    const terms = [c.id, c.name, ...(CATEGORY_SYNONYMS[c.id] ?? [])].map(normalize);
    if (terms.some((t) => t.includes(q) || q.includes(t))) matched.add(c.id);
  }

  for (const cat of [...matched]) {
    for (const related of RELATED_CATEGORIES[cat] ?? []) matched.add(related);
  }

  return matched;
}

/** Search match that understands topic synonyms and adjacent fields, on top
 * of a plain substring match against the article's own text. */
export function articleMatchesQuery(article: Article, query: string, extraHay = ""): boolean {
  const q = normalize(query);
  if (!q) return true;

  const hay = normalize(`${article.title} ${article.summary} ${article.facts.join(" ")} ${article.category} ${extraHay}`);
  if (hay.includes(q)) return true;

  return categoriesForQuery(q).has(article.category);
}
