import { getEffectiveRole, requirePermission, hasPermission, can, ROLE_HIERARCHY } from '../auth-utils'
import { AuthError } from '../errors'
import { UnifiedRole, Visibility } from '@prisma/client'

// Mock prisma
jest.mock('../prisma', () => {
  const mockProjectMember = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  }
  const mockProductMember = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  }
  const mockOrganizationMember = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  }
  const mockProject = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  }
  const mockProduct = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  }
  const mockUser = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  }

  return {
    prisma: {
      projectMember: mockProjectMember,
      productMember: mockProductMember,
      organizationMember: mockOrganizationMember,
      project: mockProject,
      product: mockProduct,
      user: mockUser,
    }
  }
})

// Import prisma after mocking
import { prisma } from '../prisma'

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

import { getServerSession } from 'next-auth/next'

describe('RBAC System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Role Hierarchy', () => {
    it('should have correct role hierarchy values', () => {
      expect(ROLE_HIERARCHY.VIEWER).toBe(1)
      expect(ROLE_HIERARCHY.MEMBER).toBe(2)
      expect(ROLE_HIERARCHY.ADMIN).toBe(3)
      expect(ROLE_HIERARCHY.OWNER).toBe(4)
    })
  })

  describe('hasPermission', () => {
    it('should return true when user role meets required role', () => {
      expect(hasPermission('ADMIN' as UnifiedRole, 'MEMBER' as UnifiedRole)).toBe(true)
      expect(hasPermission('OWNER' as UnifiedRole, 'ADMIN' as UnifiedRole)).toBe(true)
      expect(hasPermission('MEMBER' as UnifiedRole, 'MEMBER' as UnifiedRole)).toBe(true)
    })

    it('should return false when user role is insufficient', () => {
      expect(hasPermission('VIEWER' as UnifiedRole, 'MEMBER' as UnifiedRole)).toBe(false)
      expect(hasPermission('MEMBER' as UnifiedRole, 'ADMIN' as UnifiedRole)).toBe(false)
      expect(hasPermission('ADMIN' as UnifiedRole, 'OWNER' as UnifiedRole)).toBe(false)
    })

    it('should return false when role is null', () => {
      expect(hasPermission(null, 'VIEWER' as UnifiedRole)).toBe(false)
    })
  })

  describe('getEffectiveRole', () => {
    const userId = 'user123'

    describe('for projects', () => {
      it('should return direct project membership role', async () => {
        (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'pm123',
          projectId: 'proj123',
          userId,
          role: 'ADMIN' as UnifiedRole,
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'project', 'proj123')
        expect(role).toBe('ADMIN')
      })

      it('should inherit from product membership', async () => {
        (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: 'proj123',
          productId: 'prod123',
          organizationId: null
        } as any)
        ;(prisma.productMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'pm123',
          productId: 'prod123',
          userId,
          role: 'MEMBER' as UnifiedRole,
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'project', 'proj123')
        expect(role).toBe('MEMBER')
      })

      it('should inherit from organization membership', async () => {
        (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: 'proj123',
          productId: null,
          organizationId: 'org123'
        } as any)
        ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'om123',
          organizationId: 'org123',
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'project', 'proj123')
        expect(role).toBe('OWNER')
      })

      it('should return null when no membership exists', async () => {
        (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: 'proj123',
          productId: null,
          organizationId: null
        } as any)

        const role = await getEffectiveRole(userId, 'project', 'proj123')
        expect(role).toBeNull()
      })
    })

    describe('for products', () => {
      it('should return direct product membership role', async () => {
        (prisma.productMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'pm123',
          productId: 'prod123',
          userId,
          role: 'MEMBER' as UnifiedRole,
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'product', 'prod123')
        expect(role).toBe('MEMBER')
      })

      it('should inherit ADMIN from organization OWNER', async () => {
        (prisma.productMember.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.product.findUnique as jest.Mock).mockResolvedValue({
          id: 'prod123',
          organizationId: 'org123'
        } as any)
        ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'om123',
          organizationId: 'org123',
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'product', 'prod123')
        expect(role).toBe('ADMIN')
      })

      it('should inherit VIEWER from organization MEMBER', async () => {
        (prisma.productMember.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.product.findUnique as jest.Mock).mockResolvedValue({
          id: 'prod123',
          organizationId: 'org123'
        } as any)
        ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'om123',
          organizationId: 'org123',
          userId,
          role: 'MEMBER',
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'product', 'prod123')
        expect(role).toBe('VIEWER')
      })
    })

    describe('for organizations', () => {
      it('should return organization membership role', async () => {
        (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
          id: 'om123',
          organizationId: 'org123',
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
          invitationId: null
        })

        const role = await getEffectiveRole(userId, 'organization', 'org123')
        expect(role).toBe('OWNER')
      })

      it('should return null when no membership exists', async () => {
        (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)

        const role = await getEffectiveRole(userId, 'organization', 'org123')
        expect(role).toBeNull()
      })
    })
  })

  describe('can', () => {
    const userId = 'user123'

    it('should allow public read access without authentication', async () => {
      const result = await can(
        null,
        'read',
        { id: 'proj123', type: 'project', visibility: 'PUBLIC' as Visibility }
      )
      expect(result).toBe(true)
    })

    it('should deny non-read actions without authentication', async () => {
      const result = await can(
        null,
        'update',
        { id: 'proj123', type: 'project', visibility: 'PUBLIC' as Visibility }
      )
      expect(result).toBe(false)
    })

    it('should check role requirements for authenticated users', async () => {
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'pm123',
        projectId: 'proj123',
        userId,
        role: 'MEMBER' as UnifiedRole,
        joinedAt: new Date(),
        invitationId: null
      })

      // Member can update
      const canUpdate = await can(
        { id: userId },
        'update',
        { id: 'proj123', type: 'project', visibility: 'PRIVATE' as Visibility }
      )
      expect(canUpdate).toBe(true)

      // Member cannot delete (requires ADMIN)
      const canDelete = await can(
        { id: userId },
        'delete',
        { id: 'proj123', type: 'project', visibility: 'PRIVATE' as Visibility }
      )
      expect(canDelete).toBe(false)
    })

    it('should require OWNER role for organization invites', async () => {
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'om123',
        organizationId: 'org123',
        userId,
        role: 'MEMBER',
        joinedAt: new Date(),
        invitationId: null
      })

      const result = await can(
        { id: userId },
        'invite',
        { id: 'org123', type: 'organization' }
      )
      expect(result).toBe(false)
    })

    it('should allow ADMIN role for product/project invites', async () => {
      (prisma.productMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'pm123',
        productId: 'prod123',
        userId,
        role: 'ADMIN' as UnifiedRole,
        joinedAt: new Date(),
        invitationId: null
      })

      const result = await can(
        { id: userId },
        'invite',
        { id: 'prod123', type: 'product' }
      )
      expect(result).toBe(true)
    })
  })

  describe('requirePermission', () => {
    beforeEach(() => {
      // Mock getServerSession to return a valid session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'user@test.com' }
      })
      
      // Mock user lookup
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: 'user@test.com',
        username: 'testuser'
      })
    })

    it('should throw AuthError when user lacks permission', async () => {
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj123',
        productId: null,
        organizationId: null
      } as any)

      await expect(
        requirePermission('project', 'proj123', 'VIEWER' as UnifiedRole)
      ).rejects.toThrow(AuthError)
    })

    it('should return user and role when permission is granted', async () => {
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'pm123',
        projectId: 'proj123',
        userId: 'user123',
        role: 'ADMIN' as UnifiedRole,
        joinedAt: new Date(),
        invitationId: null
      })

      const result = await requirePermission('project', 'proj123', 'MEMBER' as UnifiedRole)
      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('role', 'ADMIN')
    })
  })
})