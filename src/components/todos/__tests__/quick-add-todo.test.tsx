import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickAddTodo } from '../quick-add-todo'
import { TodoStatus } from '@prisma/client'

describe('QuickAddTodo', () => {
  const mockOnSubmit = jest.fn()
  const mockProjects = [
    { id: 'proj1', name: 'Project 1' },
    { id: 'proj2', name: 'Project 2' }
  ]

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  describe('Basic Functionality', () => {
    it('renders with placeholder text', () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument()
    })

    it('shows Add button when input has content', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Initially no Add button visible
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
      
      // Type in input
      await userEvent.type(input, 'New todo')
      
      // Add button should appear
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('shows Add button on focus', () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Focus input
      fireEvent.focus(input)
      
      // Add button should appear
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('shows Add button on hover', () => {
      const { container } = render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      // Hover over container
      fireEvent.mouseEnter(container.firstChild as Element)
      
      // Add button should appear
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })
  })

  describe('Progressive Disclosure', () => {
    it('shows expand button', () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      expect(screen.getByRole('button', { name: /expand options/i })).toBeInTheDocument()
    })

    it('expands to show additional fields when expand button clicked', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} projects={mockProjects} />)
      const expandButton = screen.getByRole('button', { name: /expand options/i })
      
      // Initially no expanded fields
      expect(screen.queryByText('Status:')).not.toBeInTheDocument()
      
      // Click expand
      await userEvent.click(expandButton)
      
      // Should show expanded fields
      expect(screen.getByText('Status:')).toBeInTheDocument()
      expect(screen.getByText('Start:')).toBeInTheDocument()
      expect(screen.getByText('Due:')).toBeInTheDocument()
    })

    it('collapses when clicking expand button again', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const expandButton = screen.getByRole('button', { name: /expand options/i })
      
      // Expand
      await userEvent.click(expandButton)
      expect(screen.getByText('Status:')).toBeInTheDocument()
      
      // Collapse
      await userEvent.click(screen.getByRole('button', { name: /collapse options/i }))
      expect(screen.queryByText('Status:')).not.toBeInTheDocument()
    })

    it('expands on Tab key press when there is content', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type some content first
      await userEvent.type(input, 'Test todo')
      
      // Focus input and press Tab
      input.focus()
      fireEvent.keyDown(input, { key: 'Tab' })
      
      // Should expand
      expect(screen.getByText('Status:')).toBeInTheDocument()
    })

    it('toggles expansion on Cmd+Shift+A', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Press Cmd+Shift+A to expand
      fireEvent.keyDown(input, { key: 'A', metaKey: true, shiftKey: true })
      expect(screen.getByText('Status:')).toBeInTheDocument()
      
      // Press again to collapse
      fireEvent.keyDown(input, { key: 'A', metaKey: true, shiftKey: true })
      expect(screen.queryByText('Status:')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('submits with title only when not expanded', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'Simple todo')
      fireEvent.keyDown(input, { key: 'Enter' })
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Simple todo',
          projectId: undefined,
          status: 'NOT_STARTED',
          startDate: expect.any(Date),
          dueDate: undefined
        })
      })
    })

    it('submits with all fields when expanded', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} projects={mockProjects} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type title
      await userEvent.type(input, 'Complex todo')
      
      // Expand
      await userEvent.click(screen.getByRole('button', { name: /expand options/i }))
      
      // Select project (find by display value)
      const projectSelect = screen.getAllByRole('combobox')[0]
      await userEvent.click(projectSelect)
      await userEvent.click(screen.getByText('Project 1'))
      
      // Select status (find by display value)  
      const statusSelect = screen.getAllByRole('combobox')[1]
      await userEvent.click(statusSelect)
      await userEvent.click(screen.getByText('In Progress'))
      
      // Submit
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Complex todo',
          projectId: 'proj1',
          status: 'IN_PROGRESS',
          startDate: expect.any(Date),
          dueDate: undefined
        })
      })
    })

    it('clears form after successful submission', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'Todo to clear')
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('does not submit with empty title', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Focus to show button
      fireEvent.focus(input)
      const addButton = screen.getByRole('button', { name: /add/i })
      
      // Button should be disabled
      expect(addButton).toBeDisabled()
      
      // Try to submit
      await userEvent.click(addButton)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      const errorMessage = 'Failed to create todo'
      mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage))
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'Todo with error')
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage)
      })
    })

    it('clears error on next successful submission', async () => {
      mockOnSubmit
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined)
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // First submission fails
      await userEvent.type(input, 'First todo')
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      
      // Second submission succeeds
      await userEvent.clear(input)
      await userEvent.type(input, 'Second todo')
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'Loading todo')
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      // Should show loading
      expect(screen.getByText('Adding...')).toBeInTheDocument()
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Adding...')).not.toBeInTheDocument()
      })
    })

    it('disables input and buttons during loading', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'Loading todo')
      await userEvent.click(screen.getByRole('button', { name: /add/i }))
      
      // Should disable controls
      expect(input).toBeDisabled()
      expect(screen.getByRole('button', { name: /expand options/i })).toBeDisabled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('shows keyboard shortcut hints when expanded', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      // Expand
      await userEvent.click(screen.getByRole('button', { name: /expand options/i }))
      
      // Should show hints
      expect(screen.getByText('Enter: Add')).toBeInTheDocument()
      expect(screen.getByText('Tab: Expand')).toBeInTheDocument()
      expect(screen.getByText('Esc: Close')).toBeInTheDocument()
      expect(screen.getByText('Cmd+Shift+A: Toggle')).toBeInTheDocument()
    })
  })
})