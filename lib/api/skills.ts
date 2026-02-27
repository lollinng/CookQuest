/**
 * Skills API module for CookQuest.
 *
 * Provides typed wrappers around the /skills endpoints.
 */

import { apiClient } from '@/lib/api/client'
import type { Skill, SkillType, SkillProgress } from '@/lib/types'
import type { RecipeWithProgress } from '@/lib/api/recipes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillWithProgress extends Skill {
  recipe_count?: number
  user_progress?: SkillProgress
}

/** Shape returned by GET /skills */
export interface SkillsListResponse {
  skills: SkillWithProgress[]
}

export interface SkillDetailData {
  id: SkillType
  name: string
  description: string
  icon: string
  color: string
  recipes: RecipeWithProgress[]
  user_progress?: SkillProgress
}

/** Shape returned by GET /skills/:id */
export interface SkillDetailResponse {
  skill: SkillDetailData
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch all skills.
 *
 * If the user is authenticated the response includes per-skill progress
 * (completed / total / percentage).
 */
export async function getSkills(): Promise<SkillWithProgress[]> {
  const data = await apiClient<SkillsListResponse>('/skills')
  return data.skills
}

/**
 * Fetch a single skill by its ID, including its recipes.
 *
 * When the user is authenticated each recipe includes `user_progress` and the
 * skill object includes an aggregated `user_progress` summary.
 */
export async function getSkillById(id: SkillType): Promise<SkillDetailData> {
  const data = await apiClient<SkillDetailResponse>(
    `/skills/${encodeURIComponent(id)}`
  )
  return data.skill
}
