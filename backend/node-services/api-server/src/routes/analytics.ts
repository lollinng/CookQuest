import { Router } from 'express'

const router = Router()

router.get('/dashboard', (req, res) => {
  res.json({ success: true, data: { analytics: {} }, message: 'Analytics endpoint - coming soon' })
})

export { router as analyticsRoutes }