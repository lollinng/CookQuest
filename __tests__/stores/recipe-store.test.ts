import { describe, it, expect, beforeEach } from 'vitest'
import { createRecipeStore } from '@/lib/stores/recipe-store'

describe('Recipe Store', () => {
  let store: ReturnType<typeof createRecipeStore>

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    store = createRecipeStore()
  })

  describe('Recipe Completion', () => {
    it('should start with no completed recipes', () => {
      const state = store.getState()
      expect(state.completedRecipes.size).toBe(0)
    })

    it('should toggle recipe completion', () => {
      const { toggleRecipeCompletion, isRecipeCompleted } = store.getState()
      
      // Mark recipe as completed
      toggleRecipeCompletion('boiled-egg')
      expect(isRecipeCompleted('boiled-egg')).toBe(true)
      
      // Mark recipe as incomplete
      toggleRecipeCompletion('boiled-egg')
      expect(isRecipeCompleted('boiled-egg')).toBe(false)
    })

    it('should persist completed recipes to localStorage', () => {
      const { toggleRecipeCompletion } = store.getState()

      toggleRecipeCompletion('boiled-egg')
      toggleRecipeCompletion('make-rice')

      // Check localStorage — Zustand persist stores in { state: { completedRecipes: [...] }, version: N } format
      const stored = localStorage.getItem('completed-recipes')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      const recipes = parsed.state.completedRecipes
      expect(recipes).toContain('boiled-egg')
      expect(recipes).toContain('make-rice')
    })

    it('should load completed recipes from localStorage', () => {
      // Pre-populate localStorage in Zustand persist format
      localStorage.setItem('completed-recipes', JSON.stringify({
        state: { completedRecipes: ['boiled-egg', 'chop-onion'] },
        version: 0
      }))

      // Create new store instance
      const newStore = createRecipeStore()
      const { isRecipeCompleted } = newStore.getState()

      expect(isRecipeCompleted('boiled-egg')).toBe(true)
      expect(isRecipeCompleted('chop-onion')).toBe(true)
      expect(isRecipeCompleted('make-rice')).toBe(false)
    })
  })

  describe('Skill Progress', () => {
    it('should calculate basic cooking skill progress correctly', () => {
      const { toggleRecipeCompletion, getSkillProgress } = store.getState()
      
      // Complete 2 out of 3 basic cooking recipes
      toggleRecipeCompletion('boiled-egg')
      toggleRecipeCompletion('make-rice')
      
      const progress = getSkillProgress('basic-cooking')
      expect(progress.completed).toBe(2)
      expect(progress.total).toBe(3)
      expect(progress.percentage).toBe(67) // rounded
    })

    it('should calculate heat control skill progress correctly', () => {
      const { toggleRecipeCompletion, getSkillProgress } = store.getState()
      
      // Complete 3 out of 5 heat control recipes
      toggleRecipeCompletion('sear-steak')
      toggleRecipeCompletion('simmer-soup')
      toggleRecipeCompletion('deep-fry')
      
      const progress = getSkillProgress('heat-control')
      expect(progress.completed).toBe(3)
      expect(progress.total).toBe(5)
      expect(progress.percentage).toBe(60)
    })

    it('should calculate flavor building skill progress correctly', () => {
      const { toggleRecipeCompletion, getSkillProgress } = store.getState()
      
      // Complete all flavor building recipes
      const flavorRecipes = ['make-sauce', 'season-taste', 'herb-pairing', 'spice-blend', 'marinate', 'balance-flavors', 'umami-boost']
      flavorRecipes.forEach(recipe => toggleRecipeCompletion(recipe))
      
      const progress = getSkillProgress('flavor-building')
      expect(progress.completed).toBe(7)
      expect(progress.total).toBe(7)
      expect(progress.percentage).toBe(100)
    })

    it('should return 0 progress for unknown skill', () => {
      const { getSkillProgress } = store.getState()
      
      const progress = getSkillProgress('unknown-skill')
      expect(progress.completed).toBe(0)
      expect(progress.total).toBe(0)
      expect(progress.percentage).toBe(0)
    })
  })

  describe('Overall Progress', () => {
    it('should calculate overall completion percentage', () => {
      const { toggleRecipeCompletion, getOverallProgress } = store.getState()

      // Complete 5 recipes out of 28 total (3+5+7+6+7 across all 5 skills)
      toggleRecipeCompletion('boiled-egg')      // basic
      toggleRecipeCompletion('make-rice')       // basic
      toggleRecipeCompletion('sear-steak')      // heat
      toggleRecipeCompletion('make-sauce')      // flavor
      toggleRecipeCompletion('season-taste')    // flavor

      const progress = getOverallProgress()
      expect(progress.completed).toBe(5)
      expect(progress.total).toBe(28)
      expect(progress.percentage).toBe(18) // rounded: 5/28 = 17.86% ≈ 18%
    })
  })
})