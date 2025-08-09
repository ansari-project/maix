import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { POST } from '../route'
import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
import { 
  mockRequireAuth, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse
} from '@/lib/test-utils'
import { handleApiError, successResponse, parseRequestBody } from '@/lib/api-utils'

const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>

describe('/api/questions/[id]/resolve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'ckl1234567890abcdefghijk1',
    email: 'john@example.com',
    name: 'John Doe',
  }

  const mockSession = {
    user: {
      email: mockUser.email,
      name: mockUser.name,
    },
  }

  const mockQuestion = {
    id: 'ckl1234567890abcdefghijk2',
    type: 'QUESTION',
    content: 'How do I implement AI?',
    authorId: 'ckl1234567890abcdefghijk1', // Same as session user
    bestAnswerId: null,
  }

  const mockAnswer = {
    id: 'ckl1234567890abcdefghijk3',
    type: 'ANSWER',
    content: 'You can use OpenAI API...',
    authorId: 'ckl1234567890abcdefghijk4',
    parentId: 'ckl1234567890abcdefghijk2',
  }

  describe('POST /api/questions/[id]/resolve', () => {
    it('should mark an answer as best answer by question author', async () => {
      const updatedQuestion = {
        ...mockQuestion,
        isResolved: true,
        bestAnswerId: 'ckl1234567890abcdefghijk3',
        bestAnswer: mockAnswer
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk3' })
      mockPrisma.post.findUnique.mockResolvedValueOnce({
        ...mockQuestion,
        replies: [mockAnswer]
      })
      mockPrisma.post.update.mockResolvedValue(updatedQuestion)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(updatedQuestion, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bestAnswerId).toBe('ckl1234567890abcdefghijk3')
      expect(data.isResolved).toBe(true)

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'ckl1234567890abcdefghijk2' },
        data: { 
          isResolved: true,
          bestAnswerId: 'ckl1234567890abcdefghijk3' 
        },
        include: {
          bestAnswer: {
            include: {
              author: {
                select: { id: true, name: true, image: true }
              }
            }
          }
        }
      })
    })

    it('should reject if user is not the question author', async () => {
      const otherUserQuestion = {
        ...mockQuestion,
        authorId: 'ckl1234567890abcdefghijk5' // Different from session user
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk3' })
      mockPrisma.post.findUnique.mockResolvedValue({
        ...otherUserQuestion,
        replies: [mockAnswer]
      })
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Only question author can mark best answer', 403) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(403)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if question does not exist', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk3' })
      mockPrisma.post.findUnique.mockResolvedValue(null)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Question not found', 404) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/non-existent/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if post is not a question', async () => {
      const updatePost = {
        ...mockQuestion,
        type: 'PROJECT_UPDATE'
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk3' })
      mockPrisma.post.findUnique.mockResolvedValue({
        ...updatePost,
        replies: [mockAnswer]
      })
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Can only resolve questions', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/update-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'update-123' }) })

      expect(response.status).toBe(400)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if answer does not exist', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk3' })
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockQuestion,
        replies: [] // No answers found
      })
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Answer not found', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'non-existent-answer'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(400)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if answer is not an answer to this question', async () => {
      const wrongAnswer = {
        ...mockAnswer,
        parentId: 'ckl1234567890abcdefghijk6' // Answer to different question
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk3' })
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockQuestion,
        replies: [] // Answer with wrong parentId not found in replies
      })
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Answer is not for this question', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(400)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(401)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should validate request body', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Best Answer ID is required')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Best Answer ID is required', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          // Missing bestAnswerId
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(400)
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should allow updating best answer to a different answer', async () => {
      const questionWithBestAnswer = {
        ...mockQuestion,
        bestAnswerId: 'ckl1234567890abcdefghijk7'
      }

      const newAnswer = {
        id: 'ckl1234567890abcdefghijk8',
        type: 'ANSWER',
        parentId: 'ckl1234567890abcdefghijk2'
      }

      const updatedQuestion = {
        ...questionWithBestAnswer,
        bestAnswerId: 'ckl1234567890abcdefghijk8'
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({ bestAnswerId: 'ckl1234567890abcdefghijk8' })
      mockPrisma.post.findUnique.mockResolvedValue({
        ...questionWithBestAnswer,
        replies: [newAnswer]
      })
      mockPrisma.post.update.mockResolvedValue(updatedQuestion)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(updatedQuestion, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk8'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(200)
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'ckl1234567890abcdefghijk2' },
        data: { 
          isResolved: true,
          bestAnswerId: 'ckl1234567890abcdefghijk8' 
        },
        include: expect.any(Object)
      })
    })
  })
})