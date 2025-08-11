/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock NextAuth first before any other imports
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { getServerSession } from 'next-auth/next'
import { FollowableType, Visibility } from '@prisma/client'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

// Import route handlers
import * as followRoute from '../[type]/[id]/route'
import * as followersRoute from '../[type]/[id]/followers/route'
import * as userRoute from '../user/route'
import * as batchRoute from '../batch-check/route'

describe('Following API Integration Tests', () => {
  let testUser: any
  let otherUser: any
  let testOrg: any
  let publicProject: any
  let privateProject: any
  let orgVisibleProduct: any

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await disconnectDatabase()
  })

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks()

    // Create test users
    testUser = await createTestUser({
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
    })

    otherUser = await createTestUser({
      email: `other-${Date.now()}@example.com`,
      name: 'Other User',
    })

    // Mock session for testUser
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    })

    // Create test entities
    testOrg = await prismaTest.organization.create({
      data: {
        name: `Test Org ${Date.now()}`,
        slug: `test-org-${Date.now()}`,
        description: 'Test organization',
      }
    })

    // Add testUser as org member
    await prismaTest.organizationMember.create({
      data: {
        organizationId: testOrg.id,
        userId: testUser.id,
        role: 'MEMBER'
      }
    })

    publicProject = await prismaTest.project.create({
      data: {
        name: `Public Project ${Date.now()}`,
        description: 'Public test project',
        visibility: Visibility.PUBLIC,
        status: 'AWAITING_VOLUNTEERS',
        ownerId: otherUser.id,
        organizationId: testOrg.id,
      }
    })

    privateProject = await prismaTest.project.create({
      data: {
        name: `Private Project ${Date.now()}`,
        description: 'Private test project',
        visibility: Visibility.PRIVATE,
        status: 'AWAITING_VOLUNTEERS',
        ownerId: otherUser.id,
      }
    })

    orgVisibleProduct = await prismaTest.product.create({
      data: {
        name: `Org Product ${Date.now()}`,
        description: 'Org visible product',
        visibility: Visibility.ORG_VISIBLE,
        organizationId: testOrg.id,
      }
    })
  })

  describe('POST /api/following/[type]/[id] - Follow Entity', () => {
    it('should allow following a public project', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}`,
        {
          method: 'POST',
          body: JSON.stringify({ notificationsEnabled: true }),
        }
      )

      const response = await followRoute.POST(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following).toBeDefined()
      expect(data.following.followableId).toBe(publicProject.id)
      expect(data.following.followableType).toBe(FollowableType.PROJECT)
    })

    it('should prevent following a private project without access', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${privateProject.id}`,
        {
          method: 'POST',
          body: JSON.stringify({ notificationsEnabled: true }),
        }
      )

      const response = await followRoute.POST(
        request,
        { params: Promise.resolve({ type: 'project', id: privateProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Cannot follow entity you do not have access to view')
    })

    it('should allow following org-visible product as org member', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/product/${orgVisibleProduct.id}`,
        {
          method: 'POST',
          body: JSON.stringify({ notificationsEnabled: false }),
        }
      )

      const response = await followRoute.POST(
        request,
        { params: Promise.resolve({ type: 'product', id: orgVisibleProduct.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following.notificationsEnabled).toBe(false)
    })

    it('should handle invalid entity type', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/invalid/${testOrg.id}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )

      const response = await followRoute.POST(
        request,
        { params: Promise.resolve({ type: 'invalid', id: testOrg.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid entity type')
    })
  })

  describe('GET /api/following/[type]/[id] - Check Following Status', () => {
    beforeEach(async () => {
      // Follow the public project
      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })
    })

    it('should return true when following', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}`,
        { method: 'GET' }
      )

      const response = await followRoute.GET(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.following).toBe(true)
      expect(data.entityId).toBe(publicProject.id)
      expect(data.entityType).toBe(FollowableType.PROJECT)
    })

    it('should return false when not following', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/organization/${testOrg.id}`,
        { method: 'GET' }
      )

      const response = await followRoute.GET(
        request,
        { params: Promise.resolve({ type: 'organization', id: testOrg.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.following).toBe(false)
    })
  })

  describe('DELETE /api/following/[type]/[id] - Unfollow Entity', () => {
    beforeEach(async () => {
      // Follow the public project
      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })
    })

    it('should successfully unfollow an entity', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}`,
        { method: 'DELETE' }
      )

      const response = await followRoute.DELETE(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify it's actually unfollowed
      const following = await prismaTest.following.findFirst({
        where: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT
        }
      })
      expect(following).toBeNull()
    })

    it('should handle unfollowing non-followed entity', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/organization/${testOrg.id}`,
        { method: 'DELETE' }
      )

      const response = await followRoute.DELETE(
        request,
        { params: Promise.resolve({ type: 'organization', id: testOrg.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Not following this entity')
    })
  })

  describe('PATCH /api/following/[type]/[id] - Update Notifications', () => {
    beforeEach(async () => {
      // Follow with notifications enabled
      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })
    })

    it('should toggle notification preferences', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ notificationsEnabled: false }),
        }
      )

      const response = await followRoute.PATCH(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following.notificationsEnabled).toBe(false)
      expect(data.message).toBe('Notifications disabled')
    })

    it('should reject invalid notification value', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ notificationsEnabled: 'invalid' }),
        }
      )

      const response = await followRoute.PATCH(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('must be a boolean')
    })
  })

  describe('GET /api/following/[type]/[id]/followers - Get Followers', () => {
    beforeEach(async () => {
      // Multiple users follow the public project
      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })

      await prismaTest.following.create({
        data: {
          userId: otherUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: false
        }
      })
    })

    it('should return all followers', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}/followers`,
        { method: 'GET' }
      )

      const response = await followersRoute.GET(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.followers).toHaveLength(2)
      expect(data.totalCount).toBe(2)
    })

    it('should return only active followers when requested', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}/followers?activeOnly=true`,
        { method: 'GET' }
      )

      const response = await followersRoute.GET(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.followers).toHaveLength(1)
      expect(data.followers[0].userId).toBe(testUser.id)
    })

    it('should prevent getting followers of private entity without access', async () => {
      const request = new NextRequest(
        `http://localhost/api/following/project/${privateProject.id}/followers`,
        { method: 'GET' }
      )

      const response = await followersRoute.GET(
        request,
        { params: Promise.resolve({ type: 'project', id: privateProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Cannot view followers')
    })
  })

  describe('GET /api/following/user - Get User Following List', () => {
    beforeEach(async () => {
      // User follows multiple entities
      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: testOrg.id,
          followableType: FollowableType.ORGANIZATION,
          notificationsEnabled: true
        }
      })

      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })

      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: orgVisibleProduct.id,
          followableType: FollowableType.PRODUCT,
          notificationsEnabled: false
        }
      })
    })

    it('should return all followed entities', async () => {
      const request = new NextRequest(
        'http://localhost/api/following/user',
        { method: 'GET' }
      )

      const response = await userRoute.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following).toHaveLength(3)
      expect(data.grouped.organizations).toHaveLength(1)
      expect(data.grouped.projects).toHaveLength(1)
      expect(data.grouped.products).toHaveLength(1)
    })

    it('should filter by entity type', async () => {
      const request = new NextRequest(
        'http://localhost/api/following/user?type=project',
        { method: 'GET' }
      )

      const response = await userRoute.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following).toHaveLength(1)
      expect(data.following[0].followableType).toBe(FollowableType.PROJECT)
    })
  })

  describe('POST /api/following/batch-check - Batch Check Following', () => {
    beforeEach(async () => {
      // User follows some entities
      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: testOrg.id,
          followableType: FollowableType.ORGANIZATION,
          notificationsEnabled: true
        }
      })

      await prismaTest.following.create({
        data: {
          userId: testUser.id,
          followableId: publicProject.id,
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })
    })

    it('should check multiple entities efficiently', async () => {
      const request = new NextRequest(
        'http://localhost/api/following/batch-check',
        {
          method: 'POST',
          body: JSON.stringify({
            entities: [
              { id: testOrg.id, type: 'organization' },
              { id: publicProject.id, type: 'project' },
              { id: orgVisibleProduct.id, type: 'product' }
            ]
          }),
        }
      )

      const response = await batchRoute.POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results[`ORGANIZATION:${testOrg.id}`]).toBe(true)
      expect(data.results[`PROJECT:${publicProject.id}`]).toBe(true)
      expect(data.results[`PRODUCT:${orgVisibleProduct.id}`]).toBe(false)

      // Check structured response
      expect(data.entities).toHaveLength(3)
      expect(data.entities[0].following).toBe(true)
      expect(data.entities[1].following).toBe(true)
      expect(data.entities[2].following).toBe(false)
    })

    it('should reject too many entities', async () => {
      const entities = Array.from({ length: 101 }, (_, i) => ({
        id: `test-id-${i}`,
        type: 'project' as const
      }))

      const request = new NextRequest(
        'http://localhost/api/following/batch-check',
        {
          method: 'POST',
          body: JSON.stringify({ entities }),
        }
      )

      const response = await batchRoute.POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request body')
    })
  })

  describe('Authentication Tests', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock no session
      (getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest(
        `http://localhost/api/following/project/${publicProject.id}`,
        { method: 'POST' }
      )

      const response = await followRoute.POST(
        request,
        { params: Promise.resolve({ type: 'project', id: publicProject.id }) }
      )

      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})