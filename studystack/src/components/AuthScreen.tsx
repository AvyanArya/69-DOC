"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Button } from "./ui";
import { STUDY_COUNT, STUDENT_COUNT } from "@/lib/content";
import { GRADE_LEVELS } from "@/lib/data/gradeLevels";
import { CATEGORIES } from "@/lib/data/categories";
import { AvatarBuilder } from "./Avatar";
import { DEFAULT_AVATAR_CONFIG, encodeAvatarConfig, type AvatarConfig } from "@/lib/data/avatarParts";
import type { Category, GradeLevel } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const { dispatch } = useStore();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>("grade-9-10");
  const [interests, setInterests] = useState<Category[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [touched, setTouched] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = mode === "login" || emailValid;

  function toggleInterest(c: Category) {
    setInterests((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function submit() {
    if (!canSubmit) {
      setTouched(true);
      return;
    }
    dispatch({
      type: "signIn",
      payload: {
        displayName: displayName.trim() || "Learner",
        username: (username.trim() || "learner").replace(/\s+/g, "_").toLowerCase(),
        avatar: encodeAvatarConfig(avatarConfig),
        email: email.trim(),
        gradeLevel,
        interests,
      },
    });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* Hero / pitch */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-1"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-grape-500 card-shadow">
            🔥 Make science a daily habit
          </div>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Learn science like a{" "}
            <span className="text-gradient">game</span>.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            Read one study a day, take a quiz, build a streak, and grow your{" "}
            <b className="text-ink">Knowledge Tower</b>. Level up until you can publish your own research.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-card px-4 py-3 card-shadow">
              <div className="text-xl font-extrabold text-ink">{STUDY_COUNT}+</div>
              <div className="text-xs text-muted">Scientific studies</div>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3 card-shadow">
              <div className="text-xl font-extrabold text-ink">{STUDENT_COUNT}+</div>
              <div className="text-xs text-muted">Student articles</div>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3 card-shadow">
              <div className="text-xl font-extrabold text-ink">10</div>
              <div className="text-xs text-muted">Science topics</div>
            </div>
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="order-2 mx-auto w-full max-w-md"
        >
          <div className="rounded-[2rem] bg-card p-7 soft-shadow">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-2xl">🧠</div>
              <div>
                <div className="text-xl font-black tracking-tight">Vera</div>
                <div className="text-xs text-muted">Science, one streak at a time</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1">
              <button
                onClick={() => setMode("signup")}
                className={`rounded-xl py-2 text-sm font-bold transition ${mode === "signup" ? "bg-card text-ink card-shadow" : "text-muted"}`}
              >
                Sign up
              </button>
              <button
                onClick={() => setMode("login")}
                className={`rounded-xl py-2 text-sm font-bold transition ${mode === "login" ? "bg-card text-ink card-shadow" : "text-muted"}`}
              >
                Log in
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Build your character</label>
                  <AvatarBuilder config={avatarConfig} onChange={setAvatarConfig} />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex"
                  className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Username</label>
                <div className="flex items-center rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand/50">
                  <span className="text-muted">@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_learns"
                    className="w-full bg-transparent py-3 pl-1 text-ink outline-none"
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="you@example.com"
                    className={`w-full rounded-2xl border bg-canvas px-4 py-3 text-ink outline-none focus:border-brand/50 ${
                      touched && !emailValid ? "border-rose-400" : "border-line"
                    }`}
                  />
                  {touched && !emailValid && (
                    <p className="mt-1 text-xs font-semibold text-rose-500">Enter a valid email to continue.</p>
                  )}
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Grade / school level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
                    className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-brand/50"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.emoji} {g.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    We&apos;ll tailor recommended studies to your level so you&apos;re never stuck on something too advanced.
                  </p>
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">
                    What are you interested in? <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleInterest(c.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          interests.includes(c.id) ? "gradient-purple text-white" : "bg-canvas text-muted hover:text-ink"
                        }`}
                      >
                        {c.emoji} {c.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Vera is multi-disciplinary — pick a few to steer recommendations, we&apos;ll still surface new fields too.
                  </p>
                </div>
              )}

              <Button onClick={submit} size="lg" className="w-full" disabled={!canSubmit}>
                {mode === "signup" ? "Start learning" : "Continue"} →
              </Button>

              <button
                onClick={submit}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-card py-3 font-semibold text-ink transition hover:border-brand/40"
              >
                <span className="text-lg">🔵</span> Continue with Google
              </button>

              <p className="text-center text-xs text-muted">
                Demo mode — no real account is created. Your progress is saved in this browser.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
