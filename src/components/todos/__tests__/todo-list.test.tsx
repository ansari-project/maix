import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoList } from '../todo-list'
import { TodoWithRelations } from '@/types/todo'
import { TodoStatus, ProjectStatus } from '@prisma/client'
import { describe, it, expect } from '@jest/globals'

// Mock child components
jest.mock('../todo-card', () => ({
  TodoCard: ({ todo, onStatusChange }: any) => (
    <div data-testid={`todo-card-${todo.id}`}>
      {todo.title}
      {onStatusChange && (
        <button onClick={() => onStatusChange(todo.id, 'IN_PROGRESS')}>
          Change Status
        </button>
      )}
    </div>
  )
}))

const createMockTodo = (overrides: Partial<TodoWithRelations> = {}): TodoWithRelations => ({
  id: `todo-${Math.random()}`,
  title: 'Test Todo',
  description: null,
  status: TodoStatus.NOT_STARTED,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  projectId: 'project-1',
  creatorId: 'user-1',
  assigneeId: null,
  creator: {
    id: 'user-1',
    name: 'Creator User',
    username: 'creator',
    image: null
  },
  assignee: null,
  project: {
    id: 'project-1',
    name: 'Test Project'
  },
  posts: [],
  ...overrides
})

describe('TodoList', () => {
  const mockTodos = [
    createMockTodo({ id: 'todo-1', title: 'Not Started Todo', status: TodoStatus.NOT_STARTED }),
    createMockTodo({ id: 'todo-2', title: 'In Progress Todo', status: ProjectStatus.IN_PROGRESS }),
    createMockTodo({ id: 'todo-3', title: 'Completed Todo', status: ProjectStatus.COMPLETED })
  ]

  it('renders todos grouped by status when no filter applied', () => {
    render(<TodoList todos={mockTodos} />)
    
    expect(screen.getByText('Not Started (1)')).toBeInTheDocument()
    expect(screen.getByText('In Progress (1)')).toBeInTheDocument()
    expect(screen.getByText('Completed (1)')).toBeInTheDocument()
    
    expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
    expect(screen.getByTestId('todo-card-todo-2')).toBeInTheDocument()
    expect(screen.getByTestId('todo-card-todo-3')).toBeInTheDocument()
  })

  it('filters todos by status', async () => {
    const user = userEvent.setup()
    render(<TodoList todos={mockTodos} />)
    
    // Open status filter dropdown
    const statusFilter = screen.getByRole('combobox')
    await user.click(statusFilter)
    
    // Select "Not Started" status
    await user.click(screen.getByText('Not Started'))
    
    expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
    expect(screen.queryByTestId('todo-card-todo-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('todo-card-todo-3')).not.toBeInTheDocument()
  })

  it('shows empty state when no todos', () => {
    render(<TodoList todos={[]} />)
    
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument()
    expect(screen.getByText('Create your first todo to begin tracking progress')).toBeInTheDocument()
  })

  it('shows create button when canManage is true', () => {
    const mockOnCreateClick = jest.fn()
    render(
      <TodoList 
        todos={mockTodos} 
        canManage={true} 
        onCreateClick={mockOnCreateClick} 
      />
    )
    
    expect(screen.getByText('New Todo')).toBeInTheDocument()
  })

  it('calls onCreateClick when create button clicked', async () => {
    const user = userEvent.setup()
    const mockOnCreateClick = jest.fn()
    render(
      <TodoList 
        todos={mockTodos} 
        canManage={true} 
        onCreateClick={mockOnCreateClick} 
      />
    )
    
    await user.click(screen.getByText('New Todo'))
    
    expect(mockOnCreateClick).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(<TodoList todos={[]} loading={true} />)
    
    expect(screen.getByText('Loading todos...')).toBeInTheDocument()
  })

  it('passes onStatusChange to TodoCard when canManage is true', async () => {
    const user = userEvent.setup()
    const mockOnStatusChange = jest.fn()
    render(
      <TodoList 
        todos={mockTodos} 
        canManage={true} 
        onStatusChange={mockOnStatusChange} 
      />
    )
    
    await user.click(screen.getAllByText('Change Status')[0])
    
    expect(mockOnStatusChange).toHaveBeenCalledWith('todo-1', 'IN_PROGRESS')
  })

  it('filters by assignee when assignee filter is available', async () => {
    const user = userEvent.setup()
    const todosWithAssignee = [
      createMockTodo({ 
        id: 'todo-1', 
        assigneeId: 'user-2',
        assignee: { id: 'user-2', name: 'Assignee User', username: 'assignee', image: null }
      }),
      createMockTodo({ id: 'todo-2', assigneeId: null, assignee: null })
    ]
    
    render(<TodoList todos={todosWithAssignee} />)
    
    // Should show assignee filter
    expect(screen.getByText('All assignees')).toBeInTheDocument()
    
    // Filter by specific assignee
    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(screen.getByText('Assignee User'))
    
    expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
    expect(screen.queryByTestId('todo-card-todo-2')).not.toBeInTheDocument()
  })

  it('shows filtered empty state', async () => {
    const user = userEvent.setup()
    
    // Create a list with no open todos
    const todosWithNoOpen = [
      createMockTodo({ id: 'todo-1', title: 'Completed Todo', status: ProjectStatus.COMPLETED })
    ]
    
    render(<TodoList todos={todosWithNoOpen} />)
    
    // Filter to show only not started todos (none exist)
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Not Started'))
    
    expect(screen.getByText('No todos match your filters')).toBeInTheDocument()
  })
})