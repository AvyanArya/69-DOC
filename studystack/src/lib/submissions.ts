import type { SubmissionStatus } from "./types";

export const STATUS_STYLE: Record<SubmissionStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  "under-review": "bg-blue-100 text-blue-700",
  "needs-changes": "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  "under-review": "Under review",
  "needs-changes": "Needs changes",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
};

export function renderMarkdown(md: string): string {
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
