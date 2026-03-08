/**
 * Progress API module for CookQuest.
 *
 * Provides typed wrappers around the /progress endpoints.
 * All endpoints require authentication.
 */

import { apiClient } from '@/lib/api/client'
import type { SkillType } from '@/lib/types'
import type { RecipeWithProgress } from '@/lib/api/recipes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OverallProgress {
  completed: number
  total: number
  percentage: number
}

export interface SkillProgressEntry {
  skill_id: SkillType
  skill_name: string
  completed: number
  total: number
  percentage: number
}

export interface LevelInfo {
  current: number
  experience: number
  next_level_at: number
  total_xp: number
}

export interface StreakInfo {
  days: number
}

export interface RecentCompletion {
  recipe_id: string
  completed_at: string | null
  rating: number | null
}

/** Shape returned by GET /progress */
export interface ProgressSummary {
  overall: OverallProgress
  skills: SkillProgressEntry[]
  level: LevelInfo
  streak: StreakInfo
  recent_completions: RecentCompletion[]
}

export interface DetailedSkillProgress {
  skill: {
    id: SkillType
    name: string
    description: string
    icon: string
    color: string
  }
  progress: {
    completed: number
    total: number
    percentage: number
  }
  recipes: RecipeWithProgress[]
}

/** Shape returned by GET /progress/skills */
export interface SkillProgressResponse {
  skills: DetailedSkillProgress[]
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's overall progress summary.
 *
 * Includes overall completion stats, per-skill breakdown, level / XP info,
 * streak data, and the five most recent completions.
 */
export async function getProgress(): Promise<ProgressSummary> {
  return apiClient<ProgressSummary>('/progress')
}

/**
 * Fetch detailed per-skill progress for the authenticated user.
 *
 * Each skill entry includes the full list of recipes with their individual
 * `user_progress` attached.
 */
export async function getSkillProgress(): Promise<DetailedSkillProgress[]> {
  const data = await apiClient<SkillProgressResponse>('/progress/skills')
  return data.skills
}

// ---------------------------------------------------------------------------
// Completion API
// ---------------------------------------------------------------------------

export interface CompletionResult {
  recipe_id: string
  already_completed: boolean
  xp_earned: number
  user: {
    level: number
    current_xp: number
    xp_to_next_level: number
    total_xp: number
    streak_days: number
    total_recipes_completed: number
  }
  skill_progress: {
    skill_id: string
    completed: number
    total: number
    percentage: number
  }
  level_up: { new_level: number; previous_level: number } | null
  skills_unlocked: Array<{ id: string; name: string; icon: string; color: string }>
  streak_updated: boolean
}

/**
 * Mark a recipe as completed on the server.
 * Returns the full completion payload with XP, streak, skill progress, etc.
 */
export async function completeRecipe(recipeId: string): Promise<CompletionResult> {
  return apiClient<CompletionResult>(`/recipes/${recipeId}/progress`, {
    method: 'POST',
    body: { completed: true },
  })
}

/**
 * Mark a recipe as uncompleted on the server.
 */
export async function uncompleteRecipe(recipeId: string): Promise<CompletionResult> {
  return apiClient<CompletionResult>(`/recipes/${recipeId}/progress`, {
    method: 'POST',
    body: { completed: false },
  })
}
