/**
 * Notification Service - Async delivery system for Following subscriptions
 * 
 * CRITICAL ARCHITECTURE:
 * 1. Uses Following table to get subscribers (notification-only)
 * 2. Re-checks visibility at delivery time for security
 * 3. Silent skip when user loses visibility access
 * 4. Batch processing for scale (1000 users per job)
 * 5. NEVER grants or checks permissions - only delivers notifications
 */

import { prisma } from '@/lib/prisma'
import { followingService } from './following.service'
import { canViewEntity } from '@/lib/visibility-utils'
import { FollowableType, NotificationType } from '@prisma/client'
import { logger } from '@/lib/logger'

/**
 * Types for notification processing
 */
export interface EntityUpdateEvent {
  entityId: string
  entityType: FollowableType
  updateType: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
  createdBy?: string // User who caused the update
}

export interface NotificationBatch {
  userIds: string[]
  event: EntityUpdateEvent
  batchId: string
}

export interface NotificationDeliveryResult {
  success: boolean
  delivered: number
  skipped: number // Users who lost visibility
  failed: number
  batchId?: string
  errors?: string[]
}

/**
 * Notification Service - Manages async delivery to followers
 * 
 * This service bridges the Following system (subscriptions) with the 
 * existing Notification system (delivery) while enforcing visibility.
 */
class NotificationService {
  private static readonly BATCH_SIZE = 1000
  private static readonly MAX_RETRIES = 3

  /**
   * Process an entity update and notify all active followers
   * 
   * Entry point for notification generation. Fetches followers and 
   * creates batched async jobs for delivery.
   * 
   * @param event - The entity update event to notify about
   * @returns Promise with processing result
   */
  async processEntityUpdate(event: EntityUpdateEvent): Promise<NotificationDeliveryResult> {
    try {
      logger.info('Processing entity update for notifications', {
        entityId: event.entityId,
        entityType: event.entityType,
        updateType: event.updateType
      })

      // 1. Fetch active followers (those with notifications enabled)
      const followers = await followingService.getActiveFollowers(
        event.entityId,
        event.entityType
      )

      if (followers.length === 0) {
        logger.info('No active followers for entity', {
          entityId: event.entityId,
          entityType: event.entityType
        })
        return {
          success: true,
          delivered: 0,
          skipped: 0,
          failed: 0
        }
      }

      logger.info('Found active followers for notification', {
        entityId: event.entityId,
        entityType: event.entityType,
        followerCount: followers.length
      })

      // 2. Process in batches for scale
      let totalDelivered = 0
      let totalSkipped = 0
      let totalFailed = 0
      const errors: string[] = []

      const userIds = followers.map(f => f.userId)
      const batches = this.chunkArray(userIds, NotificationService.BATCH_SIZE)

      for (let i = 0; i < batches.length; i++) {
        const batchId = `${event.entityId}-${Date.now()}-${i}`
        const batch: NotificationBatch = {
          userIds: batches[i],
          event,
          batchId
        }

        try {
          const result = await this.processNotificationBatch(batch)
          totalDelivered += result.delivered
          totalSkipped += result.skipped
          totalFailed += result.failed

          if (result.errors) {
            errors.push(...result.errors)
          }
        } catch (error) {
          logger.error('Batch processing failed', {
            batchId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          totalFailed += batch.userIds.length
          errors.push(`Batch ${batchId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      const result: NotificationDeliveryResult = {
        success: totalFailed === 0,
        delivered: totalDelivered,
        skipped: totalSkipped,
        failed: totalFailed,
        errors: errors.length > 0 ? errors : undefined
      }

      logger.info('Entity update processing complete', {
        entityId: event.entityId,
        entityType: event.entityType,
        ...result
      })

      return result
    } catch (error) {
      logger.error('Failed to process entity update', {
        entityId: event.entityId,
        entityType: event.entityType,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        delivered: 0,
        skipped: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Process a batch of notifications with visibility checks
   * 
   * CRITICAL SECURITY FEATURE: Re-checks visibility at delivery time.
   * Users who followed when they had access but later lost access
   * will be silently skipped to prevent information leakage.
   * 
   * @param batch - Batch of users to notify
   * @returns Delivery results for the batch
   */
  private async processNotificationBatch(batch: NotificationBatch): Promise<NotificationDeliveryResult> {
    const { userIds, event, batchId } = batch
    let delivered = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    logger.debug('Processing notification batch', {
      batchId,
      userCount: userIds.length,
      entityId: event.entityId,
      entityType: event.entityType
    })

    // Process each user in the batch
    for (const userId of userIds) {
      try {
        // CRITICAL: Re-check visibility at delivery time
        // This prevents notifications to users who lost access since following
        const canView = await canViewEntity(userId, event.entityId, event.entityType)
        
        if (!canView) {
          // Silent skip - user lost visibility since following
          // This is expected behavior, not an error
          skipped++
          logger.debug('Skipping notification - user lost visibility', {
            userId,
            entityId: event.entityId,
            entityType: event.entityType,
            batchId
          })
          continue
        }

        // User still has visibility - deliver notification
        const notificationData = {
          userId,
          title: event.title,
          message: event.message,
          type: event.updateType,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: {
            followingNotification: true,
            ...event.metadata
          },
          createdBy: event.createdBy
        }

        await this.deliverNotification(notificationData)
        delivered++

        logger.debug('Notification delivered successfully', {
          userId,
          entityId: event.entityId,
          entityType: event.entityType,
          batchId
        })

      } catch (error) {
        failed++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`User ${userId}: ${errorMsg}`)
        
        logger.error('Failed to deliver notification to user', {
          userId,
          entityId: event.entityId,
          entityType: event.entityType,
          batchId,
          error: errorMsg
        })
      }
    }

    const result: NotificationDeliveryResult = {
      success: failed === 0,
      delivered,
      skipped,
      failed,
      batchId,
      errors: errors.length > 0 ? errors : undefined
    }

    logger.info('Notification batch processed', {
      batchId,
      ...result
    })

    return result
  }

  /**
   * Deliver notification to a specific user
   * 
   * Creates a notification record in the database.
   * This integrates with the existing notification system.
   * 
   * @param notificationData - Notification data to create
   */
  private async deliverNotification(notificationData: {
    userId: string
    title: string
    message: string
    type: NotificationType
    entityType: FollowableType
    entityId: string
    metadata?: Record<string, unknown>
    createdBy?: string
  }): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        read: false,
        // Link to the entity (for navigation)
        entityId: notificationData.entityId,
        entityType: notificationData.entityType.toString()
        // Note: metadata and createdBy fields don't exist in current schema
      }
    })
  }

  /**
   * Utility function to chunk array into smaller batches
   * 
   * @param array - Array to chunk
   * @param size - Chunk size
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Get notification statistics for monitoring
   * 
   * Provides metrics for monitoring the notification delivery system.
   * Useful for dashboards and alerting.
   */
  async getNotificationStats(entityId?: string, entityType?: FollowableType, hours = 24): Promise<{
    totalNotifications: number
    deliveredNotifications: number
    skippedNotifications: number
    failedNotifications: number
    uniqueRecipients: number
  }> {
    const since = new Date()
    since.setHours(since.getHours() - hours)

    const whereClause: any = {
      createdAt: { gte: since },
      // Filter for notification types that come from Following system
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
    }

    if (entityId && entityType) {
      whereClause.entityId = entityId
      whereClause.entityType = entityType.toString()
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      select: {
        userId: true
      }
    })

    const totalNotifications = notifications.length
    const uniqueRecipients = new Set(notifications.map(n => n.userId)).size

    // These would need to be tracked in metadata or a separate monitoring table
    // For now, returning basic stats
    return {
      totalNotifications,
      deliveredNotifications: totalNotifications, // All found notifications were delivered
      skippedNotifications: 0, // Would need tracking
      failedNotifications: 0, // Would need tracking  
      uniqueRecipients
    }
  }

  /**
   * Create common notification event builders
   * 
   * Helper methods to create standardized notification events
   * for different types of entity updates.
   */

  /**
   * Create notification event for project updates
   */
  createProjectUpdateEvent(projectId: string, updateType: NotificationType = NotificationType.PROJECT_UPDATE, title: string, message: string, metadata?: Record<string, unknown>, createdBy?: string): EntityUpdateEvent {
    return {
      entityId: projectId,
      entityType: FollowableType.PROJECT,
      updateType,
      title,
      message,
      metadata,
      createdBy
    }
  }

  /**
   * Create notification event for organization updates  
   */
  createOrganizationUpdateEvent(orgId: string, updateType: NotificationType = NotificationType.ORGANIZATION_UPDATE, title: string, message: string, metadata?: Record<string, unknown>, createdBy?: string): EntityUpdateEvent {
    return {
      entityId: orgId,
      entityType: FollowableType.ORGANIZATION,
      updateType,
      title,
      message,
      metadata,
      createdBy
    }
  }

  /**
   * Create notification event for product updates
   */
  createProductUpdateEvent(productId: string, updateType: NotificationType = NotificationType.PRODUCT_UPDATE, title: string, message: string, metadata?: Record<string, unknown>, createdBy?: string): EntityUpdateEvent {
    return {
      entityId: productId,
      entityType: FollowableType.PRODUCT,
      updateType,
      title,
      message,
      metadata,
      createdBy
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

// Export types for use by other modules  
// (EntityUpdateEvent, NotificationBatch, NotificationDeliveryResult are already exported above)