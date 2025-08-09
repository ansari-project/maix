/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'

/**
 * Causemon Daily Cron Route Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real monitors, users, public figures, and topics in test database
 *   - Tests actual database constraints and relationships
 *   - Validates monitor processing with real data
 *   - Mocks only external services (search, email)
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

// Mock only external service dependencies
jest.mock('@/lib/causemon/search-service')
jest.mock('@/lib/causemon/event-processor')
jest.mock('@/lib/causemon/email-service')

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getSearchService } from '@/lib/causemon/search-service'
import { getEventProcessor } from '@/lib/causemon/event-processor'
import { getEmailService } from '@/lib/causemon/email-service'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

const mockGetSearchService = getSearchService as jest.MockedFunction<typeof getSearchService>
const mockGetEventProcessor = getEventProcessor as jest.MockedFunction<typeof getEventProcessor>
const mockGetEmailService = getEmailService as jest.MockedFunction<typeof getEmailService>

describe('/api/cron/causemon-daily Integration Tests', () => {
  let testUser1: any
  let testUser2: any
  let publicFigure1: any
  let publicFigure2: any
  let topic1: any
  let topic2: any
  let monitor1: any
  let monitor2: any

  const mockSearchService = {
    searchForEvents: jest.fn() as jest.MockedFunction<any>
  }

  const mockEventProcessor = {
    processSearchResults: jest.fn() as jest.MockedFunction<any>
  }

  const mockEmailService = {
    sendDailyDigest: jest.fn() as jest.MockedFunction<any>
  }

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Set up test environment
    process.env.CRON_SECRET = 'test-secret'
    
    // Mock service factories
    mockGetSearchService.mockReturnValue(mockSearchService as any)
    mockGetEventProcessor.mockReturnValue(mockEventProcessor as any)
    mockGetEmailService.mockReturnValue(mockEmailService as any)
    
    // Reset mocks
    jest.clearAllMocks()
    
    // Create test users
    testUser1 = await createTestUser({
      name: 'User One',
      email: 'user1@example.com'
    })
    
    testUser2 = await createTestUser({
      name: 'User Two',
      email: 'user2@example.com'
    })
    
    // Create public figures
    publicFigure1 = await prismaTest.publicFigure.create({
      data: {
        name: 'John Doe',
        title: 'Prime Minister',
        aliases: ['PM John Doe', 'J. Doe']
      }
    })
    
    publicFigure2 = await prismaTest.publicFigure.create({
      data: {
        name: 'Jane Smith',
        title: 'Health Minister',
        aliases: ['Minister Smith', 'J. Smith']
      }
    })
    
    // Create topics
    topic1 = await prismaTest.topic.create({
      data: {
        name: 'Climate Change',
        keywords: ['climate', 'environment', 'carbon']
      }
    })
    
    topic2 = await prismaTest.topic.create({
      data: {
        name: 'Healthcare',
        keywords: ['health', 'medical', 'hospital']
      }
    })
    
    // Create monitors
    monitor1 = await prismaTest.monitor.create({
      data: {
        userId: testUser1.id,
        publicFigureId: publicFigure1.id,
        topicId: topic1.id,
        isActive: true
      }
    })
    
    monitor2 = await prismaTest.monitor.create({
      data: {
        userId: testUser2.id,
        publicFigureId: publicFigure2.id,
        topicId: topic2.id,
        isActive: true
      }
    })
  })

  describe('Authentication', () => {
    it('should return 401 if auth header is missing', async () => {
      const request = new NextRequest('http://localhost/api/cron/causemon-daily')
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should return 401 if auth header is incorrect', async () => {
      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer wrong-secret'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })
  })

  describe('Monitor Processing', () => {
    it('should process monitors and send emails successfully', async () => {
      // Mock search results
      mockSearchService.searchForEvents.mockResolvedValue({
        events: [{ title: 'PM speaks on climate' }]
      })
      
      // Mock event processing - first monitor has new events, second doesn't
      mockEventProcessor.processSearchResults
        .mockResolvedValueOnce({ created: 1, skipped: 0 })
        .mockResolvedValueOnce({ created: 0, skipped: 1 })

      // Create an event in the database for user1's monitor
      const event1 = await prismaTest.event.create({
        data: {
          title: 'PM speaks on climate',
          summary: 'Prime Minister addresses climate summit',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date(),
          eventType: 'SPEECH',
          sentiment: 'POSITIVE',
          stance: 'SUPPORTIVE',
          deduplicationHash: 'hash-' + Date.now() + '-1'
        }
      })

      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        monitorsProcessed: 2,
        emailsSent: 1
      })

      // Verify search was called for each monitor
      expect(mockSearchService.searchForEvents).toHaveBeenCalledTimes(2)
      expect(mockSearchService.searchForEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          id: monitor1.id,
          userId: testUser1.id,
          publicFigureId: publicFigure1.id,
          topicId: topic1.id
        })
      )
      expect(mockSearchService.searchForEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          id: monitor2.id,
          userId: testUser2.id,
          publicFigureId: publicFigure2.id,
          topicId: topic2.id
        })
      )

      // Verify event processing
      expect(mockEventProcessor.processSearchResults).toHaveBeenCalledTimes(2)
      expect(mockEventProcessor.processSearchResults).toHaveBeenCalledWith(
        { events: [{ title: 'PM speaks on climate' }] },
        monitor1.id,
        publicFigure1.id,
        topic1.id
      )

      // Verify email was sent only for user1 (who had new events)
      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledTimes(1)
      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
        'user1@example.com',
        'User One',
        expect.arrayContaining([
          expect.objectContaining({
            id: event1.id,
            title: 'PM speaks on climate'
          })
        ])
      )

      // Verify lastDigestSentAt was updated in database
      const updatedUser = await prismaTest.user.findUnique({
        where: { id: testUser1.id }
      })
      expect(updatedUser?.lastDigestSentAt).toBeTruthy()
    })

    it('should handle search failures gracefully', async () => {
      // Mock search failure
      mockSearchService.searchForEvents.mockRejectedValue(new Error('Search failed'))

      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        monitorsProcessed: 2,
        emailsSent: 0
      })

      // Email should not be sent
      expect(mockEmailService.sendDailyDigest).not.toHaveBeenCalled()
    })

    it('should handle email failures gracefully', async () => {
      // Mock successful search and processing
      mockSearchService.searchForEvents.mockResolvedValue({
        events: [{ title: 'Event 1' }]
      })
      mockEventProcessor.processSearchResults.mockResolvedValue({ created: 1, skipped: 0 })

      // Create an event
      await prismaTest.event.create({
        data: {
          title: 'Event 1',
          summary: 'Test event',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date(),
          eventType: 'STATEMENT',
          sentiment: 'NEUTRAL',
          deduplicationHash: 'hash-' + Date.now() + '-2'
        }
      })

      // Mock email failure
      mockEmailService.sendDailyDigest.mockRejectedValue(new Error('Email failed'))

      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        monitorsProcessed: 2,
        emailsSent: 0
      })

      // lastDigestSentAt should NOT be updated due to email failure
      const user = await prismaTest.user.findUnique({
        where: { id: testUser1.id }
      })
      expect(user?.lastDigestSentAt).toBeNull()
    })

    it('should not send email if no new events', async () => {
      // Mock search with no results
      mockSearchService.searchForEvents.mockResolvedValue({
        events: []
      })
      mockEventProcessor.processSearchResults.mockResolvedValue({ created: 0, skipped: 0 })

      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        monitorsProcessed: 2,
        emailsSent: 0
      })

      // Email should not be sent
      expect(mockEmailService.sendDailyDigest).not.toHaveBeenCalled()
    })

    it('should handle inactive monitors correctly', async () => {
      // Deactivate monitor2
      await prismaTest.monitor.update({
        where: { id: monitor2.id },
        data: { isActive: false }
      })

      mockSearchService.searchForEvents.mockResolvedValue({
        events: [{ title: 'Event' }]
      })
      mockEventProcessor.processSearchResults.mockResolvedValue({ created: 1, skipped: 0 })

      // Create event for active monitor
      await prismaTest.event.create({
        data: {
          title: 'Event',
          summary: 'Test event',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date(),
          eventType: 'INTERVIEW',
          sentiment: 'POSITIVE',
          deduplicationHash: 'hash-' + Date.now() + '-3'
        }
      })

      // Make email service succeed for this test
      mockEmailService.sendDailyDigest.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        monitorsProcessed: 1, // Only one active monitor
        emailsSent: 1
      })

      // Search should only be called for active monitor
      expect(mockSearchService.searchForEvents).toHaveBeenCalledTimes(1)
      expect(mockSearchService.searchForEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          id: monitor1.id
        })
      )
    })

    it('should support force parameter to bypass date filtering', async () => {
      // Create an old event (yesterday)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const oldEvent = await prismaTest.event.create({
        data: {
          title: 'Old Event',
          summary: 'Event from yesterday',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: yesterday,
          eventType: 'DEBATE',
          sentiment: 'MIXED',
          deduplicationHash: 'hash-' + Date.now() + '-4',
          createdAt: yesterday
        }
      })

      mockSearchService.searchForEvents.mockResolvedValue({
        events: []
      })
      mockEventProcessor.processSearchResults.mockResolvedValue({ created: 1, skipped: 0 })
      
      // Make email service succeed for this test
      mockEmailService.sendDailyDigest.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/cron/causemon-daily?force=true', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.emailsSent).toBe(1)

      // Email should include the old event when force=true
      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
        'user1@example.com',
        'User One',
        expect.arrayContaining([
          expect.objectContaining({
            id: oldEvent.id,
            title: 'Old Event'
          })
        ])
      )
    })

    it('should handle multiple monitors per user', async () => {
      // Create another monitor for user1
      const additionalMonitor = await prismaTest.monitor.create({
        data: {
          userId: testUser1.id,
          publicFigureId: publicFigure2.id,
          topicId: topic2.id,
          isActive: true
        }
      })

      mockSearchService.searchForEvents.mockResolvedValue({
        events: [{ title: 'Event' }]
      })
      mockEventProcessor.processSearchResults.mockResolvedValue({ created: 1, skipped: 0 })

      // Create events for both of user1's monitors
      await prismaTest.event.create({
        data: {
          title: 'Climate Event',
          summary: 'Climate related',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date(),
          eventType: 'ANNOUNCEMENT',
          sentiment: 'POSITIVE',
          deduplicationHash: 'hash-' + Date.now() + '-5'
        }
      })

      await prismaTest.event.create({
        data: {
          title: 'Health Event',
          summary: 'Health related',
          publicFigureId: publicFigure2.id,
          topicId: topic2.id,
          eventDate: new Date(),
          eventType: 'POLICY',
          sentiment: 'POSITIVE',
          deduplicationHash: 'hash-' + Date.now() + '-6'
        }
      })
      
      // Make email service succeed for this test
      mockEmailService.sendDailyDigest.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
        headers: {
          Authorization: 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.monitorsProcessed).toBe(3) // 2 for user1, 1 for user2
      expect(data.emailsSent).toBe(2) // One email for user1, one for user2

      // Email should be sent twice - once for each user
      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledTimes(2)
      
      // Check user1's email contains events from both monitors
      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
        'user1@example.com',
        'User One',
        expect.arrayContaining([
          expect.objectContaining({ title: 'Climate Event' }),
          expect.objectContaining({ title: 'Health Event' })
        ])
      )
      
      // Check user2's email was also sent
      expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
        'user2@example.com',
        'User Two',
        expect.any(Array)
      )
    })
  })
})