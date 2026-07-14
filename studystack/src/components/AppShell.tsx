"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { useTheme, type ThemePref } from "@/lib/theme";
import { AuthScreen } from "./AuthScreen";
import { AssistantWidget } from "./Assistant";
import { AvatarBadge } from "./Avatar";
import { levelTitle } from "@/lib/gamification";

const NAV = [
  { href: "/", label: "Home", icon: "🏠", tour: "nav-home" },
  { href: "/discover", label: "Discover", icon: "🔍", tour: "nav-discover" },
  { href: "/learn", label: "Learn", icon: "📖", tour: "nav-learn" },
  { href: "/write", label: "Write", icon: "✍️", tour: "nav-write" },
  { href: "/profile", label: "Profile", icon: "👤", tour: "nav-profile" },
];

const THEME_OPTIONS: { value: ThemePref; icon: string; label: string }[] = [
  { value: "light", icon: "☀️", label: "Light" },
  { value: "dark", icon: "🌙", label: "Dark" },
  { value: "system", icon: "💻", label: "Auto" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const { level, unreadNotifications } = useDerived();
  const { theme, setTheme, hc, setHc } = useTheme();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="text-3xl animate-pulse">🧠</div>
      </div>
    );
  }

  if (!state.signedIn) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-line bg-card/80 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand text-xl">🧠</div>
          <div>
            <div className="text-lg font-black tracking-tight">Vera</div>
            <div className="text-[11px] text-muted">Science, gamified</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour}
                className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
                  active ? "text-white" : "text-muted hover:bg-soft hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-2xl gradient-purple"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/awareness/cancer"
            data-tour="nav-cancer"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
              isActive(pathname, "/awareness") ? "bg-soft text-ink" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <span className="text-lg">🎗️</span> Cancer Awareness
          </Link>
          <Link
            href="/tower"
            data-tour="nav-towers"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
              isActive(pathname, "/tower") ? "bg-soft text-ink" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <span className="text-lg">🏗️</span> Towers
          </Link>
          <Link
            href="/bookmarks"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
              isActive(pathname, "/bookmarks") ? "bg-soft text-ink" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <span className="text-lg">🔖</span> Favorites
          </Link>
          <Link
            href="/leaderboard"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
              isActive(pathname, "/leaderboard") ? "bg-soft text-ink" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <span className="text-lg">🏆</span> Leaderboard
          </Link>
          {state.isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
                isActive(pathname, "/admin") ? "bg-soft text-ink" : "text-muted hover:bg-soft hover:text-ink"
              }`}
            >
              <span className="text-lg">🛡️</span> Admin
            </Link>
          )}

          <div className="my-2 border-t border-line" />
          <Link
            href="/notifications"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
              isActive(pathname, "/notifications") ? "bg-soft text-ink" : "text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            <span className="text-lg">🔔</span> Notifications
            {unreadNotifications > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full gradient-pink px-1.5 text-[11px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>
        </nav>

        <div className="space-y-2 p-3">
          <Link href="/profile" className="flex items-center gap-3 rounded-2xl bg-canvas p-3 transition hover:bg-soft">
            <AvatarBadge value={state.avatar} size="h-10 w-10 text-xl" className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-ink">{state.displayName}</div>
              <div className="truncate text-[11px] text-muted">
                Lvl {level.level} · {levelTitle(level.level)}
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                aria-label={`${opt.label} theme`}
                aria-pressed={theme === opt.value}
                className={`rounded-lg py-1.5 text-xs font-bold transition ${
                  theme === opt.value ? "bg-card text-ink card-shadow" : "text-muted hover:text-ink"
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          <button
            onClick={() => setHc(!hc)}
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-muted hover:bg-soft"
          >
            {hc ? "◐ High contrast: on" : "◐ High contrast: off"}
          </button>
          <button
            onClick={() => dispatch({ type: "signOut" })}
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-muted hover:bg-soft"
          >
            ↩ Sign out
          </button>
          <div className="flex items-center gap-3 px-3 pt-1 text-[11px] text-muted">
            <Link href="/about" className="hover:text-ink">About</Link>
            <Link href="/contact" className="hover:text-ink">Contact</Link>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-card/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl gradient-brand text-base">🧠</div>
          <span className="text-lg font-black tracking-tight">Vera</span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700">
            🔥 {state.streak}
          </div>
          <Link
            href="/notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-soft"
            aria-label="Notifications"
          >
            🔔
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full gradient-pink px-1 text-[10px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 lg:max-w-4xl lg:px-8 lg:pb-12 lg:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-card/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
              >
                <span className={`text-xl transition ${active ? "scale-110" : "opacity-60"}`}>{item.icon}</span>
                <span className={`text-[10px] font-bold ${active ? "text-brand-700" : "text-muted"}`}>
                  {item.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="bottom-active"
                    className="absolute -top-px h-1 w-8 rounded-full gradient-pink"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <AssistantWidget />
    </div>
  );
}
