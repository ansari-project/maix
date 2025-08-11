/**
 * @jest-environment jsdom
 */
import { 
  notificationJobProcessor, 
  queueProjectUpdateNotification,
  queueOrganizationUpdateNotification,
  queueProductUpdateNotification,
  type NotificationJob 
} from '../notification-processor'
import { notificationService } from '../../services/notification.service'
import { FollowableType, NotificationType } from '@prisma/client'

// Mock the notification service
jest.mock('../../services/notification.service')
jest.mock('../../logger')

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>

// Mock the create methods to return proper events
beforeAll(() => {
  mockNotificationService.createProjectUpdateEvent.mockImplementation((projectId, updateType, title, message, metadata, createdBy) => ({
    entityId: projectId,
    entityType: FollowableType.PROJECT,
    updateType: updateType || NotificationType.PROJECT_UPDATE,
    title,
    message,
    metadata,
    createdBy
  }))

  mockNotificationService.createOrganizationUpdateEvent.mockImplementation((orgId, updateType, title, message, metadata, createdBy) => ({
    entityId: orgId,
    entityType: FollowableType.ORGANIZATION,
    updateType: updateType || NotificationType.ORGANIZATION_UPDATE,
    title,
    message,
    metadata,
    createdBy
  }))

  mockNotificationService.createProductUpdateEvent.mockImplementation((productId, updateType, title, message, metadata, createdBy) => ({
    entityId: productId,
    entityType: FollowableType.PRODUCT,
    updateType: updateType || NotificationType.PRODUCT_UPDATE,
    title,
    message,
    metadata,
    createdBy
  }))
})

describe('NotificationJobProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Stop any running processors and clear jobs
    notificationJobProcessor.stopProcessing()
    notificationJobProcessor.clearAllJobs()
  })

  afterEach(() => {
    notificationJobProcessor.stopProcessing()
    notificationJobProcessor.clearAllJobs()
  })

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      const jobId = await notificationJobProcessor.addJob(event)

      expect(jobId).toMatch(/^notification-\d+-[a-z0-9]+$/)

      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.total).toBe(1)
      expect(stats.pending).toBe(1)
    })

    it('should add job with delay', async () => {
      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      const delay = 5000 // 5 seconds
      const jobId = await notificationJobProcessor.addJob(event, { delay })

      const job = notificationJobProcessor.getJobStatus(jobId)
      expect(job).toBeDefined()
      expect(job!.scheduledAt.getTime()).toBeGreaterThan(Date.now() + delay - 100) // Allow for timing differences
    })

    it('should add job with custom max attempts', async () => {
      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      const jobId = await notificationJobProcessor.addJob(event, { maxAttempts: 5 })

      const job = notificationJobProcessor.getJobStatus(jobId)
      expect(job).toBeDefined()
      expect(job!.maxAttempts).toBe(5)
    })
  })

  describe('job processing', () => {
    it('should process a successful job', async () => {
      // Mock successful processing
      mockNotificationService.processEntityUpdate.mockResolvedValue({
        success: true,
        delivered: 2,
        skipped: 1,
        failed: 0
      })

      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      const jobId = await notificationJobProcessor.addJob(event)

      // Process jobs manually (since we're not starting the interval)
      await notificationJobProcessor.processJobsNow()

      const job = notificationJobProcessor.getJobStatus(jobId)
      expect(job).toBeDefined()
      expect(job!.status).toBe('completed')
      expect(job!.attempts).toBe(1)
      expect(job!.result).toEqual({
        success: true,
        delivered: 2,
        skipped: 1,
        failed: 0
      })

      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.completed).toBe(1)
      expect(stats.pending).toBe(0)
    })

    it('should retry failed jobs', async () => {
      // Mock first attempt fails, second succeeds
      mockNotificationService.processEntityUpdate
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          success: true,
          delivered: 1,
          skipped: 0,
          failed: 0
        })

      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      const jobId = await notificationJobProcessor.addJob(event)

      // First processing attempt (will fail)
      await notificationJobProcessor.processJobsNow()

      let job = notificationJobProcessor.getJobStatus(jobId)
      expect(job!.status).toBe('pending') // Scheduled for retry
      expect(job!.attempts).toBe(1)

      // Simulate retry (manually set scheduledAt to now)
      job!.scheduledAt = new Date()
      
      // Second processing attempt (will succeed)
      await notificationJobProcessor.processJobsNow()

      job = notificationJobProcessor.getJobStatus(jobId)
      expect(job!.status).toBe('completed')
      expect(job!.attempts).toBe(2)
    })

    it('should mark job as failed after max attempts', async () => {
      // Mock all attempts fail
      mockNotificationService.processEntityUpdate.mockRejectedValue(new Error('Persistent failure'))

      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      const jobId = await notificationJobProcessor.addJob(event, { maxAttempts: 2 })

      // First attempt
      await notificationJobProcessor.processJobsNow()
      let job = notificationJobProcessor.getJobStatus(jobId)
      expect(job!.status).toBe('pending')
      expect(job!.attempts).toBe(1)

      // Second attempt (final)
      job!.scheduledAt = new Date()
      await notificationJobProcessor.processJobsNow()

      job = notificationJobProcessor.getJobStatus(jobId)
      expect(job!.status).toBe('failed')
      expect(job!.attempts).toBe(2)
      expect(job!.error).toContain('Persistent failure')

      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.failed).toBe(1)
    })

    it('should not process jobs scheduled for future', async () => {
      const event = {
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Project Updated',
        message: 'Test message'
      }

      // Add job with future delay
      const jobId = await notificationJobProcessor.addJob(event, { delay: 60000 }) // 1 minute

      await notificationJobProcessor.processJobsNow()

      const job = notificationJobProcessor.getJobStatus(jobId)
      expect(job!.status).toBe('pending')
      expect(job!.attempts).toBe(0) // Not processed yet

      // Verify service wasn't called
      expect(mockNotificationService.processEntityUpdate).not.toHaveBeenCalled()
    })
  })

  describe('queue management', () => {
    it('should provide accurate queue statistics', async () => {
      // Add various jobs
      await notificationJobProcessor.addJob({
        entityId: 'project-1',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Test 1',
        message: 'Message 1'
      })

      await notificationJobProcessor.addJob({
        entityId: 'project-2',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Test 2',
        message: 'Message 2'
      })

      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.total).toBe(2)
      expect(stats.pending).toBe(2)
      expect(stats.processing).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
    })

    it('should clear completed jobs', async () => {
      // Mock successful processing
      mockNotificationService.processEntityUpdate.mockResolvedValue({
        success: true,
        delivered: 1,
        skipped: 0,
        failed: 0
      })

      // Add a job with an older timestamp by manipulating the job after creation
      const jobId = await notificationJobProcessor.addJob({
        entityId: 'project-123',
        entityType: FollowableType.PROJECT,
        updateType: NotificationType.PROJECT_UPDATE,
        title: 'Test',
        message: 'Message'
      })

      // Process the job
      await notificationJobProcessor.processJobsNow()

      expect(notificationJobProcessor.getQueueStats().completed).toBe(1)

      // Manually age the job by modifying its createdAt timestamp
      const job = notificationJobProcessor.getJobStatus(jobId)
      if (job) {
        job.createdAt = new Date(Date.now() - (25 * 60 * 60 * 1000)) // 25 hours ago
      }

      // Clear completed jobs older than 24 hours
      const cleared = notificationJobProcessor.clearCompletedJobs(24)
      expect(cleared).toBe(1)
      expect(notificationJobProcessor.getQueueStats().total).toBe(0)
    })

    it('should clear all jobs', async () => {
      // Add several jobs
      await Promise.all([
        notificationJobProcessor.addJob({
          entityId: 'project-1',
          entityType: FollowableType.PROJECT,
          updateType: NotificationType.PROJECT_UPDATE,
          title: 'Test 1',
          message: 'Message 1'
        }),
        notificationJobProcessor.addJob({
          entityId: 'project-2',
          entityType: FollowableType.PROJECT,
          updateType: NotificationType.PROJECT_UPDATE,
          title: 'Test 2',
          message: 'Message 2'
        })
      ])

      expect(notificationJobProcessor.getQueueStats().total).toBe(2)

      notificationJobProcessor.clearAllJobs()

      expect(notificationJobProcessor.getQueueStats().total).toBe(0)
    })
  })

  describe('helper functions', () => {
    it('should queue project update notification', async () => {
      const jobId = await queueProjectUpdateNotification(
        'project-123',
        'Project Updated',
        'The project has been updated',
        NotificationType.PROJECT_UPDATE,
        { customData: 'value' },
        'user-123'
      )

      expect(jobId).toBeDefined()
      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.total).toBe(1)
    })

    it('should queue organization update notification', async () => {
      const jobId = await queueOrganizationUpdateNotification(
        'org-123',
        'Organization Updated',
        'The organization has been updated',
        NotificationType.ORGANIZATION_UPDATE,
        { customData: 'value' },
        'user-123'
      )

      expect(jobId).toBeDefined()
      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.total).toBe(1)
    })

    it('should queue product update notification', async () => {
      const jobId = await queueProductUpdateNotification(
        'product-123',
        'Product Updated',
        'The product has been updated',
        NotificationType.PRODUCT_UPDATE,
        { customData: 'value' },
        'user-123'
      )

      expect(jobId).toBeDefined()
      const stats = notificationJobProcessor.getQueueStats()
      expect(stats.total).toBe(1)
    })
  })

  describe('processor lifecycle', () => {
    it('should start and stop processing', () => {
      expect(() => notificationJobProcessor.startProcessing()).not.toThrow()
      expect(() => notificationJobProcessor.stopProcessing()).not.toThrow()
      
      // Should be safe to call multiple times
      expect(() => notificationJobProcessor.startProcessing()).not.toThrow()
      expect(() => notificationJobProcessor.startProcessing()).not.toThrow()
      expect(() => notificationJobProcessor.stopProcessing()).not.toThrow()
      expect(() => notificationJobProcessor.stopProcessing()).not.toThrow()
    })
  })
})