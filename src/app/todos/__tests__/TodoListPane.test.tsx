import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TodoListPane } from '../components/TodoListPane'
import { Todo } from '../types'

describe('TodoListPane', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Test Todo 1',
      description: 'Description 1',
      status: 'NOT_STARTED',
      dueDate: new Date('2024-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: null,
      creatorId: 'user1',
      assigneeId: null,
    },
    {
      id: '2',
      title: 'Test Todo 2',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'project1',
      creatorId: 'user1',
      assigneeId: 'user2',
      project: {
        id: 'project1',
        name: 'Test Project'
      }
    }
  ]

  it('renders todo list correctly', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('2 tasks')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()
  })

  it('shows empty state when no todos', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={[]}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('No todos yet')).toBeInTheDocument()
  })

  it('calls onTodoSelect when todo is clicked', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    fireEvent.click(screen.getByText('Test Todo 1'))
    expect(mockOnSelect).toHaveBeenCalledWith(mockTodos[0])
  })

  it('highlights selected todo', () => {
    const mockOnSelect = jest.fn()
    
    const { container } = render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={mockTodos[0]}
        onTodoSelect={mockOnSelect}
      />
    )

    const selectedCard = container.querySelector('.bg-accent')
    expect(selectedCard).toBeInTheDocument()
  })
})