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

// ── Photos ──

export interface RecipePhoto {
  id: number
  recipeId: string
  photoUrl: string
  photoNumber: number
  uploadedAt: string
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
  photos: string[]
  caption: string | null
  commentsCount: number
  likesCount: number
  isLiked: boolean
  createdAt: string
}

export interface PostComment {
  id: number
  postId: number
  userId: number
  username: string
  displayName: string | null
  avatarUrl: string | null
  content: string
  createdAt: string
  likesCount: number
  isLiked: boolean
}

export interface SkillTrophy {
  skillId: string
  skillName: string
  icon: string
  color: string
  completed: number
  total: number
  percentage: number
  mastered: boolean
}

export interface LeaderboardEntry {
  rank: number
  id: number
  username: string
  displayName: string | null
  avatarUrl: string | null
  recipesCompleted: number
}

export interface FollowUser {
  id: number
  username: string
  displayName: string | null
  avatarUrl: string | null
  isFollowing?: boolean
}

export interface Notification {
  id: number
  userId: number
  actorId: number
  actorUsername: string
  actorDisplayName: string | null
  actorAvatarUrl: string | null
  type: 'follow' | 'post_like' | 'comment' | 'comment_like'
  postId: number | null
  postCaption: string | null
  isRead: boolean
  createdAt: string
}

// ── Progression / Recipe Gating ──

export interface RecipeGatingStatus {
  recipeId: string
  isUnlocked: boolean
  unlockReason?: string
}

export interface SkillProgression {
  skillId: SkillType
  totalRecipes: number
  unlockedCount: number
  photosPosted: number
  photosNeededForNextUnlock: number
  photosNeededForNextSkill: number
  nextUnlockAt: number
  recipes: RecipeGatingStatus[]
}

export interface Badge {
  key: string
  name: string
  emoji: string
  earnedAt: string | null
  earned: boolean
}

export interface PostRatings {
  tasteRating: number
  difficultyRating: number
}

// ── Photo Verification ──

export interface PhotoVerification {
  verdict: 'accepted' | 'marginal' | 'rejected'
  score: number
  maxScore: number
  xpAwarded: number
  feedback: string
  tips?: string[]
  canAppeal?: boolean
}

export interface RecipePhotoUploadResponse {
  photo_url: string
  recipe_id: string
  photo_number: number
  newUnlocks: Array<{ id: string; title: string }>
  newBadges: Array<{ badge_key: string; badge_name: string; badge_emoji: string }>
  verification?: PhotoVerification
}