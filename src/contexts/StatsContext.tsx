'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useDeferredValue,
  ReactNode,
} from 'react';
import { useTasks, Task } from './TaskContext';
import { useGoals } from './GoalContext';
import { useAuth } from './AuthContext';
import * as calculations from '@/shared';
import { db } from '@/lib/storage';

interface StatsContextType {
  completions: calculations.TaskCompletion[];
  completionIndex: calculations.CompletionIndex;
  toggleTaskCompletion: (taskId: number, date?: Date) => Promise<void>;
  updateTaskValue: (taskId: number, value: number, date?: Date) => Promise<void>;
  getTaskCompletion: (taskId: number, date: string) => calculations.TaskCompletion | undefined;
  todayScore: calculations.DailyScore;
  getDailyScore: (date: Date) => calculations.DailyScore;
  weeklyScore: number;
  monthlyScore: number;
  allTimeAverage: number;
  currentStreak: number;
  longestStreak: number;
  getStreakAsOfDate: (date: Date) => number;
  consistency: number;
  todayCompletion: number;
  weeklyCompletion: number;
  monthlyCompletion: number;
  dailyTrend: calculations.Trend;
  weeklyTrend: calculations.Trend;
  perfectDaysThisWeek: number;
  perfectDaysThisMonth: number;
  perfectDaysAllTime: number;
  getGoalProbability: (goalId: number) => number;
  vsLastWeek: { value: number; direction: 'up' | 'down' };
  vsAllTime: { value: number; direction: 'up' | 'down' };
  canEditDate: (date: Date) => { canEdit: boolean; isLateLog: boolean };
  isLoading: boolean;
  refreshStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { goals } = useGoals();

  const [completions, setCompletions] = useState<calculations.TaskCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id;

  const loadData = useCallback(async () => {
    if (!user) {
      setCompletions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const rows = await db.fetchCompletions(user.id);
      setCompletions(rows.map(r => ({
        taskId: r.task_id,
        date: r.date,
        completed: r.completed,
        value: r.value ?? undefined,
        timestamp: new Date(r.created_at),
        isLateLogged: r.is_late_logged,
      })));
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [userId, tasks, loadData]);

  const refreshStats = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const calcTasks = useMemo((): calculations.Task[] => {
    return tasks.map(t => {
      const goal = goals.find(g => g.id === t.goalId);
      return { ...t, goalPriority: goal?.priority ?? 99 };
    });
  }, [tasks, goals]);

  const completionIndex = useMemo(() => {
    return calculations.buildCompletionIndex(completions);
  }, [completions]);

  const toggleTaskCompletion = useCallback(async (taskId: number, date: Date = new Date()) => {
    if (!user) return;
    const dateStr = calculations.formatDate(date);
    const { canEdit, isLateLog } = calculations.canEditDate(date);
    if (!canEdit) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const existing = completionIndex.get(`${taskId}:${dateStr}`);

    if (existing?.completed) {
      setCompletions(prev => prev.filter(c => !(c.taskId === taskId && c.date === dateStr)));
      try {
        await db.deleteCompletion(taskId, dateStr);
      } catch (error) {
        console.error('Error removing completion:', error);
      }
    } else {
      const newCompletion: calculations.TaskCompletion = {
        taskId, date: dateStr, completed: true, timestamp: new Date(), isLateLogged: isLateLog,
      };
      setCompletions(prev => {
        const filtered = prev.filter(c => !(c.taskId === taskId && c.date === dateStr));
        return [...filtered, newCompletion];
      });
      try {
        await db.upsertCompletion(user.id, {
          task_id: taskId, date: dateStr, completed: true, is_late_logged: isLateLog,
        });
      } catch (error) {
        console.error('Error saving completion:', error);
      }
    }
  }, [user, tasks, completionIndex]);

  const updateTaskValue = useCallback(async (taskId: number, value: number, date: Date = new Date()) => {
    if (!user) return;
    const dateStr = calculations.formatDate(date);
    const { canEdit, isLateLog } = calculations.canEditDate(date);
    if (!canEdit) return;

    const task = tasks.find(t => t.id === taskId);
    const target = task?.target ?? 1;
    const isCompleted = value >= target;

    const newCompletion: calculations.TaskCompletion = {
      taskId, date: dateStr, completed: isCompleted, value, timestamp: new Date(), isLateLogged: isLateLog,
    };

    setCompletions(prev => {
      const filtered = prev.filter(c => !(c.taskId === taskId && c.date === dateStr));
      return [...filtered, newCompletion];
    });
    try {
      await db.upsertCompletion(user.id, {
        task_id: taskId, date: dateStr, completed: isCompleted, value, is_late_logged: isLateLog,
      });
    } catch (error) {
      console.error('Error saving completion:', error);
    }
  }, [user, tasks]);

  const getTaskCompletion = useCallback((taskId: number, date: string) => {
    return completionIndex.get(`${taskId}:${date}`);
  }, [completionIndex]);

  const todayScore = useMemo(() => {
    return calculations.calculateDailyScore(calcTasks, completions, new Date(), completionIndex);
  }, [calcTasks, completions, completionIndex]);

  const getDailyScore = useCallback((date: Date) => {
    return calculations.calculateDailyScore(calcTasks, completions, date, completionIndex);
  }, [calcTasks, completions, completionIndex]);

  const deferredCompletions = useDeferredValue(completions);
  const deferredCalcTasks = useDeferredValue(calcTasks);
  const deferredIndex = useMemo(() => calculations.buildCompletionIndex(deferredCompletions), [deferredCompletions]);

  const today = new Date();
  const weekStart = calculations.getWeekStart(today);
  const monthStart = calculations.getMonthStart(today);

  const weekScores = useMemo(() => {
    return calculations.calculateDailyScoresForRange(deferredCalcTasks, deferredCompletions, weekStart, today, deferredIndex);
  }, [deferredCalcTasks, deferredCompletions, weekStart, today, deferredIndex]);

  const monthScores = useMemo(() => {
    return calculations.calculateDailyScoresForRange(deferredCalcTasks, deferredCompletions, monthStart, today, deferredIndex);
  }, [deferredCalcTasks, deferredCompletions, monthStart, today, deferredIndex]);

  const allTimeScores = useMemo(() => {
    const yearAgo = calculations.addDays(today, -365);
    return calculations.calculateDailyScoresForRange(deferredCalcTasks, deferredCompletions, yearAgo, today, deferredIndex);
  }, [deferredCalcTasks, deferredCompletions, today, deferredIndex]);

  const weeklyScore = useMemo(() => calculations.calculatePeriodScore(weekScores), [weekScores]);
  const monthlyScore = useMemo(() => calculations.calculatePeriodScore(monthScores), [monthScores]);
  const allTimeAverage = useMemo(() => calculations.calculateAllTimeAverage(allTimeScores), [allTimeScores]);

  const { currentStreak, longestStreak } = useMemo(() => calculations.calculateStreak(allTimeScores), [allTimeScores]);

  const getStreakAsOfDate = useCallback((date: Date) => {
    return calculations.calculateStreakAsOfDate(deferredCalcTasks, deferredCompletions, date, deferredIndex);
  }, [deferredCalcTasks, deferredCompletions, deferredIndex]);

  const consistency = useMemo(() => calculations.calculateConsistency(monthScores), [monthScores]);

  const todayCompletion = useMemo(() => {
    if (todayScore.tasksScheduled === 0) return 0;
    return Math.round((todayScore.tasksCompleted / todayScore.tasksScheduled) * 100);
  }, [todayScore]);

  const weeklyCompletion = useMemo(() => calculations.calculateCompletion(weekScores), [weekScores]);
  const monthlyCompletion = useMemo(() => calculations.calculateCompletion(monthScores), [monthScores]);

  const dailyTrend = useMemo(() => {
    const yesterday = calculations.addDays(today, -1);
    const yesterdayScore = getDailyScore(yesterday);
    return calculations.calculateTrend(todayScore.score, yesterdayScore.score);
  }, [todayScore, getDailyScore, today]);

  const weeklyTrend = useMemo(() => {
    const lastWeekStart = calculations.addDays(weekStart, -7);
    const lastWeekEnd = calculations.addDays(weekStart, -1);
    const lastWeekScores = calculations.calculateDailyScoresForRange(deferredCalcTasks, deferredCompletions, lastWeekStart, lastWeekEnd, deferredIndex);
    const lastWeekScore = calculations.calculatePeriodScore(lastWeekScores);
    return calculations.calculateTrend(weeklyScore, lastWeekScore);
  }, [deferredCalcTasks, deferredCompletions, weekStart, weeklyScore, deferredIndex]);

  const perfectDaysThisWeek = useMemo(() => calculations.countPerfectDays(weekScores), [weekScores]);
  const perfectDaysThisMonth = useMemo(() => calculations.countPerfectDays(monthScores), [monthScores]);
  const perfectDaysAllTime = useMemo(() => calculations.countPerfectDays(allTimeScores), [allTimeScores]);

  const getGoalProbability = useCallback((goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return 50;
    return calculations.calculateGoalProbability(
      { id: goal.id, name: goal.name, priority: goal.priority, createdAt: goal.createdAt, targetDate: goal.targetDate, completed: goal.completed, completedDate: goal.completedDate },
      deferredCalcTasks, deferredCompletions, new Date(), deferredIndex
    );
  }, [goals, deferredCalcTasks, deferredCompletions, deferredIndex]);

  const vsLastWeek = useMemo(() => {
    const lastWeekStart = calculations.addDays(weekStart, -7);
    const lastWeekEnd = calculations.addDays(weekStart, -1);
    const lastWeekScores = calculations.calculateDailyScoresForRange(deferredCalcTasks, deferredCompletions, lastWeekStart, lastWeekEnd, deferredIndex);
    const lastWeekScore = calculations.calculatePeriodScore(lastWeekScores);
    return calculations.calculateComparison(weeklyScore, lastWeekScore);
  }, [deferredCalcTasks, deferredCompletions, weekStart, weeklyScore, deferredIndex]);

  const vsAllTime = useMemo(() => calculations.calculateComparison(weeklyScore, allTimeAverage), [weeklyScore, allTimeAverage]);

  const canEditDateFn = useCallback((date: Date) => calculations.canEditDate(date), []);

  const value: StatsContextType = useMemo(() => ({
    completions, completionIndex, toggleTaskCompletion, updateTaskValue, getTaskCompletion,
    todayScore, getDailyScore, weeklyScore, monthlyScore, allTimeAverage,
    currentStreak, longestStreak, getStreakAsOfDate, consistency,
    todayCompletion, weeklyCompletion, monthlyCompletion,
    dailyTrend, weeklyTrend,
    perfectDaysThisWeek, perfectDaysThisMonth, perfectDaysAllTime,
    getGoalProbability, vsLastWeek, vsAllTime,
    canEditDate: canEditDateFn, isLoading, refreshStats,
  }), [
    completions, completionIndex, toggleTaskCompletion, updateTaskValue,
    getTaskCompletion, todayScore, getDailyScore, weeklyScore, monthlyScore,
    allTimeAverage, currentStreak, longestStreak, getStreakAsOfDate,
    consistency, todayCompletion, weeklyCompletion, monthlyCompletion,
    dailyTrend, weeklyTrend, perfectDaysThisWeek, perfectDaysThisMonth,
    perfectDaysAllTime, getGoalProbability, vsLastWeek, vsAllTime,
    canEditDateFn, isLoading, refreshStats,
  ]);

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}
