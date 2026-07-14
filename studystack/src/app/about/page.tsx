"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/data/categories";
import { STUDY_COUNT, STUDENT_COUNT } from "@/lib/content";

const VALUES = [
  { emoji: "🧠", title: "Learn like a game", body: "Streaks, XP, badges and towers make consistent learning feel rewarding instead of like a chore." },
  { emoji: "🌍", title: "Genuinely multi-disciplinary", body: "Biology to politics, chemistry to art history — real understanding rarely stays in one subject." },
  { emoji: "🎯", title: "Actually tailored", body: "Your grade level and interests shape what gets recommended, so material always matches what you can follow." },
  { emoji: "🛡️", title: "Moderated, not anonymous", body: "Student writers earn publishing rights through reading and a real skills check, then go through human moderation." },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <Link href="/profile" className="text-sm font-semibold text-muted hover:text-ink">← Back</Link>

      <div className="overflow-hidden rounded-3xl gradient-purple p-8 text-center text-white soft-shadow">
        <div className="text-5xl">🧠</div>
        <h1 className="mt-3 text-3xl font-black">About Vera</h1>
        <p className="mx-auto mt-2 max-w-md text-white/85">
          Vera turns learning across science, humanities and the real world into a daily habit — read a study,
          take a quiz, build a streak, and grow toward mastery at your own pace.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card p-4 text-center card-shadow">
          <div className="text-2xl font-black text-ink">{STUDY_COUNT}+</div>
          <div className="text-xs text-muted">Studies</div>
        </div>
        <div className="rounded-2xl bg-card p-4 text-center card-shadow">
          <div className="text-2xl font-black text-ink">{STUDENT_COUNT}+</div>
          <div className="text-xs text-muted">Student articles</div>
        </div>
        <div className="rounded-2xl bg-card p-4 text-center card-shadow">
          <div className="text-2xl font-black text-ink">{CATEGORIES.length}</div>
          <div className="text-xs text-muted">Subjects</div>
        </div>
      </div>

      <section className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="text-lg font-black text-ink">What we&apos;re going for</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl bg-canvas p-4">
              <div className="text-2xl">{v.emoji}</div>
              <h3 className="mt-1.5 font-bold text-ink">{v.title}</h3>
              <p className="mt-1 text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="text-lg font-black text-ink">Subjects on Vera</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <span key={c.id} className="rounded-full bg-canvas px-3 py-1.5 text-sm font-semibold text-ink">
              {c.emoji} {c.name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 card-shadow">
        <h2 className="text-lg font-black text-ink">Questions or feedback?</h2>
        <p className="mt-1 text-sm text-muted">We&apos;d genuinely like to hear from you.</p>
        <Link href="/contact" className="mt-3 inline-flex rounded-2xl gradient-pink px-4 py-2.5 text-sm font-bold text-white">
          Get in touch →
        </Link>
      </section>
    </div>
  );
}
