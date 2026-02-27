import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { RecipeCard } from '@/components/recipe-card'

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock validation
vi.mock('@/lib/validation', () => ({
  isValidImageUrl: () => false,
}))

const mockRecipe = {
  id: 'test-recipe',
  title: 'Test Recipe',
  description: 'A test recipe',
  skill: 'basic-cooking' as const,
  difficulty: 'beginner' as const,
  time: '10 min',
  ingredients: ['salt'],
  instructions: ['cook it'],
  emoji: '🍳',
}

describe('RecipeCard completion toggle', () => {
  it('renders a tooltip/title on the uncompleted toggle button', () => {
    const { getByTestId } = render(
      <RecipeCard
        recipe={mockRecipe}
        isCompleted={false}
        onToggleCompletion={vi.fn()}
      />
    )
    const button = getByTestId('toggle-completion')
    expect(button.getAttribute('title')).toBe('Mark as completed')
  })

  it('renders a tooltip/title on the completed toggle button', () => {
    const { getByTestId } = render(
      <RecipeCard
        recipe={mockRecipe}
        isCompleted={true}
        onToggleCompletion={vi.fn()}
      />
    )
    const button = getByTestId('toggle-completion')
    expect(button.getAttribute('title')).toBe('Mark as incomplete')
  })

  it('has hover animation classes on the uncompleted toggle', () => {
    const { getByTestId } = render(
      <RecipeCard
        recipe={mockRecipe}
        isCompleted={false}
        onToggleCompletion={vi.fn()}
      />
    )
    const button = getByTestId('toggle-completion')
    expect(button.className).toContain('hover:ring')
  })

  it('has bounce animation class on the completed toggle', () => {
    const { getByTestId } = render(
      <RecipeCard
        recipe={mockRecipe}
        isCompleted={true}
        onToggleCompletion={vi.fn()}
      />
    )
    const button = getByTestId('toggle-completion')
    expect(button.className).toContain('animate-bounce-subtle')
  })

  it('calls onToggleCompletion when clicked', () => {
    const onToggle = vi.fn()
    const { getByTestId } = render(
      <RecipeCard
        recipe={mockRecipe}
        isCompleted={false}
        onToggleCompletion={onToggle}
      />
    )
    fireEvent.click(getByTestId('toggle-completion'))
    expect(onToggle).toHaveBeenCalledWith('test-recipe')
  })
})
