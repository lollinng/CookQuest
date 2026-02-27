# CookQuest Inter-Service Communication

## Architecture Overview

The CookQuest backend uses a microservices architecture with two primary services:
- **Node.js API Service** (Port 3001): User management, recipes, progress tracking
- **Python AI Service** (Port 8000): ML recommendations, tips generation, analysis

## Communication Patterns

### 1. Direct HTTP/REST Communication

Most inter-service communication uses direct HTTP calls with service authentication.

```typescript
// Node.js → Python AI Service Communication
class AIServiceClient {
  private baseUrl: string = process.env.AI_SERVICE_URL || 'http://localhost:8000'
  private serviceToken: string = process.env.AI_SERVICE_TOKEN || ''
  
  async getRecommendations(userId: number, preferences: any): Promise<Recommendation[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/recommendations/recipes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceToken}`,
        'Content-Type': 'application/json',
        'X-Service-Name': 'cookquest-api',
        'X-Request-ID': generateRequestId()
      },
      body: JSON.stringify({
        user_id: userId,
        preferences,
        context: await this.buildUserContext(userId)
      })
    })
    
    if (!response.ok) {
      throw new AIServiceError(`Recommendations request failed: ${response.status}`)
    }
    
    return response.json()
  }
  
  async generateTip(userId: number, recipeId?: string): Promise<CookingTip> {
    const response = await fetch(`${this.baseUrl}/api/v1/tips/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        current_recipe_id: recipeId,
        skill_level: await this.getUserSkillLevel(userId)
      })
    })
    
    return response.json()
  }
}
```

### 2. Service Discovery & Registration

```typescript
// Service Registry Pattern
interface ServiceRegistry {
  services: Map<string, ServiceInfo>
  healthChecks: Map<string, HealthCheck>
}

interface ServiceInfo {
  name: string
  url: string
  version: string
  capabilities: string[]
  lastSeen: Date
}

class ServiceDiscovery {
  private registry = new Map<string, ServiceInfo>()
  
  register(service: ServiceInfo) {
    this.registry.set(service.name, service)
    console.log(`Service registered: ${service.name} at ${service.url}`)
  }
  
  discover(serviceName: string): ServiceInfo | null {
    return this.registry.get(serviceName) || null
  }
  
  async healthCheck() {
    for (const [name, service] of this.registry) {
      try {
        const response = await fetch(`${service.url}/health`)
        if (response.ok) {
          service.lastSeen = new Date()
        }
      } catch (error) {
        console.warn(`Health check failed for ${name}:`, error.message)
      }
    }
  }
}
```

### 3. Service Authentication

```typescript
// Service Token Validation Middleware
export const verifyServiceToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const serviceName = req.headers['x-service-name'] as string
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Service token required' })
    }
    
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.SERVICE_JWT_SECRET!) as any
    
    // Verify service has required permissions
    if (!decoded.services?.includes(serviceName)) {
      return res.status(403).json({ error: 'Insufficient service permissions' })
    }
    
    req.serviceInfo = {
      name: serviceName,
      permissions: decoded.services
    }
    
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid service token' })
  }
}

// Generate service tokens
const generateServiceToken = (serviceName: string, permissions: string[]) => {
  return jwt.sign(
    {
      service: serviceName,
      services: permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    process.env.SERVICE_JWT_SECRET!
  )
}
```

### 4. Circuit Breaker Pattern

```typescript
// Circuit Breaker for resilient service calls
class CircuitBreaker {
  private failures = 0
  private lastFailureTime?: Date
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private retryTimeout = 30000 // 30 seconds
  ) {}
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.retryTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = new Date()
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

// Usage in service client
const aiServiceBreaker = new CircuitBreaker(5, 60000, 30000)

class ResilientAIClient extends AIServiceClient {
  async getRecommendations(userId: number, preferences: any) {
    return aiServiceBreaker.call(async () => {
      return super.getRecommendations(userId, preferences)
    })
  }
}
```

### 5. Retry Logic with Exponential Backoff

```typescript
class RetryableServiceClient {
  async makeRequest<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) break
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) break
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}
```

### 6. Request/Response Correlation

```typescript
// Request correlation for tracing
interface ServiceRequest {
  requestId: string
  correlationId: string
  userId?: number
  serviceName: string
  timestamp: Date
}

const generateCorrelationId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Middleware to add correlation headers
export const addCorrelationHeaders = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId()
  const requestId = `${req.method}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  
  req.correlationId = correlationId
  req.requestId = requestId
  
  res.setHeader('X-Correlation-ID', correlationId)
  res.setHeader('X-Request-ID', requestId)
  
  next()
}

// Service client with correlation
class CorrelatedServiceClient {
  async makeServiceCall(endpoint: string, data: any, correlationId: string) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
        'X-Correlation-ID': correlationId,
        'X-Request-ID': generateRequestId(),
        'X-Service-Name': 'cookquest-api'
      },
      body: JSON.stringify(data)
    })
  }
}
```

### 7. Event-Driven Communication (Future Enhancement)

```typescript
// Event Bus for asynchronous communication
interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  data: any
  timestamp: Date
  version: number
}

class EventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>()
  
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }
  
  async publish(event: DomainEvent) {
    const handlers = this.handlers.get(event.type) || []
    
    // Publish to local handlers
    await Promise.all(handlers.map(handler => handler(event)))
    
    // Publish to Redis for other services
    await this.publishToRedis(event)
  }
  
  private async publishToRedis(event: DomainEvent) {
    const redis = await RedisService.getClient()
    await redis.publish('cookquest:events', JSON.stringify(event))
  }
}

// Example event handlers
const eventBus = new EventBus()

// When user completes a recipe
eventBus.subscribe('recipe.completed', async (event) => {
  const { userId, recipeId } = event.data
  
  // Update recommendations
  await aiServiceClient.updateUserProfile(userId, {
    lastCompletedRecipe: recipeId,
    completedAt: new Date()
  })
})

// When user changes preferences
eventBus.subscribe('user.preferences.updated', async (event) => {
  const { userId, preferences } = event.data
  
  // Invalidate cached recommendations
  await recommendationCache.invalidate(userId)
  
  // Update AI model
  await aiServiceClient.updateUserPreferences(userId, preferences)
})
```

### 8. Service Mesh (Future Enhancement)

```yaml
# Istio service mesh configuration
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: cookquest-ai-service
spec:
  hosts:
  - cookquest-ai-service
  http:
  - match:
    - headers:
        x-service-name:
          exact: cookquest-api
    route:
    - destination:
        host: cookquest-ai-service
        port:
          number: 8000
    retries:
      attempts: 3
      perTryTimeout: 30s
    timeout: 90s
  - route:
    - destination:
        host: cookquest-ai-service
        port:
          number: 8000
        weight: 100
```

### 9. API Gateway Pattern

```typescript
// Kong Gateway configuration for API routing
const gatewayConfig = {
  services: [
    {
      name: 'cookquest-api',
      url: 'http://localhost:3001'
    },
    {
      name: 'cookquest-ai',
      url: 'http://localhost:8000'
    }
  ],
  routes: [
    {
      name: 'api-routes',
      service: 'cookquest-api',
      paths: ['/api/v1/auth', '/api/v1/recipes', '/api/v1/users', '/api/v1/progress'],
      plugins: [
        { name: 'rate-limiting', config: { minute: 100 } },
        { name: 'jwt' },
        { name: 'cors' }
      ]
    },
    {
      name: 'ai-routes',
      service: 'cookquest-ai',
      paths: ['/api/v1/recommendations', '/api/v1/tips', '/api/v1/analysis'],
      plugins: [
        { name: 'rate-limiting', config: { minute: 50 } },
        { name: 'key-auth' }, // Service authentication
        { name: 'cors' }
      ]
    }
  ]
}
```

### 10. Service Monitoring & Observability

```typescript
// Service health monitoring
class ServiceMonitor {
  private healthEndpoints = new Map([
    ['cookquest-api', 'http://localhost:3001/health'],
    ['cookquest-ai', 'http://localhost:8000/health']
  ])
  
  async checkAllServices(): Promise<ServiceHealth[]> {
    const results = []
    
    for (const [name, url] of this.healthEndpoints) {
      try {
        const start = Date.now()
        const response = await fetch(url, { timeout: 5000 })
        const duration = Date.now() - start
        
        results.push({
          service: name,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: duration,
          lastChecked: new Date()
        })
      } catch (error) {
        results.push({
          service: name,
          status: 'unreachable',
          error: error.message,
          lastChecked: new Date()
        })
      }
    }
    
    return results
  }
}

// Distributed tracing with correlation IDs
const traceServiceCall = async (
  serviceName: string,
  operation: string,
  correlationId: string,
  fn: () => Promise<any>
) => {
  const startTime = Date.now()
  
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    
    logger.info('Service call completed', {
      service: serviceName,
      operation,
      correlationId,
      duration,
      status: 'success'
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('Service call failed', {
      service: serviceName,
      operation,
      correlationId,
      duration,
      status: 'error',
      error: error.message
    })
    
    throw error
  }
}
```

## Communication Flow Examples

### Recipe Recommendation Flow

```
1. Frontend → Node.js API: GET /api/v1/recommendations
2. Node.js API validates user token
3. Node.js API → Python AI: POST /api/v1/recommendations/recipes
4. Python AI analyzes user data and generates recommendations
5. Python AI → Node.js API: Returns recommendation list
6. Node.js API caches results in Redis
7. Node.js API → Frontend: Returns formatted recommendations
```

### Cooking Session Analysis Flow

```
1. Frontend → Node.js API: POST /api/v1/sessions (start session)
2. Frontend → Node.js API: PUT /api/v1/sessions/:id (complete session)
3. Node.js API → Python AI: POST /api/v1/analysis/cooking-assessment
4. Python AI analyzes session data and provides feedback
5. Python AI → Node.js API: Returns analysis and suggestions
6. Node.js API updates user progress based on analysis
7. Node.js API → Frontend: Returns session results with AI feedback
```

## Error Handling & Fallbacks

```typescript
// Service fallback strategies
class ServiceFallbackHandler {
  async getRecommendationsWithFallback(userId: number, preferences: any) {
    try {
      // Primary: AI-generated recommendations
      return await aiServiceClient.getRecommendations(userId, preferences)
    } catch (error) {
      logger.warn('AI service unavailable, using fallback', { error: error.message })
      
      // Fallback 1: Cached recommendations
      const cached = await recommendationCache.get(userId)
      if (cached) return cached
      
      // Fallback 2: Rule-based recommendations
      return await this.getRuleBasedRecommendations(userId, preferences)
    }
  }
  
  private async getRuleBasedRecommendations(userId: number, preferences: any) {
    // Simple rule-based system as last resort
    const userProgress = await this.getUserProgress(userId)
    const nextSkillRecipes = await this.getNextSkillRecipes(userProgress)
    
    return nextSkillRecipes.map(recipe => ({
      recipe_id: recipe.id,
      title: recipe.title,
      confidence_score: 0.5, // Lower confidence for fallback
      recommendation_reasons: ['Based on your current skill level']
    }))
  }
}
```

This inter-service communication architecture provides:
- **Resilience**: Circuit breakers, retries, fallbacks
- **Observability**: Request tracing, health monitoring, structured logging
- **Security**: Service authentication, token validation
- **Performance**: Caching, connection pooling, timeout handling
- **Scalability**: Load balancing, service discovery, async patterns