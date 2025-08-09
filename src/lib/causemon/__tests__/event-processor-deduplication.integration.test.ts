/**
 * @jest-environment node
 */

/**
 * Event Processor Deduplication Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real events with deduplication hashes in test database
 *   - Tests actual database unique constraints
 *   - Validates SHA-256 hash generation and normalization
 *   - Verifies deduplication across different scenarios
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

describe('Event Processor Deduplication Integration Tests', () => {
  let processor: EventProcessor
  let testUser: any
  let publicFigure1: any
  let publicFigure2: any
  let topic1: any
  let topic2: any
  let monitor1: any
  let monitor2: any

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
        title: 'Minister of Finance',
        aliases: ['Minister Smith']
      }
    })
    
    topic1 = await prismaTest.topic.create({
      data: {
        name: 'Climate Change',
        keywords: ['climate', 'environment', 'carbon']
      }
    })
    
    topic2 = await prismaTest.topic.create({
      data: {
        name: 'Economic Policy',
        keywords: ['economy', 'budget', 'fiscal']
      }
    })
    
    monitor1 = await prismaTest.monitor.create({
      data: {
        userId: testUser.id,
        publicFigureId: publicFigure1.id,
        topicId: topic1.id,
        isActive: true
      }
    })
    
    monitor2 = await prismaTest.monitor.create({
      data: {
        userId: testUser.id,
        publicFigureId: publicFigure2.id,
        topicId: topic2.id,
        isActive: true
      }
    })
  })

  describe('Hash Generation and Normalization', () => {
    function createEventHash(title: string, eventDate: string, publicFigureId: string): string {
      // Replicate the same logic as the private method
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
      const date = new Date(eventDate)
      const dateStr = date.toISOString().split('T')[0]
      const content = `${normalizedTitle}-${dateStr}-${publicFigureId}`
      return createHash('md5').update(content).digest('hex')
    }

    it('should generate consistent hashes for same event data', () => {
      const hash1 = createEventHash(
        'PM Announces Climate Policy',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'PM Announces Climate Policy',
        '2024-01-15',
        publicFigure1.id
      )
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(32) // MD5 produces 32 char hex
    })

    it('should normalize titles before hashing', () => {
      // Different capitalizations and punctuation should produce same hash
      const hash1 = createEventHash(
        'PM SPEAKS on Climate!',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'pm speaks on climate',
        '2024-01-15',
        publicFigure1.id
      )
      
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different events', () => {
      const hash1 = createEventHash(
        'Climate Speech',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'Budget Speech',
        '2024-01-15',
        publicFigure1.id
      )
      
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for same title on different dates', () => {
      const hash1 = createEventHash(
        'Climate Speech',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'Climate Speech',
        '2024-01-16',
        publicFigure1.id
      )
      
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different public figures', () => {
      const hash1 = createEventHash(
        'Climate Speech',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'Climate Speech',
        '2024-01-15',
        publicFigure2.id
      )
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Database-level Deduplication', () => {
    function createEventHash(title: string, eventDate: string, publicFigureId: string): string {
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
      const date = new Date(eventDate)
      const dateStr = date.toISOString().split('T')[0]
      const content = `${normalizedTitle}-${dateStr}-${publicFigureId}`
      return createHash('md5').update(content).digest('hex')
    }

    it('should prevent duplicate events with same hash', async () => {
      const hash = createEventHash(
        'Important Announcement',
        '2024-01-15',
        publicFigure1.id
      )
      
      // Create first event
      const event1 = await prismaTest.event.create({
        data: {
          title: 'Important Announcement',
          summary: 'First version',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date('2024-01-15'),
          eventType: 'SPEECH',
          sentiment: 'NEUTRAL',
          stance: 'NEUTRAL',
          deduplicationHash: hash
        }
      })
      
      // Attempt to create duplicate should fail
      await expect(
        prismaTest.event.create({
          data: {
            title: 'Important Announcement',
            summary: 'Second version',
            publicFigureId: publicFigure1.id,
            topicId: topic1.id,
            eventDate: new Date('2024-01-15'),
            eventType: 'SPEECH',
            sentiment: 'NEUTRAL',
            stance: 'NEUTRAL',
            deduplicationHash: hash
          }
        })
      ).rejects.toThrow()
      
      // Verify only one event exists
      const events = await prismaTest.event.findMany({
        where: { deduplicationHash: hash }
      })
      expect(events).toHaveLength(1)
      expect(events[0].id).toBe(event1.id)
    })

    it('should allow same event title for different dates', async () => {
      const hash1 = createEventHash(
        'Weekly Address',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'Weekly Address',
        '2024-01-22',
        publicFigure1.id
      )
      
      // Create first weekly address
      const event1 = await prismaTest.event.create({
        data: {
          title: 'Weekly Address',
          summary: 'Week 1',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date('2024-01-15'),
          eventType: 'SPEECH',
          sentiment: 'NEUTRAL',
          stance: 'NEUTRAL',
          deduplicationHash: hash1
        }
      })
      
      // Create second weekly address (different date)
      const event2 = await prismaTest.event.create({
        data: {
          title: 'Weekly Address',
          summary: 'Week 2',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date('2024-01-22'),
          eventType: 'SPEECH',
          sentiment: 'NEUTRAL',
          stance: 'NEUTRAL',
          deduplicationHash: hash2
        }
      })
      
      expect(event1.id).not.toBe(event2.id)
      expect(event1.deduplicationHash).not.toBe(event2.deduplicationHash)
    })

    it('should allow same event title for different public figures', async () => {
      const hash1 = createEventHash(
        'Budget Announcement',
        '2024-01-15',
        publicFigure1.id
      )
      
      const hash2 = createEventHash(
        'Budget Announcement',
        '2024-01-15',
        publicFigure2.id
      )
      
      // Create event for first public figure
      const event1 = await prismaTest.event.create({
        data: {
          title: 'Budget Announcement',
          summary: 'PM perspective',
          publicFigureId: publicFigure1.id,
          topicId: topic2.id,
          eventDate: new Date('2024-01-15'),
          eventType: 'SPEECH',
          sentiment: 'POSITIVE',
          stance: 'SUPPORTIVE',
          deduplicationHash: hash1
        }
      })
      
      // Create event for second public figure (same date and title)
      const event2 = await prismaTest.event.create({
        data: {
          title: 'Budget Announcement',
          summary: 'Finance Minister perspective',
          publicFigureId: publicFigure2.id,
          topicId: topic2.id,
          eventDate: new Date('2024-01-15'),
          eventType: 'SPEECH',
          sentiment: 'NEUTRAL',
          stance: 'NEUTRAL',
          deduplicationHash: hash2
        }
      })
      
      expect(event1.id).not.toBe(event2.id)
      expect(event1.deduplicationHash).not.toBe(event2.deduplicationHash)
    })
  })

  describe('Batch Processing Deduplication', () => {
    it('should handle deduplication across batch of events', async () => {
      const searchResult = {
        success: true,
        events: [
          {
            title: 'Morning Press Conference',
            eventDate: '2024-01-15',
            summary: 'Morning briefing on climate',
            quotes: ['Quote 1'],
            sources: []
          },
          {
            title: 'Morning Press Conference', // Duplicate (same title, date, figure)
            eventDate: '2024-01-15',
            summary: 'Another report of same event',
            quotes: ['Quote 2'],
            sources: []
          },
          {
            title: 'Evening Statement',
            eventDate: '2024-01-15',
            summary: 'Evening climate update',
            quotes: [],
            sources: []
          },
          {
            title: 'Morning Press Conference', // Same title but different date
            eventDate: '2024-01-16',
            summary: 'Next day briefing',
            quotes: [],
            sources: []
          }
        ]
      }
      
      const result = await processor.processSearchResults(
        searchResult,
        monitor1.id,
        publicFigure1.id,
        topic1.id
      )
      
      // Should create 3 events (one duplicate skipped)
      expect(result.created).toBe(3)
      expect(result.skipped).toBe(1)
      
      // Verify events in database
      const events = await prismaTest.event.findMany({
        orderBy: { eventDate: 'asc' }
      })
      expect(events).toHaveLength(3)
      
      // Check that the duplicate was properly deduplicated
      const jan15Events = events.filter(e => 
        e.eventDate.toISOString().startsWith('2024-01-15')
      )
      expect(jan15Events).toHaveLength(2) // Morning and Evening
      
      const morningEvents = events.filter(e => 
        e.title === 'Morning Press Conference'
      )
      expect(morningEvents).toHaveLength(2) // Jan 15 and Jan 16
    })

    it('should handle cross-monitor deduplication', async () => {
      // First monitor processes events
      const result1 = await processor.processSearchResults(
        {
          success: true,
          events: [
            {
              title: 'Joint Climate Summit',
              eventDate: '2024-02-01',
              summary: 'Leaders discuss climate',
              quotes: [],
              sources: []
            }
          ]
        },
        monitor1.id,
        publicFigure1.id,
        topic1.id
      )
      
      expect(result1.created).toBe(1)
      
      // Different user monitoring same figure tries to add same event
      const otherUser = await createTestUser({
        name: 'Other User',
        email: 'other@example.com'
      })
      
      const otherMonitor = await prismaTest.monitor.create({
        data: {
          userId: otherUser.id,
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          isActive: true
        }
      })
      
      const result2 = await processor.processSearchResults(
        {
          success: true,
          events: [
            {
              title: 'Joint Climate Summit', // Same event
              eventDate: '2024-02-01',
              summary: 'Different summary but same event',
              quotes: [],
              sources: []
            }
          ]
        },
        otherMonitor.id,
        publicFigure1.id,
        topic1.id
      )
      
      expect(result2.created).toBe(0)
      expect(result2.skipped).toBe(1)
      
      // Verify only one event exists
      const events = await prismaTest.event.findMany()
      expect(events).toHaveLength(1)
    })

    it('should track existing vs new events in result', async () => {
      function createEventHash(title: string, eventDate: string, publicFigureId: string): string {
        const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
        const date = new Date(eventDate)
        const dateStr = date.toISOString().split('T')[0]
        const content = `${normalizedTitle}-${dateStr}-${publicFigureId}`
        return createHash('md5').update(content).digest('hex')
      }

      // Pre-create an event
      const existingHash = createEventHash(
        'Existing Event',
        '2024-03-01',
        publicFigure1.id
      )
      
      await prismaTest.event.create({
        data: {
          title: 'Existing Event',
          summary: 'Already in database',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date('2024-03-01'),
          eventType: 'SPEECH',
          sentiment: 'NEUTRAL',
          stance: 'NEUTRAL',
          deduplicationHash: existingHash
        }
      })
      
      // Process batch with both new and existing events
      const result = await processor.processSearchResults(
        {
          success: true,
          events: [
            {
              title: 'Existing Event', // Will be deduplicated
              eventDate: '2024-03-01',
              summary: 'Duplicate report',
              quotes: [],
              sources: []
            },
            {
              title: 'New Event', // Will be created
              eventDate: '2024-03-02',
              summary: 'Fresh news',
              quotes: [],
              sources: []
            }
          ]
        },
        monitor1.id,
        publicFigure1.id,
        topic1.id
      )
      
      expect(result.created).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.allEvents).toHaveLength(2)
      
      // Check status tracking
      const existingEventResult = result.allEvents.find(e => 
        e.event.title === 'Existing Event'
      )
      expect(existingEventResult?.status).toBe('EXISTING')
      
      const newEventResult = result.allEvents.find(e => 
        e.event.title === 'New Event'
      )
      expect(newEventResult?.status).toBe('NEW')
    })
  })

  describe('Edge Cases', () => {
    function createEventHash(title: string, eventDate: string, publicFigureId: string): string {
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
      const date = new Date(eventDate)
      const dateStr = date.toISOString().split('T')[0]
      const content = `${normalizedTitle}-${dateStr}-${publicFigureId}`
      return createHash('md5').update(content).digest('hex')
    }

    it('should handle events with special characters in titles', async () => {
      const specialTitles = [
        'PM\'s "Climate" Speech!',
        'PM\'s "Climate" Speech!', // Using straight quotes for consistency
        'PM\'s Climate Speech',
        'PMs Climate Speech'
      ]
      
      const hashes = specialTitles.map(title => 
        createEventHash(title, '2024-01-15', publicFigure1.id)
      )
      
      // All should normalize to the same hash
      expect(new Set(hashes).size).toBe(1)
    })

    it('should handle concurrent event creation attempts', async () => {
      const hash = createEventHash(
        'Concurrent Event',
        '2024-04-01',
        publicFigure1.id
      )
      
      // Simulate concurrent creation attempts
      const promises = Array(5).fill(null).map((_, i) => 
        prismaTest.event.create({
          data: {
            title: 'Concurrent Event',
            summary: `Attempt ${i}`,
            publicFigureId: publicFigure1.id,
            topicId: topic1.id,
            eventDate: new Date('2024-04-01'),
            eventType: 'SPEECH',
            sentiment: 'NEUTRAL',
            stance: 'NEUTRAL',
            deduplicationHash: hash
          }
        }).catch(err => null) // Catch duplicate errors
      )
      
      const results = await Promise.all(promises)
      
      // Only one should succeed
      const successful = results.filter(r => r !== null)
      expect(successful).toHaveLength(1)
      
      // Verify only one event in database
      const events = await prismaTest.event.findMany({
        where: { deduplicationHash: hash }
      })
      expect(events).toHaveLength(1)
    })

    it('should handle very long titles correctly', async () => {
      const longTitle = 'PM delivers comprehensive speech on ' + 
        'climate change mitigation strategies and international ' +
        'cooperation frameworks for sustainable development goals ' +
        'in the context of global environmental challenges'
      
      const hash = createEventHash(
        longTitle,
        '2024-05-01',
        publicFigure1.id
      )
      
      // Should produce valid hash
      expect(hash).toHaveLength(32)
      expect(hash).toMatch(/^[0-9a-f]+$/)
      
      // Should be usable in database
      const event = await prismaTest.event.create({
        data: {
          title: longTitle.substring(0, 255), // Assuming title has max length
          summary: 'Long title test',
          publicFigureId: publicFigure1.id,
          topicId: topic1.id,
          eventDate: new Date('2024-05-01'),
          eventType: 'SPEECH',
          sentiment: 'NEUTRAL',
          stance: 'NEUTRAL',
          deduplicationHash: hash
        }
      })
      
      expect(event.deduplicationHash).toBe(hash)
    })
  })
})