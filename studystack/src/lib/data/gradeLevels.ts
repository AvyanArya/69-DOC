import type { Difficulty, GradeLevel } from "../types";

export interface GradeLevelDef {
  id: GradeLevel;
  label: string;
  short: string;
  emoji: string;
  ceiling: Difficulty; // highest difficulty recommended for this level
  blurb: string;
}

export const GRADE_LEVELS: GradeLevelDef[] = [
  {
    id: "grade-6-8",
    label: "Grades 6–8 (Middle School)",
    short: "Grades 6–8",
    emoji: "🎒",
    ceiling: "beginner",
    blurb: "We'll keep recommendations at Foundation level so nothing feels like a wall.",
  },
  {
    id: "grade-9-10",
    label: "Grades 9–10",
    short: "Grades 9–10",
    emoji: "📘",
    ceiling: "intermediate",
    blurb: "Foundation and Core-level studies, with the occasional stretch read.",
  },
  {
    id: "grade-11-12",
    label: "Grades 11–12",
    short: "Grades 11–12",
    emoji: "🎓",
    ceiling: "advanced",
    blurb: "Everything is open, including university-style deep dives.",
  },
  {
    id: "college",
    label: "College / University",
    short: "College",
    emoji: "🏛️",
    ceiling: "advanced",
    blurb: "Full library, including advanced and research-level material.",
  },
  {
    id: "postgrad",
    label: "Postgrad / Lifelong learner",
    short: "Postgrad+",
    emoji: "🔬",
    ceiling: "advanced",
    blurb: "Full library — you set your own pace.",
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
