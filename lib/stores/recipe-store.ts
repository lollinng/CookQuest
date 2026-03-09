import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RecipeStore, SkillType, SkillProgress } from '@/lib/types'
import { isValidRecipeId } from '@/lib/validation'

// Define skill recipes mapping
const SKILL_RECIPES: Record<SkillType, string[]> = {
  'basic-cooking': ['boiled-egg', 'make-rice', 'chop-onion'],
  'heat-control': ['sear-steak', 'simmer-soup', 'deep-fry', 'stir-fry', 'grill-chicken'],
  'flavor-building': ['make-sauce', 'season-taste', 'herb-pairing', 'spice-blend', 'marinate', 'balance-flavors', 'umami-boost'],
  'air-fryer': ['air-fryer-fries', 'air-fryer-chicken-wings', 'air-fryer-salmon', 'air-fryer-vegetables', 'air-fryer-tofu', 'air-fryer-donuts'],
  'indian-cuisine': [
    // Original 7
    'dal-tadka', 'butter-chicken', 'jeera-rice', 'aloo-gobi', 'naan-bread', 'chana-masala', 'mango-lassi',
    // Weeks 1-2 plan (12)
    'ic-cutting-onion', 'ic-chai-and-eggs', 'ic-masala-omelette', 'ic-plain-rice',
    'ic-simple-dal', 'ic-aloo-sabzi', 'ic-first-full-meal', 'ic-roti',
    'ic-egg-bhurji', 'ic-upma', 'ic-masala-base', 'ic-full-thali',
    // Week 3 (7)
    'ic-poha', 'ic-paneer-bhurji', 'ic-matar-paneer', 'ic-veg-pulao',
    'ic-bhindi-masala', 'ic-masoor-dal', 'ic-week3-thali',
    // Week 4 (7)
    'ic-aloo-paratha', 'ic-paneer-tikka', 'ic-gajar-matar', 'ic-rajma-masala',
    'ic-kadhi', 'ic-khichdi', 'ic-week4-thali',
    // Week 5 (7)
    'ic-puri-bhaji', 'ic-besan-chilla', 'ic-paneer-butter-masala', 'ic-dal-tadka-yellow',
    'ic-veg-biryani', 'ic-salad-raita', 'ic-grand-thali',
  ],
}

export { SKILL_RECIPES }

export const createRecipeStore = () => create<RecipeStore>()(
  persist(
    (set, get) => ({
      completedRecipes: new Set<string>(),
      completionDates: {} as Record<string, string>,

      toggleRecipeCompletion: (recipeId: string) => {
        if (!isValidRecipeId(recipeId)) {
          console.warn(`Invalid recipe ID: ${recipeId}`)
          return
        }

        set((state) => {
          const newCompleted = new Set(state.completedRecipes)
          const newDates = { ...state.completionDates }
          if (newCompleted.has(recipeId)) {
            newCompleted.delete(recipeId)
            delete newDates[recipeId]
          } else {
            newCompleted.add(recipeId)
            newDates[recipeId] = new Date().toISOString()
          }
          return { completedRecipes: newCompleted, completionDates: newDates }
        })
      },

      completeRecipe: (recipeId: string) => {
        if (!isValidRecipeId(recipeId)) {
          console.warn(`Invalid recipe ID: ${recipeId}`)
          return
        }
        // Idempotent — only adds, never removes
        if (get().completedRecipes.has(recipeId)) return

        set((state) => {
          const newCompleted = new Set(state.completedRecipes)
          newCompleted.add(recipeId)
          const newDates = { ...state.completionDates }
          newDates[recipeId] = new Date().toISOString()
          return { completedRecipes: newCompleted, completionDates: newDates }
        })
      },

      uncompleteRecipe: (recipeId: string) => {
        if (!isValidRecipeId(recipeId)) return
        if (!get().completedRecipes.has(recipeId)) return

        set((state) => {
          const newCompleted = new Set(state.completedRecipes)
          newCompleted.delete(recipeId)
          const newDates = { ...state.completionDates }
          delete newDates[recipeId]
          return { completedRecipes: newCompleted, completionDates: newDates }
        })
      },

      isRecipeCompleted: (recipeId: string) => {
        return get().completedRecipes.has(recipeId)
      },

      getSkillProgress: (skillId: SkillType): SkillProgress => {
        const recipes = SKILL_RECIPES[skillId] || []
        const completed = recipes.filter(recipeId =>
          get().completedRecipes.has(recipeId)
        ).length
        const total = recipes.length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

        return { completed, total, percentage }
      },

      getOverallProgress: (): SkillProgress => {
        const allRecipes = Object.values(SKILL_RECIPES).flat()
        const completed = allRecipes.filter(recipeId =>
          get().completedRecipes.has(recipeId)
        ).length
        const total = allRecipes.length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

        return { completed, total, percentage }
      },

      getStreak: (): number => {
        const dates = Object.values(get().completionDates)
        if (dates.length === 0) return 0

        // Get unique days (local time)
        const uniqueDays = [...new Set(
          dates.map(d => {
            const date = new Date(d)
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          })
        )].sort().reverse()

        // Walk backwards from today counting consecutive days
        let streak = 0
        const today = new Date()
        for (let i = 0; i <= uniqueDays.length; i++) {
          const expected = new Date(today)
          expected.setDate(today.getDate() - i)
          const expectedKey = `${expected.getFullYear()}-${expected.getMonth()}-${expected.getDate()}`
          if (uniqueDays.includes(expectedKey)) {
            streak++
          } else if (i === 0) {
            // Haven't completed anything today — check if yesterday starts the streak
            continue
          } else {
            break
          }
        }

        return streak
      },

      completedToday: (): boolean => {
        const dates = Object.values(get().completionDates)
        const today = new Date()
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
        return dates.some(d => {
          const date = new Date(d)
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === todayKey
        })
      },
    }),
    {
      name: 'completed-recipes',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          try {
            const parsed = JSON.parse(str)
            return {
              ...parsed,
              state: {
                ...parsed.state,
                completedRecipes: new Set(parsed.state.completedRecipes || []),
                completionDates: parsed.state.completionDates || {},
              }
            }
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              completedRecipes: Array.from(value.state.completedRecipes),
              completionDates: value.state.completionDates || {},
            }
          }
          localStorage.setItem(name, JSON.stringify(serialized))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)

// Global store instance
export const useRecipeStore = createRecipeStore()

// Hook to check if Zustand store has rehydrated from localStorage
export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}
