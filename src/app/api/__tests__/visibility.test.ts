import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    product: {
      findMany: jest.fn()
    },
    post: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

// Mock Prisma constructor and errors
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, code: string) {
        super(message)
        this.code = code
        this.name = 'PrismaClientKnownRequestError'
      }
    }
  }
}))

// Mock the public data filter
jest.mock('@/lib/public-data-filter', () => ({
  filterPublicData: (data: any) => data
}))

import { GET as publicSearchGET } from '@/app/api/public/search/route'
import { GET as projectsGET, POST as projectsPOST } from '@/app/api/projects/route'
import { GET as projectDetailGET } from '@/app/api/projects/[id]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { 
  mockRequireAuth, 
  mockAuthenticatedUser, 
  mockAuthenticationFailure, 
  resetTestMocks, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse,
  mockHandleApiError,
  mockSuccessResponse,
  mockParseRequestBody
} from '@/lib/test-utils'

describe('Visibility Security Tests', () => {
  beforeEach(() => {
    resetTestMocks()
    
    // Mock success response for all tests
    mockSuccessResponse.mockImplementation((data: any, status = 200) => 
      NextResponse.json({ success: true, data }, { status })
    )
    
    // Mock handleApiError to return proper error responses
    mockHandleApiError.mockImplementation((error: any, context?: string) => {
      if (error.name === 'AuthError') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    })
    
    // Mock parseRequestBody for POST requests
    mockParseRequestBody.mockImplementation(async (request: NextRequest) => {
      const text = await request.text()
      return JSON.parse(text)
    })
  })

  describe('Public Search', () => {
    it('should only return PUBLIC items', async () => {
      // Mock data - public search should only return public project
      const mockPublicProject = {
        id: '1',
        name: 'Public Project',
        visibility: 'PUBLIC',
        isActive: true,
        owner: { id: 'user1', name: 'User 1' },
        _count: { applications: 0 }
      }
      
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([mockPublicProject])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
      
      const req = new NextRequest('http://localhost:3000/api/public/search?q=Project')
      const response = await publicSearchGET(req)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.projects).toHaveLength(1)
      expect(data.data.projects[0].id).toBe('1')
      
      // Verify visibility filter was applied
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: 'PUBLIC',
            isActive: true
          })
        })
      )
    })
  })

  describe('Private Project Access', () => {
    it('should return 404 for private project when user is not owner', async () => {
      // Mock authenticated user with different ID
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user123', email: 'user@example.com' }
      })
      
      const mockProject = {
        id: 'project1',
        name: 'Private Project',
        visibility: 'PRIVATE',
        ownerId: 'otheruser',
        isActive: true,
        owner: { id: 'otheruser', name: 'Other User', email: 'other@example.com' },
        applications: []
      }
      
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject)
      
      const response = await projectDetailGET(
        new NextRequest('http://localhost:3000/api/projects/project1'),
        { params: Promise.resolve({ id: 'project1' }) }
      )
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Project not found')
    })

    it('should return private project data when user is owner', async () => {
      // Mock authenticated user as owner
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user123', email: 'user@example.com' }
      })
      
      const mockProject = {
        id: 'project1',
        name: 'My Private Project',
        visibility: 'PRIVATE',
        ownerId: 'user123',
        isActive: true,
        owner: { id: 'user123', name: 'Test User', email: 'user@example.com' },
        applications: []
      }
      
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject)
      
      const response = await projectDetailGET(
        new NextRequest('http://localhost:3000/api/projects/project1'),
        { params: Promise.resolve({ id: 'project1' }) }
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe('project1')
      expect(data.name).toBe('My Private Project')
    })
  })

  describe('Project Creation Defaults', () => {
    it('should create project with PUBLIC visibility by default', async () => {
      // Mock authenticated user
      mockAuthenticatedUser()
      
      const mockCreatedProject = {
        id: 'newproject',
        name: 'New Project',
        description: 'Test description',
        goal: 'Test goal',
        helpType: 'ADVICE',
        visibility: 'PUBLIC',
        ownerId: mockUser.id,
        owner: {
          name: mockUser.name,
          email: mockUser.email
        },
        product: null
      }
      
      // Mock successful transaction
      ;(prisma.$transaction as jest.Mock).mockResolvedValue(mockCreatedProject)
      
      const requestBody = {
        name: 'New Project',
        description: 'Test description that is at least 50 characters long to meet validation requirements',
        goal: 'Test goal for the project',
        helpType: 'ADVICE',
        contactEmail: 'test@example.com'
        // Note: visibility is NOT provided, should default to PUBLIC
      }
      
      const req = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
      
      const response = await projectsPOST(req)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.visibility).toBe('PUBLIC')
      
      // Verify the transaction was called
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})