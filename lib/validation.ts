import type { Recipe, SkillType } from '@/lib/types'

/**
 * Validates recipe ID format
 */
export function isValidRecipeId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  
  // Recipe IDs should be alphanumeric with hyphens, 3-50 characters
  const recipeIdRegex = /^[a-z0-9][a-z0-9-]{2,49}$/
  return recipeIdRegex.test(id)
}

/**
 * Validates skill type
 */
export function isValidSkillType(skill: string): skill is SkillType {
  const validSkills: SkillType[] = ['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine']
  return validSkills.includes(skill as SkillType)
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 1000) // Limit length
}

/**
 * Validates recipe data structure
 */
export function validateRecipe(data: any): data is Recipe {
  if (!data || typeof data !== 'object') return false
  
  const requiredFields = ['id', 'title', 'description', 'skill', 'difficulty', 'time', 'ingredients', 'instructions']
  
  // Check required fields exist
  for (const field of requiredFields) {
    if (!(field in data)) return false
  }
  
  // Validate field types
  if (!isValidRecipeId(data.id)) return false
  if (!isValidSkillType(data.skill)) return false
  if (!['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) return false
  if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) return false
  if (!Array.isArray(data.instructions) || data.instructions.length === 0) return false
  
  // Validate string fields
  const stringFields = ['title', 'description', 'time']
  for (const field of stringFields) {
    if (typeof data[field] !== 'string' || data[field].trim().length === 0) return false
  }
  
  return true
}

/**
 * Validates localStorage data before parsing
 */
export function validateLocalStorageData(key: string, data: string): boolean {
  try {
    const parsed = JSON.parse(data)
    
    switch (key) {
      case 'completed-recipes':
        return Array.isArray(parsed) && parsed.every(id => isValidRecipeId(id))
      
      default:
        return true
    }
  } catch {
    return false
  }
}

/**
 * Rate limiting for API calls (simple client-side implementation)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 100, windowMs = 60000) { // 100 requests per minute
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Secure URL validation for images
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  try {
    const urlObj = new URL(url)

    // Allow HTTPS URLs and localhost for development
    if (urlObj.protocol === 'https:') return true
    if (urlObj.protocol === 'http:' && urlObj.hostname === 'localhost') return true

    return false
  } catch {
    return false
  }
}