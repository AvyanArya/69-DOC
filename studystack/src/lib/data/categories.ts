import type { Category } from "../types";

export interface CategoryDef {
  id: Category;
  name: string;
  emoji: string;
  gradient: string; // tailwind gradient classes for cover art
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "biology",
    name: "Biology",
    emoji: "🧬",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    blurb: "Cells, ecosystems and the machinery of life.",
  },
  {
    id: "chemistry",
    name: "Chemistry",
    emoji: "⚗️",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    blurb: "Molecules, reactions and materials.",
  },
  {
    id: "medicine",
    name: "Medicine",
    emoji: "🩺",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600",
    blurb: "How we diagnose, treat and heal.",
  },
  {
    id: "neuroscience",
    name: "Neuroscience",
    emoji: "🧠",
    gradient: "from-violet-400 via-purple-500 to-indigo-600",
    blurb: "The brain, neurons and the mind.",
  },
  {
    id: "psychology",
    name: "Psychology",
    emoji: "💭",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    blurb: "Behaviour, emotion and cognition.",
  },
  {
    id: "genetics",
    name: "Genetics",
    emoji: "🧪",
    gradient: "from-lime-400 via-green-500 to-emerald-600",
    blurb: "DNA, heredity and gene editing.",
  },
  {
    id: "epidemiology",
    name: "Epidemiology",
    emoji: "📊",
    gradient: "from-cyan-400 via-sky-500 to-blue-600",
    blurb: "How disease spreads through populations.",
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    emoji: "💊",
    gradient: "from-fuchsia-400 via-pink-500 to-rose-600",
    blurb: "Drugs, doses and how medicines work.",
  },
  {
    id: "public-health",
    name: "Public Health",
    emoji: "🌍",
    gradient: "from-teal-400 via-emerald-500 to-green-600",
    blurb: "Keeping whole communities healthy.",
  },
  {
    id: "physics",
    name: "Physics",
    emoji: "⚛️",
    gradient: "from-indigo-400 via-violet-500 to-purple-600",
    blurb: "Matter, energy, space and time.",
  },
  {
    id: "business",
    name: "Business",
    emoji: "📈",
    gradient: "from-slate-500 via-slate-600 to-zinc-700",
    blurb: "Companies, strategy and how markets really work.",
  },
  {
    id: "finance",
    name: "Finance",
    emoji: "💰",
    gradient: "from-amber-500 via-yellow-500 to-lime-600",
    blurb: "Money, investing and building financial literacy.",
  },
];

export const CATEGORY_MAP: Record<Category, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<Category, CategoryDef>;
