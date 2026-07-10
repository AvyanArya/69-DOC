"use client";

import { motion } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { Button, Ring } from "./ui";
import { dayKey } from "@/lib/gamification";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function StreakCard() {
  const { state } = useStore();
  const { level } = useDerived();

  // Build last-7-days activity dots (Mon..Sun of current week)
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday
  const weekDays: { key: string; label: string; active: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    const key = dayKey(d);
    weekDays.push({
      key,
      label: WEEKDAYS[i],
      active: state.activeDays.includes(key),
      isToday: key === dayKey(today),
    });
  }

  const goalPercent = Math.min(100, (state.dailyXp / 60) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] gradient-purple p-6 text-white soft-shadow"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-40 w-40 rounded-full bg-brand/30 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <span>🔥</span> Current streak
          </div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-5xl font-black leading-none">{state.streak}</span>
            <span className="mb-1 text-sm text-white/80">days</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
            <span>❄️ {state.freezes} freeze{state.freezes === 1 ? "" : "s"}</span>
            <span>🏆 Best {state.bestStreak}</span>
          </div>
        </div>
        <Ring percent={goalPercent} size={72} stroke={7}>
          <div className="text-center">
            <div className="text-lg font-black leading-none">{state.dailyXp}</div>
            <div className="text-[9px] text-white/80">XP today</div>
          </div>
        </Ring>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-1">
        {weekDays.map((d, i) => (
          <div key={d.key + i} className="flex flex-col items-center gap-1.5">
            <div
              className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-bold transition ${
                d.active
                  ? "bg-white text-grape"
                  : d.isToday
                    ? "border-2 border-white/70 text-white"
                    : "bg-white/15 text-white/70"
              }`}
            >
              {d.active ? "🔥" : d.label}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <div className="text-sm text-white/85">
          Daily goal: <b>{state.dailyGoalArticles} article</b> · Lvl {level.level}
        </div>
        <Button href="/learn" variant="primary" size="sm" className="shrink-0">
          Continue learning →
        </Button>
      </div>
    </motion.div>
  );
}
