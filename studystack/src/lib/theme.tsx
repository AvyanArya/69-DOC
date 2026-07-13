"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "system" | "light" | "dark";

const THEME_KEY = "vera:theme";
const HC_KEY = "vera:hc";

interface ThemeValue {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  resolvedTheme: "light" | "dark";
  hc: boolean;
  setHc: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [hc, setHcState] = useState(false);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY) as ThemePref | null;
      if (storedTheme) setThemeState(storedTheme);
      const storedHc = localStorage.getItem(HC_KEY);
      if (storedHc) setHcState(storedHc === "1");
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("hc", hc);
  }, [hc]);

  function setTheme(t: ThemePref) {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  }

  function setHc(v: boolean) {
    setHcState(v);
    try {
      localStorage.setItem(HC_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, hc, setHc }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
