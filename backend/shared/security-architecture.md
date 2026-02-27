# CookQuest Security Architecture

## Overview

The CookQuest platform implements a comprehensive security model across frontend, Node.js API, and Python AI services with multiple layers of protection.

## Authentication Strategy

### User Authentication Flow

```
1. User Registration/Login → Node.js API
2. Password verification (bcrypt with 12 rounds)
3. JWT token generation (7-day expiry)
4. Session record created in database
5. Token returned to client
6. Client stores token (secure httpOnly cookie + localStorage backup)
7. All subsequent requests include Bearer token
8. API validates token + session on each request
```

### JWT Token Structure

```json
{
  "payload": {
    "userId": 123,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "cookingmaster",
    "iat": 1642234567,
    "exp": 1642839367,
    "iss": "cookquest-api"
  }
}
```

### Token Security Features

- **Secret Rotation**: JWT secrets rotate monthly
- **Short Expiry**: 7-day token lifetime with refresh mechanism
- **Session Validation**: Each request validates active session in database
- **IP & User-Agent Tracking**: Sessions track device information
- **Automatic Cleanup**: Expired sessions removed daily

## Authorization Levels

### User Roles

```typescript
enum UserRole {
  USER = 'user',           // Standard user access
  MODERATOR = 'moderator', // Content moderation
  ADMIN = 'admin'          // Full system access
}
```

### Permission Matrix

| Resource | User | Moderator | Admin |
|----------|------|-----------|-------|
| Own Profile | CRUD | CRUD | CRUD |
| Others' Profiles | R | RU | CRUD |
| Recipes | R | RUD | CRUD |
| Reviews | CRU (own) | CRUD | CRUD |
| Progress | CRU (own) | R | CRUD |
| System Settings | - | - | CRUD |

## Inter-Service Security

### Service-to-Service Authentication

```typescript
// Service Token Authentication
interface ServiceToken {
  service: 'node-api' | 'python-ai' | 'frontend'
  permissions: string[]
  expires: number
  signature: string
}
```

### API Gateway Pattern

```
Frontend → Kong Gateway → Node.js API → Python AI Service
    ↓           ↓             ↓              ↓
  JWT Auth   Rate Limit   Service Auth   ML Processing
```

## Data Protection

### Password Security

```typescript
// Password Requirements
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  preventCommonPasswords: true,
  bcryptRounds: 12
}
```

### Data Encryption

```typescript
// Encryption Strategy
interface EncryptionConfig {
  atRest: {
    database: 'AES-256-GCM',
    files: 'AES-256-GCM',
    backups: 'AES-256-GCM'
  },
  inTransit: {
    https: 'TLS 1.3',
    database: 'SSL/TLS',
    redis: 'TLS 1.2+'
  },
  application: {
    sessionTokens: 'HS256',
    apiKeys: 'RS256',
    userPII: 'AES-256-GCM'
  }
}
```

### PII Data Handling

```sql
-- Sensitive data fields
CREATE TABLE user_pii (
    user_id INTEGER PRIMARY KEY,
    email_hash VARCHAR(64),         -- Hashed for duplicate detection
    email_encrypted TEXT,           -- Encrypted actual email
    phone_encrypted TEXT,           -- Encrypted phone (optional)
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## API Security

### Rate Limiting Strategy

```typescript
const rateLimits = {
  // Global limits
  global: '100 requests/15min per IP',
  
  // Authentication endpoints
  auth: {
    login: '5 attempts/15min per IP',
    register: '3 attempts/hour per IP',
    refresh: '10 requests/hour per user',
    resetPassword: '3 attempts/day per email'
  },
  
  // API endpoints
  api: {
    standard: '1000 requests/hour per user',
    search: '200 requests/hour per user',
    upload: '20 requests/hour per user'
  },
  
  // AI service
  ai: {
    recommendations: '100 requests/hour per user',
    tips: '200 requests/hour per user',
    analysis: '50 requests/hour per user'
  }
}
```

### Input Validation & Sanitization

```typescript
// Validation Middleware Stack
const validationStack = [
  helmet(),                    // Security headers
  cors(corsOptions),          // CORS protection
  rateLimit(rateLimitConfig), // Rate limiting
  express.json({ limit: '10mb' }), // Body size limit
  validator.sanitize(),       // Input sanitization
  validator.validate(),       // Schema validation
  csrfProtection(),          // CSRF tokens
  authMiddleware()           // Authentication
]
```

### Request Validation Examples

```typescript
// Recipe creation validation
const createRecipeValidation = [
  body('title')
    .isLength({ min: 3, max: 100 })
    .escape()
    .trim(),
  body('description')
    .isLength({ max: 500 })
    .escape()
    .trim(),
  body('ingredients')
    .isArray({ min: 1, max: 50 })
    .custom((ingredients) => {
      return ingredients.every(ing => 
        typeof ing === 'string' && ing.length <= 200
      )
    }),
  body('instructions')
    .isArray({ min: 1, max: 20 })
    .custom((instructions) => {
      return instructions.every(inst => 
        typeof inst === 'string' && inst.length <= 1000
      )
    })
]
```

## Security Headers

### Node.js API Security Headers

```typescript
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https://images.unsplash.com", "https://cdn.cookquest.app"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cookquest.app"]
    }
  },
  
  // Security headers
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  
  // HSTS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // Other security headers
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}))
```

## Session Management

### Session Storage Strategy

```typescript
interface UserSession {
  id: string
  userId: number
  sessionToken: string      // JWT token
  expiresAt: Date
  createdAt: Date
  ipAddress: string
  userAgent: string
  isActive: boolean
  lastActivity: Date
}

// Session cleanup job
const cleanupExpiredSessions = async () => {
  await db.run(`
    DELETE FROM user_sessions 
    WHERE expires_at < datetime('now') 
    OR last_activity < datetime('now', '-30 days')
  `)
}
```

### Multi-Device Support

```typescript
// Allow multiple active sessions per user
const maxSessionsPerUser = 5

const createSession = async (userId: number, token: string) => {
  // Cleanup old sessions if at limit
  const sessionCount = await db.get(
    'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?',
    [userId]
  )
  
  if (sessionCount.count >= maxSessionsPerUser) {
    await db.run(`
      DELETE FROM user_sessions 
      WHERE user_id = ? 
      ORDER BY last_activity ASC 
      LIMIT ?
    `, [userId, sessionCount.count - maxSessionsPerUser + 1])
  }
  
  // Create new session
  await db.run(/* ... */)
}
```

## Monitoring & Intrusion Detection

### Security Event Logging

```typescript
interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'invalid_token' | 'suspicious_activity'
  userId?: number
  ipAddress: string
  userAgent: string
  endpoint: string
  timestamp: Date
  metadata: any
}

const logSecurityEvent = async (event: SecurityEvent) => {
  // Log to structured logging system
  logger.warn('Security event', event)
  
  // Store in security events table
  await db.run(`
    INSERT INTO security_events 
    (type, user_id, ip_address, user_agent, endpoint, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [event.type, event.userId, event.ipAddress, event.userAgent, event.endpoint, JSON.stringify(event.metadata)])
  
  // Alert on suspicious patterns
  await checkForSuspiciousActivity(event)
}
```

### Automated Threat Response

```typescript
const suspiciousActivityDetection = {
  // Multiple failed login attempts
  bruteForce: {
    threshold: 5,
    window: '15 minutes',
    action: 'temp_block_ip'
  },
  
  // Unusual access patterns
  anomalousActivity: {
    threshold: 'ml_model_prediction > 0.8',
    action: 'require_additional_auth'
  },
  
  // Known attack patterns
  knownThreats: {
    sqlInjection: 'block_request',
    xssAttempt: 'block_request',
    scanningAttempt: 'block_ip'
  }
}
```

## Privacy & Compliance

### GDPR Compliance

```typescript
// Right to be forgotten
const deleteUserData = async (userId: number) => {
  const transaction = await db.beginTransaction()
  
  try {
    // Anonymize user data
    await db.run(`
      UPDATE users SET 
        email = 'deleted_' || id || '@cookquest.local',
        username = 'deleted_user_' || id,
        display_name = 'Deleted User',
        avatar_url = NULL,
        preferences = '{}',
        is_active = 0
      WHERE id = ?
    `, [userId])
    
    // Remove PII
    await db.run('DELETE FROM user_pii WHERE user_id = ?', [userId])
    
    // Keep anonymized progress data for analytics
    // Remove personal sessions and tokens
    await db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId])
    
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

// Data export
const exportUserData = async (userId: number) => {
  const userData = await db.get(`
    SELECT email, username, display_name, preferences, created_at
    FROM users WHERE id = ?
  `, [userId])
  
  const progressData = await db.all(`
    SELECT recipe_id, status, completed_at, notes
    FROM user_recipe_progress WHERE user_id = ?
  `, [userId])
  
  return {
    profile: userData,
    progress: progressData,
    exportedAt: new Date().toISOString()
  }
}
```

### Data Minimization

```typescript
// Only collect necessary data
const userDataPolicy = {
  required: ['email', 'username', 'password'],
  optional: ['displayName', 'avatarUrl'],
  behavioral: ['recipeProgress', 'preferences'],
  analytics: ['sessionDuration', 'featureUsage'], // Anonymized
  retention: {
    activeUsers: '7 years',
    inactiveUsers: '2 years',
    deletedUsers: '30 days' // For backup/recovery
  }
}
```

## Incident Response Plan

### Security Incident Categories

```typescript
enum IncidentSeverity {
  LOW = 'low',           // Isolated failed attempts
  MEDIUM = 'medium',     // Pattern of attacks
  HIGH = 'high',         // Successful breach attempt
  CRITICAL = 'critical'  // Data breach confirmed
}

const incidentResponse = {
  LOW: {
    action: 'log_and_monitor',
    notification: 'security_team',
    timeline: '24 hours'
  },
  MEDIUM: {
    action: 'enhanced_monitoring',
    notification: 'security_team + dev_leads',
    timeline: '4 hours'
  },
  HIGH: {
    action: 'immediate_investigation',
    notification: 'security_team + management',
    timeline: '1 hour'
  },
  CRITICAL: {
    action: 'emergency_response',
    notification: 'all_stakeholders',
    timeline: '15 minutes'
  }
}
```

## Security Testing

### Automated Security Testing

```bash
#!/bin/bash
# Security testing pipeline

# Dependency vulnerability scanning
npm audit --audit-level moderate
safety check --json

# SAST (Static Application Security Testing)
semgrep --config=p/security-audit src/
bandit -r python-services/

# Container security scanning
docker scan cookquest-api:latest
docker scan cookquest-ai:latest

# Infrastructure security
checkov -f docker-compose.yml
kics scan -p infrastructure/

# API security testing
zap-baseline.py -t http://localhost:3001/api/v1
```

### Security Checklist

- [ ] All API endpoints require authentication where appropriate
- [ ] Input validation on all user-supplied data
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization, CSP headers)
- [ ] CSRF protection for state-changing operations
- [ ] Rate limiting on all public endpoints
- [ ] Security headers implemented (HSTS, CSP, etc.)
- [ ] Sensitive data encrypted at rest and in transit
- [ ] Logging of security-relevant events
- [ ] Regular security dependency updates
- [ ] Secrets stored securely (not in code)
- [ ] Database connections over SSL/TLS
- [ ] API documentation doesn't expose sensitive information
- [ ] Error messages don't leak system information
- [ ] File upload restrictions and validation
- [ ] Session management secure (httpOnly cookies, secure flags)