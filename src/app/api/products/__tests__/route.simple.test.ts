import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock all dependencies at the top
jest.mock('next-auth/next')
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, code: string) {
        super(message)
        this.code = code
        this.name = 'PrismaClientKnownRequestError'
      }
    },
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'PrismaClientUnknownRequestError'
      }
    },
    PrismaClientValidationError: class PrismaClientValidationError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'PrismaClientValidationError'
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
    user: {
      findUnique: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Import mocked functions
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/products - Simplified Tests', () => {
  const mockUser = createTestUser()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  describe('GET', () => {
    it('should return only public products when not authenticated', async () => {
      mockSession(null) // No authentication

      const mockProducts = [
        {
          id: 'product-1',
          name: 'Public Product',
          visibility: 'PUBLIC',
        },
      ]

      mockPrisma.product.findMany.mockResolvedValueOnce(mockProducts as any)

      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      
      // Verify query filtered for public products only
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visibility: 'PUBLIC',
          },
        })
      )
    })

    it('should return public + owned products when authenticated', async () => {
      mockSession(mockUser) // Authenticated

      const mockProducts = [
        { id: 'product-1', visibility: 'PUBLIC' },
        { id: 'product-2', visibility: 'PRIVATE', ownerId: mockUser.id },
      ]

      mockPrisma.product.findMany.mockResolvedValueOnce(mockProducts as any)

      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      
      // Verify query included user's products
      const queryCall = mockPrisma.product.findMany.mock.calls[0][0]
      expect(queryCall.where.OR).toBeDefined()
      expect(queryCall.where.OR).toContainEqual({ visibility: 'PUBLIC' })
      expect(queryCall.where.OR).toContainEqual({ members: { some: { userId: mockUser.id } } })
    })
  })

  describe('POST', () => {
    it('should create a product with valid data', async () => {
      mockSession(mockUser) // Authenticated

      const productData = {
        name: 'New Product',
        description: 'A great new product for testing',
      }

      const createdProduct = {
        id: 'new-product-id',
        ...productData,
        ownerId: mockUser.id,
        organizationId: null,
      }

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        // Mock the transaction callback
        const tx = {
          product: {
            create: jest.fn().mockResolvedValueOnce(createdProduct),
            findUnique: jest.fn().mockResolvedValueOnce(createdProduct),
          },
          productMember: {
            create: jest.fn(),
          },
          post: {
            create: jest.fn().mockResolvedValueOnce({}),
          },
        }
        return callback(tx as any)
      })

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/products',
        body: productData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(productData.name)
      expect(data.ownerId).toBe(mockUser.id)
    })

    it('should validate required fields', async () => {
      mockSession(mockUser) // Authenticated

      const invalidData = {
        name: '', // Empty name should fail validation
        description: 'Test',
      }

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/products',
        body: invalidData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed') // Updated to match apiHandler error format
    })
  })
})