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
import { onboardingRoutes } from './onboarding'
import { demoRoutes } from './demo'
import { uploadRoutes } from './uploads'
import { progressionRoutes } from './progression'
import { appealRoutes } from './appeals'

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

  // Onboarding routes (auth required)
  app.use(`${apiPrefix}/onboarding`, authMiddleware, onboardingRoutes)

  // Demo routes (public, no auth required)
  app.use(`${apiPrefix}/demo`, demoRoutes)

  // Uploads — general photo upload (auth handled inside route)
  app.use(`${apiPrefix}/uploads`, uploadRoutes)

  // Protected routes (authentication + alpha access required)
  app.use(`${apiPrefix}/progress`, authMiddleware, allowedMiddleware, progressRoutes)

  // Photos — handles /api/v1/recipes/:id/photos and /api/v1/users/me/photos
  app.use(apiPrefix, photoRoutes)

  // Appeals — handles /api/v1/photos/appeals/*, /api/v1/admin/appeals/*, /api/v1/admin/verification-stats
  app.use(apiPrefix, appealRoutes)

  // Favorites — handles /api/v1/recipes/:id/favorite and /api/v1/users/me/favorites
  app.use(apiPrefix, favoriteRoutes)

  // Progression — handles /api/v1/progression/overview and /api/v1/progression/skills/:skillId
  app.use(`${apiPrefix}/progression`, authMiddleware, progressionRoutes)

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
          'POST /recipes/:id/progress': 'Update recipe progress (auth required)',
          'GET /recipes/skill/:skillId': 'Get recipes by skill'
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
          'GET /feed?limit=N': 'Activity feed from followed users (auth required, default 30, max 50)',
          'POST /posts': 'Create a post (auth required)',
          'GET /users/:id/posts': 'User recent posts (public, limit 10)',
          'POST /posts/:postId/comments': 'Add a comment to a post (auth required)',
          'GET /posts/:postId/comments': 'Get comments for a post (auth required)',
          'DELETE /posts/:postId/comments/:commentId': 'Delete own comment (auth required)',
          'GET /users/:id/skill-trophies': 'Get user skill completion trophies (public)',
          'PATCH /users/me/avatar': 'Upload or replace profile avatar (auth required)',
          'DELETE /users/me/avatar': 'Remove profile avatar (auth required)'
        }
      },
      documentation: `${req.protocol}://${req.get('host')}/api/docs`
    })
  })
}
