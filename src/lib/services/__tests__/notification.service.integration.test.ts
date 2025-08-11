/**
 * Integration test for the notification service
 * Tests the complete flow from following to notification delivery
 */

import { prismaTest as prisma, createTestUser, createTestOrganization } from '../../test/db-test-utils'
import { notificationService } from '../notification.service'
import { followingService } from '../following.service'
import { FollowableType, NotificationType, Visibility } from '@prisma/client'

describe('NotificationService Integration', () => {
  let testUser1: any
  let testUser2: any
  let testUser3: any
  let testOrg: any
  let testProject: any

  beforeEach(async () => {
    // Create test users (use default dynamic emails to avoid collisions)
    testUser1 = await createTestUser({
      name: 'Test User 1'
    })

    testUser2 = await createTestUser({
      name: 'Test User 2'
    })

    testUser3 = await createTestUser({
      name: 'Test User 3'
    })

    // Create test organization (use dynamic slug to avoid collisions)
    testOrg = await createTestOrganization(testUser1.id)

    // Create test project (PUBLIC so all can view)
    testProject = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'A test project',
        organizationId: testOrg.id,
        ownerId: testUser1.id,
        visibility: Visibility.PUBLIC,
        status: 'PLANNING' // Default status
      }
    })
  })

  describe('complete notification flow', () => {
    it('should deliver notifications only to followers who can view the entity', async () => {
      // User1 and User2 follow the project
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      await followingService.follow({
        userId: testUser2.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      // User3 does not follow the project

      // Create a notification event for the project
      const event = notificationService.createProjectUpdateEvent(
        testProject.id,
        NotificationType.PROJECT_UPDATE,
        'Project has been updated',
        'The project now includes new features',
        { version: '2.0' },
        testUser1.id
      )

      // Process the notification
      const result = await notificationService.processEntityUpdate(event)

      // Verify results
      expect(result.success).toBe(true)
      expect(result.delivered).toBe(2) // user1 and user2
      expect(result.skipped).toBe(0)   // All followers can view
      expect(result.failed).toBe(0)

      // Verify notifications were created in database
      const notifications = await prisma.notification.findMany({
        where: {
          entityId: testProject.id,
          entityType: FollowableType.PROJECT.toString()
        },
        include: {
          user: true
        }
      })

      expect(notifications).toHaveLength(2)

      // Check notification content
      notifications.forEach(notification => {
        expect(notification.title).toBe('Project has been updated')
        expect(notification.message).toBe('The project now includes new features')
        expect(notification.type).toBe(NotificationType.PROJECT_UPDATE)
        expect(notification.read).toBe(false)
        expect(notification.entityId).toBe(testProject.id)
        expect(notification.entityType).toBe(FollowableType.PROJECT.toString())
      })

      // Verify correct users received notifications
      const userIds = notifications.map(n => n.userId).sort()
      expect(userIds).toEqual([testUser1.id, testUser2.id].sort())
    })

    it('should skip followers who lose visibility access', async () => {
      // Create a PRIVATE project
      const privateProject = await prisma.project.create({
        data: {
          name: 'Private Project',
          description: 'A private test project',
          organizationId: testOrg.id,
          ownerId: testUser1.id,
          visibility: Visibility.PRIVATE
        }
      })

      // Add user1 as a member (so they can view)
      await prisma.projectMember.create({
        data: {
          projectId: privateProject.id,
          userId: testUser1.id,
          role: 'OWNER'
        }
      })

      // User2 follows the project (they can view it initially as org member if they were one)
      // For this test, we'll simulate they could follow but later lose access
      await followingService.follow({
        userId: testUser2.id,
        followableId: privateProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      // User1 follows too
      await followingService.follow({
        userId: testUser1.id,
        followableId: privateProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      // Create notification event
      const event = notificationService.createProjectUpdateEvent(
        privateProject.id,
        NotificationType.PROJECT_UPDATE,
        'Private project updated',
        'New private features added'
      )

      // Process notifications
      const result = await notificationService.processEntityUpdate(event)

      // Since user2 can't actually view the private project (not a member),
      // they should be skipped
      expect(result.success).toBe(true)
      expect(result.delivered).toBe(1) // Only user1 (project member)
      expect(result.skipped).toBe(1)   // user2 skipped (no visibility)
      expect(result.failed).toBe(0)

      // Verify only user1 got the notification
      const notifications = await prisma.notification.findMany({
        where: {
          entityId: privateProject.id,
          entityType: FollowableType.PROJECT.toString()
        }
      })

      expect(notifications).toHaveLength(1)
      expect(notifications[0].userId).toBe(testUser1.id)
    })

    it('should handle notifications with disabled followers', async () => {
      // User1 follows with notifications enabled
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      // User2 follows with notifications disabled
      await followingService.follow({
        userId: testUser2.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: false
      })

      // Create notification event
      const event = notificationService.createProjectUpdateEvent(
        testProject.id,
        NotificationType.PROJECT_UPDATE,
        'Project updated again',
        'More updates'
      )

      // Process notifications
      const result = await notificationService.processEntityUpdate(event)

      // Only active followers (notifications enabled) should receive notifications
      expect(result.success).toBe(true)
      expect(result.delivered).toBe(1) // Only user1 (notifications enabled)
      expect(result.skipped).toBe(0)   // user2 filtered out by getActiveFollowers
      expect(result.failed).toBe(0)

      // Verify only user1 got the notification
      const notifications = await prisma.notification.findMany({
        where: {
          entityId: testProject.id,
          entityType: FollowableType.PROJECT.toString(),
          title: 'Project updated again'
        }
      })

      expect(notifications).toHaveLength(1)
      expect(notifications[0].userId).toBe(testUser1.id)
    })
  })

  describe('organization notifications', () => {
    it('should notify organization followers', async () => {
      // User1 and User2 follow the organization
      await followingService.follow({
        userId: testUser1.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
        notificationsEnabled: true
      })

      await followingService.follow({
        userId: testUser2.id,
        followableId: testOrg.id,
        followableType: FollowableType.ORGANIZATION,
        notificationsEnabled: true
      })

      // Create organization update event
      const event = notificationService.createOrganizationUpdateEvent(
        testOrg.id,
        NotificationType.ORGANIZATION_NEW_PROJECT,
        'New project in organization',
        'A new project has been added to the organization'
      )

      // Process notifications
      const result = await notificationService.processEntityUpdate(event)

      expect(result.success).toBe(true)
      expect(result.delivered).toBe(2)
      expect(result.failed).toBe(0)

      // Verify notifications
      const notifications = await prisma.notification.findMany({
        where: {
          entityId: testOrg.id,
          entityType: FollowableType.ORGANIZATION.toString()
        }
      })

      expect(notifications).toHaveLength(2)
      expect(notifications[0].type).toBe(NotificationType.ORGANIZATION_NEW_PROJECT)
    })
  })

  describe('notification statistics', () => {
    it('should provide accurate statistics', async () => {
      // Create some following notifications
      await followingService.follow({
        userId: testUser1.id,
        followableId: testProject.id,
        followableType: FollowableType.PROJECT,
        notificationsEnabled: true
      })

      // Process a notification
      const event = notificationService.createProjectUpdateEvent(
        testProject.id,
        NotificationType.PROJECT_UPDATE,
        'Stats test',
        'Testing statistics'
      )

      await notificationService.processEntityUpdate(event)

      // Also create a non-following notification for comparison
      await prisma.notification.create({
        data: {
          userId: testUser2.id,
          title: 'Non-following notification',
          message: 'This is not from following',
          type: NotificationType.NEW_QUESTION,
          read: false,
          entityType: 'QUESTION',
          entityId: 'question-123'
        }
      })

      // Get following notification stats
      const stats = await notificationService.getNotificationStats(
        testProject.id,
        FollowableType.PROJECT,
        24
      )

      expect(stats.totalNotifications).toBe(1) // Only following notifications for this project
      expect(stats.uniqueRecipients).toBe(1)   // Only user1

      // Get global stats (no entity filter) - may include notifications from other tests
      const globalStats = await notificationService.getNotificationStats()
      expect(globalStats.totalNotifications).toBeGreaterThanOrEqual(1) // At least our notification
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Create a Following record that references a non-existent entity
      await prisma.following.create({
        data: {
          userId: testUser1.id,
          followableId: 'non-existent-project',
          followableType: FollowableType.PROJECT,
          notificationsEnabled: true
        }
      })

      // Try to process notification for non-existent entity
      const event = notificationService.createProjectUpdateEvent(
        'non-existent-project',
        NotificationType.PROJECT_UPDATE,
        'Test error handling',
        'This should handle errors gracefully'
      )

      const result = await notificationService.processEntityUpdate(event)

      // Should handle the error and continue
      expect(result.success).toBe(true) // Processing succeeds even for non-existent entities
      expect(result.delivered).toBe(0)  // No notifications delivered
      expect(result.skipped).toBe(1)    // User1 gets skipped due to visibility check failure
      expect(result.failed).toBe(0)     // No failed deliveries
    })
  })
})