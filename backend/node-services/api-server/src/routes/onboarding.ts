import { Router, Response } from 'express'
import { body } from 'express-validator'
import { DatabaseService } from '../services/database'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

// GET /api/v1/onboarding/status — Get onboarding state for current user
router.get('/status',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const row = await DatabaseService.get(
      'SELECT preferences, has_completed_onboarding FROM users WHERE id = $1',
      [userId]
    )

    if (!row) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }

    const prefs = typeof row.preferences === 'string' ? JSON.parse(row.preferences) : (row.preferences || {})

    res.json({
      success: true,
      data: {
        hasCompletedOnboarding: row.has_completed_onboarding || false,
        skillLevel: prefs.skill_level || null
      }
    })
  })
)

// POST /api/v1/onboarding/quiz — Save skill level from quiz or direct pick
router.post('/quiz',
  authMiddleware,
  validateRequest([
    body('skillLevel')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('skillLevel must be beginner, intermediate, or advanced')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const { skillLevel } = req.body

    // Merge into existing preferences JSONB
    await DatabaseService.get(
      `UPDATE users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [JSON.stringify({ skill_level: skillLevel }), userId]
    )

    res.json({
      success: true,
      data: { skillLevel }
    })
  })
)

// POST /api/v1/onboarding/complete — Mark onboarding as done
router.post('/complete',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id

    await DatabaseService.get(
      'UPDATE users SET has_completed_onboarding = true, updated_at = NOW() WHERE id = $1 RETURNING id',
      [userId]
    )

    res.json({
      success: true,
      data: { hasCompletedOnboarding: true }
    })
  })
)

export const onboardingRoutes = router
