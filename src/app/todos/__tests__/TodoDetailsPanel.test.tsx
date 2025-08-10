import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoDetailsPanel } from '../components/TodoDetailsPanel'

describe('TodoDetailsPanel', () => {
  const mockTodo = {
    id: '1',
    title: 'Test Todo',
    description: 'Test description',
    status: 'NOT_STARTED',
    dueDate: new Date('2024-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
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
        createdAt: new Date(),
        author: {
          id: 'user3',
          name: 'Jane Smith',
          email: 'jane@example.com'
        }
      }
    ]
  }

  it('shows placeholder when no todo is selected', () => {
    const mockUpdate = jest.fn()
    const mockCommentAdd = jest.fn()
    
    render(
      <TodoDetailsPanel 
        todo={null}
        onUpdate={mockUpdate}
        onCommentAdd={mockCommentAdd}
      />
    )

    expect(screen.getByText('Click on a todo to see the details')).toBeInTheDocument()
  })

  it('renders todo details when todo is selected', () => {
    const mockUpdate = jest.fn()
    const mockCommentAdd = jest.fn()
    
    render(
      <TodoDetailsPanel 
        todo={mockTodo}
        onUpdate={mockUpdate}
        onCommentAdd={mockCommentAdd}
      />
    )

    expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays comments with author and timestamp', () => {
    const mockUpdate = jest.fn()
    const mockCommentAdd = jest.fn()
    
    render(
      <TodoDetailsPanel 
        todo={mockTodo}
        onUpdate={mockUpdate}
        onCommentAdd={mockCommentAdd}
      />
    )

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Test comment')).toBeInTheDocument()
  })

  it('allows editing when not readonly', async () => {
    const mockUpdate = jest.fn()
    const mockCommentAdd = jest.fn()
    
    render(
      <TodoDetailsPanel 
        todo={mockTodo}
        onUpdate={mockUpdate}
        onCommentAdd={mockCommentAdd}
        readonly={false}
      />
    )

    const titleInput = screen.getByDisplayValue('Test Todo')
    fireEvent.change(titleInput, { target: { value: 'Updated Todo' } })

    // Wait for auto-save debounce (3 seconds)
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    }, { timeout: 4000 })
  })

  it('prevents editing when readonly', () => {
    const mockUpdate = jest.fn()
    const mockCommentAdd = jest.fn()
    
    render(
      <TodoDetailsPanel 
        todo={mockTodo}
        onUpdate={mockUpdate}
        onCommentAdd={mockCommentAdd}
        readonly={true}
      />
    )

    const titleInput = screen.getByDisplayValue('Test Todo')
    expect(titleInput).toBeDisabled()
    
    const descriptionInput = screen.getByDisplayValue('Test description')
    expect(descriptionInput).toBeDisabled()
  })

  it('adds comment when submitted', async () => {
    const mockUpdate = jest.fn()
    const mockCommentAdd = jest.fn()
    
    render(
      <TodoDetailsPanel 
        todo={mockTodo}
        onUpdate={mockUpdate}
        onCommentAdd={mockCommentAdd}
      />
    )

    const commentInput = screen.getByPlaceholderText('Add a comment...')
    fireEvent.change(commentInput, { target: { value: 'New comment' } })
    
    const submitButton = screen.getByRole('button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCommentAdd).toHaveBeenCalledWith('1', 'New comment')
    })
  })
})