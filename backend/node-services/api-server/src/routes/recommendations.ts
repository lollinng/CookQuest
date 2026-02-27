import { Router } from 'express'

const router = Router()

router.get('/recipes', (req, res) => {
  res.json({ success: true, data: { recommendations: [] }, message: 'Recommendations endpoint - coming soon' })
})

export { router as recommendationRoutes }