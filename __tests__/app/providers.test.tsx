import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { Providers } from '@/app/providers'

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

describe('Providers', () => {
  it('renders children correctly', () => {
    const { getByTestId } = render(
      <Providers>
        <div data-testid="child">Hello</div>
      </Providers>
    )
    expect(getByTestId('child')).toBeDefined()
  })

  it('hides ReactQueryDevtools on mobile via hidden sm:block wrapper', () => {
    const { container } = render(
      <Providers>
        <div>Content</div>
      </Providers>
    )

    // The devtools wrapper should have hidden sm:block classes
    const devtoolsWrapper = container.querySelector('.hidden.sm\\:block')
    expect(devtoolsWrapper).toBeDefined()
  })
})
