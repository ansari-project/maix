/**
 * @jest-environment node
 */

/**
 * Ownership Utils Integration Tests
 * Tests with real database instead of mocks
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { validateOwnership, hasResourceAccess, getOwnerInfo } from '../ownership-utils'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  createTestOrganization,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Ownership Utils Integration Tests', () => {
  let testUser1: any
  let testUser2: any
  let testOrg: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Create test data
    testUser1 = await createTestUser({
      name: 'User One',
      email: 'user1@example.com'
    })
    
    testUser2 = await createTestUser({
      name: 'User Two',
      email: 'user2@example.com'
    })
    
    testOrg = await createTestOrganization(testUser1.id, {
      name: 'Test Organization'
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  describe('validateOwnership', () => {
    it('should accept user ownership only', () => {
      expect(() => validateOwnership({ ownerId: testUser1.id, organizationId: null })).not.toThrow()
    })

    it('should accept organization ownership only', () => {
      expect(() => validateOwnership({ ownerId: null, organizationId: testOrg.id })).not.toThrow()
    })

    it('should reject dual ownership', () => {
      expect(() => validateOwnership({ ownerId: testUser1.id, organizationId: testOrg.id }))
        .toThrow('exactly one user OR one organization')
    })

    it('should reject no ownership', () => {
      expect(() => validateOwnership({ ownerId: null, organizationId: null }))
        .toThrow('must have an owner')
    })
  })

  describe('hasResourceAccess', () => {
    it('should allow public read access to anyone', async () => {
      const resource = { 
        ownerId: testUser1.id, 
        organizationId: null, 
        visibility: 'PUBLIC' 
      }
      const hasAccess = await hasResourceAccess(testUser2.id, resource, 'read')
      expect(hasAccess).toBe(true)
    })

    it('should restrict private access to owner only', async () => {
      const resource = { 
        ownerId: testUser1.id, 
        organizationId: null, 
        visibility: 'PRIVATE' 
      }
      
      expect(await hasResourceAccess(testUser1.id, resource, 'read')).toBe(true)
      expect(await hasResourceAccess(testUser2.id, resource, 'read')).toBe(false)
    })

    it('should allow org members to access org resources', async () => {
      // Add user2 to the organization
      await prismaTest.organizationMember.create({
        data: {
          userId: testUser2.id,
          organizationId: testOrg.id,
          role: 'MEMBER'
        }
      })

      const resource = { 
        ownerId: null, 
        organizationId: testOrg.id, 
        visibility: 'PRIVATE' 
      }
      
      const hasAccess = await hasResourceAccess(testUser2.id, resource, 'read')
      expect(hasAccess).toBe(true)
    })

    it('should require OWNER role for delete on org resources', async () => {
      // Add user2 as MEMBER
      await prismaTest.organizationMember.create({
        data: {
          userId: testUser2.id,
          organizationId: testOrg.id,
          role: 'MEMBER'
        }
      })

      const resource = { 
        ownerId: null, 
        organizationId: testOrg.id, 
        visibility: 'PRIVATE' 
      }
      
      // Test MEMBER cannot delete
      expect(await hasResourceAccess(testUser2.id, resource, 'delete')).toBe(false)
      
      // Test OWNER can delete (user1 is the owner)
      expect(await hasResourceAccess(testUser1.id, resource, 'delete')).toBe(true)
    })
  })

  describe('getOwnerInfo', () => {
    it('should return user info for user-owned resources', async () => {
      const resource = { 
        ownerId: testUser1.id, 
        organizationId: null 
      }
      
      const ownerInfo = await getOwnerInfo(resource)
      
      expect(ownerInfo).toEqual({
        type: 'user',
        owner: {
          id: testUser1.id,
          name: 'User One'
        }
      })
    })

    it('should return org info for org-owned resources', async () => {
      const resource = { 
        ownerId: null, 
        organizationId: testOrg.id 
      }
      
      const ownerInfo = await getOwnerInfo(resource)
      
      expect(ownerInfo).toEqual({
        type: 'organization',
        organization: {
          id: testOrg.id,
          name: 'Test Organization',
          slug: testOrg.slug
        }
      })
    })
  })
})