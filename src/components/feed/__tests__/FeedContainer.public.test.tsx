import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { FeedContainer } from '../FeedContainer'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock the fetch function
global.fetch = jest.fn()

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock next/link
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  }
})

// Mock the Markdown component
jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content, className }: { content: string; className?: string }) => (
    <div className={className}>{content}</div>
  ),
}))

describe('FeedContainer - Public Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock as unauthenticated user
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)
  })

  it('should render loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    )

    const { container } = render(<FeedContainer isPublic={true} showHeader={false} />)
    
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('border-primary')
  })

  it('should render feed items after loading', async () => {
    const mockFeedData = {
      items: [
        {
          id: 'proj1',
          type: 'project_created',
          title: 'New project: Test Project',
          timestamp: '2024-01-01T00:00:00Z',
          user: { id: 'user1', name: 'John Doe' },
          data: {
            id: 'proj1',
            name: 'Test Project',
            description: 'A test project description',
            helpType: 'MVP'
          }
        },
        {
          id: 'prod1',
          type: 'product_created',
          title: 'New product: Test Product',
          timestamp: '2024-01-02T00:00:00Z',
          user: { id: 'user2', name: 'Jane Smith' },
          data: {
            id: 'prod1',
            name: 'Test Product',
            description: 'A test product description',
            _count: { projects: 3 }
          }
        }
      ]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(screen.getByText('New project: Test Project')).toBeInTheDocument()
      expect(screen.getByText('New product: Test Product')).toBeInTheDocument()
    })

    // Should NOT show 'by' text in feed items
    expect(screen.queryByText('by John Doe')).not.toBeInTheDocument()
    expect(screen.queryByText('by Jane Smith')).not.toBeInTheDocument()
    expect(screen.getByText('MVP')).toBeInTheDocument()
    expect(screen.getByText('3 projects')).toBeInTheDocument()
  })

  it('should render empty state when no items', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] })
    })

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(screen.getByText('No activities yet')).toBeInTheDocument()
    })
  })

  it('should render different item types correctly', async () => {
    const mockFeedData = {
      items: [
        {
          id: 'q1',
          type: 'question_asked',
          title: 'John asked: How to implement authentication?',
          timestamp: '2024-01-03T00:00:00Z',
          user: { id: 'user3', name: 'John' },
          data: { id: 'q1', content: 'How to implement authentication?' }
        },
        {
          id: 'a1',
          type: 'answer_posted',
          title: 'Alice answered: How to implement...',
          timestamp: '2024-01-04T00:00:00Z',
          user: { id: 'user4', name: 'Alice' },
          data: {
            id: 'a1',
            content: 'You can use NextAuth.js',
            questionId: 'q1'
          }
        },
        {
          id: 'pu1',
          type: 'product_update',
          title: 'Product update: Test Product',
          timestamp: '2024-01-05T00:00:00Z',
          user: { id: 'user2', name: 'Jane' },
          data: {
            id: 'pu1',
            content: 'Released version 2.0',
            productId: 'prod1'
          }
        }
      ]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(screen.getByText('John asked: How to implement authentication?')).toBeInTheDocument()
      expect(screen.getByText('Alice answered: How to implement...')).toBeInTheDocument()
      expect(screen.getByText('Product update: Test Product')).toBeInTheDocument()
    })

    // Check for correct links
    expect(screen.getByText('View Question')).toHaveAttribute('href', '/public/questions/q1')
    expect(screen.getByText('View Discussion')).toHaveAttribute('href', '/public/questions/q1')
    expect(screen.getByText('View Product')).toHaveAttribute('href', '/public/products/prod1')
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(screen.getByText('No activities yet')).toBeInTheDocument()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching feed items:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('should format dates correctly', async () => {
    const mockDate = new Date('2024-01-15T10:30:00Z')
    const mockFeedData = {
      items: [{
        id: 'proj1',
        type: 'project_created',
        title: 'New project: Test',
        timestamp: mockDate.toISOString(),
        user: { id: 'user1', name: 'User' },
        data: { id: 'proj1', name: 'Test', description: 'Desc', helpType: 'MVP' }
      }]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    })
  })

  it('should use public API endpoint', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] })
    })

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/public/feed')
    })
  })

  it('should not show header when showHeader is false', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] })
    })

    render(<FeedContainer isPublic={true} showHeader={false} />)

    await waitFor(() => {
      expect(screen.queryByText('Activity Feed')).not.toBeInTheDocument()
      expect(screen.queryByText('Stay up to date with the latest activities')).not.toBeInTheDocument()
      expect(screen.queryByText('Refresh Feed')).not.toBeInTheDocument()
    })
  })
})