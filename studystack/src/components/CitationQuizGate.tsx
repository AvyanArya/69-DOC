"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Button } from "./ui";
import { GenericQuizRunner } from "./Quiz";
import { CITATION_QUIZ, CITATION_QUIZ_PASS_SCORE } from "@/lib/data/citationQuiz";

/** Gate shown before a student is allowed to publish: they must demonstrate
 * they understand referencing, plagiarism and source credibility. */
export function CitationQuizGate() {
  const { state, dispatch } = useStore();

  if (state.citationQuizPassed) {
    return (
      <div className="rounded-3xl bg-emerald-50 p-5 text-center">
        <div className="text-3xl">✅</div>
        <h3 className="mt-1 text-lg font-black text-emerald-700">Referencing skills verified</h3>
        <p className="text-sm text-emerald-700/80">
          You scored {Math.round(state.citationQuizBestScore * 100)}% on the citation quiz. You&apos;re clear to publish.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-card p-5 card-shadow"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-purple text-xl text-white">🔗</span>
          <div>
            <h3 className="font-black text-ink">Verify your research skills</h3>
            <p className="mt-1 text-sm text-muted">
              Before you can submit an article, pass a short quiz on referencing, citations and telling credible
              sources from unreliable ones. This keeps StudyStack&apos;s community writing trustworthy.
            </p>
          </div>
        </div>
      </motion.div>

      <GenericQuizRunner
        questions={CITATION_QUIZ}
        passScore={CITATION_QUIZ_PASS_SCORE}
        introEmoji="🔗"
        introTitle="Referencing & Citation Skills Check"
        introBody={
          <>
            {CITATION_QUIZ.length} questions · pass with {Math.round(CITATION_QUIZ_PASS_SCORE * 100)}% to unlock
            publishing. You can retry immediately if you don&apos;t pass.
          </>
        }
        introButtonLabel="Start verification quiz →"
        onFinish={({ score }) => {
          dispatch({ type: "passCitationQuiz", payload: { score } });
        }}
        renderResult={({ correct, total, score, passed, retry }) => (
          <div
            className={`rounded-3xl p-6 text-center text-white soft-shadow ${passed ? "gradient-pink" : "gradient-purple"}`}
          >
            <div className="text-5xl">{passed ? "🎉" : "📚"}</div>
            <h3 className="mt-2 text-2xl font-black">{passed ? "You're verified!" : "Not quite yet"}</h3>
            <p className="mt-1 text-white/85">
              You got {correct}/{total} ({Math.round(score * 100)}%)
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/80">
              {passed
                ? "You can now write and submit articles for moderation."
                : `You need ${Math.round(CITATION_QUIZ_PASS_SCORE * 100)}% to unlock publishing. Review the explanations below and try again.`}
            </p>
            {!passed && (
              <div className="mt-5">
                <Button
                  variant="outline"
                  className="!border-white/30 !bg-white/20 !text-white"
                  onClick={retry}
                >
                  Try again
                </Button>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
