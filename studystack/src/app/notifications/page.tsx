"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/ui";
import type { NotificationKind } from "@/lib/types";

const ICON: Record<NotificationKind, string> = {
  reminder: "⏰",
  badge: "🏅",
  quiz: "🧩",
  moderation: "🛡️",
  social: "👥",
  trending: "🔥",
};

export default function NotificationsPage() {
  const { state, dispatch } = useStore();
  const notifications = state.notifications;

  const seed = notifications.length === 0
    ? [
        { id: "s1", kind: "reminder" as const, title: "Keep your streak alive 🔥", body: "You haven't learned today. Read one study to keep your streak.", createdAt: new Date().toISOString(), read: false },
        { id: "s2", kind: "trending" as const, title: "Trending now", body: "‘How Vaccines Train Your Immune System’ is trending among students.", createdAt: new Date(Date.now() - 3600_000).toISOString(), read: false, href: "/learn/how-vaccines-train-your-immune-system" },
        { id: "s3", kind: "social" as const, title: "Maya Chen followed you", body: "You have a new follower.", createdAt: new Date(Date.now() - 7200_000).toISOString(), read: true },
      ]
    : notifications;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-ink">Notifications 🔔</h1>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={() => dispatch({ type: "readAllNotifications" })}
            className="text-sm font-semibold text-brand-700"
          >
            Mark all read
          </button>
        )}
      </div>

      {seed.length === 0 ? (
        <EmptyState emoji="🔔" title="All caught up" body="New badges, quiz results and reminders will show up here." />
      ) : (
        <div className="space-y-2">
          {seed.map((n) => {
            const inner = (
              <div className={`flex items-start gap-3 rounded-2xl p-4 card-shadow transition ${n.read ? "bg-card" : "bg-brand/5"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-canvas text-lg">{ICON[n.kind]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full gradient-pink" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                  <div className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              </div>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} onClick={() => dispatch({ type: "readNotification", payload: { id: n.id } })}>
                {inner}
              </Link>
            ) : (
              <button
                key={n.id}
                onClick={() => dispatch({ type: "readNotification", payload: { id: n.id } })}
                className="w-full text-left"
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
