import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock all dependencies at the top
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth-utils', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/errors')
jest.mock('@prisma/client')

// Import mocked functions
import { getServerSession } from 'next-auth/next'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/products - Simplified Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  }

  describe('GET', () => {
    it('should return only public products when not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const mockProducts = [
        {
          id: 'product-1',
          name: 'Public Product',
          visibility: 'PUBLIC',
        },
      ]

      mockPrisma.product.findMany.mockResolvedValueOnce(mockProducts as any)

      const response = await GET()
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
      mockGetServerSession.mockResolvedValueOnce({
        user: mockUser,
        expires: '2024-01-01',
      })

      const mockProducts = [
        { id: 'product-1', visibility: 'PUBLIC' },
        { id: 'product-2', visibility: 'PRIVATE', ownerId: mockUser.id },
      ]

      mockPrisma.product.findMany.mockResolvedValueOnce(mockProducts as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      
      // Verify query included user's products
      const queryCall = mockPrisma.product.findMany.mock.calls[0][0]
      expect(queryCall.where.OR).toBeDefined()
      expect(queryCall.where.OR).toContainEqual({ visibility: 'PUBLIC' })
      expect(queryCall.where.OR).toContainEqual({ ownerId: mockUser.id })
    })
  })

  describe('POST', () => {
    it('should create a product with valid data', async () => {
      mockRequireAuth.mockResolvedValueOnce(mockUser)

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
          post: {
            create: jest.fn().mockResolvedValueOnce({}),
          },
        }
        return callback(tx as any)
      })

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(productData.name)
      expect(data.ownerId).toBe(mockUser.id)
    })

    it('should validate required fields', async () => {
      mockRequireAuth.mockResolvedValueOnce(mockUser)

      const invalidData = {
        name: '', // Empty name should fail validation
        description: 'Test',
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid input')
    })
  })
})