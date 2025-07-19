import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

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
    user: mockUser,
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
    it('should return a visible post with replies and comments', async () => {
      const mockPostWithReplies = {
        ...mockPost,
        replies: [
          {
            id: 'answer-123',
            type: 'ANSWER',
            content: 'You can use OpenAI API',
            status: 'VISIBLE',
            author: { id: 'user-456', name: 'Jane Expert' },
            _count: { comments: 1 }
          }
        ],
        comments: [
          {
            id: 'comment-123',
            content: 'Great question!',
            status: 'VISIBLE',
            author: { id: 'user-789', name: 'Bob Commenter' }
          }
        ]
      }

      mockPrisma.post.findUnique.mockResolvedValue(mockPostWithReplies)

      const request = new NextRequest('http://localhost:3000/api/posts/post-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('post-123')
      expect(data.replies).toHaveLength(1)
      expect(data.comments).toHaveLength(1)
      
      // Verify content moderation filters
      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { 
          id: 'post-123',
          status: 'VISIBLE'
        },
        include: expect.objectContaining({
          replies: expect.objectContaining({
            where: { status: 'VISIBLE' }
          }),
          comments: expect.objectContaining({
            where: expect.objectContaining({
              status: 'VISIBLE'
            })
          })
        })
      })
    })

    it('should return 404 for non-existent post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/posts/non-existent')
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

    it('should return 404 for hidden post', async () => {
      const hiddenPost = { ...mockPost, status: 'HIDDEN' }
      mockPrisma.post.findUnique.mockResolvedValue(null) // Hidden posts are filtered out

      const request = new NextRequest('http://localhost:3000/api/posts/hidden-post')
      const response = await GET(request, { params: Promise.resolve({ id: 'hidden-post' }) })

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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.post.update.mockResolvedValue(updatedPost)

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
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: { content: 'Updated: How do I implement AI?' },
        include: expect.any(Object)
      })
    })

    it('should reject update by non-author', async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(otherUserPost)

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
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(postWithNoReplies)
      mockPrisma.post.delete.mockResolvedValue(mockPost)

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Post deleted successfully')
      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-123' }
      })
    })

    it('should prevent deletion of question with answers', async () => {
      const questionWithAnswers = { 
        ...mockPost, 
        type: 'QUESTION',
        _count: { replies: 2 } 
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(questionWithAnswers)

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.delete).not.toHaveBeenCalled()
    })

    it('should prevent deletion of discussion posts', async () => {
      const discussionPost = { 
        ...mockPost, 
        type: 'PROJECT_DISCUSSION'
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(discussionPost)

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.delete).not.toHaveBeenCalled()
    })

    it('should reject deletion by non-author', async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(otherUserPost)

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(response.status).toBe(403)
      expect(mockPrisma.post.delete).not.toHaveBeenCalled()
    })
  })
})