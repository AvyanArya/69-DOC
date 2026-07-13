"use client";

import { motion } from "framer-motion";
import { CATEGORY_MAP } from "@/lib/data/categories";
import { STATUS_STYLE, STATUS_LABEL, renderMarkdown } from "@/lib/submissions";
import type { Submission } from "@/lib/types";

export function SubmissionDetailModal({
  submission,
  authorName,
  onClose,
}: {
  submission: Submission;
  authorName?: string;
  onClose: () => void;
}) {
  const cat = CATEGORY_MAP[submission.category];
  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mx-auto my-8 max-w-2xl rounded-3xl bg-card p-6 soft-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[submission.status]}`}>
                  {STATUS_LABEL[submission.status]}
                </span>
                <span className="rounded-full bg-grape/5 px-2.5 py-1 text-xs font-semibold text-grape-500">
                  {cat.emoji} {cat.name}
                </span>
                <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold capitalize text-muted">
                  {submission.difficulty}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-black text-ink">{submission.title}</h2>
              <div className="mt-1 text-xs text-muted">
                {authorName && <>{authorName} · </>}
                {new Date(submission.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-ink" aria-label="Close">
              ✕
            </button>
          </div>

          {submission.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {submission.tags.map((t) => (
                <span key={t} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {submission.moderatorNote && (
            <div className="mt-4 rounded-2xl bg-brand/5 p-3 text-sm text-ink">🛡️ Moderator note: {submission.moderatorNote}</div>
          )}

          <div
            className="prose-reading mt-4 max-h-[50vh] overflow-y-auto rounded-2xl border border-line bg-canvas p-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(submission.body || "*No content yet.*") }}
          />

          {submission.references.trim() && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-bold uppercase text-muted">References</div>
              <pre className="whitespace-pre-wrap rounded-2xl bg-canvas p-3 text-sm text-ink">{submission.references}</pre>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
