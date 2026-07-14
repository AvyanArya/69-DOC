"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore, useDerived, MIN_QUIZZES_FOR_WRITING, MIN_QUIZ_ACCURACY_FOR_WRITING } from "@/lib/store";
import { Button, Chip } from "@/components/ui";
import { CitationQuizGate } from "@/components/CitationQuizGate";
import { SubmissionDetailModal } from "@/components/SubmissionDetail";
import { STATUS_STYLE, STATUS_LABEL, renderMarkdown } from "@/lib/submissions";
import { CATEGORIES } from "@/lib/data/categories";
import type { Category, Difficulty, Submission } from "@/lib/types";

const DRAFT_KEY = "vera:draft";
const MIN_WORDS = 1000;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

interface RefEntry {
  authors: string;
  year: string;
  title: string;
  source: string;
  url: string;
}

const EMPTY_REF: RefEntry = { authors: "", year: "", title: "", source: "", url: "" };

function formatHarvard(r: RefEntry): string {
  const parts: string[] = [];
  if (r.authors.trim()) parts.push(r.authors.trim());
  if (r.year.trim()) parts.push(`(${r.year.trim()})`);
  if (r.title.trim()) parts.push(`${r.title.trim()}.`);
  if (r.source.trim()) parts.push(`${r.source.trim()}.`);
  let line = parts.join(" ").trim();
  if (r.url.trim()) line += `${line ? " " : ""}Available at: ${r.url.trim()}`;
  return line;
}

const WRITING_STRUCTURE = [
  { section: "Title", words: "—", tip: "Specific and concrete beats clever — say exactly what the reader will learn." },
  { section: "Hook / Introduction", words: "100–150", tip: "Open with why this matters or a surprising fact — earn the next sentence." },
  { section: "Background", words: "150–200", tip: "Define key terms a beginner would need before the main explanation." },
  { section: "Main explanation", words: "300–400", tip: "The core content. Break it into sub-headings (##) if it covers more than one idea." },
  { section: "Evidence / examples", words: "200–250", tip: "Cite specific studies or real examples — every non-obvious claim needs a source." },
  { section: "Key takeaways", words: "~100", tip: "A short bullet list readers could screenshot and remember." },
  { section: "Conclusion", words: "100–150", tip: "Wrap up and say why it matters going forward." },
];

export default function WritePage() {
  const { state, dispatch } = useStore();
  const { writingUnlocked, canPublish, quizAccuracy } = useDerived();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("biology");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [refEntries, setRefEntries] = useState<RefEntry[]>([{ ...EMPTY_REF }]);
  const [preview, setPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saved, setSaved] = useState<string>("");
  const [viewing, setViewing] = useState<Submission | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setRefEntries(Array.isArray(d.refEntries) && d.refEntries.length ? d.refEntries : [{ ...EMPTY_REF }]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, category, difficulty, tags, body, refEntries }));
      if (title || body) setSaved(new Date().toLocaleTimeString());
    }, 800);
    return () => clearTimeout(t);
  }, [title, category, difficulty, tags, body, refEntries]);

  function updateRef(i: number, patch: Partial<RefEntry>) {
    setRefEntries((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function submit() {
    if (!title.trim() || wordCount(body) < MIN_WORDS) return;
    const references = refEntries
      .filter((r) => r.authors.trim() || r.title.trim())
      .map((r, i) => `${i + 1}. ${formatHarvard(r)}`)
      .join("\n");
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
    setRefEntries([{ ...EMPTY_REF }]);
    localStorage.removeItem(DRAFT_KEY);
  }

  function applyWrap(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    setBody(body.slice(0, start) + before + selected + after + body.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function applyLinePrefix(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    setBody(body.slice(0, lineStart) + prefix + body.slice(lineStart));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  function insertBlock(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  if (!writingUnlocked) {
    const criteria = [
      {
        label: "Studies read",
        have: state.completed.length,
        need: state.writingUnlockArticles,
        done: state.completed.length >= state.writingUnlockArticles,
      },
      {
        label: "Quizzes taken",
        have: state.quizResults.length,
        need: MIN_QUIZZES_FOR_WRITING,
        done: state.quizResults.length >= MIN_QUIZZES_FOR_WRITING,
      },
      {
        label: "Quiz accuracy",
        have: Math.round(quizAccuracy * 100),
        need: Math.round(MIN_QUIZ_ACCURACY_FOR_WRITING * 100),
        done: quizAccuracy >= MIN_QUIZ_ACCURACY_FOR_WRITING,
        suffix: "%",
      },
    ];
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-black tracking-tight text-ink">Write</h1>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl gradient-purple p-8 text-center text-white soft-shadow"
        >
          <div className="text-5xl">🔒</div>
          <h2 className="mt-3 text-xl font-black">Writing has to be earned</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/85">
            Publishing is a privilege for readers who&apos;ve shown they actually understand the material — not just
            clicked through it. Meet all three bars below to unlock it.
          </p>
          <div className="mx-auto mt-5 max-w-sm space-y-3">
            {criteria.map((c) => {
              const pct = Math.min(100, (c.have / c.need) * 100);
              return (
                <div key={c.label}>
                  <div className="mb-1 flex justify-between text-xs text-white/80">
                    <span className="flex items-center gap-1">
                      {c.done && <span aria-hidden>✅</span>} {c.label}
                    </span>
                    <span>
                      {c.have}
                      {c.suffix ?? ""} / {c.need}
                      {c.suffix ?? ""}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                    <div className={`h-full rounded-full ${c.done ? "bg-emerald-300" : "bg-white"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <Button href="/learn" variant="primary">Read a study →</Button>
          </div>
        </motion.div>

        <div className="rounded-3xl bg-card p-5 card-shadow">
          <h3 className="text-sm font-black text-ink">Why the gate?</h3>
          <p className="mt-1 text-sm text-muted">
            Reading first means you learn how good writing looks before you publish, and actually taking quizzes
            (not just marking articles read) shows you retained something. Once unlocked, you&apos;ll take a
            referencing &amp; citation skills check, then your articles go through moderation and can be featured
            across Vera.
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

  const words = wordCount(body);
  const wordsPercent = Math.min(100, Math.round((words / MIN_WORDS) * 100));
  const canSubmit = title.trim().length > 3 && words >= MIN_WORDS;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Write ✍️</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            Publishing unlocked — share what you’ve learned.
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">✅ Skills verified</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-muted">💾 Saved {saved}</span>}
          <button
            onClick={() => setShowGuide((g) => !g)}
            className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand-700"
          >
            {showGuide ? "Hide writing guide" : "📋 Writing guide"}
          </button>
        </div>
      </div>

      {showGuide && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card p-5 card-shadow">
          <h2 className="text-sm font-black text-ink">📋 How to structure a great article</h2>
          <p className="mt-1 text-sm text-muted">
            A template that works well for {MIN_WORDS.toLocaleString()}+ word articles — use it as a guide, not a rulebook.
          </p>
          <div className="mt-3 space-y-2">
            {WRITING_STRUCTURE.map((s) => (
              <div key={s.section} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                <span className="w-28 shrink-0 text-xs font-black text-ink">{s.section}</span>
                <span className="w-20 shrink-0 text-xs font-bold text-brand-700">{s.words} {s.words !== "—" && "words"}</span>
                <span className="text-xs text-muted">{s.tip}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-brand/5 p-3 text-xs text-ink">
            <b>Formatting tips:</b> use <code>##</code> headings to break up sections, keep paragraphs to 3–4 sentences,
            define technical terms the first time you use them, and cite every specific claim — see References below.
          </div>
        </motion.div>
      )}

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
          <span className="text-xs font-bold uppercase text-muted">Body</span>
          <button
            onClick={() => setPreview((p) => !p)}
            className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand-700"
          >
            {preview ? "✏️ Edit" : "👁 Preview"}
          </button>
        </div>

        {!preview && (
          <div className="mt-2 flex flex-wrap gap-1 rounded-t-2xl border border-b-0 border-line bg-canvas p-1.5">
            <ToolbarButton label="Bold" onClick={() => applyWrap("**", "**", "bold text")}><b>B</b></ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => applyWrap("*", "*", "italic text")}><i>I</i></ToolbarButton>
            <ToolbarButton label="Underline" onClick={() => applyWrap("++", "++", "underlined text")}><u>U</u></ToolbarButton>
            <span className="mx-1 my-1 w-px bg-line" />
            <ToolbarButton label="Heading" onClick={() => applyLinePrefix("## ")}>H2</ToolbarButton>
            <ToolbarButton label="Subheading" onClick={() => applyLinePrefix("### ")}>H3</ToolbarButton>
            <ToolbarButton label="Quote" onClick={() => applyLinePrefix("> ")}>&ldquo;&rdquo;</ToolbarButton>
            <ToolbarButton label="Bullet list" onClick={() => applyLinePrefix("- ")}>•</ToolbarButton>
            <ToolbarButton label="Divider" onClick={() => insertBlock("\n\n---\n\n")}>―</ToolbarButton>
          </div>
        )}

        {preview ? (
          <div
            className="prose-reading mt-2 min-h-48 rounded-2xl border border-line bg-canvas p-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body || "*Nothing to preview yet.*") }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"## Introduction\nExplain the topic simply...\n\n**Key idea:** ...\n\n- Fact one\n- Fact two\n\n> A memorable takeaway."}
            rows={12}
            className="w-full rounded-b-2xl rounded-t-none border border-line bg-canvas p-4 text-[15px] leading-relaxed outline-none focus:border-brand/40"
          />
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted">References &amp; citations</span>
            <span className="text-[11px] text-muted">Auto-formatted in Harvard style</span>
          </div>
          <div className="mt-2 space-y-2">
            {refEntries.map((r, i) => (
              <div key={i} className="rounded-2xl border border-line bg-canvas p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    value={r.authors}
                    onChange={(e) => updateRef(i, { authors: e.target.value })}
                    placeholder="Author(s)"
                    className="col-span-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 sm:col-span-1"
                  />
                  <input
                    value={r.year}
                    onChange={(e) => updateRef(i, { year: e.target.value })}
                    placeholder="Year"
                    className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                  />
                  <input
                    value={r.title}
                    onChange={(e) => updateRef(i, { title: e.target.value })}
                    placeholder="Title of work"
                    className="col-span-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 sm:col-span-1"
                  />
                  <input
                    value={r.source}
                    onChange={(e) => updateRef(i, { source: e.target.value })}
                    placeholder="Journal / publisher"
                    className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={r.url}
                    onChange={(e) => updateRef(i, { url: e.target.value })}
                    placeholder="URL (optional)"
                    className="flex-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                  />
                  {refEntries.length > 1 && (
                    <button
                      onClick={() => setRefEntries((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {(r.authors.trim() || r.title.trim()) && (
                  <p className="mt-2 text-xs italic text-muted">{i + 1}. {formatHarvard(r)}</p>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setRefEntries((prev) => [...prev, { ...EMPTY_REF }])}
            className="mt-2 rounded-xl bg-canvas px-3 py-1.5 text-xs font-bold text-ink hover:bg-soft"
          >
            + Add reference
          </button>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className={`font-bold ${words >= MIN_WORDS ? "text-emerald-600" : "text-muted"}`}>
              {words.toLocaleString()} / {MIN_WORDS.toLocaleString()} words
              {words >= MIN_WORDS && " ✓"}
            </span>
            {words < MIN_WORDS && (
              <span className="text-muted">{(MIN_WORDS - words).toLocaleString()} more to go</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-soft">
            <div
              className={`h-full rounded-full transition-all ${words >= MIN_WORDS ? "bg-emerald-500" : "gradient-pink"}`}
              style={{ width: `${wordsPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            In-depth articles help readers actually learn something — aim for {MIN_WORDS.toLocaleString()}+ words.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-end">
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
              <button
                key={s.id}
                onClick={() => setViewing(s)}
                className="block w-full rounded-2xl bg-card p-4 text-left card-shadow transition hover:-translate-y-0.5"
              >
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
                <div className="mt-2 text-xs font-semibold text-brand-700">Tap to view →</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {viewing && <SubmissionDetailModal submission={viewing} authorName="You" onClose={() => setViewing(null)} />}
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-ink hover:bg-soft"
    >
      {children}
    </button>
  );
}
