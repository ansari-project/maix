import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ProductsPage from '../page'

// Mock the dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()

// Mock Markdown component to match the actual implementation more closely
jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content, className }: { content: string; className?: string }) => (
    <div className={`prose prose-sm max-w-none ${className || ''}`}>{content}</div>
  ),
}))

describe('ProductsPage', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any)

    // Reset fetch mock
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders product names as clickable links', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
      },
      status: 'authenticated',
    } as any)

    const mockProducts = [
      {
        id: '1',
        name: 'Test Product 1',
        description: 'Description 1',
        url: 'https://example.com',
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Owner 1', email: 'owner1@example.com' },
        _count: { projects: 2 },
      },
      {
        id: '2',
        name: 'Test Product 2',
        description: 'Description 2',
        url: null,
        createdAt: '2024-01-02',
        owner: { id: '2', name: 'Owner 2', email: 'owner2@example.com' },
        _count: { projects: 0 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    })

    render(<ProductsPage />)

    await waitFor(() => {
      const link1 = screen.getByRole('link', { name: 'Test Product 1' })
      expect(link1).toBeInTheDocument()
      expect(link1).toHaveAttribute('href', '/products/1')
      expect(link1).toHaveClass('hover:underline')

      const link2 = screen.getByRole('link', { name: 'Test Product 2' })
      expect(link2).toBeInTheDocument()
      expect(link2).toHaveAttribute('href', '/products/2')
      expect(link2).toHaveClass('hover:underline')
    })
  })

  it('does not display owner information', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
      },
      status: 'authenticated',
    } as any)

    const mockProducts = [
      {
        id: '1',
        name: 'Test Product',
        description: 'Description',
        url: null,
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Product Owner', email: 'owner@example.com' },
        _count: { projects: 1 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    })

    render(<ProductsPage />)

    await waitFor(() => {
      // Product name should be visible
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      
      // Owner information should NOT be displayed
      expect(screen.queryByText('Product Owner')).not.toBeInTheDocument()
      expect(screen.queryByText('owner@example.com')).not.toBeInTheDocument()
      expect(screen.queryByText(/by Product Owner/)).not.toBeInTheDocument()
      expect(screen.queryByText(/by owner@example.com/)).not.toBeInTheDocument()
    })
  })

  it('applies line-clamp-4 to product descriptions', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
      },
      status: 'authenticated',
    } as any)

    const longDescription = 'This is a very long description. '.repeat(20)
    const mockProducts = [
      {
        id: '1',
        name: 'Test Product',
        description: longDescription,
        url: null,
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Owner', email: 'owner@example.com' },
        _count: { projects: 0 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    })

    render(<ProductsPage />)

    await waitFor(() => {
      // Find all elements with prose-sm class
      const proseElements = document.querySelectorAll('.prose-sm')
      
      // Find the one that contains our long description and has line-clamp-4
      let markdownWrapper = null
      proseElements.forEach(el => {
        if (el.textContent?.includes('This is a very long description') && el.classList.contains('line-clamp-4')) {
          markdownWrapper = el
        }
      })
      
      expect(markdownWrapper).not.toBeNull()
      expect(markdownWrapper).toHaveClass('prose-sm')
      expect(markdownWrapper).toHaveClass('line-clamp-4')
    })
  })

  it('displays Maix branding instead of MAIX', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
      },
      status: 'authenticated',
    } as any)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Discover and manage products in the Maix community/)).toBeInTheDocument()
      expect(screen.queryByText(/MAIX/)).not.toBeInTheDocument()
    })
  })

  it('shows correct project count pluralization', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
      },
      status: 'authenticated',
    } as any)

    const mockProducts = [
      {
        id: '1',
        name: 'Product with 1 project',
        description: 'Description',
        url: null,
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Owner', email: 'owner@example.com' },
        _count: { projects: 1 },
      },
      {
        id: '2',
        name: 'Product with 3 projects',
        description: 'Description',
        url: null,
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Owner', email: 'owner@example.com' },
        _count: { projects: 3 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    })

    render(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText('1 project')).toBeInTheDocument()
      expect(screen.getByText('3 projects')).toBeInTheDocument()
    })
  })
})