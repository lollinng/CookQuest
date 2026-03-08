import { Express } from 'express'
import { authMiddleware, allowedMiddleware } from '../middleware/auth'

// Import route handlers
import { authRoutes } from './auth'
import { recipeRoutes } from './recipes'
import { skillRoutes } from './skills'
import { progressRoutes } from './progress'
import { tipRoutes } from './tips'
import { photoRoutes } from './photos'
import { ingredientRoutes } from './ingredients'
import { favoriteRoutes } from './favorites'
import { socialRoutes } from './social'
import { adminRoutes } from './admin'

export function initializeRoutes(app: Express) {
  // API version prefix
  const apiPrefix = '/api/v1'

  // Public routes (no authentication required, no alpha gate)
  app.use(`${apiPrefix}/auth`, authRoutes)
  app.use(`${apiPrefix}/recipes`, recipeRoutes) // Some endpoints public, some protected
  app.use(`${apiPrefix}/skills`, skillRoutes) // Public read access
  app.use(`${apiPrefix}/tips`, tipRoutes) // Public read access
  app.use(`${apiPrefix}/ingredients`, ingredientRoutes) // Public read access

  // Admin routes (auth + admin gate, handled inside admin.ts)
  app.use(`${apiPrefix}/admin`, adminRoutes)

  // Protected routes (authentication + alpha access required)
  // authMiddleware runs first to populate req.user, then allowedMiddleware checks isAllowed
  // (progress routes also apply authMiddleware internally — double-call is a safe no-op)
  app.use(`${apiPrefix}/progress`, authMiddleware, allowedMiddleware, progressRoutes)

  // Photos — handles /api/v1/recipes/:id/photos and /api/v1/users/me/photos
  app.use(apiPrefix, photoRoutes)

  // Favorites — handles /api/v1/recipes/:id/favorite and /api/v1/users/me/favorites
  app.use(apiPrefix, favoriteRoutes)

  // Social — handles /api/v1/users/:id/follow, followers, following, search, profile
  app.use(apiPrefix, socialRoutes)

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
        },
        favorites: {
          'POST /recipes/:id/favorite': 'Add recipe to favorites (auth required)',
          'DELETE /recipes/:id/favorite': 'Remove recipe from favorites (auth required)',
          'GET /users/me/favorites': 'List favorited recipes (auth required)'
        },
        social: {
          'POST /users/:id/follow': 'Follow a user (auth required)',
          'DELETE /users/:id/follow': 'Unfollow a user (auth required)',
          'GET /users/:id/followers': 'List user followers (public, auth adds isFollowing)',
          'GET /users/:id/following': 'List who user follows (public, auth adds isFollowing)',
          'GET /users/search?q=term': 'Search users by name/username (public)',
          'GET /users/:id': 'Get user public profile (public, auth adds isFollowing)',
          'GET /feed': 'Activity feed from followed users (auth required, top 5)',
          'POST /posts': 'Create a post (auth required)',
          'GET /users/:id/posts': 'User recent posts (public, limit 10)'
        }
      },
      documentation: `${req.protocol}://${req.get('host')}/api/docs`
    })
  })
}
