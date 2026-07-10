"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { KnowledgeTowerViz } from "@/components/KnowledgeTower";
import { ArticleRow } from "@/components/ArticleCard";
import { Button, ProgressBar, StatTile } from "@/components/ui";
import { BADGES } from "@/lib/data/badges";
import { getArticle } from "@/lib/content";
import { levelTitle, towerStage } from "@/lib/gamification";
import { USER_MAP } from "@/lib/data/users";

export default function ProfilePage() {
  const { state, dispatch } = useStore();
  const { level, towerHeight, quizAccuracy } = useDerived();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.displayName);
  const [bio, setBio] = useState(state.bio);

  const completedArticles = state.completed
    .map((c) => getArticle(c.articleId))
    .filter(Boolean)
    .slice(-6)
    .reverse();
  const bookmarkFolders = state.folders.map((f) => ({
    folder: f,
    items: state.bookmarks.filter((b) => b.folder === f),
  }));
  const following = state.followingIds.map((id) => USER_MAP[id]).filter(Boolean);

  function saveProfile() {
    dispatch({ type: "updateProfile", payload: { displayName: name, bio } });
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-card card-shadow">
        <div className="h-24 gradient-brand" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border-4 border-white bg-canvas text-4xl soft-shadow">
              {state.avatar}
            </div>
            <button
              onClick={() => setEditing((e) => !e)}
              className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold text-ink hover:border-brand/40"
            >
              {editing ? "Cancel" : "Edit profile"}
            </button>
          </div>

          {editing ? (
            <div className="mt-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 font-bold outline-none focus:border-brand/40"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand/40"
              />
              <Button onClick={saveProfile} size="sm">Save</Button>
            </div>
          ) : (
            <div className="mt-3">
              <h1 className="text-xl font-black text-ink">{state.displayName}</h1>
              <div className="text-sm text-muted">@{state.username}</div>
              <p className="mt-2 text-sm text-ink">{state.bio || "Add a bio to tell others what you love learning."}</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span><b className="text-ink">{following.length}</b> <span className="text-muted">following</span></span>
                <span><b className="text-ink">248</b> <span className="text-muted">followers</span></span>
                <span className="rounded-full bg-grape/5 px-2.5 py-1 text-xs font-bold text-grape-500">
                  Lvl {level.level} · {levelTitle(level.level)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Level progress */}
      <div className="rounded-3xl bg-card p-5 card-shadow">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-ink">Level {level.level}</span>
          <span className="text-muted">{level.intoLevel} / {level.needed} XP</span>
        </div>
        <ProgressBar percent={level.percent} />
        <div className="mt-1 text-right text-xs text-muted">{level.needed - level.intoLevel} XP to level {level.level + 1}</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="🔥" value={state.streak} label="Day streak" />
        <StatTile emoji="⚡" value={state.xp.toLocaleString()} label="Total XP" />
        <StatTile emoji="📚" value={state.completed.length} label="Articles read" />
        <StatTile emoji="🎯" value={`${Math.round(quizAccuracy * 100)}%`} label="Quiz accuracy" />
        <StatTile emoji="🪙" value={state.coins} label="Coins" />
        <StatTile emoji="🏗️" value={towerHeight} label="Tower floors" />
        <StatTile emoji="🏅" value={state.badges.length} label="Badges" />
        <StatTile emoji="❤️" value={state.likes.length} label="Liked" />
      </div>

      {/* Tower */}
      <Link href="/tower" className="block rounded-3xl bg-card card-shadow">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-lg font-black text-ink">Knowledge Tower</h2>
          <span className="text-sm font-bold text-grape-500">{towerStage(towerHeight).name} →</span>
        </div>
        <KnowledgeTowerViz height={towerHeight} completed={state.completed} compact />
      </Link>

      {/* Badges */}
      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">Achievements</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {BADGES.map((b) => {
            const earned = state.badges.includes(b.id);
            return (
              <motion.div
                key={b.id}
                whileHover={{ scale: 1.03 }}
                className={`rounded-2xl p-3 text-center card-shadow ${earned ? "bg-white" : "bg-white/50 opacity-60"}`}
                title={b.condition}
              >
                <div className={`text-3xl ${earned ? "" : "grayscale"}`}>{b.emoji}</div>
                <div className="mt-1 text-xs font-bold text-ink">{b.name}</div>
                <div className="text-[10px] text-muted">{earned ? "Unlocked" : b.condition}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recently read */}
      {completedArticles.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 text-lg font-black text-ink">Recently completed</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {completedArticles.map((a) => (
              <ArticleRow key={a!.id} article={a!} />
            ))}
          </div>
        </section>
      )}

      {/* Bookmarks */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-lg font-black text-ink">Bookmarks</h2>
          <Link href="/bookmarks" className="text-sm font-semibold text-brand-700">Manage folders</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {bookmarkFolders.map((f) => (
            <Link
              key={f.folder}
              href="/bookmarks"
              className="rounded-2xl bg-white px-4 py-3 text-sm card-shadow transition hover:-translate-y-0.5"
            >
              <span className="font-bold text-ink">📁 {f.folder}</span>
              <span className="ml-2 text-muted">{f.items.length}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Following */}
      {following.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 text-lg font-black text-ink">Following</h2>
          <div className="flex flex-wrap gap-2">
            {following.map((u) => (
              <Link key={u.id} href={`/user/${u.id}`} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 card-shadow">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-lg">{u.avatar}</span>
                <span className="text-sm font-bold text-ink">{u.displayName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Settings */}
      <ProfileSettings />
    </div>
  );
}

function ProfileSettings() {
  const { state, dispatch } = useStore();
  return (
    <section className="rounded-3xl bg-card p-5 card-shadow">
      <h2 className="text-lg font-black text-ink">⚙️ Learning goals</h2>
      <p className="text-sm text-muted">These are configurable to fit how you like to learn.</p>
      <div className="mt-4 space-y-4">
        <SettingRow
          label="Daily goal (articles)"
          value={state.dailyGoalArticles}
          onChange={(v) => dispatch({ type: "setConfig", payload: { dailyGoalArticles: v } })}
          min={1}
          max={5}
        />
        <SettingRow
          label="Articles to unlock writing"
          value={state.writingUnlockArticles}
          onChange={(v) => dispatch({ type: "setConfig", payload: { writingUnlockArticles: v } })}
          min={1}
          max={25}
        />
        <SettingRow
          label="Active days to unlock writing"
          value={state.writingUnlockDays}
          onChange={(v) => dispatch({ type: "setConfig", payload: { writingUnlockDays: v } })}
          min={1}
          max={30}
        />
      </div>
    </section>
  );
}

function SettingRow({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-full bg-canvas font-bold text-ink hover:bg-black/5"
          aria-label="Decrease"
        >
          −
        </button>
        <span className="w-8 text-center font-black text-ink">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-full bg-canvas font-bold text-ink hover:bg-black/5"
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}
