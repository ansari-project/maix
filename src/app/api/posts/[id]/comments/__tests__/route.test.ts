import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma')
jest.mock('@/lib/logger')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

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
    user: mockUser,
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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.create.mockResolvedValue(mockComment)

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
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(null)

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
      mockGetServerSession.mockResolvedValue(null)

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
      mockGetServerSession.mockResolvedValue(mockSession)

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
    it('should return visible comments for a post', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'First comment',
          status: 'VISIBLE',
          parentId: null,
          createdAt: new Date('2024-01-01'),
          author: { id: 'user-1', name: 'Alice', image: null }
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          status: 'VISIBLE',
          parentId: null,
          createdAt: new Date('2024-01-02'),
          author: { id: 'user-2', name: 'Bob', image: null }
        }
      ]

      mockPrisma.comment.findMany.mockResolvedValue(mockComments)
      mockPrisma.comment.count.mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments')
      const response = await GET(request, { params: Promise.resolve({ id: 'post-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comments).toHaveLength(2)
      expect(data.pagination.total).toBe(2)

      // Verify content moderation filter
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          postId: 'post-123',
          parentId: null,
          status: 'VISIBLE'
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
      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments?take=10&skip=20')
      await GET(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20
        })
      )
    })

    it('should filter out hidden comments', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts/post-123/comments')
      await GET(request, { params: Promise.resolve({ id: 'post-123' }) })

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'VISIBLE'
          })
        })
      )
    })

    it('should only return top-level comments (no nested replies)', async () => {
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