import type { Difficulty } from "./types";

// ─── XP & levels ─────────────────────────────────────────────────────────────

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  beginner: 30,
  intermediate: 50,
  advanced: 80,
};

export const COINS_BY_DIFFICULTY: Record<Difficulty, number> = {
  beginner: 10,
  intermediate: 18,
  advanced: 30,
};

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

/** Compute level + progress within level from total XP. */
export function levelFromXp(totalXp: number): {
  level: number;
  intoLevel: number;
  needed: number;
  percent: number;
} {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  const needed = xpForLevel(level);
  return {
    level,
    intoLevel: remaining,
    needed,
    percent: Math.min(100, Math.round((remaining / needed) * 100)),
  };
}

export const LEVEL_TITLES = [
  "Curious Mind",
  "Explorer",
  "Investigator",
  "Analyst",
  "Researcher",
  "Scholar",
  "Scientist",
  "Expert",
  "Luminary",
  "Legend",
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))];
}

// ─── Knowledge Tower stages ──────────────────────────────────────────────────

export interface TowerStage {
  min: number;
  name: string;
  emoji: string;
  description: string;
}

export const TOWER_STAGES: TowerStage[] = [
  { min: 0, name: "Empty Plot", emoji: "🌱", description: "Read your first study to lay a foundation." },
  { min: 1, name: "Tiny Tower", emoji: "🏠", description: "Your first blocks of knowledge." },
  { min: 10, name: "Stone Tower", emoji: "🗼", description: "A solid tower is taking shape." },
  { min: 25, name: "Watchtower", emoji: "🏯", description: "You can see further every day." },
  { min: 50, name: "Castle", emoji: "🏰", description: "A fortress of understanding." },
  { min: 100, name: "Scientific Institute", emoji: "🏛️", description: "Serious scholarship lives here." },
  { min: 250, name: "Research Campus", emoji: "🏙️", description: "Whole fields under one roof." },
  { min: 500, name: "City of Knowledge", emoji: "🌆", description: "A futuristic skyline of everything you know." },
];

export function towerStage(height: number): TowerStage {
  let stage = TOWER_STAGES[0];
  for (const s of TOWER_STAGES) if (height >= s.min) stage = s;
  return stage;
}

export function nextTowerStage(height: number): TowerStage | null {
  for (const s of TOWER_STAGES) if (height < s.min) return s;
  return null;
}

// ─── Dates & streak helpers ──────────────────────────────────────────────────

export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(fromKey + "T00:00:00Z").getTime();
  const to = new Date(toKey + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86_400_000);
}

/** ISO week key like "2026-W28", used to grant one free freeze per week. */
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
