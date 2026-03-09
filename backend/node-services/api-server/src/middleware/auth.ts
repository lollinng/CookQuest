import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { DatabaseService } from '../services/database'
import { logger } from '../services/logger'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    uuid: string
    email: string
    username: string
    isActive: boolean
    isAllowed: boolean
    isAdmin: boolean
  }
}

export interface JWTPayload {
  userId: number
  uuid: string
  email: string
  username: string
  iat: number
  exp: number
}

// Extract token from httpOnly cookie or Authorization header
function extractToken(req: AuthenticatedRequest): string | null {
  // Prefer httpOnly cookie (more secure)
  if (req.cookies?.cookquest_token) {
    return req.cookies.cookquest_token
  }
  // Fall back to Authorization header (backward compatibility / mobile apps)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization token required' }
      })
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured')
      return res.status(500).json({
        success: false,
        error: { message: 'Server configuration error' }
      })
    }

    // Verify JWT token with full security options
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'cookquest-api',
      audience: 'cookquest-web',
      algorithms: ['HS256'],
    }) as JWTPayload
    
    // Get user from database to ensure they still exist
    const user = await DatabaseService.getUserById(decoded.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token — user not found' }
      })
    }

    // Check if token is from a valid session
    const session = await DatabaseService.get(
      `SELECT id, expires_at FROM user_sessions
       WHERE user_id = $1 AND session_token = $2 AND expires_at > CURRENT_TIMESTAMP`,
      [user.id, token]
    )

    if (!session) {
      return res.status(401).json({
        success: false,
        error: { message: 'Session expired — please log in again' }
      })
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      uuid: user.id.toString(), // Using id as uuid for now
      email: user.email,
      username: user.username,
      isActive: true,
      isAllowed: user.is_allowed,
      isAdmin: user.is_admin,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token' }
      })
    }

    logger.error({ err: error }, 'Auth middleware error')
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication error' }
    })
  }
}

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req)

  if (!token) {
    return next() // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'cookquest-api',
      audience: 'cookquest-web',
      algorithms: ['HS256'],
    }) as JWTPayload
    
    const user = await DatabaseService.getUserById(decoded.userId)

    if (user) {
      req.user = {
        id: user.id,
        uuid: user.id.toString(),
        email: user.email,
        username: user.username,
        isActive: true,
        isAllowed: user.is_allowed,
        isAdmin: user.is_admin,
      }
    }
  } catch (error) {
    // Ignore auth errors in optional auth
  }

  next()
}

// Alpha access gate — blocks users without is_allowed
export const allowedMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAllowed) {
    return res.status(403).json({
      success: false,
      error: { message: 'Alpha access required', code: 'NOT_ALLOWED' }
    })
  }
  next()
}

// Admin gate — blocks non-admin users
export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access required', code: 'NOT_ADMIN' }
    })
  }
  next()
}
