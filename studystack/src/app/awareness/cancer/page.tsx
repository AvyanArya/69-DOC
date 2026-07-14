"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { CANCER_AWARENESS_SECTIONS } from "@/lib/store";
import { Button } from "@/components/ui";
import { GenericQuizRunner } from "@/components/Quiz";
import { ARTICLES } from "@/lib/content";
import type { Article, QuizQuestion } from "@/lib/types";

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
  { myth: "Cancer is contagious, like a cold.", fact: "Cancer itself doesn't spread between people. A few viruses linked to some cancers (like HPV) are contagious, but the cancer itself is not." },
];

// Gradients match each cancer's real-world awareness-ribbon colour(s), e.g.
// pink for breast cancer, so the badge is instantly recognisable.
const CANCER_TYPES = [
  { emoji: "🎗️", name: "Breast cancer", gradient: "from-pink-400 via-pink-500 to-rose-500", body: "Starts in breast tissue. One of the most common cancers; can affect anyone, though it's more common in women. Regular self-awareness and age-appropriate screening help with early detection.", searchTerms: ["breast"], symptoms: ["A new lump or thickening in the breast or underarm", "A change in breast size, shape, or skin texture (dimpling, puckering)", "Nipple discharge other than breast milk, or a nipple turning inward", "Persistent breast or nipple pain"], whatToDo: "See a doctor promptly about any new lump or change. Most breast lumps turn out to be benign, but only an exam (and imaging if needed) can confirm that — don't wait it out." },
  { emoji: "🫁", name: "Lung cancer", gradient: "from-slate-200 via-slate-300 to-zinc-400", body: "Starts in the lungs. Smoking is the leading risk factor by far, though it can occur in non-smokers too, including from radon or air pollution exposure.", searchTerms: ["lung", "smoking"], symptoms: ["A persistent cough that doesn't go away or gets worse", "Coughing up blood, even a small amount", "Shortness of breath or unexplained wheezing", "Unexplained weight loss and chest pain"], whatToDo: "Respiratory symptoms lasting more than a few weeks — especially in smokers or ex-smokers — deserve a doctor's visit. Early imaging catches many cases while still very treatable." },
  { emoji: "🩸", name: "Leukaemia & lymphoma", gradient: "from-orange-400 via-amber-500 to-violet-500", body: "Blood cancers that affect blood cells or the lymphatic (immune) system, rather than forming a single solid tumour. Can occur at any age, including in children.", searchTerms: ["blood", "immune"], symptoms: ["Persistent fatigue and unexplained fever", "Unexplained weight loss and night sweats", "Swollen lymph nodes in the neck, armpit or groin that don't go down", "Easy bruising or unusual bleeding"], whatToDo: "These overlap with many common illnesses, but if they persist for weeks without another explanation, a simple blood test can quickly rule serious causes in or out." },
  { emoji: "🧬", name: "Colorectal cancer", gradient: "from-blue-600 via-blue-700 to-indigo-800", body: "Starts in the colon or rectum. Linked to diet, activity levels and age; screening from a recommended age can catch precancerous growths early.", searchTerms: ["colorectal", "gut", "microbiome"], symptoms: ["A persistent change in bowel habits", "Blood in the stool or rectal bleeding", "Ongoing abdominal discomfort or cramping", "Unexplained weight loss and fatigue"], whatToDo: "Rectal bleeding or a lasting change in bowel habits should always be checked, even though haemorrhoids are a far more common cause. Routine screening from the recommended age catches most cases early." },
  { emoji: "🔬", name: "Prostate cancer", gradient: "from-sky-300 via-sky-400 to-blue-500", body: "Starts in the prostate gland. Risk rises with age; often grows slowly, and many cases are found through routine checks before symptoms appear.", searchTerms: ["prostate"], symptoms: ["Difficulty starting or stopping urination", "Weak or interrupted urine flow", "Frequent urination, especially at night", "Blood in urine or semen"], whatToDo: "Many of these symptoms come from common, non-cancerous prostate enlargement — but they're worth a simple check-up, especially after age 50." },
  { emoji: "☀️", name: "Skin cancer (melanoma)", gradient: "from-slate-600 via-slate-800 to-black", body: "Starts in skin cells, often linked to UV exposure. Melanoma is less common than other skin cancers but more likely to spread — new or changing moles are worth checking.", searchTerms: ["skin", "sunscreen", "uv"], symptoms: ["A new mole, or a mole that changes size, shape or colour", "A mole with irregular, asymmetric or blurred edges", "A sore that doesn't heal or keeps bleeding", "Itching or tenderness in a mole"], whatToDo: "Use the ABCDE rule — Asymmetry, Border, Colour, Diameter, Evolving — to check moles, and get any changing mole examined by a doctor promptly." },
  { emoji: "🎗️", name: "Cervical cancer", gradient: "from-teal-300 via-teal-400 to-cyan-500", body: "Starts in the cervix, most often linked to persistent HPV infection. HPV vaccination and regular screening are the two strongest protective tools.", searchTerms: ["vaccine", "hpv"], symptoms: ["Unusual vaginal bleeding — between periods, after sex, or after menopause", "Unusual vaginal discharge", "Pelvic pain, including during sex"], whatToDo: "Routine cervical screening catches most precancerous changes before symptoms even appear — don't skip a scheduled screening, and report unusual bleeding to a doctor." },
  { emoji: "🧠", name: "Brain tumours", gradient: "from-gray-400 via-gray-500 to-slate-600", body: "Can be cancerous or non-cancerous; symptoms vary widely depending on location and size. Less common overall, but occur across all age groups.", searchTerms: ["brain", "neuron"], symptoms: ["New, worsening or persistent headaches", "Seizures with no prior history", "Vision, balance or speech changes", "Unexplained nausea or personality changes"], whatToDo: "Any new neurological symptom, especially a first seizure or sudden vision/speech change, warrants prompt medical attention and imaging." },
  { emoji: "🫀", name: "Pancreatic cancer", gradient: "from-purple-400 via-purple-500 to-violet-600", body: "Starts in the pancreas. Less common but harder to detect early since symptoms often appear late; smoking and chronic pancreatitis raise risk.", searchTerms: ["pancrea", "insulin", "diabetes"], symptoms: ["Yellowing of the skin or eyes (jaundice)", "Unexplained weight loss and appetite loss", "Upper abdominal or back pain", "New-onset diabetes later in life"], whatToDo: "Jaundice or unexplained weight loss should always be checked promptly. Pancreatic cancer is harder to catch early, so acting fast on these signs genuinely matters." },
  { emoji: "💧", name: "Bladder cancer", gradient: "from-blue-400 via-yellow-400 to-purple-500", body: "Starts in the bladder lining. Smoking is a major risk factor; blood in urine is a common early warning sign worth checking.", searchTerms: ["bladder", "kidney"], symptoms: ["Blood in the urine, even just once", "Pain or burning during urination without an infection", "A frequent or urgent need to urinate", "Lower back pain on one side"], whatToDo: "Blood in the urine should never be ignored, even if it happens only once and then stops — get it checked." },
  { emoji: "🦋", name: "Thyroid cancer", gradient: "from-blue-400 via-pink-400 to-teal-400", body: "Starts in the thyroid gland in the neck. Often grows slowly and is frequently treatable, especially when caught through a routine neck check.", searchTerms: ["thyroid"], symptoms: ["A lump or swelling in the front of the neck", "Voice changes or persistent hoarseness", "Difficulty swallowing or breathing", "Swollen lymph nodes in the neck"], whatToDo: "A neck lump is usually benign, but any lump lasting more than a couple of weeks is worth having a doctor examine, and scan if needed." },
  { emoji: "🌸", name: "Ovarian cancer", gradient: "from-teal-400 via-cyan-500 to-teal-600", body: "Starts in the ovaries. Symptoms can be vague (bloating, pelvic discomfort), which is why persistent, unexplained changes are worth mentioning to a doctor.", searchTerms: ["ovar", "hormone"], symptoms: ["Persistent bloating", "Pelvic or abdominal pain", "Feeling full quickly when eating", "Urinary urgency or frequency"], whatToDo: "These symptoms are easy to dismiss since they're common — but if they're new, persistent most days for 3+ weeks, and unusual for you, see a doctor." },
];

const BENIGN_VS_MALIGNANT = {
  benign: "Grows locally and doesn't invade nearby tissue or spread elsewhere. Can still cause problems by pressing on nearby structures, but it isn't cancer.",
  malignant: "Cancerous — cells can invade nearby tissue and spread (metastasise) to distant parts of the body through the blood or lymphatic system. That ability to spread is what makes cancer dangerous, and why early detection matters so much.",
};

const WARNING_SIGNS = [
  "A change in bowel or bladder habits that doesn't go away",
  "A sore or wound that doesn't heal",
  "Unusual bleeding or discharge",
  "A new thickening or lump, anywhere on the body",
  "Indigestion or difficulty swallowing that persists",
  "An obvious change in a wart or mole",
  "A nagging cough or hoarseness that lingers",
];

const DAILY_FACTS = [
  "Avoiding tobacco is the single biggest preventable step against cancer risk worldwide.",
  "The HPV vaccine helps prevent infections linked to cervical and several other cancers.",
  "Regular physical activity is linked to lower risk for several cancer types, independent of weight.",
  "Skin cancer risk can be reduced simply with shade, sunscreen and avoiding tanning beds.",
  "Most cancers result from a mix of lifestyle, environment and chance — not just family history.",
  "Age-appropriate screening can catch some cancers early, when they're most treatable.",
  "Diets rich in vegetables, fruit and fibre are linked to lower overall cancer risk.",
  "Excess body weight is linked to a higher risk of several cancer types.",
  "Cutting sugar completely does not \"starve\" cancer — there's no evidence it cures anything.",
  "Cancer can occur at any age, though risk generally rises as we get older.",
  "The Hepatitis B vaccine helps prevent infections linked to liver cancer.",
  "Limiting alcohol intake lowers the risk of several cancer types.",
  "A new lump is usually harmless, but any persistent or changing lump is worth a doctor's check.",
  "Quitting smoking improves health outcomes at any age, even after decades of use.",
  "Sun protection matters year-round, not just in summer — UV exposure adds up over a lifetime.",
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

const PREVENTION_QUIZ: QuizQuestion[] = [
  {
    id: "prev-1",
    kind: "multiple-choice",
    prompt: "Which of these is the single biggest preventable risk factor for cancer?",
    options: ["Tobacco use", "Occasionally eating sugar", "Being left-handed", "Drinking coffee"],
    correctIndex: 0,
    explanation: "Avoiding all tobacco use is the single largest preventable step against cancer risk.",
  },
  {
    id: "prev-2",
    kind: "true-false",
    prompt: "Regular physical activity is linked to a lower risk of several cancers, even without weight loss.",
    options: ["True", "False"],
    correctIndex: 0,
    explanation: "Activity itself is linked to lower risk for several cancer types, independent of its effect on weight.",
  },
  {
    id: "prev-3",
    kind: "multiple-choice",
    prompt: "Which vaccines are linked to preventing infections that can cause certain cancers?",
    options: ["HPV and Hepatitis B vaccines", "Flu and tetanus vaccines", "Only childhood vaccines", "There are no such vaccines"],
    correctIndex: 0,
    explanation: "HPV and Hepatitis B vaccines protect against infections linked to cervical, liver and some other cancers.",
  },
  {
    id: "prev-4",
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
];

const MYTHS_QUIZ: QuizQuestion[] = [
  {
    id: "myth-1",
    kind: "true-false",
    prompt: "Cutting out sugar completely can \"starve\" or cure cancer.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "All cells use sugar for energy. No evidence shows eliminating sugar cures cancer — balanced nutrition is the evidence-based approach.",
  },
  {
    id: "myth-2",
    kind: "true-false",
    prompt: "Only older people get cancer.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Risk rises with age, but cancer can occur at any age, including in children and young adults.",
  },
  {
    id: "myth-3",
    kind: "multiple-choice",
    prompt: "A friend says cutting all sugar from their diet will cure their relative's cancer. What's the best response?",
    options: [
      "Gently explain no food alone cures cancer, and encourage sticking with their doctor's treatment plan",
      "Agree completely and recommend they stop all treatment",
      "Say nothing, it's not important",
      "Tell them to only eat sugar to test the theory",
    ],
    correctIndex: 0,
    explanation: "Diet supports overall health, but it isn't a substitute for medical treatment — one of the most common cancer myths.",
  },
  {
    id: "myth-4",
    kind: "true-false",
    prompt: "Cancer can spread from person to person like a cold.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Cancer itself doesn't spread between people, though a few viruses linked to some cancers (like HPV) are contagious.",
  },
];

const SIGNS_QUIZ: QuizQuestion[] = [
  {
    id: "sign-1",
    kind: "true-false",
    prompt: "Finding a lump always means someone has cancer.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Many lumps are harmless — but any new or changing lump should be checked by a doctor.",
  },
  {
    id: "sign-2",
    kind: "multiple-choice",
    prompt: "Which of these is a warning sign worth getting checked if it persists?",
    options: [
      "A sore or wound that doesn't heal",
      "Feeling hungry after skipping breakfast",
      "Being tired after a long day",
      "A mild headache after screen time",
    ],
    correctIndex: 0,
    explanation: "A sore or wound that won't heal is one of several general warning signs worth a doctor's attention if it persists.",
  },
  {
    id: "sign-3",
    kind: "true-false",
    prompt: "Screening guidelines are exactly the same for every person, regardless of age or history.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "Screening recommendations vary by age, personal and family history, and country — a doctor can advise what's right for you.",
  },
  {
    id: "sign-4",
    kind: "scenario",
    prompt: "You notice a wart or mole has changed shape recently. What should you do?",
    options: [
      "Get it checked by a doctor, since changing moles are a listed warning sign",
      "Ignore it, moles never change",
      "Remove it yourself at home",
      "Wait a year and see what happens",
    ],
    correctIndex: 0,
    explanation: "An obvious change in a wart or mole is a recognised warning sign worth having checked.",
  },
];

interface SectionDef {
  id: (typeof CANCER_AWARENESS_SECTIONS)[number];
  emoji: string;
  title: string;
  blurb: string;
  quiz: QuizQuestion[];
}

const SECTIONS: SectionDef[] = [
  { id: "cancer-awareness-prevention", emoji: "🛡️", title: "Prevention Basics", blurb: "The habits with the strongest evidence behind them.", quiz: PREVENTION_QUIZ },
  { id: "cancer-awareness-myths", emoji: "🧠", title: "Myths & Facts", blurb: "Unlearn the most common misconceptions.", quiz: MYTHS_QUIZ },
  { id: "cancer-awareness-signs", emoji: "⚠️", title: "Warning Signs", blurb: "What's worth getting checked, and what isn't.", quiz: SIGNS_QUIZ },
];

export default function CancerAwarenessPage() {
  const { state, dispatch } = useStore();
  const [activeSection, setActiveSection] = useState<SectionDef | null>(null);
  const [selectedType, setSelectedType] = useState<(typeof CANCER_TYPES)[number] | null>(null);

  const completedIds = new Set(state.completed.map((c) => c.articleId));
  const doneCount = SECTIONS.filter((s) => completedIds.has(s.id)).length;
  const allDone = doneCount === SECTIONS.length;

  const todayFact = DAILY_FACTS[dayOfYear(new Date()) % DAILY_FACTS.length];
  const today = new Date().toISOString().slice(0, 10);
  const factClaimed = state.dailyFactClaimedDate === today;

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
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white"
              animate={{ width: `${(doneCount / SECTIONS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 24 }}
            />
          </div>
          <span className="shrink-0 text-sm font-bold">{doneCount}/{SECTIONS.length} sections</span>
        </div>
      </motion.div>

      {/* Daily fact — a reason to come back every day */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border-2 border-brand/15 bg-brand/5 p-5"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-pink text-xl text-white">📅</span>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-brand-700">Today&rsquo;s Cancer Fact</div>
            <p className="mt-1 text-[15px] text-ink">{todayFact}</p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant={factClaimed ? "soft" : "primary"} disabled={factClaimed} onClick={() => dispatch({ type: "claimDailyFact" })}>
            {factClaimed ? "✅ Claimed today" : "Claim +5 XP →"}
          </Button>
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

      {/* Common types of cancer */}
      <section>
        <h2 className="mb-1 px-1 text-xl font-black text-ink">Common types of cancer</h2>
        <p className="mb-3 px-1 text-sm text-muted">
          Tap any card for symptoms, what to do, and suggested reading — not an exhaustive list, and not a diagnostic tool.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CANCER_TYPES.map((c) => (
            <motion.button
              key={c.name}
              onClick={() => setSelectedType(c)}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="overflow-hidden rounded-2xl bg-card text-left card-shadow"
            >
              <div className={`h-1.5 bg-gradient-to-r ${c.gradient}`} />
              <div className="p-4">
                <motion.div
                  whileHover={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.4 }}
                  className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-xl ${c.gradient}`}
                >
                  {c.emoji}
                </motion.div>
                <h3 className="mt-3 font-bold text-ink">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">{c.body}</p>
                <div className="mt-2 text-xs font-semibold text-brand-700">Tap for symptoms &amp; guidance →</div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {selectedType && <CancerDetailModal type={selectedType} onClose={() => setSelectedType(null)} />}

      {/* Prevention pillars */}
      <section>
        <h2 className="mb-3 px-1 text-xl font-black text-ink">Prevention steps with strong evidence</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PREVENTION_PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-card p-4 card-shadow">
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

      {/* Myths vs facts — flip cards */}
      <section>
        <h2 className="mb-1 px-1 text-xl font-black text-ink">Myths vs. facts</h2>
        <p className="mb-3 px-1 text-sm text-muted">Tap a card to reveal the fact.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {MYTHS.map((m) => (
            <MythFlipCard key={m.myth} myth={m.myth} fact={m.fact} />
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

      {/* Three mini-quizzes */}
      <section id="quiz">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xl font-black text-ink">Check your understanding</h2>
          {allDone && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">🎗️ Health Advocate earned</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const done = completedIds.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s)}
                className={`rounded-3xl p-5 text-left card-shadow transition hover:-translate-y-0.5 ${
                  done ? "bg-emerald-50 !text-slate-900" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{s.emoji}</span>
                  {done && <span className="text-xl">✅</span>}
                </div>
                <h3 className={`mt-2 font-black ${done ? "" : "text-ink"}`}>{s.title}</h3>
                <p className={`mt-1 text-sm ${done ? "!text-slate-700" : "text-muted"}`}>{s.blurb}</p>
                <div className="mt-3 text-xs font-bold text-brand-700">
                  {done ? "Retake quiz →" : `${s.quiz.length} questions · +20 XP →`}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Resources */}
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="text-lg font-black text-ink">📚 Learn more</h2>
        <p className="mt-2 text-sm text-muted">
          For up-to-date, authoritative guidance, look up these organisations directly: the World Health Organization
          (WHO), your country&apos;s national cancer institute, the American Cancer Society (ACS), and Cancer Research UK.
          They publish free, regularly-updated public information on prevention, screening and support.
        </p>
      </section>

      {/* Active mini-quiz modal-ish panel */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveSection(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mx-auto mt-10 max-w-lg"
            >
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setActiveSection(null)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-card text-ink card-shadow"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <GenericQuizRunner
                questions={activeSection.quiz}
                passScore={0.6}
                introEmoji={activeSection.emoji}
                introTitle={activeSection.title}
                introBody={<>{activeSection.quiz.length} questions · pass with 60% to earn +20 XP and progress toward the Health Advocate badge.</>}
                introButtonLabel="Start →"
                onFinish={({ passed }) => {
                  if (passed) {
                    dispatch({ type: "markRead", payload: { articleId: activeSection.id, xp: 20, coins: 8 } });
                  }
                }}
                renderResult={({ correct, total, score, passed, retry }) => (
                  <div className={`rounded-3xl p-6 text-center text-white soft-shadow ${passed ? "gradient-pink" : "gradient-purple"}`}>
                    <div className="text-5xl">{passed ? "🎉" : "📚"}</div>
                    <h3 className="mt-2 text-2xl font-black">{passed ? "Nice work!" : "Give it another go"}</h3>
                    <p className="mt-1 text-white/85">You got {correct}/{total} ({Math.round(score * 100)}%)</p>
                    <div className="mt-5 flex justify-center gap-3">
                      {!passed && (
                        <Button variant="outline" className="!border-white/30 !bg-white/20 !text-white" onClick={retry}>
                          Try again
                        </Button>
                      )}
                      <Button variant="outline" className="!bg-white !text-grape" onClick={() => setActiveSection(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MythFlipCard({ myth, fact }: { myth: string; fact: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="group relative h-40 w-full [perspective:1000px]"
      aria-label={flipped ? "Show myth" : "Show fact"}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 flex flex-col justify-center rounded-2xl bg-card p-4 text-left card-shadow [backface-visibility:hidden]">
          <div className="text-xs font-bold text-rose-600">❌ MYTH — tap to reveal the fact</div>
          <p className="mt-2 text-sm font-semibold text-ink">{myth}</p>
        </div>
        <div
          className="absolute inset-0 flex flex-col justify-center rounded-2xl bg-emerald-50 p-4 text-left card-shadow [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="text-xs font-bold text-emerald-700">✅ FACT</div>
          <p className="mt-2 text-sm text-emerald-900">{fact}</p>
        </div>
      </motion.div>
    </button>
  );
}

function relatedArticlesFor(type: (typeof CANCER_TYPES)[number]): Article[] {
  const terms = type.searchTerms.map((t) => t.toLowerCase());
  const hay = (a: Article) => `${a.title} ${a.summary} ${a.facts.join(" ")}`.toLowerCase();
  const specific = ARTICLES.filter((a) => terms.some((t) => hay(a).includes(t)));
  if (specific.length >= 3) return specific.slice(0, 3);
  const generalCancer = ARTICLES.filter((a) => !specific.includes(a) && /cancer|tumour|tumor|oncology/.test(hay(a)));
  return [...specific, ...generalCancer].slice(0, 3);
}

function CancerDetailModal({ type, onClose }: { type: (typeof CANCER_TYPES)[number]; onClose: () => void }) {
  const related = useMemo(() => relatedArticlesFor(type), [type]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-4 top-8 bottom-8 z-50 mx-auto max-w-lg overflow-y-auto rounded-3xl bg-card p-6 soft-shadow sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2"
      >
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-canvas text-lg" aria-label="Close">
          ✕
        </button>

        <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-2xl ${type.gradient}`}>
          {type.emoji}
        </div>
        <h2 className="mt-3 text-xl font-black text-ink">{type.name}</h2>
        <p className="mt-1 text-sm text-muted">{type.body}</p>

        <div className="mt-5 rounded-2xl bg-canvas p-4">
          <h3 className="text-sm font-black text-ink">🩺 Symptoms to watch for</h3>
          <ul className="mt-2 space-y-1.5">
            {type.symptoms.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-ink">
                <span className="text-muted">•</span> {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 rounded-2xl bg-brand/5 p-4">
          <h3 className="text-sm font-black text-brand-700">❗ What to do if you notice these</h3>
          <p className="mt-1.5 text-sm text-ink">{type.whatToDo}</p>
        </div>

        <div className="mt-3 rounded-2xl bg-grape/5 p-4">
          <h3 className="text-sm font-black text-grape-500">🔬 Benign vs. malignant</h3>
          <div className="mt-2 space-y-2 text-sm text-ink">
            <p><b>Benign:</b> {BENIGN_VS_MALIGNANT.benign}</p>
            <p><b>Malignant:</b> {BENIGN_VS_MALIGNANT.malignant}</p>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-black text-ink">📖 Suggested reading</h3>
            <div className="space-y-2">
              {related.map((a) => (
                <Link
                  key={a.id}
                  href={`/learn/${a.id}`}
                  className="block rounded-2xl bg-canvas p-3 text-sm font-semibold text-ink transition hover:bg-soft"
                >
                  {a.title} <span className="font-normal text-muted">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-muted">
          This is general education, not medical advice — always talk to a doctor about symptoms or concerns.
        </p>
      </motion.div>
    </>
  );
}
