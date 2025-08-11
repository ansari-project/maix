/**
 * Simple API tests to verify Following endpoints work
 * These tests use mocked dependencies instead of real database
 */

import { NextRequest } from 'next/server'
import { POST, GET, DELETE, PATCH } from '../[type]/[id]/route'
import { followingService } from '@/lib/services/following.service'
import { canViewEntity } from '@/lib/visibility-utils'
import { FollowableType } from '@prisma/client'

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/services/following.service')
jest.mock('@/lib/visibility-utils')

import { getServerSession } from 'next-auth/next'

describe('Following API - Unit Tests', () => {
  const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(canViewEntity as jest.Mock).mockResolvedValue(true)
  })

  describe('POST /api/following/[type]/[id]', () => {
    it('should follow an entity successfully', async () => {
      const mockFollowing = {
        id: 'follow-id',
        userId: 'test-user-id',
        followableId: 'project-id',
        followableType: FollowableType.PROJECT,
        followedAt: new Date(),
        notificationsEnabled: true
      }

      ;(followingService.follow as jest.Mock).mockResolvedValue({
        success: true,
        following: mockFollowing
      })

      const request = new NextRequest(
        'http://localhost/api/following/project/project-id',
        {
          method: 'POST',
          body: JSON.stringify({ notificationsEnabled: true })
        }
      )

      const response = await POST(request, {
        params: Promise.resolve({ type: 'project', id: 'project-id' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.following).toEqual({
        ...mockFollowing,
        followedAt: mockFollowing.followedAt.toISOString() // Dates are serialized as strings
      })
      expect(followingService.follow).toHaveBeenCalledWith({
        userId: 'test-user-id',
        followableId: 'project-id',
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })
    })

    it('should prevent following without view access', async () => {
      ;(canViewEntity as jest.Mock).mockResolvedValue(false)

      const request = new NextRequest(
        'http://localhost/api/following/project/private-project',
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      )

      const response = await POST(request, {
        params: Promise.resolve({ type: 'project', id: 'private-project' })
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Cannot follow entity you do not have access to view')
      expect(followingService.follow).not.toHaveBeenCalled()
    })

    it('should reject invalid entity type', async () => {
      const request = new NextRequest(
        'http://localhost/api/following/invalid/some-id',
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      )

      const response = await POST(request, {
        params: Promise.resolve({ type: 'invalid', id: 'some-id' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid entity type')
    })

    it('should require authentication', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/following/project/project-id',
        { method: 'POST' }
      )

      const response = await POST(request, {
        params: Promise.resolve({ type: 'project', id: 'project-id' })
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('GET /api/following/[type]/[id]', () => {
    it('should check following status', async () => {
      ;(followingService.isFollowing as jest.Mock).mockResolvedValue(true)

      const request = new NextRequest(
        'http://localhost/api/following/organization/org-id',
        { method: 'GET' }
      )

      const response = await GET(request, {
        params: Promise.resolve({ type: 'organization', id: 'org-id' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.following).toBe(true)
      expect(data.entityId).toBe('org-id')
      expect(data.entityType).toBe(FollowableType.ORGANIZATION)
    })
  })

  describe('DELETE /api/following/[type]/[id]', () => {
    it('should unfollow an entity', async () => {
      ;(followingService.unfollow as jest.Mock).mockResolvedValue({
        success: true
      })

      const request = new NextRequest(
        'http://localhost/api/following/product/product-id',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, {
        params: Promise.resolve({ type: 'product', id: 'product-id' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully unfollowed')
    })

    it('should handle unfollowing non-followed entity', async () => {
      ;(followingService.unfollow as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Not following this entity'
      })

      const request = new NextRequest(
        'http://localhost/api/following/product/product-id',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, {
        params: Promise.resolve({ type: 'product', id: 'product-id' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Not following this entity')
    })
  })

  describe('PATCH /api/following/[type]/[id]', () => {
    it('should update notification preferences', async () => {
      const mockUpdated = {
        id: 'follow-id',
        userId: 'test-user-id',
        followableId: 'project-id',
        followableType: FollowableType.PROJECT,
        followedAt: new Date(),
        notificationsEnabled: false
      }

      ;(followingService.toggleNotifications as jest.Mock).mockResolvedValue({
        success: true,
        following: mockUpdated
      })

      const request = new NextRequest(
        'http://localhost/api/following/project/project-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ notificationsEnabled: false })
        }
      )

      const response = await PATCH(request, {
        params: Promise.resolve({ type: 'project', id: 'project-id' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Notifications disabled')
      expect(followingService.toggleNotifications).toHaveBeenCalledWith(
        'test-user-id',
        'project-id',
        FollowableType.PROJECT,
        false
      )
    })

    it('should validate notification preference type', async () => {
      const request = new NextRequest(
        'http://localhost/api/following/project/project-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ notificationsEnabled: 'not-a-boolean' })
        }
      )

      const response = await PATCH(request, {
        params: Promise.resolve({ type: 'project', id: 'project-id' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('must be a boolean')
    })
  })
})