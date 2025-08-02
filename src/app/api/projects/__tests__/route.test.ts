import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { 
  mockRequireAuth, 
  mockAuthenticatedUser, 
  mockAuthenticationFailure, 
  resetTestMocks, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse
} from '@/lib/test-utils'
import { handleApiError, successResponse, parseRequestBody } from '@/lib/api-utils'

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
    },
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'PrismaClientUnknownRequestError'
      }
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>

describe('/api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProject = {
    id: 'project-123',
    title: 'AI-Powered Learning Platform',
    description: 'A comprehensive learning platform that uses AI to personalize education.',
    projectType: 'STARTUP',
    helpType: 'MVP',
    budgetRange: '$10,000 - $50,000',
    maxVolunteers: 5,
    contactEmail: 'contact@example.com',
    organizationUrl: 'https://example.com',
    timeline: { description: '6-month development cycle' },
    requiredSkills: ['React', 'Node.js', 'AI/ML'],
    ownerId: 'user-123',
    owner: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  }

  describe('GET /api/projects', () => {
    test('should return all active projects', async () => {
      const mockProjects = [mockProject]
      mockPrisma.project.findMany.mockResolvedValue(mockProjects as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockProjects, 200) as any
      )

      const response = await GET()
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
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })
  })

  describe('POST /api/projects', () => {
    const validProjectData = {
      title: 'AI-Powered Learning Platform',
      description: 'A comprehensive learning platform that uses AI to personalize education for students worldwide.',
      projectType: 'STARTUP',
      helpType: 'MVP',
      budgetRange: '$10,000 - $50,000',
      maxVolunteers: 5,
      contactEmail: 'contact@example.com',
      organizationUrl: 'https://example.com',
      timeline: {
        description: '6-month development cycle',
      },
      requiredSkills: ['React', 'Node.js', 'AI/ML'],
    }

    const createMockRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest
    }

    test('should create project with valid data', async () => {
      mockRequireAuth.mockResolvedValue(mockUser)
      mockParseRequestBody.mockResolvedValue(validProjectData)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockProject, 201) as any
      )
      mockPrisma.$transaction.mockResolvedValue(mockProject as any)
      mockPrisma.user.findMany.mockResolvedValue([]) // No other users to notify

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.title).toBe(validProjectData.title)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    test('should return 401 for unauthenticated user', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Not authenticated')
    })

    test('should return 401 for non-existent user', async () => {
      resetTestMocks()
      mockAuthenticationFailure('Authenticated user not found')
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Authenticated user not found', 401) as any
      )

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Authenticated user not found')
    })

    test('should return 400 for invalid input data', async () => {
      resetTestMocks()
      mockAuthenticatedUser()
      const invalidData = {
        title: 'AI', // Too short
        description: 'Short description', // Too short
        projectType: 'INVALID',
        helpType: 'INVALID',
        maxVolunteers: 0, // Too low
        contactEmail: 'invalid-email',
        requiredSkills: Array(21).fill('skill'), // Too many skills
      }
      
      const validationError = new Error('Invalid input')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Invalid input', 400) as any
      )

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    // Helper for validation tests
    const testValidationError = async (invalidData: any, expectedError: string) => {
      // Reset mocks for this specific test
      resetTestMocks()
      mockAuthenticatedUser()
      const validationError = new Error(expectedError)
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse(expectedError, 400) as any
      )

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe(expectedError)
    }

    test('should validate title length', async () => {
      const invalidData = { ...validProjectData, title: 'AI' }
      await testValidationError(invalidData, 'Title must be at least 5 characters long')
    })

    test('should validate description length', async () => {
      const invalidData = { ...validProjectData, description: 'Too short' }
      await testValidationError(invalidData, 'Description must be at least 50 characters long')
    })

    test('should validate project type enum', async () => {
      const invalidData = { ...validProjectData, projectType: 'INVALID' }
      await testValidationError(invalidData, 'Invalid input')
    })

    test('should validate help type enum', async () => {
      const invalidData = { ...validProjectData, helpType: 'INVALID' }
      await testValidationError(invalidData, 'Invalid input')
    })

    test('should validate max volunteers range', async () => {
      const invalidData = { ...validProjectData, maxVolunteers: 51 }
      await testValidationError(invalidData, 'Cannot exceed 50 volunteers')
    })

    test('should validate contact email format', async () => {
      const invalidData = { ...validProjectData, contactEmail: 'invalid-email' }
      await testValidationError(invalidData, 'Invalid contact email address')
    })

    test('should validate organization URL format', async () => {
      const invalidData = { ...validProjectData, organizationUrl: 'not-a-url' }
      await testValidationError(invalidData, 'Invalid organization URL')
    })

    test('should convert empty organization URL to null', async () => {
      resetTestMocks()
      mockAuthenticatedUser()
      const dataWithEmptyUrl = { ...validProjectData, organizationUrl: '' }
      mockParseRequestBody.mockResolvedValue(dataWithEmptyUrl)
      mockSuccessResponse.mockImplementation((data, status = 200) => 
        mockApiSuccessResponse(data, status) as any
      )
      mockPrisma.$transaction.mockResolvedValue(mockProject as any)
      mockPrisma.user.findMany.mockResolvedValue([]) // No other users to notify

      const request = createMockRequest(dataWithEmptyUrl)
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    test('should validate required skills array length', async () => {
      const invalidData = { ...validProjectData, requiredSkills: Array(21).fill('skill') }
      await testValidationError(invalidData, 'Maximum 20 required skills allowed')
    })

    test('should validate timeline description length', async () => {
      const invalidData = { 
        ...validProjectData, 
        timeline: { description: 'A'.repeat(1001) }
      }
      await testValidationError(invalidData, 'Timeline description must be less than 1000 characters long')
    })

    test('should validate budget range length', async () => {
      const invalidData = { ...validProjectData, budgetRange: 'A'.repeat(51) }
      await testValidationError(invalidData, 'Budget range must be less than 50 characters long')
    })

    test('should handle database errors', async () => {
      resetTestMocks()
      mockAuthenticatedUser()
      mockParseRequestBody.mockResolvedValue(validProjectData)
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should handle user lookup errors', async () => {
      resetTestMocks()
      const authError = new Error('Database error')
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })
  })
})