/**
 * Supabase Storage Layer (Shared)
 *
 * All CRUD operations for syncing app data with Supabase.
 * Uses dependency injection — call initSupabaseStorage(client) to get the API.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseGoal,
  SupabaseMilestone,
  SupabaseTask,
  SupabaseCompletion,
  SupabaseUserAchievement,
} from './types';

export type {
  SupabaseGoal,
  SupabaseMilestone,
  SupabaseTask,
  SupabaseCompletion,
  SupabaseUserAchievement,
};

export function initSupabaseStorage(supabase: SupabaseClient) {
  // ===========================================================================
  // GOALS
  // ===========================================================================

  async function fetchGoals(userId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data as SupabaseGoal[];
  }

  async function insertGoal(userId: string, goal: {
    name: string;
    completion_criteria: string;
    target_date: string;
    why: string;
    reward: string;
    committed: boolean;
    priority: number;
    future_message?: string;
  }) {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...goal, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as SupabaseGoal;
  }

  async function updateGoal(goalId: number, updates: Partial<Omit<SupabaseGoal, 'id' | 'user_id' | 'created_at'>>) {
    const { error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId);

    if (error) throw error;
  }

  async function deleteGoal(goalId: number) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  }

  // ===========================================================================
  // MILESTONES
  // ===========================================================================

  async function fetchMilestones(userId: string, goalId?: number) {
    let query = supabase
      .from('milestones')
      .select('*')
      .eq('user_id', userId);

    if (goalId !== undefined) {
      query = query.eq('goal_id', goalId);
    }

    const { data, error } = await query.order('target_date', { ascending: true });
    if (error) throw error;
    return data as SupabaseMilestone[];
  }

  async function insertMilestone(userId: string, milestone: {
    goal_id: number;
    description: string;
    target_date: string;
    completed: boolean;
  }) {
    const { data, error } = await supabase
      .from('milestones')
      .insert({ ...milestone, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as SupabaseMilestone;
  }

  async function updateMilestone(milestoneId: number, updates: Partial<Omit<SupabaseMilestone, 'id' | 'user_id' | 'created_at'>>) {
    const { error } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', milestoneId);

    if (error) throw error;
  }

  async function deleteMilestone(milestoneId: number) {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId);

    if (error) throw error;
  }

  // ===========================================================================
  // TASKS
  // ===========================================================================

  async function fetchTasks(userId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as SupabaseTask[];
  }

  async function insertTask(userId: string, task: {
    goal_id: number | null;
    name: string;
    importance: 'medium' | 'high' | 'maximum';
    difficulty: 'medium' | 'high' | 'maximum';
    type: 'checkbox' | 'number';
    target?: number;
    frequency: '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'daily';
    selected_days: number[];
    completed: boolean;
    value?: number;
    display_order?: number;
    created_at?: string;
  }) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as SupabaseTask;
  }

  async function updateTask(taskId: number, updates: Partial<Omit<SupabaseTask, 'id' | 'user_id' | 'created_at'>>) {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;
  }

  async function deleteTask(taskId: number) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  }

  // ===========================================================================
  // COMPLETIONS
  // ===========================================================================

  async function fetchCompletions(userId: string) {
    const { data, error } = await supabase
      .from('completions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as SupabaseCompletion[];
  }

  async function fetchCompletionsForDateRange(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('completions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    return data as SupabaseCompletion[];
  }

  async function upsertCompletion(userId: string, completion: {
    task_id: number;
    date: string;
    completed: boolean;
    value?: number;
    is_late_logged: boolean;
  }) {
    const { data, error } = await supabase
      .from('completions')
      .upsert(
        { ...completion, user_id: userId },
        { onConflict: 'task_id,date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as SupabaseCompletion;
  }

  async function deleteCompletion(taskId: number, date: string) {
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('task_id', taskId)
      .eq('date', date);

    if (error) throw error;
  }

  // ===========================================================================
  // DAILY SCORES
  // ===========================================================================

  async function upsertDailyScore(userId: string, score: {
    date: string;
    score: number;
    tasks_scheduled: number;
    tasks_completed: number;
  }) {
    const { error } = await supabase
      .from('daily_scores')
      .upsert(
        { ...score, user_id: userId },
        { onConflict: 'user_id,date' }
      );

    if (error) throw error;
  }

  // ===========================================================================
  // STREAK DATA
  // ===========================================================================

  async function fetchStreakData(userId: string) {
    const { data, error } = await supabase
      .from('streak_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async function upsertStreakData(userId: string, streak: {
    current_streak: number;
    longest_streak: number;
    last_updated: string;
  }) {
    const { error } = await supabase
      .from('streak_data')
      .upsert({ ...streak, user_id: userId });

    if (error) throw error;
  }

  // ===========================================================================
  // USER ACHIEVEMENTS
  // ===========================================================================

  async function fetchUserAchievements(userId: string): Promise<SupabaseUserAchievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data as SupabaseUserAchievement[];
  }

  async function insertUserAchievement(userId: string, achievementId: string): Promise<SupabaseUserAchievement | null> {
    const { data, error } = await supabase
      .from('user_achievements')
      .upsert(
        { user_id: userId, achievement_id: achievementId },
        { onConflict: 'user_id,achievement_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as SupabaseUserAchievement;
  }

  async function markAchievementNotified(userId: string, achievementId: string): Promise<void> {
    const { error } = await supabase
      .from('user_achievements')
      .update({ notified: true })
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (error) throw error;
  }

  return {
    // Goals
    fetchGoals,
    insertGoal,
    updateGoal,
    deleteGoal,
    // Milestones
    fetchMilestones,
    insertMilestone,
    updateMilestone,
    deleteMilestone,
    // Tasks
    fetchTasks,
    insertTask,
    updateTask,
    deleteTask,
    // Completions
    fetchCompletions,
    fetchCompletionsForDateRange,
    upsertCompletion,
    deleteCompletion,
    // Daily Scores
    upsertDailyScore,
    // Streak Data
    fetchStreakData,
    upsertStreakData,
    // User Achievements
    fetchUserAchievements,
    insertUserAchievement,
    markAchievementNotified,
  };
}

export type SupabaseStorage = ReturnType<typeof initSupabaseStorage>;
