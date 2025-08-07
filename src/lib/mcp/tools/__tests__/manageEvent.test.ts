import { 
  maix_create_event,
  maix_update_event,
  maix_get_event,
  maix_list_events,
  maix_delete_event,
  maix_get_event_stats
} from '../manageEvent'
import * as eventService from '@/lib/services/event.service'

// Mock the event service
jest.mock('@/lib/services/event.service')

describe('Event MCP Tools', () => {
  const mockUserId = 'user-123'
  const mockEventId = 'event-123'
  const mockOrgId = 'org-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('maix_create_event', () => {
    it('should create an event successfully', async () => {
      const mockEvent = {
        id: mockEventId,
        name: 'Tech Meetup',
        description: 'AI Tools for Developers',
        date: new Date('2025-09-15T18:00:00Z'),
        venueJson: { name: 'Tech Hub', address: '123 Main St' },
        capacity: 50,
        status: 'DRAFT',
        isPublic: true,
        organization: { name: 'Tech Community' },
        creator: { name: 'John Doe' },
        _count: { registrations: 0, todos: 0 }
      }

      ;(eventService.createEvent as jest.Mock).mockResolvedValue(mockEvent)

      const params = {
        organizationId: mockOrgId,
        name: 'Tech Meetup',
        description: 'AI Tools for Developers',
        date: '2025-09-15T18:00:00Z',
        venue: { name: 'Tech Hub', address: '123 Main St' },
        capacity: 50,
        isPublic: true
      }

      const result = await maix_create_event(params, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: mockEventId,
        name: 'Tech Meetup',
        status: 'DRAFT',
        capacity: 50
      })
      expect(result.message).toContain('created successfully')
      expect(eventService.createEvent).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          organizationId: mockOrgId,
          name: 'Tech Meetup',
          venueJson: { name: 'Tech Hub', address: '123 Main St' }
        })
      )
    })

    it('should handle creation errors', async () => {
      ;(eventService.createEvent as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      )

      const params = {
        organizationId: mockOrgId,
        name: 'Tech Meetup',
        description: 'Test event',
        date: '2025-09-15T18:00:00Z'
      }

      const result = await maix_create_event(params, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
    })
  })

  describe('maix_update_event', () => {
    it('should update an event successfully', async () => {
      const mockUpdatedEvent = {
        id: mockEventId,
        name: 'Updated Tech Meetup',
        description: 'Updated description',
        date: new Date('2025-09-20T18:00:00Z'),
        venueJson: null,
        capacity: 75,
        status: 'PUBLISHED',
        isPublic: true,
        organization: { name: 'Tech Community' },
        _count: { registrations: 5, todos: 10 }
      }

      ;(eventService.updateEvent as jest.Mock).mockResolvedValue(mockUpdatedEvent)

      const params = {
        eventId: mockEventId,
        name: 'Updated Tech Meetup',
        capacity: 75,
        status: 'PUBLISHED' as const
      }

      const result = await maix_update_event(params, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Tech Meetup')
      expect(result.data?.capacity).toBe(75)
      expect(result.data?.status).toBe('PUBLISHED')
    })
  })

  describe('maix_get_event', () => {
    it('should get event details with stats', async () => {
      const mockEvent = {
        id: mockEventId,
        name: 'Tech Meetup',
        description: 'AI Tools',
        date: new Date('2025-09-15T18:00:00Z'),
        venueJson: { name: 'Tech Hub' },
        capacity: 50,
        status: 'PUBLISHED',
        isPublic: true,
        organization: { name: 'Tech Community', slug: 'tech-community' },
        creator: { name: 'John Doe' },
        _count: { registrations: 25, todos: 15 }
      }

      const mockStats = {
        totalRegistrations: 30,
        confirmedRegistrations: 25,
        waitlistedRegistrations: 5,
        totalTodos: 15,
        completedTodos: 8,
        capacityUsed: 50
      }

      ;(eventService.getEvent as jest.Mock).mockResolvedValue(mockEvent)
      ;(eventService.getEventStats as jest.Mock).mockResolvedValue(mockStats)

      const result = await maix_get_event({ eventId: mockEventId }, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: mockEventId,
        name: 'Tech Meetup',
        organizationName: 'Tech Community',
        stats: {
          confirmedRegistrations: 25,
          waitlistedRegistrations: 5,
          totalTodos: 15,
          completedTodos: 8,
          capacityUsed: 50
        }
      })
    })

    it('should handle event not found', async () => {
      ;(eventService.getEvent as jest.Mock).mockResolvedValue(null)

      const result = await maix_get_event({ eventId: 'invalid-id' }, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('maix_list_events', () => {
    it('should list public events', async () => {
      const mockEvents = {
        events: [
          {
            id: 'event-1',
            name: 'Event 1',
            description: 'Description 1',
            date: new Date('2025-09-15'),
            capacity: 50,
            status: 'PUBLISHED',
            isPublic: true,
            organization: { name: 'Org 1', slug: 'org-1' },
            _count: { registrations: 10 }
          },
          {
            id: 'event-2',
            name: 'Event 2',
            description: 'Description 2',
            date: new Date('2025-09-20'),
            capacity: 100,
            status: 'PUBLISHED',
            isPublic: true,
            organization: { name: 'Org 2', slug: 'org-2' },
            _count: { registrations: 45 }
          }
        ],
        total: 2
      }

      ;(eventService.listPublicEvents as jest.Mock).mockResolvedValue(mockEvents)

      const result = await maix_list_events({ publicOnly: true }, null)

      expect(result.success).toBe(true)
      expect(result.data?.events).toHaveLength(2)
      expect(result.data?.total).toBe(2)
      expect(eventService.listPublicEvents).toHaveBeenCalledWith({
        upcoming: undefined,
        limit: 20,
        offset: 0
      })
    })

    it('should list organization events', async () => {
      const mockEvents = {
        events: [{
          id: 'event-1',
          name: 'Private Event',
          description: 'Org members only',
          date: new Date('2025-09-15'),
          capacity: 30,
          status: 'DRAFT',
          isPublic: false,
          organization: { name: 'My Org', slug: 'my-org' },
          _count: { registrations: 0 }
        }],
        total: 1
      }

      ;(eventService.listOrganizationEvents as jest.Mock).mockResolvedValue(mockEvents)

      const result = await maix_list_events(
        { organizationId: mockOrgId, status: ['DRAFT'] },
        mockUserId
      )

      expect(result.success).toBe(true)
      expect(result.data?.events).toHaveLength(1)
      expect(eventService.listOrganizationEvents).toHaveBeenCalledWith(
        mockUserId,
        mockOrgId,
        expect.objectContaining({
          status: ['DRAFT']
        })
      )
    })
  })

  describe('maix_delete_event', () => {
    it('should delete an event successfully', async () => {
      ;(eventService.deleteEvent as jest.Mock).mockResolvedValue(undefined)

      const result = await maix_delete_event({ eventId: mockEventId }, mockUserId)

      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted successfully')
      expect(eventService.deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId)
    })

    it('should handle deletion errors', async () => {
      ;(eventService.deleteEvent as jest.Mock).mockRejectedValue(
        new Error('Cannot delete event with registrations')
      )

      const result = await maix_delete_event({ eventId: mockEventId }, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot delete event with registrations')
    })
  })

  describe('maix_get_event_stats', () => {
    it('should get event statistics', async () => {
      const mockEvent = {
        id: mockEventId,
        name: 'Tech Conference',
        capacity: 200
      }

      const mockStats = {
        totalRegistrations: 150,
        confirmedRegistrations: 140,
        waitlistedRegistrations: 10,
        totalTodos: 50,
        completedTodos: 35,
        capacityUsed: 70
      }

      ;(eventService.getEvent as jest.Mock).mockResolvedValue(mockEvent)
      ;(eventService.getEventStats as jest.Mock).mockResolvedValue(mockStats)

      const result = await maix_get_event_stats({ eventId: mockEventId }, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        eventName: 'Tech Conference',
        confirmedRegistrations: 140,
        waitlistedRegistrations: 10,
        todoCompletionRate: 70,
        capacityUsed: 70,
        spotsAvailable: 60
      })
    })
  })
})