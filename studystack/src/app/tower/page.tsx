"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { KnowledgeTowerViz } from "@/components/KnowledgeTower";
import { TOWER_STAGES, towerStage, nextTowerStage } from "@/lib/gamification";
import { getArticle } from "@/lib/content";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { DEMO_USERS } from "@/lib/data/users";
import { DifficultyPill } from "@/components/ui";
import type { CompletedArticle } from "@/lib/types";

export default function TowerPage() {
  const { state } = useStore();
  const { towerHeight } = useDerived();
  const [selected, setSelected] = useState<CompletedArticle | null>(null);

  const stage = towerStage(towerHeight);
  const next = nextTowerStage(towerHeight);
  const floors = [...state.completed].reverse();

  const ranking = [
    { name: state.displayName, avatar: state.avatar, height: towerHeight, you: true },
    ...DEMO_USERS.filter((u) => u.id !== "editorial").map((u) => ({ name: u.displayName, avatar: u.avatar, height: u.towerHeight, you: false })),
  ]
    .sort((a, b) => b.height - a.height)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Home</Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">Your Knowledge Tower 🏗️</h1>
        <p className="text-muted">Every study you finish adds a floor. Keep building.</p>
      </div>

      {/* Big tower */}
      <div className="overflow-hidden rounded-3xl gradient-purple p-6 text-white soft-shadow">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white/80">{stage.emoji} {stage.name}</div>
            <div className="text-4xl font-black">{towerHeight} floors</div>
          </div>
          {next && (
            <div className="rounded-2xl bg-white/15 px-4 py-2 text-center">
              <div className="text-xs text-white/80">Next milestone</div>
              <div className="font-bold">{next.emoji} {next.name}</div>
              <div className="text-xs text-white/80">in {next.min - towerHeight}</div>
            </div>
          )}
        </div>
        <div className="mt-2 rounded-3xl bg-white/10 p-2">
          <KnowledgeTowerViz height={towerHeight} completed={state.completed} />
        </div>
        <p className="mt-2 text-center text-sm text-white/85">{stage.description}</p>
      </div>

      {/* Milestones */}
      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">Milestones</h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {TOWER_STAGES.map((s) => {
            const reached = towerHeight >= s.min;
            return (
              <div
                key={s.name}
                className={`w-36 shrink-0 rounded-2xl p-4 text-center card-shadow ${reached ? "bg-white" : "bg-white/50 opacity-60"}`}
              >
                <div className={`text-3xl ${reached ? "" : "grayscale"}`}>{s.emoji}</div>
                <div className="mt-1 text-sm font-bold text-ink">{s.name}</div>
                <div className="text-xs text-muted">{s.min}+ floors</div>
                {reached && <div className="mt-1 text-[11px] font-bold text-emerald-600">✓ Reached</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Floors */}
      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">Floors ({floors.length})</h2>
        {floors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white/60 p-8 text-center text-sm text-muted">
            No floors yet. <Link href="/learn" className="font-semibold text-brand-700">Read your first study →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {floors.map((f, i) => {
              const a = getArticle(f.articleId);
              if (!a) return null;
              const c = CATEGORY_MAP[a.category];
              return (
                <button
                  key={f.articleId + i}
                  onClick={() => setSelected(f)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left card-shadow transition hover:-translate-y-0.5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-sm font-black text-grape-500">
                    {floors.length - i}
                  </span>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.gradient} text-lg`}>{c.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{a.title}</span>
                    <span className="block text-xs text-muted">
                      {new Date(f.completedAt).toLocaleDateString()} · Quiz {Math.round(f.quizScore * 100)}%
                    </span>
                  </span>
                  <span className="text-muted">›</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Tower leaderboard */}
      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">🏆 Tallest towers</h2>
        <div className="rounded-3xl bg-white p-3 card-shadow">
          {ranking.map((r, i) => (
            <div
              key={r.name + i}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.you ? "bg-brand/5" : ""}`}
            >
              <span className="w-6 text-center font-black text-muted">{i + 1}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-lg">{r.avatar}</span>
              <span className="flex-1 text-sm font-bold text-ink">{r.name}{r.you && " (you)"}</span>
              <span className="text-sm font-black text-grape-500">{r.height} 🏗️</span>
            </div>
          ))}
        </div>
      </section>

      {/* Floor detail modal */}
      {selected && (
        <FloorDetail floor={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function FloorDetail({ floor, onClose }: { floor: CompletedArticle; onClose: () => void }) {
  const a = getArticle(floor.articleId);
  if (!a) return null;
  const c = CATEGORY_MAP[a.category];
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl bg-white p-5 soft-shadow lg:bottom-10"
      >
        <div className={`mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${c.gradient} text-2xl`}>{c.emoji}</div>
        <h3 className="text-lg font-black text-ink">{a.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DifficultyPill difficulty={a.difficulty} />
          <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">{c.name}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-canvas p-3">
            <div className="text-xs text-muted">Quiz score</div>
            <div className="font-black text-ink">{Math.round(floor.quizScore * 100)}%</div>
          </div>
          <div className="rounded-2xl bg-canvas p-3">
            <div className="text-xs text-muted">Completed</div>
            <div className="font-black text-ink">{new Date(floor.completedAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href={`/learn/${a.id}`} className="flex-1 rounded-2xl gradient-pink py-2.5 text-center text-sm font-bold text-white">
            Re-read
          </Link>
          <button onClick={onClose} className="rounded-2xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink">Close</button>
        </div>
      </motion.div>
    </>
  );
}
