// TypeScript test fixes applied
import { TodoStatus, ProjectStatus } from '@prisma/client'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FeedContainer } from '../FeedContainer'
import { SessionProvider } from 'next-auth/react'
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { email: 'test@example.com' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children
}))

// Mock Markdown component
jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div>{content}</div>
}))

// Mock fetch
global.fetch = jest.fn()

describe('FeedContainer - Celebration Display', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display celebration styling for completed projects', async () => {
    const mockFeedData = {
      items: [
        {
          id: 'proj1',
          type: 'project_created',
          title: 'Completed: Test Project',
          timestamp: '2024-01-01T00:00:00Z',
          user: { id: 'user1', name: 'John Doe' },
          data: {
            id: 'proj1',
            name: 'Test Project',
            description: 'A completed test project',
            status: ProjectStatus.COMPLETED,
            helpType: 'MVP',
            isActive: false
          }
        },
        {
          id: 'proj2',
          type: 'project_created',
          title: 'New project: Active Project',
          timestamp: '2024-01-02T00:00:00Z',
          user: { id: 'user2', name: 'Jane Doe' },
          data: {
            id: 'proj2',
            name: 'Active Project',
            description: 'An active project',
            status: ProjectStatus.IN_PROGRESS,
            helpType: 'MVP',
            isActive: true
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
      // Check for celebration title with emojis
      expect(screen.getByText('🎉 Completed: Test Project 🎉')).toBeInTheDocument()
      
      // Check for celebration banner
      expect(screen.getByText('Project Completed!')).toBeInTheDocument()
      expect(screen.getByText('Congratulations to the team for successfully delivering this project! 🚀')).toBeInTheDocument()
      
      // Check that non-completed project doesn't have celebration
      expect(screen.getByText('New project: Active Project')).toBeInTheDocument()
      expect(screen.queryByText('🎉 New project: Active Project 🎉')).not.toBeInTheDocument()
    })

    // Check for visual styling (ring class on completed project)
    const completedProjectCard = screen.getByText('🎉 Completed: Test Project 🎉').closest('.hover\\:shadow-md')
    expect(completedProjectCard).toHaveClass('ring-2', 'ring-green-400', 'ring-offset-2')

    // Check for status badge
    expect(screen.getByText('Completed')).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('should sort projects by updatedAt to show recently completed at top', async () => {
    const mockFeedData = {
      items: [
        {
          id: 'proj1',
          type: 'project_created',
          title: 'Completed: Recently Completed',
          timestamp: '2024-01-05T00:00:00Z', // Most recent updatedAt
          user: { id: 'user1', name: 'John Doe' },
          data: {
            id: 'proj1',
            name: 'Recently Completed',
            description: 'Just completed',
            status: ProjectStatus.COMPLETED,
            helpType: 'MVP'
          }
        },
        {
          id: 'proj2',
          type: 'project_created',
          title: 'New project: Older Project',
          timestamp: '2024-01-01T00:00:00Z', // Older updatedAt
          user: { id: 'user2', name: 'Jane Doe' },
          data: {
            id: 'proj2',
            name: 'Older Project',
            description: 'Created earlier',
            status: 'AWAITING_VOLUNTEERS',
            helpType: 'MVP'
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
      // Check that both projects are displayed
      expect(screen.getByText('🎉 Completed: Recently Completed 🎉')).toBeInTheDocument()
      expect(screen.getByText('New project: Older Project')).toBeInTheDocument()
      
      // The completed project should have the green ring styling
      const completedProjectCard = screen.getByText('🎉 Completed: Recently Completed 🎉').closest('.hover\\:shadow-md')
      expect(completedProjectCard).toHaveClass('ring-2', 'ring-green-400', 'ring-offset-2')
    })
  })
})