import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SkillCard } from '@/components/skill-card'
import { isValidSkillType } from '@/lib/validation'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Indian Cuisine skill', () => {
  it('validates indian-cuisine as a valid skill type', () => {
    expect(isValidSkillType('indian-cuisine')).toBe(true)
  })

  it('renders amber progress bar for indian-cuisine skill', () => {
    const { container } = render(
      <SkillCard
        skill={{
          id: 'indian-cuisine',
          name: 'Indian Cuisine',
          description: 'Explore Indian cooking',
          icon: '🍛',
          recipes: ['r1'],
          color: 'amber',
        }}
        progress={{ completed: 0, total: 1, percentage: 0 }}
      />
    )
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator?.className).toContain('from-amber')
  })
})
