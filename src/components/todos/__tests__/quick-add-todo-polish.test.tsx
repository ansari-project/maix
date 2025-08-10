import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickAddTodo } from '../quick-add-todo'

describe('QuickAddTodo Polish Features', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visual Feedback', () => {
    it('shows success message after adding todo', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Todo added successfully!')).toBeInTheDocument()
      })
      
      // Success message should disappear after 2 seconds
      await waitFor(() => {
        expect(screen.queryByText('Todo added successfully!')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows loading spinner in input while submitting', async () => {
      let resolvePromise: () => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnSubmit.mockReturnValueOnce(promise)
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      await userEvent.type(input, '{enter}')
      
      // Check for loading spinner
      expect(screen.getByText('Adding...')).toBeInTheDocument()
      
      // Resolve the promise
      resolvePromise!()
      
      await waitFor(() => {
        expect(screen.queryByText('Adding...')).not.toBeInTheDocument()
      })
    })

    it('shows error message with animation', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Test error'))
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        const error = screen.getByRole('alert')
        expect(error).toHaveTextContent('Test error')
        expect(error).toHaveClass('animate-in')
      })
    })

    it('shows focus ring on input when focused', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Focus the input
      await userEvent.click(input)
      
      // Check for focus ring class
      expect(input).toHaveClass('ring-2', 'ring-primary/20')
    })
  })

  describe('Enhanced Keyboard Shortcuts', () => {
    it('clears input on Escape when not expanded', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Escape
      await userEvent.type(input, '{escape}')
      
      expect(input).toHaveValue('')
    })

    it('collapses expanded form on Escape', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Verify expanded
      expect(screen.getByText('Status:')).toBeInTheDocument()
      
      // Press Escape to collapse
      await userEvent.type(input, '{escape}')
      
      // Verify collapsed
      expect(screen.queryByText('Status:')).not.toBeInTheDocument()
    })

    it('only expands on Tab when there is content', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Press Tab without content
      await userEvent.tab()
      
      // Should not expand
      expect(screen.queryByText('Status:')).not.toBeInTheDocument()
      
      // Type content and press Tab
      await userEvent.type(input, 'Test')
      await userEvent.tab()
      
      // Should expand
      expect(screen.getByText('Status:')).toBeInTheDocument()
    })

    it('shows tooltip hints on buttons', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test')
      
      // Check expand button tooltip
      const expandButton = screen.getByRole('button', { name: /expand options/i })
      expect(expandButton).toHaveAttribute('title', 'Expand options (Tab)')
      
      // Check add button tooltip
      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).toHaveAttribute('title', 'Add todo (Enter)')
    })
  })

  describe('Animation and Transitions', () => {
    it('animates expand button rotation', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const expandButton = screen.getByRole('button', { name: /expand options/i })
      
      // Initially not rotated
      expect(expandButton).not.toHaveClass('rotate-90')
      
      // Click to expand
      await userEvent.click(expandButton)
      
      // Should be rotated
      expect(expandButton).toHaveClass('rotate-90')
    })

    it('animates expanded section appearance', async () => {
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test')
      await userEvent.tab()
      
      // Check for animation classes on expanded section - go up to the container div
      const statusText = screen.getByText('Status:')
      const expandedSection = statusText.closest('.animate-in')
      expect(expandedSection).toBeInTheDocument()
      expect(expandedSection).toHaveClass('animate-in', 'fade-in', 'slide-in-from-top-2')
    })
  })

  describe('Continuous Entry', () => {
    it('refocuses input after successful submission', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      
      render(<QuickAddTodo onSubmit={mockOnSubmit} />)
      
      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'First todo')
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
      
      // Wait for refocus
      await waitFor(() => {
        expect(input).toHaveFocus()
      }, { timeout: 200 })
      
      // Should be able to immediately type another todo
      await userEvent.type(input, 'Second todo')
      expect(input).toHaveValue('Second todo')
    })
  })
})