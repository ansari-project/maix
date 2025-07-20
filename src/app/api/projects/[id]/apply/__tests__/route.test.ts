import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    application: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { 
  mockRequireAuth, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse
} from '@/lib/test-utils'
import { handleApiError, successResponse, parseRequestBody } from '@/lib/api-utils'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>

describe('/api/projects/[id]/apply', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe',
  }

  const mockSession = {
    user: {
      email: 'john@example.com',
    },
  }

  const mockProject = {
    id: 'project-123',
    name: 'AI-Powered Learning Platform',
    isActive: true,
    applications: [],
  }

  const mockApplication = {
    id: 'application-123',
    message: 'I am interested in contributing to this project with my React and Node.js skills.',
    userId: 'user-123',
    projectId: 'project-123',
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    project: {
      name: 'AI-Powered Learning Platform',
    },
  }

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  const mockParams = { id: 'project-123' }

  describe('POST /api/projects/[id]/apply', () => {
    const validApplicationData = {
      message: 'I am interested in contributing to this project with my React and Node.js skills.',
    }

    test('should create application with valid data', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockResolvedValue(mockApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockApplication, 201) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.message).toBe(validApplicationData.message)
      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: {
          message: validApplicationData.message,
          userId: mockUser.id,
          projectId: mockParams.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
      })
    })

    test('should return 401 for unauthenticated user', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Not authenticated')
    })

    test('should return 404 for non-existent user', async () => {
      const authError = new Error('Authenticated user not found')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Authenticated user not found', 404) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.message).toBe('Authenticated user not found')
    })

    test('should return 404 for non-existent project', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(null)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Project not found', 404) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.message).toBe('Project not found')
    })

    test('should return 400 for existing application', async () => {
      const existingApplication = {
        id: 'existing-application',
        userId: mockUser.id,
        projectId: mockParams.id,
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(existingApplication as any)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('You have already applied to this project', 400) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('You have already applied to this project')
    })

    test('should return 400 when project is inactive', async () => {
      const inactiveProject = {
        ...mockProject,
        isActive: false,
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(inactiveProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('This project is not accepting applications', 400) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('This project is not accepting applications')
    })

    test('should return 400 for invalid input data', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Invalid input')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Invalid input', 400) as any
      )

      const invalidData = {
        message: 'Short', // Too short
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    test('should validate message length - too short', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Application message must be at least 10 characters long')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Application message must be at least 10 characters long', 400) as any
      )

      const invalidData = {
        message: 'Too short',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Application message must be at least 10 characters long')
    })

    test('should validate message length - too long', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Application message must be less than 2000 characters long')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Application message must be less than 2000 characters long', 400) as any
      )

      const invalidData = {
        message: 'A'.repeat(2001),
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Application message must be less than 2000 characters long')
    })

    test('should validate message is required', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Invalid input')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Invalid input', 400) as any
      )

      const invalidData = {}

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    test('should check for existing application with correct composite key', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockResolvedValue(mockApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockApplication, 201) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })

      expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
        where: {
          userId_projectId: {
            userId: mockUser.id,
            projectId: mockParams.id,
          },
        },
      })

      expect(response.status).toBe(201)
    })

    test('should handle database errors during user lookup', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should handle database errors during project lookup', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should handle database errors during application creation', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should include project info in application details', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue(validApplicationData)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockResolvedValue(mockApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockApplication, 201) as any
      )

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        include: {
          applications: true,
        },
      })

      expect(response.status).toBe(201)
    })

    test('should validate empty message', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Application message must be at least 10 characters long')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Application message must be at least 10 characters long', 400) as any
      )

      const invalidData = {
        message: '',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Application message must be at least 10 characters long')
    })
  })
})