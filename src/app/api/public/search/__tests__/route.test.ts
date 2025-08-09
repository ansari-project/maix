import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { filterPublicData } from '@/lib/public-data-filter'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Mock dependencies
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string }) {
        super(message)
        this.code = code
      }
    },
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {
      constructor(message: string) {
        super(message)
      }
    },
    PrismaClientValidationError: class PrismaClientValidationError extends Error {
      constructor(message: string) {
        super(message)
      }
    }
  }
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/public-data-filter', () => ({
  filterPublicData: jest.fn((data) => data),
}))

const mockFilterPublicData = filterPublicData as jest.MockedFunction<typeof filterPublicData>

describe('/api/public/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return empty results when no query provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/public/search')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        projects: [],
        products: [],
        questions: [],
        total: 0,
      })

      // Should not query database when no search query
      expect(prisma.project.findMany).not.toHaveBeenCalled()
      expect(prisma.product.findMany).not.toHaveBeenCalled()
      expect(prisma.post.findMany).not.toHaveBeenCalled()
    })

    it('should search all content types by default', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Test Project',
          description: 'A project about testing',
          goal: 'Build tests',
          isActive: true,
          visibility: 'PUBLIC',
          owner: { id: 'user-1', name: 'John Doe' },
          _count: { applications: 5 },
        },
      ]

      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Test Product',
          description: 'Product for testing',
          visibility: 'PUBLIC',
          owner: { id: 'user-2', name: 'Jane Smith' },
          _count: { projects: 2 },
        },
      ]

      const mockQuestions = [
        {
          id: 'post-1',
          type: 'QUESTION',
          content: 'How to test this?',
          parentId: null,
          author: { id: 'user-3', name: 'Bob Johnson' },
          _count: { comments: 3, replies: 2 },
        },
      ]

      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects as any)
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce(mockProducts as any)
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce(mockQuestions as any)

      const request = new NextRequest('http://localhost:3000/api/public/search?q=test')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.products).toHaveLength(1)
      expect(data.questions).toHaveLength(1)
      expect(data.total).toBe(3)

      // Verify search filters
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          visibility: 'PUBLIC',
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
            { goal: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
      })

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          visibility: 'PUBLIC',
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { projects: true } },
        },
      })

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: {
          type: 'QUESTION',
          parentId: null,
          content: { contains: 'test', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          author: { select: { id: true, name: true } },
          _count: {
            select: {
              comments: true,
              replies: { where: { type: 'ANSWER' } },
            },
          },
        },
      })

      // Verify public data filtering was applied
      expect(mockFilterPublicData).toHaveBeenCalledTimes(3)
      expect(mockFilterPublicData).toHaveBeenCalledWith(mockProjects, 'project')
      expect(mockFilterPublicData).toHaveBeenCalledWith(mockProducts, 'product')
      expect(mockFilterPublicData).toHaveBeenCalledWith(mockQuestions, 'post')
    })

    it('should search only projects when type=projects', async () => {
      const mockProjects = [{ id: 'proj-1', name: 'Test Project' }]
      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects as any)

      const request = new NextRequest('http://localhost:3000/api/public/search?q=test&type=projects')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.products).toEqual([])
      expect(data.questions).toEqual([])

      expect(prisma.project.findMany).toHaveBeenCalled()
      expect(prisma.product.findMany).not.toHaveBeenCalled()
      expect(prisma.post.findMany).not.toHaveBeenCalled()
    })

    it('should search only products when type=products', async () => {
      const mockProducts = [{ id: 'prod-1', name: 'Test Product' }]
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce(mockProducts as any)

      const request = new NextRequest('http://localhost:3000/api/public/search?q=test&type=products')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toEqual([])
      expect(data.products).toHaveLength(1)
      expect(data.questions).toEqual([])

      expect(prisma.project.findMany).not.toHaveBeenCalled()
      expect(prisma.product.findMany).toHaveBeenCalled()
      expect(prisma.post.findMany).not.toHaveBeenCalled()
    })

    it('should search only questions when type=questions', async () => {
      const mockQuestions = [{ id: 'post-1', type: 'QUESTION', content: 'Test question' }]
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce(mockQuestions as any)

      const request = new NextRequest('http://localhost:3000/api/public/search?q=test&type=questions')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toEqual([])
      expect(data.products).toEqual([])
      expect(data.questions).toHaveLength(1)

      expect(prisma.project.findMany).not.toHaveBeenCalled()
      expect(prisma.product.findMany).not.toHaveBeenCalled()
      expect(prisma.post.findMany).toHaveBeenCalled()
    })

    it('should handle case-insensitive search', async () => {
      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/public/search?q=TeSt')
      
      await GET(request)

      // Verify case-insensitive search was used
      const projectCall = mockPrisma.project.findMany.mock.calls[0][0]
      expect(projectCall.where.OR[0].name).toEqual({
        contains: 'TeSt',
        mode: 'insensitive',
      })
    })

    it('should limit results to 20 per type', async () => {
      const request = new NextRequest('http://localhost:3000/api/public/search?q=popular')
      
      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce([])

      await GET(request)

      // Verify take: 20 was used for all queries
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      )
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      )
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      )
    })

    it('should only return public and active content', async () => {
      const request = new NextRequest('http://localhost:3000/api/public/search?q=test')
      
      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce([])

      await GET(request)

      // Verify public/active filters
      const projectCall = mockPrisma.project.findMany.mock.calls[0][0]
      expect(projectCall.where.isActive).toBe(true)
      expect(projectCall.where.visibility).toBe('PUBLIC')

      const productCall = mockPrisma.product.findMany.mock.calls[0][0]
      expect(productCall.where.visibility).toBe('PUBLIC')

      const postCall = mockPrisma.post.findMany.mock.calls[0][0]
      expect(postCall.where.type).toBe('QUESTION')
      expect(postCall.where.parentId).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.project.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/public/search?q=test')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('Internal server error')
    })

    it('should handle special characters in search query', async () => {
      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/public/search?q=test%20%26%20special%20chars!')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify the decoded query was used
      const projectCall = mockPrisma.project.findMany.mock.calls[0][0]
      expect(projectCall.where.OR[0].name.contains).toBe('test & special chars!')
    })

    it('should handle empty search results', async () => {
      ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
      ;(prisma.post.findMany as jest.Mock).mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/public/search?q=nonexistent')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        projects: [],
        products: [],
        questions: [],
        total: 0,
      })
    })
  })
})