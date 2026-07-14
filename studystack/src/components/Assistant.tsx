"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface KBEntry {
  keywords: string[];
  answer: string;
  href?: string;
  label?: string;
}

const KB: KBEntry[] = [
  {
    keywords: ["write", "publish", "writing", "unlock writing", "submit"],
    answer:
      "Writing has to be earned: read enough studies, take enough real quizzes with a solid accuracy record, then pass a referencing skills check. Check the Write tab to see your live progress toward all three.",
    href: "/write",
    label: "Go to Write",
  },
  {
    keywords: ["tower", "mastery", "tier", "foundation", "pyramid"],
    answer:
      "Every topic has its own Knowledge Tower with three tiers — Foundation, Core, Mastery. You can explore any tier any time, no locking — the more you read at a level, the more progress you build toward mastering it.",
    href: "/tower",
    label: "View Towers",
  },
  {
    keywords: ["grade", "level", "postgrad", "undergrad", "school"],
    answer:
      "Your grade level tailors which studies get recommended so you're never stuck on something too advanced (or too basic). Change it any time in Profile → Account & grade level.",
    href: "/profile",
    label: "Go to Profile",
  },
  {
    keywords: ["citation", "reference", "quiz gate", "verify", "skills check"],
    answer:
      "Before you can publish, you'll take a referencing & citation skills check — it tests judgement, not just recall, so guessing doesn't get you far. You can retake it any time.",
  },
  {
    keywords: ["badge", "xp", "coin", "streak", "level up"],
    answer:
      "You earn XP and coins by reading studies and passing quizzes, build a daily streak (with a freeze if you miss a day), and unlock badges for milestones. Check your Profile for the full list.",
    href: "/profile",
    label: "Go to Profile",
  },
  {
    keywords: ["bookmark", "favorite", "favourite", "save"],
    answer: "Tap the bookmark icon on any article to save it to a folder — manage folders from the Favorites tab.",
    href: "/bookmarks",
    label: "Go to Favorites",
  },
  {
    keywords: ["discover", "swipe", "feed"],
    answer: "Discover is a swipeable, TikTok-style feed — scroll or use the arrows to move between studies, and search to jump straight to a topic.",
    href: "/discover",
    label: "Go to Discover",
  },
  {
    keywords: ["cancer", "awareness"],
    answer: "The Cancer Awareness page covers prevention, myths, warning signs and specific cancer types — tap any type for symptoms, guidance and suggested reading.",
    href: "/awareness/cancer",
    label: "Go to Cancer Awareness",
  },
  {
    keywords: ["dark mode", "theme", "light mode", "contrast"],
    answer: "Switch Light/Dark/Auto and toggle high contrast from the sidebar (desktop) or Profile → Appearance.",
    href: "/profile",
    label: "Go to Profile",
  },
  {
    keywords: ["avatar", "character", "customi"],
    answer: "You can customise your avatar from the sign-up screen or Profile — pick a look that's actually yours, not just an animal.",
    href: "/profile",
    label: "Go to Profile",
  },
  {
    keywords: ["search", "find article", "topic"],
    answer: "Search on Learn or Discover understands related terms too — searching \"neurology\" finds Neuroscience articles, \"economics\" finds Finance articles, and so on.",
    href: "/learn",
    label: "Go to Learn",
  },
  {
    keywords: ["admin", "moderation", "moderate"],
    answer: "Admins review submissions in Admin → Moderation, can request changes or reject with a message (the author gets notified), and manage featured content, categories and cover photos in the Content tab.",
    href: "/admin",
    label: "Go to Admin",
  },
];

const FALLBACK = "I'm not totally sure about that one — try asking about writing, towers, grade levels, quizzes, badges, or search. Or tap \"Take the tour\" below!";

function findAnswer(query: string): KBEntry | null {
  const q = query.toLowerCase();
  let best: KBEntry | null = null;
  let bestScore = 0;
  for (const entry of KB) {
    const score = entry.keywords.reduce((s, k) => (q.includes(k) ? s + k.length : s), 0);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore > 0 ? best : null;
}

const SUGGESTIONS = ["How do I unlock writing?", "How do towers work?", "How do I change my grade level?", "How do badges work?"];

interface TourStep {
  target: string;
  title: string;
  body: string;
}

const TOUR_STEPS: TourStep[] = [
  { target: "nav-home", title: "Home 🏠", body: "Your daily hub — streak, top tower, featured study and personalised recommendations." },
  { target: "nav-discover", title: "Discover 🔍", body: "A swipeable feed of studies across every subject — scroll or use the arrows." },
  { target: "nav-learn", title: "Learn 📖", body: "Search and filter every study and student article by topic, level and type." },
  { target: "nav-write", title: "Write ✍️", body: "Once you've earned it, publish your own articles here — moderated before they go live." },
  { target: "nav-profile", title: "Profile 👤", body: "Your stats, badges, towers, grade level, interests, appearance and account settings all live here." },
  { target: "nav-towers", title: "Towers 🏗️", body: "Explore mastery towers for every subject — any tier, any time, no locking." },
  { target: "nav-cancer", title: "Cancer Awareness 🎗️", body: "Prevention, myths, warning signs and specific cancer types, with quizzes and badges." },
];

type Message = { from: "user" | "assistant"; text: string; href?: string; label?: string };

function Spotlight({ target, onNext, onBack, onSkip, onFinish, stepIndex, total }: {
  target: TourStep;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
  stepIndex: number;
  total: number;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Measure (and re-measure on resize/scroll) whenever the target step changes.
  // If this step's nav item isn't visible at the current viewport (e.g. Towers
  // on mobile, which only has 5 bottom-nav slots), skip straight past it —
  // folded into this same effect so there's no separate effect racing on the
  // initial (pre-measurement) null render.
  useEffect(() => {
    let skipped = false;
    function measure() {
      const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target.target}"]`));
      const visible = els.find((el) => el.offsetParent !== null);
      if (visible) {
        setRect(visible.getBoundingClientRect());
      } else if (!skipped) {
        skipped = true;
        onNext();
      }
    }
    setRect(null);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [target, onNext]);

  const isLast = stepIndex === total - 1;

  if (!rect) return null;

  const pad = 8;
  const box = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
  const tooltipBelow = box.top < window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute rounded-2xl transition-all duration-300"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute w-72 rounded-2xl bg-card p-4 soft-shadow"
        style={{
          top: tooltipBelow ? box.top + box.height + 12 : undefined,
          bottom: tooltipBelow ? undefined : window.innerHeight - box.top + 12,
          left: Math.min(Math.max(box.left, 12), window.innerWidth - 300),
        }}
      >
        <div className="text-xs font-bold uppercase tracking-wide text-brand-700">Step {stepIndex + 1} / {total}</div>
        <h3 className="mt-1 font-black text-ink">{target.title}</h3>
        <p className="mt-1 text-sm text-muted">{target.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={onSkip} className="text-xs font-semibold text-muted hover:text-ink">Skip tour</button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button onClick={onBack} className="rounded-xl bg-canvas px-3 py-1.5 text-xs font-bold text-ink">
                ← Back
              </button>
            )}
            <button onClick={isLast ? onFinish : onNext} className="rounded-xl gradient-purple px-3 py-1.5 text-xs font-bold text-white">
              {isLast ? "Finish 🎉" : "Next →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "assistant", text: "Hey, I'm Vero 🦉 — your guide around Vera. Ask me how to do something, or take the tour!" },
  ]);
  const [input, setInput] = useState("");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function ask(text: string) {
    if (!text.trim()) return;
    const match = findAnswer(text);
    setMessages((m) => [
      ...m,
      { from: "user", text },
      match
        ? { from: "assistant", text: match.answer, href: match.href, label: match.label }
        : { from: "assistant", text: FALLBACK },
    ]);
    setInput("");
  }

  function startTour() {
    setOpen(false);
    setTourStep(0);
  }

  const tourNext = useCallback(() => setTourStep((s) => Math.min((s ?? 0) + 1, TOUR_STEPS.length - 1)), []);
  const tourBack = useCallback(() => setTourStep((s) => Math.max((s ?? 0) - 1, 0)), []);
  const tourSkip = useCallback(() => setTourStep(null), []);

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-24 right-4 z-[90] grid h-14 w-14 place-items-center rounded-full gradient-purple text-2xl text-white soft-shadow lg:bottom-6"
        aria-label="Open Vero, your Vera assistant"
      >
        {open ? "✕" : "🦉"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-4 z-[90] flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl bg-card soft-shadow lg:bottom-24"
          >
            <div className="flex items-center gap-2 gradient-purple p-4 text-white">
              <span className="text-2xl">🦉</span>
              <div>
                <div className="font-black">Vero</div>
                <div className="text-xs text-white/80">Your Vera guide</div>
              </div>
            </div>

            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.from === "user" ? "gradient-pink text-white" : "bg-canvas text-ink"
                    }`}
                  >
                    {m.text}
                    {m.href && (
                      <Link href={m.href} className="mt-2 block text-xs font-bold text-brand-700 underline">
                        {m.label ?? "Take me there"} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
                <button onClick={startTour} className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                  🧭 Take the tour
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Vero anything…"
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand/40"
                />
                <button type="submit" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-purple text-white">
                  →
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tourStep !== null && (
        <Spotlight
          target={TOUR_STEPS[tourStep]}
          stepIndex={tourStep}
          total={TOUR_STEPS.length}
          onNext={tourNext}
          onBack={tourBack}
          onSkip={tourSkip}
          onFinish={tourSkip}
        />
      )}
    </>
  );
}
