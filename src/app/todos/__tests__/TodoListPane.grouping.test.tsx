import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TodoListPane } from '../components/TodoListPane'
import { Todo } from '../types'

describe('TodoListPane - Grouping Feature', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Not Started Todo',
      description: null,
      status: 'NOT_STARTED',
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
    },
    {
      id: '2',
      title: 'In Progress Todo',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: null,
      creatorId: 'user1',
      assigneeId: null
    }
  ]

  it('renders group selector dropdown', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    // Check that the selector is present
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('groups todos by status by default', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    // Check for group headers
    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('shows item count for each group', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    // Check for item counts (both groups have 1 item each)
    const itemCounts = screen.getAllByText('1 item')
    expect(itemCounts).toHaveLength(2)
  })

  it('can collapse and expand groups', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    const notStartedGroup = screen.getByText('Not Started')
    
    // Initially expanded (should see the todo)
    expect(screen.getByText('Not Started Todo')).toBeInTheDocument()
    
    // Click to collapse
    fireEvent.click(notStartedGroup)
    
    // Todo should be hidden
    expect(screen.queryByText('Not Started Todo')).not.toBeInTheDocument()
    
    // Click to expand again
    fireEvent.click(notStartedGroup)
    
    // Todo should be visible again
    expect(screen.getByText('Not Started Todo')).toBeInTheDocument()
  })

  it('changes grouping when selector value changes', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    const selector = screen.getByRole('combobox')
    
    // Change to project grouping
    fireEvent.click(selector)
    fireEvent.click(screen.getByText('Project'))
    
    // Should now show project groups
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
  })

  it('expands all groups when grouping changes', () => {
    const mockOnSelect = jest.fn()
    
    render(
      <TodoListPane 
        todos={mockTodos}
        selectedTodo={null}
        onTodoSelect={mockOnSelect}
      />
    )

    // Collapse a group
    const notStartedGroup = screen.getByText('Not Started')
    fireEvent.click(notStartedGroup)
    expect(screen.queryByText('Not Started Todo')).not.toBeInTheDocument()
    
    // Change grouping
    const selector = screen.getByRole('combobox')
    fireEvent.click(selector)
    fireEvent.click(screen.getByText('Project'))
    
    // All todos should be visible in new groups
    expect(screen.getByText('Not Started Todo')).toBeInTheDocument()
    expect(screen.getByText('In Progress Todo')).toBeInTheDocument()
  })
})