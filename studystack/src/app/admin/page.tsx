"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Button, Chip } from "@/components/ui";
import { CATEGORIES } from "@/lib/data/categories";
import { DEMO_USERS } from "@/lib/data/users";
import { STUDY_COUNT, STUDENT_COUNT, ARTICLES } from "@/lib/content";
import type { SubmissionStatus } from "@/lib/types";

type Tab = "moderation" | "users" | "analytics" | "content";

interface QueueItem {
  id: string;
  title: string;
  author: string;
  avatar: string;
  category: string;
  excerpt: string;
  status: SubmissionStatus;
}

const INITIAL_QUEUE: QueueItem[] = [
  { id: "q1", title: "How Mnemonics Boost Memory Retention", author: "Tom Fischer", avatar: "🐢", category: "Psychology", excerpt: "A student-friendly review of how memory tricks work and why they help before exams…", status: "pending" },
  { id: "q2", title: "The Biology of Sunburn", author: "Zoe Adeyemi", avatar: "🐝", category: "Biology", excerpt: "What actually happens in your skin cells when you get burned by UV light…", status: "under-review" },
  { id: "q3", title: "Why Antibiotics Don't Work on Viruses", author: "Priya Nair", avatar: "🦋", category: "Medicine", excerpt: "A clear explanation of the difference between bacteria and viruses for beginners…", status: "pending" },
  { id: "q4", title: "The Chemistry of Fizzy Drinks", author: "Aarav Sharma", avatar: "🦁", category: "Chemistry", excerpt: "How carbon dioxide gets into your soda and why it fizzes when you open it…", status: "needs-changes" },
];

export default function AdminPage() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>("moderation");
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);

  function setQueueStatus(id: string, status: SubmissionStatus) {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, status } : item)));
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
              onApprove={() => dispatch({ type: "updateSubmission", payload: { id: s.id, changes: { status: "approved" } } })}
              onReject={() => dispatch({ type: "updateSubmission", payload: { id: s.id, changes: { status: "rejected", moderatorNote: "Needs more citations." } } })}
              onChanges={() => dispatch({ type: "updateSubmission", payload: { id: s.id, changes: { status: "needs-changes", moderatorNote: "Great start — please add references and a summary." } } })}
            />
          ))}
          {queue.map((item) => (
            <ModerationCard
              key={item.id}
              title={item.title}
              author={item.author}
              avatar={item.avatar}
              category={item.category}
              excerpt={item.excerpt}
              status={item.status}
              onApprove={() => setQueueStatus(item.id, "approved")}
              onReject={() => setQueueStatus(item.id, "rejected")}
              onChanges={() => setQueueStatus(item.id, "needs-changes")}
            />
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {DEMO_USERS.filter((u) => u.id !== "editorial").map((u) => {
            const banned = bannedUsers.includes(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-canvas text-xl">{u.avatar}</span>
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
          <div className="rounded-3xl bg-white p-5 card-shadow">
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
          <div className="rounded-3xl bg-white p-5 card-shadow">
            <h3 className="mb-2 text-sm font-black text-ink">Featured studies</h3>
            <p className="mb-3 text-xs text-muted">Curated studies shown on the home page.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ARTICLES.filter((a) => a.featured).slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-2xl bg-canvas p-3">
                  <span className="truncate text-sm font-semibold text-ink">{a.title}</span>
                  <span className="text-xs font-bold text-emerald-600">★ Featured</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5 card-shadow">
            <h3 className="mb-3 text-sm font-black text-ink">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c.id} className="rounded-full bg-canvas px-3 py-1.5 text-sm font-semibold text-ink">
                  {c.emoji} {c.name} <span className="text-muted">({ARTICLES.filter((a) => a.category === c.id).length})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  "under-review": "bg-blue-100 text-blue-700",
  "needs-changes": "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

function ModerationCard({
  title,
  author,
  avatar,
  category,
  excerpt,
  status,
  onApprove,
  onReject,
  onChanges,
}: {
  title: string;
  author: string;
  avatar: string;
  category: string;
  excerpt: string;
  status: SubmissionStatus;
  onApprove: () => void;
  onReject: () => void;
  onChanges: () => void;
}) {
  const decided = status === "approved" || status === "rejected";
  return (
    <div className="rounded-3xl bg-white p-4 card-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-ink">{title}</h3>
          <div className="mt-0.5 text-xs text-muted">{avatar} {author} · {category}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[status]}`}>
          {status.replace("-", " ")}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{excerpt}</p>
      {!decided && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={onApprove}>✓ Approve</Button>
          <Button size="sm" variant="outline" onClick={onChanges}>✎ Request changes</Button>
          <button onClick={onReject} className="rounded-2xl bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100">
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticTile({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 card-shadow">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-2xl font-black text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
