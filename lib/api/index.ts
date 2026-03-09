/**
 * CookQuest API client -- barrel export.
 *
 * Usage:
 *   import { login, getRecipes, getSkills } from '@/lib/api'
 *
 * Or import from a specific module for tree-shaking / clarity:
 *   import { login } from '@/lib/api/auth'
 */

// Base client utilities
export {
  apiClient,
  API_BASE_URL,
  ApiError,
  removeToken,
} from './client'
export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  ApiClientOptions,
} from './client'

// Auth
export {
  register,
  login,
  logout,
  getCurrentUser,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} from './auth'
export type {
  AuthUser,
  UserProfile,
  AuthResponse,
  RegisterPayload,
} from './auth'

// Recipes
export {
  getRecipes,
  getRecipeById,
  getRecipesBySkill,
  updateRecipeProgress,
} from './recipes'
export type {
  RecipeFilters,
  Pagination,
  RecipeUserProgress,
  RecipeWithProgress,
  RecipesListResponse,
  RecipeDetailResponse,
  RecipesBySkillResponse,
  UpdateProgressPayload,
  UpdateProgressResponse,
} from './recipes'

// Skills
export { getSkills, getSkillById } from './skills'
export type {
  SkillWithProgress,
  SkillsListResponse,
  SkillDetailData,
  SkillDetailResponse,
} from './skills'

// Progress
export { getProgress, getSkillProgress } from './progress'
export type {
  OverallProgress,
  SkillProgressEntry,
  LevelInfo,
  StreakInfo,
  RecentCompletion,
  ProgressSummary,
  DetailedSkillProgress,
  SkillProgressResponse,
} from './progress'

// Tips
export { getRandomTip, getDailyTip } from './tips'
export type { RandomTipResponse, DailyTipResponse } from './tips'
