// Simple focused tests for organization functionality
import { validateOwnership, hasResourceAccess } from '@/lib/ownership-utils'

// Mock prisma for hasResourceAccess tests
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Organization Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Ownership Validation', () => {
    it('should enforce dual ownership constraint', () => {
      // Valid: user ownership only
      expect(() => validateOwnership({ ownerId: 'user1', organizationId: null })).not.toThrow()
      
      // Valid: organization ownership only
      expect(() => validateOwnership({ ownerId: null, organizationId: 'org1' })).not.toThrow()
      
      // Invalid: both user and organization
      expect(() => validateOwnership({ ownerId: 'user1', organizationId: 'org1' }))
        .toThrow('exactly one user OR one organization')
      
      // Invalid: neither user nor organization
      expect(() => validateOwnership({ ownerId: null, organizationId: null }))
        .toThrow('must have an owner')
    })
  })

  describe('Resource Access Control', () => {
    it('should allow public read access', async () => {
      const publicResource = { 
        ownerId: 'user1', 
        organizationId: null, 
        visibility: 'PUBLIC' 
      }
      
      // Anyone can read public resources
      expect(await hasResourceAccess('anyuser', publicResource, 'read')).toBe(true)
      expect(await hasResourceAccess('user1', publicResource, 'read')).toBe(true)
    })

    it('should restrict private user-owned resources', async () => {
      const privateResource = { 
        ownerId: 'user1', 
        organizationId: null, 
        visibility: 'PRIVATE' 
      }
      
      // Only owner can access
      expect(await hasResourceAccess('user1', privateResource, 'read')).toBe(true)
      expect(await hasResourceAccess('user2', privateResource, 'read')).toBe(false)
    })

    it('should allow org members to read private org resources', async () => {
      const orgResource = { 
        ownerId: null, 
        organizationId: 'org1', 
        visibility: 'PRIVATE'
      } as { ownerId: string | null; organizationId: string | null; visibility: string }
      
      // Mock member check - user is a member
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        role: 'MEMBER',
      })
      
      expect(await hasResourceAccess('user1', orgResource, 'read')).toBe(true)
    })

    it('should require OWNER role to delete org resources', async () => {
      const orgResource = { 
        ownerId: null, 
        organizationId: 'org1', 
        visibility: 'PRIVATE'
      } as { ownerId: string | null; organizationId: string | null; visibility: string }
      
      // Mock MEMBER role - cannot delete
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        role: 'MEMBER',
      })
      expect(await hasResourceAccess('user1', orgResource, 'delete')).toBe(false);
      
      // Mock OWNER role - can delete
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce({
        role: 'OWNER',
      })
      expect(await hasResourceAccess('user1', orgResource, 'delete')).toBe(true);
    })
  })
})