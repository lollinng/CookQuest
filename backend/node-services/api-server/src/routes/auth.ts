import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { DatabaseService } from '../services/database'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler, APIError } from '../middleware/error-handler'
import { logger } from '../services/logger'

const COOKIE_NAME = 'cookquest_token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}

const router = Router()

// Strict rate limiter for auth endpoints — 5 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path, email: req.body?.email }, 'Auth rate limit exceeded')
    res.status(429).json(options.message)
  },
})

// Generate JWT token
const generateToken = (user: { id: number; email: string; username: string }): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured')
  }

  const options: jwt.SignOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'cookquest-api',
    audience: 'cookquest-web',
    algorithm: 'HS256',
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username
    },
    process.env.JWT_SECRET,
    options
  )
}

// POST /api/v1/auth/register
router.post('/register',
  authLimiter,
  validateRequest([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-30 characters, alphanumeric, underscore, or dash only'),
    body('displayName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Display name must be less than 100 characters')
  ]),
  asyncHandler(async (req, res) => {
    const { email, password, username, displayName } = req.body

    // Check if user already exists
    const existingUserByEmail = await DatabaseService.getUserByEmail(email)
    if (existingUserByEmail) {
      throw new APIError('Email already registered', 409)
    }

    const existingUserByUsername = await DatabaseService.getUserByUsername(username)
    if (existingUserByUsername) {
      throw new APIError('Username already taken', 409)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user with profile
    const profile = {
      display_name: displayName || username,
      dietary_preferences: [],
      skill_level: 'beginner' as const
    }

    // Wrap user creation + session insert in a transaction
    const { user, token } = await DatabaseService.transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (email, username, password_hash, preferences)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, password_hash, preferences as profile, created_at, updated_at`,
        [email, username, passwordHash, JSON.stringify(profile)]
      )
      const newUser = { ...rows[0], profile: rows[0].profile || {} }

      const tkn = generateToken(newUser)
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 days
      await client.query(
        'INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
        [newUser.id, tkn, expiresAt, req.ip || null, req.get('User-Agent') || null]
      )

      return { user: newUser, token: tkn }
    })

    setAuthCookie(res, token)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profile: user.profile
        },
        token // Still returned for backward compatibility
      }
    })
  })
)

// POST /api/v1/auth/login
router.post('/login',
  authLimiter,
  validateRequest([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ]),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Get user by email
    const user = await DatabaseService.getUserByEmail(email)
    if (!user) {
      throw new APIError('Invalid credentials', 401)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      throw new APIError('Invalid credentials', 401)
    }

    // Generate token
    const token = generateToken(user)

    // Create session with IP and user-agent tracking
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 days
    await DatabaseService.all(
      'INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [user.id, token, expiresAt, req.ip || null, req.get('User-Agent') || null]
    )

    setAuthCookie(res, token)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profile: user.profile
        },
        token // Still returned for backward compatibility
      }
    })
  })
)

// POST /api/v1/auth/logout
router.post('/logout',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Get token from cookie or Authorization header
    const authHeader = req.headers.authorization
    const token = req.cookies?.cookquest_token || authHeader?.substring(7)

    if (token && req.user) {
      await DatabaseService.all(
        'DELETE FROM user_sessions WHERE user_id = $1 AND session_token = $2',
        [req.user.id, token]
      )
    }

    clearAuthCookie(res)

    res.json({
      success: true,
      message: 'Logout successful'
    })
  })
)

// GET /api/v1/auth/me - Get current user profile
router.get('/me',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await DatabaseService.getUserById(req.user!.id)
    if (!user) {
      throw new APIError('User not found', 404)
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profile: user.profile,
          created_at: user.created_at
        }
      }
    })
  })
)

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await DatabaseService.getUserById(req.user!.id)
    if (!user) {
      throw new APIError('User not found', 404)
    }

    // Generate new token
    const newToken = generateToken(user)
    
    // Update session with new token
    const authHeader = req.headers.authorization
    const oldToken = authHeader?.substring(7)
    
    if (oldToken) {
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 days
      await DatabaseService.all(
        'UPDATE user_sessions SET session_token = $1, expires_at = $2 WHERE user_id = $3 AND session_token = $4',
        [newToken, expiresAt, user.id, oldToken]
      )
    }

    setAuthCookie(res, newToken)

    res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profile: user.profile
        }
      }
    })
  })
)

export { router as authRoutes }