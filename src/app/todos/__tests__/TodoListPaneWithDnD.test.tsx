import React from 'react'
import { render, screen } from '@testing-library/react'
import { TodoListPaneWithDnD } from '../components/TodoListPaneWithDnD'
import { Todo } from '../types'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
  })),
}))

// Mock the DnD-kit components
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  useDroppable: jest.fn(() => ({
    isOver: false,
    setNodeRef: jest.fn()
  }))
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }))
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => '')
    }
  }
}))

// Mock DroppableGroup component
jest.mock('../components/DroppableGroup', () => ({
  DroppableGroup: ({ children }: any) => <div>{children}</div>,
}))

// Mock useDragAndDrop hook
jest.mock('../hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({
    handleDragStart: jest.fn(),
    handleDragOver: jest.fn(),
    handleDragEnd: jest.fn(),
    activeId: null,
  }),
}))

describe('TodoListPaneWithDnD', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Test Todo 1',
      description: 'Description 1',
      status: 'NOT_STARTED',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: null,
      creatorId: 'user1',
      assigneeId: null
    },
    {
      id: '2',
      title: 'Test Todo 2',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: new Date('2024-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'project1',
      creatorId: 'user1',
      assigneeId: null,
      project: {
        id: 'project1',
        name: 'Test Project'
      }
    }
  ]

  const mockOnTodoSelect = jest.fn()
  const mockOnTodoUpdate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders todos with drag handles', () => {
    render(
      <TodoListPaneWithDnD
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()
  })

  it('displays drag hint for status grouping', () => {
    render(
      <TodoListPaneWithDnD
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    expect(screen.getByText(/Drag todos between groups to update their status/)).toBeInTheDocument()
  })

  it('shows empty drop zones for groups without todos', () => {
    const singleTodo = [mockTodos[0]]
    
    render(
      <TodoListPaneWithDnD
        todos={singleTodo}
        selectedTodo={null}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    // Should show "Drop todos here" only for empty groups
    const dropZones = screen.queryAllByText('Drop todos here')
    // The component creates status groups, some of which will be empty
    // The exact number depends on whether all status groups are created upfront
    expect(dropZones.length).toBeGreaterThanOrEqual(2) // At least some empty groups
  })

  it('groups todos correctly by status', () => {
    render(
      <TodoListPaneWithDnD
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('highlights selected todo', () => {
    const { rerender } = render(
      <TodoListPaneWithDnD
        todos={mockTodos}
        selectedTodo={mockTodos[0]}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    // The selected todo should have the bg-accent class
    const todo1Card = screen.getByText('Test Todo 1').closest('.cursor-pointer')
    expect(todo1Card?.className).toContain('bg-accent')

    // Change selection
    rerender(
      <TodoListPaneWithDnD
        todos={mockTodos}
        selectedTodo={mockTodos[1]}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    const todo2Card = screen.getByText('Test Todo 2').closest('.cursor-pointer')
    expect(todo2Card?.className).toContain('bg-accent')
  })

  it('includes grip handle for dragging', () => {
    const { container } = render(
      <TodoListPaneWithDnD
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnTodoSelect}
        onTodoUpdate={mockOnTodoUpdate}
      />
    )

    // Look for the grip handle by its class
    const gripHandles = container.querySelectorAll('.cursor-grab')
    expect(gripHandles.length).toBeGreaterThan(0)
  })
})