import type { SkillType } from '@/lib/types'
import { VALID_SKILL_IDS, RECIPE_ID_REGEX } from '@/lib/constants'

/**
 * Validates recipe ID format
 */
export function isValidRecipeId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return RECIPE_ID_REGEX.test(id)
}

/**
 * Validates skill type
 */
export function isValidSkillType(skill: string): skill is SkillType {
  return (VALID_SKILL_IDS as readonly string[]).includes(skill)
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