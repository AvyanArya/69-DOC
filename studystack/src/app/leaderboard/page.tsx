"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore, useDerived } from "@/lib/store";
import { Chip } from "@/components/ui";
import { DEMO_USERS } from "@/lib/data/users";

type Board = "weekly" | "monthly" | "streak" | "tower" | "read";

const BOARDS: { id: Board; label: string; emoji: string; key: (u: Row) => number; suffix: string }[] = [
  { id: "weekly", label: "Weekly XP", emoji: "⚡", key: (u) => u.weeklyXp, suffix: "XP" },
  { id: "monthly", label: "Monthly XP", emoji: "🗓️", key: (u) => u.monthlyXp, suffix: "XP" },
  { id: "streak", label: "Longest streak", emoji: "🔥", key: (u) => u.streak, suffix: "days" },
  { id: "tower", label: "Tower height", emoji: "🏗️", key: (u) => u.towerHeight, suffix: "floors" },
  { id: "read", label: "Articles read", emoji: "📚", key: (u) => u.articlesRead, suffix: "read" },
];

interface Row {
  id: string;
  name: string;
  avatar: string;
  weeklyXp: number;
  monthlyXp: number;
  streak: number;
  towerHeight: number;
  articlesRead: number;
  you: boolean;
}

export default function LeaderboardPage() {
  const { state } = useStore();
  const { towerHeight } = useDerived();
  const [board, setBoard] = useState<Board>("weekly");

  const you: Row = {
    id: "you",
    name: state.displayName,
    avatar: state.avatar,
    weeklyXp: state.weeklyXp,
    monthlyXp: state.weeklyXp * 3,
    streak: state.streak,
    towerHeight,
    articlesRead: state.completed.length,
    you: true,
  };
  const rows: Row[] = [
    you,
    ...DEMO_USERS.filter((u) => u.id !== "editorial").map((u) => ({
      id: u.id,
      name: u.displayName,
      avatar: u.avatar,
      weeklyXp: u.weeklyXp,
      monthlyXp: u.monthlyXp,
      streak: u.streak,
      towerHeight: u.towerHeight,
      articlesRead: u.articlesRead,
      you: false,
    })),
  ];

  const cfg = BOARDS.find((b) => b.id === board)!;
  const sorted = [...rows].sort((a, b) => cfg.key(b) - cfg.key(a));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const yourRank = sorted.findIndex((r) => r.you) + 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">Leaderboard 🏆</h1>
        <p className="text-muted">You’re ranked <b className="text-brand-700">#{yourRank}</b> in {cfg.label.toLowerCase()}.</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {BOARDS.map((b) => (
          <Chip key={b.id} active={board === b.id} onClick={() => setBoard(b.id)}>
            {b.emoji} {b.label}
          </Chip>
        ))}
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 items-end gap-2">
        {[1, 0, 2].map((pos) => {
          const r = top3[pos];
          if (!r) return <div key={pos} />;
          const heights = ["h-24", "h-32", "h-20"];
          const medals = ["🥈", "🥇", "🥉"];
          const order = pos === 0 ? 1 : pos === 1 ? 0 : 2;
          return (
            <div key={r.id} className="flex flex-col items-center">
              <div className="text-2xl">{medals[pos === 0 ? 0 : pos === 1 ? 1 : 2]}</div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-2xl card-shadow">{r.avatar}</span>
              <div className="mt-1 max-w-full truncate text-xs font-bold text-ink">{r.name}</div>
              <div className="text-xs font-black text-brand-700">{cfg.key(r).toLocaleString()}</div>
              <div className={`mt-1 w-full rounded-t-2xl gradient-purple ${heights[order]}`} />
            </div>
          );
        })}
      </div>

      {/* Rest */}
      <div className="rounded-3xl bg-card p-3 card-shadow">
        {rest.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.you ? "bg-brand/5" : ""}`}>
            <span className="w-6 text-center font-black text-muted">{i + 4}</span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-lg">{r.avatar}</span>
            <span className="flex-1 text-sm font-bold text-ink">
              {r.you ? (
                <>{r.name} <span className="text-brand-700">(you)</span></>
              ) : (
                <Link href={`/user/${r.id}`} className="hover:text-brand-700">{r.name}</Link>
              )}
            </span>
            <span className="text-sm font-black text-grape-500">
              {cfg.key(r).toLocaleString()} <span className="text-xs font-normal text-muted">{cfg.suffix}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
