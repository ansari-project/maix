import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
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
    organization: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/organizations', () => {
  const mockUser = createTestUser({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockSession(null)

      const request = createMockRequest('GET', 'http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user organizations', async () => {
      mockSession(mockUser)

      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Test Org 1',
          slug: 'test-org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [{ role: 'OWNER' }],
          _count: {
            members: 5,
            projects: 2,
            products: 1,
          },
        },
        {
          id: 'org-2',
          name: 'Test Org 2',
          slug: 'test-org-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [{ role: 'MEMBER' }],
          _count: {
            members: 10,
            projects: 4,
            products: 2,
          },
        },
      ]

      mockPrisma.organization.findMany.mockResolvedValueOnce(mockOrganizations as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].userRole).toBe('OWNER')
      expect(data[1].userRole).toBe('MEMBER')
      expect(data[0].members).toBeUndefined() // Should be removed from response

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: mockUser.id,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: mockUser.id,
            },
            select: {
              role: true,
            },
          },
          _count: {
            select: {
              members: true,
              projects: true,
              products: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should handle database errors', async () => {
      mockSession(mockUser)

      mockPrisma.organization.findMany.mockRejectedValueOnce(new Error('Database error'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockSession(null)

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/organizations', body: {
        name: 'New Org',
        slug: 'new-org'
      } })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create a new organization', async () => {
      mockSession(mockUser)

      const newOrgData = {
        name: 'New Organization',
        slug: 'new-organization',
      }

      const createdOrg = {
        id: 'new-org-id',
        ...newOrgData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.organization.findUnique.mockResolvedValueOnce(null) // Slug not taken
      mockPrisma.organization.create.mockResolvedValueOnce({
        ...createdOrg,
        members: [{ role: 'OWNER' }],
        _count: { members: 1, projects: 0, products: 0 }
      } as any)

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/organizations', body: newOrgData })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(newOrgData.name)
      expect(data.slug).toBe(newOrgData.slug)
    })

    it('should return 400 if slug already exists', async () => {
      mockSession(mockUser)

      const newOrgData = {
        name: 'New Organization',
        slug: 'existing-slug',
      }

      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        id: 'existing-org',
        name: 'Existing Org',
        slug: 'existing-slug',
      } as any)

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/organizations', body: newOrgData })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('An organization with this slug already exists')
    })

    it('should validate input data', async () => {
      mockSession(mockUser)

      const invalidData = {
        name: 'A', // Too short
        slug: 'invalid slug with spaces', // Invalid format
      }

      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000/api/organizations', body: invalidData })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
      expect(data.details).toBeDefined()
    })
  })
})