"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { CANCER_AWARENESS_ID } from "@/lib/store";
import { Button } from "@/components/ui";
import { GenericQuizRunner } from "@/components/Quiz";
import type { QuizQuestion } from "@/lib/types";

const PREVENTION_PILLARS = [
  { emoji: "🚭", title: "Don't use tobacco", body: "Avoiding all forms of tobacco is the single biggest preventable step against cancer risk." },
  { emoji: "🍷", title: "Limit alcohol", body: "Drinking less (or not at all) lowers the risk of several cancer types." },
  { emoji: "⚖️", title: "Maintain a healthy weight", body: "Carrying excess weight is linked to a higher risk of a number of cancers." },
  { emoji: "🥦", title: "Eat well", body: "More vegetables, fruit and fibre; less processed and red meat, supports overall risk reduction." },
  { emoji: "🏃", title: "Stay active", body: "Regular movement is linked to lower risk for several cancer types, independent of weight." },
  { emoji: "☀️", title: "Protect your skin", body: "Shade, sunscreen and avoiding tanning beds all reduce UV-related skin cancer risk." },
  { emoji: "💉", title: "Get recommended vaccines", body: "HPV and Hepatitis B vaccines help prevent infections linked to certain cancers." },
  { emoji: "🩺", title: "Attend screenings", body: "Age-appropriate screening can catch some cancers early, when they're most treatable." },
];

const MYTHS = [
  { myth: "A cancer diagnosis always means the worst.", fact: "Many cancers are highly treatable, especially when found early — outcomes vary hugely by type and stage." },
  { myth: "Only older people get cancer.", fact: "Risk does rise with age, but cancer can occur at any age, including in children and young adults." },
  { myth: "Cutting out sugar completely can \"starve\" or cure cancer.", fact: "All cells, cancerous or not, use sugar for energy. No evidence shows eliminating sugar cures cancer — a balanced diet is the evidence-based approach." },
  { myth: "If it's not in your family, you won't get it.", fact: "Most cancers result from a mix of lifestyle, environment and chance mutations — only a minority are strongly hereditary." },
  { myth: "Herbal or 'natural' remedies can replace medical treatment.", fact: "No supplement or alternative remedy is a proven substitute for medical care — always discuss options with a qualified doctor." },
];

const WARNING_SIGNS = [
  "A change in bowel or bladder habits that doesn't go away",
  "A sore or wound that doesn't heal",
  "Unusual bleeding or discharge",
  "A new thickening or lump, anywhere on the body",
  "Indigestion or difficulty swallowing that persists",
  "An obvious change in a wart or mole",
  "A nagging cough or hoarseness that lingers",
];

const AWARENESS_QUIZ: QuizQuestion[] = [
  {
    id: "cancer-1",
    kind: "multiple-choice",
    prompt: "Which of these is the single biggest preventable risk factor for cancer?",
    options: ["Tobacco use", "Occasionally eating sugar", "Being left-handed", "Drinking coffee"],
    correctIndex: 0,
    explanation: "Avoiding all tobacco use is the single largest preventable step against cancer risk.",
  },
  {
    id: "cancer-2",
    kind: "true-false",
    prompt: "Finding a lump always means someone has cancer.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Many lumps are harmless (like cysts or fatty deposits) — but any new or changing lump should be checked by a doctor.",
  },
  {
    id: "cancer-3",
    kind: "multiple-choice",
    prompt: "Which vaccines are linked to preventing infections that can cause certain cancers?",
    options: ["HPV and Hepatitis B vaccines", "Flu and tetanus vaccines", "Only childhood vaccines", "There are no such vaccines"],
    correctIndex: 0,
    explanation: "HPV and Hepatitis B vaccines protect against infections linked to cervical, liver and some other cancers.",
  },
  {
    id: "cancer-4",
    kind: "true-false",
    prompt: "Regular physical activity is linked to a lower risk of several cancers, even without weight loss.",
    options: ["True", "False"],
    correctIndex: 0,
    explanation: "Activity itself is linked to lower risk for several cancer types, independent of its effect on weight.",
  },
  {
    id: "cancer-5",
    kind: "matching",
    prompt: "Match each habit to the kind of protection it mainly offers.",
    pairs: [
      { left: "Sunscreen & shade", right: "Reduces UV-related skin cancer risk" },
      { left: "Not smoking", right: "Removes the single biggest preventable cancer risk" },
      { left: "Screening visits", right: "Helps catch some cancers earlier, when more treatable" },
      { left: "Balanced diet", right: "Supports overall long-term risk reduction" },
    ],
    explanation: "Different habits protect against different risks — together they add up.",
  },
  {
    id: "cancer-6",
    kind: "scenario",
    prompt: "A friend says cutting all sugar from their diet will cure their relative's cancer. What's the best response?",
    options: [
      "Gently explain that no food alone cures cancer, and encourage sticking with their doctor's treatment plan alongside a balanced diet",
      "Agree completely and recommend they stop all treatment",
      "Say nothing, it's not important",
      "Tell them to only eat sugar to test the theory",
    ],
    correctIndex: 0,
    explanation: "Diet supports overall health, but it isn't a substitute for medical treatment — this is one of the most common cancer myths.",
  },
];

export default function CancerAwarenessPage() {
  const { state, dispatch } = useStore();
  const alreadyDone = state.completed.some((c) => c.articleId === CANCER_AWARENESS_ID);

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Home</Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600 p-7 text-white soft-shadow"
      >
        <div className="text-5xl">🎗️</div>
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Cancer Awareness &amp; Prevention</h1>
        <p className="mt-2 max-w-lg text-white/90">
          A student-friendly guide to what cancer is, the prevention steps with the strongest evidence behind them,
          warning signs worth knowing, and common myths worth unlearning.
        </p>
        <div className="mt-4 rounded-2xl bg-white/15 p-3 text-sm text-white/90">
          ⚕️ This page shares general health education — it is <b>not medical advice</b>. Always talk to a qualified
          healthcare professional about your own health or someone else&rsquo;s.
        </div>
      </motion.div>

      {/* What is cancer */}
      <section className="rounded-3xl bg-card p-6 card-shadow">
        <h2 className="text-xl font-black text-ink">What actually is cancer?</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Your body is built from trillions of cells that normally grow, divide and die in a controlled way. Cancer
          starts when something goes wrong in that control system — a cell picks up changes (mutations) that let it
          divide when it shouldn&apos;t, ignore normal &ldquo;stop&rdquo; signals, and avoid the usual cell clean-up process. Over time
          those cells can build up into a tumour, and in some cases spread to other parts of the body. There isn&apos;t
          one single cancer — it&apos;s a large family of diseases that share this same broken-control idea but behave very
          differently depending on where and how they start.
        </p>
      </section>

      {/* Prevention pillars */}
      <section>
        <h2 className="mb-3 px-1 text-xl font-black text-ink">Prevention steps with strong evidence</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PREVENTION_PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white p-4 card-shadow">
              <div className="text-3xl">{p.emoji}</div>
              <h3 className="mt-2 font-bold text-ink">{p.title}</h3>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Warning signs */}
      <section className="rounded-3xl border-2 border-brand/15 bg-brand/5 p-6">
        <h2 className="flex items-center gap-2 text-xl font-black text-brand-700">⚠️ Warning signs worth knowing</h2>
        <p className="mt-1 text-sm text-muted">
          None of these automatically mean cancer — most have harmless explanations — but they&apos;re worth getting
          checked by a doctor if they persist or don&apos;t have an obvious cause:
        </p>
        <ul className="mt-3 space-y-2">
          {WARNING_SIGNS.map((s) => (
            <li key={s} className="flex gap-2 text-[15px] text-ink">
              <span className="text-brand-700">•</span> {s}
            </li>
          ))}
        </ul>
      </section>

      {/* Myths vs facts */}
      <section>
        <h2 className="mb-3 px-1 text-xl font-black text-ink">Myths vs. facts</h2>
        <div className="space-y-3">
          {MYTHS.map((m) => (
            <div key={m.myth} className="rounded-2xl bg-white p-4 card-shadow">
              <div className="flex gap-2 text-sm font-bold text-rose-600">
                <span>❌ Myth</span>
              </div>
              <p className="mt-1 text-[15px] text-ink">{m.myth}</p>
              <div className="mt-3 flex gap-2 text-sm font-bold text-emerald-600">
                <span>✅ Fact</span>
              </div>
              <p className="mt-1 text-[15px] text-muted">{m.fact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screening */}
      <section className="rounded-3xl bg-card p-6 card-shadow">
        <h2 className="text-xl font-black text-ink">Screening, in general terms</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Many countries recommend certain cancer screenings starting at particular ages — for example checks related
          to breast, cervical, bowel or prostate cancer — because catching some cancers early can make treatment more
          effective. Exact recommendations vary by country, personal and family history, and change over time as
          evidence updates. This page can&apos;t tell you what&apos;s right for you — that&apos;s a conversation for you and your
          doctor, based on your age, history and local guidelines.
        </p>
      </section>

      {/* Quiz */}
      <section id="quiz">
        <h2 className="mb-3 px-1 text-xl font-black text-ink">Check your understanding</h2>
        {alreadyDone ? (
          <div className="rounded-3xl bg-emerald-50 p-6 text-center">
            <div className="text-4xl">✅</div>
            <h3 className="mt-2 text-lg font-black text-emerald-700">Guide completed</h3>
            <p className="mt-1 text-sm text-emerald-700/80">You&apos;ve earned the Health Advocate badge 🎗️</p>
          </div>
        ) : (
          <GenericQuizRunner
            questions={AWARENESS_QUIZ}
            passScore={0.6}
            introEmoji="🎗️"
            introTitle="Cancer Awareness Check"
            introBody={
              <>{AWARENESS_QUIZ.length} questions on prevention, warning signs and myths · earn XP and the Health Advocate badge.</>
            }
            introButtonLabel="Start check →"
            onFinish={({ passed }) => {
              if (passed) {
                dispatch({
                  type: "markRead",
                  payload: { articleId: CANCER_AWARENESS_ID, xp: 60, coins: 20 },
                });
              }
            }}
            renderResult={({ correct, total, score, passed, retry }) => (
              <div className={`rounded-3xl p-6 text-center text-white soft-shadow ${passed ? "gradient-pink" : "gradient-purple"}`}>
                <div className="text-5xl">{passed ? "🎉" : "📚"}</div>
                <h3 className="mt-2 text-2xl font-black">{passed ? "Nice work!" : "Give it another go"}</h3>
                <p className="mt-1 text-white/85">
                  You got {correct}/{total} ({Math.round(score * 100)}%)
                </p>
                {passed ? (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="rounded-2xl bg-white/15 px-4 py-2">
                      <div className="text-lg font-black">+60</div>
                      <div className="text-[11px] text-white/80">XP</div>
                    </div>
                    <div className="rounded-2xl bg-white/15 px-4 py-2">
                      <div className="text-lg font-black">🎗️</div>
                      <div className="text-[11px] text-white/80">Health Advocate</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <Button variant="outline" className="!border-white/30 !bg-white/20 !text-white" onClick={retry}>
                      Try again
                    </Button>
                  </div>
                )}
              </div>
            )}
          />
        )}
      </section>

      {/* Resources */}
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="text-lg font-black text-ink">📚 Learn more</h2>
        <p className="mt-2 text-sm text-muted">
          For up-to-date, authoritative guidance, look up these organisations directly: the World Health Organization
          (WHO), your country&apos;s national cancer institute, the American Cancer Society (ACS), and Cancer Research UK.
          They publish free, regularly-updated public information on prevention, screening and support.
        </p>
      </section>
    </div>
  );
}
