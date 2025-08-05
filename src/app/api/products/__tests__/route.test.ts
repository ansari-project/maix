import { NextRequest } from 'next/server'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock dependencies
jest.mock('next-auth/next')
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
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    productMember: {
      create: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/products', () => {
  const mockUser = createTestUser({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  })

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test product description that is long enough',
    url: 'https://testproduct.com',
    visibility: 'PUBLIC',
    ownerId: mockUser.id,
    organizationId: null,
    owner: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  describe('GET /api/products', () => {
    it('should return only public products when not authenticated', async () => {
      mockSession(null)

      const mockProducts = [
        { ...mockProduct, visibility: 'PUBLIC' }
      ]
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)

      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: 'PUBLIC' }
        })
      )
    })

    it('should return public + owned products when authenticated', async () => {
      mockSession(mockUser)

      const mockProducts = [
        { ...mockProduct, visibility: 'PUBLIC' },
        { ...mockProduct, id: 'product-2', visibility: 'PRIVATE', ownerId: mockUser.id }
      ]
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)

      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      
      const queryCall = mockPrisma.product.findMany.mock.calls[0][0]
      expect(queryCall.where.OR).toBeDefined()
      expect(queryCall.where.OR).toContainEqual({ visibility: 'PUBLIC' })
      expect(queryCall.where.OR).toContainEqual({ members: { some: { userId: mockUser.id } } })
    })

    it('should include organization products for members', async () => {
      mockSession(mockUser)

      const mockProducts = [
        { ...mockProduct, visibility: 'PUBLIC' },
        { ...mockProduct, id: 'product-2', visibility: 'PRIVATE', organizationId: 'clm1234567890abcdefghijk' }
      ]
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)

      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
    })

    it('should handle database errors gracefully', async () => {
      mockSession(null)
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/products', () => {
    const validProductData = {
      name: 'New Product',
      description: 'A great new product with a detailed description',
      url: 'https://newproduct.com'
    }

    it('should create a product with valid data', async () => {
      mockSession(mockUser)

      const createdProduct = {
        ...mockProduct,
        ...validProductData,
        id: 'new-product-id',
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            create: jest.fn().mockResolvedValue(createdProduct),
            findUnique: jest.fn().mockResolvedValue(createdProduct),
          },
          productMember: {
            create: jest.fn(),
          },
          post: {
            create: jest.fn(),
          },
        }
        return callback(tx as any)
      })

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/products', body: validProductData })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(validProductData.name)
      expect(data.ownerId).toBe(mockUser.id)
    })

    it('should return 401 when not authenticated', async () => {
      mockSession(null)

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/products', body: validProductData })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate required fields', async () => {
      mockSession(mockUser)

      const invalidData = {
        name: '', // Empty name
        description: 'Test', // Too short
      }

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/products', body: invalidData })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
    })

    it('should handle invalid URL format', async () => {
      mockSession(mockUser)

      const invalidData = {
        ...validProductData,
        url: 'not-a-valid-url'
      }

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/products', body: invalidData })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
    })

    it('should create organization-owned product when organizationId provided', async () => {
      mockSession(mockUser)

      const productData = {
        ...validProductData,
        organizationId: 'clm1234567890abcdefghijk'
      }

      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        userId: mockUser.id,
        organizationId: 'clm1234567890abcdefghijk',
        role: 'MEMBER'
      } as any)

      const createdProduct = {
        ...mockProduct,
        ...productData,
        id: 'new-product-id',
        ownerId: null,
        organizationId: 'clm1234567890abcdefghijk'
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            create: jest.fn().mockResolvedValue(createdProduct),
            findUnique: jest.fn().mockResolvedValue(createdProduct),
          },
          productMember: {
            create: jest.fn(),
          },
          post: {
            create: jest.fn(),
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue({
              userId: mockUser.id,
              organizationId: 'clm1234567890abcdefghijk',
              role: 'MEMBER'
            }),
          },
        }
        return callback(tx as any)
      })

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/products', body: productData })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.organizationId).toBe('clm1234567890abcdefghijk')
      expect(data.ownerId).toBeNull()
    })

    it('should reject organization product creation if user is not a member', async () => {
      mockSession(mockUser)

      const productData = {
        ...validProductData,
        organizationId: 'clm1234567890abcdefghijk'
      }

      mockPrisma.organizationMember.findUnique.mockResolvedValue(null) // Not a member

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue(null), // Not a member
          },
        }
        try {
          return await callback(tx as any)
        } catch (error) {
          throw error
        }
      })

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/products', body: productData })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})