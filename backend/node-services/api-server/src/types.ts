// Shared backend type definitions

export interface DbRecipe {
  id: string
  title: string
  description: string
  skill: string
  difficulty: string
  time: string
  image_url: string
  emoji: string | null
  xp_reward: number
  ingredients: string[]
  structured_ingredients: DbStructuredIngredient[]
  instructions: string[]
  tips: string[]
  nutrition_facts: Record<string, unknown> | null
  sort_order: number
}

export interface DbStructuredIngredient {
  id: number
  name: string
  category: string | null
  amount: number | null
  unit: string | null
  preparation: string | null
  optional: boolean
  sort_order: number
  notes: string | null
}

export interface DbUserProgress {
  user_id: number
  recipe_id: string
  completed: boolean
  completed_at: string | null
  notes: string | null
  rating: number | null
}

export interface DbSkill {
  id: string
  name: string
  description: string
  icon: string
  color: string
  initial_free_recipes: number
  recipes_per_unlock: number
  photos_to_unlock_next: number
}

export interface DbUser {
  id: number
  email: string
  username: string
  password_hash: string
  profile: Record<string, unknown>
  preferences: Record<string, unknown>
  is_allowed: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface RecipeProgressData {
  completed: boolean
  completed_at?: string
  rating?: number
  notes?: string
}

export interface RecipeWithProgress extends DbRecipe {
  user_progress: DbUserProgress | null
  is_favorited?: boolean
}

export interface LeaderboardRow {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  dishes_this_week: number
  xp_this_week: number
}

export interface SkillUnlock {
  id: string
  name: string
  icon: string
  color: string
}
