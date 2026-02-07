'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useStats } from './StatsContext';
import { useTasks } from './TaskContext';
import { useGoals } from './GoalContext';
import { db } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import {
  ACHIEVEMENT_MAP,
  TOTAL_ACHIEVEMENTS,
  AchievementDefinition,
  HighlightDefinition,
  ReportType,
} from '@/utils/achievementDefinitions';
import {
  buildSnapshot,
  detectNewAchievements,
  computeHighlights,
  verifyAchievement,
} from '@/utils/achievementEngine';

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: Date;
  notified: boolean;
}

interface AchievementContextType {
  unlockedAchievements: UnlockedAchievement[];
  getAchievementsForReport: (reportType: string, reportId: string) => UnlockedAchievement[];
  getHighlightsForReport: (reportType: ReportType) => HighlightDefinition[];
  totalUnlocked: number;
  totalAchievements: number;
  isLoading: boolean;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

function getReportDateRange(reportType: string, reportId: string): { start: Date; end: Date } {
  if (reportType === 'daily') {
    const dateStr = reportId.replace('d-', '');
    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(dateStr + 'T23:59:59.999');
    return { start, end };
  } else if (reportType === 'weekly') {
    const dateStr = reportId.replace('w-', '');
    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else {
    const parts = reportId.replace('m-', '').split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const stats = useStats();
  const { tasks } = useTasks();
  const { goals } = useGoals();

  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const unlockedIdsRef = useRef<Set<string>>(new Set());
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const hasVerifiedRef = useRef(false);

  // Load unlocked achievements from Supabase
  useEffect(() => {
    if (!user) {
      setUnlockedAchievements([]);
      unlockedIdsRef.current = new Set();
      setIsLoading(false);
      hasLoadedRef.current = false;
      hasVerifiedRef.current = false;
      return;
    }

    async function load() {
      setIsLoading(true);
      try {
        const rows = await db.fetchUserAchievements(user!.id);
        const achievements = rows.map(r => ({
          achievementId: r.achievement_id,
          unlockedAt: new Date(r.unlocked_at),
          notified: r.notified,
        }));
        setUnlockedAchievements(achievements);
        unlockedIdsRef.current = new Set(rows.map(r => r.achievement_id));
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('[Achievement] Error loading:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  // Verify achievements and remove any that were incorrectly granted
  useEffect(() => {
    if (!user || !hasLoadedRef.current || stats.isLoading || hasVerifiedRef.current) return;
    if (unlockedAchievements.length === 0) return;

    hasVerifiedRef.current = true;

    const snapshot = buildSnapshot(
      {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        todayScore: stats.todayScore,
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
        completions: stats.completions,
      },
      tasks,
      goals,
    );

    // Check each achievement and remove invalid ones
    const invalidIds: string[] = [];
    for (const achievement of unlockedAchievements) {
      if (!verifyAchievement(achievement.achievementId, snapshot)) {
        invalidIds.push(achievement.achievementId);
      }
    }

    if (invalidIds.length > 0) {
      console.log('[Achievement] Removing invalid achievements:', invalidIds);

      // Delete from database
      Promise.all(
        invalidIds.map(id =>
          supabase
            .from('user_achievements')
            .delete()
            .eq('user_id', user.id)
            .eq('achievement_id', id)
            .then(({ error }) => {
              if (error) console.error(`[Achievement] Failed to delete ${id}:`, error);
            })
        )
      ).then(() => {
        // Update local state
        setUnlockedAchievements(prev => prev.filter(a => !invalidIds.includes(a.achievementId)));
        invalidIds.forEach(id => unlockedIdsRef.current.delete(id));
      });
    }
  }, [user, stats, tasks, goals, unlockedAchievements]);

  // Check for new achievements (debounced)
  const checkForAchievements = useCallback(async () => {
    if (!user || !hasLoadedRef.current || stats.isLoading) return;

    const snapshot = buildSnapshot(
      {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        todayScore: stats.todayScore,
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
        completions: stats.completions,
      },
      tasks,
      goals,
    );

    const newlyUnlocked = detectNewAchievements(snapshot, unlockedIdsRef.current);
    if (newlyUnlocked.length === 0) return;

    const now = new Date();
    const newRecords: UnlockedAchievement[] = [];

    for (const achievement of newlyUnlocked) {
      try {
        await db.insertUserAchievement(user.id, achievement.id);
        unlockedIdsRef.current.add(achievement.id);
        newRecords.push({
          achievementId: achievement.id,
          unlockedAt: now,
          notified: true,
        });
      } catch (error) {
        console.error(`[Achievement] Failed to persist ${achievement.id}:`, error);
      }
    }

    if (newRecords.length > 0) {
      setUnlockedAchievements(prev => [...newRecords, ...prev]);
    }
  }, [user, stats, tasks, goals]);

  // Debounced trigger: runs 500ms after stats change
  useEffect(() => {
    if (!hasLoadedRef.current || stats.isLoading) return;

    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(() => {
      checkForAchievements();
    }, 500);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [stats.completions, stats.currentStreak, checkForAchievements]);

  const getAchievementsForReport = useCallback(
    (reportType: string, reportId: string): UnlockedAchievement[] => {
      try {
        const { start, end } = getReportDateRange(reportType, reportId);
        return unlockedAchievements.filter(a => {
          const d = a.unlockedAt;
          return d >= start && d <= end;
        });
      } catch {
        return [];
      }
    },
    [unlockedAchievements],
  );

  const getHighlightsForReport = useCallback(
    (reportType: ReportType): HighlightDefinition[] => {
      if (stats.isLoading) return [];

      const snapshot = buildSnapshot(
        {
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          todayScore: stats.todayScore,
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
          completions: stats.completions,
        },
        tasks,
        goals,
      );

      return computeHighlights(snapshot, reportType);
    },
    [stats, tasks, goals],
  );

  return (
    <AchievementContext.Provider
      value={{
        unlockedAchievements,
        getAchievementsForReport,
        getHighlightsForReport,
        totalUnlocked: unlockedAchievements.length,
        totalAchievements: TOTAL_ACHIEVEMENTS,
        isLoading,
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}
