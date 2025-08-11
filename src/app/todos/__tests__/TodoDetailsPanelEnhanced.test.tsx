import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoDetailsPanelEnhanced } from '../components/TodoDetailsPanelEnhanced'
import { Todo } from '../types'

describe('TodoDetailsPanelEnhanced', () => {
  const mockTodo: Todo = {
    id: '1',
    title: 'Test Todo',
    description: 'Test Description',
    status: 'IN_PROGRESS',
    dueDate: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    projectId: 'project1',
    creatorId: 'user1',
    assigneeId: 'user2',
    project: {
      id: 'project1',
      name: 'Test Project'
    },
    assignee: {
      id: 'user2',
      name: 'John Doe',
      email: 'john@example.com'
    },
    comments: [
      {
        id: 'comment1',
        content: 'Test comment',
        todoId: '1',
        authorId: 'user1',
        createdAt: new Date('2024-01-01'),
        author: {
          id: 'user1',
          name: 'Jane Doe',
          email: 'jane@example.com'
        }
      }
    ]
  }

  const mockProjects = [
    { id: 'project1', name: 'Project A' },
    { id: 'project2', name: 'Project B' }
  ]

  const mockUsers = [
    { id: 'user1', name: 'Jane Doe', email: 'jane@example.com' },
    { id: 'user2', name: 'John Doe', email: 'john@example.com' }
  ]

  const mockOnUpdate = jest.fn()
  const mockOnCommentAdd = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty state when no todo is selected', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={null}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    expect(screen.getByText('Select a todo to view details')).toBeInTheDocument()
  })

  it('renders todo details correctly', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
  })

  it('shows validation error for empty title', async () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    const titleInput = screen.getByLabelText(/Title/i)
    fireEvent.change(titleInput, { target: { value: '' } })

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })

  it('shows description without character limit', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
  })

  it('displays sections correctly', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Activity & Comments')).toBeInTheDocument()
  })

  it('displays unified timeline correctly', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    // Verify timeline content is visible
    expect(screen.getByText('Test comment')).toBeInTheDocument()
    expect(screen.getByText(/commented/)).toBeInTheDocument()
    expect(screen.getByText(/todo created/i)).toBeInTheDocument()
  })

  it('allows project selection when projects are provided', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
        projects={mockProjects}
      />
    )

    expect(screen.getByRole('combobox', { name: /Project/i })).toBeInTheDocument()
  })

  it('allows assignee selection when users are provided', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
        users={mockUsers}
      />
    )

    expect(screen.getByRole('combobox', { name: /Assignee/i })).toBeInTheDocument()
  })

  it('shows delete button when onDelete is provided', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
        onDelete={mockOnDelete}
      />
    )

    // Look for a button with X icon (delete button)
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find(button => {
      const svg = button.querySelector('svg')
      return svg && button.className.includes('h-8 w-8')
    })
    expect(deleteButton).toBeInTheDocument()
  })

  it('disables editing in readonly mode', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
        readonly={true}
      />
    )

    const titleInput = screen.getByLabelText(/Title/i)
    expect(titleInput).toBeDisabled()

    const descriptionInput = screen.getByLabelText(/Description/i)
    expect(descriptionInput).toBeDisabled()
  })

  it('shows saving indicator when auto-saving', async () => {
    const { rerender } = render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    const titleInput = screen.getByLabelText(/Title/i)
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Should show "Saving..." after a change
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('displays formatted timestamps', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    // Check for relative time display
    expect(screen.getByText(/Created.*ago/)).toBeInTheDocument()
    expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument()
  })

  it('shows activity timeline with creation events', () => {
    render(
      <TodoDetailsPanelEnhanced
        todo={mockTodo}
        onUpdate={mockOnUpdate}
        onCommentAdd={mockOnCommentAdd}
      />
    )

    // Verify creation event is shown in timeline (more specific text)
    expect(screen.getByText(/todo created/i)).toBeInTheDocument()
  })
})