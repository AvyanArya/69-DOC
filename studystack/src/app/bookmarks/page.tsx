"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { ArticleCard } from "@/components/ArticleCard";
import { Button, EmptyState } from "@/components/ui";
import { getArticle } from "@/lib/content";

export default function BookmarksPage() {
  const { state, dispatch } = useStore();
  const [active, setActive] = useState<string>("All");
  const [newFolder, setNewFolder] = useState("");

  const folders = ["All", ...state.folders];
  const items = state.bookmarks
    .filter((b) => active === "All" || b.folder === active)
    .map((b) => ({ b, a: getArticle(b.articleId) }))
    .filter((x) => x.a);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">Favorites &amp; Bookmarks 🔖</h1>
        <p className="text-muted">Everything you&apos;ve saved, organised into folders — tap 🔗 to share any of them.</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === f ? "gradient-purple text-white" : "bg-card text-muted border border-line"
            }`}
          >
            {f === "Favorites" ? "⭐" : "📁"} {f}
            <span className="ml-1.5 opacity-70">
              {f === "All" ? state.bookmarks.length : state.bookmarks.filter((b) => b.folder === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-card p-2 card-shadow">
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="New folder name…"
          className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <Button
          size="sm"
          variant="soft"
          onClick={() => {
            dispatch({ type: "addFolder", payload: { name: newFolder } });
            setNewFolder("");
          }}
        >
          Add folder
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState emoji="📑" title="No bookmarks here" body="Tap the bookmark icon on any study to save it to a folder." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ b }, i) => (
            <BookmarkTile
              key={b.articleId}
              articleId={b.articleId}
              folder={b.folder}
              index={i}
              onRemove={() => dispatch({ type: "toggleBookmark", payload: { articleId: b.articleId, folder: b.folder } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarkTile({
  articleId,
  folder,
  index,
  onRemove,
}: {
  articleId: string;
  folder: string;
  index: number;
  onRemove: () => void;
}) {
  const article = getArticle(articleId);
  const [shared, setShared] = useState(false);
  if (!article) return null;

  async function share() {
    setShared(true);
    setTimeout(() => setShared(false), 1500);
    try {
      if (navigator.share) {
        await navigator.share({ title: article!.title, text: article!.summary, url: window.location.origin + "/learn/" + article!.id });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${article!.title} — ${article!.summary} · via StudyStack`);
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  return (
    <div className="relative">
      <ArticleCard article={article} index={index} />
      <div className="absolute right-2 top-2 flex gap-1.5">
        <button
          onClick={share}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm card-shadow hover:bg-white"
          aria-label="Share"
          title="Share"
        >
          {shared ? "✅" : "🔗"}
        </button>
        <button
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm card-shadow hover:bg-white"
          aria-label="Remove bookmark"
          title="Remove"
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5 px-1 text-[11px] font-semibold text-muted">📁 {folder}</div>
    </div>
  );
}
