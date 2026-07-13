import type { BadgeDef } from "../types";
import { CATEGORIES } from "./categories";

export const BADGES: BadgeDef[] = [
  { id: "first-article", name: "First Steps", emoji: "🎉", description: "Read your very first study.", condition: "Read 1 article" },
  { id: "ten-articles", name: "Getting Serious", emoji: "📚", description: "Ten studies down.", condition: "Read 10 articles" },
  { id: "fifty-articles", name: "Knowledge Builder", emoji: "🏗️", description: "Fifty studies completed.", condition: "Read 50 articles" },
  { id: "hundred-articles", name: "Century Scholar", emoji: "💯", description: "One hundred studies read.", condition: "Read 100 articles" },
  { id: "perfect-quiz", name: "Perfect Score", emoji: "⭐", description: "Aced a quiz with 100%.", condition: "Score 100% on a quiz" },
  { id: "researcher", name: "Researcher", emoji: "🔬", description: "Reached level 5.", condition: "Reach level 5" },
  { id: "scientist", name: "Scientist", emoji: "🧑‍🔬", description: "Reached level 7.", condition: "Reach level 7" },
  { id: "medical-explorer", name: "Medical Explorer", emoji: "🩺", description: "Read 10 medicine studies.", condition: "Read 10 medicine articles" },
  { id: "consistency-king", name: "Consistency King", emoji: "👑", description: "Kept a 7 day streak.", condition: "7 day streak" },
  { id: "thirty-day", name: "Unstoppable", emoji: "🔥", description: "Thirty days in a row.", condition: "30 day streak" },
  { id: "hundred-day", name: "Immortal Streak", emoji: "🌟", description: "One hundred days in a row.", condition: "100 day streak" },
  { id: "top-author", name: "Top Author", emoji: "✍️", description: "Published an approved article.", condition: "Publish an article" },
  { id: "community-helper", name: "Community Helper", emoji: "🤝", description: "Left 10 helpful comments.", condition: "10 comments" },
  { id: "citation-verified", name: "Fact Checker", emoji: "🔗", description: "Passed the referencing & citation skills quiz.", condition: "Pass the citation quiz" },
  { id: "health-advocate", name: "Health Advocate", emoji: "🎗️", description: "Completed the Cancer Awareness guide.", condition: "Finish the Cancer Awareness quiz" },
  ...CATEGORIES.map((c) => ({
    id: `master-${c.id}`,
    name: `${c.name} Master`,
    emoji: "🏆",
    description: `Mastered every tier of the ${c.name} Knowledge Tower.`,
    condition: `Master all 3 tiers of ${c.name}`,
  })),
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<string, BadgeDef>;
