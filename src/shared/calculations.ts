/**
 * MyAccountable.ai Calculation Engine
 *
 * All scoring, streak, consistency, and probability calculations.
 * See /docs/CALCULATION-SPEC.md for full specification.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Task {
  id: number;
  name: string;
  importance: 'medium' | 'high' | 'maximum';
  difficulty: 'medium' | 'high' | 'maximum';
  goalId: number;
  goalPriority: number;
  type: 'checkbox' | 'number';
  completed: boolean;
  value?: number;
  target?: number;
  frequency: '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'daily';
  selectedDays: number[];
  createdAt?: string; // YYYY-MM-DD — task only scheduled on/after this date
}

export interface Goal {
  id: number;
  name: string;
  priority: number;
  createdAt: Date;
  targetDate: Date;
  completed: boolean;
  completedDate?: Date;
}

export interface TaskCompletion {
  taskId: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
  timestamp: Date;
  isLateLogged: boolean;
}

export interface DailyScore {
  date: string;
  score: number;
  pointsEarned: number;
  pointsPossible: number;
  tasksCompleted: number;
  tasksScheduled: number;
  isLocked: boolean;
}

export type Trend = 'improving' | 'stable' | 'declining';

// Lookup index for O(1) completion retrieval (key: "taskId:date")
export type CompletionIndex = Map<string, TaskCompletion>;

export function buildCompletionIndex(completions: TaskCompletion[]): CompletionIndex {
  const map = new Map<string, TaskCompletion>();
  for (const c of completions) {
    map.set(`${c.taskId}:${c.date}`, c);
  }
  return map;
}

function getCompletion(
  taskId: number,
  date: string,
  index?: CompletionIndex,
  completions?: TaskCompletion[],
): TaskCompletion | undefined {
  if (index) return index.get(`${taskId}:${date}`);
  return completions?.find(c => c.taskId === taskId && c.date === date);
}

// =============================================================================
// CONSTANTS
// =============================================================================

const IMPORTANCE_VALUES: Record<string, number> = {
  medium: 1,
  high: 2,
  maximum: 3,
};

const DIFFICULTY_VALUES: Record<string, number> = {
  medium: 1,
  high: 2,
  maximum: 3,
};

const STREAK_THRESHOLD = 50;
const CONSISTENCY_THRESHOLD = 50;
const TREND_IMPROVING_THRESHOLD = 5;
const TREND_DECLINING_THRESHOLD = -10;

// =============================================================================
// DATE UTILITIES
// =============================================================================

export function formatDate(date: Date): string {
  // Use local date parts instead of UTC to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDate(date1) === formatDate(date2);
}

export function getDayOfWeek(date: Date): number {
  // Convert JS day (0=Sun) to our format (0=Mon, 6=Sun)
  return (date.getDay() + 6) % 7;
}

// =============================================================================
// TASK SCHEDULING
// =============================================================================

/**
 * Check if a task is scheduled for a specific date
 */
export function isTaskScheduledForDate(task: Task, date: Date): boolean {
  // Task can only be scheduled on or after its creation date
  if (task.createdAt) {
    const created = new Date(task.createdAt + 'T00:00:00');
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    if (check < created) return false;
  }
  const dayOfWeek = getDayOfWeek(date);
  return task.selectedDays.includes(dayOfWeek);
}

/**
 * Get all tasks scheduled for a specific date
 */
export function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter(task => isTaskScheduledForDate(task, date));
}

/**
 * Check if a task is completed (handles both checkbox and number types)
 * For number tasks: completed when value >= target (or > 0 if no target)
 */
export function isTaskCompleted(task: Task, completion?: TaskCompletion): boolean {
  if (!completion) return false;

  if (task.type === 'number') {
    const value = completion.value ?? 0;
    const target = task.target ?? 1; // Default to 1 if no target set
    return value >= target;
  }

  return completion.completed;
}

// =============================================================================
// WEIGHT & MULTIPLIER CALCULATIONS
// =============================================================================

/**
 * Calculate task weight based on importance and difficulty
 * Formula: (Importance × 2) + Difficulty
 * Range: 3 to 9 points
 */
export function calculateTaskWeight(task: Task): number {
  const importanceValue = IMPORTANCE_VALUES[task.importance] || 1;
  const difficultyValue = DIFFICULTY_VALUES[task.difficulty] || 1;
  return (importanceValue * 2) + difficultyValue;
}

/**
 * Get goal multiplier based on priority
 * Priority #1: 1.5x, #2: 1.3x, #3: 1.1x, #4+: 1.0x
 */
export function getGoalMultiplier(goalPriority: number): number {
  switch (goalPriority) {
    case 1: return 1.5;
    case 2: return 1.3;
    case 3: return 1.1;
    default: return 1.0;
  }
}

/**
 * Calculate points possible for a task
 */
export function calculateTaskPoints(task: Task): number {
  const weight = calculateTaskWeight(task);
  const multiplier = getGoalMultiplier(task.goalPriority);
  return weight * multiplier;
}

// =============================================================================
// DAILY SCORE CALCULATION
// =============================================================================

/**
 * Calculate daily score for a specific date
 */
export function calculateDailyScore(
  tasks: Task[],
  completions: TaskCompletion[],
  date: Date,
  index?: CompletionIndex
): DailyScore {
  const dateStr = formatDate(date);
  const scheduledTasks = getTasksForDate(tasks, date);

  if (scheduledTasks.length === 0) {
    return {
      date: dateStr,
      score: 0,
      pointsEarned: 0,
      pointsPossible: 0,
      tasksCompleted: 0,
      tasksScheduled: 0,
      isLocked: false,
    };
  }

  let totalPossible = 0;
  let totalEarned = 0;
  let completedCount = 0;

  for (const task of scheduledTasks) {
    const pointsPossible = calculateTaskPoints(task);
    totalPossible += pointsPossible;

    const completion = getCompletion(task.id, dateStr, index, completions);

    if (isTaskCompleted(task, completion)) {
      totalEarned += pointsPossible;
      completedCount++;
    }
  }

  const score = totalPossible > 0
    ? Math.round((totalEarned / totalPossible) * 100)
    : 0;

  return {
    date: dateStr,
    score,
    pointsEarned: totalEarned,
    pointsPossible: totalPossible,
    tasksCompleted: completedCount,
    tasksScheduled: scheduledTasks.length,
    isLocked: false,
  };
}

/**
 * Calculate daily scores for a date range
 */
export function calculateDailyScoresForRange(
  tasks: Task[],
  completions: TaskCompletion[],
  startDate: Date,
  endDate: Date,
  index?: CompletionIndex
): DailyScore[] {
  const idx = index ?? buildCompletionIndex(completions);
  const scores: DailyScore[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    scores.push(calculateDailyScore(tasks, completions, current, idx));
    current.setDate(current.getDate() + 1);
  }

  return scores;
}

// =============================================================================
// PERIOD SCORE CALCULATIONS (WEEKLY/MONTHLY)
// =============================================================================

/**
 * Calculate score for a period using total points method
 */
export function calculatePeriodScore(dailyScores: DailyScore[]): number {
  const daysWithTasks = dailyScores.filter(d => d.tasksScheduled > 0);

  if (daysWithTasks.length === 0) return 0;

  const totalEarned = daysWithTasks.reduce((sum, d) => sum + d.pointsEarned, 0);
  const totalPossible = daysWithTasks.reduce((sum, d) => sum + d.pointsPossible, 0);

  if (totalPossible === 0) return 0;

  return Math.round((totalEarned / totalPossible) * 100);
}

/**
 * Get start of week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of month for a given date
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Calculate weekly score
 */
export function calculateWeeklyScore(
  tasks: Task[],
  completions: TaskCompletion[],
  weekStartDate: Date
): number {
  const weekEnd = addDays(weekStartDate, 6);
  const dailyScores = calculateDailyScoresForRange(tasks, completions, weekStartDate, weekEnd);
  return calculatePeriodScore(dailyScores);
}

/**
 * Calculate monthly score
 */
export function calculateMonthlyScore(
  tasks: Task[],
  completions: TaskCompletion[],
  year: number,
  month: number
): number {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const dailyScores = calculateDailyScoresForRange(tasks, completions, monthStart, monthEnd);
  return calculatePeriodScore(dailyScores);
}

// =============================================================================
// STREAK CALCULATION
// =============================================================================

/**
 * Calculate current and longest streak
 */
export function calculateStreak(dailyScores: DailyScore[]): {
  currentStreak: number;
  longestStreak: number;
} {
  // Filter to days with tasks and sort descending
  const sorted = [...dailyScores]
    .filter(d => d.tasksScheduled > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate current streak (counting back from most recent)
  let currentStreak = 0;
  for (const day of sorted) {
    if (day.score >= STREAK_THRESHOLD) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak (scan all history)
  let longestStreak = 0;
  let tempStreak = 0;

  const ascending = [...sorted].reverse();

  for (const day of ascending) {
    if (day.score >= STREAK_THRESHOLD) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculate the streak as of a specific date.
 * Counts consecutive days (ending on `asOfDate`) where score >= STREAK_THRESHOLD.
 */
export function calculateStreakAsOfDate(
  tasks: Task[],
  completions: TaskCompletion[],
  asOfDate: Date,
  index?: CompletionIndex
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(asOfDate);
  checkDate.setHours(0, 0, 0, 0);

  // Future dates have no streak
  if (checkDate > today) return 0;

  const idx = index ?? buildCompletionIndex(completions);

  // Walk backwards from asOfDate counting consecutive qualifying days
  let streak = 0;
  const d = new Date(checkDate);

  while (true) {
    const score = calculateDailyScore(tasks, completions, d, idx);
    // Skip days with no scheduled tasks (don't break streak, don't count)
    if (score.tasksScheduled === 0) {
      d.setDate(d.getDate() - 1);
      // Safety: don't go back more than 400 days
      if (checkDate.getTime() - d.getTime() > 400 * 24 * 60 * 60 * 1000) break;
      continue;
    }
    if (score.score >= STREAK_THRESHOLD) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// =============================================================================
// CONSISTENCY CALCULATION
// =============================================================================

/**
 * Calculate consistency percentage
 * = (Days with score ≥ 50) / (Days with scheduled tasks) × 100
 */
export function calculateConsistency(dailyScores: DailyScore[]): number {
  const daysWithTasks = dailyScores.filter(d => d.tasksScheduled > 0);

  if (daysWithTasks.length === 0) return 0;

  const daysAboveThreshold = daysWithTasks.filter(
    d => d.score >= CONSISTENCY_THRESHOLD
  ).length;

  return Math.round((daysAboveThreshold / daysWithTasks.length) * 100);
}

// =============================================================================
// COMPLETION PERCENTAGE
// =============================================================================

/**
 * Calculate raw completion percentage (unweighted)
 */
export function calculateCompletion(dailyScores: DailyScore[]): number {
  const totalCompleted = dailyScores.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const totalScheduled = dailyScores.reduce((sum, d) => sum + d.tasksScheduled, 0);

  if (totalScheduled === 0) return 0;

  return Math.round((totalCompleted / totalScheduled) * 100);
}

// =============================================================================
// GOAL PROBABILITY
// =============================================================================

/**
 * Calculate goal probability based on task rate and time pressure
 */
export function calculateGoalProbability(
  goal: Goal,
  tasks: Task[],
  completions: TaskCompletion[],
  today: Date = new Date(),
  index?: CompletionIndex
): number {
  const goalTasks = tasks.filter(t => t.goalId === goal.id);

  if (goalTasks.length === 0) return 50;

  const idx = index ?? buildCompletionIndex(completions);

  // Calculate expected and actual completions
  let expectedCompletions = 0;
  let actualCompletions = 0;

  const startDate = new Date(goal.createdAt);
  const currentDate = new Date(startDate);

  while (currentDate <= today) {
    for (const task of goalTasks) {
      if (isTaskScheduledForDate(task, currentDate)) {
        expectedCompletions++;

        const dateStr = formatDate(currentDate);
        const completion = getCompletion(task.id, dateStr, idx);

        if (isTaskCompleted(task, completion)) {
          actualCompletions++;
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (expectedCompletions === 0) return 50;

  // Step 1: Task rate
  const taskRate = (actualCompletions / expectedCompletions) * 100;

  // Step 2: Time elapsed
  const totalDuration = goal.targetDate.getTime() - goal.createdAt.getTime();
  const elapsedDuration = today.getTime() - goal.createdAt.getTime();
  const timeElapsed = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));

  // Step 3: Pace bonus (capped at ±15)
  const paceDifference = taskRate - timeElapsed;
  const paceBonus = Math.max(-15, Math.min(15, paceDifference * 0.15));

  // Step 4: Raw probability
  let probability = taskRate + paceBonus;

  // Step 5: Apply time-gated caps
  let maxCap: number;
  if (timeElapsed < 25) {
    maxCap = 80;
  } else if (timeElapsed < 50) {
    maxCap = 90;
  } else if (timeElapsed < 75) {
    maxCap = 95;
  } else {
    maxCap = 99;
  }

  // Apply caps
  probability = Math.max(5, Math.min(maxCap, probability));

  return Math.round(probability);
}

// =============================================================================
// TREND DETECTION
// =============================================================================

/**
 * Calculate trend based on score difference
 */
export function calculateTrend(currentScore: number, previousScore: number): Trend {
  const difference = currentScore - previousScore;

  if (difference > TREND_IMPROVING_THRESHOLD) return 'improving';
  if (difference < TREND_DECLINING_THRESHOLD) return 'declining';
  return 'stable';
}

// =============================================================================
// LATE LOGGING
// =============================================================================

/**
 * Check if a date can be edited and whether it's a late log
 * TEST MODE: Allow editing up to 30 days back for testing
 */
export function canEditDate(targetDate: Date, now: Date = new Date()): {
  canEdit: boolean;
  isLateLog: boolean;
} {
  const targetDay = startOfDay(targetDate);
  const today = startOfDay(now);
  const yesterday = startOfDay(addDays(today, -1));

  // Can't edit future dates
  if (targetDay > today) {
    return { canEdit: false, isLateLog: false };
  }

  // Today is not a late log
  if (isSameDay(targetDay, today)) {
    return { canEdit: true, isLateLog: false };
  }

  // Yesterday is allowed but marked as late log
  if (isSameDay(targetDay, yesterday)) {
    return { canEdit: true, isLateLog: true };
  }

  // Anything older than yesterday is not editable
  return { canEdit: false, isLateLog: false };
}

// =============================================================================
// PERFECT DAY
// =============================================================================

/**
 * Check if a day is a perfect day (all tasks completed)
 */
export function isPerfectDay(dailyScore: DailyScore): boolean {
  return dailyScore.tasksScheduled > 0 &&
         dailyScore.tasksCompleted === dailyScore.tasksScheduled;
}

/**
 * Count perfect days in a range
 */
export function countPerfectDays(dailyScores: DailyScore[]): number {
  return dailyScores.filter(isPerfectDay).length;
}

// =============================================================================
// COMPARISONS
// =============================================================================

/**
 * Calculate comparison between two scores
 */
export function calculateComparison(
  currentScore: number,
  comparisonScore: number
): { value: number; direction: 'up' | 'down' } {
  const difference = currentScore - comparisonScore;
  return {
    value: Math.abs(Math.round(difference)),
    direction: difference >= 0 ? 'up' : 'down',
  };
}

/**
 * Calculate all-time average score
 */
export function calculateAllTimeAverage(dailyScores: DailyScore[]): number {
  const daysWithTasks = dailyScores.filter(d => d.tasksScheduled > 0);
  if (daysWithTasks.length === 0) return 0;

  const sum = daysWithTasks.reduce((acc, d) => acc + d.score, 0);
  return Math.round(sum / daysWithTasks.length);
}

// =============================================================================
// AGGREGATE STATS
// =============================================================================

export interface AggregateStats {
  score: number;
  completion: number;
  consistency: number;
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  trend: Trend;
  tasksCompleted: number;
  tasksScheduled: number;
}

/**
 * Calculate all aggregate stats for a period
 */
export function calculateAggregateStats(
  dailyScores: DailyScore[],
  previousPeriodScore?: number
): AggregateStats {
  const score = calculatePeriodScore(dailyScores);
  const completion = calculateCompletion(dailyScores);
  const consistency = calculateConsistency(dailyScores);
  const { currentStreak, longestStreak } = calculateStreak(dailyScores);
  const perfectDays = countPerfectDays(dailyScores);
  const trend = previousPeriodScore !== undefined
    ? calculateTrend(score, previousPeriodScore)
    : 'stable';

  const tasksCompleted = dailyScores.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const tasksScheduled = dailyScores.reduce((sum, d) => sum + d.tasksScheduled, 0);

  return {
    score,
    completion,
    consistency,
    currentStreak,
    longestStreak,
    perfectDays,
    trend,
    tasksCompleted,
    tasksScheduled,
  };
}
