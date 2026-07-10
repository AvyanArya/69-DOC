"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getArticle, getQuiz } from "@/lib/content";
import { ArticleReader } from "@/components/ArticleReader";
import { EmptyState } from "@/components/ui";

export default function ArticlePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const article = id ? getArticle(id) : undefined;
  const quiz = id ? getQuiz(id) : undefined;

  if (!article || !quiz) {
    return (
      <div className="pt-10">
        <EmptyState emoji="🔍" title="Article not found" body="This study may have moved. Head back to Learn to keep exploring." />
        <div className="mt-4 text-center">
          <Link href="/learn" className="font-semibold text-brand-700">← Back to Learn</Link>
        </div>
      </div>
    );
  }

  return <ArticleReader article={article} quiz={quiz} />;
}
