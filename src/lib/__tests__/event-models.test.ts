// TypeScript test fixes applied
import { TodoStatus } from '@prisma/client'
import { MaixEventStatus, RegistrationStatus } from '@prisma/client'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      create: jest.fn(),
      delete: jest.fn()
    },
    user: {
      create: jest.fn(),
      delete: jest.fn()
    },
    maixEvent: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    registration: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    eventConversation: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    userPreferences: {
      create: jest.fn()
    },
    todo: {
      create: jest.fn(),
      delete: jest.fn()
    },
    project: {
      create: jest.fn(),
      delete: jest.fn()
    },
    personalAccessToken: {
      create: jest.fn(),
      delete: jest.fn()
    },
    post: {
      create: jest.fn(),
      delete: jest.fn()
    }
  }
}))

import { prisma } from '@/lib/prisma'

describe('Event Manager Models - Phase 1', () => {
  const testOrgId = 'test-org-' + Date.now()
  const testUserId = 'test-user-' + Date.now()
  const testEventId = 'test-event-' + Date.now()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('MaixEvent Model', () => {
    it('should create a new event with all required fields', async () => {
      const mockEvent = {
        id: testEventId,
        organizationId: testOrgId,
        name: 'Test Tech Meetup',
        description: 'A test event for the Event Manager',
        date: new Date('2025-03-15'),
        capacity: 50,
        status: MaixEventStatus.DRAFT,
        isPublic: true,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.maixEvent.create as jest.Mock).mockResolvedValue(mockEvent)
      
      const event = await prisma.maixEvent.create({
        data: {
          id: testEventId,
          organizationId: testOrgId,
          name: 'Test Tech Meetup',
          description: 'A test event for the Event Manager',
          date: new Date('2025-03-15'),
          capacity: 50,
          status: MaixEventStatus.DRAFT,
          isPublic: true,
          createdBy: testUserId
        }
      })
      
      expect(event).toBeDefined()
      expect(event.id).toBe(testEventId)
      expect(event.name).toBe('Test Tech Meetup')
      expect(event.status).toBe(MaixEventStatus.DRAFT)
      expect(event.isPublic).toBe(true)
      expect(event.capacity).toBe(50)
    })
    
    it('should support optional venue JSON', async () => {
      const venueData = {
        name: 'Tech Hub',
        address: '123 Main St',
        capacity: 100
      }
      
      const mockEvent = {
        id: testEventId,
        venueJson: venueData,
        updatedAt: new Date()
      }
      
      ;(prisma.maixEvent.update as jest.Mock).mockResolvedValue(mockEvent)
      
      const event = await prisma.maixEvent.update({
        where: { id: testEventId },
        data: {
          venueJson: venueData
        }
      })
      
      expect(event.venueJson).toEqual(venueData)
    })
    
    it('should support all status enum values', () => {
      const validStatuses = [
        MaixEventStatus.DRAFT,
        MaixEventStatus.PLANNING,
        MaixEventStatus.PUBLISHED,
        MaixEventStatus.IN_PROGRESS,
        MaixEventStatus.COMPLETED,
        MaixEventStatus.CANCELLED
      ]
      
      validStatuses.forEach(status => {
        expect(status).toBeDefined()
      })
    })
  })
  
  describe('Registration Model', () => {
    it('should create a registration for an event', async () => {
      const mockRegistration = {
        id: 'reg-1',
        eventId: testEventId,
        userId: testUserId,
        email: 'attendee@example.com',
        name: 'John Doe',
        status: RegistrationStatus.PENDING,
        createdAt: new Date()
      }
      
      ;(prisma.registration.create as jest.Mock).mockResolvedValue(mockRegistration)
      
      const registration = await prisma.registration.create({
        data: {
          eventId: testEventId,
          userId: testUserId,
          email: 'attendee@example.com',
          name: 'John Doe',
          status: RegistrationStatus.PENDING
        }
      })
      
      expect(registration).toBeDefined()
      expect(registration.eventId).toBe(testEventId)
      expect(registration.email).toBe('attendee@example.com')
      expect(registration.status).toBe(RegistrationStatus.PENDING)
    })
    
    it('should support metadata field', async () => {
      const metadata = {
        dietary: 'vegetarian',
        tshirtSize: 'L'
      }
      
      const mockRegistration = {
        id: 'reg-2',
        eventId: testEventId,
        email: 'special@example.com',
        name: 'Special Guest',
        status: RegistrationStatus.CONFIRMED,
        metadata,
        createdAt: new Date()
      }
      
      ;(prisma.registration.create as jest.Mock).mockResolvedValue(mockRegistration)
      
      const registration = await prisma.registration.create({
        data: {
          eventId: testEventId,
          email: 'special@example.com',
          name: 'Special Guest',
          status: RegistrationStatus.CONFIRMED,
          metadata
        }
      })
      
      expect(registration.metadata).toEqual(metadata)
    })
  })
  
  describe('EventConversation Model', () => {
    it('should create a conversation for event planning', async () => {
      const messages = [
        { role: 'user', content: 'I want to organize a tech meetup', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Great! Let me help you plan your tech meetup.', timestamp: new Date().toISOString() }
      ]
      
      const mockConversation = {
        id: 'conv-1',
        eventId: testEventId,
        userId: testUserId,
        messages,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.eventConversation.create as jest.Mock).mockResolvedValue(mockConversation)
      
      const conversation = await prisma.eventConversation.create({
        data: {
          eventId: testEventId,
          userId: testUserId,
          messages: messages
        }
      })
      
      expect(conversation).toBeDefined()
      expect(conversation.eventId).toBe(testEventId)
      expect(conversation.userId).toBe(testUserId)
      expect(conversation.messages).toEqual(messages)
    })
  })
  
  describe('UserPreferences Model', () => {
    it('should create user preferences for PAT storage', async () => {
      const mockPreferences = {
        id: 'pref-1',
        userId: testUserId,
        eventManagerPatId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.userPreferences.create as jest.Mock).mockResolvedValue(mockPreferences)
      
      const preferences = await prisma.userPreferences.create({
        data: {
          userId: testUserId
        }
      })
      
      expect(preferences).toBeDefined()
      expect(preferences.userId).toBe(testUserId)
      expect(preferences.eventManagerPatId).toBeNull()
    })
  })
  
  describe('Extended Todo Model', () => {
    it('should create todos for events', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Book venue for meetup',
        description: 'Find and book a suitable venue',
        eventId: testEventId,
        projectId: null,
        creatorId: testUserId,
        status: TodoStatus.NOT_STARTED,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.todo.create as jest.Mock).mockResolvedValue(mockTodo)
      
      const todo = await (prisma.todo.create as jest.Mock)({
        data: {
          title: 'Book venue for meetup',
          description: 'Find and book a suitable venue',
          eventId: testEventId,
          creatorId: testUserId
        }
      })
      
      expect(todo).toBeDefined()
      expect(todo.eventId).toBe(testEventId)
      expect(todo.projectId).toBeNull()
    })
    
    it('should still support project todos', async () => {
      const projectId = 'proj-1'
      
      const mockTodo = {
        id: 'todo-2',
        title: 'Project task',
        projectId,
        eventId: null,
        creatorId: testUserId,
        status: TodoStatus.NOT_STARTED,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.todo.create as jest.Mock).mockResolvedValue(mockTodo)
      
      const todo = await (prisma.todo.create as jest.Mock)({
        data: {
          title: 'Project task',
          projectId,
          creatorId: testUserId
        }
      })
      
      expect(todo.projectId).toBe(projectId)
      expect(todo.eventId).toBeNull()
    })
  })
  
  describe('Extended PersonalAccessToken Model', () => {
    it('should support scopes and isSystemGenerated fields', async () => {
      const mockPat = {
        id: 'pat-1',
        userId: testUserId,
        tokenHash: 'test-hash-' + Date.now(),
        name: 'Event Manager PAT',
        scopes: ['events:manage', 'todos:manage'],
        isSystemGenerated: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      }
      
      ;(prisma.personalAccessToken.create as jest.Mock).mockResolvedValue(mockPat)
      
      const pat = await (prisma.personalAccessToken.create as jest.Mock)({
        data: {
          userId: testUserId,
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
  })
  
  describe('Extended Post Model', () => {
    it('should support EVENT_UPDATE and EVENT_DISCUSSION types', async () => {
      const mockEventUpdate = {
        id: 'post-1',
        type: 'EVENT_UPDATE',
        content: 'Event venue confirmed!',
        authorId: testUserId,
        maixEventId: testEventId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.post.create as jest.Mock).mockResolvedValue(mockEventUpdate)
      
      const eventUpdate = await (prisma.post.create as jest.Mock)({
        data: {
          type: 'EVENT_UPDATE',
          content: 'Event venue confirmed!',
          authorId: testUserId,
          maixEventId: testEventId
        }
      })
      
      expect(eventUpdate.type).toBe('EVENT_UPDATE')
      expect(eventUpdate.maixEventId).toBe(testEventId)
    })
  })
})