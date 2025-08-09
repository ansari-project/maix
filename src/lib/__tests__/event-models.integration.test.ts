/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'

/**
 * Event Manager Models Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real events, registrations, and conversations in test database
 *   - Tests actual database constraints and relationships
 *   - Validates enum values and JSON fields with real data
 *   - Verifies foreign key relationships and cascade deletes
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { TodoStatus, MaixEventStatus, RegistrationStatus } from '@prisma/client'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Event Manager Models Integration Tests - Phase 1', () => {
  let testOrg: any
  let testUser: any
  let testEvent: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Create test user
    testUser = await createTestUser({
      name: 'Event Organizer',
      email: 'organizer@example.com'
    })
    
    // Create test organization with owner member
    testOrg = await prismaTest.organization.create({
      data: {
        name: 'Tech Events Org',
        slug: 'tech-events-' + Date.now(),
        description: 'Organization for tech events',
        members: {
          create: {
            userId: testUser.id,
            role: 'OWNER'
          }
        }
      }
    })
  })

  describe('MaixEvent Model', () => {
    it('should create a new event with all required fields', async () => {
      const eventDate = new Date('2025-03-15')
      
      testEvent = await prismaTest.maixEvent.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Tech Meetup',
          description: 'A test event for the Event Manager',
          date: eventDate,
          capacity: 50,
          status: MaixEventStatus.DRAFT,
          isPublic: true,
          createdBy: testUser.id
        }
      })
      
      expect(testEvent).toBeDefined()
      expect(testEvent.id).toBeTruthy()
      expect(testEvent.name).toBe('Test Tech Meetup')
      expect(testEvent.status).toBe(MaixEventStatus.DRAFT)
      expect(testEvent.isPublic).toBe(true)
      expect(testEvent.capacity).toBe(50)
      expect(testEvent.organizationId).toBe(testOrg.id)
      expect(testEvent.createdBy).toBe(testUser.id)
    })
    
    it('should support optional venue JSON', async () => {
      const venueData = {
        name: 'Tech Hub',
        address: '123 Main St',
        capacity: 100
      }
      
      testEvent = await prismaTest.maixEvent.create({
        data: {
          organizationId: testOrg.id,
          name: 'Event with Venue',
          description: 'Event with venue information',
          date: new Date('2025-04-01'),
          capacity: 100,
          status: MaixEventStatus.PLANNING,
          isPublic: false,
          createdBy: testUser.id,
          venueJson: venueData
        }
      })
      
      expect(testEvent.venueJson).toEqual(venueData)
    })
    
    it('should support all status enum values', async () => {
      const statuses = [
        MaixEventStatus.DRAFT,
        MaixEventStatus.PLANNING,
        MaixEventStatus.PUBLISHED,
        MaixEventStatus.IN_PROGRESS,
        MaixEventStatus.COMPLETED,
        MaixEventStatus.CANCELLED
      ]
      
      for (const status of statuses) {
        const event = await prismaTest.maixEvent.create({
          data: {
            organizationId: testOrg.id,
            name: `Event with ${status} status`,
            description: 'Testing status enum',
            date: new Date(),
            capacity: 10,
            status,
            isPublic: true,
            createdBy: testUser.id
          }
        })
        
        expect(event.status).toBe(status)
      }
    })
    
    it('should enforce foreign key constraints', async () => {
      // Try to create event with non-existent organization
      await expect(
        prismaTest.maixEvent.create({
          data: {
            organizationId: 'non-existent-org',
            name: 'Invalid Event',
            description: 'Should fail',
            date: new Date(),
            capacity: 10,
            status: MaixEventStatus.DRAFT,
            isPublic: true,
            createdBy: testUser.id
          }
        })
      ).rejects.toThrow()
    })
  })
  
  describe('Registration Model', () => {
    beforeEach(async () => {
      // Create a test event for registrations
      testEvent = await prismaTest.maixEvent.create({
        data: {
          organizationId: testOrg.id,
          name: 'Registration Test Event',
          description: 'Event for testing registrations',
          date: new Date('2025-05-01'),
          capacity: 30,
          status: MaixEventStatus.PUBLISHED,
          isPublic: true,
          createdBy: testUser.id
        }
      })
    })

    it('should create a registration for an event', async () => {
      const registration = await prismaTest.registration.create({
        data: {
          eventId: testEvent.id,
          userId: testUser.id,
          email: 'attendee@example.com',
          name: 'John Doe',
          status: RegistrationStatus.PENDING
        }
      })
      
      expect(registration).toBeDefined()
      expect(registration.eventId).toBe(testEvent.id)
      expect(registration.userId).toBe(testUser.id)
      expect(registration.email).toBe('attendee@example.com')
      expect(registration.status).toBe(RegistrationStatus.PENDING)
    })
    
    it('should support metadata field', async () => {
      const metadata = {
        dietary: 'vegetarian',
        tshirtSize: 'L',
        additionalInfo: 'First time attendee'
      }
      
      const registration = await prismaTest.registration.create({
        data: {
          eventId: testEvent.id,
          email: 'special@example.com',
          name: 'Special Guest',
          status: RegistrationStatus.CONFIRMED,
          metadata
        }
      })
      
      expect(registration.metadata).toEqual(metadata)
    })
    
    it('should allow registration without userId for guest attendees', async () => {
      const registration = await prismaTest.registration.create({
        data: {
          eventId: testEvent.id,
          email: 'guest@example.com',
          name: 'Guest User',
          status: RegistrationStatus.PENDING
        }
      })
      
      expect(registration.userId).toBeNull()
      expect(registration.email).toBe('guest@example.com')
    })
    
    it('should cascade delete registrations when event is deleted', async () => {
      // Create registration
      const registration = await prismaTest.registration.create({
        data: {
          eventId: testEvent.id,
          email: 'cascade-test@example.com',
          name: 'Cascade Test',
          status: RegistrationStatus.CONFIRMED
        }
      })
      
      // Delete the event
      await prismaTest.maixEvent.delete({
        where: { id: testEvent.id }
      })
      
      // Registration should be deleted
      const deletedRegistration = await prismaTest.registration.findUnique({
        where: { id: registration.id }
      })
      
      expect(deletedRegistration).toBeNull()
    })
  })
  
  describe('EventConversation Model', () => {
    beforeEach(async () => {
      testEvent = await prismaTest.maixEvent.create({
        data: {
          organizationId: testOrg.id,
          name: 'Conversation Test Event',
          description: 'Event for testing conversations',
          date: new Date('2025-06-01'),
          capacity: 20,
          status: MaixEventStatus.PLANNING,
          isPublic: true,
          createdBy: testUser.id
        }
      })
    })

    it('should create a conversation for event planning', async () => {
      const messages = [
        { 
          role: 'user', 
          content: 'I want to organize a tech meetup', 
          timestamp: new Date().toISOString() 
        },
        { 
          role: 'assistant', 
          content: 'Great! Let me help you plan your tech meetup.', 
          timestamp: new Date().toISOString() 
        }
      ]
      
      const conversation = await prismaTest.eventConversation.create({
        data: {
          eventId: testEvent.id,
          userId: testUser.id,
          messages: messages
        }
      })
      
      expect(conversation).toBeDefined()
      expect(conversation.eventId).toBe(testEvent.id)
      expect(conversation.userId).toBe(testUser.id)
      expect(conversation.messages).toEqual(messages)
    })
    
    it('should support complex message structures', async () => {
      const complexMessages = [
        {
          role: 'user',
          content: 'Can you help with the agenda?',
          timestamp: new Date().toISOString(),
          metadata: {
            requestType: 'agenda_help',
            priority: 'high'
          }
        }
      ]
      
      const conversation = await prismaTest.eventConversation.create({
        data: {
          eventId: testEvent.id,
          userId: testUser.id,
          messages: complexMessages
        }
      })
      
      expect(conversation.messages).toEqual(complexMessages)
    })
  })
  
  describe('UserPreferences Model', () => {
    it('should create user preferences for PAT storage', async () => {
      const preferences = await prismaTest.userPreferences.create({
        data: {
          userId: testUser.id
        }
      })
      
      expect(preferences).toBeDefined()
      expect(preferences.userId).toBe(testUser.id)
      expect(preferences.eventManagerPatId).toBeNull()
    })
    
    it('should enforce unique constraint on userId', async () => {
      // Create first preferences
      await prismaTest.userPreferences.create({
        data: {
          userId: testUser.id
        }
      })
      
      // Try to create duplicate - should fail
      await expect(
        prismaTest.userPreferences.create({
          data: {
            userId: testUser.id
          }
        })
      ).rejects.toThrow()
    })
    
    it('should link to PersonalAccessToken', async () => {
      // Create a PAT
      const pat = await prismaTest.personalAccessToken.create({
        data: {
          userId: testUser.id,
          tokenHash: 'test-hash-' + Date.now(),
          name: 'Event Manager PAT',
          scopes: ['events:manage'],
          isSystemGenerated: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      })
      
      // Create preferences linking to PAT
      const preferences = await prismaTest.userPreferences.create({
        data: {
          userId: testUser.id,
          eventManagerPatId: pat.id
        }
      })
      
      expect(preferences.eventManagerPatId).toBe(pat.id)
    })
  })
  
  describe('Extended Todo Model', () => {
    let testProject: any
    
    beforeEach(async () => {
      testEvent = await prismaTest.maixEvent.create({
        data: {
          organizationId: testOrg.id,
          name: 'Todo Test Event',
          description: 'Event for testing todos',
          date: new Date('2025-07-01'),
          capacity: 15,
          status: MaixEventStatus.PLANNING,
          isPublic: true,
          createdBy: testUser.id
        }
      })
      
      testProject = await prismaTest.project.create({
        data: {
          name: 'Test Project',
          description: 'Project for testing todos',
          goal: 'Build a test application',
          helpType: 'FEATURE',
          ownerId: testUser.id,
          status: 'AWAITING_VOLUNTEERS'
        }
      })
    })

    it('should create todos for events', async () => {
      const todo = await prismaTest.todo.create({
        data: {
          title: 'Book venue for meetup',
          description: 'Find and book a suitable venue',
          eventId: testEvent.id,
          creatorId: testUser.id,
          status: TodoStatus.NOT_STARTED
        }
      })
      
      expect(todo).toBeDefined()
      expect(todo.eventId).toBe(testEvent.id)
      expect(todo.projectId).toBeNull()
      expect(todo.status).toBe(TodoStatus.NOT_STARTED)
    })
    
    it('should still support project todos', async () => {
      const todo = await prismaTest.todo.create({
        data: {
          title: 'Project task',
          projectId: testProject.id,
          creatorId: testUser.id,
          status: TodoStatus.NOT_STARTED
        }
      })
      
      expect(todo.projectId).toBe(testProject.id)
      expect(todo.eventId).toBeNull()
    })
    
    it('should allow both eventId and projectId to be null for standalone todos', async () => {
      // Standalone todo without project or event
      const todo = await prismaTest.todo.create({
        data: {
          title: 'Standalone todo',
          description: 'A todo not attached to project or event',
          creatorId: testUser.id,
          status: TodoStatus.NOT_STARTED
        }
      })
      
      expect(todo.eventId).toBeNull()
      expect(todo.projectId).toBeNull()
    })
  })
  
  describe('Extended PersonalAccessToken Model', () => {
    it('should support scopes and isSystemGenerated fields', async () => {
      const pat = await prismaTest.personalAccessToken.create({
        data: {
          userId: testUser.id,
          tokenHash: 'test-hash-' + Date.now(),
          name: 'Event Manager PAT',
          scopes: ['events:manage', 'todos:manage'],
          isSystemGenerated: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      })
      
      expect(pat.scopes).toEqual(['events:manage', 'todos:manage'])
      expect(pat.isSystemGenerated).toBe(true)
    })
    
    it('should default isSystemGenerated to false', async () => {
      const pat = await prismaTest.personalAccessToken.create({
        data: {
          userId: testUser.id,
          tokenHash: 'user-pat-' + Date.now(),
          name: 'User Created PAT',
          scopes: ['read:events'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
      
      expect(pat.isSystemGenerated).toBe(false)
    })
  })
  
  describe('Extended Post Model', () => {
    beforeEach(async () => {
      testEvent = await prismaTest.maixEvent.create({
        data: {
          organizationId: testOrg.id,
          name: 'Post Test Event',
          description: 'Event for testing posts',
          date: new Date('2025-08-01'),
          capacity: 25,
          status: MaixEventStatus.PUBLISHED,
          isPublic: true,
          createdBy: testUser.id
        }
      })
    })

    it('should support EVENT_UPDATE and EVENT_DISCUSSION types', async () => {
      const eventUpdate = await prismaTest.post.create({
        data: {
          type: 'EVENT_UPDATE',
          content: 'Event venue confirmed!',
          authorId: testUser.id,
          maixEventId: testEvent.id
        }
      })
      
      expect(eventUpdate.type).toBe('EVENT_UPDATE')
      expect(eventUpdate.maixEventId).toBe(testEvent.id)
      
      const eventDiscussion = await prismaTest.post.create({
        data: {
          type: 'EVENT_DISCUSSION',
          content: 'What topics should we cover?',
          authorId: testUser.id,
          maixEventId: testEvent.id
        }
      })
      
      expect(eventDiscussion.type).toBe('EVENT_DISCUSSION')
      expect(eventDiscussion.maixEventId).toBe(testEvent.id)
    })
    
    it('should cascade delete posts when event is deleted', async () => {
      // Create event-related posts
      const post = await prismaTest.post.create({
        data: {
          type: 'EVENT_UPDATE',
          content: 'Test update',
          authorId: testUser.id,
          maixEventId: testEvent.id
        }
      })
      
      // Delete the event
      await prismaTest.maixEvent.delete({
        where: { id: testEvent.id }
      })
      
      // Post should be deleted
      const deletedPost = await prismaTest.post.findUnique({
        where: { id: post.id }
      })
      
      expect(deletedPost).toBeNull()
    })
  })
})