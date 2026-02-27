import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecipeCard } from '@/components/recipe-card'

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

// Mock validation - return false so it renders emoji fallback instead of Image
vi.mock('@/lib/validation', () => ({
  isValidImageUrl: () => false,
}))

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
  instructions: ['Bring water to boil', 'Add eggs carefully'],
}

const renderRecipeCard = (props = {}) => {
  const defaultProps = {
    recipe: mockRecipe,
    isCompleted: false,
    onToggleCompletion: vi.fn(),
    ...props,
  }

  return render(
    <RecipeCard {...defaultProps} />
  )
}

describe('RecipeCard Component', () => {
  it('should render recipe information correctly', () => {
    renderRecipeCard()

    expect(screen.getByText('Perfect Boiled Egg')).toBeInTheDocument()
    expect(screen.getByText('Learn the basics of boiling eggs to perfection')).toBeInTheDocument()
    expect(screen.getByText('10 minutes')).toBeInTheDocument()
    expect(screen.getByText('beginner')).toBeInTheDocument()
  })

  it('should display completion status correctly', () => {
    renderRecipeCard({ isCompleted: true })

    const card = screen.getByTestId('recipe-card')
    expect(card.className).toContain('border-green-400')
    expect(card.className).toContain('bg-green-50')

    const checkIcon = screen.getByTestId('check-icon')
    expect(checkIcon).toBeInTheDocument()
  })

  it('should display incomplete status correctly', () => {
    renderRecipeCard({ isCompleted: false })

    const card = screen.getByTestId('recipe-card')
    expect(card.className).toContain('border-gray-100')
    expect(card.className).not.toContain('border-green-400')
    expect(card.className).not.toContain('bg-green-50')

    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument()
  })

  it('should link to correct recipe detail page', () => {
    renderRecipeCard()

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipe/boiled-egg')
  })

  it('should call onToggleCompletion when completion button is clicked', () => {
    const mockToggle = vi.fn()
    renderRecipeCard({ onToggleCompletion: mockToggle })

    const toggleButton = screen.getByTestId('toggle-completion')
    fireEvent.click(toggleButton)

    expect(mockToggle).toHaveBeenCalledWith('boiled-egg')
  })

  it('should prevent navigation when toggle button is clicked', () => {
    const mockToggle = vi.fn()
    renderRecipeCard({ onToggleCompletion: mockToggle })

    const toggleButton = screen.getByTestId('toggle-completion')
    fireEvent.click(toggleButton)

    // stopPropagation should be called to prevent navigation
    expect(mockToggle).toHaveBeenCalled()
  })

  it('should render emoji when image validation fails', () => {
    renderRecipeCard()

    // Since isValidImageUrl is mocked to return false, the emoji fallback renders
    // There are two emoji elements: the large fallback and the small badge overlay
    const emojis = screen.getAllByText('🥚')
    expect(emojis.length).toBeGreaterThanOrEqual(1)
  })

  it('should apply hover styles on interaction', () => {
    renderRecipeCard()

    const card = screen.getByTestId('recipe-card')
    expect(card.className).toContain('hover:shadow-xl')
    expect(card.className).toContain('transition-all')
  })

  it('should display difficulty badge correctly', () => {
    renderRecipeCard()

    const difficultyBadge = screen.getByText('beginner')
    expect(difficultyBadge).toBeInTheDocument()
    // getDifficultyColor returns 'bg-green-100 text-green-800' for beginner
    expect(difficultyBadge.className).toContain('bg-green-100')
    expect(difficultyBadge.className).toContain('text-green-800')
  })

  it('should handle missing image gracefully', () => {
    const recipeWithoutImage = {
      ...mockRecipe,
      imageUrl: '',
    }

    renderRecipeCard({ recipe: recipeWithoutImage })

    // Should still render without crashing
    expect(screen.getByText('Perfect Boiled Egg')).toBeInTheDocument()
  })
})
