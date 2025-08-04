import { NextRequest } from 'next/server'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string }) {
        super(message)
        this.code = code
      }
    }
  }
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

import { GET, POST } from '../organizations/route'
import { GET as GET_BY_ID, PUT, DELETE } from '../organizations/[id]/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

describe('Organizations API', () => {
  const mockUser = createTestUser({
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
      mockSession(mockUser);
      (prisma.organization.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'org1',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [{ role: 'OWNER' }],
          _count: { members: 2, projects: 3, products: 1 },
        },
      ])

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/organizations'
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].userRole).toBe('OWNER')
      expect(data[0].members).toBeUndefined()
    })

    it('should return 401 if not authenticated', async () => {
      mockSession(null)

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/organizations'
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      mockSession(mockUser);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.organization.create as jest.Mock).mockResolvedValue({
        id: 'org1',
        name: 'New Org',
        slug: 'new-org',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [{ role: 'OWNER' }],
        _count: { members: 1, projects: 0, products: 0 },
      })

      const requestBody = { name: 'New Org', slug: 'new-org' }
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/organizations',
        body: requestBody
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Org')
      expect(data.userRole).toBe('OWNER')
    })

    it('should return 400 if slug already exists', async () => {
      mockSession(mockUser);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
        name: 'Existing',
        slug: 'new-org',
      })

      const requestBody = { name: 'New Org', slug: 'new-org' }
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/organizations',
        body: requestBody
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already exists')
    })
  })

  describe('DELETE /api/organizations/[id]', () => {
    it('should prevent deletion if org has resources', async () => {
      mockSession(mockUser);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        role: 'OWNER',
      });
      (prisma.project.count as jest.Mock).mockResolvedValue(2);
      (prisma.product.count as jest.Mock).mockResolvedValue(0)

      const params = Promise.resolve({ id: 'org1' })
      const response = await DELETE(
        new Request('http://localhost:3000/api/organizations/org1'),
        { params }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot delete organization')
      expect(data.details.projectCount).toBe(2)
    })

    it('should delete organization if no resources', async () => {
      mockSession(mockUser);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        role: 'OWNER',
      });
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);
      (prisma.organization.delete as jest.Mock).mockResolvedValue({})

      const params = Promise.resolve({ id: 'org1' })
      const response = await DELETE(
        new Request('http://localhost:3000/api/organizations/org1'),
        { params }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('deleted successfully')
    })

    it('should return 403 if user is not owner', async () => {
      mockSession(mockUser);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        role: 'MEMBER',
      })

      const params = Promise.resolve({ id: 'org1' })
      const response = await DELETE(
        new Request('http://localhost:3000/api/organizations/org1'),
        { params }
      )
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Only organization owners')
    })
  })
})