"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Difficulty, ArticleType } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/data/categories";
import type { Category } from "@/lib/types";
import type { ReactNode } from "react";

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "purple" | "ghost" | "outline" | "soft";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const sizes = {
    sm: "px-3.5 py-2 text-sm",
    md: "px-5 py-2.5 text-[15px]",
    lg: "px-6 py-3.5 text-base",
  };
  const variants = {
    primary: "gradient-pink text-white glow-pink hover:brightness-105",
    purple: "gradient-purple text-white hover:brightness-110",
    ghost: "text-ink hover:bg-black/5",
    outline: "border border-line bg-white text-ink hover:border-brand/40 hover:text-brand",
    soft: "bg-brand/10 text-brand-700 hover:bg-brand/15",
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`;

  const inner = (
    <motion.span whileTap={{ scale: 0.96 }} className="inline-flex items-center gap-2">
      {children}
    </motion.span>
  );

  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}

// ─── Pills & chips ───────────────────────────────────────────────────────────

const DIFF_STYLES: Record<Difficulty, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-rose-100 text-rose-700",
};

export function DifficultyPill({ difficulty, className = "" }: { difficulty: Difficulty; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${DIFF_STYLES[difficulty]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {difficulty}
    </span>
  );
}

export function CategoryPill({ category, className = "" }: { category: Category; className?: string }) {
  const c = CATEGORY_MAP[category];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-grape/5 px-2.5 py-1 text-xs font-semibold text-grape-500 ${className}`}>
      <span aria-hidden>{c.emoji}</span> {c.name}
    </span>
  );
}

export function TypePill({ type, className = "" }: { type: ArticleType; className?: string }) {
  const isStudy = type === "study";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        isStudy ? "bg-grape/10 text-grape-500" : "bg-brand/10 text-brand-700"
      } ${className}`}
    >
      {isStudy ? "🔬 Study" : "✍️ Student"}
    </span>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "gradient-purple text-white shadow" : "bg-white text-muted border border-line hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Cards & layout ──────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-card card-shadow ${className}`}>{children}</div>;
}

export function SectionHeader({
  title,
  emoji,
  action,
}: {
  title: string;
  emoji?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
        {emoji && <span aria-hidden>{emoji}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function ProgressBar({
  percent,
  className = "",
  color = "pink",
}: {
  percent: number;
  className?: string;
  color?: "pink" | "purple";
}) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-black/5 ${className}`} role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className={`h-full rounded-full ${color === "pink" ? "gradient-pink" : "gradient-purple"}`}
      />
    </div>
  );
}

export function Ring({
  percent,
  size = 56,
  stroke = 6,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percent) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-black/5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="fill-none"
          stroke="url(#ringGrad)"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Cover art (deterministic gradient from category) ────────────────────────

export function CoverArt({
  category,
  className = "",
  emoji,
  big,
}: {
  category: Category;
  className?: string;
  emoji?: string;
  big?: boolean;
}) {
  const c = CATEGORY_MAP[category];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${c.gradient} ${className}`}>
      <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/20 blur-xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-black/10 blur-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={big ? "text-7xl drop-shadow" : "text-4xl drop-shadow"} aria-hidden>
          {emoji ?? c.emoji}
        </span>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  emoji,
}: {
  label: string;
  value: ReactNode;
  emoji?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center card-shadow">
      {emoji && <div className="text-2xl">{emoji}</div>}
      <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white/60 p-10 text-center">
      <div className="text-5xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
