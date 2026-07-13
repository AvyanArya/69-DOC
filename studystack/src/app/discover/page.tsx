"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ARTICLES } from "@/lib/content";
import { useStore } from "@/lib/store";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { USER_MAP } from "@/lib/data/users";
import { DifficultyPill, TypePill } from "@/components/ui";
import { isWithinGradeCeiling } from "@/lib/data/gradeLevels";
import type { Article, GradeLevel } from "@/lib/types";

function buildFeed(grade: GradeLevel): Article[] {
  return [...ARTICLES].sort((a, b) => {
    const aOk = isWithinGradeCeiling(a.difficulty, grade) ? 0 : 1;
    const bOk = isWithinGradeCeiling(b.difficulty, grade) ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    return (b.likes % 97) - (a.likes % 97);
  });
}

// A little visual variety beyond the category emoji — pick up to 2 extra icons
// that actually relate to this specific article's content.
const ICON_KEYWORDS: [RegExp, string][] = [
  [/\bdna\b|genome|gene\b|genes\b/i, "🧬"],
  [/\bbrain|neuron|cortex|memory\b/i, "🧠"],
  [/\bheart|blood pressure|cardiac/i, "❤️"],
  [/\bvaccine|immun/i, "💉"],
  [/\bvirus|bacteria|pathogen|infection/i, "🦠"],
  [/\bsleep|dream/i, "😴"],
  [/\bsugar|diet|nutrition|food\b/i, "🍎"],
  [/\bcancer|tumour|tumor/i, "🎗️"],
  [/\bdrug|medicine|pill|antibiotic/i, "💊"],
  [/\bskin|sunburn|sunscreen/i, "🧴"],
  [/\beye|vision|see\b/i, "👁️"],
  [/\bmuscle|exercise|workout/i, "💪"],
  [/\bbone\b/i, "🦴"],
  [/\blung|breath/i, "🫁"],
  [/\bwater\b/i, "💧"],
  [/\bsun\b|uv light|ultraviolet/i, "☀️"],
  [/\blight\b|photon/i, "💡"],
  [/\benergy\b/i, "⚡"],
  [/\bstress|anxiety|cortisol/i, "😣"],
  [/\bsound|hearing/i, "🔊"],
  [/\batom|quantum/i, "⚛️"],
  [/\bchemical|reaction\b/i, "⚗️"],
  [/\bplant|photosynthesis/i, "🌱"],
  [/\banimal|species/i, "🐾"],
  [/\bspace|planet|star\b/i, "🌌"],
  [/\bheat|temperature/i, "🌡️"],
  [/\belectric/i, "🔌"],
  [/\bmoney|invest|budget|saving|stock|tax/i, "💰"],
  [/\bmarket|business|entrepreneur/i, "📈"],
  [/\bmood|emotion|happy|feeling/i, "😊"],
  [/\bfossil|dinosaur/i, "🦴"],
];

function topicIcons(article: Article, mainEmoji: string): string[] {
  const hay = `${article.title} ${article.summary} ${article.facts.join(" ")}`;
  const found: string[] = [];
  for (const [re, emoji] of ICON_KEYWORDS) {
    if (found.length >= 2) break;
    if (emoji === mainEmoji || found.includes(emoji)) continue;
    if (re.test(hay)) found.push(emoji);
  }
  return found;
}

export default function DiscoverPage() {
  const { state } = useStore();
  const feed = useMemo(() => buildFeed(state.gradeLevel), [state.gradeLevel]);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const lockRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed;
    return feed.filter((a) => {
      const hay = `${a.title} ${a.summary} ${a.category} ${a.difficulty}`.toLowerCase();
      return hay.includes(q);
    });
  }, [feed, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % Math.max(visible.length, 1));
  }, [visible.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + Math.max(visible.length, 1)) % Math.max(visible.length, 1));
  }, [visible.length]);

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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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

  const article = visible[index];

  return (
    <div className="-mt-4 lg:-mt-8">
      <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-ink">Discover</h1>
          <p className="truncate text-sm text-muted">
            {visible.length === 0 ? "No matches" : `${index + 1} / ${visible.length}`} · ↑/↓ or swipe for the next study
          </p>
        </div>
        <button
          onClick={() => setShowSearch((s) => !s)}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg transition ${
            showSearch ? "gradient-purple text-white" : "bg-card text-ink card-shadow"
          }`}
          aria-label="Search"
        >
          🔍
        </button>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 card-shadow">
              <span className="text-muted">🔍</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search studies to discover…"
                className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-sm text-muted hover:text-ink" aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-1 w-full overflow-hidden rounded-full bg-soft">
        <motion.div
          className="h-full gradient-pink"
          animate={{ width: visible.length ? `${((index + 1) / visible.length) * 100}%` : "0%" }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>

      <div
        className="relative mt-3 h-[calc(100vh-13rem)] overflow-hidden rounded-3xl lg:h-[calc(100vh-11rem)]"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {article ? (
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <DiscoverCard key={article.id} article={article} direction={direction} />
          </AnimatePresence>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-card text-center">
            <div className="text-5xl">🔭</div>
            <h3 className="text-lg font-bold text-ink">No studies match &ldquo;{query}&rdquo;</h3>
            <button onClick={() => setQuery("")} className="text-sm font-semibold text-brand-700">Clear search</button>
          </div>
        )}

        {/* On-screen up/down controls */}
        {visible.length > 1 && (
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
        )}
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
  const completedEntry = state.completed.find((cmp) => cmp.articleId === article.id);
  const alreadyRead = !!completedEntry;
  const canUnmark = completedEntry?.method === "marked";
  const extraIcons = useMemo(() => topicIcons(article, c.emoji), [article, c.emoji]);
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const [justMarked, setJustMarked] = useState(false);

  async function share() {
    const url = `${window.location.origin}/learn/${article.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.summary, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setShareState("done");
      setTimeout(() => setShareState("idle"), 1600);
    } catch {
      /* user cancelled the share sheet */
    }
  }

  function toggleRead() {
    if (alreadyRead) {
      if (canUnmark) dispatch({ type: "unmarkRead", payload: { articleId: article.id } });
      return;
    }
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
      {/* Background art — layered gradient, pattern, shine and topical icons */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.5) 45%, transparent 60%)" }}
        animate={{ backgroundPositionX: ["-40%", "140%"] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <motion.div
        animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-6 top-10 text-8xl opacity-40 drop-shadow-lg"
      >
        {c.emoji}
      </motion.div>
      {extraIcons.map((icon, i) => (
        <motion.div
          key={icon}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          className="pointer-events-none absolute text-4xl opacity-30 drop-shadow"
          style={{ left: i === 0 ? "10%" : "22%", top: i === 0 ? "14%" : "38%" }}
        >
          {icon}
        </motion.div>
      ))}
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
          label={alreadyRead ? (canUnmark ? "Tap to undo" : "Read") : "Mark read"}
          onClick={toggleRead}
          pulse={justMarked}
          disabled={alreadyRead && !canUnmark}
        />
        <Link href={`/learn/${article.id}#quiz`} className="flex flex-col items-center gap-1">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-xl backdrop-blur">💬</span>
          <span className="text-xs font-bold">Quiz</span>
        </Link>
        <ActionButton emoji={shareState === "done" ? "✅" : "🔗"} label={shareState === "done" ? "Copied!" : "Share"} onClick={share} />
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
        {article.facts[0] && (
          <p className="mt-1.5 max-w-md text-sm text-white/75 drop-shadow">
            <span aria-hidden>💡 </span>
            {article.facts[0]}
          </p>
        )}
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
  disabled,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  pulse?: boolean;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-1 ${disabled ? "opacity-80" : ""}`}>
      <motion.span
        whileTap={disabled ? {} : { scale: 0.8 }}
        animate={pulse ? { scale: [1, 1.3, 1] } : {}}
        className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-xl backdrop-blur"
      >
        {emoji}
      </motion.span>
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
