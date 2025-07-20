import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

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
jest.mock('@/lib/logger')
jest.mock('next-auth')


describe('/api/posts/[id]/comments', () => {
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
      email: mockUser.email,
      name: mockUser.name,
    },
  }

  const mockPost = {
    id: 'post-123',
    type: 'QUESTION',
    content: 'How do I implement AI?',
    authorId: 'user-456',
  }

  describe('POST /api/posts/[id]/comments', () => {
    it('should create a comment on a post', async () => {
      const mockComment = {
        id: 'comment-123',
        content: 'Great question! I had the same issue.',
        authorId: 'user-123',
        postId: 'post-123',
        parentId: null,
        status: 'VISIBLE',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-123',
          name: 'John Doe',
          image: null
        }
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        content: 'Great question! I had the same issue.'
      })
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.create.mockResolvedValue(mockComment)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockComment, 201) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Great question! I had the same issue.'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.content).toBe('Great question! I had the same issue.')
      expect(data.postId).toBe('post-123')
      expect(data.authorId).toBe('user-123')

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Great question! I had the same issue.',
          authorId: 'user-123',
          postId: 'post-123',
        },
        include: {
          author: {
            select: { id: true, name: true, image: true }
          }
        }
      })
    })

    it('should reject comment on non-existent post', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        content: 'This should fail'
      })
      mockPrisma.post.findUnique.mockResolvedValue(null)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Post not found', 404) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/non-existent/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: 'This should fail'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
      expect(mockPrisma.comment.create).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Unauthorized comment'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(401)
      expect(mockPrisma.comment.create).not.toHaveBeenCalled()
    })

    it('should validate comment content', async () => {
      mockRequireAuth.mockResolvedValue(mockUser as any)
      const validationError = new Error('Comment content is required')
      validationError.name = 'ZodError'
      mockParseRequestBody.mockRejectedValue(validationError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Comment content is required', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: '' // Empty content should fail
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.comment.create).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/posts/[id]/comments', () => {
    it('should return comments for a post', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'First comment',
          parentId: null,
          createdAt: new Date('2024-01-01'),
          author: { id: 'user-1', name: 'Alice', image: null }
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          parentId: null,
          createdAt: new Date('2024-01-02'),
          author: { id: 'user-2', name: 'Bob', image: null }
        }
      ]

      mockPrisma.comment.findMany.mockResolvedValue(mockComments)
      mockPrisma.comment.count.mockResolvedValue(2)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse({
          comments: mockComments,
          pagination: { total: 2, take: 50, skip: 0 }
        }, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments')
      const response = await GET(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comments).toHaveLength(2)
      expect(data.pagination.total).toBe(2)

      // Verify query structure
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          postId: 'post-123',
          parentId: null
        },
        take: 50,
        skip: 0,
        include: {
          author: {
            select: { id: true, name: true, image: true }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    })

    it('should handle pagination parameters', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([])
      mockPrisma.comment.count.mockResolvedValue(0)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse({
          comments: [],
          pagination: { total: 0, take: 10, skip: 20 }
        }, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments?take=10&skip=20')
      await GET(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20
        })
      )
    })

    it('should include author information', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([])
      mockPrisma.comment.count.mockResolvedValue(0)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse({
          comments: [],
          pagination: { total: 0, take: 50, skip: 0 }
        }, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments')
      await GET(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            author: {
              select: { id: true, name: true, image: true }
            }
          })
        })
      )
    })

    it('should only return top-level comments (no nested replies)', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([])
      mockPrisma.comment.count.mockResolvedValue(0)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse({
          comments: [],
          pagination: { total: 0, take: 50, skip: 0 }
        }, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments')
      await GET(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null
          })
        })
      )
    })
  })
})