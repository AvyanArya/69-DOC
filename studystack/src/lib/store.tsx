"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  UserState,
  QuizResult,
  Submission,
  AppNotification,
  BookmarkEntry,
} from "./types";
import { dayKey, daysBetween, weekKey, levelFromXp } from "./gamification";
import { getArticle } from "./content";
import { BADGES } from "./data/badges";

const STORAGE_KEY = "studystack:v1";

const DEFAULT_FOLDERS = ["Favorites", "Exam Prep", "Interesting"];

function todayKey() {
  return dayKey(new Date());
}

function freshState(): UserState {
  const today = todayKey();
  return {
    signedIn: false,
    username: "",
    displayName: "",
    avatar: "🦊",
    bio: "",
    isAdmin: false,
    createdAt: new Date().toISOString(),
    xp: 0,
    coins: 0,
    dailyXp: 0,
    dailyXpDate: today,
    weeklyXp: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDay: "",
    freezes: 1,
    freezeUsedDates: [],
    lastFreezeGrantWeek: weekKey(new Date()),
    completed: [],
    progress: [],
    bookmarks: [],
    folders: [...DEFAULT_FOLDERS],
    likes: [],
    badges: [],
    quizResults: [],
    followingIds: [],
    submissions: [],
    notifications: [],
    dailyGoalArticles: 1,
    writingUnlockArticles: 5,
    writingUnlockDays: 3,
    activeDays: [],
  };
}

/** A pre-populated starter account so the app feels alive right after sign-in. */
function starterState(
  opts: { username: string; displayName: string; avatar: string } = {
    username: "you",
    displayName: "Alex",
    avatar: "🦊",
  },
): UserState {
  const base = freshState();
  const today = todayKey();
  const days: string[] = [];
  for (let i = 0; i < 12; i++) days.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  return {
    ...base,
    signedIn: true,
    username: opts.username,
    displayName: opts.displayName,
    avatar: opts.avatar,
    bio: "Curious about medicine and the brain. Learning every day.",
    isAdmin: true,
    xp: 640,
    coins: 210,
    dailyXp: 0,
    dailyXpDate: today,
    weeklyXp: 180,
    streak: 6,
    bestStreak: 11,
    lastActiveDay: dayKey(new Date(Date.now() - 86_400_000)),
    freezes: 2,
    badges: ["first-article", "ten-articles"],
    completed: [
      { articleId: "how-mitochondria-power-every-cell-in-your-body", completedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), quizScore: 1 },
      { articleId: "how-neurons-send-signals", completedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), quizScore: 0.8 },
      { articleId: "how-vaccines-train-your-immune-system", completedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(), quizScore: 1 },
    ],
    progress: [
      { articleId: "crispr-editing-the-code-of-life", percent: 45, updatedAt: new Date().toISOString() },
      { articleId: "the-gut-microbiome-and-your-health", percent: 20, updatedAt: new Date().toISOString() },
    ],
    bookmarks: [
      { articleId: "dna-the-instruction-manual-of-life", folder: "Favorites", savedAt: new Date().toISOString() },
      { articleId: "the-psychology-of-habits", folder: "Interesting", savedAt: new Date().toISOString() },
    ],
    likes: ["how-mitochondria-power-every-cell-in-your-body", "how-neurons-send-signals"],
    followingIds: ["u-maya", "u-sofia"],
    activeDays: days,
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "hydrate"; payload: UserState }
  | { type: "signIn"; payload: { username: string; displayName: string; avatar: string } }
  | { type: "signOut" }
  | { type: "updateProfile"; payload: Partial<Pick<UserState, "displayName" | "avatar" | "bio" | "username">> }
  | { type: "setProgress"; payload: { articleId: string; percent: number } }
  | { type: "completeArticle"; payload: { articleId: string; quizResult: QuizResult } }
  | { type: "toggleLike"; payload: { articleId: string } }
  | { type: "toggleBookmark"; payload: { articleId: string; folder: string } }
  | { type: "addFolder"; payload: { name: string } }
  | { type: "toggleFollow"; payload: { userId: string } }
  | { type: "addSubmission"; payload: Submission }
  | { type: "updateSubmission"; payload: { id: string; changes: Partial<Submission> } }
  | { type: "readNotification"; payload: { id: string } }
  | { type: "readAllNotifications" }
  | { type: "pushNotification"; payload: AppNotification }
  | { type: "setConfig"; payload: Partial<Pick<UserState, "dailyGoalArticles" | "writingUnlockArticles" | "writingUnlockDays">> };

function grantFreezeIfNewWeek(state: UserState): UserState {
  const wk = weekKey(new Date());
  if (state.lastFreezeGrantWeek !== wk) {
    return { ...state, freezes: state.freezes + 1, lastFreezeGrantWeek: wk };
  }
  return state;
}

/** Resolve streak on activity, applying automatic + earned freezes. */
function applyStreakOnActivity(state: UserState): UserState {
  const today = todayKey();
  if (state.lastActiveDay === today) return state; // already counted today

  const s = { ...state };
  if (!s.lastActiveDay) {
    s.streak = 1;
  } else {
    const gap = daysBetween(s.lastActiveDay, today);
    if (gap === 1) {
      s.streak += 1;
    } else if (gap > 1) {
      // Missed days: first miss covered automatically, further misses need freezes.
      const missed = gap - 1;
      const autoCover = 1; // one automatic freeze
      const needFreezes = Math.max(0, missed - autoCover);
      if (needFreezes <= s.freezes) {
        s.freezes -= needFreezes;
        const usedDates = [...s.freezeUsedDates];
        for (let i = 0; i < needFreezes; i++) usedDates.push(today);
        s.freezeUsedDates = usedDates;
        s.streak += 1; // streak preserved and continues
      } else {
        s.streak = 1; // reset
      }
    }
  }
  s.lastActiveDay = today;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  if (!s.activeDays.includes(today)) s.activeDays = [...s.activeDays, today];
  return s;
}

function rollDailyXp(state: UserState): UserState {
  const today = todayKey();
  if (state.dailyXpDate !== today) {
    return { ...state, dailyXp: 0, dailyXpDate: today };
  }
  return state;
}

function evaluateBadges(state: UserState): UserState {
  const earned = new Set(state.badges);
  const readCount = state.completed.length;
  const level = levelFromXp(state.xp).level;
  const medicineReads = state.completed.filter((c) => getArticle(c.articleId)?.category === "medicine").length;
  const perfect = state.quizResults.some((q) => q.score === 1);
  const published = state.submissions.some((s) => s.status === "published" || s.status === "approved");

  const check: Record<string, boolean> = {
    "first-article": readCount >= 1,
    "ten-articles": readCount >= 10,
    "fifty-articles": readCount >= 50,
    "hundred-articles": readCount >= 100,
    "perfect-quiz": perfect,
    "researcher": level >= 5,
    "scientist": level >= 7,
    "medical-explorer": medicineReads >= 10,
    "consistency-king": state.bestStreak >= 7,
    "thirty-day": state.bestStreak >= 30,
    "hundred-day": state.bestStreak >= 100,
    "top-author": published,
  };

  const newNotifs: AppNotification[] = [];
  for (const b of BADGES) {
    if (check[b.id] && !earned.has(b.id)) {
      earned.add(b.id);
      newNotifs.push({
        id: `badge-${b.id}-${Date.now()}`,
        kind: "badge",
        title: `New badge: ${b.name} ${b.emoji}`,
        body: b.description,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  }
  if (newNotifs.length === 0) return state;
  return {
    ...state,
    badges: [...earned],
    notifications: [...newNotifs, ...state.notifications],
  };
}

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case "hydrate":
      return grantFreezeIfNewWeek(rollDailyXp(action.payload));

    case "signIn":
      // Give new users a lively starter account so the app feels alive,
      // while respecting the name/avatar they chose.
      return starterState(action.payload);

    case "signOut":
      return freshState();

    case "updateProfile":
      return { ...state, ...action.payload };

    case "setProgress": {
      const others = state.progress.filter((p) => p.articleId !== action.payload.articleId);
      const percent = Math.max(
        action.payload.percent,
        state.progress.find((p) => p.articleId === action.payload.articleId)?.percent ?? 0,
      );
      return {
        ...state,
        progress: [...others, { articleId: action.payload.articleId, percent, updatedAt: new Date().toISOString() }],
      };
    }

    case "completeArticle": {
      const { articleId, quizResult } = action.payload;
      let s = { ...state };
      const alreadyDone = s.completed.some((c) => c.articleId === articleId);

      // XP + coins
      s.xp += quizResult.xpEarned;
      s.coins += quizResult.coinsEarned;
      s = rollDailyXp(s);
      s.dailyXp += quizResult.xpEarned;
      s.weeklyXp += quizResult.xpEarned;

      // completion record + tower growth
      if (!alreadyDone) {
        s.completed = [
          ...s.completed,
          { articleId, completedAt: new Date().toISOString(), quizScore: quizResult.score },
        ];
      }
      s.quizResults = [...s.quizResults, quizResult];

      // clear reading progress for finished article
      s.progress = s.progress.filter((p) => p.articleId !== articleId);

      // streak
      s = applyStreakOnActivity(s);

      // notification
      s.notifications = [
        {
          id: `quiz-${articleId}-${Date.now()}`,
          kind: "quiz",
          title: quizResult.passed ? "Quiz passed! 🎉" : "Keep going 💪",
          body: quizResult.passed
            ? `You scored ${Math.round(quizResult.score * 100)}% and earned ${quizResult.xpEarned} XP.`
            : `You scored ${Math.round(quizResult.score * 100)}%. Try a simpler article and come back tomorrow.`,
          createdAt: new Date().toISOString(),
          read: false,
          href: `/learn/${articleId}`,
        },
        ...s.notifications,
      ];

      s = evaluateBadges(s);
      return s;
    }

    case "toggleLike": {
      const has = state.likes.includes(action.payload.articleId);
      return {
        ...state,
        likes: has
          ? state.likes.filter((id) => id !== action.payload.articleId)
          : [...state.likes, action.payload.articleId],
      };
    }

    case "toggleBookmark": {
      const existing = state.bookmarks.find((b) => b.articleId === action.payload.articleId);
      if (existing) {
        return { ...state, bookmarks: state.bookmarks.filter((b) => b.articleId !== action.payload.articleId) };
      }
      const entry: BookmarkEntry = {
        articleId: action.payload.articleId,
        folder: action.payload.folder,
        savedAt: new Date().toISOString(),
      };
      return { ...state, bookmarks: [...state.bookmarks, entry] };
    }

    case "addFolder": {
      const name = action.payload.name.trim();
      if (!name || state.folders.includes(name)) return state;
      return { ...state, folders: [...state.folders, name] };
    }

    case "toggleFollow": {
      const has = state.followingIds.includes(action.payload.userId);
      return {
        ...state,
        followingIds: has
          ? state.followingIds.filter((id) => id !== action.payload.userId)
          : [...state.followingIds, action.payload.userId],
      };
    }

    case "addSubmission":
      return {
        ...state,
        submissions: [action.payload, ...state.submissions],
        notifications: [
          {
            id: `sub-${action.payload.id}`,
            kind: "moderation",
            title: "Article submitted for review ✍️",
            body: `"${action.payload.title}" is now pending moderation.`,
            createdAt: new Date().toISOString(),
            read: false,
            href: "/write",
          },
          ...state.notifications,
        ],
      };

    case "updateSubmission": {
      const submissions = state.submissions.map((s) =>
        s.id === action.payload.id ? { ...s, ...action.payload.changes, updatedAt: new Date().toISOString() } : s,
      );
      let next = { ...state, submissions };
      const changed = submissions.find((s) => s.id === action.payload.id);
      if (changed && (changed.status === "approved" || changed.status === "published")) {
        next = evaluateBadges(next);
        next.notifications = [
          {
            id: `sub-approved-${changed.id}-${Date.now()}`,
            kind: "moderation",
            title: "Your article was approved! 🎉",
            body: `"${changed.title}" is now live for the community.`,
            createdAt: new Date().toISOString(),
            read: false,
            href: "/write",
          },
          ...next.notifications,
        ];
      }
      return next;
    }

    case "readNotification":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, read: true } : n,
        ),
      };

    case "readAllNotifications":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };

    case "pushNotification":
      return { ...state, notifications: [action.payload, ...state.notifications] };

    case "setConfig":
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface StoreValue {
  state: UserState;
  dispatch: React.Dispatch<Action>;
  hydrated: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, freshState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        dispatch({ type: "hydrate", payload: { ...freshState(), ...JSON.parse(raw) } });
      } else {
        // First visit: show the auth screen (signedIn is false in freshState).
        dispatch({ type: "hydrate", payload: freshState() });
      }
    } catch {
      dispatch({ type: "hydrate", payload: freshState() });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, hydrated: true }), [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ─── Selectors / derived helpers ─────────────────────────────────────────────

export function useDerived() {
  const { state } = useStore();
  const level = levelFromXp(state.xp);
  const towerHeight = state.completed.length;
  const quizAccuracy =
    state.quizResults.length > 0
      ? state.quizResults.reduce((a, q) => a + q.score, 0) / state.quizResults.length
      : 0;
  const writingUnlocked =
    state.completed.length >= state.writingUnlockArticles ||
    state.activeDays.length >= state.writingUnlockDays;
  const unreadNotifications = state.notifications.filter((n) => !n.read).length;
  return { level, towerHeight, quizAccuracy, writingUnlocked, unreadNotifications };
}
