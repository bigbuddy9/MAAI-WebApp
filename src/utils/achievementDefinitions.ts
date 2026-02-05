// Achievement/milestone definitions — split into one-time milestones (stored in DB)
// and recurring highlights (computed at render for each report period)

export type AchievementCategory =
  | 'tasks'
  | 'perfect_days'
  | 'goals';

export interface AchievementSnapshot {
  currentStreak: number;
  longestStreak: number;
  todayScore: number;
  todayTasksScheduled: number;
  todayTasksCompleted: number;
  weeklyScore: number;
  monthlyScore: number;
  allTimeAverage: number;
  consistency: number;
  todayCompletion: number;
  weeklyCompletion: number;
  monthlyCompletion: number;
  perfectDaysThisWeek: number;
  perfectDaysThisMonth: number;
  perfectDaysAllTime: number;
  weeklyTrend: 'improving' | 'stable' | 'declining';
  totalTasksCompleted: number;
  daysTracked: number;
  hardTasksCompleted: number;
  goalsCompleted: number;
  perfectWeeksAllTime: number;
  perfectMonthsAllTime: number;
}

export interface AchievementDefinition {
  id: string;
  description: string;
  category: AchievementCategory;
  socialProof: string;
  emoji: string;
  check: (snapshot: AchievementSnapshot) => boolean;
}

// ============================================================
// ONE-TIME MILESTONES (24) — stored in user_achievements table
// ============================================================
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // TASK MILESTONES (5)
  { id: 'tasks_50', description: '50 Tasks Completed', category: 'tasks', socialProof: 'Top 1.2% of users', emoji: '\uD83C\uDFC6', check: (s) => s.totalTasksCompleted >= 50 },
  { id: 'tasks_100', description: '100 Tasks Completed', category: 'tasks', socialProof: 'Top 0.8% discipline', emoji: '\uD83C\uDFC6', check: (s) => s.totalTasksCompleted >= 100 },
  { id: 'tasks_250', description: '250 Tasks Completed', category: 'tasks', socialProof: 'Elite 0.4%', emoji: '\uD83C\uDFC6', check: (s) => s.totalTasksCompleted >= 250 },
  { id: 'tasks_500', description: '500 Tasks Completed', category: 'tasks', socialProof: 'Elite 0.5% territory', emoji: '\uD83C\uDFC6', check: (s) => s.totalTasksCompleted >= 500 },
  { id: 'tasks_1000', description: '1,000 Tasks Completed', category: 'tasks', socialProof: 'Top 0.1%', emoji: '\uD83C\uDFC6', check: (s) => s.totalTasksCompleted >= 1000 },

  // PERFECT DAY MILESTONES (8)
  { id: 'perfect_week', description: 'First Perfect Week', category: 'perfect_days', socialProof: '89% never see this', emoji: '\uD83D\uDE80', check: (s) => s.perfectWeeksAllTime >= 1 },
  { id: 'perfect_month', description: 'First Perfect Month', category: 'perfect_days', socialProof: 'Only 2% achieve this', emoji: '\uD83D\uDE80', check: (s) => s.perfectMonthsAllTime >= 1 },
  { id: 'perfect_10', description: '10 Perfect Days', category: 'perfect_days', socialProof: 'Top 5%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 10 },
  { id: 'perfect_25', description: '25 Perfect Days', category: 'perfect_days', socialProof: 'Elite 2%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 25 },
  { id: 'perfect_50', description: '50 Perfect Days', category: 'perfect_days', socialProof: 'Elite 1%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 50 },
  { id: 'perfect_100', description: '100 Perfect Days', category: 'perfect_days', socialProof: 'Elite 0.5%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 100 },
  { id: 'perfect_150', description: '150 Perfect Days', category: 'perfect_days', socialProof: 'Elite 0.3%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 150 },
  { id: 'perfect_200', description: '200 Perfect Days', category: 'perfect_days', socialProof: 'Elite 0.2%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 200 },
  { id: 'perfect_250', description: '250 Perfect Days', category: 'perfect_days', socialProof: 'Elite 0.1%', emoji: '\u2B50', check: (s) => s.perfectDaysAllTime >= 250 },

  // GOAL COMPLETED (1)
  { id: 'goals_1', description: 'Goal Completed', category: 'goals', socialProof: 'Top 15%', emoji: '\uD83C\uDFAF', check: (s) => s.goalsCompleted >= 1 },
];

// Lookup map for O(1) access by ID
export const ACHIEVEMENT_MAP: Record<string, AchievementDefinition> =
  Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;

// Category display labels
export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  tasks: 'Tasks',
  perfect_days: 'Perfect Days',
  goals: 'Goals',
};

// ============================================================
// RECURRING HIGHLIGHTS (13) — computed at render, not stored
// ============================================================
export type ReportType = 'daily' | 'weekly' | 'monthly';

export interface HighlightDefinition {
  id: string;
  description: string;
  reportType: ReportType;
  check: (snapshot: AchievementSnapshot) => boolean;
}

export const HIGHLIGHTS: HighlightDefinition[] = [
  // Streaks (daily reports)
  { id: 'highlight_streak_7', description: '7 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 7 },
  { id: 'highlight_streak_14', description: '14 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 14 },
  { id: 'highlight_streak_30', description: '30 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 30 },
  { id: 'highlight_streak_60', description: '60 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 60 },
  { id: 'highlight_streak_90', description: '90 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 90 },
  { id: 'highlight_streak_180', description: '180 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 180 },
  { id: 'highlight_streak_365', description: '365 Day Streak', reportType: 'daily', check: (s) => s.currentStreak === 365 },
  { id: 'highlight_streak_longest', description: 'New Personal Best Streak', reportType: 'daily', check: (s) => s.longestStreak >= 7 && s.currentStreak === s.longestStreak },

  // Perfect scores
  { id: 'highlight_perfect_day', description: 'Perfect Day', reportType: 'daily', check: (s) => s.todayScore === 100 && s.todayTasksScheduled > 0 },
  { id: 'highlight_perfect_week', description: 'Perfect Week', reportType: 'weekly', check: (s) => s.weeklyScore === 100 },
  { id: 'highlight_perfect_month', description: 'Perfect Month', reportType: 'monthly', check: (s) => s.monthlyScore === 100 },

  // Score 90+
  { id: 'highlight_score_weekly_90', description: 'Weekly Score 90+', reportType: 'weekly', check: (s) => s.weeklyScore >= 90 },
  { id: 'highlight_score_monthly_90', description: 'Monthly Score 90+', reportType: 'monthly', check: (s) => s.monthlyScore >= 90 },
];

export const HIGHLIGHT_MAP: Record<string, HighlightDefinition> =
  Object.fromEntries(HIGHLIGHTS.map(h => [h.id, h]));
