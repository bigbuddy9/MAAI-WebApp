'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useGoals } from './GoalContext';
import { db } from '@/lib/storage';
import type { SupabaseTask } from '@maai/shared';

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
  displayOrder: number;
  createdAt: string;
}

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>, createdAt?: string) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  toggleTask: (id: number) => void;
  updateTaskValue: (id: number, value: number | undefined) => void;
  reorderTask: (taskId: number, direction: 'up' | 'down') => void;
  moveTaskToPosition: (taskId: number, toIndex: number) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

function toTask(row: SupabaseTask, goalPriority: number = 99): Task {
  return {
    id: row.id,
    name: row.name,
    importance: row.importance,
    difficulty: row.difficulty,
    goalId: row.goal_id ?? 0,
    goalPriority,
    type: row.type,
    completed: row.completed,
    value: row.value ?? undefined,
    target: row.target ?? undefined,
    frequency: row.frequency,
    selectedDays: row.selected_days,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at.split('T')[0],
  };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { goals, isLoading: goalsLoading } = useGoals();
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const isLoading = tasksLoading || goalsLoading;

  const goalPriorityMap = useMemo(() => {
    const map = new Map<number, number>();
    goals.forEach(g => map.set(g.id, g.priority));
    return map;
  }, [goals]);

  const tasks = useMemo(() => {
    return rawTasks.map(t => ({
      ...t,
      goalPriority: goalPriorityMap.get(t.goalId) ?? t.goalPriority,
    }));
  }, [rawTasks, goalPriorityMap]);

  useEffect(() => {
    if (!user || goalsLoading) {
      if (!user) {
        setRawTasks([]);
        setTasksLoading(false);
      }
      return;
    }

    async function loadTasks() {
      setTasksLoading(true);
      try {
        const rows = await db.fetchTasks(user!.id);
        setRawTasks(rows.map(r => toTask(r)));
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setTasksLoading(false);
      }
    }
    loadTasks();
  }, [user, goalsLoading]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>, createdAt?: string) => {
    if (!user) return;
    try {
      const maxOrder = rawTasks.reduce((max, t) => Math.max(max, t.displayOrder), 0);
      const row = await db.insertTask(user.id, {
        goal_id: task.goalId || null,
        name: task.name,
        importance: task.importance,
        difficulty: task.difficulty,
        type: task.type,
        target: task.target,
        frequency: task.frequency,
        selected_days: task.selectedDays,
        completed: task.completed,
        value: task.value,
        display_order: maxOrder + 1,
        ...(createdAt ? { created_at: createdAt + 'T00:00:00' } : {}),
      });
      setRawTasks(prev => [...prev, toTask(row, task.goalPriority)]);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }, [user, rawTasks]);

  const updateTask = useCallback(async (id: number, updates: Partial<Task>) => {
    if (!user) return;
    setRawTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.importance !== undefined) dbUpdates.importance = updates.importance;
      if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
      if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId || null;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.target !== undefined) dbUpdates.target = updates.target;
      if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
      if (updates.selectedDays !== undefined) dbUpdates.selected_days = updates.selectedDays;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.value !== undefined) dbUpdates.value = updates.value;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

      if (Object.keys(dbUpdates).length > 0) {
        await db.updateTask(id, dbUpdates);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, [user]);

  const deleteTask = useCallback(async (id: number) => {
    if (!user) return;
    setRawTasks(prev => prev.filter(task => task.id !== id));
    try {
      await db.deleteTask(id);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [user]);

  const toggleTask = useCallback(async (id: number) => {
    if (!user) return;
    const task = rawTasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setRawTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: newCompleted } : t
    ));
    try {
      await db.updateTask(id, { completed: newCompleted });
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }, [user, rawTasks]);

  const updateTaskValue = useCallback(async (id: number, value: number | undefined) => {
    if (!user) return;
    const newCompleted = value !== undefined && value > 0;
    setRawTasks(prev => prev.map(task =>
      task.id === id ? { ...task, value, completed: newCompleted } : task
    ));
    try {
      await db.updateTask(id, { value: value ?? null, completed: newCompleted });
    } catch (error) {
      console.error('Error updating task value:', error);
    }
  }, [user]);

  const reorderTask = useCallback(async (taskId: number, direction: 'up' | 'down') => {
    const sorted = [...rawTasks].sort((a, b) => a.displayOrder - b.displayOrder);
    const currentIndex = sorted.findIndex(t => t.id === taskId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentTask = sorted[currentIndex];
    const swapTask = sorted[swapIndex];

    setRawTasks(prev => prev.map(t => {
      if (t.id === currentTask.id) return { ...t, displayOrder: swapTask.displayOrder };
      if (t.id === swapTask.id) return { ...t, displayOrder: currentTask.displayOrder };
      return t;
    }));

    try {
      await Promise.all([
        db.updateTask(currentTask.id, { display_order: swapTask.displayOrder }),
        db.updateTask(swapTask.id, { display_order: currentTask.displayOrder }),
      ]);
    } catch (error) {
      console.error('Error reordering task:', error);
    }
  }, [rawTasks]);

  const moveTaskToPosition = useCallback(async (taskId: number, toIndex: number) => {
    const sorted = [...rawTasks].sort((a, b) => a.displayOrder - b.displayOrder);
    const fromIndex = sorted.findIndex(t => t.id === taskId);
    if (fromIndex === -1 || fromIndex === toIndex) return;

    const clampedToIndex = Math.max(0, Math.min(sorted.length - 1, toIndex));
    const newOrders = new Map<number, number>();

    if (fromIndex < clampedToIndex) {
      for (let i = fromIndex + 1; i <= clampedToIndex; i++) {
        newOrders.set(sorted[i].id, i);
      }
      newOrders.set(taskId, clampedToIndex + 1);
    } else {
      for (let i = clampedToIndex; i < fromIndex; i++) {
        newOrders.set(sorted[i].id, i + 2);
      }
      newOrders.set(taskId, clampedToIndex + 1);
    }

    setRawTasks(prev => prev.map(t => {
      const newOrder = newOrders.get(t.id);
      if (newOrder !== undefined) return { ...t, displayOrder: newOrder };
      return t;
    }));

    try {
      const updates = Array.from(newOrders.entries()).map(([id, order]) =>
        db.updateTask(id, { display_order: order })
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Error moving task:', error);
    }
  }, [rawTasks]);

  const value = useMemo(() => ({
    tasks, isLoading, addTask, updateTask, deleteTask, toggleTask, updateTaskValue, reorderTask, moveTaskToPosition,
  }), [tasks, isLoading, addTask, updateTask, deleteTask, toggleTask, updateTaskValue, reorderTask, moveTaskToPosition]);

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
