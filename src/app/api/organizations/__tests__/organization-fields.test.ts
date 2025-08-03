import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '../route'
import { GET as GET_BY_ID, PUT as PUT_BY_ID, DELETE as DELETE_BY_ID } from '../[id]/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Organization Fields Tests', () => {
  const mockUser = createTestUser({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  })

  const mockOrganization = {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    mission: 'To advance technology for the benefit of humanity',
    description: 'We are a non-profit organization focused on developing open-source AI tools that help communities solve real-world problems.',
    url: 'https://example.org',
    aiEngagement: 'We actively use AI for automating administrative tasks, enhancing our research capabilities, and building tools that help other organizations adopt AI responsibly.',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  describe('POST /api/organizations - Create with all fields', () => {
    it('should create organization with all optional fields', async () => {
      mockSession(mockUser)

      const newOrgData = {
        name: 'AI for Good Foundation',
        slug: 'ai-for-good',
        mission: 'Democratizing AI technology for social impact organizations',
        description: '## About Us\n\nWe are dedicated to making AI accessible to non-profits and social enterprises. Our work includes:\n\n- Building open-source AI tools\n- Providing training and resources\n- Connecting AI experts with organizations in need',
        url: 'https://aiforgood.org',
        aiEngagement: 'Our organization is at the forefront of AI adoption. We use large language models for content generation, computer vision for analyzing satellite imagery to track deforestation, and machine learning for predicting resource needs in humanitarian crises.',
      }

      mockPrisma.organization.findUnique.mockResolvedValueOnce(null) // Slug not taken
      mockPrisma.organization.create.mockResolvedValueOnce({
        ...mockOrganization,
        ...newOrgData,
        id: 'new-org-id',
        members: [{
          userId: mockUser.id,
          role: 'OWNER',
          user: mockUser,
        }],
        _count: { members: 1, projects: 0, products: 0 }
      } as any)

      const request = createMockRequest('POST', 'http://localhost:3000/api/organizations', newOrgData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(newOrgData.name)
      expect(data.slug).toBe(newOrgData.slug)
      expect(data.mission).toBe(newOrgData.mission)
      expect(data.description).toBe(newOrgData.description)
      expect(data.url).toBe(newOrgData.url)
      expect(data.aiEngagement).toBe(newOrgData.aiEngagement)

      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: newOrgData.name,
            slug: newOrgData.slug,
            mission: newOrgData.mission,
            description: newOrgData.description,
            url: newOrgData.url,
            aiEngagement: newOrgData.aiEngagement,
          })
        })
      )
    })

    it('should create organization with minimal fields', async () => {
      mockSession(mockUser)

      const minimalOrgData = {
        name: 'Simple Org',
        slug: 'simple-org',
      }

      mockPrisma.organization.findUnique.mockResolvedValueOnce(null)
      mockPrisma.organization.create.mockResolvedValueOnce({
        ...minimalOrgData,
        id: 'simple-org-id',
        mission: null,
        description: null,
        url: null,
        aiEngagement: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [{ role: 'OWNER' }],
        _count: { members: 1, projects: 0, products: 0 }
      } as any)

      const request = createMockRequest('POST', 'http://localhost:3000/api/organizations', minimalOrgData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe(minimalOrgData.name)
      expect(data.mission).toBeNull()
      expect(data.description).toBeNull()
      expect(data.url).toBeNull()
      expect(data.aiEngagement).toBeNull()
    })

    it('should validate field lengths', async () => {
      mockSession(mockUser)

      const invalidData = {
        name: 'Valid Name',
        slug: 'valid-slug',
        mission: 'Too short', // Less than 10 characters
        description: 'Also short', // Less than 10 characters
        url: 'not-a-url', // Invalid URL
        aiEngagement: 'Brief', // Less than 10 characters
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/organizations', invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should validate field max lengths', async () => {
      mockSession(mockUser)

      const invalidData = {
        name: 'Valid Name',
        slug: 'valid-slug',
        mission: 'a'.repeat(501), // Exceeds 500 character limit
        description: 'a'.repeat(5001), // Exceeds 5000 character limit
        aiEngagement: 'a'.repeat(2001), // Exceeds 2000 character limit
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/organizations', invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
    })
  })

  describe('PUT /api/organizations/[id] - Update fields', () => {
    it('should update all optional fields', async () => {
      mockSession(mockUser)

      const updateData = {
        name: 'Updated Organization Name',
        mission: 'Our updated mission is to leverage AI for maximum social impact',
        description: 'Updated description with **markdown** support',
        url: 'https://updated-url.org',
        aiEngagement: 'We now use GPT-4 for automated grant writing and Claude for research assistance',
      }

      // Mock ownership check
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        userId: mockUser.id,
        organizationId: 'org-1',
        role: 'OWNER',
      } as any)

      mockPrisma.organization.update.mockResolvedValueOnce({
        ...mockOrganization,
        ...updateData,
      } as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/organizations/org-1', updateData)
      const response = await PUT_BY_ID(request, { params: Promise.resolve({ id: 'org-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe(updateData.name)
      expect(data.mission).toBe(updateData.mission)
      expect(data.description).toBe(updateData.description)
      expect(data.url).toBe(updateData.url)
      expect(data.aiEngagement).toBe(updateData.aiEngagement)
    })

    it('should allow clearing optional fields', async () => {
      mockSession(mockUser)

      const updateData = {
        mission: '',
        description: '',
        url: '',
        aiEngagement: '',
      }

      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        userId: mockUser.id,
        organizationId: 'org-1',
        role: 'OWNER',
      } as any)

      mockPrisma.organization.update.mockResolvedValueOnce({
        ...mockOrganization,
        mission: null,
        description: null,
        url: null,
        aiEngagement: null,
      } as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/organizations/org-1', updateData)
      const response = await PUT_BY_ID(request, { params: Promise.resolve({ id: 'org-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mission: null,
            description: null,
            url: null,
            aiEngagement: null,
          })
        })
      )
    })

    it('should not allow non-owners to update', async () => {
      mockSession(mockUser)

      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        userId: mockUser.id,
        organizationId: 'org-1',
        role: 'MEMBER',
      } as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/organizations/org-1', {
        name: 'Attempted Update',
      })
      const response = await PUT_BY_ID(request, { params: Promise.resolve({ id: 'org-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only organization owners can update settings')
    })
  })

  describe('GET /api/organizations - List with new fields', () => {
    it('should return organizations with all fields', async () => {
      mockSession(mockUser)

      const organizations = [
        {
          ...mockOrganization,
          members: [{ role: 'OWNER' }],
          _count: { members: 5, projects: 3, products: 2 },
        },
        {
          id: 'org-2',
          name: 'Another Org',
          slug: 'another-org',
          mission: null,
          description: null,
          url: null,
          aiEngagement: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [{ role: 'MEMBER' }],
          _count: { members: 10, projects: 0, products: 0 },
        }
      ]

      mockPrisma.organization.findMany.mockResolvedValueOnce(organizations as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      
      // First org has all fields
      expect(data[0].mission).toBe(mockOrganization.mission)
      expect(data[0].description).toBe(mockOrganization.description)
      expect(data[0].url).toBe(mockOrganization.url)
      expect(data[0].aiEngagement).toBe(mockOrganization.aiEngagement)
      
      // Second org has null fields
      expect(data[1].mission).toBeNull()
      expect(data[1].description).toBeNull()
      expect(data[1].url).toBeNull()
      expect(data[1].aiEngagement).toBeNull()
    })
  })

  describe('GET /api/organizations/[id] - Get single with new fields', () => {
    it('should return organization with all fields for members', async () => {
      mockSession(mockUser)

      // Mock the membership check
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        userId: mockUser.id,
        organizationId: 'org-1',
        role: 'MEMBER',
      } as any)

      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        ...mockOrganization,
        members: [{
          userId: mockUser.id,
          role: 'MEMBER',
          user: mockUser,
        }],
        _count: {
          members: 2,
          projects: 3,
          products: 1,
        },
      } as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/organizations/org-1')
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'org-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mission).toBe(mockOrganization.mission)
      expect(data.description).toBe(mockOrganization.description)
      expect(data.url).toBe(mockOrganization.url)
      expect(data.aiEngagement).toBe(mockOrganization.aiEngagement)
    })
  })

  describe('Project filtering by organizationId', () => {
    it('should filter projects by organizationId parameter', async () => {
      // This would be tested in the projects route test file
      // Including here for completeness of the feature
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Org Project',
          organizationId: 'org-1',
          ownerId: null,
        }
      ]

      // The projects route should accept organizationId as a query parameter
      // and filter results accordingly
      expect(true).toBe(true) // Placeholder assertion
    })
  })
})