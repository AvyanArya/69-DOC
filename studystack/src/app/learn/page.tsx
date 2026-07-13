"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { Chip, EmptyState } from "@/components/ui";
import { ARTICLES } from "@/lib/content";
import { CATEGORIES } from "@/lib/data/categories";
import { useStore } from "@/lib/store";
import { isArticleUnlocked } from "@/lib/towers";
import type { Category, Difficulty, ArticleType } from "@/lib/types";

type Sort = "trending" | "newest" | "most-read";

function LearnInner() {
  const params = useSearchParams();
  const initialType = (params.get("type") as ArticleType | null) ?? "all";
  const initialCat = (params.get("category") as Category | null) ?? "all";
  const { state } = useStore();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<ArticleType | "all">(initialType);
  const [cat, setCat] = useState<Category | "all">(initialCat);
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [sort, setSort] = useState<Sort>("trending");

  const results = useMemo(() => {
    let list = ARTICLES.filter((a) => {
      if (type !== "all" && a.type !== type) return false;
      if (cat !== "all" && a.category !== cat) return false;
      if (diff !== "all" && a.difficulty !== diff) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = (a.title + " " + a.summary + " " + a.facts.join(" ") + " " + a.category).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === "newest") list = [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    else if (sort === "most-read") list = [...list].sort((a, b) => b.reads - a.reads);
    else list = [...list].sort((a, b) => b.likes + b.reads / 10 - (a.likes + a.reads / 10));
    return list;
  }, [query, type, cat, diff, sort]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">Learn</h1>
        <p className="text-muted">Search {ARTICLES.length} studies and student articles.</p>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 card-shadow">
        <span className="text-lg text-muted">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search diseases, biology, the brain, DNA…"
          className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
          aria-label="Search articles"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-sm text-muted hover:text-ink" aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      {/* Type + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={type === "all"} onClick={() => setType("all")}>All</Chip>
        <Chip active={type === "study"} onClick={() => setType("study")}>🔬 Studies</Chip>
        <Chip active={type === "student"} onClick={() => setType("student")}>✍️ Student</Chip>
        <span className="mx-1 h-5 w-px bg-line" />
        {(["trending", "newest", "most-read"] as Sort[]).map((s) => (
          <Chip key={s} active={sort === s} onClick={() => setSort(s)}>
            {s === "trending" ? "🔥 Trending" : s === "newest" ? "🆕 Newest" : "👁 Most read"}
          </Chip>
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase text-muted">Level</span>
        <Chip active={diff === "all"} onClick={() => setDiff("all")}>Any</Chip>
        <Chip active={diff === "beginner"} onClick={() => setDiff("beginner")}>Beginner</Chip>
        <Chip active={diff === "intermediate"} onClick={() => setDiff("intermediate")}>Intermediate</Chip>
        <Chip active={diff === "advanced"} onClick={() => setDiff("advanced")}>Advanced</Chip>
      </div>

      {/* Categories */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>All topics</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.emoji} {c.name}
          </Chip>
        ))}
      </div>

      {/* Cancer awareness quick link */}
      {query.trim().toLowerCase().includes("cancer") && (
        <Link
          href="/awareness/cancer"
          className="block rounded-3xl bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600 p-4 text-white soft-shadow transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎗️</span>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase text-white/80">Featured guide</div>
              <div className="font-black">Cancer Awareness &amp; Prevention</div>
            </div>
            <span className="text-sm font-bold">Open →</span>
          </div>
        </Link>
      )}

      {/* Results */}
      <div className="pt-1 text-sm font-semibold text-muted">{results.length} results</div>
      {results.length === 0 ? (
        <EmptyState emoji="🔭" title="No matches" body="Try a broader search or clear some filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(0, 60).map((a, i) => (
            <ArticleCard key={a.id} article={a} index={i} locked={!isArticleUnlocked(a, state.completed)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <LearnInner />
    </Suspense>
  );
}
