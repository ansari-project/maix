// Mock dependencies
import { describe, it, expect, beforeEach } from '@jest/globals'
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  },
}))

import { validateOwnership, hasResourceAccess, getOwnerInfo } from '../ownership-utils'
import { prisma } from '@/lib/prisma'

describe('Ownership Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateOwnership', () => {
    it('should accept user ownership only', () => {
      expect(() => validateOwnership({ ownerId: 'user1', organizationId: null })).not.toThrow()
    })

    it('should accept organization ownership only', () => {
      expect(() => validateOwnership({ ownerId: null, organizationId: 'org1' })).not.toThrow()
    })

    it('should reject dual ownership', () => {
      expect(() => validateOwnership({ ownerId: 'user1', organizationId: 'org1' }))
        .toThrow('exactly one user OR one organization')
    })

    it('should reject no ownership', () => {
      expect(() => validateOwnership({ ownerId: null, organizationId: null }))
        .toThrow('must have an owner')
    })
  })

  describe('hasResourceAccess', () => {
    it('should allow public read access to anyone', async () => {
      const resource = { ownerId: 'user1', organizationId: null, visibility: 'PUBLIC' }
      const hasAccess = await hasResourceAccess('anyuser', resource, 'read')
      expect(hasAccess).toBe(true)
    })

    it('should restrict private access to owner only', async () => {
      const resource = { ownerId: 'user1', organizationId: null, visibility: 'PRIVATE' }
      
      expect(await hasResourceAccess('user1', resource, 'read')).toBe(true)
      expect(await hasResourceAccess('user2', resource, 'read')).toBe(false)
    })

    it('should allow org members to access org resources', async () => {
      const resource = { 
        ownerId: null, 
        organizationId: 'org1', 
        visibility: 'PRIVATE' 
      } as { ownerId: string | null; organizationId: string | null; visibility: string }
      
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        role: 'MEMBER',
      })
      
      const hasAccess = await hasResourceAccess('user1', resource, 'read')
      expect(hasAccess).toBe(true)
    })

    it('should require OWNER role for delete on org resources', async () => {
      const resource = { 
        ownerId: null, 
        organizationId: 'org1', 
        visibility: 'PRIVATE' 
      } as { ownerId: string | null; organizationId: string | null; visibility: string }
      
      // Test MEMBER cannot delete
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        role: 'MEMBER',
      })
      expect(await hasResourceAccess('user1', resource, 'delete')).toBe(false);
      
      // Test OWNER can delete
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        role: 'OWNER',
      })
      expect(await hasResourceAccess('user1', resource, 'delete')).toBe(true);
    })
  })

  describe('getOwnerInfo', () => {
    it('should return user info for user-owned resources', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user1',
        name: 'Test User',
      })

      const info = await getOwnerInfo({ ownerId: 'user1', organizationId: null })
      
      expect(info?.type).toBe('user')
      expect(info?.owner?.name).toBe('Test User')
    })

    it('should return org info for org-owned resources', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org1',
        name: 'Test Org',
        slug: 'test-org',
      })

      const info = await getOwnerInfo({ ownerId: null, organizationId: 'org1' })
      
      expect(info?.type).toBe('organization')
      expect(info?.organization?.name).toBe('Test Org')
    })
  })
})