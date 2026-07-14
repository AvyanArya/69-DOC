"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CATEGORY_MAP } from "@/lib/data/categories";
import type { TierProgress, TopicTower } from "@/lib/towers";

// ─── The actual tower graphic: a stepped pyramid ─────────────────────────────
// Each tier is its own horizontal level — Foundation the widest, at the base;
// Core narrower, in the middle; Mastery narrowest, at the peak — so the shape
// itself reads as a hierarchy: broad, simple ground floor tapering up to a
// small, hard-won summit. Every tier is explorable any time — there's no
// locked state — so each level is just one block per article slot: coloured
// + the category emoji once completed, a dashed outline while still unread.

interface Slot {
  key: string;
  state: "done" | "empty";
}

/** Level width as a fraction of the pyramid's base, widest at the bottom. */
const LEVEL_WIDTH: Record<number, number> = { 0: 1, 1: 0.68, 2: 0.4 };

function slotsFor(tier: TierProgress): Slot[] {
  const count = Math.max(tier.required, tier.completedCount);
  return Array.from({ length: count }, (_, i) => ({
    key: `${tier.difficulty}-${i}`,
    state: i < tier.completedCount ? "done" : "empty",
  }));
}

function capstoneFor(tower: TopicTower): string {
  const masteredCount = tower.tiers.filter((t) => t.mastered).length;
  if (masteredCount >= 3) return "🏛️";
  if (masteredCount === 2) return "🏯";
  if (masteredCount === 1) return "🗼";
  return tower.floors > 0 ? "🏠" : "🌱";
}

export function TopicTowerViz({ tower, compact }: { tower: TopicTower; compact?: boolean }) {
  const cat = CATEGORY_MAP[tower.category];
  const capstone = capstoneFor(tower);
  const maxPerLevel = compact ? 6 : 12;

  return (
    <div
      className={`relative flex flex-col items-center justify-end overflow-hidden rounded-3xl bg-gradient-to-b from-sky1 to-sky2 px-4 pb-3 pt-6 ${
        compact ? "h-56" : "h-[26rem]"
      }`}
    >
      <div className="pointer-events-none absolute left-5 top-4 text-lg opacity-60">☁️</div>
      <div className="pointer-events-none absolute right-8 top-9 text-2xl opacity-50">☁️</div>
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-sm opacity-40">☁️</div>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
        className="relative z-10 mb-1 text-4xl"
      >
        {capstone}
      </motion.div>

      <div className="relative z-10 flex flex-1 flex-col-reverse items-center justify-start gap-1.5">
        {tower.tiers.map((tier, levelIdx) => {
          const slots = slotsFor(tier).slice(0, maxPerLevel);
          const overflow = slotsFor(tier).length - slots.length;
          return (
            <motion.div
              key={tier.difficulty}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: levelIdx * 0.08, type: "spring", stiffness: 200, damping: 22 }}
              style={{ width: `${LEVEL_WIDTH[levelIdx] * 100}%` }}
              className="flex flex-wrap items-center justify-center gap-1"
              title={tier.name}
            >
              {slots.map((slot) => (
                <div
                  key={slot.key}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] shadow-sm ${
                    slot.state === "done" ? `bg-gradient-to-br ${cat.gradient}` : "border border-dashed border-grape-300 bg-card/50"
                  }`}
                >
                  {slot.state === "done" && <span aria-hidden>{cat.emoji}</span>}
                </div>
              ))}
              {overflow > 0 && <span className="text-[9px] font-bold text-grape-500">+{overflow}</span>}
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 mt-1.5 h-3 w-48 rounded-b-xl bg-gradient-to-br from-grape-400 to-grape" />
    </div>
  );
}

/** Detailed, informational per-tier breakdown (progress %, lock state, counts) —
 * shown alongside the graphical tower on the full topic detail page. */
export function TierProgressCards({ tower }: { tower: TopicTower }) {
  const cat = CATEGORY_MAP[tower.category];
  const topToBottom = [...tower.tiers].reverse();
  return (
    <div className="space-y-2">
      {topToBottom.map((tier) => (
        <TierRow key={tier.difficulty} tier={tier} gradient={cat.gradient} />
      ))}
    </div>
  );
}

function TierRow({ tier, gradient }: { tier: TierProgress; gradient: string }) {
  const percent = tier.required > 0 ? Math.min(100, (tier.completedCount / tier.required) * 100) : 100;
  return (
    <div className="relative rounded-2xl bg-card p-3 transition">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-black text-ink">
          {tier.emoji} {tier.name}
          {tier.mastered && <span aria-hidden>✓</span>}
        </span>
        <span className="text-[11px] font-bold text-muted">
          {tier.completedCount}/{tier.required} mastered
        </span>
      </div>
      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-soft2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
        />
      </div>
    </div>
  );
}

export function TopicTowerCard({ tower }: { tower: TopicTower }) {
  const cat = CATEGORY_MAP[tower.category];
  const currentTier = tower.tiers[tower.currentTierIndex];
  return (
    <Link href={`/tower/${tower.category}`} className="block">
      <div className="overflow-hidden rounded-3xl bg-card card-shadow transition hover:-translate-y-0.5">
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-grape-500">
              {cat.emoji} {cat.name} Tower
            </div>
            <div className="text-lg font-black text-ink">
              {tower.masteredAll ? "Fully Mastered 🏆" : `${currentTier.emoji} ${currentTier.name}`}
            </div>
          </div>
          <div className="rounded-full bg-grape/5 px-3 py-1 text-sm font-bold text-grape-500">
            {tower.floors} {tower.floors === 1 ? "floor" : "floors"}
          </div>
        </div>
        <div className="px-5 pb-4 pt-3">
          <TopicTowerViz tower={tower} compact />
        </div>
      </div>
    </Link>
  );
}
