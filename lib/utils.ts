import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function getDifficultyColor(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-800'
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800'
    case 'advanced':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getSkillColor(skill: string): string {
  switch (skill) {
    case 'basic-cooking':
      return 'bg-blue-500'
    case 'heat-control':
      return 'bg-orange-500'
    case 'flavor-building':
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
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

