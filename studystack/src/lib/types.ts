// ─── Core domain types for Vera ──────────────────────────────────────────────

export type Category =
  | "biology"
  | "chemistry"
  | "medicine"
  | "neuroscience"
  | "psychology"
  | "genetics"
  | "epidemiology"
  | "pharmacology"
  | "public-health"
  | "physics"
  | "business"
  | "finance"
  | "history"
  | "art-history"
  | "politics";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type GradeLevel =
  | "grade-6-8"
  | "grade-9-10"
  | "grade-11-12"
  | "college"
  | "postgrad";

export type ArticleType = "study" | "student";

export interface Topic {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  readMinutes: number;
  summary: string;
  facts: string[]; // key findings, used for body + quiz generation
  terms: string[]; // glossary term ids highlighted in the article
  authorId: string; // demo user id (student articles) or "editorial"
  publishedAt: string; // ISO date
  featured?: boolean;
  type: ArticleType;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface Article extends Topic {
  xp: number;
  coins: number;
  sections: ArticleSection[];
  keyTakeaways: string[];
  importantFacts: string[];
  references: Reference[];
  likes: number;
  bookmarksCount: number;
  reads: number;
}

export interface Reference {
  label: string;
  authors: string;
  source: string;
  year: number;
  url: string;
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

export type QuestionKind =
  | "multiple-choice"
  | "true-false"
  | "matching"
  | "ordering"
  | "scenario"
  | "image";

export interface QuizQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options?: string[]; // MC / scenario / true-false
  correctIndex?: number; // MC / scenario / true-false
  pairs?: { left: string; right: string }[]; // matching
  orderedItems?: string[]; // ordering — correct order
  explanation: string;
}

export interface Quiz {
  articleId: string;
  passScore: number; // fraction 0..1 required to pass
  questions: QuizQuestion[];
}

export interface QuizResult {
  articleId: string;
  score: number; // 0..1
  correct: number;
  total: number;
  passed: boolean;
  completedAt: string;
  xpEarned: number;
  coinsEarned: number;
}

// ─── Users & social ──────────────────────────────────────────────────────────

export interface DemoUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // emoji avatar
  bio: string;
  level: number;
  xp: number;
  streak: number;
  articlesRead: number;
  towerHeight: number;
  quizAccuracy: number; // 0..1
  followers: number;
  following: number;
  badges: string[];
  weeklyXp: number;
  dailyXp: number;
  monthlyXp: number;
  isModerator?: boolean;
}

export interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  body: string;
  likes: number;
  createdAt: string;
  replies?: Comment[];
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

// ─── Writing & moderation ────────────────────────────────────────────────────

export type SubmissionStatus =
  | "draft"
  | "pending"
  | "under-review"
  | "needs-changes"
  | "approved"
  | "published"
  | "rejected";

export interface Submission {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  tags: string[];
  body: string; // markdown
  references: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  moderatorNote?: string;
  authorId: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationKind =
  | "reminder"
  | "badge"
  | "quiz"
  | "moderation"
  | "social"
  | "trending";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

// ─── Persisted local user state ──────────────────────────────────────────────

export interface BookmarkEntry {
  articleId: string;
  folder: string;
  savedAt: string;
}

export interface ReadingProgress {
  articleId: string;
  percent: number; // 0..100
  updatedAt: string;
}

export interface CompletedArticle {
  articleId: string;
  completedAt: string;
  quizScore: number; // 0..1
  notes?: string;
  method?: "quiz" | "marked"; // "marked" = quick "I read this" without taking the quiz
  xpEarned?: number; // only set for "marked" entries, so unmarking can reverse it precisely
  coinsEarned?: number;
}

export interface UserState {
  signedIn: boolean;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  isAdmin: boolean;
  gradeLevel: GradeLevel;
  interests: Category[]; // declared subjects of interest, used to bias recommendations
  createdAt: string;

  xp: number;
  coins: number;
  dailyXp: number;
  dailyXpDate: string; // yyyy-mm-dd the dailyXp belongs to
  weeklyXp: number;

  streak: number;
  bestStreak: number;
  lastActiveDay: string; // yyyy-mm-dd of last streak-counting activity
  freezes: number;
  freezeUsedDates: string[];
  lastFreezeGrantWeek: string; // ISO week key of last free freeze grant

  completed: CompletedArticle[];
  progress: ReadingProgress[];
  bookmarks: BookmarkEntry[];
  folders: string[];
  likes: string[]; // article ids
  badges: string[]; // badge ids earned
  quizResults: QuizResult[];
  followingIds: string[];

  submissions: Submission[];
  notifications: AppNotification[];

  dailyGoalArticles: number; // configurable goal
  writingUnlockArticles: number; // configurable threshold
  activeDays: string[]; // distinct yyyy-mm-dd days with activity

  citationQuizPassed: boolean; // must pass the referencing/citation skills quiz to publish
  citationQuizBestScore: number; // 0..1

  dailyFactClaimedDate: string; // yyyy-mm-dd of last "Today's Cancer Fact" claim

  customCovers: Record<string, string>; // articleId -> admin-uploaded cover image data URL
}
