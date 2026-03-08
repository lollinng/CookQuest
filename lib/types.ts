export interface StructuredIngredient {
  id: number
  name: string
  category: string | null
  amount: number | null
  unit: string | null
  preparation: string | null
  optional: boolean
  sortOrder: number
  notes: string | null
}

export interface Recipe {
  id: string
  title: string
  description: string
  skill: SkillType
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  time: string
  imageUrl: string
  emoji?: string
  xpReward: number
  ingredients: string[]
  structuredIngredients?: StructuredIngredient[]
  instructions: string[]
  tips?: string[]
  nutritionFacts?: {
    calories: number
    protein: string
    carbs: string
    fat: string
  }
  isFavorited?: boolean
}

export type SkillType = 'basic-cooking' | 'heat-control' | 'flavor-building' | 'air-fryer' | 'indian-cuisine'

export interface Skill {
  id: SkillType
  name: string
  description: string
  icon: string
  recipes: string[] // Recipe IDs
  color: string
}

export interface SkillProgress {
  completed: number
  total: number
  percentage: number
}

export interface RecipeStore {
  completedRecipes: Set<string>
  completionDates: Record<string, string> // recipeId → ISO date string
  toggleRecipeCompletion: (recipeId: string) => void
  completeRecipe: (recipeId: string) => void
  uncompleteRecipe: (recipeId: string) => void
  isRecipeCompleted: (recipeId: string) => boolean
  getSkillProgress: (skillId: SkillType) => SkillProgress
  getOverallProgress: () => SkillProgress
  getStreak: () => number
  completedToday: () => boolean
}

export interface CookingTip {
  id: string
  title: string
  description: string
  category: 'technique' | 'ingredient' | 'tool' | 'safety'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface UserStats {
  level: number
  experience: number
  streak: number
  totalRecipesCompleted: number
  skillsMastered: number
}

// ── Social ──

export interface UserProfile {
  id: number
  uuid: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  followersCount: number
  followingCount: number
  isFollowing?: boolean
  totalRecipesCompleted: number
}

export interface UserPost {
  id: number
  userId: number
  username: string
  displayName: string | null
  avatarUrl: string | null
  postType: 'recipe_completed' | 'photo_upload' | 'milestone'
  recipeId: string | null
  recipeTitle: string | null
  recipeImageUrl: string | null
  photoUrl: string | null
  caption: string | null
  createdAt: string
}

export interface FollowUser {
  id: number
  username: string
  displayName: string | null
  avatarUrl: string | null
  isFollowing?: boolean
}