import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { TaskCard } from '../TaskCard'
import { TodoStatus, ProjectStatus } from '@prisma/client'

// Mock DnD kit hooks
jest.mock('@dnd-kit/sortable', () => ({
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
      toString: jest.fn(() => ''),
    },
  },
}))

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'This is a test task description',
  status: ProjectStatus.IN_PROGRESS,
  startDate: '2024-01-15T00:00:00Z',
  dueDate: '2024-01-20T00:00:00Z',
  createdAt: '2024-01-10T00:00:00Z',
  updatedAt: '2024-01-10T00:00:00Z',
  creator: {
    id: 'user-1',
    name: 'John Creator',
    image: null,
  },
  assignee: {
    id: 'user-2',
    name: 'Jane Assignee',
    image: null,
  },
}

describe('TaskCard', () => {
  it('renders task title and description', () => {
    render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('This is a test task description')).toBeInTheDocument()
  })

  it('renders task without description', () => {
    const taskWithoutDescription = { ...mockTask, description: null }
    render(<TaskCard task={taskWithoutDescription} projectName="Test Project" />)
    
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.queryByText('This is a test task description')).not.toBeInTheDocument()
  })

  it('renders start date when provided', () => {
    render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    expect(screen.getByText(/Start:/)).toBeInTheDocument()
    expect(screen.getByText(/Jan 1[45]/)).toBeInTheDocument() // Handles timezone differences
  })

  it('renders due date when provided', () => {
    render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    expect(screen.getByText(/Due:/)).toBeInTheDocument()
    expect(screen.getByText(/Jan (19|20)/)).toBeInTheDocument() // Handles timezone differences
  })

  it('renders task without dates', () => {
    const taskWithoutDates = { ...mockTask, startDate: null, dueDate: null }
    render(<TaskCard task={taskWithoutDates} projectName="Test Project" />)
    
    expect(screen.queryByText(/Start:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Due:/)).not.toBeInTheDocument()
  })

  it('renders assignee when provided', () => {
    render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    expect(screen.getByText('Jane Assignee')).toBeInTheDocument()
  })

  it('renders task without assignee', () => {
    const taskWithoutAssignee = { ...mockTask, assignee: null }
    render(<TaskCard task={taskWithoutAssignee} projectName="Test Project" />)
    
    expect(screen.queryByText('Jane Assignee')).not.toBeInTheDocument()
  })

  it('renders assignee with fallback name', () => {
    const taskWithUnknownAssignee = {
      ...mockTask,
      assignee: { id: 'user-3', name: null, image: null },
    }
    render(<TaskCard task={taskWithUnknownAssignee} projectName="Test Project" />)
    
    expect(screen.getByText('Unknown User')).toBeInTheDocument()
  })

  it('renders creation date', () => {
    render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    expect(screen.getByText(/Created Jan (9|10)/)).toBeInTheDocument() // Handles timezone differences
  })

  it('shows overdue badge for overdue tasks', () => {
    // Set due date to past date
    const overdueDueDate = new Date()
    overdueDueDate.setDate(overdueDueDate.getDate() - 1) // Yesterday
    
    const overdueTask = {
      ...mockTask,
      dueDate: overdueDueDate.toISOString(),
      status: TodoStatus.NOT_STARTED, // Not completed
    }
    
    render(<TaskCard task={overdueTask} projectName="Test Project" />)
    
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('does not show overdue badge for completed tasks', () => {
    // Set due date to past date but task is completed
    const overdueDueDate = new Date()
    overdueDueDate.setDate(overdueDueDate.getDate() - 1) // Yesterday
    
    const completedOverdueTask = {
      ...mockTask,
      dueDate: overdueDueDate.toISOString(),
      status: ProjectStatus.COMPLETED,
    }
    
    render(<TaskCard task={completedOverdueTask} projectName="Test Project" />)
    
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument()
  })

  // Test removed - COMPLETED status is used instead

  it('does not show overdue badge for future due dates', () => {
    // Set due date to future date
    const futureDueDate = new Date()
    futureDueDate.setDate(futureDueDate.getDate() + 1) // Tomorrow
    
    const futureTask = {
      ...mockTask,
      dueDate: futureDueDate.toISOString(),
      status: TodoStatus.NOT_STARTED,
    }
    
    render(<TaskCard task={futureTask} projectName="Test Project" />)
    
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument()
  })

  it('renders drag handle', () => {
    render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    // The drag handle should be present (GripVertical icon)
    // It's a div with cursor-grab class, not a button
    const dragHandle = document.querySelector('.cursor-grab')
    expect(dragHandle).toBeInTheDocument()
  })

  it('applies correct base classes', () => {
    const { container } = render(<TaskCard task={mockTask} projectName="Test Project" />)
    
    // Check if the card has correct base classes
    const card = container.querySelector('.cursor-move')
    expect(card).toBeInTheDocument()
  })
})