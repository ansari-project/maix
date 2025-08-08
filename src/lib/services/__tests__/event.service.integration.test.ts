/**
 * @jest-environment node
 */

/**
 * Event Service Integration Tests
 * Tests with real database instead of mocks
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  listPublicEvents,
  listOrganizationEvents,
  canManageEvents,
  canViewEvent
} from '../event.service'

import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  createTestOrganization,
  createTestEvent,
  prismaTest,
  waitForDatabase,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Event Service Integration Tests', () => {
  let testUser: any
  let testOrg: any
  let otherUser: any

  beforeAll(async () => {
    // Setup test database once
    await setupTestDatabase()
  }, 30000) // 30 second timeout for database setup

  beforeEach(async () => {
    // Clean data before each test
    await cleanupTestDatabase()
    
    // Create test data
    testUser = await createTestUser({
      name: 'Event Organizer'
    })
    
    otherUser = await createTestUser({
      name: 'Other User'
    })
    
    testOrg = await createTestOrganization(testUser.id, {
      name: 'Tech Events Org',
      slug: 'tech-events'
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  describe('createEvent', () => {
    it('should create an event with real database', async () => {
      const eventData = {
        organizationId: testOrg.id,
        name: 'AI Workshop',
        description: 'Learn about AI and ML',
        date: '2025-10-15T14:00:00Z',
        capacity: 30,
        isPublic: true,
        venueJson: {
          name: 'Tech Hub',
          address: '123 Main St'
        }
      }

      const event = await createEvent(testUser.id, eventData)

      // Verify the event was actually created in database
      expect(event.id).toBeDefined()
      expect(event.name).toBe('AI Workshop')
      expect(event.organizationId).toBe(testOrg.id)
      expect(event.createdBy).toBe(testUser.id)
      
      // Verify we can retrieve it
      const retrieved = await prismaTest.maixEvent.findUnique({
        where: { id: event.id }
      })
      expect(retrieved).toBeTruthy()
      expect(retrieved?.name).toBe('AI Workshop')
    })

    it('should enforce organization membership', async () => {
      const eventData = {
        organizationId: testOrg.id,
        name: 'Private Event',
        description: 'Members only',
        date: '2025-10-20T18:00:00Z'
      }

      // Other user is not a member
      await expect(
        createEvent(otherUser.id, eventData)
      ).rejects.toThrow('You do not have permission')
    })

    it('should handle database constraints', async () => {
      const eventData = {
        organizationId: 'non-existent-org',
        name: 'Test Event',
        description: 'Test',
        date: '2025-10-15T14:00:00Z'
      }

      await expect(
        createEvent(testUser.id, eventData)
      ).rejects.toThrow()
    })
  })

  describe('updateEvent', () => {
    let testEvent: any

    beforeEach(async () => {
      testEvent = await createTestEvent(testOrg.id, testUser.id, {
        name: 'Original Event',
        capacity: 50
      })
    })

    it('should update event in database', async () => {
      const updates = {
        name: 'Updated Event Name',
        capacity: 100
      }

      const updated = await updateEvent(testUser.id, testEvent.id, updates)
      
      expect(updated.name).toBe('Updated Event Name')
      expect(updated.capacity).toBe(100)
      
      // Verify in database
      const inDb = await prismaTest.maixEvent.findUnique({
        where: { id: testEvent.id }
      })
      expect(inDb?.name).toBe('Updated Event Name')
      expect(inDb?.capacity).toBe(100)
    })

    it('should prevent unauthorized updates', async () => {
      await expect(
        updateEvent(otherUser.id, testEvent.id, { name: 'Hacked' })
      ).rejects.toThrow('You do not have permission')
    })
  })

  describe('deleteEvent', () => {
    let testEvent: any

    beforeEach(async () => {
      testEvent = await createTestEvent(testOrg.id, testUser.id)
    })

    it('should delete event from database', async () => {
      await deleteEvent(testUser.id, testEvent.id)
      
      const deleted = await prismaTest.maixEvent.findUnique({
        where: { id: testEvent.id }
      })
      expect(deleted).toBeNull()
    })

    it('should cascade delete registrations', async () => {
      // Create registrations
      await prismaTest.registration.create({
        data: {
          eventId: testEvent.id,
          name: 'John Doe',
          email: 'john@example.com',
          status: 'CONFIRMED'
        }
      })

      // Cancel the event first (required before deletion with registrations)
      await prismaTest.maixEvent.update({
        where: { id: testEvent.id },
        data: { status: 'CANCELLED' }
      })

      await deleteEvent(testUser.id, testEvent.id)
      
      // Check registrations are deleted
      const registrations = await prismaTest.registration.findMany({
        where: { eventId: testEvent.id }
      })
      expect(registrations).toHaveLength(0)
    })
  })

  describe('listOrganizationEvents', () => {
    beforeEach(async () => {
      // Create multiple events
      await createTestEvent(testOrg.id, testUser.id, {
        name: 'Event 1',
        date: new Date('2025-09-01')
      })
      await createTestEvent(testOrg.id, testUser.id, {
        name: 'Event 2',
        date: new Date('2025-09-15')
      })
      await createTestEvent(testOrg.id, testUser.id, {
        name: 'Event 3',
        date: new Date('2025-10-01')
      })
    })

    it('should list all events for organization member', async () => {
      const result = await listOrganizationEvents(testUser.id, testOrg.id, {
      })

      expect(result.events).toHaveLength(3)
      expect(result.total).toBe(3)
    })

    it('should filter upcoming events', async () => {
      const result = await listOrganizationEvents(testUser.id, testOrg.id, {
        upcoming: true
      })

      expect(result.events).toHaveLength(3)
      expect(result.events[0].name).toBe('Event 1') // Earliest first
    })

    it('should paginate results', async () => {
      const page1 = await listOrganizationEvents(testUser.id, testOrg.id, {
        limit: 2,
        offset: 0
      })

      expect(page1.events).toHaveLength(2)
      expect(page1.total).toBe(3)

      const page2 = await listOrganizationEvents(testUser.id, testOrg.id, {
        limit: 2,
        offset: 2
      })

      expect(page2.events).toHaveLength(1)
      expect(page2.total).toBe(3)
    })
  })

  describe('listPublicEvents', () => {
    beforeEach(async () => {
      // Create mix of public and private events
      await createTestEvent(testOrg.id, testUser.id, {
        name: 'Public Event',
        isPublic: true
      })
      await createTestEvent(testOrg.id, testUser.id, {
        name: 'Private Event',
        isPublic: false
      })
    })

    it('should only return public events', async () => {
      const result = await listPublicEvents()

      expect(result.events).toHaveLength(1)
      expect(result.events[0].name).toBe('Public Event')
    })

    it('should work without authentication', async () => {
      // This simulates an unauthenticated request
      const result = await listPublicEvents()
      
      expect(result.events).toBeDefined()
      expect(result.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('canManageEvents', () => {
    let testEvent: any

    beforeEach(async () => {
      testEvent = await createTestEvent(testOrg.id, testUser.id)
    })

    it('should allow organization members to manage', async () => {
      const canManage = await canManageEvents(testUser.id, testOrg.id)
      expect(canManage).toBe(true)
    })

    it('should deny non-members', async () => {
      const canManage = await canManageEvents(otherUser.id, testOrg.id)
      expect(canManage).toBe(false)
    })

    it('should handle non-existent organizations', async () => {
      const canManage = await canManageEvents(testUser.id, 'non-existent')
      expect(canManage).toBe(false)
    })
  })

  describe('Transaction handling', () => {
    it('should rollback on error', async () => {
      const eventData = {
        organizationId: testOrg.id,
        name: 'Transaction Test',
        description: 'Testing rollback',
        date: '2025-10-15T14:00:00Z'
      }

      // Mock an error during event creation
      const originalCreate = prismaTest.maixEvent.create
      prismaTest.maixEvent.create = jest.fn().mockRejectedValueOnce(new Error('DB Error'))

      await expect(
        createEvent(testUser.id, eventData)
      ).rejects.toThrow()

      // Restore original function
      prismaTest.maixEvent.create = originalCreate

      // Verify no partial data was saved
      const events = await prismaTest.maixEvent.findMany({
        where: { name: 'Transaction Test' }
      })
      expect(events).toHaveLength(0)
    })
  })
})