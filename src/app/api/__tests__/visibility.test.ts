import { NextRequest, NextResponse } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils', () => ({
  requireAuth: jest.fn()
}))
jest.mock('@/lib/api-utils', () => ({
  handleApiError: jest.fn(),
  parseRequestBody: jest.fn(),
  successResponse: jest.fn((data, status = 200) => 
    NextResponse.json(data, { status })
  )
}))
jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn()
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

// Mock test helper utilities
jest.mock('@/__tests__/helpers/api-test-utils.helper', () => ({
  createMockRequest: jest.fn((method, url, body, headers) => {
    const requestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
    
    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body)
    }
    
    return new NextRequest(url, requestInit)
  }),
  mockSession: jest.fn((user) => {
    const mockGetServerSession = require('next-auth/next').getServerSession
    
    if (user) {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    } else {
      mockGetServerSession.mockResolvedValue(null)
    }
  }),
  createTestUser: jest.fn((overrides) => ({
    id: overrides.id || 'test-user-id',
    email: overrides.email || 'test@example.com',
    name: overrides.name || 'Test User',
    ...overrides
  }))
}))

// Mock Prisma constructor and errors
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string }) {
        super(message)
        this.code = code
      }
    },
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {
      constructor(message: string) {
        super(message)
      }
    },
    PrismaClientValidationError: class PrismaClientValidationError extends Error {
      constructor(message: string) {
        super(message)
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
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

describe('Visibility Security Tests', () => {
  const mockUser = createTestUser({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
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
      
      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.projects[0].id).toBe('1')
      
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
      mockSession(mockUser)
      
      const mockCreatedProject = {
        id: 'newproject',
        name: 'New Project',
        description: 'Test description that is at least 50 characters long to meet validation requirements',
        goal: 'Test goal for the project',
        helpType: 'ADVICE',
        status: 'AWAITING_VOLUNTEERS',
        isActive: true,
        visibility: 'PUBLIC',
        contactEmail: 'test@example.com',
        ownerId: mockUser.id,
        organizationId: null,
        productId: null,
        targetCompletionDate: null,
        embedding: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email
        },
        organization: null,
        product: null,
        _count: {
          applications: 0
        }
      }
      
      // Mock successful transaction
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockResolvedValue(mockCreatedProject),
            findUnique: jest.fn().mockResolvedValue(mockCreatedProject),
          },
          post: {
            create: jest.fn(),
          },
        }
        return callback(tx as any)
      })
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([]) // No other users to notify
      
      const requestBody = {
        name: 'New Project',
        description: 'Test description that is at least 50 characters long to meet validation requirements',
        goal: 'Test goal for the project',
        helpType: 'ADVICE',
        contactEmail: 'test@example.com'
        // Note: visibility is NOT provided, should default to PUBLIC
      }
      
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      const response = await projectsPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.name).toBe('New Project')
      expect(data.visibility).toBe('PUBLIC')
      
      // Verify the transaction was called
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})