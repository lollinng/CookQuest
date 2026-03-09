import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import path from 'path'

import { errorHandler } from './middleware/error-handler'
import { DatabaseService } from './services/database'
import { RedisService } from './services/redis'
import { logger } from './services/logger'
import { initializeRoutes } from './routes'

// Load environment variables
dotenv.config()

// Validate required environment variables
const WEAK_SECRETS = [
  'dev-secret-change-in-production',
  'your-super-secret-jwt-key-change-this-in-production',
  'secret',
  'password',
  'changeme',
]

if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'FRONTEND_URL']
  // Accept either DATABASE_URL or INSTANCE_CONNECTION_NAME (Cloud SQL socket)
  if (!process.env.DATABASE_URL && !process.env.INSTANCE_CONNECTION_NAME) {
    required.push('DATABASE_URL')
  }
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    logger.fatal({ missing }, 'Missing required environment variables')
    process.exit(1)
  }
  if (WEAK_SECRETS.includes(process.env.JWT_SECRET || '')) {
    logger.fatal('JWT_SECRET must be changed from the default value in production')
    process.exit(1)
  }
  if ((process.env.JWT_SECRET || '').length < 32) {
    logger.fatal('JWT_SECRET must be at least 32 characters in production')
    process.exit(1)
  }
} else {
  // In development, warn about missing vars but don't crash
  if (!process.env.JWT_SECRET) {
    logger.warn('JWT_SECRET not set — using insecure default for development only')
  }
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL not set — using default localhost connection')
  }
}

const app = express()
const PORT = process.env.PORT || 3003

// ── Request/error counters for /metrics ──
let requestsTotal = 0
let errorsTotal = 0

app.use((req, res, next) => {
  requestsTotal++
  res.on('finish', () => {
    if (res.statusCode >= 500) errorsTotal++
  })
  next()
})

// Serve uploaded user photos as static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Security middleware — hardened Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https://images.unsplash.com', 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// CORS configuration — MUST be before rate limiter so 429 responses include CORS headers
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'CORS blocked request');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24 hours
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 2000, // SPA makes ~10+ calls per page load
  message: {
    success: false,
    error: { message: 'Too many requests from this IP, please try again later.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// CSRF protection — validate Origin header on state-changing requests
app.use('/api/', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.get('Origin') || req.get('Referer')
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    // Allow requests with no Origin (curl, mobile apps, server-to-server)
    // Bearer token auth already mitigates CSRF — this is defense in depth
    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      logger.warn({ origin, path: req.path, method: req.method }, 'CSRF validation failed — origin mismatch')
      return res.status(403).json({
        success: false,
        error: 'Request origin not allowed',
      })
    }
  }
  next()
})

// Body parsing middleware
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Structured request logging
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' } }))

// Liveness probe — lightweight, always responds if process is alive
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Readiness probe — checks database and Redis connectivity
app.get('/ready', async (req, res) => {
  const dbHealthy = await DatabaseService.isHealthy()
  const redisHealthy = await RedisService.isHealthy()
  const allHealthy = dbHealthy && redisHealthy

  const status = allHealthy ? 200 : 503
  res.status(status).json({
    status: allHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'ok' : 'failing',
      redis: redisHealthy ? 'ok' : 'failing',
    },
    pool: DatabaseService.getPoolStats(),
  })
})

// Metrics endpoint — server stats for monitoring dashboards
app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage()
  res.json({
    uptime: Math.floor(process.uptime()),
    requests_total: requestsTotal,
    errors_total: errorsTotal,
    db_pool: DatabaseService.getPoolStats(),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    node_version: process.version,
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
})

// Initialize services and routes
async function startServer() {
  try {
    // Initialize database
    await DatabaseService.initialize()
    logger.info('Database initialized')

    // Initialize Redis
    await RedisService.initialize()
    logger.info('Redis initialized')

    // Setup routes
    initializeRoutes(app)
    
    // Error handling middleware (should be last)
    app.use(errorHandler)

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      })
    })

    // Clean expired sessions every hour
    setInterval(async () => {
      try {
        const count = await DatabaseService.cleanExpiredSessions()
        if (count > 0) logger.info({ count }, 'Cleaned expired sessions')
      } catch (err) {
        logger.error({ err }, 'Session cleanup failed')
      }
    }, 60 * 60 * 1000)

    app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'CookQuest API Server started')
    })

  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server')
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await DatabaseService.close()
  await RedisService.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await DatabaseService.close()
  await RedisService.close()
  process.exit(0)
})

startServer()