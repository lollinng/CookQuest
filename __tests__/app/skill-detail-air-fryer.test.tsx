import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkillPage from '@/app/skill/[skillId]/page'

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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ skillId: 'air-fryer' }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock hooks
vi.mock('@/hooks/use-recipes', () => ({
  useSkillData: () => ({
    data: [
      { id: 'air-fryer-fries', title: 'Crispy Air Fryer Fries', description: 'Desc', skill: 'air-fryer', difficulty: 'beginner', time: '20 min', ingredients: ['a'], instructions: ['b'], emoji: '🍟' },
    ],
    isLoading: false,
    isError: false,
  }),
  useSkills: () => ({
    data: [
      { id: 'air-fryer', name: 'Air Fryer Mastery', description: 'Master air fryer cooking', icon: '🍟', recipes: ['air-fryer-fries'], color: 'emerald' },
    ],
    isLoading: false,
  }),
  useUserPhotos: vi.fn().mockReturnValue({ data: new Map(), isLoading: false }),
  useUploadRecipePhoto: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}))

// Mock store
vi.mock('@/lib/stores/recipe-store', () => ({
  useRecipeStore: () => ({
    getSkillProgress: () => ({ completed: 0, total: 6, percentage: 0 }),
    toggleRecipeCompletion: vi.fn(),
    isRecipeCompleted: () => false,
  }),
  useStoreHydrated: () => true,
}))

// Mock learning path
vi.mock('@/components/learning-path', () => ({
  LearningPath: ({ skillName }: any) => <div data-testid="learning-path">{skillName}</div>,
}))

describe('Skill detail page - Air Fryer', () => {
  it('renders air fryer skill name from SKILL_META', () => {
    render(<SkillPage />)
    const elements = screen.getAllByText('Air Fryer Mastery')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('resolves air-fryer slug correctly', () => {
    render(<SkillPage />)
    // Should NOT show "Skill not found"
    expect(screen.queryByText('Skill not found')).toBeNull()
  })

  it('renders air fryer learn tags', () => {
    render(<SkillPage />)
    expect(screen.getByText('Temperature settings')).toBeDefined()
    expect(screen.getByText('Basket arrangement')).toBeDefined()
  })
})
