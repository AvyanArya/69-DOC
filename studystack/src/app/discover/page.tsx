"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ARTICLES } from "@/lib/content";
import { useStore } from "@/lib/store";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { USER_MAP } from "@/lib/data/users";
import { DifficultyPill, TypePill } from "@/components/ui";
import type { Article } from "@/lib/types";

function shuffled(): Article[] {
  // deterministic-ish shuffle by likes to keep an engaging order
  return [...ARTICLES].sort((a, b) => (b.likes % 97) - (a.likes % 97));
}

export default function DiscoverPage() {
  const feed = useMemo(shuffled, []);

  return (
    <div className="-mt-4 lg:-mt-8">
      <div className="mb-3 flex items-center justify-between lg:mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Discover</h1>
          <p className="text-sm text-muted">Swipe up for the next study ↑</p>
        </div>
      </div>
      <div className="no-scrollbar snap-y-mandatory h-[calc(100vh-11rem)] overflow-y-auto rounded-3xl lg:h-[calc(100vh-9rem)]">
        {feed.map((a, i) => (
          <DiscoverCard key={a.id} article={a} index={i} />
        ))}
      </div>
    </div>
  );
}

function DiscoverCard({ article, index }: { article: Article; index: number }) {
  const { state, dispatch } = useStore();
  const c = CATEGORY_MAP[article.category];
  const author = USER_MAP[article.authorId];
  const liked = state.likes.includes(article.id);
  const bookmarked = state.bookmarks.some((b) => b.articleId === article.id);
  const [shared, setShared] = useState(false);

  async function share() {
    setShared(true);
    setTimeout(() => setShared(false), 1500);
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.summary });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${article.title} — StudyStack`);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <section className="snap-start relative mb-3 flex h-full min-h-[calc(100vh-11rem)] items-end overflow-hidden rounded-3xl lg:min-h-[calc(100vh-9rem)]">
      {/* Background art */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <motion.div
        initial={{ scale: 1.1, opacity: 0.6 }}
        whileInView={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute right-6 top-10 text-8xl opacity-40 drop-shadow-lg"
      >
        {c.emoji}
      </motion.div>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-4 z-10 flex flex-col items-center gap-4 text-white">
        <ActionButton
          emoji={liked ? "❤️" : "🤍"}
          label={(article.likes + (liked ? 1 : 0)).toLocaleString()}
          onClick={() => dispatch({ type: "toggleLike", payload: { articleId: article.id } })}
        />
        <ActionButton
          emoji={bookmarked ? "🔖" : "📑"}
          label={article.bookmarksCount.toLocaleString()}
          onClick={() => dispatch({ type: "toggleBookmark", payload: { articleId: article.id, folder: "Favorites" } })}
        />
        <Link href={`/learn/${article.id}#quiz`} className="flex flex-col items-center gap-1">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-xl backdrop-blur">💬</span>
          <span className="text-xs font-bold">Quiz</span>
        </Link>
        <ActionButton emoji={shared ? "✅" : "🔗"} label={shared ? "Copied" : "Share"} onClick={share} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full p-6 pb-8 text-white">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TypePill type={article.type} className="!bg-white/20 !text-white" />
          <DifficultyPill difficulty={article.difficulty} className="!bg-white/20 !text-white" />
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            {c.emoji} {c.name}
          </span>
        </div>
        <Link href={`/learn/${article.id}`}>
          <h2 className="max-w-lg text-2xl font-black leading-tight drop-shadow-md sm:text-3xl">{article.title}</h2>
        </Link>
        <p className="mt-2 max-w-md text-sm text-white/90 drop-shadow">{article.summary}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-white/85">
          <span>{author?.avatar} {author?.displayName}</span>
          <span>· ⏱ {article.readMinutes}m</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 font-bold">+{article.xp} XP</span>
        </div>
        <Link
          href={`/learn/${article.id}`}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-grape"
        >
          Tap to read →
        </Link>
        {index === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-4 text-center text-xs text-white/80"
          >
            ↑ Swipe up for the next study
          </motion.div>
        )}
      </div>
    </section>
  );
}

function ActionButton({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <motion.span whileTap={{ scale: 0.8 }} className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-xl backdrop-blur">
        {emoji}
      </motion.span>
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
