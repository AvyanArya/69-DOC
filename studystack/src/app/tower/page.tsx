"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { allTopicTowers } from "@/lib/towers";
import { TopicTowerCard } from "@/components/KnowledgeTower";
import { StatTile } from "@/components/ui";

export default function TowerOverviewPage() {
  const { state } = useStore();
  const towers = allTopicTowers(state.completed);
  const totalFloors = state.completed.length;
  const masteredCount = towers.filter((t) => t.masteredAll).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Home</Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">Knowledge Towers 🏗️</h1>
        <p className="text-muted">
          Every topic has its own tower — Foundation at the bottom, Mastery at the top. Master a tier to unlock the
          next, tougher one above it.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile emoji="🧱" value={totalFloors} label="Total floors" />
        <StatTile emoji="🏆" value={masteredCount} label="Topics mastered" />
        <StatTile emoji="📚" value={towers.length} label="Topics" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {towers.map((tower) => (
          <TopicTowerCard key={tower.category} tower={tower} />
        ))}
      </div>
    </div>
  );
}
