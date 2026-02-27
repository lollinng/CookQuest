import { Router } from 'express'

const router = Router()

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ success: true, data: { achievements: [] }, message: 'Achievements endpoint - coming soon' })
})

export { router as achievementRoutes }