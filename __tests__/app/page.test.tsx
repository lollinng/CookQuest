import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from '@/app/page'
import React from 'react'

// Mock the store — include ALL exports the Dashboard uses
const mockGetSkillProgress = vi.fn((skill: string) => {
  const progressMap: Record<string, { completed: number; total: number; percentage: number }> = {
    'basic-cooking': { completed: 1, total: 3, percentage: 33 },
    'heat-control': { completed: 0, total: 5, percentage: 0 },
    'flavor-building': { completed: 0, total: 7, percentage: 0 },
    'air-fryer': { completed: 0, total: 6, percentage: 0 },
    'indian-cuisine': { completed: 0, total: 7, percentage: 0 },
  }
  return progressMap[skill] || { completed: 0, total: 0, percentage: 0 }
})

const mockGetOverallProgress = vi.fn(() => ({ completed: 1, total: 28, percentage: 4 }))

const mockStoreReturn = {
  completedRecipes: new Set(['boiled-egg']),
  toggleRecipeCompletion: vi.fn(),
  isRecipeCompleted: vi.fn((id: string) => id === 'boiled-egg'),
  getSkillProgress: mockGetSkillProgress,
  getOverallProgress: mockGetOverallProgress,
}

vi.mock('@/lib/stores/recipe-store', () => ({
  useRecipeStore: vi.fn(() => mockStoreReturn),
  useStoreHydrated: vi.fn(() => true),
}))

// Mock the hooks — include ALL hooks the Dashboard and its children use
const mockSkills = [
  {
    id: 'basic-cooking',
    name: 'Basic Cooking',
    description: 'Start with the fundamentals',
    icon: '🍳',
    recipes: ['boiled-egg', 'make-rice', 'chop-onion'],
    color: 'blue',
  },
  {
    id: 'heat-control',
    name: 'Heat Control',
    description: 'Master temperature management',
    icon: '🔥',
    recipes: ['sear-steak', 'simmer-soup', 'deep-fry', 'stir-fry', 'grill-chicken'],
    color: 'orange',
  },
  {
    id: 'flavor-building',
    name: 'Flavor Building',
    description: 'Build layers of flavor',
    icon: '🧂',
    recipes: ['make-sauce', 'season-taste', 'herb-pairing', 'spice-blend', 'marinate', 'balance-flavors', 'umami-boost'],
    color: 'purple',
  },
]

const mockRecipes = [
  {
    id: 'boiled-egg',
    title: 'Perfect Boiled Egg',
    description: 'Learn the basics of boiling eggs',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    time: '10 minutes',
    imageUrl: '',
    emoji: '🥚',
  },
  {
    id: 'make-rice',
    title: 'Perfect Rice',
    description: 'Master the art of cooking rice',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    time: '20 minutes',
    imageUrl: '',
    emoji: '🍚',
  },
  {
    id: 'chop-onion',
    title: 'Chop Onions Like a Pro',
    description: 'Learn knife skills',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    time: '15 minutes',
    imageUrl: '',
    emoji: '🧅',
  },
]

const mockUseRecipes = vi.fn(() => ({
  data: mockRecipes,
  isLoading: false,
  isError: false,
}))

const mockUseSkills = vi.fn(() => ({
  data: mockSkills,
  isLoading: false,
  isError: false,
}))

const mockUseRandomTip = vi.fn(() => ({
  data: { content: 'Salt enhances flavor, acid brightens it, fat carries it.' },
  refetch: vi.fn(),
  isLoading: false,
}))

vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: (...args: any[]) => mockUseRecipes(...args),
  useSkills: (...args: any[]) => mockUseSkills(...args),
  useRandomTip: (...args: any[]) => mockUseRandomTip(...args),
  useDailyTip: vi.fn(() => ({ data: null, isLoading: false })),
  useRecipeDetail: vi.fn(() => ({ data: null, isLoading: false })),
  useSkillData: vi.fn(() => ({ data: [], isLoading: false })),
  usePrefetchRecipe: vi.fn(() => vi.fn()),
  usePrefetchSkill: vi.fn(() => vi.fn()),
  useUserPhotos: vi.fn(() => ({ data: new Map(), isLoading: false })),
  useUploadRecipePhoto: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useInvalidateRecipes: vi.fn(() => ({ invalidateAll: vi.fn(), invalidateRecipe: vi.fn(), invalidateSkill: vi.fn() })),
  recipeKeys: { all: ['recipes'], lists: () => ['recipes', 'list'] },
  skillKeys: { all: ['skills'] },
  tipKeys: { random: ['tips', 'random'], daily: ['tips', 'daily'] },
  photoKeys: { userPhotos: ['userPhotos'] },
}))

// Mock auth context used by UserMenu
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock the AuthDialog component that UserMenu renders when not authenticated
vi.mock('@/components/auth/auth-dialog', () => ({
  AuthDialog: () => <button>Sign In</button>,
}))

// Mock Next.js components
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks to default returns
    mockUseRecipes.mockReturnValue({
      data: mockRecipes,
      isLoading: false,
      isError: false,
    })
    mockUseSkills.mockReturnValue({
      data: mockSkills,
      isLoading: false,
      isError: false,
    })
    mockUseRandomTip.mockReturnValue({
      data: { content: 'Salt enhances flavor, acid brightens it, fat carries it.' },
      refetch: vi.fn(),
      isLoading: false,
    })
    mockGetSkillProgress.mockImplementation((skill: string) => {
      const progressMap: Record<string, { completed: number; total: number; percentage: number }> = {
        'basic-cooking': { completed: 1, total: 3, percentage: 33 },
        'heat-control': { completed: 0, total: 5, percentage: 0 },
        'flavor-building': { completed: 0, total: 7, percentage: 0 },
        'air-fryer': { completed: 0, total: 6, percentage: 0 },
        'indian-cuisine': { completed: 0, total: 7, percentage: 0 },
      }
      return progressMap[skill] || { completed: 0, total: 0, percentage: 0 }
    })
    mockGetOverallProgress.mockReturnValue({ completed: 1, total: 28, percentage: 4 })
  })

  it('should render the main dashboard elements', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    // Check for main heading
    expect(screen.getByText('CookQuest')).toBeInTheDocument()

    // Check for level indicator (Level 1 with 1 completed recipe = 100 XP)
    expect(screen.getByText(/Level 1/)).toBeInTheDocument()
    expect(screen.getByText(/Beginner/)).toBeInTheDocument()

    // Check for streak indicator (desktop variant)
    expect(screen.getByText(/Streak:/)).toBeInTheDocument()
  })

  it('should display skill cards with correct progress', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Check for Basic Cooking skill card (appears in both skill card and CTA, use getAllByText)
      const basicCookingElements = screen.getAllByText('Basic Cooking')
      expect(basicCookingElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('1/3 completed')).toBeInTheDocument()

      // Check for other skills (these are locked so they show 0/total)
      const heatControlElements = screen.getAllByText('Heat Control')
      expect(heatControlElements.length).toBeGreaterThanOrEqual(1)
      const flavorBuildingElements = screen.getAllByText('Flavor Building')
      expect(flavorBuildingElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should display overall progress in the header', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      // The header shows "X of Y recipes completed" in the desktop layout
      expect(screen.getByText('1 of 28 recipes completed')).toBeInTheDocument()
    })
  })

  it('should show cooking tip component', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    // The CookingTip component renders "Chef Bot says:" heading
    expect(screen.getByText('Chef Bot says:')).toBeInTheDocument()
  })

  it('should display recent recipes section', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Recent Recipes')).toBeInTheDocument()
      expect(screen.getByText('Perfect Boiled Egg')).toBeInTheDocument()
      expect(screen.getByText('Perfect Rice')).toBeInTheDocument()
    })
  })

  it('should show continue learning CTA when progress is less than 100%', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Ready for your next challenge?')).toBeInTheDocument()
      expect(screen.getByText(/Your kitchen awaits/)).toBeInTheDocument()
    })
  })

  it('should handle loading state', async () => {
    mockUseRecipes.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    render(<Dashboard />, { wrapper: createWrapper() })

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('should handle error state', async () => {
    mockUseRecipes.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    render(<Dashboard />, { wrapper: createWrapper() })

    expect(screen.getByText('Failed to load recipes')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('should link to skill pages correctly', async () => {
    render(<Dashboard />, { wrapper: createWrapper() })

    // SkillCard links to /skill/${skill.id} — multiple links may match (skill card + CTA)
    const basicCookingLinks = screen.getAllByRole('link', { name: /basic cooking/i })
    expect(basicCookingLinks.length).toBeGreaterThanOrEqual(1)
    // The first one is the SkillCard link
    expect(basicCookingLinks[0]).toHaveAttribute('href', '/skill/basic-cooking')
  })

  it('should show achievement badges for completed skills', async () => {
    // Mock a skill with 100% progress so the achievement badge appears
    mockGetSkillProgress.mockImplementation((skill: string) => {
      if (skill === 'basic-cooking') {
        return { completed: 3, total: 3, percentage: 100 }
      }
      return { completed: 0, total: 5, percentage: 0 }
    })
    mockGetOverallProgress.mockReturnValue({ completed: 3, total: 28, percentage: 11 })

    render(<Dashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('skill-completed-badge')).toBeInTheDocument()
    })
  })
})
