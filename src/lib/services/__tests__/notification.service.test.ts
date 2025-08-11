/**
 * @jest-environment jsdom
 */
import { notificationService } from '../notification.service'
import { followingService } from '../following.service'
import { canViewEntity } from '../../visibility-utils'
import { prisma } from '../../prisma'
import { FollowableType, NotificationType } from '@prisma/client'

// Mock dependencies
jest.mock('../following.service')
jest.mock('../../visibility-utils')
jest.mock('../../prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }
}))
jest.mock('../../logger')

const mockFollowingService = followingService as jest.Mocked<typeof followingService>
const mockCanViewEntity = canViewEntity as jest.MockedFunction<typeof canViewEntity>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processEntityUpdate', () => {
    const sampleEvent = {
      entityId: 'project-123',
      entityType: FollowableType.PROJECT,
      updateType: NotificationType.PROJECT_UPDATE,
      title: 'Project Updated',
      message: 'The project has been updated with new information',
      createdBy: 'user-123'
    }

    it('should process entity update with followers', async () => {
      // Mock followers
      const mockFollowers = [
        { userId: 'user-1', followableId: 'project-123', followableType: FollowableType.PROJECT },
        { userId: 'user-2', followableId: 'project-123', followableType: FollowableType.PROJECT }
      ]
      mockFollowingService.getActiveFollowers.mockResolvedValue(mockFollowers)

      // Mock visibility checks (both users can view)
      mockCanViewEntity.mockResolvedValue(true)

      // Mock notification creation
      mockPrisma.notification.create.mockResolvedValue({} as any)

      const result = await notificationService.processEntityUpdate(sampleEvent)

      expect(result.success).toBe(true)
      expect(result.delivered).toBe(2)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)

      // Verify follower fetch
      expect(mockFollowingService.getActiveFollowers).toHaveBeenCalledWith(
        'project-123',
        FollowableType.PROJECT
      )

      // Verify visibility checks for both users
      expect(mockCanViewEntity).toHaveBeenCalledTimes(2)
      expect(mockCanViewEntity).toHaveBeenCalledWith('user-1', 'project-123', FollowableType.PROJECT)
      expect(mockCanViewEntity).toHaveBeenCalledWith('user-2', 'project-123', FollowableType.PROJECT)

      // Verify notifications created
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2)
    })

    it('should skip users who lost visibility access', async () => {
      // Mock followers
      const mockFollowers = [
        { userId: 'user-1', followableId: 'project-123', followableType: FollowableType.PROJECT },
        { userId: 'user-2', followableId: 'project-123', followableType: FollowableType.PROJECT }
      ]
      mockFollowingService.getActiveFollowers.mockResolvedValue(mockFollowers)

      // Mock visibility checks (user-1 can view, user-2 cannot)
      mockCanViewEntity
        .mockResolvedValueOnce(true)  // user-1 can view
        .mockResolvedValueOnce(false) // user-2 cannot view

      // Mock notification creation
      mockPrisma.notification.create.mockResolvedValue({} as any)

      const result = await notificationService.processEntityUpdate(sampleEvent)

      expect(result.success).toBe(true)
      expect(result.delivered).toBe(1) // Only user-1 got notification
      expect(result.skipped).toBe(1)   // user-2 was skipped
      expect(result.failed).toBe(0)

      // Verify only one notification created (for user-1)
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Project Updated',
          message: 'The project has been updated with new information',
          type: NotificationType.PROJECT_UPDATE,
          entityId: 'project-123',
          entityType: 'PROJECT',
          read: false
        })
      })
    })

    it('should handle no active followers', async () => {
      // Mock no followers
      mockFollowingService.getActiveFollowers.mockResolvedValue([])

      const result = await notificationService.processEntityUpdate(sampleEvent)

      expect(result.success).toBe(true)
      expect(result.delivered).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)

      // Verify no visibility checks or notifications
      expect(mockCanViewEntity).not.toHaveBeenCalled()
      expect(mockPrisma.notification.create).not.toHaveBeenCalled()
    })

    it('should handle notification creation failures', async () => {
      // Mock followers
      const mockFollowers = [
        { userId: 'user-1', followableId: 'project-123', followableType: FollowableType.PROJECT }
      ]
      mockFollowingService.getActiveFollowers.mockResolvedValue(mockFollowers)

      // Mock visibility check passes
      mockCanViewEntity.mockResolvedValue(true)

      // Mock notification creation fails
      mockPrisma.notification.create.mockRejectedValue(new Error('Database error'))

      const result = await notificationService.processEntityUpdate(sampleEvent)

      expect(result.success).toBe(false)
      expect(result.delivered).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toEqual(['User user-1: Database error'])
    })

    it('should batch process large follower lists', async () => {
      // Mock large number of followers (more than batch size)
      const mockFollowers = Array.from({ length: 2500 }, (_, i) => ({
        userId: `user-${i}`,
        followableId: 'project-123',
        followableType: FollowableType.PROJECT
      }))
      mockFollowingService.getActiveFollowers.mockResolvedValue(mockFollowers)

      // Mock all users can view
      mockCanViewEntity.mockResolvedValue(true)

      // Mock notification creation
      mockPrisma.notification.create.mockResolvedValue({} as any)

      const result = await notificationService.processEntityUpdate(sampleEvent)

      expect(result.success).toBe(true)
      expect(result.delivered).toBe(2500)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)

      // Verify all followers got visibility checks
      expect(mockCanViewEntity).toHaveBeenCalledTimes(2500)

      // Verify all notifications created
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2500)
    })
  })

  describe('helper methods', () => {
    it('should create project update event', () => {
      const event = notificationService.createProjectUpdateEvent(
        'project-123',
        NotificationType.PROJECT_UPDATE,
        'Project Updated',
        'Details about the update',
        { customField: 'value' },
        'user-123'
      )

      expect(event).toEqual({
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Details about the update',
        metadata: { customField: 'value' },
        createdBy: 'user-123'
      })
    })

    it('should create organization update event', () => {
      const event = notificationService.createOrganizationUpdateEvent(
        'org-123',
        NotificationType.ORGANIZATION_UPDATE,
        'Organization Updated',
        'Details about the update'
      )

      expect(event).toEqual({
        entityId: 'org-123',
        entityType: FollowableType.ORGANIZATION,
        updateType: NotificationType.ORGANIZATION_UPDATE,
        title: 'Organization Updated',
        message: 'Details about the update',
        metadata: undefined,
        createdBy: undefined
      })
    })

    it('should create product update event', () => {
      const event = notificationService.createProductUpdateEvent(
        'product-123',
        NotificationType.PRODUCT_UPDATE,
        'Product Updated',
        'Details about the update'
      )

      expect(event).toEqual({
        entityId: 'product-123',
        entityType: FollowableType.PRODUCT,
        updateType: NotificationType.PRODUCT_UPDATE,
        title: 'Product Updated',
        message: 'Details about the update',
        metadata: undefined,
        createdBy: undefined
      })
    })

    it('should use default notification types', () => {
      // Test default values when updateType not provided
      const projectEvent = notificationService.createProjectUpdateEvent(
        'project-123',
        undefined, // Use default
        'Project Updated',
        'Details'
      )
      expect(projectEvent.updateType).toBe(NotificationType.PROJECT_UPDATE)

      const orgEvent = notificationService.createOrganizationUpdateEvent(
        'org-123',
        undefined, // Use default
        'Org Updated',
        'Details'
      )
      expect(orgEvent.updateType).toBe(NotificationType.ORGANIZATION_UPDATE)

      const productEvent = notificationService.createProductUpdateEvent(
        'product-123',
        undefined, // Use default
        'Product Updated',
        'Details'
      )
      expect(productEvent.updateType).toBe(NotificationType.PRODUCT_UPDATE)
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      // Mock notification query result
      const mockNotifications = [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-1' } // Duplicate user
      ]
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications as any)

      const stats = await notificationService.getNotificationStats('project-123', FollowableType.PROJECT, 24)

      expect(stats).toEqual({
        totalNotifications: 3,
        deliveredNotifications: 3,
        skippedNotifications: 0,
        failedNotifications: 0,
        uniqueRecipients: 2 // user-1 and user-2
      })

      // Verify query parameters
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: expect.any(Date) },
          type: {
            in: [
              NotificationType.ORGANIZATION_UPDATE,
              NotificationType.PROJECT_UPDATE,
              NotificationType.PRODUCT_UPDATE,
              NotificationType.ORGANIZATION_NEW_MEMBER,
              NotificationType.PROJECT_NEW_MEMBER,
              NotificationType.PRODUCT_NEW_MEMBER,
              NotificationType.ORGANIZATION_NEW_PROJECT,
              NotificationType.ORGANIZATION_NEW_PRODUCT
            ]
          },
          entityId: 'project-123',
          entityType: 'PROJECT'
        },
        select: {
          userId: true
        }
      })
    })

    it('should return stats without entity filter', async () => {
      // Mock notification query result
      const mockNotifications = []
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications as any)

      const stats = await notificationService.getNotificationStats()

      expect(stats).toEqual({
        totalNotifications: 0,
        deliveredNotifications: 0,
        skippedNotifications: 0,
        failedNotifications: 0,
        uniqueRecipients: 0
      })

      // Verify query doesn't include entity filters
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: expect.any(Date) },
          type: {
            in: [
              NotificationType.ORGANIZATION_UPDATE,
              NotificationType.PROJECT_UPDATE,
              NotificationType.PRODUCT_UPDATE,
              NotificationType.ORGANIZATION_NEW_MEMBER,
              NotificationType.PROJECT_NEW_MEMBER,
              NotificationType.PRODUCT_NEW_MEMBER,
              NotificationType.ORGANIZATION_NEW_PROJECT,
              NotificationType.ORGANIZATION_NEW_PRODUCT
            ]
          }
        },
        select: {
          userId: true
        }
      })
    })
  })
})