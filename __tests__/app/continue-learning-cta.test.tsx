import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from '@/app/page'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

// Mock the hooks
vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: () => ({
    data: [
      { id: 'r1', title: 'Recipe 1', description: 'Desc', skill: 'basic-cooking', difficulty: 'beginner', time: '10 min', ingredients: ['a'], instructions: ['b'], emoji: '🍳' },
    ],
    isLoading: false,
    isError: false,
  }),
  useSkills: () => ({
    data: [
      { id: 'basic-cooking', name: 'Basic Cooking', description: 'Basics', icon: '🍳', recipes: ['r1', 'r2', 'r3'], color: 'blue' },
      { id: 'heat-control', name: 'Heat Control', description: 'Heat', icon: '🔥', recipes: ['r4', 'r5'], color: 'orange' },
    ],
    isLoading: false,
  }),
  useRandomTip: () => ({
    data: { content: 'Test tip' },
    refetch: vi.fn(),
  }),
}))

// Mock the store
vi.mock('@/lib/stores/recipe-store', () => ({
  useRecipeStore: () => ({
    completedRecipes: [],
    getSkillProgress: (id: string) => ({ completed: 0, total: 3, percentage: 0 }),
    getOverallProgress: () => ({ completed: 0, total: 5, percentage: 0 }),
    toggleRecipeCompletion: vi.fn(),
    isRecipeCompleted: () => false,
  }),
  useStoreHydrated: () => true,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

// Mock validation
vi.mock('@/lib/validation', () => ({
  isValidImageUrl: () => false,
}))

// Mock auth
vi.mock('@/components/auth/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu">Menu</div>,
}))

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}

describe('Continue Learning CTA', () => {
  it('renders encouraging copy', () => {
    renderDashboard()
    expect(screen.getByText(/ready for your next challenge/i)).toBeDefined()
  })

  it('renders warm gradient (not red)', () => {
    const { container } = renderDashboard()
    // Should contain amber/orange gradient, not red
    const ctaCard = container.querySelector('[class*="from-amber"]')
    expect(ctaCard).toBeTruthy()
  })

  it('renders a chef character', () => {
    renderDashboard()
    // Should contain chef emoji somewhere in CTA
    const chefs = screen.getAllByText('👨‍🍳')
    expect(chefs.length).toBeGreaterThanOrEqual(1)
  })
})
