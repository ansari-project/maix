import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PublicProductsPage from '../page'

// Mock dependencies
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock Markdown component
jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content, className }: { content: string; className?: string }) => (
    <div className={className} data-testid="markdown-content">{content}</div>
  ),
}))

describe('PublicProductsPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('displays owner information on public page', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Public Product',
        description: 'Product description',
        url: null,
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Product Owner' },
        _count: { projects: 1 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: mockProducts }),
    })

    render(<PublicProductsPage />)

    await waitFor(() => {
      // Product name should be visible
      expect(screen.getByText('Public Product')).toBeInTheDocument()
      
      // Owner information SHOULD be displayed on public page
      expect(screen.getByText('by Product Owner')).toBeInTheDocument()
    })
  })

  it('does not apply truncation to descriptions on public page', async () => {
    const longDescription = 'This is a very long description. '.repeat(20)
    const mockProducts = [
      {
        id: '1',
        name: 'Public Product',
        description: longDescription,
        url: null,
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Owner' },
        _count: { projects: 0 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: mockProducts }),
    })

    render(<PublicProductsPage />)

    await waitFor(() => {
      const markdownElement = screen.getByTestId('markdown-content')
      
      // Public page should NOT have line-clamp-4 class
      expect(markdownElement).not.toHaveClass('line-clamp-4')
      // Check that the content is rendered (even if it's long)
      expect(markdownElement).toBeInTheDocument()
    })
  })

  it('shows clickable product names as regular text', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Test Product',
        description: 'Description',
        url: 'https://example.com',
        createdAt: '2024-01-01',
        owner: { id: '1', name: 'Owner' },
        _count: { projects: 2 },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: mockProducts }),
    })

    render(<PublicProductsPage />)

    await waitFor(() => {
      // Product name is not a link on the public page
      const productName = screen.getByText('Test Product')
      expect(productName.tagName).not.toBe('A')
      expect(productName.closest('a')).toBeNull()
    })
  })
})