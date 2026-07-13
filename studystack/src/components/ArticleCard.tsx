"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Article } from "@/lib/types";
import { CoverArt, DifficultyPill, TypePill } from "./ui";
import { USER_MAP } from "@/lib/data/users";
import { CATEGORY_MAP } from "@/lib/data/categories";

export function ArticleCard({
  article,
  index = 0,
  locked = false,
  className = "",
}: {
  article: Article;
  index?: number;
  locked?: boolean;
  className?: string;
}) {
  const author = USER_MAP[article.authorId];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className={`h-full ${className}`}
    >
      <Link href={`/learn/${article.id}`} className="group flex h-full flex-col">
        <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-card card-shadow transition group-hover:-translate-y-1 group-hover:soft-shadow">
          <CoverArt category={article.category} className="h-36 w-full shrink-0" />
          {locked && (
            <span
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur"
              title="Ahead of your level — master easier articles in this topic first"
            >
              🔒 Ahead of your level
            </span>
          )}
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <TypePill type={article.type} />
              <DifficultyPill difficulty={article.difficulty} />
            </div>
            <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-ink group-hover:text-brand-700">
              {article.title}
            </h3>
            <p className="line-clamp-2 text-sm text-muted">{article.summary}</p>
            <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-canvas">{author?.avatar}</span>
                {author?.displayName}
              </span>
              <span className="flex items-center gap-2">
                <span>⏱ {article.readMinutes}m</span>
                <span className="font-bold text-brand-700">+{article.xp} XP</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ArticleRow({ article }: { article: Article }) {
  const author = USER_MAP[article.authorId];
  const c = CATEGORY_MAP[article.category];
  return (
    <Link href={`/learn/${article.id}`} className="group flex gap-3 rounded-2xl bg-card p-3 card-shadow transition hover:-translate-y-0.5">
      <CoverArt category={article.category} className="h-20 w-20 shrink-0 rounded-2xl" emoji={c.emoji} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <TypePill type={article.type} />
        </div>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink group-hover:text-brand-700">
          {article.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
          <span>{author?.avatar} {author?.displayName}</span>
          <span>· ⏱ {article.readMinutes}m</span>
          <span className="font-bold text-brand-700">+{article.xp}</span>
        </div>
      </div>
    </Link>
  );
}

export function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {children}
    </div>
  );
}
