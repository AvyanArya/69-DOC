"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { USER_MAP } from "@/lib/data/users";
import { BADGE_MAP } from "@/lib/data/badges";
import { ArticleRow } from "@/components/ArticleCard";
import { Button, EmptyState, StatTile } from "@/components/ui";
import { ARTICLES } from "@/lib/content";
import { levelTitle, towerStage } from "@/lib/gamification";

export default function UserProfilePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const user = id ? USER_MAP[id] : undefined;
  const { state, dispatch } = useStore();

  if (!user) {
    return <EmptyState emoji="👤" title="User not found" body="This profile may have moved." />;
  }

  const following = state.followingIds.includes(user.id);
  const published = ARTICLES.filter((a) => a.authorId === user.id).slice(0, 6);

  return (
    <div className="space-y-6">
      <Link href="/leaderboard" className="text-sm font-semibold text-muted hover:text-ink">← Back</Link>

      <div className="overflow-hidden rounded-3xl bg-card card-shadow">
        <div className="h-24 gradient-purple" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border-4 border-white bg-canvas text-4xl soft-shadow">
              {user.avatar}
            </div>
            {user.id !== "you" && (
              <Button
                size="sm"
                variant={following ? "outline" : "primary"}
                onClick={() => dispatch({ type: "toggleFollow", payload: { userId: user.id } })}
              >
                {following ? "Following ✓" : "Follow"}
              </Button>
            )}
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-black text-ink">{user.displayName}</h1>
            <div className="text-sm text-muted">@{user.username}</div>
            <p className="mt-2 text-sm text-ink">{user.bio}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span><b className="text-ink">{user.followers.toLocaleString()}</b> <span className="text-muted">followers</span></span>
              <span><b className="text-ink">{user.following}</b> <span className="text-muted">following</span></span>
              <span className="rounded-full bg-grape/5 px-2.5 py-1 text-xs font-bold text-grape-500">
                Lvl {user.level} · {levelTitle(user.level)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="🔥" value={user.streak} label="Day streak" />
        <StatTile emoji="⚡" value={user.xp.toLocaleString()} label="Total XP" />
        <StatTile emoji="🏗️" value={user.towerHeight} label={towerStage(user.towerHeight).name} />
        <StatTile emoji="🎯" value={`${Math.round(user.quizAccuracy * 100)}%`} label="Quiz accuracy" />
      </div>

      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {user.badges.map((b) => {
            const badge = BADGE_MAP[b];
            if (!badge) return null;
            return (
              <div key={b} className="rounded-2xl bg-white px-3 py-2 text-center card-shadow" title={badge.description}>
                <div className="text-2xl">{badge.emoji}</div>
                <div className="text-[10px] font-bold text-ink">{badge.name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {published.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 text-lg font-black text-ink">Published articles</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {published.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
