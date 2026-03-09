import { Router } from 'express'
import { param } from 'express-validator'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'
import { DatabaseService } from '../services/database'

const router = Router()

const VALID_SKILLS = ['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine']

// GET /api/v1/progression/overview — All skills with unlock status
router.get('/overview',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const overview = await DatabaseService.getProgressionOverview(userId)

    res.json({
      success: true,
      data: { skills: overview },
    })
  })
)

// GET /api/v1/progression/skills/:skillId — Single skill progression detail
router.get('/skills/:skillId',
  authMiddleware,
  validateRequest([
    param('skillId').isIn(VALID_SKILLS),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const { skillId } = req.params
    const progression = await DatabaseService.getSkillProgression(userId, skillId)

    res.json({
      success: true,
      data: { progression },
    })
  })
)

// GET /api/v1/progression/badges — User's earned badges
router.get('/badges',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const badges = await DatabaseService.getUserBadges(userId)

    res.json({
      success: true,
      data: { badges },
    })
  })
)

// GET /api/v1/progression/badges/available — All badges with earned status
router.get('/badges/available',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const badges = await DatabaseService.getAllBadgeDefinitions(userId)

    res.json({
      success: true,
      data: { badges },
    })
  })
)

// GET /api/v1/progression/xp — User's total XP
router.get('/xp',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const totalXP = await DatabaseService.getUserTotalXP(userId)
    const level = Math.floor(totalXP / 1000) + 1

    res.json({
      success: true,
      data: {
        totalXP,
        level,
        currentLevelXP: totalXP - (level - 1) * 1000,
        xpToNextLevel: level * 1000 - totalXP,
      },
    })
  })
)

// GET /api/v1/progression/leaderboard/weekly — Weekly leaderboard
router.get('/leaderboard/weekly',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 50)
    const rows = await DatabaseService.getWeeklyLeaderboard(limit)

    res.json({
      success: true,
      data: rows.map((r: any, i: number) => ({
        rank: i + 1,
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        dishesThisWeek: r.dishes_this_week,
        xpThisWeek: r.xp_this_week,
      })),
    })
  })
)

// GET /api/v1/progression/engagement — Engagement notifications data
router.get('/engagement',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const notifications = await DatabaseService.getEngagementNotifications(userId)

    res.json({
      success: true,
      data: { notifications },
    })
  })
)

export { router as progressionRoutes }
