import { Router } from 'express'
import { param, query } from 'express-validator'
import { DatabaseService } from '../services/database'
import { RedisService } from '../services/redis'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

const VALID_CATEGORIES = ['protein', 'dairy', 'produce', 'grain', 'spice', 'herb', 'oil', 'seasoning', 'sauce', 'baking', 'other']

// GET /api/v1/ingredients - List all ingredients with optional filters
router.get('/',
  validateRequest([
    query('category').optional().isIn(VALID_CATEGORIES),
    query('search').optional().isString().isLength({ max: 100 }).trim()
  ]),
  asyncHandler(async (req, res) => {
    const { category, search } = req.query
    const cacheKey = `ingredients:list:${category || 'all'}:${search || ''}`

    const cached = await RedisService.getCachedResponse(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    let ingredients
    if (search) {
      ingredients = await DatabaseService.searchIngredients(search as string)
    } else if (category) {
      ingredients = await DatabaseService.getIngredientsByCategory(category as string)
    } else {
      ingredients = await DatabaseService.getAllIngredients()
    }

    const response = {
      success: true,
      data: {
        ingredients,
        total: ingredients.length
      }
    }

    await RedisService.cacheResponse(cacheKey, response, 600) // 10 minutes
    res.json(response)
  })
)

// GET /api/v1/ingredients/:id - Get single ingredient with recipes that use it
router.get('/:id',
  validateRequest([
    param('id').isInt({ min: 1 })
  ]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const cacheKey = `ingredients:detail:${id}`

    const cached = await RedisService.getCachedResponse(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    const ingredient = await DatabaseService.getIngredientById(id)
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: { message: 'Ingredient not found' }
      })
    }

    const recipes = await DatabaseService.getRecipesByIngredientId(id)

    const response = {
      success: true,
      data: {
        ingredient,
        recipes
      }
    }

    await RedisService.cacheResponse(cacheKey, response, 600) // 10 minutes
    res.json(response)
  })
)

// GET /api/v1/ingredients/:id/recipes - Get recipes that use this ingredient
router.get('/:id/recipes',
  validateRequest([
    param('id').isInt({ min: 1 })
  ]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)

    const ingredient = await DatabaseService.getIngredientById(id)
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: { message: 'Ingredient not found' }
      })
    }

    const recipes = await DatabaseService.getRecipesByIngredientId(id)

    res.json({
      success: true,
      data: { recipes }
    })
  })
)

export { router as ingredientRoutes }
