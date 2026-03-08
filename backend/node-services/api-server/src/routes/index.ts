import { Express } from 'express'

// Import route handlers
import { authRoutes } from './auth'
import { recipeRoutes } from './recipes'
import { skillRoutes } from './skills'
import { progressRoutes } from './progress'
import { tipRoutes } from './tips'
import { photoRoutes } from './photos'
import { ingredientRoutes } from './ingredients'

export function initializeRoutes(app: Express) {
  // API version prefix
  const apiPrefix = '/api/v1'

  // Public routes (no authentication required)
  app.use(`${apiPrefix}/auth`, authRoutes)
  app.use(`${apiPrefix}/recipes`, recipeRoutes) // Some endpoints public, some protected
  app.use(`${apiPrefix}/skills`, skillRoutes) // Public read access
  app.use(`${apiPrefix}/tips`, tipRoutes) // Public read access
  app.use(`${apiPrefix}/ingredients`, ingredientRoutes) // Public read access

  // Protected routes (authentication required)
  app.use(`${apiPrefix}/progress`, progressRoutes)

  // Photos — handles /api/v1/recipes/:id/photos and /api/v1/users/me/photos
  app.use(apiPrefix, photoRoutes)

  // API documentation endpoint
  app.get(`${apiPrefix}`, (req, res) => {
    res.json({
      name: 'CookQuest API',
      version: '1.0.0',
      description: 'Gamified cooking education platform API',
      endpoints: {
        auth: {
          'POST /auth/register': 'Register new user',
          'POST /auth/login': 'User login',
          'POST /auth/logout': 'User logout',
          'POST /auth/refresh': 'Refresh access token',
          'POST /auth/forgot-password': 'Request password reset',
          'POST /auth/reset-password': 'Reset password with token',
          'POST /auth/verify-email': 'Verify email address'
        },
        recipes: {
          'GET /recipes': 'List all recipes (with filters)',
          'GET /recipes/:id': 'Get recipe by ID',
          'POST /recipes': 'Create new recipe (admin)',
          'PUT /recipes/:id': 'Update recipe (admin)',
          'DELETE /recipes/:id': 'Delete recipe (admin)',
          'POST /recipes/:id/review': 'Add recipe review',
          'GET /recipes/:id/reviews': 'Get recipe reviews'
        },
        skills: {
          'GET /skills': 'List all skills',
          'GET /skills/:id': 'Get skill details',
          'GET /skills/:id/recipes': 'Get recipes for skill'
        },
        progress: {
          'GET /progress': 'Get user progress summary',
          'GET /progress/skills': 'Get skill progress',
          'GET /progress/skills/:skillId': 'Get specific skill progress',
          'POST /progress/recipes/:recipeId': 'Update recipe progress',
          'GET /progress/recipes/:recipeId': 'Get recipe progress'
        },
        tips: {
          'GET /tips': 'Get cooking tips',
          'GET /tips/random': 'Get random tip',
          'GET /tips/daily': 'Get daily tip'
        },
        ingredients: {
          'GET /ingredients': 'List all ingredients (with category/search filters)',
          'GET /ingredients/:id': 'Get ingredient with recipes that use it',
          'GET /ingredients/:id/recipes': 'Get recipes using this ingredient'
        }
      },
      documentation: `${req.protocol}://${req.get('host')}/api/docs`
    })
  })
}
