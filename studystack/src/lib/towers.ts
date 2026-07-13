import type { Article, Category, CompletedArticle, Difficulty } from "./types";
import { ARTICLES } from "./content";
import { CATEGORY_MAP } from "./data/categories";

// ─── The Knowledge Tower is a per-topic mastery ladder ───────────────────────
//
// Each topic has three tiers, bottom to top: Foundation (beginner),
// Core (intermediate), Mastery (advanced). A tier is unlocked once the tier
// below it is mastered — mastering a tier means completing (and passing the
// quiz for, or marking as read) enough of its articles. Reading ahead is
// never blocked; the tower simply won't credit a floor into a locked tier's
// band until you've built the foundation beneath it.

export interface TierMeta {
  difficulty: Difficulty;
  name: string;
  emoji: string;
  blurb: string;
}

export const TIER_META: Record<Difficulty, TierMeta> = {
  beginner: { difficulty: "beginner", name: "Foundation", emoji: "🌱", blurb: "The basics everyone starts with." },
  intermediate: { difficulty: "intermediate", name: "Core", emoji: "🧱", blurb: "Building real depth." },
  advanced: { difficulty: "advanced", name: "Mastery", emoji: "🏔️", blurb: "Expert-level understanding." },
};

export const TIER_ORDER: Difficulty[] = ["beginner", "intermediate", "advanced"];

/** How many passed articles in a tier are needed to call it "mastered". */
export function tierRequirement(total: number): number {
  if (total <= 0) return 0;
  if (total <= 2) return total;
  return Math.max(2, Math.ceil(total * 0.6));
}

export function isPassed(c: CompletedArticle): boolean {
  return c.method === "marked" || c.quizScore >= 0.6;
}

export interface TierProgress extends TierMeta {
  articles: Article[];
  completedArticles: Article[];
  required: number;
  completedCount: number;
  mastered: boolean;
  unlocked: boolean;
  percent: number; // 0..100 toward mastering this tier
}

export interface TopicTower {
  category: Category;
  tiers: TierProgress[]; // beginner, intermediate, advanced
  floors: number; // total passed articles across all tiers in this topic
  currentTierIndex: number; // index into tiers of the tier you're actively working on
  masteredAll: boolean;
}

const byCategory = new Map<Category, Article[]>();
function articlesForCategory(category: Category): Article[] {
  let list = byCategory.get(category);
  if (!list) {
    list = ARTICLES.filter((a) => a.category === category);
    byCategory.set(category, list);
  }
  return list;
}

export function getTopicTower(category: Category, completed: CompletedArticle[]): TopicTower {
  const passedIds = new Set(completed.filter(isPassed).map((c) => c.articleId));
  const all = articlesForCategory(category);

  const tiers: TierProgress[] = TIER_ORDER.map((difficulty, i) => {
    const articles = all.filter((a) => a.difficulty === difficulty);
    const completedArticles = articles.filter((a) => passedIds.has(a.id));
    const required = tierRequirement(articles.length);
    const mastered = required > 0 && completedArticles.length >= required;
    return {
      ...TIER_META[difficulty],
      articles,
      completedArticles,
      required,
      completedCount: completedArticles.length,
      mastered,
      unlocked: i === 0, // fixed up below once we know prior tier's mastery
      percent: required > 0 ? Math.min(100, Math.round((completedArticles.length / required) * 100)) : 100,
    };
  });

  for (let i = 1; i < tiers.length; i++) {
    tiers[i].unlocked = tiers[i - 1].mastered;
  }

  const floors = tiers.reduce((sum, t) => sum + t.completedCount, 0);
  const masteredAll = tiers.every((t) => t.mastered);
  const currentTierIndex = masteredAll ? tiers.length - 1 : tiers.findIndex((t) => !t.mastered);

  return { category, tiers, floors, currentTierIndex, masteredAll };
}

export function allTopicTowers(completed: CompletedArticle[]): TopicTower[] {
  return Object.keys(CATEGORY_MAP)
    .map((c) => getTopicTower(c as Category, completed))
    .sort((a, b) => b.floors - a.floors);
}

/** Is this specific article's tier currently unlocked for this reader? */
export function isArticleUnlocked(article: Article, completed: CompletedArticle[]): boolean {
  const tower = getTopicTower(article.category, completed);
  const tier = tower.tiers.find((t) => t.difficulty === article.difficulty);
  return tier?.unlocked ?? true;
}

/** Deterministic, stable pseudo-split of a demo user's total articles-read
 * across the 10 topics, used only to render topic leaderboards for demo
 * accounts (which only store an aggregate total, not per-topic history). */
export function demoUserTopicFloors(userId: string, total: number, category: Category): number {
  const categories = Object.keys(CATEGORY_MAP) as Category[];
  let seedTotal = 0;
  const weights = categories.map((c) => {
    let h = 2166136261;
    const s = userId + c;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const w = 1 + ((h >>> 0) % 9);
    seedTotal += w;
    return w;
  });
  const idx = categories.indexOf(category);
  return Math.round((weights[idx] / seedTotal) * total);
}
