/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import TodosPage from '../page'

jest.mock('next-auth/react')
jest.mock('next/navigation')

// Mock fetch globally
global.fetch = jest.fn()

describe('TodosPage Integration', () => {
  const mockPush = jest.fn()
  const mockSession = {
    user: {
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User'
    }
  }

  const mockTodos = [
    {
      id: '1',
      title: 'First Todo',
      description: 'Description 1',
      status: 'NOT_STARTED',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      projectId: null,
      creatorId: 'user1',
      assigneeId: null,
      dueDate: null,
      project: null,
      assignee: null,
      comments: []
    },
    {
      id: '2',
      title: 'Second Todo',
      description: 'Description 2',
      status: 'IN_PROGRESS',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      projectId: null,
      creatorId: 'user1',
      assigneeId: null,
      dueDate: null,
      project: null,
      assignee: null,
      comments: []
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ todos: mockTodos })
    })
  })

  it('renders the todos page with both panes', async () => {
    render(<TodosPage />)

    await waitFor(() => {
      expect(screen.getByText('First Todo')).toBeInTheDocument()
      expect(screen.getByText('Second Todo')).toBeInTheDocument()
    })

    // Check for details panel placeholder
    expect(screen.getByText('Select a todo to view details')).toBeInTheDocument()
  })

  it('displays todo details when a todo is selected', async () => {
    render(<TodosPage />)

    await waitFor(() => {
      expect(screen.getByText('First Todo')).toBeInTheDocument()
    })

    // Click on first todo
    fireEvent.click(screen.getByText('First Todo'))

    // Check that details panel shows todo information
    await waitFor(() => {
      expect(screen.getByDisplayValue('First Todo')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Description 1')).toBeInTheDocument()
    })
  })

  it('fetches todos from the correct API endpoint', async () => {
    render(<TodosPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/todos')
    })
  })

  it('redirects to signin when unauthenticated', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(<TodosPage />)

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('shows loading state initially', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'loading'
    })

    const { container } = render(<TodosPage />)
    
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<TodosPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load todos. Please check your connection.')).toBeInTheDocument()
    })
  })

  it('updates todo when changed in details panel', async () => {
    const updatedTodo = { ...mockTodos[0], title: 'Updated Title' }
    
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ todos: mockTodos })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTodo
      })

    render(<TodosPage />)

    await waitFor(() => {
      expect(screen.getByText('First Todo')).toBeInTheDocument()
    })

    // Select first todo
    fireEvent.click(screen.getByText('First Todo'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('First Todo')).toBeInTheDocument()
    })

    // Update title
    const titleInput = screen.getByLabelText(/Title/i)
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Wait for auto-save
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/todos/1',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    }, { timeout: 3000 })
  })

  it('has responsive grid layout', async () => {
    const { container } = render(<TodosPage />)

    await waitFor(() => {
      expect(screen.getByText('First Todo')).toBeInTheDocument()
    })

    // Check for grid layout
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-2')
  })

  it('integrates all Phase components correctly', async () => {
    render(<TodosPage />)

    await waitFor(() => {
      // Phase 2: Group selector
      expect(screen.getByRole('combobox', { name: /Group by/i })).toBeInTheDocument()
      
      // Phase 1: Split layout (checked via grid above)
      
      // Phase 4: Enhanced details panel with tabs
      expect(screen.getByText('First Todo')).toBeInTheDocument()
    })

    // Select a todo to see enhanced details
    fireEvent.click(screen.getByText('First Todo'))

    await waitFor(() => {
      // Phase 4: Tabs in details panel
      expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Comments/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
    })
  })
})