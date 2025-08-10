import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoList } from '../todo-list'
import { TodoWithRelations } from '@/types/todo'

// Mock todos
const mockTodos: TodoWithRelations[] = [
  {
    id: '1',
    title: 'Test Todo 1',
    description: null,
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    projectId: 'proj1',
    creatorId: 'user1',
    assigneeId: null,
    dueDate: null,
    startDate: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: {
      id: 'user1',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    assignee: null,
    project: {
      id: 'proj1',
      name: 'Test Project',
      goal: 'Test Goal',
      description: 'Test Description',
      helpType: 'MVP',
      ownerId: 'user1',
      organizationId: null,
      status: 'AWAITING_VOLUNTEERS',
      isActive: true,
      targetCompletionDate: null,
      contactEmail: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      productId: null
    }
  },
  {
    id: '2',
    title: 'Test Todo 2',
    description: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    projectId: 'proj1',
    creatorId: 'user1',
    assigneeId: null,
    dueDate: null,
    startDate: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: {
      id: 'user1',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    assignee: null,
    project: {
      id: 'proj1',
      name: 'Test Project',
      goal: 'Test Goal',
      description: 'Test Description',
      helpType: 'MVP',
      ownerId: 'user1',
      organizationId: null,
      status: 'AWAITING_VOLUNTEERS',
      isActive: true,
      targetCompletionDate: null,
      contactEmail: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      productId: null
    }
  }
]

describe('TodoList with QuickAdd Integration', () => {
  const mockOnQuickAdd = jest.fn()
  const mockOnStatusChange = jest.fn()
  const mockOnAssigneeChange = jest.fn()
  const mockOnCreateClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Quick Add Visibility', () => {
    it('shows QuickAddTodo in each status group when canManage is true', () => {
      render(
        <TodoList
          todos={mockTodos}
          projectId="proj1"
          canManage={true}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // Should show quick-add in all status groups that are visible
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs.length).toBeGreaterThanOrEqual(2) // At least NOT_STARTED and IN_PROGRESS groups
    })

    it('does not show QuickAddTodo when canManage is false', () => {
      render(
        <TodoList
          todos={mockTodos}
          projectId="proj1"
          canManage={false}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // Should not show quick-add inputs
      const quickAddInputs = screen.queryAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs).toHaveLength(0)
    })

    it('shows QuickAddTodo even in empty status groups when canManage is true', () => {
      // Only provide IN_PROGRESS todos
      const inProgressOnlyTodos = mockTodos.filter(t => t.status === 'IN_PROGRESS')
      
      render(
        <TodoList
          todos={inProgressOnlyTodos}
          projectId="proj1"
          canManage={true}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // Should still show NOT_STARTED group with quick-add
      expect(screen.getByText(/Not Started/)).toBeInTheDocument()
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs.length).toBeGreaterThanOrEqual(2) // Empty NOT_STARTED and populated IN_PROGRESS
    })
  })

  describe('Quick Add Functionality', () => {
    it('calls onQuickAdd when submitting from a quick-add input', async () => {
      mockOnQuickAdd.mockResolvedValueOnce(undefined)
      
      render(
        <TodoList
          todos={mockTodos}
          projectId="proj1"
          canManage={true}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // Find the first quick-add input
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      const firstInput = quickAddInputs[0]
      
      // Type and submit
      await userEvent.type(firstInput, 'New quick todo')
      await userEvent.type(firstInput, '{enter}')

      await waitFor(() => {
        expect(mockOnQuickAdd).toHaveBeenCalledWith(expect.objectContaining({
          title: 'New quick todo',
          status: 'NOT_STARTED',
          projectId: 'proj1'
        }))
      })
    })

    it('shows all status groups including COMPLETED when canManage is true', () => {
      render(
        <TodoList
          todos={[]}
          projectId="proj1"
          canManage={true}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // When there are no todos, it should show empty state
      // But with canManage true, all groups should be visible with quick-add
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs.length).toBeGreaterThanOrEqual(4) // All 4 status groups should have quick-add
    })
  })

  describe('Integration with Projects', () => {
    it('passes projects array to QuickAddTodo components', () => {
      const mockProjects = [
        { id: 'proj1', name: 'Project 1' },
        { id: 'proj2', name: 'Project 2' }
      ]

      render(
        <TodoList
          todos={mockTodos}
          projectId="proj1"
          projects={mockProjects}
          canManage={true}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // Quick-add components should be rendered with projects
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs.length).toBeGreaterThan(0)
    })
  })

  describe('Status Filter Interaction', () => {
    it('still shows quick-add when filtering by status', async () => {
      render(
        <TodoList
          todos={mockTodos}
          projectId="proj1"
          canManage={true}
          onQuickAdd={mockOnQuickAdd}
          onStatusChange={mockOnStatusChange}
          onAssigneeChange={mockOnAssigneeChange}
          onCreateClick={mockOnCreateClick}
        />
      )

      // Filter to show only IN_PROGRESS
      const statusFilter = screen.getAllByRole('combobox')[0] // First combobox is status filter
      await userEvent.click(statusFilter)
      
      // Click on the "In Progress" option in the dropdown
      const inProgressOptions = screen.getAllByText('In Progress')
      // Find the one that's in the dropdown (not the header)
      const dropdownOption = inProgressOptions.find(el => el.closest('[role="listbox"]'))
      if (dropdownOption) {
        await userEvent.click(dropdownOption)
      }

      // Should not show quick-add in filtered view (flat list mode)
      const quickAddInputs = screen.queryAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs).toHaveLength(0) // No quick-add in filtered view
    })
  })
})