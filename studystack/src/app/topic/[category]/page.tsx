"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { EmptyState } from "@/components/ui";
import { CATEGORY_MAP, CATEGORIES } from "@/lib/data/categories";
import { articlesByCategory } from "@/lib/content";
import type { Category } from "@/lib/types";

export default function TopicPage() {
  const params = useParams();
  const category = (Array.isArray(params.category) ? params.category[0] : params.category) as Category;
  const def = CATEGORY_MAP[category];

  if (!def) {
    return (
      <EmptyState emoji="🔭" title="Topic not found" body="Pick a topic from Learn to keep exploring." />
    );
  }

  const articles = articlesByCategory(category);

  return (
    <div className="space-y-6">
      <Link href="/learn" className="text-sm font-semibold text-muted hover:text-ink">← All topics</Link>
      <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${def.gradient} p-6 text-white soft-shadow`}>
        <div className="text-5xl">{def.emoji}</div>
        <h1 className="mt-2 text-3xl font-black">{def.name}</h1>
        <p className="mt-1 max-w-md text-white/90">{def.blurb}</p>
        <div className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
          {articles.length} articles
        </div>
      </div>

      {/* Other topics */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/topic/${c.id}`}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              c.id === category ? "gradient-purple text-white" : "bg-white text-muted border border-line"
            }`}
          >
            {c.emoji} {c.name}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <EmptyState emoji="📭" title="No articles yet" body="Check back soon for studies on this topic." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
