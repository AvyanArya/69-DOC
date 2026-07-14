"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { useTheme, type ThemePref } from "@/lib/theme";
import { TopicTowerCard } from "@/components/KnowledgeTower";
import { ArticleRow } from "@/components/ArticleCard";
import { Button, ProgressBar } from "@/components/ui";
import { BADGES } from "@/lib/data/badges";
import { getArticle } from "@/lib/content";
import { levelTitle } from "@/lib/gamification";
import { allTopicTowers } from "@/lib/towers";
import { USER_MAP } from "@/lib/data/users";
import { GRADE_LEVELS } from "@/lib/data/gradeLevels";
import { CATEGORIES } from "@/lib/data/categories";
import { AvatarBadge, AvatarBuilder, AvatarFace } from "@/components/Avatar";
import { DEFAULT_AVATAR_CONFIG, encodeAvatarConfig, parseAvatarConfig } from "@/lib/data/avatarParts";
import type { GradeLevel } from "@/lib/types";

export default function ProfilePage() {
  const { state, dispatch } = useStore();
  const { level, towerHeight, quizAccuracy } = useDerived();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.displayName);
  const [bio, setBio] = useState(state.bio);
  const [avatarConfig, setAvatarConfig] = useState(() => parseAvatarConfig(state.avatar) ?? DEFAULT_AVATAR_CONFIG);

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
  const topTower = allTopicTowers(state.completed)[0];

  function saveProfile() {
    dispatch({ type: "updateProfile", payload: { displayName: name, bio, avatar: encodeAvatarConfig(avatarConfig) } });
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-card card-shadow">
        <div className="h-24 gradient-brand" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <div className="rounded-3xl border-4 border-card soft-shadow">
              <AvatarBadge value={state.avatar} size="h-20 w-20 text-4xl" className="rounded-2xl" />
            </div>
            <button
              onClick={() => setEditing((e) => !e)}
              className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-ink hover:border-brand/40"
            >
              {editing ? "Cancel" : "Edit profile"}
            </button>
          </div>

          {editing ? (
            <div className="mt-3 space-y-3">
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
              <div className="rounded-2xl bg-canvas p-3">
                <div className="mb-2 text-xs font-bold uppercase text-muted">Character</div>
                <AvatarBuilder config={avatarConfig} onChange={setAvatarConfig} />
              </div>
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

      {/* Milestones */}
      <section className="rounded-3xl bg-card p-4 card-shadow">
        <h2 className="mb-3 px-1 text-lg font-black text-ink">Milestones</h2>
        <div className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          <MilestoneStat emoji="🔥" value={state.streak} label="Day streak" />
          <MilestoneStat emoji="⚡" value={state.xp.toLocaleString()} label="Total XP" />
          <MilestoneStat emoji="📚" value={state.completed.length} label="Articles read" />
          <MilestoneStat emoji="🎯" value={`${Math.round(quizAccuracy * 100)}%`} label="Quiz accuracy" />
          <MilestoneStat emoji="🪙" value={state.coins} label="Coins" />
          <MilestoneStat emoji="🏗️" value={towerHeight} label="Tower floors" />
          <MilestoneStat emoji="🏅" value={state.badges.length} label="Badges" />
          <MilestoneStat emoji="❤️" value={state.likes.length} label="Liked" />
        </div>
      </section>

      {/* Tower */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-lg font-black text-ink">Knowledge Tower</h2>
          <Link href="/tower" className="text-sm font-semibold text-brand-700">View all towers →</Link>
        </div>
        {topTower && <TopicTowerCard tower={topTower} />}
      </section>

      {/* Badges */}
      <AchievementsSection />

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
              className="rounded-2xl bg-card px-4 py-3 text-sm card-shadow transition hover:-translate-y-0.5"
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
              <Link key={u.id} href={`/user/${u.id}`} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 card-shadow">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-lg"><AvatarFace value={u.avatar} /></span>
                <span className="text-sm font-bold text-ink">{u.displayName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Settings */}
      <AppearanceSettings />
      <ProfileSettings />
      <AccountSettings />
      <DangerZone />

      <div className="flex items-center justify-center gap-4 pb-2 text-xs text-muted">
        <Link href="/about" className="hover:text-ink">About</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
      </div>
    </div>
  );
}

function AccountSettings() {
  const { state, dispatch } = useStore();
  const [email, setEmail] = useState(state.email);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const currentGrade = GRADE_LEVELS.find((g) => g.id === state.gradeLevel) ?? GRADE_LEVELS[1];

  return (
    <section className="rounded-3xl bg-card p-5 card-shadow">
      <h2 className="text-lg font-black text-ink">🎓 Account &amp; grade level</h2>
      <p className="text-sm text-muted">
        Your grade level tailors which studies get recommended, so material always matches what you can follow.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => emailValid && dispatch({ type: "updateProfile", payload: { email: email.trim() } })}
            placeholder="you@example.com"
            className={`w-full rounded-xl border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand/40 ${
              email && !emailValid ? "border-rose-400" : "border-line"
            }`}
          />
          {email && !emailValid && <p className="mt-1 text-xs font-semibold text-rose-500">Enter a valid email.</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Grade / school level</label>
          <select
            value={state.gradeLevel}
            onChange={(e) => dispatch({ type: "updateProfile", payload: { gradeLevel: e.target.value as GradeLevel } })}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand/40"
          >
            {GRADE_LEVELS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">{currentGrade.blurb}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Interests</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const active = state.interests.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    dispatch({
                      type: "updateProfile",
                      payload: { interests: active ? state.interests.filter((x) => x !== c.id) : [...state.interests, c.id] },
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    active ? "gradient-purple text-white" : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted">Steers recommendations — we still mix in new fields to explore.</p>
        </div>
      </div>
    </section>
  );
}

function AppearanceSettings() {
  const { theme, setTheme, hc, setHc } = useTheme();
  const options: { value: ThemePref; icon: string; label: string }[] = [
    { value: "light", icon: "☀️", label: "Light" },
    { value: "dark", icon: "🌙", label: "Dark" },
    { value: "system", icon: "💻", label: "Auto" },
  ];
  return (
    <section className="rounded-3xl bg-card p-5 card-shadow">
      <h2 className="text-lg font-black text-ink">🎨 Appearance</h2>
      <p className="text-sm text-muted">Choose how Vera looks on this device.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            aria-pressed={theme === opt.value}
            className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-sm font-bold transition ${
              theme === opt.value ? "gradient-purple text-white" : "bg-canvas text-muted hover:text-ink"
            }`}
          >
            <span className="text-lg">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setHc(!hc)}
        className="mt-4 flex w-full items-center justify-between rounded-2xl bg-canvas px-4 py-3 text-sm font-semibold text-ink"
      >
        <span>◐ High contrast mode</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${hc ? "bg-emerald-100 text-emerald-700" : "bg-soft text-muted"}`}>
          {hc ? "On" : "Off"}
        </span>
      </button>
    </section>
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
          className="grid h-8 w-8 place-items-center rounded-full bg-canvas font-bold text-ink hover:bg-soft"
          aria-label="Decrease"
        >
          −
        </button>
        <span className="w-8 text-center font-black text-ink">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-full bg-canvas font-bold text-ink hover:bg-soft"
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}

function MilestoneStat({ emoji, value, label }: { emoji: string; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center sm:py-1">
      <div className="text-xl">{emoji}</div>
      <div className="text-lg font-extrabold text-ink">{value}</div>
      <div className="text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}

const DEFAULT_LOCKED_SHOWN = 6;

function AchievementsSection() {
  const { state } = useStore();
  const [expanded, setExpanded] = useState(false);

  const earned = BADGES.filter((b) => state.badges.includes(b.id));
  const locked = BADGES.filter((b) => !state.badges.includes(b.id));
  const visibleLocked = expanded ? locked : locked.slice(0, DEFAULT_LOCKED_SHOWN);
  const hiddenCount = locked.length - visibleLocked.length;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-lg font-black text-ink">Achievements</h2>
        <span className="text-sm font-semibold text-muted">{earned.length} / {BADGES.length} unlocked</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
        {earned.map((b) => (
          <BadgeTile key={b.id} badge={b} earned />
        ))}
        {visibleLocked.map((b) => (
          <BadgeTile key={b.id} badge={b} earned={false} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-2xl bg-card py-2.5 text-center text-sm font-semibold text-brand-700 card-shadow"
        >
          Show {hiddenCount} more →
        </button>
      )}
      {expanded && locked.length > DEFAULT_LOCKED_SHOWN && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 w-full rounded-2xl bg-card py-2.5 text-center text-sm font-semibold text-muted card-shadow"
        >
          Show fewer
        </button>
      )}
    </section>
  );
}

function BadgeTile({ badge, earned }: { badge: (typeof BADGES)[number]; earned: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      title={badge.condition}
      className={`relative rounded-2xl p-2.5 text-center card-shadow ${earned ? "bg-card" : "bg-card/50 opacity-60"}`}
    >
      {earned && <span className="absolute right-1 top-1 text-[10px]">✅</span>}
      <div className={`text-2xl ${earned ? "" : "grayscale"}`}>{badge.emoji}</div>
      <div className="mt-0.5 truncate text-[10px] font-bold text-ink">{badge.name}</div>
    </motion.div>
  );
}

function DangerZone() {
  const { dispatch } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="rounded-3xl border-2 border-rose-200 bg-card p-5 card-shadow">
      <h2 className="text-lg font-black text-ink">⚙️ Account</h2>
      <p className="text-sm text-muted">Manage your session or leave Vera entirely.</p>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => dispatch({ type: "signOut" })}
          className="flex w-full items-center justify-between rounded-2xl bg-canvas px-4 py-3 text-sm font-semibold text-ink hover:bg-soft"
        >
          <span>↩ Sign out</span>
          <span className="text-muted">→</span>
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100"
          >
            <span>🗑 Delete account</span>
            <span>→</span>
          </button>
        ) : (
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-700">Delete your account? This can&apos;t be undone.</p>
            <p className="mt-1 text-xs text-rose-700/80">
              Your XP, streak, badges, bookmarks, submissions and all other progress on this device will be permanently erased.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => dispatch({ type: "deleteAccount" })}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-rose-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
