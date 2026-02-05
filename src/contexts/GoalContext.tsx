'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/storage';
import type { SupabaseGoal, SupabaseMilestone } from '@maai/shared';

export interface Milestone {
  id: number;
  description: string;
  targetDate: Date;
  completed: boolean;
}

export interface Goal {
  id: number;
  name: string;
  completionCriteria: string;
  targetDate: Date;
  milestones: Milestone[];
  why: string;
  reward: string;
  committed: boolean;
  createdAt: Date;
  priority: number;
  timeElapsed: number;
  taskRate: number;
  probability: number;
  tasks: number;
  trend: 'improving' | 'stable' | 'declining';
  completed: boolean;
  completedDate?: Date;
  reflection?: string;
  futureMessage?: string;
}

export interface CompletedGoal {
  id: number;
  name: string;
  completedDate: string;
}

interface GoalContextType {
  goals: Goal[];
  isLoading: boolean;
  addGoal: (goal: Omit<Goal, 'id' | 'priority' | 'timeElapsed' | 'taskRate' | 'probability' | 'tasks' | 'trend' | 'completed' | 'createdAt'>) => void;
  updateGoal: (id: number, updates: Partial<Goal>) => void;
  deleteGoal: (id: number) => void;
  completeGoal: (id: number) => void;
  reorderGoals: (goalId: number, direction: 'up' | 'down') => void;
  moveGoalToPosition: (goalId: number, toIndex: number) => void;
  getActiveGoals: () => Goal[];
  getCompletedGoals: () => CompletedGoal[];
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

function calculateProbability(timeElapsed: number, taskRate: number): number {
  const paceRatio = taskRate / Math.max(timeElapsed, 1);
  let base;
  if (paceRatio >= 1.50) base = 95;
  else if (paceRatio >= 1.30) base = 90;
  else if (paceRatio >= 1.15) base = 82;
  else if (paceRatio >= 1.00) base = 70;
  else if (paceRatio >= 0.90) base = 55;
  else if (paceRatio >= 0.75) base = 40;
  else if (paceRatio >= 0.60) base = 25;
  else if (paceRatio >= 0.40) base = 15;
  else base = 8;
  return Math.min(99, Math.max(5, base));
}

function toGoal(row: SupabaseGoal, milestones: SupabaseMilestone[]): Goal {
  const created = new Date(row.created_at);
  const target = new Date(row.target_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const totalDuration = target.getTime() - created.getTime();
  const elapsedDuration = now.getTime() - created.getTime();
  const timeElapsed = totalDuration > 0
    ? Math.min(100, Math.max(0, Math.round((elapsedDuration / totalDuration) * 100)))
    : 0;
  const taskRate = 0;
  return {
    id: row.id,
    name: row.name,
    completionCriteria: row.completion_criteria,
    targetDate: new Date(row.target_date),
    milestones: milestones
      .filter(m => m.goal_id === row.id)
      .map(m => ({
        id: m.id,
        description: m.description,
        targetDate: new Date(m.target_date),
        completed: m.completed,
      })),
    why: row.why,
    reward: row.reward,
    committed: row.committed,
    createdAt: new Date(row.created_at),
    priority: row.priority,
    timeElapsed,
    taskRate,
    probability: calculateProbability(timeElapsed, taskRate),
    tasks: 0,
    trend: 'stable',
    completed: row.completed,
    completedDate: row.completed_date ? new Date(row.completed_date) : undefined,
    reflection: row.reflection ?? undefined,
    futureMessage: row.future_message ?? undefined,
  };
}

export function GoalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setIsLoading(false);
      return;
    }

    async function loadGoals() {
      setIsLoading(true);
      try {
        const [goalRows, milestoneRows] = await Promise.all([
          db.fetchGoals(user!.id),
          db.fetchMilestones(user!.id),
        ]);
        setGoals(goalRows.map(r => toGoal(r, milestoneRows)));
      } catch (error) {
        console.error('Error loading goals:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadGoals();
  }, [user]);

  const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'priority' | 'timeElapsed' | 'taskRate' | 'probability' | 'tasks' | 'trend' | 'completed' | 'createdAt'>) => {
    if (!user) return;
    try {
      const activeGoals = goals.filter(g => !g.completed);
      const newPriority = activeGoals.length + 1;

      const row = await db.insertGoal(user.id, {
        name: goalData.name,
        completion_criteria: goalData.completionCriteria,
        target_date: goalData.targetDate.toISOString(),
        why: goalData.why,
        reward: goalData.reward,
        committed: goalData.committed,
        priority: newPriority,
        future_message: goalData.futureMessage,
      });

      const milestoneRows: SupabaseMilestone[] = [];
      for (const m of goalData.milestones) {
        const mRow = await db.insertMilestone(user.id, {
          goal_id: row.id,
          description: m.description,
          target_date: m.targetDate.toISOString(),
          completed: m.completed,
        });
        milestoneRows.push(mRow);
      }

      setGoals(prev => [...prev, toGoal(row, milestoneRows)]);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  }, [user, goals]);

  const updateGoal = useCallback(async (id: number, updates: Partial<Goal>) => {
    if (!user) return;
    setGoals(prev => prev.map(goal =>
      goal.id === id ? { ...goal, ...updates } : goal
    ));
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.completionCriteria !== undefined) dbUpdates.completion_criteria = updates.completionCriteria;
      if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate.toISOString();
      if (updates.why !== undefined) dbUpdates.why = updates.why;
      if (updates.reward !== undefined) dbUpdates.reward = updates.reward;
      if (updates.committed !== undefined) dbUpdates.committed = updates.committed;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.completedDate !== undefined) dbUpdates.completed_date = updates.completedDate?.toISOString() ?? null;
      if (updates.reflection !== undefined) dbUpdates.reflection = updates.reflection;
      if (updates.futureMessage !== undefined) dbUpdates.future_message = updates.futureMessage;

      if (Object.keys(dbUpdates).length > 0) {
        await db.updateGoal(id, dbUpdates);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  }, [user]);

  const deleteGoal = useCallback(async (id: number) => {
    if (!user) return;
    setGoals(prev => prev.filter(goal => goal.id !== id));
    try {
      await db.deleteGoal(id);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  }, [user]);

  const completeGoal = useCallback(async (id: number) => {
    if (!user) return;
    const now = new Date();
    setGoals(prev => prev.map(goal =>
      goal.id === id ? { ...goal, completed: true, completedDate: now, timeElapsed: 100, probability: 100 } : goal
    ));
    try {
      await db.updateGoal(id, { completed: true, completed_date: now.toISOString() });
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  }, [user]);

  const reorderGoals = useCallback(async (goalId: number, direction: 'up' | 'down') => {
    const activeGoals = goals.filter(g => !g.completed).sort((a, b) => a.priority - b.priority);
    const currentIndex = activeGoals.findIndex(g => g.id === goalId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === activeGoals.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentGoal = activeGoals[currentIndex];
    const swapGoal = activeGoals[swapIndex];

    setGoals(prev => prev.map(g => {
      if (g.id === currentGoal.id) return { ...g, priority: swapGoal.priority };
      if (g.id === swapGoal.id) return { ...g, priority: currentGoal.priority };
      return g;
    }));

    try {
      await Promise.all([
        db.updateGoal(currentGoal.id, { priority: swapGoal.priority }),
        db.updateGoal(swapGoal.id, { priority: currentGoal.priority }),
      ]);
    } catch (error) {
      console.error('Error reordering goals:', error);
    }
  }, [goals]);

  const moveGoalToPosition = useCallback(async (goalId: number, toIndex: number) => {
    const activeGoals = goals.filter(g => !g.completed).sort((a, b) => a.priority - b.priority);
    const fromIndex = activeGoals.findIndex(g => g.id === goalId);
    if (fromIndex === -1 || fromIndex === toIndex) return;

    const clampedToIndex = Math.max(0, Math.min(activeGoals.length - 1, toIndex));
    const newPriorities = new Map<number, number>();

    if (fromIndex < clampedToIndex) {
      for (let i = fromIndex + 1; i <= clampedToIndex; i++) {
        newPriorities.set(activeGoals[i].id, i);
      }
      newPriorities.set(goalId, clampedToIndex + 1);
    } else {
      for (let i = clampedToIndex; i < fromIndex; i++) {
        newPriorities.set(activeGoals[i].id, i + 2);
      }
      newPriorities.set(goalId, clampedToIndex + 1);
    }

    setGoals(prev => prev.map(g => {
      const newPriority = newPriorities.get(g.id);
      if (newPriority !== undefined) return { ...g, priority: newPriority };
      return g;
    }));

    try {
      const updates = Array.from(newPriorities.entries()).map(([id, priority]) =>
        db.updateGoal(id, { priority })
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Error moving goal:', error);
    }
  }, [goals]);

  const getActiveGoals = useCallback((): Goal[] => {
    return goals.filter(g => !g.completed).sort((a, b) => a.priority - b.priority);
  }, [goals]);

  const getCompletedGoals = useCallback((): CompletedGoal[] => {
    return goals
      .filter(g => g.completed)
      .map(g => ({
        id: g.id,
        name: g.name,
        completedDate: g.completedDate
          ? g.completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '',
      }));
  }, [goals]);

  const value = useMemo(() => ({
    goals, isLoading, addGoal, updateGoal, deleteGoal, completeGoal,
    reorderGoals, moveGoalToPosition, getActiveGoals, getCompletedGoals,
  }), [goals, isLoading, addGoal, updateGoal, deleteGoal, completeGoal, reorderGoals, moveGoalToPosition, getActiveGoals, getCompletedGoals]);

  return (
    <GoalContext.Provider value={value}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
}
