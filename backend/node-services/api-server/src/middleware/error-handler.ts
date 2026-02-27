import { Request, Response, NextFunction } from 'express'
import { logger } from '../services/logger'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export class APIError extends Error implements AppError {
  public statusCode: number
  public isOperational: boolean = true

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err }
  error.message = err.message

  // Log error with structured context
  logger.error({
    err,
    statusCode: error.statusCode,
    url: req.originalUrl,
    method: req.method,
  }, 'API Error')

  // Default to 500 server error
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal Server Error'

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Authentication failed'
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  }

  // PostgreSQL constraint errors
  if (err.message.includes('duplicate key value') || err.message.includes('unique constraint')) {
    statusCode = 409
    if (err.message.includes('email')) {
      message = 'Email already exists'
    } else if (err.message.includes('username')) {
      message = 'Username already taken'
    } else {
      message = 'Resource already exists'
    }
  }

  if (err.message.includes('violates foreign key constraint')) {
    statusCode = 400
    message = 'Invalid reference to related resource'
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong'
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  })
}

// Async error wrapper
export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 404 handler
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found'
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  })
}