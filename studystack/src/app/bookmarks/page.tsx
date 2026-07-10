"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { ArticleRow } from "@/components/ArticleCard";
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
        <h1 className="text-2xl font-black tracking-tight text-ink">Bookmarks 🔖</h1>
        <p className="text-muted">Save studies and organise them into folders.</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === f ? "gradient-purple text-white" : "bg-white text-muted border border-line"
            }`}
          >
            📁 {f}
            <span className="ml-1.5 opacity-70">
              {f === "All" ? state.bookmarks.length : state.bookmarks.filter((b) => b.folder === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-white p-2 card-shadow">
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
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(({ b, a }) => (
            <div key={b.articleId} className="relative">
              <ArticleRow article={a!} />
              <button
                onClick={() => dispatch({ type: "toggleBookmark", payload: { articleId: b.articleId, folder: b.folder } })}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm card-shadow hover:bg-white"
                aria-label="Remove bookmark"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
