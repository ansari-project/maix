import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  listOrganizationEvents,
  listPublicEvents,
  getEventStats,
  canManageEvents,
  canViewEvent
} from '../event.service'
import { prisma } from '@/lib/prisma'
import { MaixEventStatus } from '@prisma/client'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: {
      findUnique: jest.fn()
    },
    maixEvent: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    registration: {
      count: jest.fn(),
      groupBy: jest.fn()
    },
    todo: {
      groupBy: jest.fn()
    }
  }
}))

describe('Event Service', () => {
  const mockUserId = 'user-123'
  const mockOrgId = 'org-123'
  const mockEventId = 'event-123'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('canManageEvents', () => {
    it('should return true for organization owner', async () => {
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'OWNER'
      })

      const result = await canManageEvents(mockUserId, mockOrgId)
      expect(result).toBe(true)
    })

    it('should return true for organization member', async () => {
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'MEMBER'
      })

      const result = await canManageEvents(mockUserId, mockOrgId)
      expect(result).toBe(true)
    })

    it('should return false for non-member', async () => {
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await canManageEvents(mockUserId, mockOrgId)
      expect(result).toBe(false)
    })
  })

  describe('canViewEvent', () => {
    it('should return true for public events', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        isPublic: true,
        organizationId: mockOrgId
      })

      const result = await canViewEvent(null, mockEventId)
      expect(result).toBe(true)
    })

    it('should return false for private events without auth', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        isPublic: false,
        organizationId: mockOrgId
      })

      const result = await canViewEvent(null, mockEventId)
      expect(result).toBe(false)
    })

    it('should return true for private events with membership', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        isPublic: false,
        organizationId: mockOrgId
      })
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'MEMBER'
      })

      const result = await canViewEvent(mockUserId, mockEventId)
      expect(result).toBe(true)
    })
  })

  describe('createEvent', () => {
    const mockInput = {
      organizationId: mockOrgId,
      name: 'Test Tech Meetup',
      description: 'A test event',
      date: '2025-03-15T18:00:00Z',
      capacity: 50,
      isPublic: true
    }

    it('should create event with valid permissions', async () => {
      const mockEvent = {
        id: mockEventId,
        ...mockInput,
        date: new Date(mockInput.date),
        createdBy: mockUserId,
        status: MaixEventStatus.DRAFT,
        organization: { name: 'Test Org' },
        creator: { name: 'Test User', email: 'test@example.com' },
        _count: { registrations: 0, todos: 0 }
      }

      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'OWNER'
      })
      ;(prisma.maixEvent.create as jest.Mock).mockResolvedValue(mockEvent)

      const result = await createEvent(mockUserId, mockInput)

      expect(result).toEqual(mockEvent)
      expect(prisma.maixEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          name: 'Test Tech Meetup',
          createdBy: mockUserId,
          status: MaixEventStatus.DRAFT
        }),
        include: expect.any(Object)
      })
    })

    it('should throw error without permissions', async () => {
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(createEvent(mockUserId, mockInput)).rejects.toThrow(
        'You do not have permission to create events for this organization'
      )
    })

    it('should validate input schema', async () => {
      const invalidInput = {
        organizationId: mockOrgId,
        name: '', // Invalid: empty name
        description: 'Test',
        date: '2025-03-15T18:00:00Z'
      }

      await expect(createEvent(mockUserId, invalidInput)).rejects.toThrow()
    })
  })

  describe('updateEvent', () => {
    const mockUpdate = {
      name: 'Updated Meetup',
      status: MaixEventStatus.PUBLISHED
    }

    it('should update event with valid permissions', async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: mockOrgId
      }

      const updatedEvent = {
        ...mockEvent,
        ...mockUpdate,
        organization: { name: 'Test Org' },
        creator: { name: 'Test User', email: 'test@example.com' },
        _count: { registrations: 5, todos: 3 }
      }

      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue(mockEvent)
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'MEMBER'
      })
      ;(prisma.maixEvent.update as jest.Mock).mockResolvedValue(updatedEvent)

      const result = await updateEvent(mockUserId, mockEventId, mockUpdate)

      expect(result).toEqual(updatedEvent)
      expect(prisma.maixEvent.update).toHaveBeenCalledWith({
        where: { id: mockEventId },
        data: mockUpdate,
        include: expect.any(Object)
      })
    })

    it('should throw error for non-existent event', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(updateEvent(mockUserId, mockEventId, mockUpdate)).rejects.toThrow(
        'Event not found'
      )
    })

    it('should throw error without permissions', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        organizationId: mockOrgId
      })
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(updateEvent(mockUserId, mockEventId, mockUpdate)).rejects.toThrow(
        'You do not have permission to update this event'
      )
    })
  })

  describe('deleteEvent', () => {
    it('should delete event with owner permissions', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        organizationId: mockOrgId,
        status: MaixEventStatus.CANCELLED
      })
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'OWNER'
      })
      ;(prisma.maixEvent.delete as jest.Mock).mockResolvedValue({ id: mockEventId })

      await deleteEvent(mockUserId, mockEventId)

      expect(prisma.maixEvent.delete).toHaveBeenCalledWith({
        where: { id: mockEventId }
      })
    })

    it('should prevent deletion with existing registrations', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        organizationId: mockOrgId,
        status: MaixEventStatus.PUBLISHED
      })
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'OWNER'
      })
      ;(prisma.registration.count as jest.Mock).mockResolvedValue(5)

      await expect(deleteEvent(mockUserId, mockEventId)).rejects.toThrow(
        'Cannot delete event with existing registrations. Cancel the event first.'
      )
    })

    it('should throw error for non-owner', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        organizationId: mockOrgId,
        status: MaixEventStatus.DRAFT
      })
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'MEMBER'
      })

      await expect(deleteEvent(mockUserId, mockEventId)).rejects.toThrow(
        'Only organization owners can delete events'
      )
    })
  })

  describe('listOrganizationEvents', () => {
    it('should list public events for non-members', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Public Event',
          isPublic: true,
          organization: { name: 'Org', slug: 'org' },
          creator: { name: 'Creator', email: 'creator@example.com' },
          _count: { registrations: 10, todos: 5 }
        }
      ]

      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.maixEvent.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.maixEvent.findMany as jest.Mock).mockResolvedValue(mockEvents)

      const result = await listOrganizationEvents(null, mockOrgId)

      expect(result.events).toEqual(mockEvents)
      expect(result.total).toBe(1)
      expect(prisma.maixEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId,
            isPublic: true
          }
        })
      )
    })

    it('should list all events for members', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Private Event',
          isPublic: false
        },
        {
          id: 'event-2',
          name: 'Public Event',
          isPublic: true
        }
      ]

      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'MEMBER'
      })
      ;(prisma.maixEvent.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.maixEvent.findMany as jest.Mock).mockResolvedValue(mockEvents)

      const result = await listOrganizationEvents(mockUserId, mockOrgId)

      expect(result.events).toEqual(mockEvents)
      expect(result.total).toBe(2)
      expect(prisma.maixEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId
            // No isPublic filter for members
          }
        })
      )
    })

    it('should filter by status', async () => {
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.maixEvent.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.maixEvent.findMany as jest.Mock).mockResolvedValue([])

      await listOrganizationEvents(null, mockOrgId, {
        status: [MaixEventStatus.PUBLISHED, MaixEventStatus.IN_PROGRESS]
      })

      expect(prisma.maixEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId,
            isPublic: true,
            status: { in: [MaixEventStatus.PUBLISHED, MaixEventStatus.IN_PROGRESS] }
          }
        })
      )
    })

    it('should filter upcoming events', async () => {
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.maixEvent.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.maixEvent.findMany as jest.Mock).mockResolvedValue([])

      await listOrganizationEvents(null, mockOrgId, { upcoming: true })

      expect(prisma.maixEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId,
            isPublic: true,
            date: { gte: new Date('2025-01-01') }
          }
        })
      )
    })
  })

  describe('getEventStats', () => {
    it('should calculate event statistics', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        capacity: 100
      })
      ;(prisma.registration.groupBy as jest.Mock).mockResolvedValue([
        { status: 'CONFIRMED', _count: 75 },
        { status: 'WAITLISTED', _count: 10 },
        { status: 'PENDING', _count: 5 }
      ])
      ;(prisma.todo.groupBy as jest.Mock).mockResolvedValue([
        { status: 'COMPLETED', _count: 8 },
        { status: 'IN_PROGRESS', _count: 3 },
        { status: 'OPEN', _count: 4 }
      ])

      const stats = await getEventStats(mockEventId)

      expect(stats).toEqual({
        totalRegistrations: 90,
        confirmedRegistrations: 75,
        waitlistedRegistrations: 10,
        totalTodos: 15,
        completedTodos: 8,
        capacityUsed: 75
      })
    })

    it('should handle events without capacity', async () => {
      ;(prisma.maixEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEventId,
        capacity: null
      })
      ;(prisma.registration.groupBy as jest.Mock).mockResolvedValue([
        { status: 'CONFIRMED', _count: 50 }
      ])
      ;(prisma.todo.groupBy as jest.Mock).mockResolvedValue([])

      const stats = await getEventStats(mockEventId)

      expect(stats.capacityUsed).toBe(0)
    })
  })
})