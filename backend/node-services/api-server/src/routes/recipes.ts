import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { DatabaseService } from '../services/database'
import { RedisService } from '../services/redis'
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

// GET /api/v1/recipes - List all recipes with optional filters
router.get('/', 
  optionalAuth,
  validateRequest([
    query('skill').optional().isIn(['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine']),
    query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('sort').optional().matches(/^-?(title|difficulty|time|xp)$/).withMessage('sort must be one of: title, -title, difficulty, -difficulty, time, -time, xp, -xp'),
    query('search').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('search must be 1-100 characters'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { skill, difficulty, sort, search, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // Build cache key
    const cacheKey = `recipes:${skill || 'all'}:${difficulty || 'all'}:${sort || 'title'}:${search || ''}:${page}:${limit}`

    // Try to get from cache first
    const cached = await RedisService.getCachedResponse(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    let recipes = await DatabaseService.getAllRecipes()

    // Apply filters
    if (skill) {
      recipes = recipes.filter(recipe => recipe.skill === skill)
    }

    if (difficulty) {
      recipes = recipes.filter(recipe => recipe.difficulty === difficulty)
    }

    // Apply search filter
    if (search) {
      const q = (search as string).toLowerCase()
      recipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(q) ||
        recipe.description.toLowerCase().includes(q)
      )
    }

    // Apply sorting
    const DIFFICULTY_ORDER: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 }
    function parseTime(t: string): number {
      const m = t.match(/(\d+)\s*(min|hour|h)/i)
      if (!m) return 0
      return m[2].startsWith('h') ? Number(m[1]) * 60 : Number(m[1])
    }

    const sortParam = (sort as string) || 'title'
    const desc = sortParam.startsWith('-')
    const field = sortParam.replace(/^-/, '')
    recipes.sort((a, b) => {
      let cmp = 0
      switch (field) {
        case 'title': cmp = a.title.localeCompare(b.title); break
        case 'difficulty': cmp = (DIFFICULTY_ORDER[a.difficulty] || 0) - (DIFFICULTY_ORDER[b.difficulty] || 0); break
        case 'time': cmp = parseTime(a.time) - parseTime(b.time); break
        case 'xp': cmp = (a.xp_reward || 100) - (b.xp_reward || 100); break
      }
      return desc ? -cmp : cmp
    })

    // Pagination
    const total = recipes.length
    const paginatedRecipes = recipes.slice(offset, offset + Number(limit))

    // If user is authenticated, add their progress
    let recipesWithProgress = paginatedRecipes
    if (req.user) {
      const userProgress = await DatabaseService.getUserProgress(req.user.id)
      const progressMap = new Map(userProgress.map(p => [p.recipe_id, p]))
      
      recipesWithProgress = paginatedRecipes.map(recipe => ({
        ...recipe,
        user_progress: progressMap.get(recipe.id) || null
      }))
    }

    const response = {
      success: true,
      data: {
        recipes: recipesWithProgress,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    }

    // Cache for 5 minutes
    await RedisService.cacheResponse(cacheKey, response, 300)
    
    res.json(response)
  })
)

// GET /api/v1/recipes/:id - Get recipe by ID
router.get('/:id',
  optionalAuth,
  validateRequest([
    param('id').matches(/^[a-z0-9][a-z0-9-]{2,49}$/).withMessage('Invalid recipe ID format')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params
    
    const recipe = await DatabaseService.getRecipeById(id)
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recipe not found'
        }
      })
    }

    let recipeWithProgress: Record<string, any> = recipe
    if (req.user) {
      const progress = await DatabaseService.getRecipeProgress(req.user.id, id)
      recipeWithProgress = {
        ...recipe,
        user_progress: progress
      }
    }

    res.json({
      success: true,
      data: {
        recipe: recipeWithProgress
      }
    })
  })
)

// POST /api/v1/recipes/:id/progress - Update recipe progress (requires auth)
router.post('/:id/progress',
  authMiddleware,
  validateRequest([
    param('id').matches(/^[a-z0-9][a-z0-9-]{2,49}$/).withMessage('Invalid recipe ID format'),
    body('completed').isBoolean().withMessage('completed must be a boolean'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Notes must be under 1000 characters')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params
    const { completed, rating, notes } = req.body
    const userId = req.user!.id

    // Check if recipe exists
    const recipe = await DatabaseService.getRecipeById(id)
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recipe not found'
        }
      })
    }

    // Check if already completed (to detect new vs re-completion)
    const existingProgress = await DatabaseService.getRecipeProgress(userId, id)
    const wasAlreadyCompleted = existingProgress?.completed === true

    const progressData: any = {
      completed
    }

    if (completed) {
      progressData.completed_at = new Date().toISOString()
    }

    if (rating !== undefined) {
      progressData.rating = rating
    }

    if (notes !== undefined) {
      progressData.notes = notes
    }

    await DatabaseService.updateRecipeProgress(userId, id, progressData)

    // Get updated progress
    const updatedProgress = await DatabaseService.getRecipeProgress(userId, id)

    // Check for newly unlocked skills (only on NEW completions)
    let skills_unlocked: any[] = []
    if (completed && !wasAlreadyCompleted) {
      skills_unlocked = await DatabaseService.getNewlyUnlockedSkills(userId, recipe.skill)
    }

    const xp_earned = completed && !wasAlreadyCompleted ? (recipe.xp_reward || 100) : 0

    // Compute full user state for the response
    const allUserProgress = await DatabaseService.getUserProgress(userId)
    const totalCompleted = allUserProgress.filter(p => p.completed).length
    const totalXP = totalCompleted * 100 // simplified: 100 XP per recipe
    const level = Math.floor(totalXP / 1000) + 1
    const currentLevelXP = (level - 1) * 1000
    const nextLevelXP = level * 1000

    // Check if this completion caused a level-up
    const prevTotalCompleted = wasAlreadyCompleted ? totalCompleted : totalCompleted - 1
    const prevTotalXP = prevTotalCompleted * 100
    const prevLevel = Math.floor(prevTotalXP / 1000) + 1
    const level_up = level > prevLevel ? { new_level: level, previous_level: prevLevel } : null

    // Compute streak from completion dates
    const completionDates = allUserProgress
      .filter(p => p.completed && p.completed_at)
      .map(p => new Date(p.completed_at!).toISOString().split('T')[0])
    const uniqueDates = [...new Set(completionDates)].sort().reverse()

    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      streak = 1
      let checkDate = uniqueDates.includes(today) ? today : yesterday
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(new Date(checkDate).getTime() - 86400000).toISOString().split('T')[0]
        if (uniqueDates.includes(prevDate)) {
          streak++
          checkDate = prevDate
        } else {
          break
        }
      }
    }

    // Compute skill progress for this recipe's skill
    const skillRecipes = await DatabaseService.getRecipesBySkill(recipe.skill)
    const skillRecipeIds = new Set(skillRecipes.map(r => r.id))
    const skillCompleted = allUserProgress.filter(p => p.completed && skillRecipeIds.has(p.recipe_id)).length

    res.json({
      success: true,
      data: {
        recipe_id: id,
        already_completed: wasAlreadyCompleted,
        progress: updatedProgress,
        xp_earned,
        user: {
          level,
          current_xp: totalXP - currentLevelXP,
          xp_to_next_level: nextLevelXP - currentLevelXP,
          total_xp: totalXP,
          streak_days: streak,
          total_recipes_completed: totalCompleted,
        },
        skill_progress: {
          skill_id: recipe.skill,
          completed: skillCompleted,
          total: skillRecipes.length,
          percentage: skillRecipes.length > 0 ? Math.round((skillCompleted / skillRecipes.length) * 100) : 0,
        },
        level_up,
        skills_unlocked: skills_unlocked.map(s => ({
          id: s.id,
          name: s.name,
          icon: s.icon,
          color: s.color,
        })),
        streak_updated: !wasAlreadyCompleted && streak > 0,
      }
    })
  })
)

// GET /api/v1/recipes/skill/:skillId - Get recipes by skill
router.get('/skill/:skillId',
  optionalAuth,
  validateRequest([
    param('skillId').isIn(['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine'])
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { skillId } = req.params
    
    const cacheKey = `recipes:skill:${skillId}`
    const cached = await RedisService.getCachedResponse(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    const recipes = await DatabaseService.getRecipesBySkill(skillId)

    let recipesWithProgress = recipes
    if (req.user) {
      const userProgress = await DatabaseService.getUserProgress(req.user.id)
      const progressMap = new Map(userProgress.map(p => [p.recipe_id, p]))
      
      recipesWithProgress = recipes.map(recipe => ({
        ...recipe,
        user_progress: progressMap.get(recipe.id) || null
      }))
    }

    const response = {
      success: true,
      data: {
        skill: skillId,
        recipes: recipesWithProgress,
        total: recipesWithProgress.length
      }
    }

    await RedisService.cacheResponse(cacheKey, response, 600) // Cache for 10 minutes
    res.json(response)
  })
)

export { router as recipeRoutes }