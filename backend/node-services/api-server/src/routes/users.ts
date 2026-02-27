import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// All user routes require authentication
router.use(authMiddleware)

// Placeholder routes - to be implemented
router.get('/profile', (req, res) => {
  res.json({ message: 'User profile endpoint - coming soon' })
})

router.put('/profile', (req, res) => {
  res.json({ message: 'Update profile endpoint - coming soon' })
})

export { router as userRoutes }