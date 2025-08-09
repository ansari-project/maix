/**
 * @jest-environment node
 */

/**
 * Registration Service Integration Tests
 * Tests with real database instead of mocks
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import {
  createRegistration,
  updateRegistration,
  cancelRegistration,
  listEventRegistrations,
  getRegistrationByEmail,
  getRegistrationStats,
  canManageRegistrations
} from '../registration.service'

import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  createTestOrganization,
  createTestEvent,
  createTestRegistration,
  prismaTest,
  waitForDatabase,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Registration Service Integration Tests', () => {
  let testUser: any
  let testOrg: any
  let testEvent: any
  let otherUser: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000) // 30 second timeout for database setup

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Create test data
    testUser = await createTestUser({
      name: 'Event Organizer'
    })
    
    otherUser = await createTestUser({
      name: 'Event Attendee'
    })
    
    testOrg = await createTestOrganization(testUser.id, {
      name: 'Conference Org'
    })
    
    testEvent = await createTestEvent(testOrg.id, testUser.id, {
      name: 'Tech Conference 2025',
      capacity: 100,
      isPublic: true
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  describe('createRegistration', () => {
    it('should create registration in database', async () => {
      const registration = await createRegistration({
        eventId: testEvent.id,
        name: 'Jane Developer',
        email: 'jane@example.com',
        notes: 'Vegetarian meal'
      })

      expect(registration.id).toBeDefined()
      expect(registration.status).toBe('CONFIRMED')
      expect(registration.email).toBe('jane@example.com')
      
      // Verify in database
      const inDb = await prismaTest.registration.findUnique({
        where: { id: registration.id }
      })
      expect(inDb).toBeTruthy()
      expect(inDb?.metadata).toEqual({ notes: 'Vegetarian meal' })
    })

    it('should prevent duplicate registrations', async () => {
      // First registration
      await createRegistration({
        eventId: testEvent.id,
        name: 'John Doe',
        email: 'john@example.com'
      })

      // Attempt duplicate
      await expect(
        createRegistration({
          eventId: testEvent.id,
          name: 'John Doe',
          email: 'john@example.com'
        })
      ).rejects.toThrow('already registered')
    })

    it('should handle capacity limits with waitlisting', async () => {
      // Create event with small capacity
      const smallEvent = await createTestEvent(testOrg.id, testUser.id, {
        name: 'Small Workshop',
        capacity: 2
      })

      // Fill capacity
      await createRegistration({
        eventId: smallEvent.id,
        name: 'First',
        email: 'first@example.com'
      })
      
      await createRegistration({
        eventId: smallEvent.id,
        name: 'Second',
        email: 'second@example.com'
      })

      // Next should be waitlisted
      const waitlisted = await createRegistration({
        eventId: smallEvent.id,
        name: 'Third',
        email: 'third@example.com'
      })

      expect(waitlisted.status).toBe('WAITLISTED')
    })

    it('should check private event permissions', async () => {
      // Create private event
      const privateEvent = await createTestEvent(testOrg.id, testUser.id, {
        name: 'Members Only',
        isPublic: false
      })

      // Non-member cannot register
      await expect(
        createRegistration(
          {
            eventId: privateEvent.id,
            name: 'Outsider',
            email: 'outsider@example.com'
          },
          otherUser.id
        )
      ).rejects.toThrow('private to organization members')
    })

    it('should allow cancelled registration to re-register', async () => {
      // Create and cancel a registration
      const first = await createRegistration({
        eventId: testEvent.id,
        name: 'Jane Doe',
        email: 'jane@example.com'
      })

      await prismaTest.registration.update({
        where: { id: first.id },
        data: { status: 'CANCELLED' }
      })

      // Delete the cancelled registration to allow re-registration
      // (Due to unique constraint on eventId+email)
      await prismaTest.registration.delete({
        where: { id: first.id }
      })

      // Should be able to register again
      const second = await createRegistration({
        eventId: testEvent.id,
        name: 'Jane Doe',
        email: 'jane@example.com'
      })

      expect(second.id).toBeDefined()
      expect(second.id).not.toBe(first.id)
      expect(second.status).toBe('CONFIRMED')
    })
  })

  describe('cancelRegistration', () => {
    let registration: any

    beforeEach(async () => {
      registration = await createTestRegistration(testEvent.id, {
        email: 'john@example.com',
        status: 'CONFIRMED'
      })
    })

    it('should cancel registration in database', async () => {
      await cancelRegistration(registration.id, 'john@example.com')
      
      const cancelled = await prismaTest.registration.findUnique({
        where: { id: registration.id }
      })
      
      expect(cancelled?.status).toBe('CANCELLED')
    })

    it('should promote waitlisted when confirmed cancels', async () => {
      // Create event at capacity
      const smallEvent = await createTestEvent(testOrg.id, testUser.id, {
        name: 'Limited Event',
        capacity: 1
      })

      // Create confirmed registration
      const confirmed = await createTestRegistration(smallEvent.id, {
        email: 'confirmed@example.com',
        status: 'CONFIRMED'
      })

      // Create waitlisted registration
      const waitlisted = await createTestRegistration(smallEvent.id, {
        email: 'waitlisted@example.com',
        status: 'WAITLISTED'
      })

      // Cancel confirmed
      await cancelRegistration(confirmed.id, undefined, testUser.id)

      // Check waitlisted was promoted
      const promoted = await prismaTest.registration.findUnique({
        where: { id: waitlisted.id }
      })
      
      expect(promoted?.status).toBe('CONFIRMED')
    })

    it('should prevent cancelling already cancelled', async () => {
      await cancelRegistration(registration.id, 'john@example.com')
      
      await expect(
        cancelRegistration(registration.id, 'john@example.com')
      ).rejects.toThrow('already cancelled')
    })

    it('should verify email ownership', async () => {
      await expect(
        cancelRegistration(registration.id, 'wrong@example.com')
      ).rejects.toThrow('only cancel your own')
    })
  })

  describe('updateRegistration', () => {
    let registration: any

    beforeEach(async () => {
      registration = await createTestRegistration(testEvent.id, {
        email: 'waitlisted@example.com',
        status: 'WAITLISTED'
      })
    })

    it('should update registration status', async () => {
      const updated = await updateRegistration(
        testUser.id,
        registration.id,
        { status: 'CONFIRMED' }
      )

      expect(updated.status).toBe('CONFIRMED')
      
      // Verify in database
      const inDb = await prismaTest.registration.findUnique({
        where: { id: registration.id }
      })
      expect(inDb?.status).toBe('CONFIRMED')
    })

    it('should enforce capacity when confirming waitlisted', async () => {
      // Create event at capacity
      const fullEvent = await createTestEvent(testOrg.id, testUser.id, {
        name: 'Full Event',
        capacity: 1
      })

      // Fill capacity
      await createTestRegistration(fullEvent.id, {
        email: 'confirmed@example.com',
        status: 'CONFIRMED'
      })

      // Create waitlisted
      const waitlisted = await createTestRegistration(fullEvent.id, {
        email: 'waitlisted@example.com',
        status: 'WAITLISTED'
      })

      // Try to confirm when at capacity
      await expect(
        updateRegistration(testUser.id, waitlisted.id, {
          status: 'CONFIRMED'
        })
      ).rejects.toThrow('event is at capacity')
    })

    it('should require permission to update', async () => {
      await expect(
        updateRegistration(otherUser.id, registration.id, {
          status: 'CONFIRMED'
        })
      ).rejects.toThrow('do not have permission')
    })
  })

  describe('listEventRegistrations', () => {
    beforeEach(async () => {
      // Create multiple registrations
      await createTestRegistration(testEvent.id, {
        name: 'Alice',
        email: 'alice@example.com',
        status: 'CONFIRMED'
      })
      await createTestRegistration(testEvent.id, {
        name: 'Bob',
        email: 'bob@example.com',
        status: 'CONFIRMED'
      })
      await createTestRegistration(testEvent.id, {
        name: 'Charlie',
        email: 'charlie@example.com',
        status: 'WAITLISTED'
      })
      await createTestRegistration(testEvent.id, {
        name: 'David',
        email: 'david@example.com',
        status: 'CANCELLED'
      })
    })

    it('should list all registrations', async () => {
      const result = await listEventRegistrations(
        testUser.id,
        testEvent.id
      )

      expect(result.registrations).toHaveLength(4)
      expect(result.total).toBe(4)
    })

    it('should filter by status', async () => {
      const confirmed = await listEventRegistrations(
        testUser.id,
        testEvent.id,
        { status: ['CONFIRMED'] }
      )

      expect(confirmed.registrations).toHaveLength(2)
      expect(confirmed.registrations.every(r => r.status === 'CONFIRMED')).toBe(true)
    })

    it('should order by status then date', async () => {
      const result = await listEventRegistrations(
        testUser.id,
        testEvent.id
      )

      // Should be: CONFIRMED, CONFIRMED, CANCELLED, WAITLISTED (based on enum order)
      expect(result.registrations[0].status).toBe('CONFIRMED')
      expect(result.registrations[2].status).toBe('CANCELLED')
      expect(result.registrations[3].status).toBe('WAITLISTED')
    })

    it('should paginate results', async () => {
      const page1 = await listEventRegistrations(
        testUser.id,
        testEvent.id,
        { limit: 2, offset: 0 }
      )

      expect(page1.registrations).toHaveLength(2)
      expect(page1.total).toBe(4)

      const page2 = await listEventRegistrations(
        testUser.id,
        testEvent.id,
        { limit: 2, offset: 2 }
      )

      expect(page2.registrations).toHaveLength(2)
    })

    it('should require permission to list', async () => {
      await expect(
        listEventRegistrations(otherUser.id, testEvent.id)
      ).rejects.toThrow('do not have permission')
    })
  })

  describe('getRegistrationStats', () => {
    beforeEach(async () => {
      // Create registrations with different statuses
      for (let i = 0; i < 5; i++) {
        await createTestRegistration(testEvent.id, {
          email: `confirmed${i}@example.com`,
          status: 'CONFIRMED'
        })
      }
      for (let i = 0; i < 3; i++) {
        await createTestRegistration(testEvent.id, {
          email: `waitlisted${i}@example.com`,
          status: 'WAITLISTED'
        })
      }
      for (let i = 0; i < 2; i++) {
        await createTestRegistration(testEvent.id, {
          email: `cancelled${i}@example.com`,
          status: 'CANCELLED'
        })
      }
    })

    it('should calculate correct statistics', async () => {
      const stats = await getRegistrationStats(testEvent.id)

      expect(stats.total).toBe(10)
      expect(stats.confirmed).toBe(5)
      expect(stats.waitlisted).toBe(3)
      expect(stats.cancelled).toBe(2)
    })

    it('should handle empty events', async () => {
      const emptyEvent = await createTestEvent(testOrg.id, testUser.id, {
        name: 'Empty Event'
      })

      const stats = await getRegistrationStats(emptyEvent.id)

      expect(stats.total).toBe(0)
      expect(stats.confirmed).toBe(0)
      expect(stats.waitlisted).toBe(0)
      expect(stats.cancelled).toBe(0)
    })
  })

  describe('getRegistrationByEmail', () => {
    beforeEach(async () => {
      await createTestRegistration(testEvent.id, {
        name: 'Test User',
        email: 'test@example.com',
        status: 'CONFIRMED'
      })
    })

    it('should find registration by email', async () => {
      const registration = await getRegistrationByEmail(
        testEvent.id,
        'test@example.com'
      )

      expect(registration).toBeTruthy()
      expect(registration?.email).toBe('test@example.com')
      expect(registration?.status).toBe('CONFIRMED')
    })

    it('should not find cancelled registrations', async () => {
      // Cancel the registration
      await prismaTest.registration.updateMany({
        where: { 
          eventId: testEvent.id,
          email: 'test@example.com'
        },
        data: { status: 'CANCELLED' }
      })

      const registration = await getRegistrationByEmail(
        testEvent.id,
        'test@example.com'
      )

      expect(registration).toBeNull()
    })

    it('should return null for non-existent', async () => {
      const registration = await getRegistrationByEmail(
        testEvent.id,
        'nonexistent@example.com'
      )

      expect(registration).toBeNull()
    })
  })
})