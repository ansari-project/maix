import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

// Mock dependencies
jest.mock('next-auth/next')
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
    $transaction: jest.fn(),
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/organizations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  }

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user organizations', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: mockUser,
        expires: '2024-01-01',
      })

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

      const response = await GET()
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
      mockGetServerSession.mockResolvedValueOnce({
        user: mockUser,
        expires: '2024-01-01',
      })

      mockPrisma.organization.findMany.mockRejectedValueOnce(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('Internal server error')
    })
  })

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Org', slug: 'new-org' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create a new organization', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: mockUser,
        expires: '2024-01-01',
      })

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
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValueOnce(createdOrg),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValueOnce({}),
          },
        } as any)
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(newOrgData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(newOrgData.name)
      expect(data.slug).toBe(newOrgData.slug)
    })

    it('should return 409 if slug already exists', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: mockUser,
        expires: '2024-01-01',
      })

      const newOrgData = {
        name: 'New Organization',
        slug: 'existing-slug',
      }

      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        id: 'existing-org',
        name: 'Existing Org',
        slug: 'existing-slug',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(newOrgData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('An organization with this slug already exists')
    })

    it('should validate input data', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: mockUser,
        expires: '2024-01-01',
      })

      const invalidData = {
        name: 'A', // Too short
        slug: 'invalid slug with spaces', // Invalid format
      }

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid input')
      expect(data.errors).toBeDefined()
    })
  })
})