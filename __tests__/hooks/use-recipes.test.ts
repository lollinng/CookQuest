import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRecipes, useRecipeDetail, useSkillData } from '@/hooks/use-recipes'
import * as React from 'react'

// Mock the API modules that the hooks actually call
vi.mock('@/lib/api/recipes', () => ({
  getRecipes: vi.fn(),
  getRecipeById: vi.fn(),
  getRecipesBySkill: vi.fn(),
  updateRecipeProgress: vi.fn(),
}))

vi.mock('@/lib/api/skills', () => ({
  getSkills: vi.fn(),
  getSkillById: vi.fn(),
}))

vi.mock('@/lib/api/tips', () => ({
  getRandomTip: vi.fn(),
  getDailyTip: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  removeToken: vi.fn(),
  API_BASE_URL: 'http://localhost:3003/api/v1',
}))

import { getRecipes, getRecipeById, getRecipesBySkill } from '@/lib/api/recipes'

// Mock recipe data (matches what the API returns before mapRecipe transforms it)
const mockApiRecipes = [
  {
    id: 'boiled-egg',
    title: 'Perfect Boiled Egg',
    description: 'Learn the basics of boiling eggs',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    time: '10 minutes',
    image_url: '/images/boiled-egg.jpg',
    emoji: '🥚',
    ingredients: ['2 eggs', 'Water', 'Salt'],
    instructions: [
      'Bring water to boil',
      'Add eggs carefully',
      'Cook for 6-8 minutes',
      'Cool in ice water'
    ],
    tips: [],
  },
  {
    id: 'make-rice',
    title: 'Perfect Rice',
    description: 'Master the art of cooking rice',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    time: '20 minutes',
    image_url: '/images/rice.jpg',
    emoji: '🍚',
    ingredients: ['1 cup rice', '2 cups water', 'Salt'],
    instructions: [
      'Rinse rice until water runs clear',
      'Add to pot with water and salt',
      'Bring to boil, then simmer',
      'Let rest for 5 minutes'
    ],
    tips: [],
  },
]

// Expected output after mapRecipe transforms the data
const mockMappedRecipes = mockApiRecipes.map(r => ({
  id: r.id,
  title: r.title,
  description: r.description,
  skill: r.skill,
  difficulty: r.difficulty,
  time: r.time,
  imageUrl: r.image_url,
  emoji: r.emoji,
  ingredients: r.ingredients,
  instructions: r.instructions,
  tips: r.tips,
  nutritionFacts: undefined,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  return Wrapper
}

describe('Recipe Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useRecipes', () => {
    it('should fetch and return all recipes', async () => {
      // useRecipes calls getRecipes({ limit: 50 }) which returns { recipes, pagination }
      vi.mocked(getRecipes).mockResolvedValueOnce({
        recipes: mockApiRecipes as any,
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      })

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMappedRecipes)
      expect(getRecipes).toHaveBeenCalledWith({ limit: 50 })
    })

    it('should handle fetch error', async () => {
      vi.mocked(getRecipes).mockRejectedValueOnce(new Error('Failed to fetch'))

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })

    it('should show loading state initially', () => {
      // Return a promise that never resolves
      vi.mocked(getRecipes).mockImplementationOnce(() => new Promise(() => {}))

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useRecipeDetail', () => {
    it('should fetch and return specific recipe', async () => {
      const mockApiRecipe = mockApiRecipes[0]
      // useRecipeDetail calls getRecipeById(id) which returns a single recipe object
      vi.mocked(getRecipeById).mockResolvedValueOnce(mockApiRecipe as any)

      const { result } = renderHook(() => useRecipeDetail('boiled-egg'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMappedRecipes[0])
      expect(getRecipeById).toHaveBeenCalledWith('boiled-egg')
    })

    it('should return error for non-existent recipe', async () => {
      vi.mocked(getRecipeById).mockRejectedValueOnce(new Error('Not Found'))

      const { result } = renderHook(() => useRecipeDetail('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })

    it('should not fetch when recipeId is empty', () => {
      renderHook(() => useRecipeDetail(''), {
        wrapper: createWrapper(),
      })

      expect(getRecipeById).not.toHaveBeenCalled()
    })
  })

  describe('useSkillData', () => {
    it('should fetch and return recipes for specific skill', async () => {
      const basicCookingRecipes = mockApiRecipes.filter(r => r.skill === 'basic-cooking')
      // useSkillData calls getRecipesBySkill(skillId) which returns { skill, recipes, total }
      vi.mocked(getRecipesBySkill).mockResolvedValueOnce({
        skill: 'basic-cooking',
        recipes: basicCookingRecipes as any,
        total: basicCookingRecipes.length,
      })

      const { result } = renderHook(() => useSkillData('basic-cooking'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const expectedMapped = basicCookingRecipes.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        skill: r.skill,
        difficulty: r.difficulty,
        time: r.time,
        imageUrl: r.image_url,
        emoji: r.emoji,
        ingredients: r.ingredients,
        instructions: r.instructions,
        tips: r.tips,
        nutritionFacts: undefined,
      }))
      expect(result.current.data).toEqual(expectedMapped)
      expect(getRecipesBySkill).toHaveBeenCalledWith('basic-cooking')
    })

    it('should cache results for same skill', async () => {
      vi.mocked(getRecipesBySkill).mockResolvedValue({
        skill: 'basic-cooking',
        recipes: mockApiRecipes as any,
        total: mockApiRecipes.length,
      })

      const wrapper = createWrapper()

      // First call
      const { result: result1 } = renderHook(() => useSkillData('basic-cooking'), {
        wrapper,
      })

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Second call with same skill should use cache
      const { result: result2 } = renderHook(() => useSkillData('basic-cooking'), {
        wrapper,
      })

      expect(result2.current.data).toEqual(result1.current.data)
      // Should only be called once due to caching
      expect(getRecipesBySkill).toHaveBeenCalledTimes(1)
    })
  })
})
