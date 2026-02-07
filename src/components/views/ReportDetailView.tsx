'use client';

import { useMemo, useId } from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useTasks, Task } from '@/contexts/TaskContext';
import { useGoals } from '@/contexts/GoalContext';
import * as calc from '@/shared';
import { getTierByPercentage, colors, spacing, borderRadius, getGoalColor } from '@/shared';

type ReportType = 'daily' | 'weekly' | 'monthly';

interface TaskItem {
  name: string;
  importance: string;
  difficulty: string;
  completed: boolean;
  goalPriority: number;
}

interface ReportDetailViewProps {
  reportId: string;
  onBack?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IMPORTANCE_LABEL: Record<string, string> = { medium: 'Moderate', high: 'High', maximum: 'Maximum' };
const DIFFICULTY_LABEL: Record<string, string> = { medium: 'Moderate', high: 'Hard', maximum: 'Maximum' };

function parseReportId(reportId: string): { type: ReportType; id: string } {
  if (reportId.startsWith('d-')) return { type: 'daily', id: reportId };
  if (reportId.startsWith('w-')) return { type: 'weekly', id: reportId };
  return { type: 'monthly', id: reportId };
}

function parseDateRange(reportType: ReportType, reportId: string): { start: Date; end: Date } {
  if (reportType === 'daily') {
    const dateStr = reportId.replace('d-', '');
    const d = new Date(dateStr + 'T00:00:00');
    return { start: d, end: d };
  } else if (reportType === 'weekly') {
    const dateStr = reportId.replace('w-', '');
    const start = new Date(dateStr + 'T00:00:00');
    const end = calc.addDays(start, 6);
    return { start, end };
  } else {
    const parts = reportId.replace('m-', '').split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end };
  }
}

function buildDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function taskExistedOnDate(task: Task, date: Date): boolean {
  if (!task.createdAt) return true;
  const created = new Date(task.createdAt + 'T00:00:00');
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return check >= created;
}

function getGroupRate(
  taskGroup: Task[],
  dates: Date[],
  completionIdx: calc.CompletionIndex,
): number {
  if (taskGroup.length === 0) return 0;
  let scheduled = 0;
  let completed = 0;
  for (const date of dates) {
    const dateStr = calc.formatDate(date);
    const dayOfWeek = (date.getDay() + 6) % 7;
    for (const task of taskGroup) {
      if (task.selectedDays.includes(dayOfWeek) && taskExistedOnDate(task, date)) {
        scheduled++;
        const comp = completionIdx.get(`${task.id}:${dateStr}`);
        if (task.type === 'number') {
          if ((comp?.value ?? 0) >= (task.target ?? 1)) completed++;
        } else {
          if (comp?.completed) completed++;
        }
      }
    }
  }
  return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
}

interface TaskRate {
  name: string;
  completed: number;
  total: number;
  rate: number;
}

function filterTrackedDates(
  dates: Date[],
  tasks: Task[],
  completionIdx: calc.CompletionIndex,
): Date[] {
  return dates.filter(date => {
    const dateStr = calc.formatDate(date);
    return tasks.some(t => completionIdx.has(`${t.id}:${dateStr}`));
  });
}

function computeTaskRates(
  tasks: Task[],
  dates: Date[],
  completionIdx: calc.CompletionIndex,
): TaskRate[] {
  const rates: TaskRate[] = [];
  for (const task of tasks) {
    let scheduled = 0;
    let completed = 0;
    for (const date of dates) {
      const dayOfWeek = (date.getDay() + 6) % 7;
      if (task.selectedDays.includes(dayOfWeek) && taskExistedOnDate(task, date)) {
        scheduled++;
        const dateStr = calc.formatDate(date);
        const comp = completionIdx.get(`${task.id}:${dateStr}`);
        if (task.type === 'number') {
          if ((comp?.value ?? 0) >= (task.target ?? 1)) completed++;
        } else {
          if (comp?.completed) completed++;
        }
      }
    }
    if (scheduled > 0) {
      rates.push({ name: task.name, completed, total: scheduled, rate: completed / scheduled });
    }
  }
  rates.sort((a, b) => b.rate - a.rate);
  return rates;
}

function formatMetricValue(val: number): string {
  if (val >= 10000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 1000) return val.toLocaleString();
  return String(val);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReportDetailView({ reportId, onBack }: ReportDetailViewProps) {
  const stats = useStats();
  const { tasks } = useTasks();
  const { goals } = useGoals();

  const { type } = parseReportId(reportId);

  const data = useMemo(() => {
    if (!reportId) return null;
    const { type: reportType, id } = parseReportId(reportId);
    const { start, end } = parseDateRange(reportType, id);
    const dates = buildDates(start, end);
    const completionIdx = stats.completionIndex;

    const dailyScores = dates.map(d => stats.getDailyScore(d));
    const daysWithTasks = dailyScores.filter(d => d.tasksScheduled > 0);

    const score = calc.calculatePeriodScore(dailyScores);
    const completion = calc.calculateCompletion(dailyScores);
    const consistency = calc.calculateConsistency(dailyScores);
    const { longestStreak } = calc.calculateStreak(dailyScores);
    const perfectDayCount = calc.countPerfectDays(dailyScores);
    const totalCompleted = daysWithTasks.reduce((s, d) => s + d.tasksCompleted, 0);
    const totalScheduled = daysWithTasks.reduce((s, d) => s + d.tasksScheduled, 0);
    const daysActive = daysWithTasks.length;

    // Breakdowns
    const byImportance = {
      maximum: getGroupRate(tasks.filter(t => t.importance === 'maximum'), dates, completionIdx),
      high: getGroupRate(tasks.filter(t => t.importance === 'high'), dates, completionIdx),
      moderate: getGroupRate(tasks.filter(t => t.importance === 'medium'), dates, completionIdx),
    };
    const byDifficulty = {
      maximum: getGroupRate(tasks.filter(t => t.difficulty === 'maximum'), dates, completionIdx),
      high: getGroupRate(tasks.filter(t => t.difficulty === 'high'), dates, completionIdx),
      moderate: getGroupRate(tasks.filter(t => t.difficulty === 'medium'), dates, completionIdx),
    };
    const goalMap = new Map<number, string>();
    goals.forEach(g => goalMap.set(g.id, g.name));
    const goalIds = [...new Set(tasks.map(t => t.goalId))];
    const byGoal = goalIds.map(gid => ({
      name: goalMap.get(gid) || 'Foundations',
      percent: getGroupRate(tasks.filter(t => t.goalId === gid), dates, completionIdx),
    })).filter(g => g.percent > 0 || tasks.some(t => t.goalId !== 0));

    const numericTasks = tasks.filter(t => t.type === 'number');

    // All-time scores for ranking & day-of-week analysis
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allTimeStart = calc.addDays(today, -364);
    const allTimeDates = buildDates(allTimeStart, today);
    const allTimeDailyScores = allTimeDates.map(d => stats.getDailyScore(d));
    const allTimeAvg = calc.calculateAllTimeAverage(allTimeDailyScores);

    // Day-of-week averages
    const dowSums = Array(7).fill(0);
    const dowCounts = Array(7).fill(0);
    for (const ds of allTimeDailyScores) {
      if (ds.tasksScheduled > 0) {
        const d = calc.parseDate(ds.date);
        const dow = (d.getDay() + 6) % 7;
        dowSums[dow] += ds.score;
        dowCounts[dow]++;
      }
    }
    const dowAvgs = dowSums.map((s, i) => dowCounts[i] > 0 ? Math.round(s / dowCounts[i]) : 0);
    const strongestDowIdx = dowAvgs.reduce((best, v, i) => v > dowAvgs[best] ? i : best, 0);
    const weakestDowIdx = dowAvgs.reduce((worst, v, i) => (v < dowAvgs[worst] && dowCounts[i] > 0) ? i : worst, 0);

    if (reportType === 'daily') {
      const ds = dailyScores[0];
      const dateObj = start;

      const yesterday = calc.addDays(dateObj, -1);
      const yesterdayScore = stats.getDailyScore(yesterday);
      const hasYesterdayData = yesterdayScore.tasksScheduled > 0;

      const weekStart = calc.getWeekStart(dateObj);
      const weekEnd = calc.addDays(weekStart, 6);
      const weekScores = buildDates(weekStart, weekEnd).map(d => stats.getDailyScore(d));
      // Check if there's any data BEFORE today in this week
      const weekScoresBeforeToday = buildDates(weekStart, calc.addDays(dateObj, -1)).map(d => stats.getDailyScore(d));
      const hasWeekHistoricalData = weekScoresBeforeToday.some(d => d.tasksScheduled > 0);
      const weekAvg = calc.calculatePeriodScore(weekScores);

      const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
      const monthScores = buildDates(monthStart, monthEnd).map(d => stats.getDailyScore(d));
      // Check if there's any data BEFORE today in this month
      const monthScoresBeforeToday = buildDates(monthStart, calc.addDays(dateObj, -1)).map(d => stats.getDailyScore(d));
      const hasMonthHistoricalData = monthScoresBeforeToday.some(d => d.tasksScheduled > 0);
      const monthAvg = calc.calculatePeriodScore(monthScores);

      // Only count days BEFORE today for ranking (today isn't complete yet)
      const reportDateStr = calc.formatDate(dateObj);
      const historicalScores = allTimeDailyScores
        .filter(d => d.tasksScheduled > 0 && d.date < reportDateStr)
        .map(d => d.score)
        .sort((a, b) => b - a);
      const dayRank = historicalScores.length > 0
        ? historicalScores.findIndex(s => s <= ds.score) + 1
        : 0;

      const streakAsOf = calc.calculateStreakAsOfDate(
        tasks.map(t => ({ ...t, goalPriority: t.goalPriority ?? 99 })),
        stats.completions,
        dateObj,
        completionIdx,
      );

      const scheduledTasks = calc.getTasksForDate(
        tasks.map(t => ({ ...t, goalPriority: t.goalPriority ?? 99 })),
        dateObj,
      );
      const dateStr = calc.formatDate(dateObj);
      const taskItems: TaskItem[] = scheduledTasks.map(t => {
        const comp = completionIdx.get(`${t.id}:${dateStr}`);
        const isComplete = t.type === 'number'
          ? (comp?.value ?? 0) >= (t.target ?? 1)
          : (comp?.completed ?? false);
        const goal = goals.find(g => g.id === t.goalId);
        return {
          name: t.name,
          importance: IMPORTANCE_LABEL[t.importance] || t.importance,
          difficulty: DIFFICULTY_LABEL[t.difficulty] || t.difficulty,
          completed: isComplete,
          goalPriority: goal?.priority ?? 99,
        };
      });

      const dailyMetrics = numericTasks
        .filter(t => calc.isTaskScheduledForDate({ ...t, goalPriority: t.goalPriority ?? 99 }, dateObj))
        .map(t => {
          const comp = completionIdx.get(`${t.id}:${dateStr}`);
          const value = comp?.value ?? 0;
          const target = t.target ?? 0;
          const hit = target > 0 && value >= target;
          return {
            name: t.name,
            value: formatMetricValue(value),
            target: target > 0 ? formatMetricValue(target) : null,
            hit,
          };
        })
        .filter(m => m.value !== '0');

      const dow = (dateObj.getDay() + 6) % 7;
      const dayName = DAY_NAMES[dow];
      const monthName = MONTH_NAMES[dateObj.getMonth()];

      return {
        title: 'Daily Report',
        subtitle: `${dayName}, ${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()}`,
        headerTitle: `${dayName}, ${monthName} ${dateObj.getDate()}`,
        score: ds.score,
        tasksCompleted: ds.tasksCompleted,
        totalTasks: ds.tasksScheduled,
        streak: streakAsOf,
        comparisons: {
          vsYesterday: calc.calculateComparison(ds.score, yesterdayScore.score, hasYesterdayData),
          vsWeekAvg: calc.calculateComparison(ds.score, weekAvg, hasWeekHistoricalData),
          vsMonthAvg: calc.calculateComparison(ds.score, monthAvg, hasMonthHistoricalData),
          dayRank: historicalScores.length > 0 ? { rank: dayRank || 1, total: historicalScores.length + 1 } : null,
        },
        tasks: taskItems,
        breakdowns: { byImportance, byDifficulty, byGoal },
        metrics: dailyMetrics,
      };
    }

    if (reportType === 'weekly') {
      const weekStart = start;
      const weekEnd = end;

      const prevWeekStart = calc.addDays(weekStart, -7);
      const prevWeekEnd = calc.addDays(weekStart, -1);
      const prevWeekScores = buildDates(prevWeekStart, prevWeekEnd).map(d => stats.getDailyScore(d));
      const hasPrevWeekData = prevWeekScores.some(d => d.tasksScheduled > 0);
      const prevWeekScore = calc.calculatePeriodScore(prevWeekScores);

      const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
      const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
      const monthScores = buildDates(monthStart, monthEnd).map(d => stats.getDailyScore(d));
      // Check for data before this week in the month
      const monthScoresBeforeWeek = buildDates(monthStart, calc.addDays(weekStart, -1)).map(d => stats.getDailyScore(d));
      const hasMonthHistoricalData = monthScoresBeforeWeek.some(d => d.tasksScheduled > 0);
      const monthAvg = calc.calculatePeriodScore(monthScores);

      const weekScoresList: number[] = [];
      let ws = calc.getWeekStart(today);
      for (let i = 0; i < 52; i++) {
        const we = calc.addDays(ws, 6);
        const scores = buildDates(ws, we).map(d => stats.getDailyScore(d));
        const s = calc.calculatePeriodScore(scores);
        if (scores.some(d => d.tasksScheduled > 0)) weekScoresList.push(s);
        ws = calc.addDays(ws, -7);
      }
      weekScoresList.sort((a, b) => b - a);
      const weekRank = weekScoresList.findIndex(s => s <= score) + 1;

      const weekDailyGrid = DAY_SHORT.map((dayLabel, i) => {
        const dayDate = calc.addDays(weekStart, i);
        const ds = stats.getDailyScore(dayDate);
        return { day: dayLabel, score: ds.tasksScheduled > 0 ? ds.score : 0 };
      });

      const activeDays2 = dailyScores.filter(d => d.tasksScheduled > 0);
      const bestDay = activeDays2.reduce((best, d) => d.score > best.score ? d : best, activeDays2[0] || { date: calc.formatDate(weekStart), score: 0 });
      const lowestDay = activeDays2.reduce((worst, d) => d.score < worst.score ? d : worst, activeDays2[0] || { date: calc.formatDate(weekStart), score: 0 });
      const bestDayDate = calc.parseDate(bestDay.date);
      const lowestDayDate = calc.parseDate(lowestDay.date);

      const streakAsOf = calc.calculateStreakAsOfDate(
        tasks.map(t => ({ ...t, goalPriority: t.goalPriority ?? 99 })),
        stats.completions,
        weekEnd,
        completionIdx,
      );

      const taskRates = computeTaskRates(tasks, dates, completionIdx);
      const prevDatesRaw = buildDates(prevWeekStart, prevWeekEnd);
      const prevDatesTracked = filterTrackedDates(prevDatesRaw, tasks, completionIdx);
      const prevTaskRates = computeTaskRates(tasks, prevDatesTracked, completionIdx);
      const prevHadCompletions = prevDatesTracked.length > 0 && prevTaskRates.some(r => r.completed > 0);
      const prevRateMap = new Map(prevTaskRates.map(r => [r.name, r.rate]));

      let mostImproved: { name: string; change: number } | undefined;
      let mostDeclined: { name: string; change: number } | undefined;

      if (prevHadCompletions) {
        const improvements = taskRates.map(r => ({
          name: r.name,
          change: Math.round((r.rate - (prevRateMap.get(r.name) ?? r.rate)) * 100),
        })).filter(r => r.change !== 0);
        improvements.sort((a, b) => b.change - a.change);
        mostImproved = improvements.find(r => r.change > 0);
        mostDeclined = improvements.find(r => r.change < 0);
      }

      const topTask = taskRates[0];
      const bottomTask = taskRates[taskRates.length - 1];

      const weekMetrics = numericTasks.map(t => {
        let sum = 0;
        let count = 0;
        for (const d of dates) {
          const comp = completionIdx.get(`${t.id}:${calc.formatDate(d)}`);
          if (comp?.value) { sum += comp.value; count++; }
        }
        const avg = count > 0 ? Math.round(sum / count) : 0;
        return { name: t.name, avg: formatMetricValue(avg), total: formatMetricValue(sum) };
      }).filter(m => m.total !== '0');

      const startMonth = MONTH_SHORT[weekStart.getMonth()];
      const endMonth = MONTH_SHORT[weekEnd.getMonth()];
      const subtitle = startMonth === endMonth
        ? `${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
        : `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      const jan1 = new Date(weekStart.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((weekStart.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7);

      return {
        title: 'Weekly Report',
        subtitle,
        headerTitle: `Week ${weekNum} · ${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}`,
        score,
        completion,
        consistency,
        daysActive,
        streak: streakAsOf,
        perfectDays: perfectDayCount,
        tasksCompleted: totalCompleted,
        totalTasks: totalScheduled,
        comparisons: {
          vsLastWeek: calc.calculateComparison(score, prevWeekScore, hasPrevWeekData),
          vsLastMonth: calc.calculateComparison(score, monthAvg, hasMonthHistoricalData),
          vsAllTime: calc.calculateComparison(score, allTimeAvg, allTimeAvg > 0 && hasPrevWeekData),
          weekRank: weekScoresList.length > 1 ? { rank: weekRank || 1, total: weekScoresList.length } : null,
        },
        dailyScores: weekDailyGrid,
        dayPerformance: {
          best: { day: DAY_NAMES[(bestDayDate.getDay() + 6) % 7], score: bestDay.score },
          lowest: { day: DAY_NAMES[(lowestDayDate.getDay() + 6) % 7], score: lowestDay.score },
          strongestAllTime: { day: DAY_NAMES[strongestDowIdx], score: dowAvgs[strongestDowIdx] },
          weakestAllTime: { day: DAY_NAMES[weakestDowIdx], score: dowAvgs[weakestDowIdx] },
        },
        breakdowns: { byImportance, byDifficulty, byGoal },
        taskHighlights: {
          highest: { name: topTask?.name || '—', value: topTask ? `${topTask.completed}/${topTask.total}` : '—' },
          lowest: { name: bottomTask?.name || '—', value: bottomTask ? `${bottomTask.completed}/${bottomTask.total}` : '—' },
          mostImproved: { name: mostImproved?.name || '—', change: mostImproved ? `${Math.abs(mostImproved.change)}%` : '0%' },
          mostDeclined: { name: mostDeclined?.name || '—', change: mostDeclined ? `${Math.abs(mostDeclined.change)}%` : '0%' },
        },
        metrics: weekMetrics,
      };
    }

    // ─── Monthly ─────────────────────────────────────────────────────────────────
    const monthStart = start;
    const monthEnd = end;
    const totalDays = monthEnd.getDate();

    const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);
    const prevMonthScores = buildDates(prevMonthStart, prevMonthEnd).map(d => stats.getDailyScore(d));
    const hasPrevMonthData = prevMonthScores.some(d => d.tasksScheduled > 0);
    const prevMonthScore = calc.calculatePeriodScore(prevMonthScores);

    const monthScoresList: number[] = [];
    let my = today.getFullYear();
    let mm = today.getMonth();
    for (let i = 0; i < 24; i++) {
      const ms = new Date(my, mm, 1);
      const me = new Date(my, mm + 1, 0);
      const scores = buildDates(ms, me).map(d => stats.getDailyScore(d));
      const s = calc.calculatePeriodScore(scores);
      if (scores.some(d => d.tasksScheduled > 0)) monthScoresList.push(s);
      mm--;
      if (mm < 0) { mm = 11; my--; }
    }
    monthScoresList.sort((a, b) => b - a);
    const monthRank = monthScoresList.findIndex(s => s <= score) + 1;

    let bestWeekScore = 0;
    let bestWeekNum = 1;
    let weekIdx = 1;
    let wStart2 = new Date(monthStart);
    while (wStart2 <= monthEnd) {
      const wEnd2 = calc.addDays(wStart2, 6) > monthEnd ? monthEnd : calc.addDays(wStart2, 6);
      const ws2 = buildDates(wStart2, wEnd2).map(d => stats.getDailyScore(d));
      const wsScore = calc.calculatePeriodScore(ws2);
      if (wsScore > bestWeekScore) { bestWeekScore = wsScore; bestWeekNum = weekIdx; }
      wStart2 = calc.addDays(wEnd2, 1);
      weekIdx++;
    }

    const calendarStartDay = (monthStart.getDay() + 6) % 7;
    const calendarScores = dailyScores.map(ds => ds.tasksScheduled > 0 ? ds.score : 0);

    const activeDaysM = dailyScores.filter(d => d.tasksScheduled > 0);
    const bestDayM = activeDaysM.reduce((best, d) => d.score > best.score ? d : best, activeDaysM[0] || { date: calc.formatDate(monthStart), score: 0 });
    const lowestDayM = activeDaysM.reduce((worst, d) => d.score < worst.score ? d : worst, activeDaysM[0] || { date: calc.formatDate(monthStart), score: 0 });
    const bestDayDateM = calc.parseDate(bestDayM.date);
    const lowestDayDateM = calc.parseDate(lowestDayM.date);

    const effectiveEnd = monthEnd > today ? today : monthEnd;
    const streakAsOf = calc.calculateStreakAsOfDate(
      tasks.map(t => ({ ...t, goalPriority: t.goalPriority ?? 99 })),
      stats.completions,
      effectiveEnd,
      completionIdx,
    );

    const taskRates = computeTaskRates(tasks, dates, completionIdx);
    const prevDatesRaw = buildDates(prevMonthStart, prevMonthEnd);
    const prevDatesTracked = filterTrackedDates(prevDatesRaw, tasks, completionIdx);
    const prevTaskRates = computeTaskRates(tasks, prevDatesTracked, completionIdx);
    const prevHadCompletions = prevDatesTracked.length > 0 && prevTaskRates.some(r => r.completed > 0);
    const prevRateMap = new Map(prevTaskRates.map(r => [r.name, r.rate]));

    let mostImproved: { name: string; change: number } | undefined;
    let mostDeclined: { name: string; change: number } | undefined;

    if (prevHadCompletions) {
      const improvements = taskRates.map(r => ({
        name: r.name,
        change: Math.round((r.rate - (prevRateMap.get(r.name) ?? r.rate)) * 100),
      })).filter(r => r.change !== 0);
      improvements.sort((a, b) => b.change - a.change);
      mostImproved = improvements.find(r => r.change > 0);
      mostDeclined = improvements.find(r => r.change < 0);
    }

    const topTask = taskRates[0];
    const bottomTask = taskRates[taskRates.length - 1];

    const monthMetrics = numericTasks.map(t => {
      let sum = 0;
      let count = 0;
      for (const d of dates) {
        const comp = completionIdx.get(`${t.id}:${calc.formatDate(d)}`);
        if (comp?.value) { sum += comp.value; count++; }
      }
      const avg = count > 0 ? Math.round(sum / count) : 0;
      return { name: t.name, avg: formatMetricValue(avg), total: formatMetricValue(sum) };
    }).filter(m => m.total !== '0');

    const monthName = MONTH_NAMES[monthStart.getMonth()];

    return {
      title: 'Monthly Report',
      subtitle: `${monthName} ${monthStart.getFullYear()}`,
      headerTitle: `${monthName} ${monthStart.getFullYear()}`,
      score,
      completion,
      consistency,
      daysActive,
      totalDays,
      streak: streakAsOf,
      perfectDays: perfectDayCount,
      tasksCompleted: totalCompleted,
      totalTasks: totalScheduled,
      comparisons: {
        vsLastMonth: calc.calculateComparison(score, prevMonthScore, hasPrevMonthData),
        vsAllTime: calc.calculateComparison(score, allTimeAvg, allTimeAvg > 0 && hasPrevMonthData),
        bestWeek: { week: `W${bestWeekNum}`, score: bestWeekScore },
        monthRank: monthScoresList.length > 1 ? { rank: monthRank || 1, total: monthScoresList.length } : null,
      },
      calendarStartDay,
      calendarScores,
      dayPerformance: {
        best: { day: `${MONTH_SHORT[bestDayDateM.getMonth()]} ${bestDayDateM.getDate()}`, score: bestDayM.score },
        lowest: { day: `${MONTH_SHORT[lowestDayDateM.getMonth()]} ${lowestDayDateM.getDate()}`, score: lowestDayM.score },
        strongestAllTime: { day: DAY_NAMES[strongestDowIdx], score: dowAvgs[strongestDowIdx] },
        weakestAllTime: { day: DAY_NAMES[weakestDowIdx], score: dowAvgs[weakestDowIdx] },
      },
      breakdowns: { byImportance, byDifficulty, byGoal },
      taskHighlights: {
        highest: { name: topTask?.name || '—', value: topTask ? `${topTask.completed}/${topTask.total}` : '—' },
        lowest: { name: bottomTask?.name || '—', value: bottomTask ? `${bottomTask.completed}/${bottomTask.total}` : '—' },
        mostImproved: { name: mostImproved?.name || '—', change: mostImproved ? `${Math.abs(mostImproved.change)}%` : '0%' },
        mostDeclined: { name: mostDeclined?.name || '—', change: mostDeclined ? `${Math.abs(mostDeclined.change)}%` : '0%' },
      },
      metrics: monthMetrics,
    };
  }, [reportId, stats, tasks, goals]);

  // ─── Progress Ring (SVG) ────────────────────────────────────────────────────

  const ProgressRing = ({
    percent,
    size,
    strokeWidth,
    showValue = true,
    labelInside,
    customValue,
  }: {
    percent: number;
    size: number;
    strokeWidth: number;
    showValue?: boolean;
    labelInside?: string;
    customValue?: string | number;
  }) => {
    const tier = getTierByPercentage(percent);
    const color = tier.main;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = percent <= 0 ? circumference : circumference - (percent / 100) * circumference;

    const isLargeRing = size >= 140;
    const valueFontSize = isLargeRing ? 42 : (size >= 70 ? 18 : 13);
    const displayValue = customValue !== undefined ? customValue : percent;

    const padding = 24;
    const canvasSize = size + padding;

    const uniqueId = useId();
    const filterId = `ring-glow${uniqueId.replace(/:/g, '')}`;

    return (
      <div style={{ position: 'relative', width: canvasSize, height: canvasSize }}>
        <svg width={canvasSize} height={canvasSize} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx={canvasSize / 2}
            cy={canvasSize / 2}
            r={radius}
            fill="none"
            stroke={colors.track}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          {percent > 0 && (
            <>
              {/* Glow layer */}
              <circle
                cx={canvasSize / 2}
                cy={canvasSize / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                filter={`url(#${filterId})`}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  transition: 'stroke-dashoffset 0.8s ease-out',
                }}
              />
              {/* Main arc */}
              <circle
                cx={canvasSize / 2}
                cy={canvasSize / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  transition: 'stroke-dashoffset 0.8s ease-out',
                }}
              />
            </>
          )}
        </svg>
        {(showValue || labelInside) && (
          <div style={{
            position: 'absolute',
            width: canvasSize,
            height: canvasSize,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            top: 0,
            left: 0,
          }}>
            {showValue && (
              <span style={{
                fontSize: valueFontSize,
                fontWeight: 700,
                color: colors.textPrimary,
              }}>{displayValue}</span>
            )}
            {labelInside && (
              <span style={{
                fontSize: isLargeRing ? 12 : 10,
                fontWeight: 600,
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginTop: isLargeRing ? 4 : 2,
              }}>{labelInside}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderProgressBar = (percent: number) => {
    const tierColor = getTierByPercentage(percent);
    return (
      <div style={st.progressBarTrack}>
        <div style={{
          ...st.progressBarFill,
          width: `${percent}%`,
          backgroundColor: tierColor.main,
          boxShadow: `0 0 8px ${tierColor.main}66`,
        }} />
      </div>
    );
  };

  const renderTrendPill = (value: string | number, direction?: 'up' | 'down', isRank?: boolean, total?: number) => {
    const tier = direction === 'up' || isRank ? getTierByPercentage(90) : getTierByPercentage(40);
    return (
      <div style={{
        ...st.trendPill,
        borderColor: tier.main,
        backgroundColor: tier.main + '30',
      }}>
        <span style={{ ...st.trendPillText, color: '#FFFFFF' }}>
          {direction && (direction === 'up' ? '\u2191 ' : '\u2193 ')}{value}{typeof value === 'number' && !isRank ? '%' : ''}
          {isRank && total && <span style={st.trendPillRankOf}> of {total}</span>}
        </span>
      </div>
    );
  };

  // Fallback if data not ready
  if (!data) {
    return (
      <div style={st.container}>
        <div style={st.header}>
          <button onClick={() => onBack?.()} style={st.backButton}>
            <span style={st.backButtonText}>&lsaquo;</span>
          </button>
          <span style={st.headerTitle}>Report</span>
          <div style={st.shareButton} />
        </div>
      </div>
    );
  }

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.header}>
        <button onClick={() => onBack?.()} style={st.backButton}>
          <span style={st.backButtonText}>&lsaquo;</span>
        </button>
        <span style={st.headerTitle}>{data.headerTitle}</span>
        <div style={st.shareButton} />
      </div>

      <div style={st.scrollContent}>
        {/* Title */}
        <div style={st.reportTitle}>
          <div style={st.reportTitleText}>{data.title}</div>
          <div style={st.reportSubtitle}>{data.subtitle}</div>
        </div>

        {/* Big Score Ring - Daily only */}
        {type === 'daily' && (
          <div style={st.bigScoreContainer}>
            <ProgressRing percent={(data as any).score} size={180} strokeWidth={10} labelInside="SCORE" />
          </div>
        )}

        {/* Core Stats - Weekly/Monthly */}
        {(type === 'weekly' || type === 'monthly') && (
          <div style={st.coreStats}>
            <div style={st.coreStat}>
              <ProgressRing percent={(data as any).score} size={80} strokeWidth={6} />
              <span style={st.coreStatLabel}>SCORE</span>
            </div>
            <div style={st.coreStat}>
              <ProgressRing percent={(data as any).completion} size={80} strokeWidth={6} />
              <span style={st.coreStatLabel}>COMPLETION</span>
            </div>
            <div style={st.coreStat}>
              <ProgressRing percent={(data as any).consistency} size={80} strokeWidth={6} />
              <span style={st.coreStatLabel}>CONSISTENCY</span>
            </div>
          </div>
        )}

        {/* Daily: Stats Grid */}
        {type === 'daily' && (
          <div style={st.section}>
            <div style={st.dailyStatsGrid}>
              {/* Row 1: Tasks & Streak */}
              <div style={st.bubbleCard}>
                <ProgressRing
                  percent={Math.round(((data as any).tasksCompleted / (data as any).totalTasks) * 100)}
                  size={52}
                  strokeWidth={4}
                  showValue={true}
                  customValue={(data as any).tasksCompleted}
                />
                <div style={st.bubbleInfo}>
                  <span style={st.bubbleLabel}>Tasks Completed</span>
                  <span style={st.bubbleValue}>{(data as any).tasksCompleted} of {(data as any).totalTasks}</span>
                </div>
              </div>
              <div style={st.bubbleCard}>
                <ProgressRing
                  percent={(data as any).streak > 0 ? Math.min((data as any).streak * 10, 100) : 0}
                  size={52}
                  strokeWidth={4}
                  showValue={true}
                  customValue={(data as any).streak}
                />
                <div style={st.bubbleInfo}>
                  <span style={st.bubbleLabel}>Current Streak</span>
                  <span style={st.bubbleValue}>{(data as any).streak} days</span>
                </div>
              </div>
              {/* Row 2: vs Yesterday & vs Week */}
              <div style={st.trendCard}>
                <span style={st.trendLabel}>vs Yesterday</span>
                {(data as any).comparisons.vsYesterday
                  ? renderTrendPill((data as any).comparisons.vsYesterday.value, (data as any).comparisons.vsYesterday.direction)
                  : <span style={st.noDataText}>—</span>}
              </div>
              <div style={st.trendCard}>
                <span style={st.trendLabel}>vs Week Avg</span>
                {(data as any).comparisons.vsWeekAvg
                  ? renderTrendPill((data as any).comparisons.vsWeekAvg.value, (data as any).comparisons.vsWeekAvg.direction)
                  : <span style={st.noDataText}>—</span>}
              </div>
              {/* Row 3: vs Month & Day Rank */}
              <div style={st.trendCard}>
                <span style={st.trendLabel}>vs Month Avg</span>
                {(data as any).comparisons.vsMonthAvg
                  ? renderTrendPill((data as any).comparisons.vsMonthAvg.value, (data as any).comparisons.vsMonthAvg.direction)
                  : <span style={st.noDataText}>—</span>}
              </div>
              <div style={st.trendCard}>
                <span style={st.trendLabel}>Day Rank</span>
                {(data as any).comparisons.dayRank
                  ? renderTrendPill(`#${(data as any).comparisons.dayRank.rank}`, undefined, true, (data as any).comparisons.dayRank.total)
                  : <span style={st.noDataText}>—</span>}
              </div>
            </div>
          </div>
        )}

        {/* Weekly/Monthly: Stat Cards */}
        {(type === 'weekly' || type === 'monthly') && (
          <div style={st.section}>
            <div style={st.dailyStatsGrid}>
              <div style={st.bubbleCard}>
                <ProgressRing
                  percent={Math.round(((data as any).daysActive / (type === 'monthly' ? (data as any).totalDays : 7)) * 100)}
                  size={52}
                  strokeWidth={4}
                  showValue={true}
                  customValue={(data as any).daysActive}
                />
                <div style={st.bubbleInfo}>
                  <span style={st.bubbleLabel}>Days Active</span>
                  <span style={st.bubbleValue}>{(data as any).daysActive} of {type === 'monthly' ? (data as any).totalDays : 7}</span>
                </div>
              </div>
              <div style={st.bubbleCard}>
                <ProgressRing
                  percent={(data as any).streak > 0 ? Math.min((data as any).streak * 10, 100) : 0}
                  size={52}
                  strokeWidth={4}
                  showValue={true}
                  customValue={(data as any).streak}
                />
                <div style={st.bubbleInfo}>
                  <span style={st.bubbleLabel}>Current Streak</span>
                  <span style={st.bubbleValue}>{(data as any).streak} days</span>
                </div>
              </div>
              <div style={st.bubbleCard}>
                <ProgressRing
                  percent={Math.round(((data as any).perfectDays / (type === 'monthly' ? 31 : 7)) * 100)}
                  size={52}
                  strokeWidth={4}
                  showValue={true}
                  customValue={(data as any).perfectDays}
                />
                <div style={st.bubbleInfo}>
                  <span style={st.bubbleLabel}>Perfect Days</span>
                  <span style={st.bubbleValue}>{(data as any).perfectDays} of {type === 'monthly' ? 31 : 7}</span>
                </div>
              </div>
              <div style={st.bubbleCard}>
                <ProgressRing
                  percent={Math.round(((data as any).tasksCompleted / (data as any).totalTasks) * 100)}
                  size={52}
                  strokeWidth={4}
                  showValue={true}
                  customValue={(data as any).tasksCompleted}
                />
                <div style={st.bubbleInfo}>
                  <span style={st.bubbleLabel}>Tasks Completed</span>
                  <span style={st.bubbleValue}>{(data as any).tasksCompleted} of {(data as any).totalTasks}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparisons - Weekly/Monthly */}
        {(type === 'weekly' || type === 'monthly') && (
          <div style={st.section}>
            <div style={st.trendGrid}>
              {type === 'weekly' && (
                <>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>VS LAST WEEK</span>
                    {(data as any).comparisons.vsLastWeek
                      ? renderTrendPill((data as any).comparisons.vsLastWeek.value, (data as any).comparisons.vsLastWeek.direction)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>VS LAST MONTH</span>
                    {(data as any).comparisons.vsLastMonth
                      ? renderTrendPill((data as any).comparisons.vsLastMonth.value, (data as any).comparisons.vsLastMonth.direction)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>VS ALL-TIME</span>
                    {(data as any).comparisons.vsAllTime
                      ? renderTrendPill((data as any).comparisons.vsAllTime.value, (data as any).comparisons.vsAllTime.direction)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>WEEK RANK</span>
                    {(data as any).comparisons.weekRank
                      ? renderTrendPill(`#${(data as any).comparisons.weekRank.rank}`, undefined, true, (data as any).comparisons.weekRank.total)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                </>
              )}
              {type === 'monthly' && (
                <>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>VS LAST MONTH</span>
                    {(data as any).comparisons.vsLastMonth
                      ? renderTrendPill((data as any).comparisons.vsLastMonth.value, (data as any).comparisons.vsLastMonth.direction)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>VS ALL-TIME</span>
                    {(data as any).comparisons.vsAllTime
                      ? renderTrendPill((data as any).comparisons.vsAllTime.value, (data as any).comparisons.vsAllTime.direction)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>BEST WEEK</span>
                    {renderTrendPill(`${(data as any).comparisons.bestWeek.week} · ${(data as any).comparisons.bestWeek.score}`, undefined, true)}
                  </div>
                  <div style={st.trendCard}>
                    <span style={st.trendLabel}>MONTH RANK</span>
                    {(data as any).comparisons.monthRank
                      ? renderTrendPill(`#${(data as any).comparisons.monthRank.rank}`, undefined, true, (data as any).comparisons.monthRank.total)
                      : <span style={st.noDataText}>—</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Daily Score Grid (Weekly) */}
        {type === 'weekly' && (
          <div style={st.section}>
            <span style={st.sectionTitle}>DAILY BREAKDOWN</span>
            <div style={st.dayGrid}>
              {(data as any).dailyScores.map((day: { day: string; score: number }, i: number) => {
                const tier = getTierByPercentage(day.score);
                return (
                  <div key={i} style={st.dayItem}>
                    <span style={st.dayLabel}>{day.day}</span>
                    <div style={{
                      ...st.dayScore,
                      backgroundColor: tier.main + '26',
                      borderColor: tier.main,
                      boxShadow: `0 0 8px ${tier.main}4D`,
                    }}>
                      <span style={st.dayScoreText}>{day.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar Grid (Monthly) */}
        {type === 'monthly' && (
          <div style={st.section}>
            <span style={st.sectionTitle}>DAILY BREAKDOWN</span>
            <div style={st.calendarContainer}>
              <div style={st.calendarHeader}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <span key={i} style={st.calendarHeaderText}>{day}</span>
                ))}
              </div>
              <div style={st.calendarGrid}>
                {Array.from({ length: (data as any).calendarStartDay }).map((_, i) => (
                  <div key={`empty-${i}`} style={st.calendarDayEmpty} />
                ))}
                {(data as any).calendarScores.map((score: number, i: number) => {
                  const dayNum = i + 1;
                  const isInactive = score === 0;
                  const tier = isInactive ? null : getTierByPercentage(score);
                  return (
                    <div
                      key={dayNum}
                      style={{
                        ...st.calendarDay,
                        ...(isInactive ? st.calendarDayInactive : {
                          backgroundColor: tier!.main + '26',
                          border: `2px solid ${tier!.main}`,
                          boxShadow: `0 0 6px ${tier!.main}4D`,
                        }),
                      }}
                    >
                      <span style={{
                        ...st.calendarDayText,
                        ...(isInactive ? st.calendarDayTextInactive : {}),
                      }}>{dayNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Day Performance (Monthly) */}
        {type === 'monthly' && (
          <div style={st.section}>
            <div style={st.dayPerfCard}>
              <div style={st.dayPerfSection}>
                <span style={st.dayPerfSectionTitle}>THIS MONTH</span>
                <div style={st.dayPerfRow}>
                  <span style={st.dayPerfLabel}>Best Day</span>
                  <div style={st.dayPerfIndicator}>
                    <span style={st.dayPerfDay}>{(data as any).dayPerformance.best.day}</span>
                    <div style={{ ...st.dayPerfDot, backgroundColor: colors.tier1.main, boxShadow: `0 0 4px ${colors.tier1.main}99` }} />
                    <span style={{ ...st.dayPerfScore, color: colors.tier1.main }}>{(data as any).dayPerformance.best.score}</span>
                  </div>
                </div>
                <div style={st.dayPerfRow}>
                  <span style={st.dayPerfLabel}>Lowest Day</span>
                  <div style={st.dayPerfIndicator}>
                    <span style={st.dayPerfDay}>{(data as any).dayPerformance.lowest.day}</span>
                    <div style={{ ...st.dayPerfDot, backgroundColor: colors.tier4.main, boxShadow: `0 0 4px ${colors.tier4.main}99` }} />
                    <span style={{ ...st.dayPerfScore, color: colors.tier4.main }}>{(data as any).dayPerformance.lowest.score}</span>
                  </div>
                </div>
              </div>
              <div style={{ ...st.dayPerfSection, borderBottom: 'none' }}>
                <span style={st.dayPerfSectionTitle}>ALL-TIME</span>
                <div style={st.dayPerfRow}>
                  <span style={st.dayPerfLabel}>Strongest Day</span>
                  <div style={st.dayPerfIndicator}>
                    <span style={st.dayPerfDay}>{(data as any).dayPerformance.strongestAllTime.day}</span>
                    <div style={{ ...st.dayPerfDot, backgroundColor: colors.tier1.main, boxShadow: `0 0 4px ${colors.tier1.main}99` }} />
                    <span style={{ ...st.dayPerfScore, color: colors.tier1.main }}>{(data as any).dayPerformance.strongestAllTime.score} avg</span>
                  </div>
                </div>
                <div style={{ ...st.dayPerfRow, borderBottom: 'none' }}>
                  <span style={st.dayPerfLabel}>Weakest Day</span>
                  <div style={st.dayPerfIndicator}>
                    <span style={st.dayPerfDay}>{(data as any).dayPerformance.weakestAllTime.day}</span>
                    <div style={{ ...st.dayPerfDot, backgroundColor: colors.tier4.main, boxShadow: `0 0 4px ${colors.tier4.main}99` }} />
                    <span style={{ ...st.dayPerfScore, color: colors.tier4.main }}>{(data as any).dayPerformance.weakestAllTime.score} avg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task List - Daily only */}
        {type === 'daily' && (
          <div style={st.section}>
            <span style={st.sectionTitle}>TASKS</span>
            <div style={st.taskList}>
              {(data as any).tasks.map((task: TaskItem, i: number) => {
                const goalColor = getGoalColor(task.goalPriority);
                const circleColor = goalColor.main;
                return (
                  <div key={i} style={st.taskRow}>
                    <div style={st.taskInfo}>
                      <span style={st.taskName}>{task.name}</span>
                      <span style={st.taskMeta}>{task.importance} · {task.difficulty}</span>
                    </div>
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      {task.completed ? (
                        <circle cx="12" cy="12" r="10" fill={circleColor} />
                      ) : (
                        <circle cx="12" cy="12" r="9" fill="none" stroke={circleColor} strokeWidth="2" />
                      )}
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task Completion Breakdowns */}
        <div style={st.section}>
          <span style={st.sectionTitle}>TASK COMPLETION</span>

          <div style={st.breakdownCard}>
            <span style={st.breakdownCardTitle}>By Importance</span>
            {Object.entries(data.breakdowns.byImportance).map(([label, value]) => (
              <div key={label} style={st.breakdownItem}>
                <div style={st.breakdownHeader}>
                  <span style={st.breakdownLabel}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                  <span style={st.breakdownValue}>{value}%</span>
                </div>
                {renderProgressBar(value)}
              </div>
            ))}
          </div>

          <div style={st.breakdownCard}>
            <span style={st.breakdownCardTitle}>By Difficulty</span>
            {Object.entries(data.breakdowns.byDifficulty).map(([label, value]) => (
              <div key={label} style={st.breakdownItem}>
                <div style={st.breakdownHeader}>
                  <span style={st.breakdownLabel}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                  <span style={st.breakdownValue}>{value}%</span>
                </div>
                {renderProgressBar(value)}
              </div>
            ))}
          </div>

          <div style={st.breakdownCard}>
            <span style={st.breakdownCardTitle}>By Goal</span>
            {data.breakdowns.byGoal.map((goal: { name: string; percent: number }, i: number) => (
              <div key={i} style={st.breakdownItem}>
                <div style={st.breakdownHeader}>
                  <span style={st.breakdownLabel}>{goal.name}</span>
                  <span style={st.breakdownValue}>{goal.percent}%</span>
                </div>
                {renderProgressBar(goal.percent)}
              </div>
            ))}
          </div>
        </div>

        {/* Task Highlights (Weekly/Monthly) */}
        {(type === 'weekly' || type === 'monthly') && (
          <div style={st.section}>
            <span style={st.sectionTitle}>TASK HIGHLIGHTS</span>
            <div style={st.trendGrid}>
              <div style={st.trendCard}>
                <span style={st.trendLabel}>HIGHEST THIS {type === 'weekly' ? 'WEEK' : 'MONTH'}</span>
                <span style={st.highlightTaskName}>{(data as any).taskHighlights.highest.name}</span>
                {renderTrendPill((data as any).taskHighlights.highest.value, undefined, true)}
              </div>
              <div style={st.trendCard}>
                <span style={st.trendLabel}>LOWEST THIS {type === 'weekly' ? 'WEEK' : 'MONTH'}</span>
                <span style={st.highlightTaskName}>{(data as any).taskHighlights.lowest.name}</span>
                {(() => {
                  const parts = (data as any).taskHighlights.lowest.value.split('/');
                  const percent = parts.length === 2 ? (parseInt(parts[0]) / parseInt(parts[1])) * 100 : 50;
                  const tier = getTierByPercentage(percent);
                  return (
                    <div style={{
                      ...st.trendPill,
                      borderColor: tier.main,
                      backgroundColor: tier.main + '30',
                    }}>
                      <span style={{ ...st.trendPillText, color: '#FFFFFF' }}>
                        {(data as any).taskHighlights.lowest.value}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div style={st.trendCard}>
                <span style={st.trendLabel}>MOST IMPROVED</span>
                <span style={st.highlightTaskName}>{(data as any).taskHighlights.mostImproved.name}</span>
                {renderTrendPill((data as any).taskHighlights.mostImproved.change, 'up')}
              </div>
              <div style={st.trendCard}>
                <span style={st.trendLabel}>MOST DECLINED</span>
                <span style={st.highlightTaskName}>{(data as any).taskHighlights.mostDeclined.name}</span>
                {renderTrendPill((data as any).taskHighlights.mostDeclined.change, 'down')}
              </div>
            </div>
          </div>
        )}

        {/* Tracked Metrics */}
        {(data as any).metrics && (data as any).metrics.length > 0 && (
        <div style={st.section}>
          <span style={st.sectionTitle}>TRACKED METRICS</span>
          <div style={st.metricsGrid}>
            {type === 'daily' ? (
              (data as any).metrics.map((metric: { name: string; value: string; target: string | null; hit: boolean }, i: number) => {
                const numericValue = parseFloat(metric.value.replace(/[^0-9.]/g, '')) || 0;
                const numericTarget = metric.target ? parseFloat(metric.target.replace(/[^0-9.]/g, '')) || 1 : 1;
                const progressPercent = metric.target ? Math.min((numericValue / numericTarget) * 100, 100) : 0;
                const exceeded = numericValue > numericTarget;
                const progressColor = metric.hit ? colors.tier1.main : colors.textMuted;
                const glowColor = metric.hit ? 'rgba(74, 222, 128, 0.4)' : 'none';

                return (
                  <div key={i} style={st.metricCard}>
                    <span style={st.metricNameDaily}>{metric.name}</span>
                    <span style={st.metricValueDaily}>{metric.value}</span>
                    {metric.target && (
                      <>
                        <div style={st.metricProgressBar}>
                          <div style={{
                            ...st.metricProgressFill,
                            width: `${progressPercent}%`,
                            backgroundColor: progressColor,
                            boxShadow: glowColor !== 'none' ? `0 0 8px ${glowColor}` : 'none',
                          }} />
                        </div>
                        <span style={{
                          ...st.metricTargetText,
                          color: exceeded ? colors.tier1.main : colors.textMuted,
                        }}>
                          {exceeded ? `${metric.value} of ${metric.target}` : `of ${metric.target}`}
                        </span>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              (data as any).metrics.map((metric: { name: string; avg: string; total: string }, i: number) => (
                <div key={i} style={st.metricCardWide}>
                  <span style={st.metricNameTop}>{metric.name}</span>
                  <div style={st.metricValuesSpread}>
                    <div style={st.metricStatLeft}>
                      <span style={st.metricStatLabel}>AVG</span>
                      <span style={st.metricAvg}>{metric.avg}</span>
                    </div>
                    <div style={st.metricDivider} />
                    <div style={st.metricStatRight}>
                      <span style={st.metricStatLabel}>TOTAL</span>
                      <span style={st.metricTotal}>{metric.total}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  backButton: {
    marginRight: spacing.lg,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  shareButton: {
    padding: spacing.sm,
    width: 32,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  reportTitle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  reportTitleText: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  bigScoreContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  coreStats: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  coreStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  coreStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
    display: 'block',
  },
  dailyStatsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bubbleCard: {
    width: 'calc(50% - 5px)',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxSizing: 'border-box',
  },
  bubbleInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  bubbleLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bubbleValue: {
    fontSize: 17,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  trendGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trendCard: {
    width: 'calc(50% - 5px)',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    boxSizing: 'border-box',
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  noDataText: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.textFaint,
  },
  trendPill: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 50,
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPillText: {
    fontSize: 16,
    fontWeight: 700,
  },
  trendPillRankOf: {
    color: colors.textMuted,
    fontWeight: 500,
  },
  highlightTaskName: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  // Day Grid (Weekly)
  dayGrid: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
  },
  dayScore: {
    width: 44,
    height: 50,
    borderRadius: 8,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayScoreText: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  // Calendar Grid (Monthly)
  calendarContainer: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 14,
  },
  calendarHeader: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarHeaderText: {
    width: '14.28%',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  calendarGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarDay: {
    width: 40,
    height: 44,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  calendarDayEmpty: {
    width: 40,
    height: 44,
  },
  calendarDayInactive: {
    backgroundColor: colors.border,
    border: `2px solid ${colors.border}`,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  calendarDayTextInactive: {
    color: colors.textFaint,
  },
  // Day Performance (Monthly)
  dayPerfCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dayPerfSection: {
    padding: 14,
    paddingLeft: 16,
    paddingRight: 16,
    borderBottom: `1px solid ${colors.border}`,
  },
  dayPerfSectionTitle: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    display: 'block',
  },
  dayPerfRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  dayPerfLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dayPerfIndicator: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayPerfDay: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
  },
  dayPerfDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayPerfScore: {
    fontSize: 14,
    fontWeight: 700,
  },
  // Task List (Daily)
  taskList: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  taskRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
  },
  taskInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  taskName: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  taskStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskStatusComplete: {
    backgroundColor: colors.tier1.main + '33',
  },
  taskStatusIncomplete: {
    backgroundColor: colors.border,
  },
  taskStatusText: {
    fontSize: 14,
    color: colors.tier1.main,
  },
  // Breakdown Cards
  breakdownCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: 12,
  },
  breakdownCardTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 14,
    display: 'block',
  },
  breakdownItem: {
    marginBottom: 14,
  },
  breakdownHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Metrics
  metricsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: 'calc(50% - 5px)',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minHeight: 120,
  },
  metricCardWide: {
    width: 'calc(50% - 5px)',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    paddingTop: 10,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingRight: 14,
    boxSizing: 'border-box',
  },
  metricName: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  metricNameDaily: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metricValueDaily: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  metricProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  metricProgressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  metricTargetText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  metricNameTop: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
    display: 'block',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  metricChange: {
    fontSize: 11,
    marginTop: 4,
  },
  metricValuesSpread: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metricStatLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  metricStatRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  metricStatLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricAvg: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  metricTotal: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.textPrimary,
  },
};
