import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickAddTodo } from '../quick-add-todo'

describe('QuickAddTodo with Project Support', () => {
  const mockOnSubmit = jest.fn()
  const mockProjects = [
    { id: 'proj1', name: 'Project Alpha' },
    { id: 'proj2', name: 'Project Beta' },
    { id: 'proj3', name: 'Project Gamma' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Project Selection', () => {
    it('shows Uncategorized as default when no projectId provided', async () => {
      render(
        <QuickAddTodo
          projects={mockProjects}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Check that Uncategorized is selected by default
      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      expect(projectSelect).toHaveTextContent('Uncategorized')
    })

    it('pre-selects project when projectId is provided', async () => {
      render(
        <QuickAddTodo
          projectId="proj2"
          projects={mockProjects}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Check that Project Beta is selected
      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      expect(projectSelect).toHaveTextContent('Project Beta')
    })

    it('allows changing project selection in expanded mode', async () => {
      render(
        <QuickAddTodo
          projectId="proj1"
          projects={mockProjects}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Click on project select to open dropdown
      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      await userEvent.click(projectSelect)
      
      // Select Project Gamma
      const projectGamma = screen.getByText('Project Gamma')
      await userEvent.click(projectGamma)
      
      // Submit
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test todo',
            projectId: 'proj3', // Changed to Project Gamma
            status: 'NOT_STARTED'
          })
        )
      })
    })

    it('includes Uncategorized option in project dropdown', async () => {
      render(
        <QuickAddTodo
          projectId="proj1"
          projects={mockProjects}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Click on project select to open dropdown
      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      await userEvent.click(projectSelect)
      
      // Check that Uncategorized is available as an option
      expect(screen.getByText('Uncategorized')).toBeInTheDocument()
      // Use getAllByText since there might be duplicates (current selection + dropdown option)
      expect(screen.getAllByText('Project Alpha').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Project Beta').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Project Gamma').length).toBeGreaterThanOrEqual(1)
    })

    it('submits with original projectId when Uncategorized is selected', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      
      render(
        <QuickAddTodo
          projectId="proj1"
          projects={mockProjects}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Click on project select to open dropdown
      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      await userEvent.click(projectSelect)
      
      // Select Uncategorized
      const uncategorized = screen.getByText('Uncategorized')
      await userEvent.click(uncategorized)
      
      // Submit
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test todo',
            projectId: 'proj1', // Falls back to original projectId
            status: 'NOT_STARTED'
          })
        )
      })
    })
  })

  describe('Project Groups Integration', () => {
    it('works correctly within a project context', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      
      // Simulating usage within a project page (e.g., TodoSection)
      render(
        <QuickAddTodo
          projectId="proj2"
          projects={[]} // No other projects available
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Project-specific todo')
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Project-specific todo',
            projectId: 'proj2', // Uses the project context
            status: 'NOT_STARTED'
          })
        )
      })
    })

    it('works correctly without a project context (standalone)', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      
      // Simulating usage without a specific project (e.g., dashboard)
      render(
        <QuickAddTodo
          projects={mockProjects}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      await userEvent.type(input, 'Standalone todo')
      
      // Press Tab to expand and select a project
      await userEvent.tab()
      
      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      await userEvent.click(projectSelect)
      
      const projectBeta = screen.getByText('Project Beta')
      await userEvent.click(projectBeta)
      
      await userEvent.type(input, '{enter}')
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Standalone todo',
            projectId: 'proj2', // Selected project
            status: 'NOT_STARTED'
          })
        )
      })
    })
  })
})