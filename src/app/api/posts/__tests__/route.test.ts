import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/logger')

import { GET, POST } from '../route'
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

describe('/api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'ckl1234567890abcdefghijkm',
    email: 'john@example.com',
    name: 'John Doe',
  }

  const mockSession = {
    user: {
      email: mockUser.email,
      name: mockUser.name,
    },
  }

  const mockProject = {
    id: 'ckl1234567890abcdefghijkl',
    title: 'Test Project',
    ownerId: 'ckl1234567890abcdefghijkm',
  }

  const mockProduct = {
    id: 'ckl1234567890abcdefghijkn',
    name: 'Test Product',
    ownerId: 'ckl1234567890abcdefghijkm',
  }

  describe('POST /api/posts', () => {
    it('should create a question post successfully', async () => {
      const mockPost = {
        id: 'post-123',
        type: 'QUESTION',
        content: 'How do I implement AI in my project?',
        authorId: 'ckl1234567890abcdefghijkm',
        projectId: null,
        productId: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        project: null,
        product: null,
        _count: { replies: 0, comments: 0 }
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        type: 'QUESTION',
        content: 'How do I implement AI in my project?'
      })
      mockPrisma.post.create.mockResolvedValue(mockPost as any)
      mockPrisma.user.findMany.mockResolvedValue([]) // No other users to notify
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockPost, 201) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'QUESTION',
          content: 'How do I implement AI in my project?'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('QUESTION')
      expect(data.content).toBe('How do I implement AI in my project?')
      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: {
          type: 'QUESTION',
          content: 'How do I implement AI in my project?',
          authorId: 'ckl1234567890abcdefghijkm',
          projectId: undefined,
          productId: undefined,
          parentId: undefined,
        },
        include: expect.any(Object)
      })
    })

    it('should create a project update post successfully', async () => {
      const mockPost = {
        id: 'post-124',
        type: 'PROJECT_UPDATE',
        content: 'Project milestone completed',
        authorId: 'ckl1234567890abcdefghijkm',
        projectId: 'ckl1234567890abcdefghijkl',
        productId: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        project: mockProject,
        product: null,
        _count: { replies: 0, comments: 0 }
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Project milestone completed',
        projectId: 'ckl1234567890abcdefghijkl'
      })
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      mockPrisma.post.create.mockResolvedValue(mockPost)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockPost, 201) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'PROJECT_UPDATE',
          content: 'Project milestone completed',
          projectId: 'ckl1234567890abcdefghijkl'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()
      
      if (response.status !== 201) {
        console.error('Project update test error:', data)
      }

      expect(response.status).toBe(201)
      expect(data.type).toBe('PROJECT_UPDATE')
      expect(data.projectId).toBe('ckl1234567890abcdefghijkl')
    })

    it('should create an answer to a question', async () => {
      const mockQuestion = {
        id: 'ckl1234567890abcdefghijko',
        type: 'QUESTION',
        content: 'How do I implement AI?',
        authorId: 'ckl1234567890abcdefghijkp',
      }

      const mockAnswer = {
        id: 'ckl1234567890abcdefghijkq',
        type: 'ANSWER',
        content: 'You can start by using OpenAI API...',
        authorId: 'ckl1234567890abcdefghijkm',
        parentId: 'ckl1234567890abcdefghijko',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        _count: { replies: 0, comments: 0 }
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        type: 'ANSWER',
        content: 'You can start by using OpenAI API...',
        parentId: 'ckl1234567890abcdefghijko'
      })
      mockPrisma.post.findUnique.mockResolvedValue(mockQuestion)
      mockPrisma.post.create.mockResolvedValue(mockAnswer)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockAnswer, 201) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ANSWER',
          content: 'You can start by using OpenAI API...',
          parentId: 'ckl1234567890abcdefghijko'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('ANSWER')
      expect(data.parentId).toBe('ckl1234567890abcdefghijko')
    })

    it('should reject project update without projectId', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Project ID is required for project updates')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Project ID is required for project updates', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'PROJECT_UPDATE',
          content: 'Project milestone completed'
          // Missing projectId
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should reject answer to non-question post', async () => {
      const mockUpdate = {
        id: 'ckl1234567890abcdefghijkr',
        type: 'PROJECT_UPDATE',
        content: 'Project update',
        authorId: 'ckl1234567890abcdefghijkp',
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        type: 'ANSWER',
        content: 'This should fail',
        parentId: 'ckl1234567890abcdefghijkr'
      })
      mockPrisma.post.findUnique.mockResolvedValue(mockUpdate)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Can only answer questions', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ANSWER',
          content: 'This should fail',
          parentId: 'ckl1234567890abcdefghijkr'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should allow project owner to update project status', async () => {
      const mockProject = {
        id: 'proj-123',
        name: 'Test Project',
        ownerId: mockUser.id,
        status: 'IN_PROGRESS'
      }

      const mockProjectUpdate = {
        id: 'post-123',
        type: 'PROJECT_UPDATE',
        content: 'Major milestone completed',
        projectId: 'proj-123',
        authorId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        project: { ...mockProject, status: 'COMPLETED' },
        _count: { replies: 0, comments: 0 }
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Major milestone completed',
        projectId: 'proj-123',
        projectStatus: 'COMPLETED'
      })
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      
      // Mock the transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          post: {
            create: jest.fn().mockResolvedValue(mockProjectUpdate)
          },
          project: {
            update: jest.fn().mockResolvedValue({ ...mockProject, status: 'COMPLETED' })
          }
        }
        return callback(txMock)
      })
      
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockProjectUpdate, 201) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'PROJECT_UPDATE',
          content: 'Major milestone completed',
          projectId: 'proj-123',
          projectStatus: 'COMPLETED'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('PROJECT_UPDATE')
      expect(data.project.status).toBe('COMPLETED')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should reject project status update from non-owner', async () => {
      const mockProject = {
        id: 'proj-123',
        name: 'Test Project',
        ownerId: 'different-user-id',
        status: 'IN_PROGRESS'
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Trying to update status',
        projectId: 'proj-123',
        projectStatus: 'COMPLETED'
      })
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Only project owners can update project status', 403) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'PROJECT_UPDATE',
          content: 'Trying to update status',
          projectId: 'proj-123',
          projectStatus: 'COMPLETED'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'QUESTION',
          content: 'Test question'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockPrisma.post.create).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/posts', () => {
    it('should return posts', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          type: 'QUESTION',
          content: 'Question 1',
          author: mockUser,
          _count: { replies: 2, comments: 1 }
        },
        {
          id: 'post-2',
          type: 'PROJECT_UPDATE',
          content: 'Update 1',
          author: mockUser,
          _count: { replies: 0, comments: 3 }
        }
      ]

      mockPrisma.post.findMany.mockResolvedValue(mockPosts)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockPosts, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      
      // Verify query structure
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: {
              in: ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE']
            }
          })
        })
      )
    })

    it('should filter by post type', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?type=QUESTION')
      await GET(request)

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'QUESTION'
          })
        })
      )
    })

    it('should handle pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?take=10&skip=20')
      await GET(request)

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20
        })
      )
    })

    it('should fetch answers for a question with parentId and type=ANSWER', async () => {
      const mockAnswers = [
        {
          id: 'answer-1',
          type: 'ANSWER',
          content: 'This is answer 1',
          parentId: 'question-1',
          author: mockUser,
          _count: { replies: 0, comments: 2 }
        },
        {
          id: 'answer-2',
          type: 'ANSWER',
          content: 'This is answer 2',
          parentId: 'question-1',
          author: mockUser,
          _count: { replies: 0, comments: 1 }
        }
      ]

      mockPrisma.post.findMany.mockResolvedValue(mockAnswers)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockAnswers, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts?parentId=question-1&type=ANSWER')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      
      // Verify query structure for answers
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            parentId: 'question-1',
            type: 'ANSWER'
          }
        })
      )
    })

    it('should fetch replies with just parentId (no type filter)', async () => {
      const mockReplies = [
        {
          id: 'answer-1',
          type: 'ANSWER',
          content: 'This is an answer',
          parentId: 'question-1',
          author: mockUser,
          _count: { replies: 0, comments: 0 }
        }
      ]

      mockPrisma.post.findMany.mockResolvedValue(mockReplies)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockReplies, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts?parentId=question-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      
      // Verify query structure - should only have parentId, no type restriction
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            parentId: 'question-1'
          }
        })
      )
    })
  })
})