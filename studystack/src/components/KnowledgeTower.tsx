"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { towerStage, nextTowerStage } from "@/lib/gamification";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { getArticle } from "@/lib/content";
import type { CompletedArticle } from "@/lib/types";

/** A stylised, animated block tower whose size reflects articles completed. */
export function KnowledgeTowerViz({
  height,
  completed = [],
  compact = false,
}: {
  height: number;
  completed?: CompletedArticle[];
  compact?: boolean;
}) {
  const stage = towerStage(height);
  // Show up to 14 recent blocks, most recent on top
  const blocks = [...completed].slice(-14).reverse();
  const filler = Math.max(0, Math.min(height, 8) - blocks.length);

  return (
    <div className={`relative flex flex-col items-center justify-end ${compact ? "h-44" : "h-64"}`}>
      {/* sky glow */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-violet-100/60 to-transparent" />
      <div className="absolute right-4 top-3 text-2xl opacity-70">☁️</div>
      <div className="absolute left-5 top-8 text-lg opacity-50">☁️</div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="mb-1 text-4xl"
      >
        {stage.emoji}
      </motion.div>

      <div className="flex flex-col-reverse items-center gap-0.5">
        {blocks.map((b, i) => {
          const cat = getArticle(b.articleId)?.category;
          const c = cat ? CATEGORY_MAP[cat] : null;
          const width = 70 + Math.min(i, 6) * 8;
          return (
            <motion.div
              key={b.articleId + i}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 18 }}
              style={{ width }}
              className={`grid h-5 place-items-center rounded-md bg-gradient-to-br ${c?.gradient ?? "from-slate-300 to-slate-400"} text-[10px] shadow-sm`}
              title={getArticle(b.articleId)?.title}
            >
              <span aria-hidden className="drop-shadow-sm">{c?.emoji}</span>
            </motion.div>
          );
        })}
        {Array.from({ length: filler }).map((_, i) => (
          <div
            key={`f-${i}`}
            style={{ width: 70 + Math.min(blocks.length + i, 6) * 8 }}
            className="h-5 rounded-md bg-gradient-to-br from-violet-200 to-violet-300"
          />
        ))}
        {/* base */}
        <div className="h-3 w-32 rounded-b-lg bg-gradient-to-br from-grape-400 to-grape" />
      </div>
    </div>
  );
}

export function TowerCard({ height, completed }: { height: number; completed: CompletedArticle[] }) {
  const stage = towerStage(height);
  const next = nextTowerStage(height);
  const toNext = next ? next.min - height : 0;
  return (
    <Link href="/tower" className="block">
      <div className="overflow-hidden rounded-3xl bg-card card-shadow transition hover:-translate-y-0.5">
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-grape-500">Knowledge Tower</div>
            <div className="text-lg font-black text-ink">{stage.name}</div>
          </div>
          <div className="rounded-full bg-grape/5 px-3 py-1 text-sm font-bold text-grape-500">
            {height} {height === 1 ? "floor" : "floors"}
          </div>
        </div>
        <KnowledgeTowerViz height={height} completed={completed} compact />
        <div className="px-5 pb-4 pt-1 text-center text-sm text-muted">
          {next ? (
            <>
              <b className="text-ink">{toNext}</b> more to reach{" "}
              <b className="text-ink">
                {next.emoji} {next.name}
              </b>
            </>
          ) : (
            <>You’ve built the ultimate City of Knowledge 🌆</>
          )}
        </div>
      </div>
    </Link>
  );
}
