import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({ success: true, data: { challenges: [] }, message: 'Challenges endpoint - coming soon' })
})

export { router as challengeRoutes }