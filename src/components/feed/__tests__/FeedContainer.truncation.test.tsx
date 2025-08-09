import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import { FeedContainer } from '../FeedContainer'

// Mock dependencies
jest.mock('next-auth/react')
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

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('FeedContainer - Text Truncation', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as any)
    
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('applies line-clamp-4 to all feed item content', async () => {
    const longContent = 'This is a very long content that would normally take up many lines. '.repeat(10)
    
    const mockFeedItems = [
      {
        id: '1',
        type: 'project_created' as const,
        title: 'New Project Created',
        timestamp: new Date().toISOString(),
        user: { id: '1', name: 'Test User' },
        data: {
          id: 'proj1',
          description: longContent,
          projectType: 'tech',
          helpType: 'advice',
        },
      },
      {
        id: '2',
        type: 'product_update' as const,
        title: 'Product Updated',
        timestamp: new Date().toISOString(),
        user: { id: '2', name: 'Another User' },
        data: {
          productId: 'prod1',
          content: longContent,
        },
      },
      {
        id: '3',
        type: 'question_asked' as const,
        title: 'Question Asked',
        timestamp: new Date().toISOString(),
        user: { id: '3', name: 'Question User' },
        data: {
          id: 'q1',
          content: longContent,
        },
      },
      {
        id: '4',
        type: 'answer_posted' as const,
        title: 'Answer Posted',
        timestamp: new Date().toISOString(),
        user: { id: '4', name: 'Answer User' },
        data: {
          id: 'a1',
          parentId: 'q1',
          content: longContent,
        },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockFeedItems }),
    })

    render(<FeedContainer />)

    await waitFor(() => {
      // All markdown content should have both prose-sm and line-clamp-4 classes
      const markdownElements = screen.getAllByTestId('markdown-content')
      
      expect(markdownElements).toHaveLength(4) // One for each feed item
      
      markdownElements.forEach(element => {
        expect(element).toHaveClass('prose-sm')
        expect(element).toHaveClass('line-clamp-4')
      })
    })
  })

  it('applies truncation consistently across different feed item types', async () => {
    const feedTypes = [
      { type: 'project_created' as const, dataKey: 'description' },
      { type: 'product_created' as const, dataKey: 'description' },
      { type: 'product_update' as const, dataKey: 'content' },
      { type: 'question_asked' as const, dataKey: 'content' },
      { type: 'answer_posted' as const, dataKey: 'content' },
    ]

    const mockItems = feedTypes.map((feedType, index) => ({
      id: `${index}`,
      type: feedType.type,
      title: `${feedType.type} Title`,
      timestamp: new Date().toISOString(),
      user: { id: `${index}`, name: `User ${index}` },
      data: {
        id: `item${index}`,
        [feedType.dataKey]: `Content for ${feedType.type}`,
        ...(feedType.type === 'project_created' && { projectType: 'tech', helpType: 'advice' }),
        ...(feedType.type === 'product_created' && { _count: { projects: 0 } }),
        ...(feedType.type === 'product_update' && { productId: 'prod1' }),
        ...(feedType.type === 'answer_posted' && { parentId: 'q1' }),
      },
    }))

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })

    render(<FeedContainer />)

    await waitFor(() => {
      const markdownElements = screen.getAllByTestId('markdown-content')
      
      // Should have one markdown element per feed item
      expect(markdownElements).toHaveLength(feedTypes.length)
      
      // Each should have the truncation classes
      markdownElements.forEach((element, index) => {
        expect(element).toHaveClass('prose-sm', 'line-clamp-4')
        expect(element).toHaveTextContent(`Content for ${feedTypes[index].type}`)
      })
    })
  })

  it('displays no MAIX branding, only Maix', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.queryByText(/MAIX/)).not.toBeInTheDocument()
      const description = screen.getByText(/Stay up to date with the latest activities/)
      expect(description).toHaveTextContent('Stay up to date with the latest activities in the Maix community')
    })
  })
})