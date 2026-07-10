"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { StreakCard } from "@/components/StreakCard";
import { TowerCard } from "@/components/KnowledgeTower";
import { ArticleCard, ArticleRow, HScroll } from "@/components/ArticleCard";
import { Button, CoverArt, DifficultyPill, SectionHeader, TypePill } from "@/components/ui";
import { ARTICLES, featuredArticles, studentArticles, getArticle } from "@/lib/content";
import { USER_MAP } from "@/lib/data/users";
import { greeting } from "@/lib/gamification";

export default function HomePage() {
  const { state } = useStore();
  const { towerHeight } = useDerived();

  const featured = featuredArticles()[0] ?? ARTICLES[0];
  const recommended = ARTICLES.filter((a) => a.type === "study" && a.id !== featured.id).slice(0, 8);
  const students = studentArticles().slice(0, 6);
  const continueReading = state.progress
    .map((p) => ({ p, a: getArticle(p.articleId) }))
    .filter((x) => x.a);

  const featAuthor = USER_MAP[featured.authorId];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black tracking-tight text-ink sm:text-3xl"
        >
          {greeting()}, {state.displayName} <span aria-hidden>👋</span>
        </motion.h1>
        <p className="mt-1 text-muted">Welcome back. Ready to learn something new today?</p>
      </div>

      <StreakCard />

      {/* Tower + quick stats */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TowerCard height={towerHeight} completed={state.completed} />
        <div className="grid grid-cols-2 gap-4">
          <QuickStat emoji="⚡" value={state.xp} label="Total XP" href="/profile" />
          <QuickStat emoji="🪙" value={state.coins} label="Coins" href="/profile" />
          <QuickStat emoji="📚" value={state.completed.length} label="Articles read" href="/profile" />
          <QuickStat emoji="🏅" value={state.badges.length} label="Badges" href="/profile" />
        </div>
      </div>

      {/* Featured study */}
      <section>
        <SectionHeader title="Featured study" emoji="✨" />
        <Link href={`/learn/${featured.id}`} className="group block">
          <div className="overflow-hidden rounded-3xl bg-card card-shadow transition group-hover:-translate-y-1">
            <CoverArt category={featured.category} className="h-48 w-full sm:h-56" big />
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <TypePill type={featured.type} />
                <DifficultyPill difficulty={featured.difficulty} />
                <span className="text-xs text-muted">⏱ {featured.readMinutes} min read</span>
              </div>
              <h3 className="text-xl font-black leading-tight text-ink group-hover:text-brand-700">{featured.title}</h3>
              <p className="text-sm text-muted">{featured.summary}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted">
                  {featAuthor?.avatar} {featAuthor?.displayName}
                </span>
                <Button size="sm">Start reading · +{featured.xp} XP</Button>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Continue reading */}
      {continueReading.length > 0 && (
        <section>
          <SectionHeader title="Continue reading" emoji="📖" />
          <div className="space-y-2">
            {continueReading.map(({ p, a }) => (
              <Link
                key={p.articleId}
                href={`/learn/${p.articleId}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 card-shadow transition hover:-translate-y-0.5"
              >
                <CoverArt category={a!.category} className="h-14 w-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{a!.title}</div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div className="h-full gradient-pink" style={{ width: `${p.percent}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-brand-700">{p.percent}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended */}
      <section>
        <SectionHeader
          title="Recommended for you"
          emoji="🎯"
          action={<Link href="/learn" className="text-sm font-semibold text-brand-700">See all</Link>}
        />
        <HScroll>
          {recommended.map((a, i) => (
            <div key={a.id} className="w-64 shrink-0">
              <ArticleCard article={a} index={i} />
            </div>
          ))}
        </HScroll>
      </section>

      {/* Teen published */}
      <section>
        <SectionHeader
          title="Teen-published articles"
          emoji="✍️"
          action={<Link href="/learn?type=student" className="text-sm font-semibold text-brand-700">See all</Link>}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {students.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickStat({ emoji, value, label, href }: { emoji: string; value: number; label: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col justify-center rounded-3xl bg-card p-4 card-shadow transition hover:-translate-y-0.5">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-2xl font-black text-ink">{value.toLocaleString()}</div>
      <div className="text-xs font-medium text-muted">{label}</div>
    </Link>
  );
}
