// Achievement detection engine — builds snapshots and detects new achievements

import {
  ACHIEVEMENTS,
  HIGHLIGHTS,
  AchievementDefinition,
  AchievementSnapshot,
  HighlightDefinition,
  ReportType,
} from './achievementDefinitions';
import type { TaskCompletion, DailyScore, Trend } from '@maai/shared';

// Stats shape matching what StatsContext exposes
export interface StatsValues {
  currentStreak: number;
  longestStreak: number;
  todayScore: DailyScore;
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
  weeklyTrend: Trend;
  completions: TaskCompletion[];
}

// Task shape for counting hard tasks
interface TaskInfo {
  id: number;
  difficulty: string;
}

// Goal shape for counting completed goals
interface GoalInfo {
  completed: boolean;
}

export function buildSnapshot(
  stats: StatsValues,
  tasks?: TaskInfo[],
  goals?: GoalInfo[],
): AchievementSnapshot {
  const totalTasksCompleted = stats.completions.filter(c => c.completed).length;

  const uniqueDates = new Set<string>();
  for (const c of stats.completions) {
    if (c.completed) uniqueDates.add(c.date);
  }

  let hardTasksCompleted = 0;
  if (tasks && tasks.length > 0) {
    const hardTaskIds = new Set(
      tasks.filter(t => t.difficulty === 'high' || t.difficulty === 'maximum').map(t => t.id),
    );
    hardTasksCompleted = stats.completions.filter(
      c => c.completed && hardTaskIds.has(c.taskId),
    ).length;
  }

  const goalsCompleted = goals ? goals.filter(g => g.completed).length : 0;
  const perfectWeeksAllTime = countPerfectWeeks(stats.completions);
  const perfectMonthsAllTime = countPerfectMonths(stats.completions);

  return {
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    todayScore: stats.todayScore.score,
    todayTasksScheduled: stats.todayScore.tasksScheduled,
    todayTasksCompleted: stats.todayScore.tasksCompleted,
    weeklyScore: stats.weeklyScore,
    monthlyScore: stats.monthlyScore,
    allTimeAverage: stats.allTimeAverage,
    consistency: stats.consistency,
    todayCompletion: stats.todayCompletion,
    weeklyCompletion: stats.weeklyCompletion,
    monthlyCompletion: stats.monthlyCompletion,
    perfectDaysThisWeek: stats.perfectDaysThisWeek,
    perfectDaysThisMonth: stats.perfectDaysThisMonth,
    perfectDaysAllTime: stats.perfectDaysAllTime,
    weeklyTrend: stats.weeklyTrend,
    totalTasksCompleted,
    daysTracked: uniqueDates.size,
    hardTasksCompleted,
    goalsCompleted,
    perfectWeeksAllTime,
    perfectMonthsAllTime,
  };
}

function countPerfectWeeks(completions: TaskCompletion[]): number {
  if (completions.length === 0) return 0;

  const dateMap = new Map<string, { scheduled: number; completed: number }>();
  for (const c of completions) {
    const entry = dateMap.get(c.date) || { scheduled: 0, completed: 0 };
    entry.scheduled++;
    if (c.completed) entry.completed++;
    dateMap.set(c.date, entry);
  }

  const sortedDates = [...dateMap.keys()].sort();
  if (sortedDates.length === 0) return 0;

  const firstDate = new Date(sortedDates[0] + 'T00:00:00');
  const firstDow = (firstDate.getDay() + 6) % 7;
  const weekStart = new Date(firstDate);
  weekStart.setDate(weekStart.getDate() - firstDow);

  const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
  let perfectWeeks = 0;
  const cursor = new Date(weekStart);

  while (cursor <= lastDate) {
    let weekPerfect = true;
    let weekHasDays = false;

    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0];
      const entry = dateMap.get(dateStr);
      if (entry && entry.scheduled > 0) {
        weekHasDays = true;
        if (entry.completed < entry.scheduled) {
          weekPerfect = false;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (weekHasDays && weekPerfect) {
      perfectWeeks++;
    }
  }

  return perfectWeeks;
}

function countPerfectMonths(completions: TaskCompletion[]): number {
  if (completions.length === 0) return 0;

  const monthMap = new Map<string, { scheduled: number; completed: number }>();
  for (const c of completions) {
    const monthKey = c.date.substring(0, 7);
    const entry = monthMap.get(monthKey) || { scheduled: 0, completed: 0 };
    entry.scheduled++;
    if (c.completed) entry.completed++;
    monthMap.set(monthKey, entry);
  }

  let perfectMonths = 0;
  for (const [, entry] of monthMap) {
    if (entry.scheduled > 0 && entry.completed === entry.scheduled) {
      perfectMonths++;
    }
  }

  return perfectMonths;
}

export function detectNewAchievements(
  snapshot: AchievementSnapshot,
  alreadyUnlockedIds: Set<string>,
): AchievementDefinition[] {
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlockedIds.has(achievement.id)) continue;

    try {
      if (achievement.check(snapshot)) {
        newlyUnlocked.push(achievement);
      }
    } catch (e) {
      console.warn(`[Achievement] Check failed for ${achievement.id}:`, e);
    }
  }

  return newlyUnlocked;
}

export function computeHighlights(
  snapshot: AchievementSnapshot,
  reportType: ReportType,
): HighlightDefinition[] {
  const matched: HighlightDefinition[] = [];

  for (const highlight of HIGHLIGHTS) {
    if (highlight.reportType !== reportType) continue;

    try {
      if (highlight.check(snapshot)) {
        matched.push(highlight);
      }
    } catch (e) {
      console.warn(`[Highlight] Check failed for ${highlight.id}:`, e);
    }
  }

  return matched;
}
