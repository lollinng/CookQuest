import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDifficultyColor(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-500/20 text-green-400'
    case 'intermediate':
      return 'bg-yellow-500/20 text-yellow-400'
    case 'advanced':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function formatAmount(amount: number): string {
  if (amount === 0.25) return '1/4'
  if (amount === 0.33) return '1/3'
  if (amount === 0.5) return '1/2'
  if (amount === 0.75) return '3/4'
  if (amount === 1.5) return '1 1/2'
  if (Number.isInteger(amount)) return amount.toString()
  return amount.toString()
}

export function calculateLevel(completedRecipes: number): { level: number; experience: number; nextLevelAt: number } {
  // XP calculation: 100 XP per recipe
  const xp = completedRecipes * 100
  
  // Level calculation: Level = floor(XP / 1000) + 1
  const level = Math.floor(xp / 1000) + 1
  
  // XP for next level
  const currentLevelXP = (level - 1) * 1000
  const nextLevelXP = level * 1000
  const experience = xp - currentLevelXP
  const nextLevelAt = nextLevelXP - currentLevelXP
  
  return { level, experience, nextLevelAt }
}

