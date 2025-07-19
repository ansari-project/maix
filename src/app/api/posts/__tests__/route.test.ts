import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('@/lib/logger')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/posts', () => {
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

  const mockProject = {
    id: 'project-123',
    title: 'Test Project',
    authorId: 'user-123',
  }

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    authorId: 'user-123',
  }

  describe('POST /api/posts', () => {
    it('should create a question post successfully', async () => {
      const mockPost = {
        id: 'post-123',
        type: 'QUESTION',
        content: 'How do I implement AI in my project?',
        authorId: 'user-123',
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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.create.mockResolvedValue(mockPost)

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
          authorId: 'user-123',
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
        authorId: 'user-123',
        projectId: 'project-123',
        productId: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        project: mockProject,
        product: null,
        _count: { replies: 0, comments: 0 }
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
      mockPrisma.post.create.mockResolvedValue(mockPost)

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'PROJECT_UPDATE',
          content: 'Project milestone completed',
          projectId: 'project-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('PROJECT_UPDATE')
      expect(data.projectId).toBe('project-123')
    })

    it('should create an answer to a question', async () => {
      const mockQuestion = {
        id: 'question-123',
        type: 'QUESTION',
        content: 'How do I implement AI?',
        authorId: 'user-456',
      }

      const mockAnswer = {
        id: 'answer-123',
        type: 'ANSWER',
        content: 'You can start by using OpenAI API...',
        authorId: 'user-123',
        parentId: 'question-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUser,
        _count: { replies: 0, comments: 0 }
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(mockQuestion)
      mockPrisma.post.create.mockResolvedValue(mockAnswer)

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ANSWER',
          content: 'You can start by using OpenAI API...',
          parentId: 'question-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('ANSWER')
      expect(data.parentId).toBe('question-123')
    })

    it('should reject project update without projectId', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

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
        id: 'update-123',
        type: 'PROJECT_UPDATE',
        content: 'Project update',
        authorId: 'user-456',
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(mockUpdate)

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ANSWER',
          content: 'This should fail',
          parentId: 'update-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

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
    it('should return posts filtered by VISIBLE status', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          type: 'QUESTION',
          content: 'Question 1',
          status: 'VISIBLE',
          author: mockUser,
          _count: { replies: 2, comments: 1 }
        },
        {
          id: 'post-2',
          type: 'PROJECT_UPDATE',
          content: 'Update 1',
          status: 'VISIBLE',
          author: mockUser,
          _count: { replies: 0, comments: 3 }
        }
      ]

      mockPrisma.post.findMany.mockResolvedValue(mockPosts)
      mockPrisma.post.count.mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/posts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.posts).toHaveLength(2)
      expect(data.total).toBe(2)
      
      // Verify content moderation filter
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'VISIBLE'
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
            type: { in: ['QUESTION'] },
            status: 'VISIBLE'
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
  })
})