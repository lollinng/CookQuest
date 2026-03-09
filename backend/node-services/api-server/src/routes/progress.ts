import { Router } from 'express'
import { param } from 'express-validator'
import { DatabaseService } from '../services/database'
import { AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'
import { calculateUserLevel, calculateSkillProgress } from '../utils/progression-helpers'
import { VALID_SKILL_IDS, RECIPE_ID_REGEX } from '../constants'

const router = Router()

// GET /api/v1/progress - Get user's overall progress summary
router.get('/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userProgress = await DatabaseService.getUserProgress(req.user!.id)
    const allRecipes = await DatabaseService.getAllRecipes()
    
    // Calculate overall progress
    const completed = userProgress.filter(p => p.completed).length
    const total = allRecipes.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    // Calculate skill-specific progress
    const skills = await DatabaseService.getAllSkills()
    const skillProgress = await Promise.all(skills.map(async (skill) => {
      const skillRecipes = await DatabaseService.getRecipesBySkill(skill.id)
      const skillRecipeIds = skillRecipes.map(r => r.id)
      const progress = calculateSkillProgress(userProgress, skillRecipeIds)

      return {
        skill_id: skill.id,
        skill_name: skill.name,
        ...progress,
      }
    }))

    // Calculate level and XP from xp_actions table
    const xp = await DatabaseService.getUserTotalXP(req.user!.id)
    const { level, progressInLevel: experience, nextLevelXP, currentLevelXP } = calculateUserLevel(xp)
    const nextLevelAt = nextLevelXP - currentLevelXP

    // Calculate streak (simplified - count consecutive days with completed recipes)
    const recentCompletions = userProgress
      .filter(p => p.completed && p.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

    let streak = 0
    if (recentCompletions.length > 0) {
      // Simple streak calculation - this could be enhanced
      const today = new Date()
      const lastCompletion = new Date(recentCompletions[0].completed_at!)
      const diffDays = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 1) {
        streak = 1 // At least 1 day streak
        // Could implement more sophisticated streak calculation here
      }
    }

    // Get unlocked skills based on user progress
    const unlockedSkills = await DatabaseService.getUnlockedSkillsForUser(req.user!.id)
    const unlockedSkillIds = unlockedSkills.map(s => s.id)

    res.json({
      success: true,
      data: {
        overall: {
          completed,
          total,
          percentage
        },
        skills: skillProgress,
        level: {
          current: level,
          experience,
          next_level_at: nextLevelAt,
          total_xp: xp
        },
        streak: {
          days: streak
        },
        recent_completions: recentCompletions.slice(0, 5).map(p => ({
          recipe_id: p.recipe_id,
          completed_at: p.completed_at,
          rating: p.rating
        })),
        unlocked_skills: unlockedSkillIds
      }
    })
  })
)

// GET /api/v1/progress/skills - Get detailed skill progress
router.get('/skills',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userProgress = await DatabaseService.getUserProgress(req.user!.id)
    const skills = await DatabaseService.getAllSkills()
    
    const detailedSkillProgress = await Promise.all(skills.map(async (skill) => {
      const skillRecipes = await DatabaseService.getRecipesBySkill(skill.id)
      const skillRecipeIds = skillRecipes.map(r => r.id)
      const progressMap = new Map(userProgress.map(p => [p.recipe_id, p]))

      const recipesWithProgress = skillRecipes.map(recipe => ({
        ...recipe,
        user_progress: progressMap.get(recipe.id) || {
          completed: false,
          rating: null,
          completed_at: null,
          notes: null
        }
      }))

      return {
        skill: skill,
        progress: calculateSkillProgress(userProgress, skillRecipeIds),
        recipes: recipesWithProgress
      }
    }))

    res.json({
      success: true,
      data: {
        skills: detailedSkillProgress
      }
    })
  })
)

// GET /api/v1/progress/skills/:skillId - Get specific skill progress
router.get('/skills/:skillId',
  validateRequest([
    param('skillId').isIn([...VALID_SKILL_IDS])
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { skillId } = req.params
    
    const skill = await DatabaseService.getSkillById(skillId)
    if (!skill) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found'
        }
      })
    }

    const userProgress = await DatabaseService.getUserProgress(req.user!.id)
    const skillRecipes = await DatabaseService.getRecipesBySkill(skillId)
    const progressMap = new Map(userProgress.map(p => [p.recipe_id, p]))
    
    const recipesWithProgress = skillRecipes.map(recipe => ({
      ...recipe,
      user_progress: progressMap.get(recipe.id) || {
        completed: false,
        rating: null,
        completed_at: null,
        notes: null
      }
    }))
    
    const completedInSkill = recipesWithProgress.filter(r => r.user_progress.completed).length
    
    res.json({
      success: true,
      data: {
        skill: skill,
        progress: {
          completed: completedInSkill,
          total: skillRecipes.length,
          percentage: skillRecipes.length > 0 ? Math.round((completedInSkill / skillRecipes.length) * 100) : 0
        },
        recipes: recipesWithProgress
      }
    })
  })
)

// GET /api/v1/progress/recipes/:recipeId - Get specific recipe progress
router.get('/recipes/:recipeId',
  validateRequest([
    param('recipeId').matches(RECIPE_ID_REGEX).withMessage('Invalid recipe ID format')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { recipeId } = req.params
    
    // Check if recipe exists
    const recipe = await DatabaseService.getRecipeById(recipeId)
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recipe not found'
        }
      })
    }

    const progress = await DatabaseService.getRecipeProgress(req.user!.id, recipeId)

    res.json({
      success: true,
      data: {
        recipe_id: recipeId,
        progress: progress || {
          completed: false,
          rating: null,
          completed_at: null,
          notes: null
        }
      }
    })
  })
)

export { router as progressRoutes }