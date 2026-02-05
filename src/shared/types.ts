/**
 * Shared types for MyAccountableAI
 * Used by both mobile and web apps.
 */

// =============================================================================
// SUPABASE ROW TYPES (database schema)
// =============================================================================

export interface SupabaseGoal {
  id: number;
  user_id: string;
  name: string;
  completion_criteria: string;
  target_date: string;
  why: string;
  reward: string;
  committed: boolean;
  priority: number;
  completed: boolean;
  completed_date: string | null;
  reflection: string | null;
  future_message: string | null;
  created_at: string;
}

export interface SupabaseMilestone {
  id: number;
  goal_id: number;
  user_id: string;
  description: string;
  target_date: string;
  completed: boolean;
  created_at: string;
}

export interface SupabaseTask {
  id: number;
  user_id: string;
  goal_id: number | null;
  name: string;
  importance: 'medium' | 'high' | 'maximum';
  difficulty: 'medium' | 'high' | 'maximum';
  type: 'checkbox' | 'number';
  target: number | null;
  frequency: '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'daily';
  selected_days: number[];
  completed: boolean;
  value: number | null;
  display_order: number;
  created_at: string;
}

export interface SupabaseCompletion {
  id: number;
  user_id: string;
  task_id: number;
  date: string;
  completed: boolean;
  value: number | null;
  is_late_logged: boolean;
  created_at: string;
}

export interface SupabaseUserAchievement {
  id: number;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  notified: boolean;
}
