"use client";

import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/data/categories";
import type { TierProgress, TopicTower } from "@/lib/towers";

function TierBand({ tier, gradient }: { tier: TierProgress; gradient: string }) {
  const slotCount = Math.max(tier.required, tier.completedCount, 1);
  const blocks = Array.from({ length: slotCount });
  return (
    <div className={`relative rounded-2xl p-3 transition ${tier.unlocked ? "bg-white" : "bg-black/5"}`}>
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
                : "bg-black/10"
            }`}
          />
        ))}
      </div>
      {!tier.unlocked && <div className="mt-1.5 text-[11px] text-muted">Master the tier below to unlock</div>}
    </div>
  );
}

/** The Knowledge Tower for one topic: three tiers, Foundation at the bottom,
 * Mastery at the top — you climb it by mastering easier material first. */
export function TopicTowerViz({ tower }: { tower: TopicTower }) {
  const cat = CATEGORY_MAP[tower.category];
  const topToBottom = [...tower.tiers].reverse();
  return (
    <div className="space-y-2">
      {topToBottom.map((tier) => (
        <TierBand key={tier.difficulty} tier={tier} gradient={cat.gradient} />
      ))}
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
          <TopicTowerViz tower={tower} />
        </div>
      </div>
    </Link>
  );
}
