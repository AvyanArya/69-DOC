"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ARTICLES } from "@/lib/content";
import { useStore } from "@/lib/store";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { USER_MAP } from "@/lib/data/users";
import { DifficultyPill, TypePill } from "@/components/ui";
import type { Article } from "@/lib/types";

function shuffled(): Article[] {
  return [...ARTICLES].sort((a, b) => (b.likes % 97) - (a.likes % 97));
}

export default function DiscoverPage() {
  const feed = useMemo(shuffled, []);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const lockRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % feed.length);
  }, [feed.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + feed.length) % feed.length);
  }, [feed.length]);

  function withCooldown(fn: () => void) {
    if (lockRef.current) return;
    lockRef.current = true;
    fn();
    setTimeout(() => {
      lockRef.current = false;
    }, 450);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        withCooldown(goNext);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        withCooldown(goPrev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaY) < 12) return;
    withCooldown(e.deltaY > 0 ? goNext : goPrev);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (Math.abs(delta) < 60) return;
    withCooldown(delta < 0 ? goNext : goPrev);
  }

  const article = feed[index];

  return (
    <div className="-mt-4 lg:-mt-8">
      <div className="mb-3 flex items-center justify-between lg:mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Discover</h1>
          <p className="text-sm text-muted">
            {index + 1} / {feed.length} · ↑/↓ or swipe for the next study
          </p>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-black/5">
        <motion.div
          className="h-full gradient-pink"
          animate={{ width: `${((index + 1) / feed.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>

      <div
        className="relative mt-3 h-[calc(100vh-13rem)] overflow-hidden rounded-3xl lg:h-[calc(100vh-11rem)]"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <DiscoverCard key={article.id} article={article} direction={direction} />
        </AnimatePresence>

        {/* On-screen up/down controls */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => withCooldown(goPrev)}
            aria-label="Previous study"
            className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-lg text-white backdrop-blur transition hover:bg-black/60"
          >
            ▲
          </button>
          <button
            onClick={() => withCooldown(goNext)}
            aria-label="Next study"
            className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-lg text-white backdrop-blur transition hover:bg-black/60"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

const SPARKLES = ["✨", "⭐", "💫"];

function DiscoverCard({ article, direction }: { article: Article; direction: 1 | -1 }) {
  const { state, dispatch } = useStore();
  const c = CATEGORY_MAP[article.category];
  const author = USER_MAP[article.authorId];
  const liked = state.likes.includes(article.id);
  const bookmarked = state.bookmarks.some((b) => b.articleId === article.id);
  const alreadyRead = state.completed.some((cmp) => cmp.articleId === article.id);
  const [shared, setShared] = useState(false);
  const [justMarked, setJustMarked] = useState(false);

  async function share() {
    setShared(true);
    setTimeout(() => setShared(false), 1500);
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.summary, url: window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${article.title} — ${article.summary} · via StudyStack`);
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  function markRead() {
    if (alreadyRead) return;
    dispatch({
      type: "markRead",
      payload: { articleId: article.id, xp: Math.round(article.xp * 0.4), coins: Math.round(article.coins * 0.4) },
    });
    setJustMarked(true);
  }

  return (
    <motion.section
      custom={direction}
      variants={{
        enter: (dir: 1 | -1) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0.4 }),
        center: { y: 0, opacity: 1 },
        exit: (dir: 1 | -1) => ({ y: dir > 0 ? "-100%" : "100%", opacity: 0.4 }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ y: { type: "spring", stiffness: 260, damping: 30 }, opacity: { duration: 0.15 } }}
      className="absolute inset-0 flex items-end overflow-hidden rounded-3xl"
    >
      {/* Background art */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <motion.div
        animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-6 top-10 text-8xl opacity-40 drop-shadow-lg"
      >
        {c.emoji}
      </motion.div>
      {SPARKLES.map((s, i) => (
        <motion.span
          key={s}
          className="pointer-events-none absolute text-xl opacity-70"
          style={{ left: `${15 + i * 28}%`, top: `${20 + i * 12}%` }}
          animate={{ y: [0, -18, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        >
          {s}
        </motion.span>
      ))}

      {/* Right action rail */}
      <div className="absolute bottom-28 right-4 z-10 flex flex-col items-center gap-3.5 text-white">
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
        <ActionButton
          emoji={alreadyRead ? "✅" : "📘"}
          label={alreadyRead ? "Read" : "Mark read"}
          onClick={markRead}
          pulse={justMarked}
        />
        <Link href={`/learn/${article.id}#quiz`} className="flex flex-col items-center gap-1">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-xl backdrop-blur">💬</span>
          <span className="text-xs font-bold">Quiz</span>
        </Link>
        <ActionButton emoji={shared ? "✅" : "🔗"} label={shared ? "Shared" : "Share"} onClick={share} />
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
      </div>
    </motion.section>
  );
}

function ActionButton({
  emoji,
  label,
  onClick,
  pulse,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  pulse?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <motion.span
        whileTap={{ scale: 0.8 }}
        animate={pulse ? { scale: [1, 1.3, 1] } : {}}
        className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-xl backdrop-blur"
      >
        {emoji}
      </motion.span>
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
