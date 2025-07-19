import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { GET, PUT } from '../route'
import { prisma } from '@/lib/prisma'
import { 
  mockRequireAuth, 
  mockAuthenticatedUser, 
  mockAuthenticationFailure, 
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
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>

describe('/api/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProfileUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Software engineer',
    specialty: 'AI',
    experienceLevel: 'SENIOR',
    skills: ['React', 'Node.js'],
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    githubUrl: 'https://github.com/johndoe',
    portfolioUrl: 'https://johndoe.com',
    availability: 'Available weekends',
    timezone: 'UTC-5',
  }

  describe('GET /api/profile', () => {
    test('should return user profile for authenticated user', async () => {
      mockRequireAuth.mockResolvedValue(mockProfileUser as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockProfileUser, 200) as any
      )

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual(mockProfileUser)
      expect(mockRequireAuth).toHaveBeenCalled()
    })

    test('should return 401 for unauthenticated user', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const response = await GET()
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

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.message).toBe('Authenticated user not found')
    })

    test('should handle database errors', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })
  })

  describe('PUT /api/profile', () => {
    const validUpdateData = {
      name: 'Jane Doe',
      bio: 'Senior Software Engineer',
      specialty: 'FULL_STACK',
      experienceLevel: 'SENIOR',
      skills: ['React', 'Node.js', 'Python'],
      linkedinUrl: 'https://linkedin.com/in/janedoe',
      githubUrl: 'https://github.com/janedoe',
      portfolioUrl: 'https://janedoe.com',
      availability: 'Available weekends',
      timezone: 'UTC-8',
    }

    const createMockRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest
    }

    test('should update user profile with valid data', async () => {
      const updatedUser = { ...mockProfileUser, ...validUpdateData }
      
      mockRequireAuth.mockResolvedValue(mockProfileUser as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockPrisma.user.update.mockResolvedValue(updatedUser as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(updatedUser, 200) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.name).toBe('Jane Doe')
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    test('should return 401 for unauthenticated user', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Not authenticated')
    })

    test('should return 400 for invalid input data', async () => {
      mockRequireAuth.mockResolvedValue(mockProfileUser as any)
      const validationError = new Error('Invalid input')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Invalid input', 400) as any
      )

      const invalidData = {
        name: 'A', // Too short
        bio: 'A'.repeat(1001), // Too long
        specialty: 'INVALID',
        skills: Array(21).fill('skill'), // Too many skills
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    // Helper for validation tests
    const testValidationError = async (invalidData: any, expectedError: string) => {
      mockRequireAuth.mockResolvedValue(mockProfileUser as any)
      const validationError = new Error(expectedError)
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse(expectedError, 400) as any
      )

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe(expectedError)
    }

    test('should validate LinkedIn URL format', async () => {
      const invalidData = { linkedinUrl: 'https://facebook.com/profile' }
      await testValidationError(invalidData, 'Must be a valid LinkedIn profile URL')
    })

    test('should validate GitHub URL format', async () => {
      const invalidData = { githubUrl: 'https://gitlab.com/user' }
      await testValidationError(invalidData, 'Must be a valid GitHub profile URL')
    })

    test('should accept empty strings for URL fields', async () => {
      mockRequireAuth.mockResolvedValue(mockProfileUser as any)
      const dataWithEmptyUrls = {
        ...validUpdateData,
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
      }
      mockParseRequestBody.mockResolvedValue(dataWithEmptyUrls)
      mockPrisma.user.update.mockResolvedValue(mockProfileUser as any)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockProfileUser, 200) as any
      )

      const request = createMockRequest(dataWithEmptyUrls)
      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    test('should validate specialty enum', async () => {
      const invalidData = { specialty: 'INVALID_SPECIALTY' }
      await testValidationError(invalidData, 'Invalid input')
    })

    test('should validate experience level enum', async () => {
      const invalidData = { experienceLevel: 'INVALID_LEVEL' }
      await testValidationError(invalidData, 'Invalid input')
    })

    test('should validate skills array length', async () => {
      const invalidData = { skills: Array(21).fill('skill') }
      await testValidationError(invalidData, 'Maximum 20 skills allowed')
    })

    test('should validate bio length', async () => {
      const invalidData = { bio: 'A'.repeat(1001) }
      await testValidationError(invalidData, 'Bio must be less than 1000 characters long')
    })

    test('should handle database errors', async () => {
      mockRequireAuth.mockResolvedValue(mockProfileUser as any)
      mockParseRequestBody.mockResolvedValue(validUpdateData)
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Internal server error', 500) as any
      )

      const request = createMockRequest(validUpdateData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should validate name format', async () => {
      const invalidData = { name: 'John123' }
      await testValidationError(invalidData, 'Name can only contain letters and spaces')
    })

    test('should validate availability length', async () => {
      const invalidData = { availability: 'A'.repeat(101) }
      await testValidationError(invalidData, 'Availability must be less than 100 characters long')
    })

    test('should validate timezone length', async () => {
      const invalidData = { timezone: 'A'.repeat(51) }
      await testValidationError(invalidData, 'Timezone must be less than 50 characters long')
    })
  })
})