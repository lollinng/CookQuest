import { Router } from 'express'
import { query } from 'express-validator'
import { DatabaseService } from '../services/database'
import { RedisService } from '../services/redis'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

// GET /api/v1/tips - Get cooking tips with optional filters
router.get('/',
  validateRequest([
    query('type').optional().isIn(['tip', 'joke', 'fact']),
    query('skill').optional().isIn(['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine']),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ]),
  asyncHandler(async (req, res) => {
    const { type, limit = 10 } = req.query

    const whereConditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (type) {
      // Map old type values to category — only allow known values (already validated above)
      const categoryMap: Record<string, string> = { joke: 'general', fact: 'general', tip: 'technique' }
      const mappedCategory = categoryMap[type as string]
      if (mappedCategory) {
        whereConditions.push(`category = $${paramIndex++}`)
        params.push(mappedCategory)
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50)

    const tips = await DatabaseService.all(`
      SELECT * FROM cooking_tips
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT $${paramIndex}
    `, [...params, safeLimit])

    res.json({
      success: true,
      data: {
        tips,
        total: tips.length
      }
    })
  })
)

// GET /api/v1/tips/random - Get a single random tip
router.get('/random',
  validateRequest([
    query('type').optional().isIn(['tip', 'joke', 'fact'])
  ]),
  asyncHandler(async (req, res) => {
    const { type } = req.query

    const tip = await DatabaseService.getRandomTip(type as string)

    if (!tip) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No tips found'
        }
      })
    }

    res.json({
      success: true,
      data: {
        tip
      }
    })
  })
)

// GET /api/v1/tips/daily - Get daily tip (consistent for the day)
router.get('/daily',
  asyncHandler(async (req, res) => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const cacheKey = `tips:daily:${today}`
    
    const cached = await RedisService.getCachedResponse(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    // Use date as seed for consistent daily tip
    const dayNumber = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24))
    
    const tips = await DatabaseService.all('SELECT id, content, category AS type FROM cooking_tips WHERE is_active = TRUE ORDER BY id')
    if (tips.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No tips available'
        }
      })
    }

    const dailyTip = tips[dayNumber % tips.length]

    const response = {
      success: true,
      data: {
        tip: dailyTip,
        date: today
      }
    }

    // Cache until end of day
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const secondsUntilEndOfDay = Math.floor((endOfDay.getTime() - now.getTime()) / 1000)
    
    await RedisService.cacheResponse(cacheKey, response, secondsUntilEndOfDay)
    res.json(response)
  })
)

export { router as tipRoutes }