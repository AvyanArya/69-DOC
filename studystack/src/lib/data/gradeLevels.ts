import type { Difficulty, GradeLevel } from "../types";

export interface GradeLevelDef {
  id: GradeLevel;
  label: string;
  short: string;
  emoji: string;
  ceiling: Difficulty; // highest difficulty recommended for this level
  target: Difficulty; // the difficulty recommendations should actively steer toward
  blurb: string;
}

export const GRADE_LEVELS: GradeLevelDef[] = [
  {
    id: "grade-6-8",
    label: "Grades 6–8 (Middle School)",
    short: "Grades 6–8",
    emoji: "🎒",
    ceiling: "beginner",
    target: "beginner",
    blurb: "We'll keep recommendations at Foundation level so nothing feels like a wall.",
  },
  {
    id: "grade-9-10",
    label: "Grades 9–10",
    short: "Grades 9–10",
    emoji: "📘",
    ceiling: "intermediate",
    target: "beginner",
    blurb: "Foundation and Core-level studies, with the occasional stretch read.",
  },
  {
    id: "grade-11-12",
    label: "Grades 11–12",
    short: "Grades 11–12",
    emoji: "🎓",
    ceiling: "advanced",
    target: "intermediate",
    blurb: "Everything is open, including university-style deep dives.",
  },
  {
    id: "college",
    label: "Undergraduate",
    short: "Undergrad",
    emoji: "🏛️",
    ceiling: "advanced",
    target: "advanced",
    blurb: "Full library, including advanced and research-level material.",
  },
  {
    id: "postgrad",
    label: "Postgraduate / Lifelong learner",
    short: "Postgrad",
    emoji: "🔬",
    ceiling: "advanced",
    target: "advanced",
    blurb: "Full library — recommendations lean advanced by default.",
  },
];

export const GRADE_LEVEL_MAP: Record<GradeLevel, GradeLevelDef> = Object.fromEntries(
  GRADE_LEVELS.map((g) => [g.id, g]),
) as Record<GradeLevel, GradeLevelDef>;

const DIFFICULTY_RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Whether an article's difficulty sits at or below what's recommended for a grade level. */
export function isWithinGradeCeiling(difficulty: Difficulty, grade: GradeLevel): boolean {
  return DIFFICULTY_RANK[difficulty] <= DIFFICULTY_RANK[GRADE_LEVEL_MAP[grade].ceiling];
}

/** How well a difficulty fits a grade level's target — higher is a better fit.
 * Never hides content (exploration stays free), just biases recommendation
 * order so a postgrad reader is actually offered advanced material instead
 * of trivial beginner content, and vice versa for younger students. */
export function difficultyFitScore(difficulty: Difficulty, grade: GradeLevel): number {
  const def = GRADE_LEVEL_MAP[grade];
  const distance = Math.abs(DIFFICULTY_RANK[difficulty] - DIFFICULTY_RANK[def.target]);
  const overCeiling = DIFFICULTY_RANK[difficulty] > DIFFICULTY_RANK[def.ceiling];
  return -distance - (overCeiling ? 1 : 0);
}
