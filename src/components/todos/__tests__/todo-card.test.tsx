import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoCard } from '../todo-card'
import { TodoWithRelations } from '@/types/todo'
import { TodoStatus, ProjectStatus } from '@prisma/client'

// Mock the Markdown component
jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div>{content}</div>
}))

const mockTodo: TodoWithRelations = {
  id: 'todo-1',
  title: 'Test Todo',
  description: 'Test description',
  status: TodoStatus.NOT_STARTED,
  dueDate: new Date('2025-12-31'),
  createdAt: new Date(),
  updatedAt: new Date(),
  projectId: 'project-1',
  creatorId: 'user-1',
  assigneeId: 'user-2',
  creator: {
    id: 'user-1',
    name: 'Creator User',
    username: 'creator',
    email: 'creator@example.com',
    image: null,
    password: null,
    specialty: null,
    experienceLevel: null,
    bio: null,
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
    skills: [],
    availability: null,
    timezone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastDigestSentAt: null
  },
  assignee: {
    id: 'user-2',
    name: 'Assignee User',
    username: 'assignee',
    email: 'assignee@example.com',
    image: null,
    password: null,
    specialty: null,
    experienceLevel: null,
    bio: null,
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
    skills: [],
    availability: null,
    timezone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastDigestSentAt: null
  },
  project: {
    id: 'project-1',
    name: 'Test Project'
  },
  posts: [
    {
      id: 'post-1',
      type: 'PROJECT_UPDATE',
      content: 'Test update',
      createdAt: new Date(),
      author: {
        id: 'user-1',
        name: 'Creator User',
        username: 'creator'
      }
    }
  ]
}

describe('TodoCard', () => {
  it('renders todo information correctly', () => {
    render(<TodoCard todo={mockTodo} />)
    
    expect(screen.getByText('Test Todo')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Created by Creator User')).toBeInTheDocument()
    expect(screen.getByText('Assigned to Assignee User')).toBeInTheDocument()
    expect(screen.getByText(/Due.*2025/)).toBeInTheDocument()
    expect(screen.getByText('1 update')).toBeInTheDocument()
  })

  it('renders without description when not provided', () => {
    const todoWithoutDescription = { ...mockTodo, description: null }
    render(<TodoCard todo={todoWithoutDescription} />)
    
    expect(screen.getByText('Test Todo')).toBeInTheDocument()
    expect(screen.queryByText('Test description')).not.toBeInTheDocument()
  })

  it('renders without assignee when not provided', () => {
    const todoWithoutAssignee = { ...mockTodo, assignee: null, assigneeId: null }
    render(<TodoCard todo={todoWithoutAssignee} />)
    
    expect(screen.getByText('Created by Creator User')).toBeInTheDocument()
    expect(screen.queryByText(/Assigned to/)).not.toBeInTheDocument()
  })

  it('renders project link when showProject is true', () => {
    render(<TodoCard todo={mockTodo} showProject={true} />)
    
    const projectLink = screen.getByRole('link', { name: 'Test Project' })
    expect(projectLink).toBeInTheDocument()
    expect(projectLink).toHaveAttribute('href', '/projects/project-1')
  })

  it('does not render project link when showProject is false', () => {
    render(<TodoCard todo={mockTodo} showProject={false} />)
    
    expect(screen.queryByRole('link', { name: 'Test Project' })).not.toBeInTheDocument()
  })

  it('renders status change button when onStatusChange provided', () => {
    const mockOnStatusChange = jest.fn()
    render(<TodoCard todo={mockTodo} onStatusChange={mockOnStatusChange} />)
    
    expect(screen.getByText('Mark as In Progress')).toBeInTheDocument()
  })

  it('calls onStatusChange when status button clicked', async () => {
    const user = userEvent.setup()
    const mockOnStatusChange = jest.fn()
    render(<TodoCard todo={mockTodo} onStatusChange={mockOnStatusChange} />)
    
    await user.click(screen.getByText('Mark as In Progress'))
    
    expect(mockOnStatusChange).toHaveBeenCalledWith('todo-1', 'IN_PROGRESS')
  })

  it('shows correct button text for IN_PROGRESS status', () => {
    const inProgressTodo = { ...mockTodo, status: ProjectStatus.IN_PROGRESS }
    const mockOnStatusChange = jest.fn()
    render(<TodoCard todo={inProgressTodo} onStatusChange={mockOnStatusChange} />)
    
    expect(screen.getByText('Mark as Completed')).toBeInTheDocument()
  })

  it('does not show status button for COMPLETED todos', () => {
    const completedTodo = { ...mockTodo, status: ProjectStatus.COMPLETED }
    const mockOnStatusChange = jest.fn()
    render(<TodoCard todo={completedTodo} onStatusChange={mockOnStatusChange} />)
    
    expect(screen.queryByText(/Mark as/)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<TodoCard todo={mockTodo} className="custom-class" />)
    
    const card = screen.getByText('Test Todo').closest('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('handles multiple posts correctly', () => {
    const todoWithMultiplePosts = {
      ...mockTodo,
      posts: [
        mockTodo.posts![0],
        {
          id: 'post-2',
          type: 'PROJECT_UPDATE' as const,
          content: 'Another update',
          createdAt: new Date(),
          author: {
            id: 'user-1',
            name: 'Creator User',
            username: 'creator'
          }
        }
      ]
    }
    
    render(<TodoCard todo={todoWithMultiplePosts} />)
    
    expect(screen.getByText('2 updates')).toBeInTheDocument()
  })
})