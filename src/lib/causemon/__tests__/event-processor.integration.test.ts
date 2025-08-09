/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'

/**
 * Event Processor Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real events, articles, and monitors in test database
 *   - Tests actual deduplication with database constraints
 *   - Validates event processing with real data relationships
 *   - Verifies article creation and linking
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { EventProcessor } from '../event-processor'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'
import { createHash } from 'crypto'

describe('Event Processor Integration Tests', () => {
  let processor: EventProcessor
  let testUser: any
  let publicFigure: any
  let topic: any
  let monitor: any

  const mockSearchResult = {
    success: true,
    events: [
      {
        title: 'PM speaks on climate change',
        eventDate: '2024-01-15',
        summary: 'Prime Minister addresses climate action',
        quotes: ['We must act now', 'Climate change is real'],
        sources: [
          {
            url: 'https://example.com/article1',
            publisher: 'Example News',
            headline: 'PM Climate Speech',
          },
        ],
      },
      {
        title: 'PM announces new policy',
        eventDate: '2024-01-16',
        summary: 'New environmental policy announced',
        quotes: ['This is a game changer'],
        sources: [
          {
            url: 'https://example.com/article2',
            publisher: 'Daily News',
            headline: 'New Policy Announced',
          },
        ],
      },
    ],
  }

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    processor = new EventProcessor()
    
    // Create test data
    testUser = await createTestUser({
      name: 'Test User',
      email: 'test@example.com'
    })
    
    publicFigure = await prismaTest.publicFigure.create({
      data: {
        name: 'John Doe',
        title: 'Prime Minister',
        aliases: ['PM John Doe', 'J. Doe']
      }
    })
    
    topic = await prismaTest.topic.create({
      data: {
        name: 'Climate Change',
        keywords: ['climate', 'environment', 'carbon']
      }
    })
    
    monitor = await prismaTest.monitor.create({
      data: {
        userId: testUser.id,
        publicFigureId: publicFigure.id,
        topicId: topic.id,
        isActive: true
      }
    })
  })

  describe('processSearchResults', () => {
    it('should create new events from search results', async () => {
      const result = await processor.processSearchResults(
        mockSearchResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )

      expect(result.created).toBe(2)
      expect(result.skipped).toBe(0)
      expect(result.allEvents).toHaveLength(2)
      expect(result.allEvents[0].status).toBe('NEW')
      expect(result.allEvents[1].status).toBe('NEW')

      // Verify events were created in database
      const events = await prismaTest.event.findMany({
        where: {
          publicFigureId: publicFigure.id,
          topicId: topic.id
        }
      })
      expect(events).toHaveLength(2)
      expect(events[0].title).toBe('PM speaks on climate change')
      expect(events[1].title).toBe('PM announces new policy')
    })

    it('should create articles for event sources', async () => {
      await processor.processSearchResults(
        mockSearchResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )

      // Verify articles were created
      const articles = await prismaTest.article.findMany({
        include: {
          event: true
        }
      })
      
      expect(articles).toHaveLength(2)
      expect(articles[0].sourceUrl).toBe('https://example.com/article1')
      expect(articles[0].sourcePublisher).toBe('Example News')
      expect(articles[0].headline).toBe('PM Climate Speech')
      expect(articles[0].event.title).toBe('PM speaks on climate change')
      
      expect(articles[1].sourceUrl).toBe('https://example.com/article2')
      expect(articles[1].sourcePublisher).toBe('Daily News')
      expect(articles[1].headline).toBe('New Policy Announced')
      expect(articles[1].event.title).toBe('PM announces new policy')
    })

    it('should skip duplicate events based on deduplication hash', async () => {
      // Process once
      const firstResult = await processor.processSearchResults(
        mockSearchResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      expect(firstResult.created).toBe(2)
      expect(firstResult.skipped).toBe(0)
      
      // Process again with same data
      const secondResult = await processor.processSearchResults(
        mockSearchResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      expect(secondResult.created).toBe(0)
      expect(secondResult.skipped).toBe(2)
      expect(secondResult.allEvents).toHaveLength(2)
      expect(secondResult.allEvents[0].status).toBe('EXISTING')
      expect(secondResult.allEvents[1].status).toBe('EXISTING')
      
      // Verify only 2 events exist in database
      const events = await prismaTest.event.findMany()
      expect(events).toHaveLength(2)
    })

    it('should handle events with multiple sources', async () => {
      const multiSourceResult = {
        success: true,
        events: [
          {
            title: 'Major announcement',
            eventDate: '2024-02-01',
            summary: 'Important policy change',
            quotes: ['Quote 1', 'Quote 2'],
            sources: [
              {
                url: 'https://source1.com/article',
                publisher: 'Source 1',
                headline: 'Breaking: Major announcement',
              },
              {
                url: 'https://source2.com/news',
                publisher: 'Source 2',
                headline: 'Policy change announced',
              },
              {
                url: 'https://source3.com/story',
                publisher: 'Source 3',
                headline: 'Government update',
              },
            ],
          },
        ],
      }
      
      await processor.processSearchResults(
        multiSourceResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      // Verify one event with three articles
      const events = await prismaTest.event.findMany()
      expect(events).toHaveLength(1)
      
      const articles = await prismaTest.article.findMany({
        where: { eventId: events[0].id }
      })
      expect(articles).toHaveLength(3)
      expect(articles.map(a => a.sourceUrl)).toContain('https://source1.com/article')
      expect(articles.map(a => a.sourceUrl)).toContain('https://source2.com/news')
      expect(articles.map(a => a.sourceUrl)).toContain('https://source3.com/story')
    })

    it('should update monitor lastCheckedAt timestamp', async () => {
      const beforeCheck = await prismaTest.monitor.findUnique({
        where: { id: monitor.id }
      })
      expect(beforeCheck?.lastSearchedAt).toBeNull()
      
      await processor.processSearchResults(
        mockSearchResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      const afterCheck = await prismaTest.monitor.findUnique({
        where: { id: monitor.id }
      })
      expect(afterCheck?.lastSearchedAt).toBeDefined()
      expect(afterCheck?.lastSearchedAt).toBeInstanceOf(Date)
    })

    it('should handle empty search results', async () => {
      const emptyResult = {
        success: true,
        events: []
      }
      
      const result = await processor.processSearchResults(
        emptyResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      expect(result.created).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.allEvents).toHaveLength(0)
      
      // Monitor should still be updated
      const updatedMonitor = await prismaTest.monitor.findUnique({
        where: { id: monitor.id }
      })
      expect(updatedMonitor?.lastSearchedAt).toBeDefined()
    })

    it('should handle events with missing sources gracefully', async () => {
      const noSourceResult = {
        success: true,
        events: [
          {
            title: 'Event without sources',
            eventDate: '2024-03-01',
            summary: 'An event with no article sources',
            quotes: [],
            sources: []
          }
        ]
      }
      
      const result = await processor.processSearchResults(
        noSourceResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      expect(result.created).toBe(1)
      
      // Event should be created
      const events = await prismaTest.event.findMany()
      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Event without sources')
      
      // No articles should be created
      const articles = await prismaTest.article.findMany()
      expect(articles).toHaveLength(0)
    })

    it('should skip articles with duplicate URLs for the same event', async () => {
      const duplicateSourceResult = {
        success: true,
        events: [
          {
            title: 'Event with duplicate sources',
            eventDate: '2024-04-01',
            summary: 'Event with same URL twice',
            quotes: [],
            sources: [
              {
                url: 'https://duplicate.com/article',
                publisher: 'Publisher 1',
                headline: 'First headline',
              },
              {
                url: 'https://duplicate.com/article', // Same URL
                publisher: 'Publisher 2',
                headline: 'Different headline',
              },
            ],
          },
        ],
      }
      
      await processor.processSearchResults(
        duplicateSourceResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      // Only one article should be created despite two sources
      const articles = await prismaTest.article.findMany()
      expect(articles).toHaveLength(1)
      expect(articles[0].sourceUrl).toBe('https://duplicate.com/article')
    })

    it('should handle different events on the same day correctly', async () => {
      const sameDayResult = {
        success: true,
        events: [
          {
            title: 'Morning speech on climate',
            eventDate: '2024-05-01',
            summary: 'Morning address',
            quotes: [],
            sources: []
          },
          {
            title: 'Evening announcement on policy',
            eventDate: '2024-05-01', // Same date
            summary: 'Evening address',
            quotes: [],
            sources: []
          }
        ]
      }
      
      const result = await processor.processSearchResults(
        sameDayResult,
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      // Both events should be created as they have different titles
      expect(result.created).toBe(2)
      expect(result.skipped).toBe(0)
      
      const events = await prismaTest.event.findMany()
      expect(events).toHaveLength(2)
    })
  })

  describe('Hash validation through deduplication', () => {
    it('should deduplicate events with same normalized title', async () => {
      // Create event with one variation of title
      const result1 = await processor.processSearchResults(
        {
          success: true,
          events: [{
            title: 'PM Speaks on Climate!',
            eventDate: '2024-01-15',
            summary: 'First version',
            quotes: [],
            sources: []
          }]
        },
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      expect(result1.created).toBe(1)
      
      // Try to create with normalized version of same title
      const result2 = await processor.processSearchResults(
        {
          success: true,
          events: [{
            title: 'PM speaks on climate',
            eventDate: '2024-01-15',
            summary: 'Second version',
            quotes: [],
            sources: []
          }]
        },
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      // Should be deduplicated
      expect(result2.created).toBe(0)
      expect(result2.skipped).toBe(1)
    })

    it('should create different events for different dates', async () => {
      const result = await processor.processSearchResults(
        {
          success: true,
          events: [
            {
              title: 'Weekly Update',
              eventDate: '2024-01-15',
              summary: 'Week 1',
              quotes: [],
              sources: []
            },
            {
              title: 'Weekly Update',
              eventDate: '2024-01-22',
              summary: 'Week 2',
              quotes: [],
              sources: []
            }
          ]
        },
        monitor.id,
        publicFigure.id,
        topic.id
      )
      
      expect(result.created).toBe(2)
      expect(result.skipped).toBe(0)
    })
  })
})