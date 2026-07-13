"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { getTopicTower, demoUserTopicFloors } from "@/lib/towers";
import { TopicTowerViz, TierProgressCards } from "@/components/KnowledgeTower";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { DEMO_USERS } from "@/lib/data/users";
import { DifficultyPill, EmptyState } from "@/components/ui";
import type { Article, Category, CompletedArticle } from "@/lib/types";

export default function TopicTowerPage() {
  const params = useParams();
  const category = (Array.isArray(params.category) ? params.category[0] : params.category) as Category;
  const { state } = useStore();
  const [selected, setSelected] = useState<{ article: Article; done?: CompletedArticle } | null>(null);

  const cat = CATEGORY_MAP[category];
  if (!cat) {
    return <EmptyState emoji="🔭" title="Topic not found" body="Pick a topic tower from the overview." />;
  }

  const tower = getTopicTower(category, state.completed);
  const tiersTopToBottom = [...tower.tiers].reverse();

  const ranking = [
    { name: state.displayName, avatar: state.avatar, floors: tower.floors, you: true },
    ...DEMO_USERS.filter((u) => u.id !== "editorial").map((u) => ({
      name: u.displayName,
      avatar: u.avatar,
      floors: demoUserTopicFloors(u.id, u.articlesRead, category),
      you: false,
    })),
  ].sort((a, b) => b.floors - a.floors);

  return (
    <div className="space-y-6">
      <Link href="/tower" className="text-sm font-semibold text-muted hover:text-ink">← All towers</Link>

      <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${cat.gradient} p-6 text-white soft-shadow`}>
        <div className="text-5xl">{cat.emoji}</div>
        <h1 className="mt-2 text-3xl font-black">{cat.name} Tower</h1>
        <p className="mt-1 max-w-md text-white/90">{cat.blurb}</p>
        <div className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
          {tower.floors} {tower.floors === 1 ? "floor" : "floors"}
          {tower.masteredAll && " · Fully mastered 🏆"}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 card-shadow">
        <TopicTowerViz tower={tower} />
      </div>

      <div className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="mb-3 text-sm font-black text-ink">Tier progress</h2>
        <TierProgressCards tower={tower} />
      </div>

      {tiersTopToBottom.map((tier) => (
        <section key={tier.difficulty}>
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-base font-black text-ink">
            {tier.emoji} {tier.name}
            {!tier.unlocked && <span aria-hidden>🔒</span>}
          </h2>
          {tier.articles.length === 0 ? (
            <div className="rounded-2xl bg-card/60 p-4 text-center text-sm text-muted">No articles yet in this tier.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {tier.articles.map((a) => {
                const done = state.completed.find((c) => c.articleId === a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected({ article: a, done })}
                    className={`flex items-center gap-3 rounded-2xl p-3 text-left card-shadow transition hover:-translate-y-0.5 ${
                      done ? "bg-card" : tier.unlocked ? "bg-card/80" : "bg-card/40 opacity-70"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas text-lg">
                      {done ? "✅" : tier.unlocked ? "📖" : "🔒"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{a.title}</span>
                      <span className="block text-xs text-muted">
                        {done
                          ? `Quiz ${Math.round(done.quizScore * 100)}% · ${new Date(done.completedAt).toLocaleDateString()}`
                          : tier.unlocked
                            ? "Not read yet"
                            : "Unlocks after mastering the tier below"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}

      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">🏆 {cat.name} leaderboard</h2>
        <div className="rounded-3xl bg-card p-3 card-shadow">
          {ranking.map((r, i) => (
            <div key={r.name + i} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.you ? "bg-brand/5" : ""}`}>
              <span className="w-6 text-center font-black text-muted">{i + 1}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-lg">{r.avatar}</span>
              <span className="flex-1 text-sm font-bold text-ink">
                {r.name}
                {r.you && " (you)"}
              </span>
              <span className="text-sm font-black text-grape-500">{r.floors} 🏗️</span>
            </div>
          ))}
        </div>
      </section>

      {selected && <FloorDetail article={selected.article} done={selected.done} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FloorDetail({
  article,
  done,
  onClose,
}: {
  article: Article;
  done?: CompletedArticle;
  onClose: () => void;
}) {
  const c = CATEGORY_MAP[article.category];
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl bg-card p-5 soft-shadow lg:bottom-10"
      >
        <div className={`mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${c.gradient} text-2xl`}>{c.emoji}</div>
        <h3 className="text-lg font-black text-ink">{article.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DifficultyPill difficulty={article.difficulty} />
          <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">{c.name}</span>
        </div>
        {done ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-canvas p-3">
              <div className="text-xs text-muted">Quiz score</div>
              <div className="font-black text-ink">{Math.round(done.quizScore * 100)}%</div>
            </div>
            <div className="rounded-2xl bg-canvas p-3">
              <div className="text-xs text-muted">Completed</div>
              <div className="font-black text-ink">{new Date(done.completedAt).toLocaleDateString()}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-canvas p-3 text-sm text-muted">Not read yet — this floor is still empty.</div>
        )}
        <div className="mt-4 flex gap-2">
          <Link href={`/learn/${article.id}`} className="flex-1 rounded-2xl gradient-pink py-2.5 text-center text-sm font-bold text-white">
            {done ? "Re-read" : "Start reading"}
          </Link>
          <button onClick={onClose} className="rounded-2xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink">Close</button>
        </div>
      </motion.div>
    </>
  );
}
