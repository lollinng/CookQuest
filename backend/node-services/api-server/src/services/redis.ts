import { createClient } from 'redis'
import { logger } from './logger'

class RedisServiceClass {
  private client: any = null
  private isConnected = false

  async initialize(): Promise<void> {
    // For development, we'll use in-memory cache if Redis is not available
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl && process.env.NODE_ENV === 'development') {
      logger.info('Redis not configured, using in-memory cache for development')
      this.client = new InMemoryCache()
      this.isConnected = true
      return
    }

    try {
      this.client = createClient({
        url: redisUrl || 'redis://localhost:6379'
      })

      this.client.on('error', (err: any) => {
        logger.error({ err }, 'Redis client error')
        this.isConnected = false
      })

      this.client.on('connect', () => {
        logger.info('Redis client connected')
        this.isConnected = true
      })

      await this.client.connect()
    } catch (error) {
      logger.warn({ err: error }, 'Failed to connect to Redis, using in-memory cache')
      this.client = new InMemoryCache()
      this.isConnected = true
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null
    
    try {
      return await this.client.get(key)
    } catch (error) {
      logger.error({ err: error }, 'Redis GET error')
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return
    
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value)
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      logger.error({ err: error }, 'Redis SET error')
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return
    
    try {
      await this.client.del(key)
    } catch (error) {
      logger.error({ err: error }, 'Redis DEL error')
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false
    
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error({ err: error }, 'Redis EXISTS error')
      return false
    }
  }

  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        if (typeof this.client.disconnect === 'function') {
          await this.client.disconnect()
        }
      } catch (error) {
        logger.error({ err: error }, 'Error closing Redis connection')
      }
      this.isConnected = false
    }
  }

  // Health check for readiness probes
  async isHealthy(): Promise<boolean> {
    if (!this.isConnected) return false
    try {
      await this.client.ping()
      return true
    } catch {
      return false
    }
  }

  // Utility methods for common patterns
  async cacheResponse(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    await this.set(key, JSON.stringify(data), ttlSeconds)
  }

  async getCachedResponse(key: string): Promise<any | null> {
    const cached = await this.get(key)
    if (!cached) return null
    
    try {
      return JSON.parse(cached)
    } catch {
      return null
    }
  }
}

// Simple in-memory cache for development when Redis is not available
class InMemoryCache {
  private cache = new Map<string, { value: string; expires?: number }>()

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key)
    if (!item) return null

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, { value })
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async exists(key: string): Promise<number> {
    return this.cache.has(key) ? 1 : 0
  }

  async ping(): Promise<string> {
    return 'PONG'
  }

  // Cleanup expired items periodically
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, item] of this.cache.entries()) {
        if (item.expires && now > item.expires) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Clean up every minute
  }
}

export const RedisService = new RedisServiceClass()