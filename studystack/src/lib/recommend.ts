import type { Article, Category, UserState } from "./types";
import { getArticle } from "./content";
import { difficultyFitScore } from "./data/gradeLevels";

/** How many of each category the user has actually completed, used to
 * reinforce fields they keep reading (capped so one binge doesn't dominate). */
export function readCategoryCounts(state: UserState): Partial<Record<Category, number>> {
  const counts: Partial<Record<Category, number>> = {};
  for (const c of state.completed) {
    const article = getArticle(c.articleId);
    if (!article) continue;
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }
  return counts;
}

/** Score an article for a specific reader: grade-level difficulty fit,
 * declared interests, and reinforcement from reading history — so
 * recommendations feel personal without turning into an echo chamber. */
export function scoreForUser(article: Article, state: UserState, readCounts: Partial<Record<Category, number>>): number {
  let score = difficultyFitScore(article.difficulty, state.gradeLevel) * 3;
  if (state.interests.includes(article.category)) score += 4;
  score += Math.min(readCounts[article.category] ?? 0, 5) * 0.5;
  if (article.featured) score += 1;
  return score;
}

/** Build a personalised, diverse recommendation list: sorts by fit/interest
 * score but caps how many articles from the same category can appear, so a
 * multi-disciplinary platform doesn't just keep pushing one field. */
export function pickDiverseRecommendations(
  articles: Article[],
  state: UserState,
  count: number,
  maxPerCategory = 2,
): Article[] {
  const readCounts = readCategoryCounts(state);
  const sorted = [...articles].sort((a, b) => scoreForUser(b, state, readCounts) - scoreForUser(a, state, readCounts));

  const seen = new Map<Category, number>();
  const picked: Article[] = [];
  const leftover: Article[] = [];

  for (const a of sorted) {
    const n = seen.get(a.category) ?? 0;
    if (n < maxPerCategory && picked.length < count) {
      picked.push(a);
      seen.set(a.category, n + 1);
    } else {
      leftover.push(a);
    }
  }
  for (const a of leftover) {
    if (picked.length >= count) break;
    picked.push(a);
  }
  return picked.slice(0, count);
}
