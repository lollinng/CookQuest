import { Router, Response } from 'express'
import { param } from 'express-validator'
import { DatabaseService } from '../services/database'
import { RedisService } from '../services/redis'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

const recipeIdValidation = param('id')
  .matches(/^[a-z0-9][a-z0-9-]{2,49}$/)
  .withMessage('Invalid recipe ID format')

// POST /api/v1/recipes/:id/favorite — Add to favorites (idempotent)
router.post('/recipes/:id/favorite',
  authMiddleware,
  validateRequest([recipeIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const recipeId = req.params.id

    // Verify recipe exists
    const recipe = await DatabaseService.getRecipeById(recipeId)
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: { message: 'Recipe not found' }
      })
    }

    await DatabaseService.addFavorite(userId, recipeId)
    await RedisService.deleteByPattern('recipes:*')

    res.json({
      success: true,
      data: { favorited: true, recipe_id: recipeId }
    })
  })
)

// DELETE /api/v1/recipes/:id/favorite — Remove from favorites (idempotent)
router.delete('/recipes/:id/favorite',
  authMiddleware,
  validateRequest([recipeIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const recipeId = req.params.id

    await DatabaseService.removeFavorite(userId, recipeId)
    await RedisService.deleteByPattern('recipes:*')

    res.json({
      success: true,
      data: { favorited: false, recipe_id: recipeId }
    })
  })
)

// GET /api/v1/users/me/favorites — List user's favorited recipes
router.get('/users/me/favorites',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id

    const favorites = await DatabaseService.getUserFavorites(userId)

    res.json({
      success: true,
      data: {
        recipes: favorites,
        total: favorites.length
      }
    })
  })
)

export { router as favoriteRoutes }
