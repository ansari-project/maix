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
      delete: jest.fn(),
    },
  },
}))

import { GET, PATCH, DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { 
  mockRequireAuth, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse
} from '@/lib/test-utils'
import { handleApiError, successResponse, parseRequestBody } from '@/lib/api-utils'

// Cast Prisma methods as jest.Mock for proper typing
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>


describe('/api/posts/[id]', () => {
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
    authorId: 'user-123',
    status: 'VISIBLE',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    project: null,
    product: null,
    bestAnswer: null,
    replies: [],
    comments: [],
    _count: { replies: 0, comments: 0 }
  }

  describe('GET /api/posts/[id]', () => {
    it('should return a post with replies and comments', async () => {
      const mockPostWithReplies = {
        ...mockPost,
        replies: [
          {
            id: 'answer-123',
            type: 'ANSWER',
            content: 'You can use OpenAI API',
            author: { id: 'user-456', name: 'Jane Expert' },
            _count: { comments: 1 }
          }
        ],
        comments: [
          {
            id: 'comment-123',
            content: 'Great question!',
            author: { id: 'user-789', name: 'Bob Commenter' }
          }
        ]
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPostWithReplies)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(mockPostWithReplies, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('post-123')
      expect(data.replies).toHaveLength(1)
      expect(data.comments).toHaveLength(1)
      
      // Verify query structure
      expect(prisma.post.findUnique).toHaveBeenCalledWith({
        where: { 
          id: 'post-123'
        },
        include: expect.objectContaining({
          author: {
            select: { id: true, name: true, image: true }
          },
          replies: expect.objectContaining({
            orderBy: { createdAt: 'asc' }
          }),
          comments: expect.objectContaining({
            where: { parentId: null },
            orderBy: { createdAt: 'asc' }
          })
        })
      })
    })

    it('should return 404 for non-existent post', async () => {
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Post not found', 404) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/non-existent')
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

  })

  describe('PATCH /api/posts/[id]', () => {
    it('should update post content by author', async () => {
      const updatedPost = {
        ...mockPost,
        content: 'Updated: How do I implement AI?',
        updatedAt: new Date()
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        content: 'Updated: How do I implement AI?'
      })
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.post.update as jest.Mock).mockResolvedValue(updatedPost)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse(updatedPost, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Updated: How do I implement AI?'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.content).toBe('Updated: How do I implement AI?')
      expect((prisma.post.update as jest.Mock)).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: { content: 'Updated: How do I implement AI?' },
        include: expect.any(Object)
      })
    })

    it('should reject update by non-author', async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      mockParseRequestBody.mockResolvedValue({
        content: 'Unauthorized update'
      })
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(otherUserPost)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Forbidden', 403) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Unauthorized update'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(403)
      expect((prisma.post.update as jest.Mock)).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      const authError = new Error('Not authenticated')
      authError.name = 'AuthError'
      mockRequireAuth.mockRejectedValue(authError)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Not authenticated', 401) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Updated content'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/posts/[id]', () => {
    it('should delete post by author when no replies exist', async () => {
      const postWithNoReplies = { ...mockPost, _count: { replies: 0 } }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(postWithNoReplies)
      ;(prisma.post.delete as jest.Mock).mockResolvedValue(mockPost)
      mockSuccessResponse.mockReturnValue(
        mockApiSuccessResponse({ message: 'Post deleted successfully' }, 200) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Post deleted successfully')
      expect((prisma.post.delete as jest.Mock)).toHaveBeenCalledWith({
        where: { id: 'post-123' }
      })
    })

    it('should prevent deletion of question with answers', async () => {
      const questionWithAnswers = { 
        ...mockPost, 
        type: 'QUESTION',
        _count: { replies: 2 } 
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(questionWithAnswers)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Cannot delete question with answers', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(400)
      expect((prisma.post.delete as jest.Mock)).not.toHaveBeenCalled()
    })

    it('should prevent deletion of discussion posts', async () => {
      const discussionPost = { 
        ...mockPost, 
        type: 'PROJECT_DISCUSSION'
      }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(discussionPost)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Cannot delete discussion posts', 400) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(400)
      expect((prisma.post.delete as jest.Mock)).not.toHaveBeenCalled()
    })

    it('should reject deletion by non-author', async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' }

      mockRequireAuth.mockResolvedValue(mockUser as any)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(otherUserPost)
      mockHandleApiError.mockReturnValue(
        mockApiErrorResponse('Forbidden', 403) as any
      )

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(403)
      expect((prisma.post.delete as jest.Mock)).not.toHaveBeenCalled()
    })
  })
})