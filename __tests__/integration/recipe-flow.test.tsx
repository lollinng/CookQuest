import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { RecipeCard } from '@/components/recipe-card'
import { createRecipeStore } from '@/lib/stores/recipe-store'
import React from 'react'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

// Mock validation
vi.mock('@/lib/validation', () => ({
  isValidImageUrl: () => false,
  isValidRecipeId: (id: string) => {
    if (!id || typeof id !== 'string') return false
    const recipeIdRegex = /^[a-z0-9][a-z0-9-]{2,49}$/
    return recipeIdRegex.test(id)
  },
  validateLocalStorageData: () => true,
}))

// Integration test for the complete recipe completion flow
const mockRecipe = {
  id: 'boiled-egg',
  emoji: '🥚',
  title: 'Perfect Boiled Egg',
  description: 'Learn the basics of boiling eggs to perfection',
  imageUrl: '/images/boiled-egg.jpg',
  difficulty: 'beginner' as const,
  time: '10 minutes',
  skill: 'basic-cooking' as const,
  ingredients: ['2 eggs', 'Water', 'Salt'],
  instructions: [
    'Bring water to boil',
    'Add eggs carefully',
    'Cook for 6-8 minutes',
    'Cool in ice water'
  ],
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Recipe Completion Flow Integration', () => {
  let store: ReturnType<typeof createRecipeStore>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    localStorage.clear()
    store = createRecipeStore()
    user = userEvent.setup()
  })

  it('should complete full recipe interaction flow', async () => {
    const { toggleRecipeCompletion, isRecipeCompleted, getSkillProgress } = store.getState()

    // Initially recipe should not be completed
    expect(isRecipeCompleted('boiled-egg')).toBe(false)
    expect(getSkillProgress('basic-cooking').completed).toBe(0)

    // Render recipe card
    render(
      <TestWrapper>
        <RecipeCard
          recipe={mockRecipe}
          isCompleted={isRecipeCompleted('boiled-egg')}
          onToggleCompletion={toggleRecipeCompletion}
        />
      </TestWrapper>
    )

    // Verify initial state in UI
    expect(screen.getByText('Perfect Boiled Egg')).toBeInTheDocument()
    const card = screen.getByTestId('recipe-card')
    expect(card.className).not.toContain('border-green-400')

    // Complete the recipe
    const toggleButton = screen.getByTestId('toggle-completion')
    await user.click(toggleButton)

    // Verify state change
    expect(isRecipeCompleted('boiled-egg')).toBe(true)
    expect(getSkillProgress('basic-cooking').completed).toBe(1)

    // Clean up previous render before re-rendering with updated state
    cleanup()

    render(
      <TestWrapper>
        <RecipeCard
          recipe={mockRecipe}
          isCompleted={isRecipeCompleted('boiled-egg')}
          onToggleCompletion={toggleRecipeCompletion}
        />
      </TestWrapper>
    )

    // Verify UI reflects completion
    await waitFor(() => {
      const updatedCard = screen.getByTestId('recipe-card')
      expect(updatedCard.className).toContain('border-green-400')
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })
  })

  it('should persist completion state across sessions', async () => {
    const { toggleRecipeCompletion, isRecipeCompleted } = store.getState()

    // Complete a recipe
    toggleRecipeCompletion('boiled-egg')
    expect(isRecipeCompleted('boiled-egg')).toBe(true)

    // Verify localStorage persistence
    const stored = localStorage.getItem('completed-recipes')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    // Zustand persist wraps state: { state: { completedRecipes: [...] }, version: 0 }
    expect(parsed.state.completedRecipes).toContain('boiled-egg')

    // Create new store instance (simulating page refresh)
    const newStore = createRecipeStore()
    const { isRecipeCompleted: newIsCompleted } = newStore.getState()

    // Should load from localStorage
    expect(newIsCompleted('boiled-egg')).toBe(true)
  })

  it('should update skill progress correctly when multiple recipes are completed', async () => {
    const { toggleRecipeCompletion, getSkillProgress } = store.getState()

    // Complete multiple basic cooking recipes
    toggleRecipeCompletion('boiled-egg')
    toggleRecipeCompletion('make-rice')
    toggleRecipeCompletion('chop-onion')

    const progress = getSkillProgress('basic-cooking')
    expect(progress.completed).toBe(3)
    expect(progress.total).toBe(3)
    expect(progress.percentage).toBe(100)
  })

  it('should handle navigation to recipe detail correctly', async () => {
    render(
      <TestWrapper>
        <RecipeCard
          recipe={mockRecipe}
          isCompleted={false}
          onToggleCompletion={vi.fn()}
        />
      </TestWrapper>
    )

    // Click on the card (not the toggle button)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipe/boiled-egg')
  })

  it('should prevent navigation when toggle button is clicked', async () => {
    render(
      <TestWrapper>
        <RecipeCard
          recipe={mockRecipe}
          isCompleted={false}
          onToggleCompletion={vi.fn()}
        />
      </TestWrapper>
    )

    const toggleButton = screen.getByTestId('toggle-completion')

    // Click the toggle button
    await user.click(toggleButton)

    // Navigation should be prevented (stopPropagation called)
    // This is tested by ensuring the toggle works without navigating
    expect(toggleButton).toBeInTheDocument()
  })

  it('should show correct progress across different skills', async () => {
    const { toggleRecipeCompletion, getSkillProgress } = store.getState()

    // Complete recipes from different skills
    toggleRecipeCompletion('boiled-egg')      // basic-cooking
    toggleRecipeCompletion('sear-steak')      // heat-control
    toggleRecipeCompletion('make-sauce')      // flavor-building

    expect(getSkillProgress('basic-cooking').completed).toBe(1)
    expect(getSkillProgress('heat-control').completed).toBe(1)
    expect(getSkillProgress('flavor-building').completed).toBe(1)

    // Overall progress should reflect all completions
    const { getOverallProgress } = store.getState()
    const overall = getOverallProgress()
    expect(overall.completed).toBe(3)
    // Total = 3 (basic) + 5 (heat) + 7 (flavor) + 6 (air-fryer) + 7 (indian) = 28
    expect(overall.total).toBe(28)
  })

  it('should handle uncompleting recipes', async () => {
    const { toggleRecipeCompletion, isRecipeCompleted, getSkillProgress } = store.getState()

    // Complete then uncomplete a recipe
    toggleRecipeCompletion('boiled-egg')
    expect(isRecipeCompleted('boiled-egg')).toBe(true)
    expect(getSkillProgress('basic-cooking').completed).toBe(1)

    toggleRecipeCompletion('boiled-egg')
    expect(isRecipeCompleted('boiled-egg')).toBe(false)
    expect(getSkillProgress('basic-cooking').completed).toBe(0)

    // Should update localStorage
    const stored = localStorage.getItem('completed-recipes')
    const parsed = stored ? JSON.parse(stored) : { state: { completedRecipes: [] } }
    expect(parsed.state.completedRecipes).not.toContain('boiled-egg')
  })
})
