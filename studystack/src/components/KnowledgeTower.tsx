"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CATEGORY_MAP } from "@/lib/data/categories";
import type { TierProgress, TopicTower } from "@/lib/towers";

// ─── The actual tower graphic ────────────────────────────────────────────────
// One floor block per article slot in the topic: coloured + the category emoji
// once completed, a dashed outline while unlocked-but-unread, and a grey
// locked block (with a padlock) for slots in tiers not unlocked yet. Blocks
// stack bottom-to-top and taper, so the whole thing actually reads as a tower
// silhouette — colour creeping up from the ground as you master more.

interface Row {
  key: string;
  state: "done" | "empty" | "locked";
}

function buildRows(tower: TopicTower): Row[] {
  const rows: Row[] = [];
  for (const tier of tower.tiers) {
    const slots = Math.max(tier.required, tier.completedCount);
    for (let i = 0; i < slots; i++) {
      rows.push({
        key: `${tier.difficulty}-${i}`,
        state: i < tier.completedCount ? "done" : tier.unlocked ? "empty" : "locked",
      });
    }
  }
  return rows;
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
  const rows = buildRows(tower);
  const capstone = capstoneFor(tower);
  const maxRows = compact ? 10 : 24;
  const shown = rows.slice(0, maxRows);
  const overflow = rows.length - shown.length;

  return (
    <div
      className={`relative flex flex-col items-center justify-end overflow-hidden rounded-3xl bg-gradient-to-b from-sky1 to-sky2 px-4 pb-3 pt-6 ${
        compact ? "h-56" : "h-[26rem]"
      }`}
    >
      <div className="pointer-events-none absolute left-5 top-4 text-lg opacity-60">☁️</div>
      <div className="pointer-events-none absolute right-8 top-9 text-2xl opacity-50">☁️</div>
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-sm opacity-40">☁️</div>

      <div className="relative z-10 flex flex-1 flex-col-reverse items-center justify-start gap-1 overflow-hidden">
        {overflow > 0 && (
          <div className="mb-1 text-[10px] font-bold text-grape-500">+{overflow} more floors above</div>
        )}
        {[...shown].reverse().map((row, i) => {
          const idxFromBottom = shown.length - 1 - i;
          const width = Math.max(52, 140 - idxFromBottom * 5);
          return (
            <motion.div
              key={row.key}
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: Math.min(idxFromBottom, 10) * 0.03, type: "spring", stiffness: 220, damping: 20 }}
              style={{ width }}
              className={`grid h-5 shrink-0 place-items-center rounded-md text-[11px] shadow-sm ${
                row.state === "done"
                  ? `bg-gradient-to-br ${cat.gradient}`
                  : row.state === "empty"
                    ? "border border-dashed border-grape-300 bg-card/50"
                    : "bg-soft2"
              }`}
            >
              {row.state === "done" && <span aria-hidden>{cat.emoji}</span>}
              {row.state === "locked" && <span aria-hidden className="opacity-70">🔒</span>}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
        className="relative z-10 my-1 text-4xl"
      >
        {capstone}
      </motion.div>
      <div className="relative z-10 h-3 w-40 rounded-b-xl bg-gradient-to-br from-grape-400 to-grape" />
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
  const slotCount = Math.max(tier.required, tier.completedCount, 1);
  const blocks = Array.from({ length: slotCount });
  return (
    <div className={`relative rounded-2xl p-3 transition ${tier.unlocked ? "bg-card" : "bg-soft"}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-black text-ink">
          {tier.emoji} {tier.name}
          {!tier.unlocked && <span aria-hidden>🔒</span>}
          {tier.mastered && <span aria-hidden>✓</span>}
        </span>
        <span className="text-[11px] font-bold text-muted">
          {tier.completedCount}/{tier.required} mastered
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {blocks.map((_, i) => (
          <div
            key={i}
            className={`h-4 flex-1 rounded-md ${
              i < tier.completedCount
                ? `bg-gradient-to-br ${gradient} ${tier.unlocked ? "" : "opacity-60 grayscale"}`
                : "bg-soft2"
            }`}
          />
        ))}
      </div>
      {!tier.unlocked && <div className="mt-1.5 text-[11px] text-muted">Master the tier below to unlock</div>}
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
