import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { FeedContainer } from '../FeedContainer'
import { useSession } from 'next-auth/react'
import '@testing-library/jest-dom'

// Mock next-auth
jest.mock('next-auth/react')

// Mock the fetch function
global.fetch = jest.fn()

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

describe('FeedContainer', () => {
  const mockSession = {
    user: {
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: mockSession })
  })

  it('should render loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    )

    render(<FeedContainer />)
    
    // Look for the spinner by its classes
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
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
            status: 'AWAITING_VOLUNTEERS',
            helpType: 'MVP',
            isActive: true
          }
        },
        {
          id: 'q1',
          type: 'question_asked',
          title: 'John asked: How to implement authentication?',
          timestamp: '2024-01-02T00:00:00Z',
          user: { id: 'user2', name: 'John' },
          data: {
            id: 'q1',
            content: 'How to implement authentication in Next.js?'
          }
        }
      ]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument()
      expect(screen.getByText('New project: Test Project')).toBeInTheDocument()
      expect(screen.getByText('John asked: How to implement authentication?')).toBeInTheDocument()
    })

    // User name no longer displayed in feed items
    // Check for the project elements we know exist
    expect(screen.getByText('A test project description')).toBeInTheDocument()
    expect(screen.getByText('MVP')).toBeInTheDocument()
  })

  it('should render empty state when no items', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] })
    })

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.getByText('No activities yet')).toBeInTheDocument()
      expect(screen.getByText('Start by creating a project or updating your profile to see activity here.')).toBeInTheDocument()
    })
  })

  it('should render all different item types correctly', async () => {
    const mockFeedData = {
      items: [
        {
          id: 'prod1',
          type: 'product_created',
          title: 'New product: Test Product',
          timestamp: '2024-01-01T00:00:00Z',
          user: { id: 'user1', name: 'Alice' },
          data: {
            id: 'prod1',
            name: 'Test Product',
            description: 'A test product',
            _count: { projects: 5 }
          }
        },
        {
          id: 'pu1',
          type: 'product_update',
          title: 'Product update: Test Product',
          timestamp: '2024-01-02T00:00:00Z',
          user: { id: 'user2', name: 'Bob' },
          data: {
            id: 'pu1',
            content: 'Released version 2.0',
            productId: 'prod1'
          }
        },
        {
          id: 'a1',
          type: 'answer_posted',
          title: 'Charlie answered a question',
          timestamp: '2024-01-03T00:00:00Z',
          user: { id: 'user3', name: 'Charlie' },
          data: {
            id: 'a1',
            content: 'You can use NextAuth.js for authentication',
            parentId: 'q1'
          }
        },
      ]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.getByText('New product: Test Product')).toBeInTheDocument()
      expect(screen.getByText('Product update: Test Product')).toBeInTheDocument()
      expect(screen.getByText('Charlie answered a question')).toBeInTheDocument()
    })

    // Check for specific content
    expect(screen.getByText('5 projects')).toBeInTheDocument()
    expect(screen.getByText('Released version 2.0')).toBeInTheDocument()
    expect(screen.getByText('You can use NextAuth.js for authentication')).toBeInTheDocument()

    // Check for correct links - titles are now clickable links
    const productLink = screen.getByRole('link', { name: 'New product: Test Product' })
    expect(productLink).toHaveAttribute('href', '/products/prod1')
    
    const productUpdateLink = screen.getByRole('link', { name: 'Product update: Test Product' })
    expect(productUpdateLink).toHaveAttribute('href', '/products/prod1')
    
    const answerLink = screen.getByRole('link', { name: 'Charlie answered a question' })
    expect(answerLink).toHaveAttribute('href', '/q-and-a/q1')
  })

  it('should handle refresh button click', async () => {
    const mockFeedData = {
      items: [{
        id: 'proj1',
        type: 'project_created',
        title: 'New project: Initial',
        timestamp: '2024-01-01T00:00:00Z',
        user: { id: 'user1', name: 'User' },
        data: { id: 'proj1', name: 'Initial', description: 'Desc' }
      }]
    }

    const updatedFeedData = {
      items: [{
        id: 'proj2',
        type: 'project_created',
        title: 'New project: Updated',
        timestamp: '2024-01-02T00:00:00Z',
        user: { id: 'user2', name: 'User2' },
        data: { id: 'proj2', name: 'Updated', description: 'New' }
      }]
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeedData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedFeedData
      })

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.getByText('New project: Initial')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh Feed')
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText('New project: Updated')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.getByText('No activities yet')).toBeInTheDocument()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching feed items:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('should not fetch if no session', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ data: null })

    render(<FeedContainer />)

    // Wait a bit to ensure useEffect has run
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(global.fetch).not.toHaveBeenCalled()
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
        data: { id: 'proj1', name: 'Test', description: 'Desc' }
      }]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer />)

    await waitFor(() => {
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    })
  })

  it('should handle null user names gracefully', async () => {
    const mockFeedData = {
      items: [{
        id: 'proj1',
        type: 'project_created',
        title: 'New project: Test',
        timestamp: '2024-01-01T00:00:00Z',
        user: { id: 'user1', name: null },
        data: { id: 'proj1', name: 'Test', description: 'Desc' }
      }]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedData
    })

    render(<FeedContainer />)

    await waitFor(() => {
      // User name is no longer displayed, checking for title instead
      expect(screen.getByText('New project: Test')).toBeInTheDocument()
    })
  })
})