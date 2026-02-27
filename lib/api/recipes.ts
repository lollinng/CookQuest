/**
 * Recipes API module for CookQuest.
 *
 * Provides typed wrappers around the /recipes endpoints.
 */

import { apiClient } from '@/lib/api/client'
import type { Recipe, SkillType } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecipeFilters {
  skill?: SkillType
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  page?: number
  limit?: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface RecipeUserProgress {
  completed: boolean
  rating: number | null
  completed_at: string | null
  notes: string | null
}

export interface RecipeWithProgress extends Recipe {
  user_progress?: RecipeUserProgress | null
}

/** Shape returned by GET /recipes */
export interface RecipesListResponse {
  recipes: RecipeWithProgress[]
  pagination: Pagination
}

/** Shape returned by GET /recipes/:id */
export interface RecipeDetailResponse {
  recipe: RecipeWithProgress
}

/** Shape returned by GET /recipes/skill/:skillId */
export interface RecipesBySkillResponse {
  skill: string
  recipes: RecipeWithProgress[]
  total: number
}

/** Body for POST /recipes/:id/progress */
export interface UpdateProgressPayload {
  completed: boolean
  rating?: number
  notes?: string
}

/** Shape returned by POST /recipes/:id/progress */
export interface UpdateProgressResponse {
  progress: RecipeUserProgress
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, optionally filtered list of recipes.
 *
 * ```ts
 * const { recipes, pagination } = await getRecipes({ skill: 'heat-control', page: 2 })
 * ```
 */
export async function getRecipes(
  filters?: RecipeFilters
): Promise<RecipesListResponse> {
  return apiClient<RecipesListResponse>('/recipes', {
    params: {
      skill: filters?.skill,
      difficulty: filters?.difficulty,
      page: filters?.page,
      limit: filters?.limit,
    },
  })
}

/**
 * Fetch a single recipe by its ID.
 */
export async function getRecipeById(id: string): Promise<RecipeWithProgress> {
  const data = await apiClient<RecipeDetailResponse>(`/recipes/${encodeURIComponent(id)}`)
  return data.recipe
}

/**
 * Fetch all recipes belonging to a specific skill.
 */
export async function getRecipesBySkill(
  skillId: SkillType
): Promise<RecipesBySkillResponse> {
  return apiClient<RecipesBySkillResponse>(
    `/recipes/skill/${encodeURIComponent(skillId)}`
  )
}

/**
 * Update the authenticated user's progress on a recipe.
 *
 * Requires authentication. Returns the updated progress record.
 */
export async function updateRecipeProgress(
  recipeId: string,
  data: UpdateProgressPayload
): Promise<RecipeUserProgress> {
  const response = await apiClient<UpdateProgressResponse>(
    `/recipes/${encodeURIComponent(recipeId)}/progress`,
    {
      method: 'POST',
      body: data,
    }
  )
  return response.progress
}
