"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { Article, Quiz, QuizQuestion, QuizResult } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, ProgressBar } from "./ui";
import { ARTICLES } from "@/lib/content";

function shuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr
    .map((v, i) => ({ v, k: (h ^ (i * 2654435761)) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

export function QuizRunner({ article, quiz }: { article: Article; quiz: Quiz }) {
  const { dispatch } = useStore();
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const q = quiz.questions[idx];
  const total = quiz.questions.length;

  function recordAnswer(correct: boolean) {
    setAnswers((prev) => ({ ...prev, [q.id]: correct }));
  }

  function next() {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
    } else {
      finish();
    }
  }

  function finish() {
    const correct = Object.values(answers).filter(Boolean).length;
    const score = correct / total;
    const passed = score >= quiz.passScore;
    const xpEarned = passed ? article.xp : Math.round(article.xp * 0.3);
    const coinsEarned = passed ? article.coins : 0;
    const result: QuizResult = {
      articleId: article.id,
      score,
      correct,
      total,
      passed,
      completedAt: new Date().toISOString(),
      xpEarned,
      coinsEarned,
    };
    dispatch({ type: "completeArticle", payload: { articleId: article.id, quizResult: result } });
    setFinished(true);
  }

  if (!started) {
    return (
      <div className="rounded-3xl gradient-purple p-6 text-center text-white soft-shadow">
        <div className="text-4xl">🧩</div>
        <h3 className="mt-2 text-xl font-black">Ready for the quiz?</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-white/85">
          {total} questions · pass with {Math.round(quiz.passScore * 100)}% to earn{" "}
          <b>+{article.xp} XP</b> and <b>+{article.coins} coins</b>.
        </p>
        <div className="mt-4">
          <Button onClick={() => setStarted(true)} variant="primary" size="lg">
            Launch quiz →
          </Button>
        </div>
      </div>
    );
  }

  if (finished) {
    const correct = Object.values(answers).filter(Boolean).length;
    const score = correct / total;
    const passed = score >= quiz.passScore;
    return <QuizResultView article={article} correct={correct} total={total} passed={passed} score={score} />;
  }

  return (
    <div className="rounded-3xl bg-card p-5 card-shadow">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-muted">
          Question {idx + 1} / {total}
        </span>
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand-700">
          {Object.values(answers).filter(Boolean).length} correct
        </span>
      </div>
      <ProgressBar percent={((idx) / total) * 100} className="mb-5" />

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <QuestionView question={q} onAnswer={recordAnswer} onNext={next} isLast={idx === total - 1} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuestionView({
  question,
  onAnswer,
  onNext,
  isLast,
}: {
  question: QuizQuestion;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  switch (question.kind) {
    case "matching":
      return <MatchingQ question={question} onAnswer={onAnswer} onNext={onNext} isLast={isLast} />;
    case "ordering":
      return <OrderingQ question={question} onAnswer={onAnswer} onNext={onNext} isLast={isLast} />;
    default:
      return <ChoiceQ question={question} onAnswer={onAnswer} onNext={onNext} isLast={isLast} />;
  }
}

function ChoiceQ({
  question,
  onAnswer,
  onNext,
  isLast,
}: {
  question: QuizQuestion;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = question.options ?? [];
  const revealed = selected !== null;

  function choose(i: number) {
    if (revealed) return;
    setSelected(i);
    onAnswer(i === question.correctIndex);
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-ink">{question.prompt}</h3>
      <div className="mt-4 space-y-2.5">
        {options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = i === selected;
          let cls = "border-line bg-white hover:border-brand/40";
          if (revealed && isCorrect) cls = "border-emerald-400 bg-emerald-50";
          else if (revealed && isChosen && !isCorrect) cls = "border-rose-400 bg-rose-50";
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={revealed}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-medium text-ink transition ${cls}`}
            >
              <span>{opt}</span>
              {revealed && isCorrect && <span>✅</span>}
              {revealed && isChosen && !isCorrect && <span>❌</span>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="rounded-2xl bg-canvas p-3 text-sm text-muted">💡 {question.explanation}</div>
          <div className="mt-3 flex justify-end">
            <Button onClick={onNext}>{isLast ? "See results" : "Next"} →</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MatchingQ({
  question,
  onAnswer,
  onNext,
  isLast,
}: {
  question: QuizQuestion;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const pairs = useMemo(() => question.pairs ?? [], [question.pairs]);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right), question.id), [pairs, question.id]);
  const [matches, setMatches] = useState<Record<number, number>>({}); // leftIndex -> rightIndex
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  function assign(rightIndex: number) {
    if (checked || activeLeft === null) return;
    setMatches((prev) => ({ ...prev, [activeLeft]: rightIndex }));
    setActiveLeft(null);
  }

  function check() {
    const allDone = pairs.every((_, i) => matches[i] !== undefined);
    if (!allDone) return;
    const correct = pairs.every((p, i) => rights[matches[i]] === p.right);
    onAnswer(correct);
    setChecked(true);
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-ink">{question.prompt}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {pairs.map((p, i) => {
            const matched = matches[i] !== undefined;
            const isCorrect = checked && rights[matches[i]] === p.right;
            return (
              <button
                key={i}
                onClick={() => !checked && setActiveLeft(i)}
                className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-bold transition ${
                  activeLeft === i
                    ? "border-grape-400 bg-grape/5"
                    : checked
                      ? isCorrect
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-rose-400 bg-rose-50"
                      : matched
                        ? "border-brand/40 bg-brand/5"
                        : "border-line bg-white"
                }`}
              >
                {p.left}
                {matched && <span className="ml-2 text-xs text-muted">→ {rights[matches[i]]?.slice(0, 26)}…</span>}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {rights.map((r, i) => (
            <button
              key={i}
              onClick={() => assign(i)}
              disabled={checked}
              className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2.5 text-left text-xs text-muted transition hover:border-brand/40"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        {!checked ? (
          <Button onClick={check} variant="purple">Check</Button>
        ) : (
          <Button onClick={onNext}>{isLast ? "See results" : "Next"} →</Button>
        )}
      </div>
      {checked && <div className="mt-3 rounded-2xl bg-canvas p-3 text-sm text-muted">💡 {question.explanation}</div>}
    </div>
  );
}

function OrderingQ({
  question,
  onAnswer,
  onNext,
  isLast,
}: {
  question: QuizQuestion;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const correctOrder = question.orderedItems ?? [];
  const [items, setItems] = useState(() => shuffle(correctOrder, question.id + "o"));
  const [checked, setChecked] = useState(false);

  function move(i: number, dir: -1 | 1) {
    if (checked) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  }

  function check() {
    const correct = items.every((it, i) => it === correctOrder[i]);
    onAnswer(correct);
    setChecked(true);
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-ink">{question.prompt}</h3>
      <div className="mt-4 space-y-2">
        {items.map((it, i) => {
          const isRight = checked && it === correctOrder[i];
          return (
            <div
              key={it}
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm font-medium text-ink ${
                checked ? (isRight ? "border-emerald-400 bg-emerald-50" : "border-rose-400 bg-rose-50") : "border-line bg-white"
              }`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-canvas text-xs font-bold">{i + 1}</span>
              <span className="flex-1">{it}</span>
              {!checked && (
                <span className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="px-1 text-muted hover:text-ink" aria-label="Move up">▲</button>
                  <button onClick={() => move(i, 1)} className="px-1 text-muted hover:text-ink" aria-label="Move down">▼</button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        {!checked ? (
          <Button onClick={check} variant="purple">Check</Button>
        ) : (
          <Button onClick={onNext}>{isLast ? "See results" : "Next"} →</Button>
        )}
      </div>
      {checked && <div className="mt-3 rounded-2xl bg-canvas p-3 text-sm text-muted">💡 {question.explanation}</div>}
    </div>
  );
}

function QuizResultView({
  article,
  correct,
  total,
  passed,
  score,
}: {
  article: Article;
  correct: number;
  total: number;
  passed: boolean;
  score: number;
}) {
  const simpler = ARTICLES.find(
    (a) => a.category === article.category && a.difficulty === "beginner" && a.id !== article.id,
  );
  const similar = ARTICLES.find((a) => a.category === article.category && a.id !== article.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-3xl p-6 text-center text-white soft-shadow ${passed ? "gradient-pink" : "gradient-purple"}`}
    >
      <div className="text-5xl">{passed ? "🎉" : "💪"}</div>
      <h3 className="mt-2 text-2xl font-black">{passed ? "Quiz passed!" : "Almost there!"}</h3>
      <p className="mt-1 text-white/85">
        You got <b>{correct}/{total}</b> ({Math.round(score * 100)}%)
      </p>

      {passed ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-white/15 px-4 py-2">
            <div className="text-lg font-black">+{article.xp}</div>
            <div className="text-[11px] text-white/80">XP</div>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-2">
            <div className="text-lg font-black">+{article.coins}</div>
            <div className="text-[11px] text-white/80">Coins</div>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-2">
            <div className="text-lg font-black">🏗️ +1</div>
            <div className="text-[11px] text-white/80">Tower floor</div>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-2 text-left">
          <p className="text-center text-sm text-white/85">
            No worries — learning takes repetition. Try one of these and come back:
          </p>
          {simpler && (
            <Link href={`/learn/${simpler.id}`} className="block rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/25">
              🌱 Simpler: {simpler.title}
            </Link>
          )}
          {similar && similar.id !== simpler?.id && (
            <Link href={`/learn/${similar.id}`} className="block rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/25">
              🔁 Similar topic: {similar.title}
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <Button href="/learn" variant="outline" className="!bg-white/20 !border-white/30 !text-white">
          Keep learning
        </Button>
        <Button href="/" variant="outline" className="!bg-white !text-grape">
          Home
        </Button>
      </div>
    </motion.div>
  );
}
