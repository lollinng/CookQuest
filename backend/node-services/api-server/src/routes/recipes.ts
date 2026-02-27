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
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { skill, difficulty, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    
    // Build cache key
    const cacheKey = `recipes:${skill || 'all'}:${difficulty || 'all'}:${page}:${limit}`
    
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

    await DatabaseService.updateRecipeProgress(req.user!.id, id, progressData)

    // Get updated progress
    const updatedProgress = await DatabaseService.getRecipeProgress(req.user!.id, id)

    res.json({
      success: true,
      data: {
        progress: updatedProgress
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