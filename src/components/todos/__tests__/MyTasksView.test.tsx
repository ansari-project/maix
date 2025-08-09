import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import MyTasksView from '../MyTasksView'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock DnD kit hooks
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  useDroppable: () => ({
    isOver: false,
    setNodeRef: jest.fn(),
  }),
}))

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

const mockProjectGroups = [
  {
    projectId: null,
    projectName: 'Standalone Tasks',
    isPersonal: false,
    tasks: [
      {
        id: '1',
        title: 'Standalone Task 1',
        description: 'A standalone task',
        status: 'NOT_STARTED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        creator: {
          id: 'user1',
          name: 'John Doe',
          image: null,
        },
        assignee: null,
      },
    ],
  },
  {
    projectId: 'project1',
    projectName: 'Test Project',
    isPersonal: false,
    tasks: [
      {
        id: '2',
        title: 'Project Task 1',
        description: 'A project task',
        status: 'IN_PROGRESS',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        creator: {
          id: 'user1',
          name: 'John Doe',
          image: null,
        },
        assignee: {
          id: 'user1',
          name: 'John Doe',
          image: null,
        },
      },
      {
        id: '3',
        title: 'Project Task 2',
        description: 'Another project task',
        status: 'COMPLETED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        creator: {
          id: 'user1',
          name: 'John Doe',
          image: null,
        },
        assignee: null,
      },
    ],
  },
  {
    projectId: 'personal1',
    projectName: 'My Personal Project',
    isPersonal: true,
    personalCategory: 'Learning',
    tasks: [
      {
        id: '4',
        title: 'Personal Task 1',
        description: 'A personal task',
        status: 'NOT_STARTED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        creator: {
          id: 'user1',
          name: 'John Doe',
          image: null,
        },
        assignee: null,
      },
    ],
  },
]

describe('MyTasksView', () => {
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProjectGroups),
    })
  })

  it('renders the component with correct title', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('My Tasks')).toBeInTheDocument()
    })
    expect(screen.getByText('Organize your tasks by project and drag between status columns')).toBeInTheDocument()
  })

  it('fetches tasks on mount', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/todos/my-tasks?grouped=true')
    })
  })

  it('displays loading state initially', () => {
    render(<MyTasksView />)
    
    // Check for the loading spinner - it uses a div with animate-pulse
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays project groups and tasks after loading', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('Standalone Tasks')).toBeInTheDocument()
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('My Personal Project')).toBeInTheDocument()
    })

    // Check for tasks
    expect(screen.getByText('Standalone Task 1')).toBeInTheDocument()
    expect(screen.getByText('Project Task 1')).toBeInTheDocument()
    expect(screen.getByText('Project Task 2')).toBeInTheDocument()
    expect(screen.getByText('Personal Task 1')).toBeInTheDocument()
  })

  it('displays status columns', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      // Check that status columns exist for project groups
      // Note: "Not Started" also appears in stats card, so we expect 4 total
      expect(screen.getAllByText('Not Started').length).toBeGreaterThanOrEqual(3)
      expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(3)
      expect(screen.getAllByText('Waiting For').length).toBeGreaterThanOrEqual(3)
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(3)
    })
  })

  it('displays personal project indicator and category', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('My Personal Project')).toBeInTheDocument()
      expect(screen.getByText('Learning')).toBeInTheDocument()
    })
  })

  it('displays task counts in stats cards', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      // Total tasks: 4
      expect(screen.getByText('4')).toBeInTheDocument()
      
      // Open tasks: 2 (Standalone Task 1 and Personal Task 1)
      // In Progress tasks: 1 (Project Task 1)
      // Completed tasks: 1 (Project Task 2)
    })
  })

  it('displays project filter dropdown', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('Standalone Task 1')).toBeInTheDocument()
    })

    // Check that the project filter dropdown exists - it's likely a select with text "All Projects"
    expect(screen.getByText('All Projects')).toBeInTheDocument()
  })

  it('filters tasks by search query', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('Standalone Task 1')).toBeInTheDocument()
    })

    // Search for "project"
    const searchInput = screen.getByPlaceholderText('Search tasks...')
    fireEvent.change(searchInput, { target: { value: 'project' } })
    
    await waitFor(() => {
      // Should show tasks with "project" in title or description
      expect(screen.queryByText('Standalone Task 1')).not.toBeInTheDocument()
      expect(screen.getByText('Project Task 1')).toBeInTheDocument()
      expect(screen.getByText('Project Task 2')).toBeInTheDocument()
    })
  })

  it('displays show completed button', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('Standalone Task 1')).toBeInTheDocument()
    })

    // Check that the "Show Completed" button exists
    expect(screen.getByText('Show Completed')).toBeInTheDocument()
  })

  it('displays quick add form', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('Standalone Task 1')).toBeInTheDocument()
    })

    // Check that the quick add form exists
    expect(screen.getByPlaceholderText('Quick add task...')).toBeInTheDocument()
    
    // Check that the Add button exists (it should be disabled initially)
    const addButton = screen.getByRole('button', { name: /add/i })
    expect(addButton).toBeInTheDocument()
    expect(addButton).toBeDisabled()
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tasks',
      })
    })
  })

  it('displays empty state when no tasks', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText("You don't have any assigned tasks")).toBeInTheDocument()
    })
  })

  it('displays filtered empty state', async () => {
    render(<MyTasksView />)
    
    await waitFor(() => {
      expect(screen.getByText('Standalone Task 1')).toBeInTheDocument()
    })

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search tasks...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    
    await waitFor(() => {
      expect(screen.getByText('No tasks found matching your filters')).toBeInTheDocument()
    })
  })
})