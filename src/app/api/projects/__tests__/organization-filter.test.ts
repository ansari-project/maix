import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Project Organization Filtering', () => {
  const mockUser = createTestUser({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  })

  const mockProjects = [
    {
      id: 'proj-1',
      name: 'Org A Project 1',
      goal: 'Build AI tool',
      description: 'Description',
      contactEmail: 'contact@example.com',
      helpType: 'MVP',
      status: 'AWAITING_VOLUNTEERS',
      isActive: true,
      visibility: 'PUBLIC',
      organizationId: 'org-a',
      ownerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: null,
      organization: {
        id: 'org-a',
        name: 'Organization A',
        slug: 'org-a',
      },
      product: null,
      _count: { applications: 0 },
    },
    {
      id: 'proj-2',
      name: 'Org A Project 2',
      goal: 'Create platform',
      description: 'Description',
      contactEmail: 'contact@example.com',
      helpType: 'FULL_PRODUCT',
      status: 'IN_PROGRESS',
      isActive: true,
      visibility: 'PUBLIC',
      organizationId: 'org-a',
      ownerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: null,
      organization: {
        id: 'org-a',
        name: 'Organization A',
        slug: 'org-a',
      },
      product: null,
      _count: { applications: 2 },
    },
    {
      id: 'proj-3',
      name: 'Org B Project',
      goal: 'Research project',
      description: 'Description',
      contactEmail: 'contact@example.com',
      helpType: 'ADVICE',
      status: 'PLANNING',
      isActive: true,
      visibility: 'PUBLIC',
      organizationId: 'org-b',
      ownerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: null,
      organization: {
        id: 'org-b',
        name: 'Organization B',
        slug: 'org-b',
      },
      product: null,
      _count: { applications: 1 },
    },
    {
      id: 'proj-4',
      name: 'User Project',
      goal: 'Personal project',
      description: 'Description',
      contactEmail: 'contact@example.com',
      helpType: 'PROTOTYPE',
      status: 'AWAITING_VOLUNTEERS',
      isActive: true,
      visibility: 'PUBLIC',
      organizationId: null,
      ownerId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: {
        name: 'Individual User',
        email: 'user@example.com',
      },
      organization: null,
      product: null,
      _count: { applications: 0 },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  describe('GET /api/projects with organizationId filter', () => {
    it('should filter projects by organizationId when provided', async () => {
      mockSession(mockUser)

      // Mock to return only projects from org-a
      const orgAProjects = mockProjects.filter(p => p.organizationId === 'org-a')
      mockPrisma.project.findMany.mockResolvedValueOnce(orgAProjects as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects?organizationId=org-a')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data.every((p: any) => p.organizationId === 'org-a')).toBe(true)
      expect(data[0].name).toBe('Org A Project 1')
      expect(data[1].name).toBe('Org A Project 2')

      // Verify the query included organizationId filter
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            organizationId: 'org-a',
          })
        })
      )
    })

    it('should return all projects when organizationId not provided', async () => {
      mockSession(mockUser)

      mockPrisma.project.findMany.mockResolvedValueOnce(mockProjects as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(4)

      // Verify no organizationId filter was applied
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            organizationId: expect.anything()
          })
        })
      )
    })

    it('should return empty array for non-existent organizationId', async () => {
      mockSession(mockUser)

      mockPrisma.project.findMany.mockResolvedValueOnce([])

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects?organizationId=non-existent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(0)
    })

    it('should combine organizationId filter with visibility rules for authenticated users', async () => {
      mockSession(mockUser)

      const orgBProjects = mockProjects.filter(p => p.organizationId === 'org-b')
      mockPrisma.project.findMany.mockResolvedValueOnce(orgBProjects as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects?organizationId=org-b')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].organizationId).toBe('org-b')

      // Verify the query included both organizationId and visibility rules
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            organizationId: 'org-b',
            OR: expect.arrayContaining([
              { visibility: 'PUBLIC' },
              // Check membership in project directly
              {
                members: {
                  some: { userId: mockUser.id }
                }
              },
              // Check membership in parent product
              {
                product: {
                  members: {
                    some: { userId: mockUser.id }
                  }
                }
              },
              // Check membership in parent organization
              expect.objectContaining({
                organization: expect.objectContaining({
                  members: expect.objectContaining({
                    some: { userId: mockUser.id }
                  })
                })
              })
            ])
          })
        })
      )
    })

    it('should apply organizationId filter for unauthenticated users', async () => {
      mockSession(null) // No session

      const publicOrgAProjects = mockProjects.filter(
        p => p.organizationId === 'org-a' && p.visibility === 'PUBLIC'
      )
      mockPrisma.project.findMany.mockResolvedValueOnce(publicOrgAProjects as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/projects?organizationId=org-a')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data.every((p: any) => p.organizationId === 'org-a' && p.visibility === 'PUBLIC')).toBe(true)

      // Verify unauthenticated query
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            visibility: 'PUBLIC',
            organizationId: 'org-a'
          })
        })
      )
    })

    it('should handle multiple query parameters alongside organizationId', async () => {
      mockSession(mockUser)

      // Assuming there might be other query parameters in the future
      const request = createMockRequest(
        'GET', 
        'http://localhost:3000/api/projects?organizationId=org-a&status=ACTIVE&sort=newest'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)

      // The implementation should still filter by organizationId
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-a'
          })
        })
      )
    })
  })
})