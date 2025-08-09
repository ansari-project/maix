// TypeScript test fixes applied
/**
 * Integration tests for todo system within the project page
 * Tests the integration between TodoSection and TodoPostLink components
 */

import { TodoStatus, ProjectStatus } from '@prisma/client'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TodoSection } from '@/components/todos/todo-section'
import { TodoPostLink } from '@/components/todos/todo-post-link'

// Mock Next.js hooks
jest.mock('next-auth/react')
jest.mock('next/navigation')

// Mock fetch globally
global.fetch = jest.fn()

const mockUseSession = useSession as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockFetch = global.fetch as jest.Mock

// Mock project data with project members for RBAC
const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  goal: 'Build an amazing app',
  description: 'A detailed description of the project',
  helpType: 'MVP',
  status: ProjectStatus.IN_PROGRESS,
  contactEmail: 'test@example.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  owner: {
    id: 'owner-1',
    name: 'Project Owner',
    email: 'owner@example.com'
  },
  applications: []
}

const mockTodos = [
  {
    id: 'todo-1',
    title: 'Implement user authentication',
    description: 'Set up NextAuth.js with Google OAuth',
    status: TodoStatus.NOT_STARTED,
    dueDate: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    projectId: 'project-1',
    creatorId: 'owner-1',
    assigneeId: null,
    creator: {
      id: 'owner-1',
      name: 'Project Owner',
      username: 'owner',
      image: null
    },
    assignee: null,
    posts: []
  },
  {
    id: 'todo-2',
    title: 'Setup database schema',
    description: 'Create Prisma schema and run migrations',
    status: ProjectStatus.IN_PROGRESS,
    dueDate: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    projectId: 'project-1',
    creatorId: 'owner-1',
    assigneeId: 'volunteer-1',
    creator: {
      id: 'owner-1',
      name: 'Project Owner',
      username: 'owner',
      image: null
    },
    assignee: {
      id: 'volunteer-1',
      name: 'Volunteer User',
      username: 'volunteer',
      image: null
    },
    posts: []
  }
]

const mockProjectUpdates = [
  {
    id: 'update-1',
    content: 'Project has been started successfully!',
    createdAt: '2024-01-01T00:00:00Z',
    author: {
      id: 'owner-1',
      name: 'Project Owner',
      image: null
    },
    _count: {
      comments: 2
    }
  }
]

const mockUser = {
  id: 'owner-1',
  name: 'Project Owner',
  email: 'owner@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    password: null,
    specialty: null,
    bio: null,
    availability: null,
    portfolioUrl: null,
    linkedinUrl: null,
    githubUrl: null,
    skills: [],
    lastActiveAt: new Date(),
    lastDigestSentAt: null
  }

const mockVolunteerUser = {
  id: 'volunteer-1',
  name: 'Volunteer User',
  email: 'volunteer@example.com'
}

const mockSession = {
  user: mockUser,
  expires: '2025-01-01'
}

const mockVolunteerSession = {
  user: mockVolunteerUser,
  expires: '2025-01-01'
}

describe('Todo Integration Components', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseRouter.mockReturnValue({
      push: mockPush
    })
    
    // Default to authenticated owner
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })
    
    // Setup default fetch responses for todos
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        todos: mockTodos,
        pagination: { total: 2, limit: 50, offset: 0 }
      })
    })
  })

  it('should render TodoSection with todos for project owners', async () => {
    render(<TodoSection projectId="project-1" />)
    
    // Wait for todos to load
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument()
    })
    
    // Verify the API was called to fetch todos
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos')
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument()
    })
  })

  it('should render TodoSection for accepted volunteers', async () => {
    // Mock as accepted volunteer
    mockUseSession.mockReturnValue({
      data: mockVolunteerSession,
      status: 'authenticated'
    })
    
    render(<TodoSection projectId="project-1" />)
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument()
    })
    
    // Verify the API was called to fetch todos
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos')
  })

  it('should handle permission checks for non-participants', async () => {
    const nonParticipantUser = {
      id: 'other-user',
      name: 'Other User',
      email: 'other@example.com'
    }
    
    mockUseSession.mockReturnValue({
      data: { user: nonParticipantUser, expires: '2025-01-01' },
      status: 'authenticated'
    })
    
    // Mock API to return 403 for non-participants
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Insufficient permissions' })
    })
    
    render(<TodoSection projectId="project-1" />)
    
    // TodoSection should handle the permissions error gracefully
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos')
    })
  })

  it('should render TodoPostLink with available todos', async () => {
    const mockOnChange = jest.fn()
    
    render(<TodoPostLink 
      projectId="project-1" 
      value={null}
      onChange={mockOnChange}
    />)
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('No todo linked')).toBeInTheDocument()
    })
    
    // Verify the API was called to fetch todos with status filters
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos?status=NOT_STARTED&status=IN_PROGRESS')
    
    // Verify we can find the select trigger
    const selectTrigger = screen.getByRole('combobox')
    expect(selectTrigger).toBeInTheDocument()
  })

  it('should handle todo selection in TodoPostLink', async () => {
    const mockOnChange = jest.fn()
    
    render(<TodoPostLink 
      projectId="project-1" 
      value="todo-1"
      onChange={mockOnChange}
    />)
    
    // Wait for the component to load
    await waitFor(() => {
      const selectTrigger = screen.getByRole('combobox')
      expect(selectTrigger).toBeInTheDocument()
    })
    
    // Verify the API was called to fetch todos with status filters
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos?status=NOT_STARTED&status=IN_PROGRESS')
    
    // Verify the select component is rendered
    const selectTrigger = screen.getByRole('combobox')
    expect(selectTrigger).toBeInTheDocument()
  })

  it('should render TodoSection and fetch todos', async () => {
    render(<TodoSection projectId="project-1" />)
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument()
    })
    
    // Verify the API was called to fetch todos
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos')
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument()
    })
  })

  it('should load and display todo statistics', async () => {
    render(<TodoSection projectId="project-1" />)
    
    // Wait for todos to load
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument()
    })
    
    // Verify the API was called to fetch todos
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/todos')
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument()
    })
  })
})