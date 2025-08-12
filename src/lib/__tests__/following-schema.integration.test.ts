/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

/**
 * Following Schema Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test verifies:
 *   - Following table is a pure notification subscription system
 *   - No permission logic exists in the Following table
 *   - Proper indexes for performance with 10K+ followers
 *   - Clean separation from RBAC and visibility systems
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { FollowableType } from '@prisma/client'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Following Schema - Notification-Only Tests', () => {
  let testUserId: string
  let testOrgId: string
  let testProjectId: string
  let testProductId: string

  beforeAll(async () => {
    await setupTestDatabase()
    
    // Create test data
    const user = await createTestUser({
      email: 'follower@test.com',
      username: 'follower-test',
      name: 'Test Follower'
    })
    testUserId = user.id

    const org = await prismaTest.organization.create({
      data: {
        name: 'Test Following Org',
        slug: 'test-following-org',
        description: 'Testing following system'
      }
    })
    testOrgId = org.id

    const project = await prismaTest.project.create({
      data: {
        name: 'Test Following Project',
        description: 'Testing following for projects',
        organizationId: testOrgId
      }
    })
    testProjectId = project.id

    const product = await prismaTest.product.create({
      data: {
        name: 'Test Following Product',
        description: 'Testing following for products',
        organizationId: testOrgId
      }
    })
    testProductId = product.id
  })

  afterAll(async () => {
    // Clean up in reverse order of creation
    await prismaTest.following.deleteMany({})
    await prismaTest.product.deleteMany({ where: { id: testProductId } })
    await prismaTest.project.deleteMany({ where: { id: testProjectId } })
    await prismaTest.organization.deleteMany({ where: { id: testOrgId } })
    await prismaTest.user.deleteMany({ where: { id: testUserId } })
    await cleanupTestDatabase()
    await disconnectDatabase()
  })

  describe('Following Table CRUD Operations', () => {
    it('should create a following record for organization', async () => {
      const following = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      expect(following).toBeDefined()
      expect(following.userId).toBe(testUserId)
      expect(following.followableId).toBe(testOrgId)
      expect(following.followableType).toBe('ORGANIZATION')
      expect(following.notificationsEnabled).toBe(true)
      expect(following.followedAt).toBeInstanceOf(Date)

      // Cleanup for this test
      await prismaTest.following.delete({ where: { id: following.id } })
    })

    it('should create following records for all entity types', async () => {
      // Follow project
      const projectFollow = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testProjectId,
          followableType: FollowableType.PROJECT
        }
      })
      expect(projectFollow.followableType).toBe('PROJECT')

      // Follow product
      const productFollow = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testProductId,
          followableType: FollowableType.PRODUCT
        }
      })
      expect(productFollow.followableType).toBe('PRODUCT')

      // Cleanup
      await prismaTest.following.delete({ where: { id: projectFollow.id } })
      await prismaTest.following.delete({ where: { id: productFollow.id } })
    })

    it('should allow toggling notifications without affecting following', async () => {
      const following = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      const updated = await prismaTest.following.update({
        where: { id: following.id },
        data: { notificationsEnabled: false }
      })

      expect(updated.notificationsEnabled).toBe(false)
      // Still following, just notifications disabled
      expect(updated.userId).toBe(testUserId)
      expect(updated.followableId).toBe(testOrgId)

      // Cleanup
      await prismaTest.following.delete({ where: { id: following.id } })
    })

    it('should handle unfollow (delete)', async () => {
      const following = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testProductId,
          followableType: FollowableType.PRODUCT
        }
      })

      await prismaTest.following.delete({
        where: { id: following.id }
      })

      const deleted = await prismaTest.following.findFirst({
        where: {
          userId: testUserId,
          followableId: testProductId,
          followableType: FollowableType.PRODUCT
        }
      })

      expect(deleted).toBeNull()
    })
  })

  describe('Uniqueness Constraints', () => {
    it('should enforce unique constraint on user/entity/type combination', async () => {
      // First follow should succeed
      const first = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      // Duplicate follow should fail
      await expect(
        prismaTest.following.create({
          data: {
            userId: testUserId,
            followableId: testOrgId,
            followableType: FollowableType.ORGANIZATION
          }
        })
      ).rejects.toThrow()

      // Cleanup
      await prismaTest.following.delete({ where: { id: first.id } })
    })

    it('should allow same user to follow different entities', async () => {
      const org2 = await prismaTest.organization.create({
        data: {
          name: 'Another Org',
          slug: 'another-org',
          description: 'Another test org'
        }
      })

      const follow1 = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      const follow2 = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: org2.id,
          followableType: FollowableType.ORGANIZATION
        }
      })

      expect(follow1.id).not.toBe(follow2.id)
      expect(follow2.followableId).toBe(org2.id)

      // Cleanup
      await prismaTest.following.delete({ where: { id: follow1.id } })
      await prismaTest.following.delete({ where: { id: follow2.id } })
      await prismaTest.organization.delete({ where: { id: org2.id } })
    })
  })

  describe('No Permission Logic in Following Table', () => {
    it('should NOT have any permission or role fields', async () => {
      const following = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      // Verify schema only has notification-related fields
      const keys = Object.keys(following)
      expect(keys).toContain('id')
      expect(keys).toContain('userId')
      expect(keys).toContain('followableId')
      expect(keys).toContain('followableType')
      expect(keys).toContain('followedAt')
      expect(keys).toContain('notificationsEnabled')
      
      // Verify NO permission fields exist
      expect(keys).not.toContain('role')
      expect(keys).not.toContain('permission')
      expect(keys).not.toContain('access')
      expect(keys).not.toContain('visibility')

      // Cleanup
      await prismaTest.following.delete({ where: { id: following.id } })
    })

    it('should not have foreign key relationships to permission tables', async () => {
      const following = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      // This test verifies Following has no FK to OrganizationMember, ProjectMember, etc.
      // The only FK should be to User for cascade delete
      const followingWithUser = await prismaTest.following.findFirst({
        where: { id: following.id },
        include: { user: true }
      })

      expect(followingWithUser?.user).toBeDefined()
      expect(followingWithUser?.user.id).toBe(testUserId)
      
      // There should be no way to include member relations
      // as they don't exist in the schema

      // Cleanup
      await prismaTest.following.delete({ where: { id: following.id } })
    })
  })

  describe('Performance Tests - Index Usage', () => {
    it('should efficiently query followers for an entity', async () => {
      // Create multiple followers
      const users = await Promise.all([
        createTestUser({
          email: 'perf1@test.com',
          username: 'perf1',
          name: 'Perf User 1'
        }),
        createTestUser({
          email: 'perf2@test.com',
          username: 'perf2',
          name: 'Perf User 2'
        })
      ])

      const followings = await Promise.all(
        users.map(user =>
          prismaTest.following.create({
            data: {
              userId: user.id,
              followableId: testOrgId,
              followableType: FollowableType.ORGANIZATION
            }
          })
        )
      )

      // This query should use the index on [followableId, followableType]
      const followers = await prismaTest.following.findMany({
        where: {
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      expect(followers.length).toBeGreaterThanOrEqual(2)

      // Cleanup
      await prismaTest.following.deleteMany({
        where: {
          id: { in: followings.map(f => f.id) }
        }
      })
      await prismaTest.user.deleteMany({
        where: {
          id: { in: users.map(u => u.id) }
        }
      })
    })

    it('should efficiently query entities a user is following', async () => {
      const following = await prismaTest.following.create({
        data: {
          userId: testUserId,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      // This query should use the index on [userId, followableType]
      const userFollowing = await prismaTest.following.findMany({
        where: {
          userId: testUserId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      expect(Array.isArray(userFollowing)).toBe(true)
      expect(userFollowing.length).toBeGreaterThanOrEqual(1)

      // Cleanup
      await prismaTest.following.delete({ where: { id: following.id } })
    })
  })

  describe('CASCADE Delete Behavior', () => {
    it('should delete following records when user is deleted', async () => {
      const tempUser = await createTestUser({
        email: 'cascade@test.com',
        username: 'cascade-test',
        name: 'Cascade Test'
      })

      const following = await prismaTest.following.create({
        data: {
          userId: tempUser.id,
          followableId: testOrgId,
          followableType: FollowableType.ORGANIZATION
        }
      })

      // Delete the user
      await prismaTest.user.delete({
        where: { id: tempUser.id }
      })

      // Following should be automatically deleted
      const deletedFollowing = await prismaTest.following.findUnique({
        where: { id: following.id }
      })

      expect(deletedFollowing).toBeNull()
    })
  })
})

describe('Role Unification Field', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await disconnectDatabase()
  })

})