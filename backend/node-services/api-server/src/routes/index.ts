import { Express } from 'express'

// Import route handlers
import { authRoutes } from './auth'
import { userRoutes } from './users'
import { recipeRoutes } from './recipes'
import { skillRoutes } from './skills'
import { progressRoutes } from './progress'
import { achievementRoutes } from './achievements'
import { sessionRoutes } from './sessions'
import { tipRoutes } from './tips'
import { challengeRoutes } from './challenges'
import { analyticsRoutes } from './analytics'
import { recommendationRoutes } from './recommendations'
import { photoRoutes } from './photos'

export function initializeRoutes(app: Express) {
  // API version prefix
  const apiPrefix = '/api/v1'

  // Public routes (no authentication required)
  app.use(`${apiPrefix}/auth`, authRoutes)
  app.use(`${apiPrefix}/recipes`, recipeRoutes) // Some endpoints public, some protected
  app.use(`${apiPrefix}/skills`, skillRoutes) // Public read access
  app.use(`${apiPrefix}/tips`, tipRoutes) // Public read access

  // Protected routes (authentication required)
  app.use(`${apiPrefix}/users`, userRoutes)
  app.use(`${apiPrefix}/progress`, progressRoutes)
  app.use(`${apiPrefix}/achievements`, achievementRoutes)
  app.use(`${apiPrefix}/sessions`, sessionRoutes)
  app.use(`${apiPrefix}/challenges`, challengeRoutes)
  app.use(`${apiPrefix}/analytics`, analyticsRoutes)
  app.use(`${apiPrefix}/recommendations`, recommendationRoutes)

  // Photos — handles /api/v1/recipes/:id/photos and /api/v1/users/me/photos
  app.use(apiPrefix, photoRoutes)

  // API documentation endpoint
  app.get(`${apiPrefix}`, (req, res) => {
    res.json({
      name: 'CookQuest API',
      version: '1.0.0',
      description: 'Comprehensive cooking education platform API',
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
        users: {
          'GET /users/profile': 'Get user profile',
          'PUT /users/profile': 'Update user profile',
          'GET /users/stats': 'Get user statistics',
          'PUT /users/preferences': 'Update user preferences',
          'DELETE /users/account': 'Delete user account'
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
        achievements: {
          'GET /achievements': 'List all achievements',
          'GET /achievements/user': 'Get user achievements',
          'GET /achievements/:id': 'Get achievement details'
        },
        sessions: {
          'POST /sessions': 'Start cooking session',
          'PUT /sessions/:id': 'Update cooking session',
          'GET /sessions': 'Get user cooking sessions',
          'GET /sessions/:id': 'Get session details'
        },
        tips: {
          'GET /tips': 'Get cooking tips',
          'GET /tips/random': 'Get random tip',
          'GET /tips/daily': 'Get daily tip'
        },
        challenges: {
          'GET /challenges': 'List active challenges',
          'POST /challenges/:id/join': 'Join a challenge',
          'GET /challenges/user': 'Get user challenge progress'
        },
        analytics: {
          'GET /analytics/dashboard': 'Get user dashboard data',
          'GET /analytics/streak': 'Get cooking streak info',
          'GET /analytics/time': 'Get cooking time analytics'
        },
        recommendations: {
          'GET /recommendations/recipes': 'Get personalized recipe recommendations',
          'GET /recommendations/tips': 'Get personalized cooking tips',
          'POST /recommendations/feedback': 'Provide recommendation feedback'
        }
      },
      documentation: `${req.protocol}://${req.get('host')}/api/docs`
    })
  })
}