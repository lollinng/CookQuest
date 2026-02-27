import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SkillCard } from '@/components/skill-card'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const baseSkill = {
  id: 'basic-cooking',
  name: 'Basic Cooking',
  description: 'Learn the basics',
  icon: '🍳',
  recipes: ['r1', 'r2', 'r3'],
  color: 'blue',
}

const baseProgress = { completed: 1, total: 3, percentage: 33 }

describe('SkillCard progress bar colors', () => {
  it('renders blue progress indicator for blue skill', () => {
    const { container } = render(
      <SkillCard skill={{ ...baseSkill, color: 'blue' }} progress={baseProgress} />
    )
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toBeDefined()
    expect(indicator?.className).toContain('from-blue')
  })

  it('renders orange progress indicator for orange skill', () => {
    const { container } = render(
      <SkillCard skill={{ ...baseSkill, id: 'heat-control', color: 'orange' }} progress={baseProgress} />
    )
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toBeDefined()
    expect(indicator?.className).toContain('from-orange')
  })

  it('renders purple progress indicator for purple skill', () => {
    const { container } = render(
      <SkillCard skill={{ ...baseSkill, id: 'flavor-building', color: 'purple' }} progress={baseProgress} />
    )
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toBeDefined()
    expect(indicator?.className).toContain('from-purple')
  })
})
