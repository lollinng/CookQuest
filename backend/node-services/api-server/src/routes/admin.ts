import { Router } from 'express'
import { DatabaseService } from '../services/database'
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

// GET /api/v1/admin/users — list all users
router.get('/users',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const users = await DatabaseService.getAllUsers()
    res.json({ success: true, data: { users } })
  })
)

// PATCH /api/v1/admin/users/:id/allow — toggle is_allowed
router.patch('/users/:id/allow',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = parseInt(req.params.id)
    const { is_allowed } = req.body
    if (typeof is_allowed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { message: 'is_allowed must be a boolean' }
      })
    }
    await DatabaseService.setUserAllowed(userId, is_allowed)
    res.json({ success: true, data: { userId, is_allowed } })
  })
)

export { router as adminRoutes }
