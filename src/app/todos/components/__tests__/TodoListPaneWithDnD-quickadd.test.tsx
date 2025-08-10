import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoListPaneWithDnD } from '../TodoListPaneWithDnD'
import { Todo } from '../../types'

// Mock fetch
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock DnD context
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(),
    },
  },
}))

jest.mock('../DroppableGroup', () => ({
  DroppableGroup: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('../../hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({
    handleDragStart: jest.fn(),
    handleDragOver: jest.fn(),
    handleDragEnd: jest.fn(),
    activeId: null,
  }),
}))

describe('TodoListPaneWithDnD - QuickAddTodo Integration', () => {
  const mockOnTodoSelect = jest.fn()
  const mockOnTodoUpdate = jest.fn()

  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Test Todo 1',
      description: 'Description 1',
      status: 'NOT_STARTED',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      startDate: new Date('2024-01-01'),
      dueDate: null,
      projectId: null,
      project: null,
      assigneeId: null,
      assignee: null,
      creatorId: 'user1',
      creator: null,
      comments: [],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    // Mock next/navigation
    const mockRefresh = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      refresh: mockRefresh,
    })
  })

  describe('QuickAddTodo in Status Groups', () => {
    it('shows QuickAddTodo in each status group when grouping by status', async () => {
      render(
        <TodoListPaneWithDnD
          todos={mockTodos}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      // The component should default to grouping by status
      expect(screen.getByText('Not Started')).toBeInTheDocument()
      
      // Should show QuickAddTodo components (multiple placeholders for each group)
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      expect(quickAddInputs.length).toBeGreaterThan(0)
    })

    it('creates todo with correct status when using QuickAddTodo in a status group', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-todo', title: 'New Todo' }),
      })

      render(
        <TodoListPaneWithDnD
          todos={mockTodos}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      // Find the first QuickAddTodo input (in Not Started group)
      const quickAddInputs = screen.getAllByPlaceholderText('Add a new todo...')
      const firstInput = quickAddInputs[0]
      
      // Type a new todo
      await userEvent.type(firstInput, 'Test Quick Add Todo')
      
      // Press Enter to submit
      await userEvent.type(firstInput, '{enter}')

      // Check that fetch was called with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"title":"Test Quick Add Todo"'),
        })
      })

      // Check that the body contains the correct status
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.status).toBe('NOT_STARTED')
    })

    it('does not show QuickAddTodo when not grouping by status', async () => {
      render(
        <TodoListPaneWithDnD
          todos={mockTodos}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      // Change grouping to project
      const groupBySelect = screen.getByRole('combobox')
      await userEvent.click(groupBySelect)
      await userEvent.click(screen.getByText('Project'))

      // QuickAddTodo should not be visible in project grouping
      // (except in empty state if there are no todos)
      const quickAddInputs = screen.queryAllByPlaceholderText('Add a new todo...')
      // Only empty state QuickAdd should be present if todos exist
      expect(quickAddInputs.length).toBeLessThanOrEqual(1)
    })
  })

  describe('QuickAddTodo in Empty State', () => {
    it('shows QuickAddTodo when there are no todos', () => {
      render(
        <TodoListPaneWithDnD
          todos={[]}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      // Should show empty state message
      expect(screen.getByText('No todos yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first todo')).toBeInTheDocument()
      
      // Should show QuickAddTodo
      expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument()
    })

    it('creates todo from empty state', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-todo', title: 'First Todo' }),
      })

      render(
        <TodoListPaneWithDnD
          todos={[]}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'My First Todo')
      await userEvent.type(input, '{enter}')

      // Check that fetch was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"title":"My First Todo"'),
        })
      })

      // Check that router refresh was triggered
      const { useRouter } = require('next/navigation')
      expect(useRouter().refresh).toHaveBeenCalled()
    })

    it('handles API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      render(
        <TodoListPaneWithDnD
          todos={[]}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type and submit
      await userEvent.type(input, 'Failed Todo')
      await userEvent.type(input, '{enter}')

      // Wait for the error to be handled
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Router should not refresh on error
      const { useRouter } = require('next/navigation')
      expect(useRouter().refresh).not.toHaveBeenCalled()
      
      // Error message should appear (from QuickAddTodo component)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Progressive Disclosure', () => {
    it('supports progressive disclosure in QuickAddTodo', async () => {
      render(
        <TodoListPaneWithDnD
          todos={[]}
          selectedTodo={null}
          onTodoSelect={mockOnTodoSelect}
          onTodoUpdate={mockOnTodoUpdate}
        />
      )

      const input = screen.getByPlaceholderText('Add a new todo...')
      
      // Type some text
      await userEvent.type(input, 'Test todo')
      
      // Press Tab to expand
      await userEvent.tab()
      
      // Should show expanded fields
      expect(screen.getByText('Status:')).toBeInTheDocument()
      expect(screen.getByText('Start:')).toBeInTheDocument()
      expect(screen.getByText('Due:')).toBeInTheDocument()
    })
  })
})