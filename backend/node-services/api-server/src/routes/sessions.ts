import { Router } from 'express'

const router = Router()

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ success: true, data: { sessions: [] }, message: 'Sessions endpoint - coming soon' })
})

export { router as sessionRoutes }