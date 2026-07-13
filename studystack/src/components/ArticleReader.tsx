"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Article, Quiz, GlossaryTerm, Reference } from "@/lib/types";
import { GLOSSARY_MAP } from "@/lib/data/glossary";
import { USER_MAP } from "@/lib/data/users";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { useStore } from "@/lib/store";
import { Button, CoverArt, DifficultyPill, TypePill } from "./ui";
import { QuizRunner } from "./Quiz";
import { ArticleRow } from "./ArticleCard";
import { buildComments, ARTICLES } from "@/lib/content";

// Wrap glossary terms in paragraph text with tappable highlights. Memoized so
// that unrelated state changes elsewhere on the page (liking, bookmarking)
// don't force every paragraph to redo its regex split on every render.
const HighlightedText = memo(function HighlightedText({
  text,
  terms,
  onTerm,
}: {
  text: string;
  terms: GlossaryTerm[];
  onTerm: (t: GlossaryTerm) => void;
}) {
  if (terms.length === 0) return <>{text}</>;
  // Build a regex of all term words (longest first)
  const escaped = terms
    .map((t) => t.term.split(" ")[0]) // match first word for multiword terms
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => {
        const match = terms.find((t) => t.term.toLowerCase().startsWith(part.toLowerCase()) && part.length > 2);
        if (match && re.test(part)) {
          return (
            <button
              key={i}
              onClick={() => onTerm(match)}
              className="mx-0.5 rounded-md bg-brand/10 px-1 font-semibold text-brand-700 underline decoration-brand/40 decoration-dotted underline-offset-2 hover:bg-brand/20"
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
});

function ReferenceItem({ reference, index }: { reference: Reference; index: number }) {
  const [copied, setCopied] = useState(false);

  async function copyCitation() {
    const citation = `${reference.authors} (${reference.year}). ${reference.label}. ${reference.source}.`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl bg-canvas p-3">
      <div className="flex gap-2 text-sm text-muted">
        <span className="font-bold text-ink">{index + 1}.</span>
        <span>
          <b className="text-ink">{reference.authors}</b> ({reference.year}). {reference.label}. <i>{reference.source}</i>.{" "}
          <a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
            search →
          </a>
        </span>
      </div>
      <button
        onClick={copyCitation}
        className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold text-ink card-shadow hover:text-brand-700"
        title="Copy citation"
      >
        {copied ? "✅ Copied" : "📋 Copy"}
      </button>
    </li>
  );
}

export function ArticleReader({ article, quiz }: { article: Article; quiz: Quiz }) {
  const { state, dispatch } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const author = USER_MAP[article.authorId];
  const cat = CATEGORY_MAP[article.category];
  const glossaryTerms = useMemo(
    () => article.terms.map((t) => GLOSSARY_MAP[t]).filter(Boolean),
    [article.terms],
  );
  const comments = useMemo(() => buildComments(article.id), [article.id]);
  const liked = state.likes.includes(article.id);
  const bookmarked = state.bookmarks.some((b) => b.articleId === article.id);
  const completed = state.completed.some((c) => c.articleId === article.id);

  const related = useMemo(
    () => ARTICLES.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 4),
    [article.category, article.id],
  );

  // Track reading progress from window scroll
  useEffect(() => {
    function onScroll() {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const pct = Math.round((scrolled / Math.max(total, 1)) * 100);
      setProgress(pct);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Persist progress (throttled by percent buckets)
  useEffect(() => {
    if (progress > 0 && progress < 100 && !completed) {
      dispatch({ type: "setProgress", payload: { articleId: article.id, percent: progress } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(progress / 10)]);

  return (
    <div ref={scrollRef} className="relative">
      {/* Top progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
        <div className="h-full gradient-pink transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <article className="space-y-6">
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          ← Back to Learn
        </Link>

        <CoverArt category={article.category} className="h-52 w-full rounded-3xl sm:h-64" big />

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <TypePill type={article.type} />
            <DifficultyPill difficulty={article.difficulty} />
            <Link href={`/topic/${article.category}`} className="rounded-full bg-grape/5 px-2.5 py-1 text-xs font-semibold text-grape-500">
              {cat.emoji} {cat.name}
            </Link>
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-tight text-ink">{article.title}</h1>
          <div className="flex items-center justify-between">
            <Link href={`/user/${author?.id}`} className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-lg">{author?.avatar}</span>
              <span>
                <span className="block text-sm font-bold text-ink">{author?.displayName}</span>
                <span className="block text-xs text-muted">
                  {new Date(article.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ⏱ {article.readMinutes} min · {progress}% read
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch({ type: "toggleLike", payload: { articleId: article.id } })}
                className={`grid h-10 w-10 place-items-center rounded-full text-lg transition ${liked ? "bg-brand/10" : "hover:bg-soft"}`}
                aria-label="Like"
              >
                {liked ? "❤️" : "🤍"}
              </button>
              <button
                onClick={() => dispatch({ type: "toggleBookmark", payload: { articleId: article.id, folder: "Favorites" } })}
                className={`grid h-10 w-10 place-items-center rounded-full text-lg transition ${bookmarked ? "bg-grape/10" : "hover:bg-soft"}`}
                aria-label="Bookmark"
              >
                {bookmarked ? "🔖" : "📑"}
              </button>
            </div>
          </div>
        </header>

        {/* Summary card */}
        <div className="rounded-3xl bg-grape/5 p-5">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-grape-500">Summary</div>
          <p className="text-[15px] leading-relaxed text-ink">{article.summary}</p>
        </div>

        {/* Key takeaways */}
        <div className="rounded-3xl border-2 border-brand/15 bg-brand/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-brand-700">🎯 Key takeaways</div>
          <ul className="space-y-2">
            {article.keyTakeaways.map((k, i) => (
              <li key={i} className="flex gap-2 text-[15px] text-ink">
                <span className="text-brand-700">•</span>
                <HighlightedText text={k} terms={glossaryTerms} onTerm={setTerm} />
              </li>
            ))}
          </ul>
        </div>

        {/* Body */}
        <div className="prose-reading">
          {article.sections.map((s, si) => (
            <section key={si}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p, pi) => (
                <p key={pi}>
                  <HighlightedText text={p} terms={glossaryTerms} onTerm={setTerm} />
                </p>
              ))}
              {si === 1 && (
                <figure className="my-6 overflow-hidden rounded-3xl">
                  <CoverArt category={article.category} className="h-40 w-full" />
                  <figcaption className="mt-2 text-center text-xs text-muted">
                    Figure {si}. Illustrative concept art for {cat.name.toLowerCase()}.
                  </figcaption>
                </figure>
              )}
            </section>
          ))}
        </div>

        {/* Important facts */}
        <div className="rounded-3xl bg-canvas p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-grape-500">⭐ Important facts</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {article.importantFacts.map((f, i) => (
              <div key={i} className="rounded-2xl bg-card p-3 text-sm text-ink card-shadow">
                <HighlightedText text={f} terms={glossaryTerms} onTerm={setTerm} />
              </div>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="rounded-3xl border border-line bg-card p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-black text-ink">📚 References</div>
          <p className="mb-3 text-xs text-muted">Every claim above traces back to one of these sources.</p>
          <ol className="space-y-2 text-sm">
            {article.references.map((r, i) => (
              <ReferenceItem key={i} reference={r} index={i} />
            ))}
          </ol>
        </div>

        {/* Quiz */}
        <section id="quiz" className="scroll-mt-20">
          {completed && !showQuiz ? (
            <div className="rounded-3xl bg-emerald-50 p-6 text-center">
              <div className="text-4xl">✅</div>
              <h3 className="mt-2 text-lg font-black text-emerald-700">You’ve completed this study</h3>
              <p className="mt-1 text-sm text-emerald-700/80">It’s part of your Knowledge Tower. Want to try the quiz again?</p>
              <div className="mt-3">
                <Button variant="soft" onClick={() => setShowQuiz(true)}>Retake quiz</Button>
              </div>
            </div>
          ) : (
            <>
              <QuizRunner article={article} quiz={quiz} />
              <button
                onClick={() =>
                  dispatch({
                    type: "markRead",
                    payload: { articleId: article.id, xp: Math.round(article.xp * 0.4), coins: Math.round(article.coins * 0.4) },
                  })
                }
                className="mt-3 w-full text-center text-xs font-semibold text-muted hover:text-brand-700"
              >
                Already know this? Just mark as read for partial credit →
              </button>
            </>
          )}
        </section>

        {/* Comments */}
        <section>
          <div className="mb-3 flex items-center gap-2 text-lg font-black text-ink">💬 Comments ({comments.length})</div>
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-card p-3 card-shadow">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-lg">{state.avatar}</span>
            <input
              placeholder="Add a thoughtful comment…"
              className="flex-1 bg-transparent text-sm outline-none"
              aria-label="Add comment"
            />
            <Button size="sm" variant="soft">Post</Button>
          </div>
          <div className="space-y-3">
            {comments.map((c) => {
              const cAuthor = USER_MAP[c.authorId];
              return (
                <div key={c.id} className="rounded-2xl bg-card p-4 card-shadow">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas">{cAuthor?.avatar}</span>
                    <span className="text-sm font-bold text-ink">{cAuthor?.displayName}</span>
                    <span className="text-xs text-muted">· {new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink">{c.body}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-muted">
                    <button className="hover:text-brand-700">❤️ {c.likes}</button>
                    <button className="hover:text-brand-700">Reply</button>
                    <button className="hover:text-brand-700">Report</button>
                  </div>
                  {c.replies?.map((r) => {
                    const rAuthor = USER_MAP[r.authorId];
                    return (
                      <div key={r.id} className="ml-6 mt-3 rounded-2xl bg-canvas p-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-card">{rAuthor?.avatar}</span>
                          <span className="text-sm font-bold text-ink">{rAuthor?.displayName}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink">{r.body}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section>
            <div className="mb-3 text-lg font-black text-ink">🔗 Related studies</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {related.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Term popover */}
      <AnimatePresence>
        {term && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setTerm(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl bg-card p-5 soft-shadow lg:bottom-10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand text-lg text-white">📖</span>
                  <div>
                    <div className="text-xs font-bold uppercase text-brand-700">Definition</div>
                    <div className="text-lg font-black text-ink">{term.term}</div>
                  </div>
                </div>
                <button onClick={() => setTerm(null)} className="text-muted hover:text-ink" aria-label="Close">✕</button>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">{term.definition}</p>
              <div className="mt-3 rounded-2xl bg-canvas p-2 text-center text-xs text-muted">
                ✨ Tap any highlighted term while reading to learn what it means.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
