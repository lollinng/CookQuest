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

describe('Air Fryer skill', () => {
  it('validates air-fryer as a valid skill type', () => {
    expect(isValidSkillType('air-fryer')).toBe(true)
  })

  it('renders emerald progress bar for air-fryer skill', () => {
    const { container } = render(
      <SkillCard
        skill={{
          id: 'air-fryer',
          name: 'Air Fryer Mastery',
          description: 'Master air fryer cooking',
          icon: '🍟',
          recipes: ['r1'],
          color: 'emerald',
        }}
        progress={{ completed: 0, total: 1, percentage: 0 }}
      />
    )
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator?.className).toContain('from-emerald')
  })
})
