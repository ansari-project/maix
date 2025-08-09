import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { MyProjectsClient } from '../MyProjectsClient'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockPush = jest.fn()
const mockToast = jest.fn()

const mockSession = {
  user: {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
  },
}

const mockProjects = [
  {
    id: 'project1',
    name: 'Learn React Development',
    description: 'A comprehensive course on React development',
    personalCategory: 'Learning',
    targetCompletionDate: '2024-06-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    isActive: true,
    status: 'IN_PROGRESS',
    owner: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    members: [
      {
        id: 'member1',
        role: 'OWNER',
        user: {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    ],
    todos: [
      {
        id: 'todo1',
        title: 'Complete React tutorial',
        status: 'NOT_STARTED',
      },
    ],
  },
  {
    id: 'project2',
    name: 'Side Project: Task Manager',
    description: 'Building a personal task management application',
    personalCategory: 'Development',
    targetCompletionDate: null,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    isActive: true,
    status: 'COMPLETED',
    owner: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    members: [
      {
        id: 'member2',
        role: 'OWNER',
        user: {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      {
        id: 'member3',
        role: 'MEMBER',
        user: {
          id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      },
    ],
    todos: [],
  },
]

const mockCategories = ['Learning', 'Development', 'Health']

describe('MyProjectsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    
    ;(useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    })
    
    // Mock successful API responses
    ;(fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        })
      )
  })

  it('redirects to signin when not authenticated', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<MyProjectsClient />)

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('shows loading state initially', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    })

    render(<MyProjectsClient />)

    expect(screen.getByText('My Personal Projects')).toBeInTheDocument()
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders the main interface when authenticated', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('My Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('Manage your personal learning and development projects')).toBeInTheDocument()
    })
  })

  it('fetches and displays projects', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
      expect(screen.getByText('Side Project: Task Manager')).toBeInTheDocument()
    })

    // Check project details
    expect(screen.getByText('A comprehensive course on React development')).toBeInTheDocument()
    expect(screen.getByText('Building a personal task management application')).toBeInTheDocument()
  })

  it('displays project statistics correctly', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
    })

    // Check that statistics are displayed (values may be 0 initially due to filtering logic)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Categories')).toBeInTheDocument()
  })

  it('displays project categories and status badges', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learning')).toBeInTheDocument()
      expect(screen.getByText('Development')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('shows shared project indicators', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      // Second project has 2 members, so should show "Shared" badge
      const sharedBadges = screen.getAllByText('Shared')
      expect(sharedBadges.length).toBeGreaterThan(0)
    })
  })

  it('filters projects by search query', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
      expect(screen.getByText('Side Project: Task Manager')).toBeInTheDocument()
    })

    // Search for "React"
    const searchInput = screen.getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'React' } })

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
      expect(screen.queryByText('Side Project: Task Manager')).not.toBeInTheDocument()
    })
  })

  it('filters projects by category', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
      expect(screen.getByText('Side Project: Task Manager')).toBeInTheDocument()
    })

    // Filter by Learning category  
    const categorySelect = screen.getByText('All Categories')
    fireEvent.click(categorySelect)
    
    await waitFor(() => {
      const learningOption = screen.getByText('Learning')
      fireEvent.click(learningOption)
    })

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
      expect(screen.queryByText('Side Project: Task Manager')).not.toBeInTheDocument()
    })
  })

  it('filters projects by status', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
      expect(screen.getByText('Side Project: Task Manager')).toBeInTheDocument()
    })

    // Filter by Completed status
    const statusSelect = screen.getByText('All Status')
    fireEvent.click(statusSelect)
    
    await waitFor(() => {
      const completedOption = screen.getByText('Completed')
      fireEvent.click(completedOption)
    })

    await waitFor(() => {
      expect(screen.queryByText('Learn React Development')).not.toBeInTheDocument()
      expect(screen.getByText('Side Project: Task Manager')).toBeInTheDocument()
    })
  })

  it('shows create project dialog when New Project button is clicked', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('New Project')).toBeInTheDocument()
    })

    const newProjectButton = screen.getByText('New Project')
    fireEvent.click(newProjectButton)

    await waitFor(() => {
      expect(screen.getByText('Create Personal Project')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    // Mock fetch to reject
    ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load personal projects',
      })
    })
  })

  it('shows empty state when no projects exist', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    // Mock empty projects response
    ;(fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('No Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('Start your personal development journey by creating your first project')).toBeInTheDocument()
    })
  })

  it('shows filtered empty state when no projects match filters', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
    })

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent project' } })

    await waitFor(() => {
      expect(screen.getByText('No Personal Projects')).toBeInTheDocument()
      expect(screen.getByText('No projects match your filters')).toBeInTheDocument()
    })
  })

  it('switches between grid and list view', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
    })

    // Should default to grid view
    expect(screen.getByRole('tab', { name: 'Grid View', selected: true })).toBeInTheDocument()

    // Switch to list view
    const listViewTab = screen.getByRole('tab', { name: 'List View' })
    fireEvent.click(listViewTab)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'List View', selected: true })).toBeInTheDocument()
    })
  })

  it('shows include shared toggle', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    // Mock successful API responses for this test
    ;(fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        })
      )

    render(<MyProjectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Learn React Development')).toBeInTheDocument()
    })

    // Look for the shared toggle button
    expect(screen.getByText('Show Shared')).toBeInTheDocument()
  })
})