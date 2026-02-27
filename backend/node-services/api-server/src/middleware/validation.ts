import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { APIError } from './error-handler'

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req)
    }

    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        // Never reflect user input in error responses (information disclosure risk)
      }))

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errorMessages
        },
        timestamp: new Date().toISOString()
      })
    }

    next()
  }
}