import { Router } from 'express'
import { param } from 'express-validator'
import { DatabaseService } from '../services/database'
import { RedisService } from '../services/redis'
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

// GET /api/v1/skills - List all skills
router.get('/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const cacheKey = 'skills:all'
    const cached = await RedisService.getCachedResponse(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    // Get all skills from database
    const skills = await DatabaseService.getAllSkills()
    
    // If user is authenticated, add their progress for each skill
    let skillsWithProgress = skills
    if (req.user) {
      const userProgress = await DatabaseService.getUserProgress(req.user.id)
      
      skillsWithProgress = await Promise.all(skills.map(async (skill) => {
        const skillRecipes = await DatabaseService.getRecipesBySkill(skill.id)
        const skillRecipeIds = skillRecipes.map(r => r.id)
        
        // Calculate progress for this skill
        const completedInSkill = userProgress.filter(p => 
          skillRecipeIds.includes(p.recipe_id) && p.completed
        ).length
        
        const progress = {
          completed: completedInSkill,
          total: skillRecipeIds.length,
          percentage: skillRecipeIds.length > 0 ? Math.round((completedInSkill / skillRecipeIds.length) * 100) : 0
        }

        return {
          ...skill,
          recipes: skillRecipeIds,
          user_progress: progress
        }
      }))
    } else {
      // For non-authenticated users, just add recipe counts
      skillsWithProgress = await Promise.all(skills.map(async (skill) => {
        const skillRecipes = await DatabaseService.getRecipesBySkill(skill.id)
        return {
          ...skill,
          recipes: skillRecipes.map(r => r.id),
          recipe_count: skillRecipes.length
        }
      }))
    }

    const response = {
      success: true,
      data: {
        skills: skillsWithProgress
      }
    }

    // Cache for 10 minutes
    await RedisService.cacheResponse(cacheKey, response, 600)
    res.json(response)
  })
)

// GET /api/v1/skills/:id - Get specific skill details
router.get('/:id',
  optionalAuth,
  validateRequest([
    param('id').isIn(['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine'])
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params
    
    const skill = await DatabaseService.getSkillById(id)
    if (!skill) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found'
        }
      })
    }

    // Get recipes for this skill
    const recipes = await DatabaseService.getRecipesBySkill(id)

    let skillData = {
      ...skill,
      recipes
    }

    // If user is authenticated, add progress
    if (req.user) {
      const userProgress = await DatabaseService.getUserProgress(req.user.id)
      const skillRecipeIds = recipes.map(r => r.id)
      
      const completedInSkill = userProgress.filter(p => 
        skillRecipeIds.includes(p.recipe_id) && p.completed
      ).length
      
      const progress = {
        completed: completedInSkill,
        total: skillRecipeIds.length,
        percentage: skillRecipeIds.length > 0 ? Math.round((completedInSkill / skillRecipeIds.length) * 100) : 0
      }

      // Add progress to each recipe
      const progressMap = new Map(userProgress.map(p => [p.recipe_id, p]))
      const recipesWithProgress = recipes.map(recipe => ({
        ...recipe,
        user_progress: progressMap.get(recipe.id) || null
      }))

      skillData = {
        ...skill,
        recipes: recipesWithProgress,
        user_progress: progress
      }
    }

    res.json({
      success: true,
      data: {
        skill: skillData
      }
    })
  })
)

export { router as skillRoutes }