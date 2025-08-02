import { NextRequest } from 'next/server'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock all dependencies first before importing anything
jest.mock('next-auth/next')
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
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/projects', () => {
  const mockUser = createTestUser({
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  const mockProject = {
    id: 'project-123',
    name: 'AI-Powered Learning Platform',
    description: 'A comprehensive learning platform that uses AI to personalize education.',
    goal: 'Build a platform to revolutionize education',
    helpType: 'MVP',
    status: 'AWAITING_VOLUNTEERS',
    isActive: true,
    visibility: 'PUBLIC',
    contactEmail: 'contact@example.com',
    ownerId: 'user-123',
    organizationId: null,
    owner: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  }

  describe('GET /api/projects', () => {
    test('should return all active projects', async () => {
      // No authentication needed for public GET
      mockSession(null)
      
      const mockProjects = [mockProject]
      mockPrisma.project.findMany.mockResolvedValue(mockProjects as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual(mockProjects)
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { 
          isActive: true,
          visibility: 'PUBLIC'
        },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      })
    })

    test('should handle database errors', async () => {
      mockSession(null)
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('POST /api/projects', () => {
    const validProjectData = {
      name: 'AI-Powered Learning Platform',
      goal: 'Build a platform to revolutionize education',
      description: 'A comprehensive learning platform that uses AI to personalize education for students worldwide.',
      helpType: 'MVP',
      contactEmail: 'contact@example.com',
    }

    test('should create project with valid data', async () => {
      mockSession(mockUser)
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
            findUnique: jest.fn().mockResolvedValue(mockProject),
          },
          post: {
            create: jest.fn(),
          },
        }
        return callback(tx as any)
      })
      mockPrisma.user.findMany.mockResolvedValue([]) // No other users to notify

      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.name).toBe(mockProject.name)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    test('should return 401 for unauthenticated user', async () => {
      mockSession(null) // No authentication

      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 401 for non-existent user', async () => {
      mockSession(mockUser)
      mockPrisma.user.findUnique.mockResolvedValue(null) // User not found in DB

      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 400 for invalid input data', async () => {
      mockSession(mockUser)
      
      const invalidData = {
        name: '', // Empty name should fail validation
        description: 'Short', // Too short
        helpType: 'INVALID',
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Validation failed')
    })

    test('should validate title length', async () => {
      mockSession(mockUser)
      
      const invalidData = { ...validProjectData, name: 'AI' }
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Validation failed')
    })

    test('should validate description length', async () => {
      mockSession(mockUser)
      
      const invalidData = { ...validProjectData, description: 'Too short' }
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Validation failed')
    })

    test('should ignore unknown fields like projectType', async () => {
      mockSession(mockUser)
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
            findUnique: jest.fn().mockResolvedValue(mockProject),
          },
          post: {
            create: jest.fn(),
          },
        }
        return callback(tx as any)
      })
      mockPrisma.user.findMany.mockResolvedValue([])
      
      const dataWithExtraFields = { ...validProjectData, projectType: 'INVALID' }
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', dataWithExtraFields)
      const response = await POST(request)
      const responseData = await response.json()

      // Should succeed because unknown fields are ignored
      expect(response.status).toBe(201)
      expect(responseData.name).toBe(mockProject.name)
    })

    test('should validate help type enum', async () => {
      mockSession(mockUser)
      
      const invalidData = { ...validProjectData, helpType: 'INVALID' }
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Validation failed')
    })

    test('should ignore unknown fields like maxVolunteers', async () => {
      mockSession(mockUser)
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
            findUnique: jest.fn().mockResolvedValue(mockProject),
          },
          post: {
            create: jest.fn(),
          },
        }
        return callback(tx as any)
      })
      mockPrisma.user.findMany.mockResolvedValue([])
      
      const dataWithExtraFields = { ...validProjectData, maxVolunteers: 51 }
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', dataWithExtraFields)
      const response = await POST(request)
      const responseData = await response.json()

      // Should succeed because unknown fields are ignored
      expect(response.status).toBe(201)
      expect(responseData.name).toBe(mockProject.name)
    })

    test('should validate contact email format', async () => {
      mockSession(mockUser)
      
      const invalidData = { ...validProjectData, contactEmail: 'invalid-email' }
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/projects', invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Validation failed')
    })
  })
})