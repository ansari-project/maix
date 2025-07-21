import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn()
    },
    product: {
      findMany: jest.fn()
    },
    post: {
      findMany: jest.fn()
    }
  }
}))

// Mock logger to avoid console output in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    apiError: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

// Mock Prisma to avoid instanceof checks
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {},
    PrismaClientRustPanicError: class PrismaClientRustPanicError extends Error {},
    PrismaClientInitializationError: class PrismaClientInitializationError extends Error {},
    PrismaClientValidationError: class PrismaClientValidationError extends Error {}
  }
}))

describe('/api/public/feed', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('GET', () => {
    it('should return public feed items', async () => {
      const mockProjects = [
        {
          id: 'proj1',
          name: 'Test Project',
          description: 'A test project',
          helpType: 'MVP',
          createdAt: new Date('2024-01-01'),
          owner: { id: 'user1', name: 'John Doe' }
        }
      ]

      const mockProducts = [
        {
          id: 'prod1',
          name: 'Test Product',
          description: 'A test product',
          createdAt: new Date('2024-01-02'),
          owner: { id: 'user2', name: 'Jane Smith' },
          _count: { projects: 2 }
        }
      ]

      const mockQuestions = [
        {
          id: 'q1',
          type: 'QUESTION',
          content: 'How to implement authentication?',
          createdAt: new Date('2024-01-03'),
          author: { id: 'user3', name: 'Bob Johnson' }
        }
      ]

      const mockAnswers = [
        {
          id: 'a1',
          type: 'ANSWER',
          content: 'You can use NextAuth.js',
          createdAt: new Date('2024-01-04'),
          author: { id: 'user4', name: 'Alice Brown' },
          parent: {
            id: 'q1',
            content: 'How to implement authentication?',
            author: { id: 'user3', name: 'Bob Johnson' }
          },
          parentId: 'q1'
        }
      ]

      const mockProductUpdates = [
        {
          id: 'pu1',
          type: 'PRODUCT_UPDATE',
          content: 'Released version 2.0',
          createdAt: new Date('2024-01-05'),
          author: { id: 'user2', name: 'Jane Smith' },
          product: { id: 'prod1', name: 'Test Product' },
          productId: 'prod1'
        }
      ]

      ;(prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects)
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts)
      ;(prisma.post.findMany as jest.Mock).mockImplementation((args) => {
        if (args?.where?.type === 'QUESTION') {
          return Promise.resolve(mockQuestions)
        } else if (args?.where?.type === 'ANSWER') {
          return Promise.resolve(mockAnswers)
        } else if (args?.where?.type === 'PRODUCT_UPDATE') {
          return Promise.resolve(mockProductUpdates)
        }
        return Promise.resolve([])
      })

      const request = new NextRequest('http://localhost:3000/api/public/feed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(5)
      
      // Check that items are sorted by timestamp (newest first)
      const timestamps = data.items.map((item: any) => new Date(item.timestamp).getTime())
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))

      // Verify data filtering (no sensitive info)
      data.items.forEach((item: any) => {
        expect(item.user).toHaveProperty('id')
        expect(item.user).toHaveProperty('name')
        expect(item.user).not.toHaveProperty('email')
      })

      // Check specific item types
      const projectItem = data.items.find((item: any) => item.type === 'project_created')
      expect(projectItem).toBeDefined()
      expect(projectItem.data).toHaveProperty('helpType')
      
      const productItem = data.items.find((item: any) => item.type === 'product_created')
      expect(productItem).toBeDefined()
      expect(productItem.data._count).toHaveProperty('projects')
    })

    it('should handle empty results', async () => {
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/public/feed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(0)
    })

    it('should limit results to 20 items', async () => {
      const mockProjects = Array(25).fill(null).map((_, i) => ({
        id: `proj${i}`,
        name: `Project ${i}`,
        description: 'Description',
        helpType: 'MVP',
        createdAt: new Date(Date.now() - i * 1000),
        owner: { id: `user${i}`, name: `User ${i}` }
      }))

      ;(prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects)
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/public/feed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(20)
    })

    it('should filter out answers without parent information', async () => {
      const mockAnswers = [
        {
          id: 'a1',
          type: 'ANSWER',
          content: 'Valid answer',
          createdAt: new Date(),
          author: { id: 'user1', name: 'User 1' },
          parent: {
            id: 'q1',
            content: 'Question?',
            author: { id: 'user2', name: 'User 2' }
          },
          parentId: 'q1'
        },
        {
          id: 'a2',
          type: 'ANSWER',
          content: 'Invalid answer',
          createdAt: new Date(),
          author: null,
          parent: null,
          parentId: 'q2'
        }
      ]

      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.findMany as jest.Mock).mockImplementation((args) => {
        if (args?.where?.type === 'ANSWER') {
          return Promise.resolve(mockAnswers)
        }
        return Promise.resolve([])
      })

      const request = new NextRequest('http://localhost:3000/api/public/feed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(1)
      expect(data.items[0].id).toBe('a1')
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.project.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/public/feed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('Internal server error')
    })
  })
})