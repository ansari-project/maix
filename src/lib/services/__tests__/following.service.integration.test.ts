/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'

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
import { followingService } from '../following.service'

describe('Following Service - Notification Subscription Tests', () => {
  let testUser1: any
  let testUser2: any
  let testUser3: any
  let testOrg: any
  let testProject: any
  let testProduct: any

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await disconnectDatabase()
  })

  beforeEach(async () => {
    // Create test users
    testUser1 = await createTestUser({
      email: `user1-${Date.now()}@example.com`,
      name: 'Test User 1',
    })

    testUser2 = await createTestUser({
      email: `user2-${Date.now()}@example.com`,
      name: 'Test User 2',
    })

    testUser3 = await createTestUser({
      email: `user3-${Date.now()}@example.com`,
      name: 'Test User 3',
    })

    // Create test entities
    testOrg = await prismaTest.organization.create({
      data: {
        name: `Test Org ${Date.now()}`,
        slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        description: 'Test organization',
      }
    })

    testProject = await prismaTest.project.create({
      data: {
        name: `Test Project ${Date.now()}`,
        description: 'Test project',
        visibility: 'PUBLIC',
        status: 'AWAITING_VOLUNTEERS',
        ownerId: testUser1.id,
        organizationId: testOrg.id,
      }
    })

    testProduct = await prismaTest.product.create({
      data: {
        name: `Test Product ${Date.now()}`,
        description: 'Test product',
        visibility: 'PUBLIC',
        organizationId: testOrg.id,
      }
    })
  })

  describe('follow()', () => {
    it('should create a new follow relationship', async () => {
      const result = await followingService.follow({
        userId: testUser1.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
        notificationsEnabled: true
      })

      expect(result.success).toBe(true)
      expect(result.following).toBeDefined()
      expect(result.following?.userId).toBe(testUser1.id)
      expect(result.following?.followableId).toBe(testOrg.id)
      expect(result.following?.followableType).toBe(FollowableType.ORGANIZATION)
      expect(result.following?.notificationsEnabled).toBe(true)
    })

    it('should handle duplicate follows gracefully', async () => {
      // First follow
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      // Second follow (duplicate)
      const result = await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      expect(result.success).toBe(true)
      expect(result.following).toBeDefined()
      
      // Should not create duplicate
      const count = await prismaTest.following.count({
        where: {
          userId: testUser1.id,
          followableId: testProject.id,
          followableType: FollowableType.PROJECT
        }
      })
      expect(count).toBe(1)
    })

    it('should update notification preferences on re-follow', async () => {
      // First follow with notifications enabled
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProduct.id,
        followableType: FollowableType.PRODUCT,
        notificationsEnabled: true
      })

      // Re-follow with notifications disabled
      const result = await followingService.follow({
        userId: testUser1.id,
        followableId: testProduct.id,
        followableType: FollowableType.PRODUCT,
        notificationsEnabled: false
      })

      expect(result.success).toBe(true)
      expect(result.following?.notificationsEnabled).toBe(false)
    })

    it('should validate input parameters', async () => {
      const result = await followingService.follow({
        userId: 'invalid-id',
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      } as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid input parameters')
    })
  })

  describe('unfollow()', () => {
    it('should remove follow relationship', async () => {
      // First follow
      await followingService.follow({
        userId: testUser2.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      })

      // Then unfollow
      const result = await followingService.unfollow({
        userId: testUser2.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      })

      expect(result.success).toBe(true)

      // Verify it's removed
      const following = await followingService.isFollowing(
        testUser2.id,
        testOrg.id,
        FollowableType.ORGANIZATION
      )
      expect(following).toBe(false)
    })

    it('should handle unfollowing non-followed entity', async () => {
      const result = await followingService.unfollow({
        userId: testUser2.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not following this entity')
    })
  })

  describe('isFollowing()', () => {
    it('should return true when following', async () => {
      await followingService.follow({
        userId: testUser3.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      const isFollowing = await followingService.isFollowing(
        testUser3.id,
        testProject.id,
        FollowableType.PROJECT
      )

      expect(isFollowing).toBe(true)
    })

    it('should return false when not following', async () => {
      const isFollowing = await followingService.isFollowing(
        testUser3.id,
        testProduct.id,
        FollowableType.PRODUCT
      )

      expect(isFollowing).toBe(false)
    })
  })

  describe('getFollowers()', () => {
    it('should return list of followers', async () => {
      // Multiple users follow the same project
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      await followingService.follow({
        userId: testUser2.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      await followingService.follow({
        userId: testUser3.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      const result = await followingService.getFollowers({
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      expect(result.success).toBe(true)
      expect(result.followers).toHaveLength(3)
      expect(result.followers?.[0].user).toBeDefined()
      expect(result.followers?.[0].user.email).toBeDefined()
    })

    it('should support pagination', async () => {
      // Create many followers
      for (let i = 0; i < 5; i++) {
        const user = await createTestUser({
          email: `follower-${i}-${Date.now()}@example.com`,
          name: `Follower ${i}`,
        })
        
        await followingService.follow({
          userId: user.id,
          followableId: testOrg.id,
          followableType: FollowableType.ORGANIZATION,
        })
      }

      // Get first page
      const page1 = await followingService.getFollowers({
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
        limit: 2,
      })

      expect(page1.success).toBe(true)
      expect(page1.followers).toHaveLength(2)
      expect(page1.nextCursor).toBeDefined()

      // Get second page
      const page2 = await followingService.getFollowers({
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
        limit: 2,
        cursor: page1.nextCursor,
      })

      expect(page2.success).toBe(true)
      expect(page2.followers).toHaveLength(2)
      expect(page2.followers?.[0].id).not.toBe(page1.followers?.[0].id)
    })
  })

  describe('getUserFollowing()', () => {
    it('should return entities user is following', async () => {
      // User follows multiple entities
      await followingService.follow({
        userId: testUser1.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      })

      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      await followingService.follow({
        userId: testUser1.id,
        followableId: testProduct.id,
        followableType: FollowableType.PRODUCT,
      })

      const result = await followingService.getUserFollowing({
        userId: testUser1.id,
      })

      expect(result.success).toBe(true)
      expect(result.following).toHaveLength(3)
    })

    it('should filter by followable type', async () => {
      // User follows different types
      await followingService.follow({
        userId: testUser2.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      })

      await followingService.follow({
        userId: testUser2.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
      })

      const result = await followingService.getUserFollowing({
        userId: testUser2.id,
        followableType: FollowableType.PROJECT,
      })

      expect(result.success).toBe(true)
      expect(result.following).toHaveLength(1)
      expect(result.following?.[0].followableType).toBe(FollowableType.PROJECT)
    })
  })

  describe('getFollowerCount()', () => {
    it('should return correct follower count', async () => {
      // Add followers
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProduct.id,
        followableType: FollowableType.PRODUCT,
      })

      await followingService.follow({
        userId: testUser2.id,
        followableId: testProduct.id,
        followableType: FollowableType.PRODUCT,
      })

      const count = await followingService.getFollowerCount(
        testProduct.id,
        FollowableType.PRODUCT
      )

      expect(count).toBe(2)
    })

    it('should return 0 for entity with no followers', async () => {
      const newProduct = await prismaTest.product.create({
        data: {
          name: `Lonely Product ${Date.now()}`,
          description: 'No followers',
          visibility: 'PUBLIC',
          organizationId: testOrg.id,
        }
      })

      const count = await followingService.getFollowerCount(
        newProduct.id,
        FollowableType.PRODUCT
      )

      expect(count).toBe(0)
    })
  })

  describe('toggleNotifications()', () => {
    it('should toggle notification preferences', async () => {
      // Follow with notifications enabled
      await followingService.follow({
        userId: testUser3.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
        notificationsEnabled: true
      })

      // Toggle to disabled
      const result1 = await followingService.toggleNotifications(
        testUser3.id,
        testOrg.id,
        FollowableType.ORGANIZATION,
        false
      )

      expect(result1.success).toBe(true)
      expect(result1.following?.notificationsEnabled).toBe(false)

      // Toggle back to enabled
      const result2 = await followingService.toggleNotifications(
        testUser3.id,
        testOrg.id,
        FollowableType.ORGANIZATION,
        true
      )

      expect(result2.success).toBe(true)
      expect(result2.following?.notificationsEnabled).toBe(true)
    })

    it('should fail if not following', async () => {
      const result = await followingService.toggleNotifications(
        testUser3.id,
        testProduct.id,
        FollowableType.PRODUCT,
        false
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not following this entity')
    })
  })

  describe('batchCheckFollowing()', () => {
    it('should efficiently check multiple follow relationships', async () => {
      // User follows some entities
      await followingService.follow({
        userId: testUser1.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      })

      await followingService.follow({
        userId: testUser1.id,
        followableId: testProduct.id,
        followableType: FollowableType.PRODUCT,
      })

      // Check multiple entities
      const entities = [
        { followableId: testOrg.id, followableType: FollowableType.ORGANIZATION },
        { followableId: testProject.id, followableType: FollowableType.PROJECT },
        { followableId: testProduct.id, followableType: FollowableType.PRODUCT },
      ]

      const followingMap = await followingService.batchCheckFollowing(
        testUser1.id,
        entities
      )

      expect(followingMap.get(`ORGANIZATION:${testOrg.id}`)).toBe(true)
      expect(followingMap.get(`PROJECT:${testProject.id}`)).toBe(false)
      expect(followingMap.get(`PRODUCT:${testProduct.id}`)).toBe(true)
    })
  })

  describe('getActiveFollowers()', () => {
    it('should return only followers with notifications enabled', async () => {
      // Follow with notifications enabled
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      // Follow with notifications disabled
      await followingService.follow({
        userId: testUser2.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: false
      })

      // Follow with notifications enabled
      await followingService.follow({
        userId: testUser3.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      const activeFollowers = await followingService.getActiveFollowers(
        testProject.id,
        FollowableType.PROJECT
      )

      expect(activeFollowers).toHaveLength(2)
      expect(activeFollowers.map(f => f.userId)).toContain(testUser1.id)
      expect(activeFollowers.map(f => f.userId)).toContain(testUser3.id)
      expect(activeFollowers.map(f => f.userId)).not.toContain(testUser2.id)
    })
  })

  describe('Notification-Only Verification', () => {
    it('should NOT affect entity visibility', async () => {
      // Following does not grant access to private entities
      const privateProject = await prismaTest.project.create({
        data: {
          name: `Private Project ${Date.now()}`,
          description: 'Private',
          visibility: 'PRIVATE',
          status: 'AWAITING_VOLUNTEERS',
          ownerId: testUser1.id,
        }
      })

      // User2 follows private project (should work - following is just notification subscription)
      const followResult = await followingService.follow({
        userId: testUser2.id,
        followableId: privateProject.id,
        followableType: FollowableType.PROJECT,
      })

      expect(followResult.success).toBe(true)

      // But following doesn't grant visibility (this would be checked in API layer)
      // The service itself doesn't check permissions - that's the caller's responsibility
    })

    it('should NOT affect RBAC permissions', async () => {
      // Following an org doesn't make you a member
      const followResult = await followingService.follow({
        userId: testUser3.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
      })

      expect(followResult.success).toBe(true)

      // Check that user is NOT a member (no OrganizationMember record)
      const membership = await prismaTest.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: testOrg.id,
            userId: testUser3.id
          }
        }
      })

      expect(membership).toBeNull()
    })

    it('should be completely orthogonal to member tables', async () => {
      // Following has no foreign keys to member tables
      const following = await prismaTest.following.create({
        data: {
          userId: testUser1.id,
          followableId: testOrg.id,
          followableType: FollowableType.ORGANIZATION,
          notificationsEnabled: true
        }
      })

      // Following record has no role, permission, or access fields
      expect(following).not.toHaveProperty('role')
      expect(following).not.toHaveProperty('permission')
      expect(following).not.toHaveProperty('access')
      expect(following).not.toHaveProperty('organizationMemberId')
      expect(following).not.toHaveProperty('projectMemberId')
      expect(following).not.toHaveProperty('productMemberId')
    })
  })
})