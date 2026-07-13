"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore, useDerived } from "@/lib/store";
import { Button, Chip } from "@/components/ui";
import { CitationQuizGate } from "@/components/CitationQuizGate";
import { CATEGORIES } from "@/lib/data/categories";
import type { Category, Difficulty, Submission, SubmissionStatus } from "@/lib/types";

const DRAFT_KEY = "studystack:draft";

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  "under-review": "bg-blue-100 text-blue-700",
  "needs-changes": "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  "under-review": "Under review",
  "needs-changes": "Needs changes",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
};

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*)$/gm, '<h3 class="text-lg font-bold mt-4 mb-1">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="text-xl font-black mt-5 mb-2">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="text-2xl font-black mt-5 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-brand pl-3 italic text-muted my-2">$1</blockquote>')
    .replace(/^- (.*)$/gm, '<li class="ml-5 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>');
}

export default function WritePage() {
  const { state, dispatch } = useStore();
  const { writingUnlocked, canPublish } = useDerived();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("biology");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [references, setReferences] = useState("");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState<string>("");

  // Load draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setTitle(d.title ?? "");
        setCategory(d.category ?? "biology");
        setDifficulty(d.difficulty ?? "beginner");
        setTags(d.tags ?? "");
        setBody(d.body ?? "");
        setReferences(d.references ?? "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, category, difficulty, tags, body, references }));
      if (title || body) setSaved(new Date().toLocaleTimeString());
    }, 800);
    return () => clearTimeout(t);
  }, [title, category, difficulty, tags, body, references]);

  function submit() {
    if (!title.trim() || body.trim().length < 40) return;
    const sub: Submission = {
      id: `sub-${Date.now()}`,
      title: title.trim(),
      category,
      difficulty,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      body,
      references,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "you",
    };
    dispatch({ type: "addSubmission", payload: sub });
    setTitle("");
    setBody("");
    setTags("");
    setReferences("");
    localStorage.removeItem(DRAFT_KEY);
  }

  if (!writingUnlocked) {
    const need = Math.max(0, state.writingUnlockArticles - state.completed.length);
    const pct = Math.min(100, (state.completed.length / state.writingUnlockArticles) * 100);
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-black tracking-tight text-ink">Write</h1>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl gradient-purple p-8 text-center text-white soft-shadow"
        >
          <div className="text-5xl">🔒</div>
          <h2 className="mt-3 text-xl font-black">Writing unlocks soon</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/85">
            Read <b>{state.writingUnlockArticles} studies</b> (or learn on {state.writingUnlockDays} different days) to
            earn the right to publish your own research summaries.
          </p>
          <div className="mx-auto mt-5 max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-white/80">
              <span>{state.completed.length} / {state.writingUnlockArticles} studies</span>
              <span>{need} to go</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="mt-6">
            <Button href="/learn" variant="primary">Read a study →</Button>
          </div>
        </motion.div>

        <div className="rounded-3xl bg-card p-5 card-shadow">
          <h3 className="text-sm font-black text-ink">Why the gate?</h3>
          <p className="mt-1 text-sm text-muted">
            Reading first means you learn how good science writing looks before you publish. Once unlocked, you&apos;ll take
            a short skills check on referencing and citations, then your articles go through moderation and can be
            featured across StudyStack.
          </p>
        </div>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Write ✍️</h1>
          <p className="text-sm text-muted">One more step before you can publish.</p>
        </div>
        <CitationQuizGate />
      </div>
    );
  }

  const canSubmit = title.trim().length > 3 && body.trim().length >= 40;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Write ✍️</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            Publishing unlocked — share what you’ve learned.
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">✅ Skills verified</span>
          </p>
        </div>
        {saved && <span className="text-xs text-muted">💾 Saved {saved}</span>}
      </div>

      {/* Editor */}
      <div className="rounded-3xl bg-card p-5 card-shadow">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title…"
          className="w-full bg-transparent text-2xl font-black text-ink outline-none placeholder:text-muted/60"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-muted">Topic</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="rounded-xl border border-line bg-card px-3 py-1.5 text-sm font-semibold"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {d}
            </Chip>
          ))}
        </div>

        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated (e.g. brain, memory, sleep)"
          className="mt-4 w-full rounded-2xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-brand/40"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-muted">Body (Markdown supported)</span>
          <button
            onClick={() => setPreview((p) => !p)}
            className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand-700"
          >
            {preview ? "✏️ Edit" : "👁 Preview"}
          </button>
        </div>

        {preview ? (
          <div
            className="prose-reading mt-2 min-h-48 rounded-2xl border border-line bg-canvas p-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body || "*Nothing to preview yet.*") }}
          />
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"## Introduction\nExplain the topic simply...\n\n**Key idea:** ...\n\n- Fact one\n- Fact two\n\n> A memorable takeaway."}
            rows={12}
            className="mt-2 w-full rounded-2xl border border-line bg-canvas p-4 text-[15px] leading-relaxed outline-none focus:border-brand/40"
          />
        )}

        <div className="mt-4">
          <span className="text-xs font-bold uppercase text-muted">References & citations</span>
          <textarea
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            placeholder={"1. Author et al. (2023). Journal.\n2. ..."}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-line bg-canvas p-4 text-sm outline-none focus:border-brand/40"
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-muted">{body.trim().length} characters</span>
          <Button onClick={submit} disabled={!canSubmit} size="lg">
            Submit for review →
          </Button>
        </div>
      </div>

      {/* Submissions */}
      <section>
        <h2 className="mb-3 px-1 text-lg font-black text-ink">Your submissions</h2>
        {state.submissions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card/60 p-8 text-center text-sm text-muted">
            No submissions yet. Write your first science summary above.
          </div>
        ) : (
          <div className="space-y-2">
            {state.submissions.map((s) => (
              <div key={s.id} className="rounded-2xl bg-card p-4 card-shadow">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-ink">{s.title}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {CATEGORIES.find((c) => c.id === s.category)?.name} · {s.difficulty} · {new Date(s.createdAt).toLocaleDateString()}
                </div>
                {s.moderatorNote && (
                  <div className="mt-2 rounded-xl bg-canvas p-2 text-xs text-muted">🛡️ Moderator: {s.moderatorNote}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
