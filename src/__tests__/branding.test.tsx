import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}))

jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content, className }: { content: string; className?: string }) => (
    <div className={className}>{content}</div>
  ),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Import components that should use correct branding
import ProductsPage from '@/app/products/page'

describe('Branding Consistency', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any)

    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@example.com', name: 'Test User' } },
      status: 'authenticated',
    } as any)

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('uses Maix instead of MAIX in ProductsPage', async () => {
    render(<ProductsPage />)
    
    await screen.findByText(/Discover and manage products in the Maix community/)
    
    // Should not find MAIX anywhere
    const container = screen.getByText(/Discover and manage products in the Maix community/).closest('div')
    expect(container?.textContent).not.toMatch(/MAIX/)
  })

  it('uses correct branding in empty states', async () => {
    render(<ProductsPage />)
    
    // Wait for loading to complete
    await screen.findByText('Products')
    
    // Check that no MAIX branding appears
    const allText = document.body.textContent || ''
    expect(allText).not.toMatch(/MAIX/)
  })
})