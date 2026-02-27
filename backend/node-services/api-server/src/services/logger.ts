import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // Redact sensitive fields from all log output
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'session_token',
    ],
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {} // JSON output in production (machine-readable)
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
})
