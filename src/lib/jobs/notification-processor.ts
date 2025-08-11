/**
 * Background Job Processor for Following Notifications
 * 
 * Handles asynchronous processing of notification delivery to followers.
 * Uses a simple in-memory queue for now, but designed to be easily
 * replaced with Redis/Bull/etc for production scale.
 * 
 * SECURITY: Always re-checks visibility at delivery time
 * PERFORMANCE: Batch processing prevents timeout issues
 * RELIABILITY: Retry logic handles temporary failures
 */

import { notificationService, EntityUpdateEvent, NotificationDeliveryResult } from '@/lib/services/notification.service'
import { logger } from '@/lib/logger'

/**
 * Job types for the notification processor
 */
export interface NotificationJob {
  id: string
  type: 'ENTITY_UPDATE'
  payload: EntityUpdateEvent
  attempts: number
  maxAttempts: number
  createdAt: Date
  scheduledAt: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: NotificationDeliveryResult
  error?: string
}

/**
 * Simple in-memory job queue
 * 
 * For production, this should be replaced with Redis/Bull/etc.
 * This implementation provides the basic patterns needed.
 */
class NotificationJobProcessor {
  private jobs = new Map<string, NotificationJob>()
  private processing = false
  private processInterval: NodeJS.Timeout | null = null
  
  // Configuration
  private static readonly PROCESS_INTERVAL_MS = 5000 // Check every 5 seconds
  private static readonly MAX_CONCURRENT_JOBS = 5
  private static readonly DEFAULT_MAX_ATTEMPTS = 3
  private static readonly RETRY_DELAY_MS = 30000 // 30 seconds

  constructor() {
    // Auto-start processing in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      this.startProcessing()
    }
  }

  /**
   * Add a notification job to the queue
   * 
   * @param event - Entity update event to process
   * @param options - Job options
   * @returns Job ID
   */
  async addJob(event: EntityUpdateEvent, options: {
    maxAttempts?: number
    delay?: number
  } = {}): Promise<string> {
    const jobId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()
    const scheduledAt = new Date(now.getTime() + (options.delay || 0))

    const job: NotificationJob = {
      id: jobId,
      type: 'ENTITY_UPDATE',
      payload: event,
      attempts: 0,
      maxAttempts: options.maxAttempts || NotificationJobProcessor.DEFAULT_MAX_ATTEMPTS,
      createdAt: now,
      scheduledAt,
      status: 'pending'
    }

    this.jobs.set(jobId, job)

    logger.info('Notification job added to queue', {
      jobId,
      entityId: event.entityId,
      entityType: event.entityType,
      updateType: event.updateType,
      scheduledAt
    })

    return jobId
  }

  /**
   * Start the job processing loop
   */
  startProcessing(): void {
    if (this.processing) {
      return
    }

    this.processing = true
    this.processInterval = setInterval(() => {
      this.processJobs()
    }, NotificationJobProcessor.PROCESS_INTERVAL_MS)

    logger.info('Notification job processor started')
  }

  /**
   * Stop the job processing loop
   */
  stopProcessing(): void {
    if (!this.processing) {
      return
    }

    this.processing = false
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }

    logger.info('Notification job processor stopped')
  }

  /**
   * Process pending jobs in the queue
   */
  private async processJobs(): Promise<void> {
    const now = new Date()
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => 
        job.status === 'pending' && 
        job.scheduledAt <= now
      )
      .slice(0, NotificationJobProcessor.MAX_CONCURRENT_JOBS)

    if (pendingJobs.length === 0) {
      return
    }

    logger.debug('Processing notification jobs', {
      jobCount: pendingJobs.length,
      totalJobs: this.jobs.size
    })

    // Process jobs concurrently (up to MAX_CONCURRENT_JOBS)
    const promises = pendingJobs.map(job => this.processJob(job))
    await Promise.allSettled(promises)
  }

  /**
   * Process a single notification job
   * 
   * @param job - Job to process
   */
  private async processJob(job: NotificationJob): Promise<void> {
    const startTime = Date.now()
    
    // Mark as processing
    job.status = 'processing'
    job.attempts++
    this.jobs.set(job.id, job)

    logger.info('Processing notification job', {
      jobId: job.id,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
      entityId: job.payload.entityId,
      entityType: job.payload.entityType
    })

    try {
      // Process the notification
      const result = await notificationService.processEntityUpdate(job.payload)
      
      const duration = Date.now() - startTime

      if (result.success) {
        // Job completed successfully
        job.status = 'completed'
        job.result = result

        logger.info('Notification job completed successfully', {
          jobId: job.id,
          duration,
          delivered: result.delivered,
          skipped: result.skipped,
          failed: result.failed
        })
      } else {
        // Job had delivery failures
        throw new Error(`Notification delivery failed: ${result.errors?.join(', ') || 'Unknown error'}`)
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Notification job failed', {
        jobId: job.id,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        duration,
        error: errorMessage
      })

      if (job.attempts >= job.maxAttempts) {
        // Max attempts reached - mark as failed
        job.status = 'failed'
        job.error = errorMessage

        logger.error('Notification job failed permanently', {
          jobId: job.id,
          attempts: job.attempts,
          error: errorMessage
        })
      } else {
        // Retry - schedule for later
        job.status = 'pending'
        job.scheduledAt = new Date(Date.now() + NotificationJobProcessor.RETRY_DELAY_MS)

        logger.info('Notification job scheduled for retry', {
          jobId: job.id,
          attempt: job.attempts,
          retryAt: job.scheduledAt
        })
      }
    }

    // Update the job
    this.jobs.set(job.id, job)
  }

  /**
   * Get job status
   * 
   * @param jobId - Job ID to check
   * @returns Job status or undefined if not found
   */
  getJobStatus(jobId: string): NotificationJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
  } {
    const jobs = Array.from(this.jobs.values())
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    }
  }

  /**
   * Clear completed and failed jobs
   * 
   * Useful for preventing memory leaks in long-running processes.
   * In production, you'd want to persist job history elsewhere.
   */
  clearCompletedJobs(olderThanHours = 24): number {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000))
    let cleared = 0

    // Convert Map entries to array to avoid iteration issues
    const entries = Array.from(this.jobs.entries())
    for (const [jobId, job] of entries) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt < cutoff
      ) {
        this.jobs.delete(jobId)
        cleared++
      }
    }

    if (cleared > 0) {
      logger.info('Cleared completed notification jobs', {
        cleared,
        olderThanHours
      })
    }

    return cleared
  }

  /**
   * Clear all jobs (useful for testing)
   */
  clearAllJobs(): void {
    const count = this.jobs.size
    this.jobs.clear()
    
    if (count > 0) {
      logger.info('Cleared all notification jobs', { count })
    }
  }

  /**
   * Manual job processing (useful for testing)
   */
  async processJobsNow(): Promise<void> {
    if (!this.processing) {
      await this.processJobs()
    }
  }
}

// Export singleton instance
export const notificationJobProcessor = new NotificationJobProcessor()

// Helper functions for common notification scenarios

/**
 * Queue a project update notification
 */
export async function queueProjectUpdateNotification(
  projectId: string,
  title: string,
  message: string,
  updateType: any = 'PROJECT_UPDATE',
  metadata?: Record<string, unknown>,
  createdBy?: string
): Promise<string> {
  const event = notificationService.createProjectUpdateEvent(
    projectId,
    updateType,
    title,
    message,
    metadata,
    createdBy
  )

  return notificationJobProcessor.addJob(event)
}

/**
 * Queue an organization update notification
 */
export async function queueOrganizationUpdateNotification(
  organizationId: string,
  title: string,
  message: string,
  updateType: any = 'ORGANIZATION_UPDATE',
  metadata?: Record<string, unknown>,
  createdBy?: string
): Promise<string> {
  const event = notificationService.createOrganizationUpdateEvent(
    organizationId,
    updateType,
    title,
    message,
    metadata,
    createdBy
  )

  return notificationJobProcessor.addJob(event)
}

/**
 * Queue a product update notification
 */
export async function queueProductUpdateNotification(
  productId: string,
  title: string,
  message: string,
  updateType: any = 'PRODUCT_UPDATE',
  metadata?: Record<string, unknown>,
  createdBy?: string
): Promise<string> {
  const event = notificationService.createProductUpdateEvent(
    productId,
    updateType,
    title,
    message,
    metadata,
    createdBy
  )

  return notificationJobProcessor.addJob(event)
}

// NotificationJob type is already exported at the top of the file