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

vi.mock('next/navigation', () => ({
  useParams: () => ({ skillId: 'indian-cuisine' }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/use-recipes', () => ({
  useSkillData: () => ({
    data: [
      { id: 'dal-tadka', title: 'Dal Tadka', description: 'Desc', skill: 'indian-cuisine', difficulty: 'beginner', time: '30 min', ingredients: ['a'], instructions: ['b'], emoji: '🍛' },
    ],
    isLoading: false,
    isError: false,
  }),
  useSkills: () => ({
    data: [
      { id: 'indian-cuisine', name: 'Indian Cuisine', description: 'Explore Indian cooking', icon: '🍛', recipes: ['dal-tadka'], color: 'amber' },
    ],
    isLoading: false,
  }),
  useUserPhotos: vi.fn().mockReturnValue({ data: new Map(), isLoading: false }),
  useUploadRecipePhoto: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}))

vi.mock('@/lib/stores/recipe-store', () => ({
  useRecipeStore: () => ({
    getSkillProgress: () => ({ completed: 0, total: 7, percentage: 0 }),
    toggleRecipeCompletion: vi.fn(),
    isRecipeCompleted: () => false,
  }),
  useStoreHydrated: () => true,
}))

vi.mock('@/components/learning-path', () => ({
  LearningPath: ({ skillName }: any) => <div data-testid="learning-path">{skillName}</div>,
}))

describe('Skill detail page - Indian Cuisine', () => {
  it('renders Indian Cuisine skill name', () => {
    render(<SkillPage />)
    const elements = screen.getAllByText('Indian Cuisine')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('resolves indian-cuisine slug correctly', () => {
    render(<SkillPage />)
    expect(screen.queryByText('Skill not found')).toBeNull()
  })

  it('renders indian cuisine learn tags', () => {
    render(<SkillPage />)
    expect(screen.getByText('Tempering (Tadka)')).toBeDefined()
    expect(screen.getByText('Spice blending')).toBeDefined()
  })
})
