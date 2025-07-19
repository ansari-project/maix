import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
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
    },
    product: {
      findFirst: jest.fn(),
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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      mockPrisma.post.create.mockResolvedValue(mockPost)

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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue(mockQuestion)
      mockPrisma.post.create.mockResolvedValue(mockAnswer)

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
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

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

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue(mockUpdate)

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
  })
})