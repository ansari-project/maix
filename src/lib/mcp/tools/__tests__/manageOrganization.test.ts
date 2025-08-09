import { manageOrganizationTool } from '../manageOrganization'
import { prisma } from '@/lib/prisma'
import type { MaixMcpContext } from '../../types'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('manageOrganization MCP Tool', () => {
  const mockContext: MaixMcpContext = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create action', () => {
    it('should create organization with all fields including aiEngagement', async () => {
      const params = {
        action: 'create' as const,
        name: 'AI Innovation Lab',
        slug: 'ai-innovation-lab',
        mission: 'To democratize AI technology and make it accessible to everyone',
        description: '# AI Innovation Lab\n\nWe are a cutting-edge research organization focused on:\n\n- Open source AI development\n- Community education\n- Ethical AI practices',
        url: 'https://aiinnovationlab.org',
        aiEngagement: 'We leverage state-of-the-art AI technologies including:\n\n- **LLMs**: Using GPT-4 and Claude for automated code review and documentation\n- **Computer Vision**: Developing tools for medical image analysis\n- **ML Ops**: Building scalable infrastructure for AI model deployment\n\nOur team actively contributes to open-source AI projects and maintains several popular libraries.',
      }

      ;(prisma.organization.findUnique as jest.Mock).mockResolvedValueOnce(null) // Slug not taken
      ;(prisma.organization.create as jest.Mock).mockResolvedValueOnce({
        id: 'new-org-id',
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [{
          userId: mockContext.user.id,
          role: 'OWNER',
          user: mockContext.user,
        }],
      } as any)

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: params.name,
        slug: params.slug,
        mission: params.mission,
        description: params.description,
        url: params.url,
        aiEngagement: params.aiEngagement,
      })

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: params.name,
          slug: params.slug,
          mission: params.mission,
          description: params.description,
          url: params.url,
          aiEngagement: params.aiEngagement,
          members: {
            create: {
              userId: mockContext.user.id,
              role: 'OWNER',
            },
          },
        },
        include: expect.any(Object),
      })
    })

    it('should create organization with minimal fields', async () => {
      const params = {
        action: 'create' as const,
        name: 'Simple Org',
        slug: 'simple-org',
      }

      ;(prisma.organization.findUnique as jest.Mock).mockResolvedValueOnce(null)
      ;(prisma.organization.create as jest.Mock).mockResolvedValueOnce({
        id: 'simple-org-id',
        ...params,
        mission: null,
        description: null,
        url: null,
        aiEngagement: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      } as any)

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(true)
      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: params.name,
          slug: params.slug,
          mission: undefined,
          description: undefined,
          url: undefined,
          aiEngagement: undefined,
        }),
        include: expect.any(Object),
      })
    })

    it('should validate field lengths', async () => {
      const params = {
        action: 'create' as const,
        name: 'Valid Name',
        slug: 'valid-slug',
        mission: 'Too short', // Less than 10 characters
        description: 'Short', // Less than 10 characters
        aiEngagement: 'Brief', // Less than 10 characters
      }

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation error')
    })

    it('should reject duplicate slugs', async () => {
      const params = {
        action: 'create' as const,
        name: 'New Org',
        slug: 'existing-slug',
      }

      ;(prisma.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'existing-org',
        slug: 'existing-slug',
      } as any)

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })
  })

  describe('update action', () => {
    it('should update all fields including aiEngagement', async () => {
      const params = {
        action: 'update' as const,
        organizationId: 'org-123',
        name: 'Updated Name',
        mission: 'Our new mission statement for the future',
        description: 'A comprehensive new description of our work',
        url: 'https://new-url.org',
        aiEngagement: 'We have expanded our AI initiatives to include natural language processing and robotics',
      }

      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: mockContext.user.id,
        organizationId: 'org-123',
        role: 'OWNER',
      } as any)

      ;(prisma.organization.update as jest.Mock).mockResolvedValueOnce({
        id: 'org-123',
        ...params,
        slug: 'existing-slug',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      } as any)

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: params.name,
        mission: params.mission,
        description: params.description,
        url: params.url,
        aiEngagement: params.aiEngagement,
      })

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          name: params.name,
          mission: params.mission,
          description: params.description,
          url: params.url,
          aiEngagement: params.aiEngagement,
        },
        include: expect.any(Object),
      })
    })

    it('should only update provided fields', async () => {
      const params = {
        action: 'update' as const,
        organizationId: 'org-123',
        name: 'Updated Name Only',
        // Other fields not provided, so they won't be updated
      }

      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: mockContext.user.id,
        organizationId: 'org-123',
        role: 'OWNER',
      } as any)

      ;(prisma.organization.update as jest.Mock).mockResolvedValueOnce({
        id: 'org-123',
        name: 'Updated Name Only',
        slug: 'unchanged-slug',
        mission: 'Existing mission',
        description: 'Existing description',
        url: 'https://existing.org',
        aiEngagement: 'Existing AI engagement',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      } as any)

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(true)
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          name: 'Updated Name Only',
          // Other fields should not be in the update data
        },
        include: expect.any(Object),
      })
    })

    it('should require organizationId for update', async () => {
      const params = {
        action: 'update' as const,
        name: 'Updated Name',
      }

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Organization ID is required')
    })

    it('should prevent non-owners from updating', async () => {
      const params = {
        action: 'update' as const,
        organizationId: 'org-123',
        name: 'Attempted Update',
      }

      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: mockContext.user.id,
        organizationId: 'org-123',
        role: 'MEMBER',
      } as any)

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only organization owners')
      expect(prisma.organization.update).not.toHaveBeenCalled()
    })
  })

  describe('get action', () => {
    it('should return organization with all fields', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        mission: 'Our mission statement',
        description: 'Detailed description',
        url: 'https://test.org',
        aiEngagement: 'How we use AI in our organization',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [{
          userId: mockContext.user.id,
          role: 'MEMBER',
          user: mockContext.user,
        }],
        projects: [],
        products: [],
      }

      ;(prisma.organization.findFirst as jest.Mock).mockResolvedValueOnce(mockOrg as any)

      const params = {
        action: 'get' as const,
        organizationId: 'org-123',
      }

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: mockOrg.id,
        name: mockOrg.name,
        slug: mockOrg.slug,
        mission: mockOrg.mission,
        description: mockOrg.description,
        url: mockOrg.url,
        aiEngagement: mockOrg.aiEngagement,
      })
    })
  })

  describe('list action', () => {
    it('should list organizations with all fields', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'AI Org',
          slug: 'ai-org',
          mission: 'AI for everyone',
          description: 'Description 1',
          url: 'https://ai.org',
          aiEngagement: 'We use AI extensively',
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [],
          _count: { projects: 5, products: 2 },
        },
        {
          id: 'org-2',
          name: 'Tech Org',
          slug: 'tech-org',
          mission: null,
          description: null,
          url: null,
          aiEngagement: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [],
          _count: { projects: 0, products: 0 },
        },
      ]

      ;(prisma.organization.findMany as jest.Mock).mockResolvedValueOnce(mockOrgs as any)

      const params = {
        action: 'list' as const,
      }

      const result = await manageOrganizationTool.handler(params, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toMatchObject({
        name: 'AI Org',
        aiEngagement: 'We use AI extensively',
      })
      expect(result.data[1].aiEngagement).toBeNull()
    })
  })
})