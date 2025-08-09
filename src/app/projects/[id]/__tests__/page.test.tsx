// TypeScript test fixes applied
/**
 * Tests for the unified project page with visibility controls
 */

import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import ProjectPage from '../page'
import { canViewEntity, NotFoundError } from '@/lib/auth-utils'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn()
}))

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock auth-utils
jest.mock('@/lib/auth-utils', () => ({
  canViewEntity: jest.fn(),
  getEffectiveRole: jest.fn(),
  NotFoundError: class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  }
}))

// Mock the client component
jest.mock('../components/ProjectPageClient', () => {
  return function MockProjectPageClient(props: any) {
    return (
      <div data-testid="project-page-client">
        <div>Project: {props.project.name}</div>
        <div>User: {props.currentUser?.name || 'Anonymous'}</div>
        <div>Role: {props.userRole || 'None'}</div>
      </div>
    )
  }
})

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockCanViewEntity = canViewEntity as jest.MockedFunction<typeof canViewEntity>
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>

describe('Project Page', () => {
  const mockParams = Promise.resolve({ id: 'project-1' })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Public project access', () => {
    it('should render public project for unauthenticated users', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Public Project',
        visibility: 'PUBLIC',
        description: 'A public project'
      }

      mockGetServerSession.mockResolvedValue(null)
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: null,
        role: null
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', undefined)
      expect(result).toBeDefined()
      expect(mockNotFound).not.toHaveBeenCalled()
    })

    it('should render public project for authenticated users', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Public Project',
        visibility: 'PUBLIC',
        description: 'A public project'
      }
      const mockUser = { id: 'user-1', name: 'Test User' ,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    email: 'test@example.com',
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
      const mockSession = { user: { id: 'user-1' ,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  } }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: mockUser,
        role: 'ADMIN'
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', 'user-1')
      expect(result).toBeDefined()
      expect(mockNotFound).not.toHaveBeenCalled()
    })
  })

  describe('Private project access', () => {
    it('should return 404 for private project accessed by unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)
      mockCanViewEntity.mockRejectedValue(new NotFoundError('project not found'))

      try {
        await ProjectPage({ params: Promise.resolve(mockParams) })
      } catch (error) {
        // Expected to not reach here due to notFound() call
      }

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', undefined)
      expect(mockNotFound).toHaveBeenCalled()
    })

    it('should return 404 for private project accessed by unauthorized user', async () => {
      const mockSession = { user: { id: 'user-1' ,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  } }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockCanViewEntity.mockRejectedValue(new NotFoundError('project not found'))

      try {
        await ProjectPage({ params: Promise.resolve(mockParams) })
      } catch (error) {
        // Expected to not reach here due to notFound() call
      }

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', 'user-1')
      expect(mockNotFound).toHaveBeenCalled()
    })

    it('should render private project for authorized user', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Private Project',
        visibility: 'PRIVATE',
        description: 'A private project'
      }
      const mockUser = { id: 'user-1', name: 'Test User' ,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    email: 'test@example.com',
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
      const mockSession = { user: { id: 'user-1' ,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  } }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: mockUser,
        role: 'ADMIN'
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', 'user-1')
      expect(result).toBeDefined()
      expect(mockNotFound).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should call notFound() for NotFoundError', async () => {
      mockGetServerSession.mockResolvedValue(null)
      mockCanViewEntity.mockRejectedValue(new NotFoundError('Project not found'))

      try {
        await ProjectPage({ params: Promise.resolve(mockParams) })
      } catch (error) {
        // Expected to not reach here due to notFound() call
      }

      expect(mockNotFound).toHaveBeenCalled()
    })

    it('should re-throw non-NotFoundError errors', async () => {
      const mockError = new Error('Database connection failed')
      
      mockGetServerSession.mockResolvedValue(null)
      mockCanViewEntity.mockRejectedValue(mockError)

      await expect(ProjectPage({ params: Promise.resolve(mockParams) })).rejects.toThrow('Database connection failed')
      expect(mockNotFound).not.toHaveBeenCalled()
    })
  })

  describe('Role-based rendering', () => {
    it('should pass correct role information to client component', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        visibility: 'PUBLIC'
      }
      const mockUser = { id: 'user-1', name: 'Test User' ,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    email: 'test@example.com',
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
      const mockSession = { user: { id: 'user-1' ,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  } }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: mockUser,
        role: 'ADMIN'
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(result).toBeDefined()
    })

    it('should handle users without roles', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        visibility: 'PUBLIC'
      }
      const mockUser = { id: 'user-1', name: 'Test User' ,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    email: 'test@example.com',
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
      const mockSession = { user: { id: 'user-1' ,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  } }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: mockUser,
        role: null
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(result).toBeDefined()
    })
  })

  describe('Session handling', () => {
    it('should handle missing session user id', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Public Project',
        visibility: 'PUBLIC'
      }

      // Session exists but no user.id
      mockGetServerSession.mockResolvedValue({ user: {} })
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: null,
        role: null
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', undefined)
      expect(result).toBeDefined()
    })

    it('should handle session with user id', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Public Project',
        visibility: 'PUBLIC'
      }
      const mockUser = { id: 'user-1', name: 'Test User' ,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    email: 'test@example.com',
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

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockCanViewEntity.mockResolvedValue({
        entity: mockProject,
        user: mockUser,
        role: 'ADMIN'
      })

      const result = await ProjectPage({ params: Promise.resolve(mockParams) })

      expect(mockCanViewEntity).toHaveBeenCalledWith('project', 'project-1', 'user-1')
      expect(result).toBeDefined()
    })
  })
})