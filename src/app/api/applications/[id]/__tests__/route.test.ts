import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/ownership-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma')

import { PATCH } from '../route'
import { prisma } from '@/lib/prisma'
import { 
  mockRequireAuth, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse
} from '@/lib/test-utils'
import { handleApiError, successResponse, parseRequestBody } from '@/lib/api-utils'
import { hasResourceAccess } from '@/lib/ownership-utils'

const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>
const mockHasResourceAccess = hasResourceAccess as jest.MockedFunction<typeof hasResourceAccess>

// Cast Prisma methods properly
const mockFindUnique = prisma.application.findUnique as jest.Mock
const mockUpdate = prisma.application.update as jest.Mock

describe('/api/applications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mocks for most tests
    mockHasResourceAccess.mockResolvedValue(true)
  })

  const mockProjectOwner = {
    id: 'owner-123',
    email: 'owner@example.com',
    name: 'Project Owner',
  }

  const mockApplication = {
    id: 'application-123',
    message: 'I am interested in contributing to this project.',
    status: 'PENDING',
    userId: 'user-123',
    projectId: 'project-123',
    project: {
      id: 'project-123',
      title: 'AI-Powered Learning Platform',
      owner: mockProjectOwner,
      ownerId: 'owner-123',
      organization: null,
      organizationId: null,
      visibility: 'PUBLIC',
    },
  }

  const mockUpdatedApplication = {
    id: 'application-123',
    status: 'ACCEPTED',
    message: 'Welcome to the team!',
    respondedAt: new Date('2024-01-15T10:00:00Z'),
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  }

  const createMockRequest = (body: any) => {
    return new Request('http://localhost/api/applications/123', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  const mockParams = { id: 'application-123' }

  describe('PATCH /api/applications/[id]', () => {
    const validUpdateData = {
      status: 'ACCEPTED',
      message: 'Welcome to the team!',
    }

    test('should update volunteer application with valid data', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockResolvedValue(mockUpdatedApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockUpdatedApplication, 200) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('ACCEPTED')
      expect(responseData.message).toBe('Welcome to the team!')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: validUpdateData.status,
          message: validUpdateData.message,
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
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

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Not authenticated')
    })

    test('should return 404 for non-existent application', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockResolvedValue(null)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Application not found', 404) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.message).toBe('Application not found')
    })

    test('should return 403 for non-project-owner', async () => {
      const nonOwner = {
        id: 'other-user-123',
        email: 'someone-else@example.com',
        name: 'Other User',
      }

      mockRequireAuth.mockResolvedValue(nonOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockHasResourceAccess.mockResolvedValue(false)  // Non-owner doesn't have access
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Unauthorized', 403) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.message).toBe('Unauthorized')
    })

    test('should return 400 for invalid input data', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      const validationError = new Error('Invalid input')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Invalid input', 400) as any
      )

      const invalidData = {
        status: 'INVALID_STATUS',
        message: 'A'.repeat(1001), // Too long
      }

      const request = createMockRequest(invalidData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    test('should validate status enum values', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      const validationError = new Error('Invalid input')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Invalid input', 400) as any
      )

      const invalidData = {
        status: 'INVALID_STATUS',
      }

      const request = createMockRequest(invalidData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    test('should validate message length', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      const validationError = new Error('Response message must be less than 1000 characters long')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Response message must be less than 1000 characters long', 400) as any
      )

      const invalidData = {
        status: 'ACCEPTED',
        message: 'A'.repeat(1001),
      }

      const request = createMockRequest(invalidData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Response message must be less than 1000 characters long')
    })

    test('should accept all valid status values', async () => {
      const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']

      for (const status of validStatuses) {
        jest.clearAllMocks()
        mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
        mockParseRequestBody.mockResolvedValue({ status })
        mockFindUnique.mockResolvedValue(mockApplication as any)
        mockUpdate.mockResolvedValue({
          ...mockUpdatedApplication,
          status,
        } as any)
        mockSuccessResponse.mockReturnValue(
          mockApiSuccessResponse({ ...mockUpdatedApplication, status }, 200) as any
        )

        const request = createMockRequest({ status })
        const response = await PATCH(request, { params: Promise.resolve(mockParams) })

        expect(response.status).toBe(200)
      }
    })

    test('should work with status only (no message)', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      const statusOnlyData = {
        status: 'REJECTED',
      }
      mockParseRequestBody.mockResolvedValue(statusOnlyData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockResolvedValue(mockUpdatedApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockUpdatedApplication, 200) as any
      )

      const request = createMockRequest(statusOnlyData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: 'REJECTED',
          message: undefined,
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should work with message only (no status)', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      const messageOnlyData = {
        message: 'Thank you for your interest.',
      }
      mockParseRequestBody.mockResolvedValue(messageOnlyData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockResolvedValue(mockUpdatedApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockUpdatedApplication, 200) as any
      )

      const request = createMockRequest(messageOnlyData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: undefined,
          message: 'Thank you for your interest.',
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should handle database errors during application lookup', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should handle database errors during application update', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should include project owner info in application lookup', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockResolvedValue(mockUpdatedApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockUpdatedApplication, 200) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        include: {
          project: {
            include: {
              owner: true,
              organization: true,
            },
          },
        },
      })

      expect(response.status).toBe(200)
    })

    test('should validate empty message', async () => {
      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      const emptyMessageData = {
        status: 'ACCEPTED',
        message: '',
      }
      mockParseRequestBody.mockResolvedValue(emptyMessageData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockResolvedValue(mockUpdatedApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockUpdatedApplication, 200) as any
      )

      const request = createMockRequest(emptyMessageData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: 'ACCEPTED',
          message: '',
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should set respondedAt timestamp', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

      mockRequireAuth.mockResolvedValue(mockProjectOwner as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockFindUnique.mockResolvedValue(mockApplication as any)
      mockUpdate.mockResolvedValue(mockUpdatedApplication as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockUpdatedApplication, 200) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: Promise.resolve(mockParams) })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: validUpdateData.status,
          message: validUpdateData.message,
          respondedAt: mockDate,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      jest.restoreAllMocks()
    })
  })
})