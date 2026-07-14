"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Button, Chip, CoverArt } from "@/components/ui";
import { AvatarFace } from "@/components/Avatar";
import { SubmissionDetailModal } from "@/components/SubmissionDetail";
import { STATUS_STYLE } from "@/lib/submissions";
import { CATEGORIES } from "@/lib/data/categories";
import { DEMO_USERS } from "@/lib/data/users";
import { STUDY_COUNT, STUDENT_COUNT, ARTICLES } from "@/lib/content";
import { articleMatchesQuery } from "@/lib/search";
import type { Article, Category, Difficulty, Submission, SubmissionStatus } from "@/lib/types";

type Tab = "moderation" | "users" | "analytics" | "content";

interface QueueItem {
  id: string;
  title: string;
  author: string;
  avatar: string;
  category: Category;
  difficulty: Difficulty;
  excerpt: string;
  body: string;
  references: string;
  tags: string[];
  status: SubmissionStatus;
  moderatorNote?: string;
}

const INITIAL_QUEUE: QueueItem[] = [
  {
    id: "q1", title: "How Mnemonics Boost Memory Retention", author: "Tom Fischer", avatar: "🐢", category: "psychology", difficulty: "beginner",
    excerpt: "A student-friendly review of how memory tricks work and why they help before exams…",
    body: "## Why mnemonics work\n\nOur brains are much better at remembering vivid, connected images than raw facts. Mnemonics work by turning abstract information into something memorable — a phrase, an acronym, or a story.\n\n**Common techniques:**\n\n- Acronyms (like ROYGBIV for the colours of the rainbow)\n- The method of loci (linking facts to a mental journey through a familiar place)\n- Rhymes and songs\n\n> Mnemonics don't replace understanding — they're a scaffold while your brain builds real, lasting connections.",
    references: "1. Higbee, K. (2001). Your Memory: How It Works and How to Improve It.\n2. Worthen & Hunt (2011). Mnemonology: Mnemonics for the 21st Century.",
    tags: ["memory", "study-tips", "exams"], status: "pending",
  },
  {
    id: "q2", title: "The Biology of Sunburn", author: "Zoe Adeyemi", avatar: "🐝", category: "biology", difficulty: "beginner",
    excerpt: "What actually happens in your skin cells when you get burned by UV light…",
    body: "## What's actually happening\n\nUV light damages the DNA inside your skin cells. Your body responds by increasing blood flow to the area (redness) and eventually shedding the damaged cells (peeling).\n\n**Key facts:**\n\n- Melanin is your skin's natural UV shield\n- Sunburn is technically a radiation injury\n- Repeated sunburns raise long-term skin cancer risk\n\n> Sunscreen doesn't just prevent pain today — it protects your skin's DNA for the long run.",
    references: "1. Matsumura & Ananthaswamy (2004). Toxicology and Applied Pharmacology.\n2. D'Orazio et al. (2013). International Journal of Molecular Sciences.",
    tags: ["skin", "uv", "biology"], status: "under-review",
  },
  {
    id: "q3", title: "Why Antibiotics Don't Work on Viruses", author: "Priya Nair", avatar: "🦋", category: "medicine", difficulty: "beginner",
    excerpt: "A clear explanation of the difference between bacteria and viruses for beginners…",
    body: "## Two very different invaders\n\nAntibiotics target structures bacteria have and human cells don't — like bacterial cell walls. Viruses don't have these structures; they hijack our own cells to reproduce, so antibiotics have nothing to attack.\n\n**Why this matters:**\n\n- Taking antibiotics for a virus won't help you get better\n- It can still cause side effects and feed antibiotic resistance\n- Antivirals work completely differently, targeting viral replication steps",
    references: "1. CDC (2023). Antibiotic Use Guidance.\n2. Ryan & Ray (2020). Sherris Medical Microbiology.",
    tags: ["antibiotics", "viruses", "medicine"], status: "pending",
  },
  {
    id: "q4", title: "The Chemistry of Fizzy Drinks", author: "Aarav Sharma", avatar: "🦁", category: "chemistry", difficulty: "beginner",
    excerpt: "How carbon dioxide gets into your soda and why it fizzes when you open it…",
    body: "## Trapped gas, under pressure\n\nSoda is bottled under high pressure with dissolved CO2 gas. When you open the cap, pressure drops suddenly, and the gas rushes out of the liquid as bubbles — that's the fizz.\n\n**Fun fact:** shaking the bottle first creates tiny bubbles that give the escaping gas more surfaces to gather on, making it fizz over faster.",
    references: "1. Liger-Belair, G. (2012). Journal of Agricultural and Food Chemistry.",
    tags: ["chemistry", "gases", "everyday-science"], status: "needs-changes",
  },
];

function queueItemToSubmission(item: QueueItem): Submission {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    difficulty: item.difficulty,
    tags: item.tags,
    body: item.body,
    references: item.references,
    status: item.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: item.author,
    moderatorNote: item.moderatorNote,
  };
}

export default function AdminPage() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>("moderation");
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [viewing, setViewing] = useState<{ submission: Submission; authorName: string } | null>(null);

  function setQueueStatus(id: string, status: SubmissionStatus, moderatorNote?: string) {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, status, moderatorNote: moderatorNote ?? item.moderatorNote } : item)));
  }

  function notifyAuthor(status: "approved" | "rejected" | "needs-changes", title: string, note?: string) {
    const titles: Record<typeof status, string> = {
      approved: "Your article was approved! 🎉",
      rejected: "Your article wasn't approved",
      "needs-changes": "Changes requested on your article",
    };
    const body =
      status === "approved"
        ? `"${title}" passed moderation and is now published.`
        : note
          ? `"${title}": ${note}`
          : `"${title}" needs another look — check the moderator note.`;
    dispatch({
      type: "pushNotification",
      payload: {
        id: `notif-mod-${Date.now()}`,
        kind: "moderation",
        title: titles[status],
        body,
        createdAt: new Date().toISOString(),
        read: false,
        href: "/write",
      },
    });
  }

  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "under-review").length +
    state.submissions.filter((s) => s.status === "pending" || s.status === "under-review").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-purple text-xl text-white">🛡️</span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Admin panel</h1>
          <p className="text-sm text-muted">Moderate content, manage users and view analytics.</p>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={tab === "moderation"} onClick={() => setTab("moderation")}>🗂 Moderation {pendingCount > 0 && `(${pendingCount})`}</Chip>
        <Chip active={tab === "users"} onClick={() => setTab("users")}>👥 Users</Chip>
        <Chip active={tab === "analytics"} onClick={() => setTab("analytics")}>📊 Analytics</Chip>
        <Chip active={tab === "content"} onClick={() => setTab("content")}>📚 Content</Chip>
      </div>

      {tab === "moderation" && (
        <div className="space-y-3">
          {/* User's own submissions the admin can act on */}
          {state.submissions.filter((s) => s.status === "pending" || s.status === "under-review").map((s) => (
            <ModerationCard
              key={s.id}
              title={s.title}
              author="You"
              avatar={state.avatar}
              category={CATEGORIES.find((c) => c.id === s.category)?.name ?? s.category}
              excerpt={s.body.slice(0, 120) || "No preview."}
              status={s.status}
              onView={() => setViewing({ submission: s, authorName: "You" })}
              onApprove={() => {
                dispatch({ type: "updateSubmission", payload: { id: s.id, changes: { status: "approved" } } });
                notifyAuthor("approved", s.title);
              }}
              onReject={(note) => {
                dispatch({ type: "updateSubmission", payload: { id: s.id, changes: { status: "rejected", moderatorNote: note } } });
                notifyAuthor("rejected", s.title, note);
              }}
              onChanges={(note) => {
                dispatch({ type: "updateSubmission", payload: { id: s.id, changes: { status: "needs-changes", moderatorNote: note } } });
                notifyAuthor("needs-changes", s.title, note);
              }}
              onViewPublished={() => setViewing({ submission: { ...s, status: "approved" }, authorName: "You" })}
            />
          ))}
          {queue.map((item) => (
            <ModerationCard
              key={item.id}
              title={item.title}
              author={item.author}
              avatar={item.avatar}
              category={CATEGORIES.find((c) => c.id === item.category)?.name ?? item.category}
              excerpt={item.excerpt}
              status={item.status}
              onView={() => setViewing({ submission: queueItemToSubmission(item), authorName: item.author })}
              onApprove={() => setQueueStatus(item.id, "approved")}
              onReject={(note) => setQueueStatus(item.id, "rejected", note)}
              onChanges={(note) => setQueueStatus(item.id, "needs-changes", note)}
              onViewPublished={() => setViewing({ submission: queueItemToSubmission({ ...item, status: "approved" }), authorName: item.author })}
            />
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {DEMO_USERS.filter((u) => u.id !== "editorial").map((u) => {
            const banned = bannedUsers.includes(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 card-shadow">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-canvas text-xl"><AvatarFace value={u.avatar} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-ink">{u.displayName}</span>
                    {u.isModerator && <span className="rounded-full bg-grape/10 px-2 py-0.5 text-[10px] font-bold text-grape-500">MOD</span>}
                    {banned && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">BANNED</span>}
                  </div>
                  <div className="text-xs text-muted">Lvl {u.level} · {u.articlesRead} read · {u.streak}🔥</div>
                </div>
                <button
                  onClick={() => setBannedUsers((b) => (banned ? b.filter((x) => x !== u.id) : [...b, u.id]))}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${banned ? "bg-canvas text-ink" : "bg-rose-50 text-rose-600"}`}
                >
                  {banned ? "Unban" : "Ban"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnalyticTile label="Total users" value="1,284" emoji="👥" />
            <AnalyticTile label="Studies" value={`${STUDY_COUNT}`} emoji="🔬" />
            <AnalyticTile label="Student articles" value={`${STUDENT_COUNT}`} emoji="✍️" />
            <AnalyticTile label="Pending review" value={`${pendingCount}`} emoji="🗂" />
          </div>
          <div className="rounded-3xl bg-card p-5 card-shadow">
            <h3 className="mb-4 text-sm font-black text-ink">Reads by topic (last 30 days)</h3>
            <div className="space-y-2">
              {CATEGORIES.map((c, i) => {
                const val = 90 - i * 7;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-semibold text-ink">{c.emoji} {c.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-canvas">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ delay: i * 0.05 }}
                        className={`h-full rounded-full bg-gradient-to-r ${c.gradient}`}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-muted">{val * 34}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-3">
          <div className="rounded-3xl bg-card p-5 card-shadow">
            <h3 className="mb-2 text-sm font-black text-ink">Featured studies</h3>
            <p className="mb-3 text-xs text-muted">Curated studies shown on the home page.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ARTICLES.filter((a) => a.featured).slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-2xl bg-canvas p-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">{a.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs font-bold text-emerald-600">★ Featured</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-5 card-shadow">
            <h3 className="mb-3 text-sm font-black text-ink">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c.id} className="rounded-full bg-canvas px-3 py-1.5 text-sm font-semibold text-ink">
                  {c.emoji} {c.name} <span className="text-muted">({ARTICLES.filter((a) => a.category === c.id).length})</span>
                </span>
              ))}
            </div>
          </div>
          <ArticleCoversPanel />
        </div>
      )}

      {viewing && (
        <SubmissionDetailModal
          submission={viewing.submission}
          authorName={viewing.authorName}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function ModerationCard({
  title,
  author,
  avatar,
  category,
  excerpt,
  status,
  onView,
  onApprove,
  onReject,
  onChanges,
  onViewPublished,
}: {
  title: string;
  author: string;
  avatar: string;
  category: string;
  excerpt: string;
  status: SubmissionStatus;
  onView: () => void;
  onApprove: () => void;
  onReject: (note: string) => void;
  onChanges: (note: string) => void;
  onViewPublished?: () => void;
}) {
  const [composing, setComposing] = useState<"changes" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [justDecided, setJustDecided] = useState<"approved" | "changes" | "rejected" | null>(null);
  const decided = status === "approved" || status === "rejected";

  function send() {
    if (!note.trim()) return;
    if (composing === "changes") {
      onChanges(note.trim());
      setJustDecided("changes");
    } else if (composing === "reject") {
      onReject(note.trim());
      setJustDecided("rejected");
    }
    setComposing(null);
    setNote("");
  }

  function approve() {
    onApprove();
    setJustDecided("approved");
  }

  return (
    <div className="rounded-3xl bg-card p-4 card-shadow">
      <button onClick={onView} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-ink hover:text-brand-700">{title}</h3>
            <div className="mt-0.5 text-xs text-muted"><AvatarFace value={avatar} /> {author} · {category}</div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[status]}`}>
            {status.replace("-", " ")}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{excerpt}</p>
        <div className="mt-1 text-xs font-semibold text-brand-700">Tap to view full submission →</div>
      </button>

      {justDecided === "approved" && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 p-3 text-sm">
          <span className="font-semibold text-emerald-700">✅ Approved &amp; author notified</span>
          {onViewPublished && (
            <button onClick={onViewPublished} className="font-bold text-emerald-700 hover:underline">
              View it →
            </button>
          )}
        </div>
      )}
      {justDecided === "rejected" && (
        <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">✕ Rejected &amp; author notified with your message</div>
      )}
      {justDecided === "changes" && (
        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">✎ Changes requested &amp; author notified with your message</div>
      )}

      {!decided && !justDecided && (
        <>
          {composing ? (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  composing === "reject"
                    ? "Explain why this was rejected — this message goes straight to the author…"
                    : "Explain what needs to change — this message goes straight to the author…"
                }
                rows={3}
                className="w-full rounded-2xl border border-line bg-canvas p-3 text-sm outline-none focus:border-brand/40"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={send} disabled={!note.trim()}>
                  Send &amp; {composing === "reject" ? "reject" : "request changes"}
                </Button>
                <button
                  onClick={() => {
                    setComposing(null);
                    setNote("");
                  }}
                  className="rounded-2xl px-3.5 py-2 text-sm font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={approve}>✓ Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setComposing("changes")}>✎ Request changes</Button>
              <button
                onClick={() => setComposing("reject")}
                className="rounded-2xl bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
              >
                ✕ Reject
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnalyticTile({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 card-shadow">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-2xl font-black text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function ArticleCoversPanel() {
  const { state } = useStore();
  const [query, setQuery] = useState("");

  const customizedIds = new Set(Object.keys(state.customCovers));
  const results = query.trim()
    ? ARTICLES.filter((a) => articleMatchesQuery(a, query)).slice(0, 12)
    : ARTICLES.filter((a) => customizedIds.has(a.id) || a.featured).slice(0, 12);

  return (
    <div className="rounded-3xl bg-card p-5 card-shadow">
      <h3 className="mb-1 text-sm font-black text-ink">🖼️ Article covers</h3>
      <p className="mb-3 text-xs text-muted">
        Upload a real photo for any article — drag &amp; drop or click to browse. Uploaded covers replace the
        default gradient everywhere the article appears.
      </p>
      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-canvas px-3 py-2">
        <span className="text-muted">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an article to give it a cover…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-xs text-muted hover:text-ink" aria-label="Clear search">
            ✕
          </button>
        )}
      </div>
      {!query.trim() && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Showing customized &amp; featured articles — search to find any other
        </p>
      )}
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No articles match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((a) => (
            <CoverUploadCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoverUploadCard({ article }: { article: Article }) {
  const { state, dispatch } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const coverUrl = state.customCovers[article.id];

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        dispatch({ type: "setCover", payload: { articleId: article.id, dataUrl: reader.result } });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-2xl bg-canvas p-3">
      <div className="flex items-center gap-3">
        <CoverArt category={article.category} coverUrl={coverUrl} className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{article.title}</div>
          <div className="text-xs text-muted">
            {article.category} · {article.difficulty}
            {coverUrl && <span className="ml-1.5 font-semibold text-emerald-600">· custom cover</span>}
          </div>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center transition ${
          dragOver ? "border-brand bg-brand/5" : "border-line hover:border-brand/40"
        }`}
      >
        <span className="text-lg" aria-hidden>📤</span>
        <span className="text-xs font-semibold text-muted">Drag &amp; drop an image, or click to upload</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p>}

      {coverUrl && (
        <button
          onClick={() => dispatch({ type: "removeCover", payload: { articleId: article.id } })}
          className="mt-2 w-full rounded-xl bg-rose-50 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
        >
          Remove custom cover
        </button>
      )}
    </div>
  );
}
