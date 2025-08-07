import {
  maix_register_for_event,
  maix_update_registration,
  maix_cancel_registration,
  maix_list_registrations,
  maix_check_registration,
  maix_get_registration_stats
} from '../manageRegistration'
import * as registrationService from '@/lib/services/registration.service'

// Mock the registration service
jest.mock('@/lib/services/registration.service')

describe('Registration MCP Tools', () => {
  const mockUserId = 'user-123'
  const mockEventId = 'event-123'
  const mockRegistrationId = 'reg-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('maix_register_for_event', () => {
    it('should register for event successfully (confirmed)', async () => {
      const mockRegistration = {
        id: mockRegistrationId,
        eventId: mockEventId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        status: 'CONFIRMED',
        metadata: { notes: 'Vegetarian' },
        createdAt: new Date('2025-08-01'),
        event: {
          name: 'Tech Meetup',
          date: new Date('2025-09-15')
        }
      }

      ;(registrationService.createRegistration as jest.Mock).mockResolvedValue(mockRegistration)

      const params = {
        eventId: mockEventId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        notes: 'Vegetarian'
      }

      const result = await maix_register_for_event(params, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: mockRegistrationId,
        eventName: 'Tech Meetup',
        name: 'Jane Doe',
        email: 'jane@example.com',
        status: 'CONFIRMED'
      })
      expect(result.message).toContain('confirmed')
      expect(registrationService.createRegistration).toHaveBeenCalledWith(params, mockUserId)
    })

    it('should handle waitlist registration', async () => {
      const mockRegistration = {
        id: mockRegistrationId,
        status: 'WAITLISTED',
        name: 'John Smith',
        email: 'john@example.com',
        metadata: null,
        createdAt: new Date(),
        event: { name: 'Popular Workshop' }
      }

      ;(registrationService.createRegistration as jest.Mock).mockResolvedValue(mockRegistration)

      const params = {
        eventId: mockEventId,
        name: 'John Smith',
        email: 'john@example.com'
      }

      const result = await maix_register_for_event(params)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('WAITLISTED')
      expect(result.message).toContain('waitlist')
    })

    it('should handle registration errors', async () => {
      ;(registrationService.createRegistration as jest.Mock).mockRejectedValue(
        new Error('You are already registered for this event')
      )

      const params = {
        eventId: mockEventId,
        name: 'Jane Doe',
        email: 'jane@example.com'
      }

      const result = await maix_register_for_event(params)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already registered')
    })
  })

  describe('maix_update_registration', () => {
    it('should update registration status', async () => {
      const mockUpdatedReg = {
        id: mockRegistrationId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        status: 'CONFIRMED',
        metadata: { notes: 'Updated notes' },
        event: { name: 'Tech Meetup' },
        user: { name: 'Jane Doe' }
      }

      ;(registrationService.updateRegistration as jest.Mock).mockResolvedValue(mockUpdatedReg)

      const params = {
        registrationId: mockRegistrationId,
        status: 'CONFIRMED' as const,
        notes: 'Updated notes'
      }

      const result = await maix_update_registration(params, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: mockRegistrationId,
        status: 'CONFIRMED',
        metadata: { notes: 'Updated notes' }
      })
      expect(registrationService.updateRegistration).toHaveBeenCalledWith(
        mockUserId,
        mockRegistrationId,
        { status: 'CONFIRMED', notes: 'Updated notes' }
      )
    })
  })

  describe('maix_cancel_registration', () => {
    it('should cancel registration successfully', async () => {
      ;(registrationService.cancelRegistration as jest.Mock).mockResolvedValue(undefined)

      const result = await maix_cancel_registration(
        { registrationId: mockRegistrationId },
        mockUserId
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('cancelled successfully')
      expect(registrationService.cancelRegistration).toHaveBeenCalledWith(
        mockRegistrationId,
        undefined,
        mockUserId
      )
    })
  })

  describe('maix_list_registrations', () => {
    it('should list event registrations', async () => {
      const mockRegistrations = {
        registrations: [
          {
            id: 'reg-1',
            name: 'Person 1',
            email: 'person1@example.com',
            status: 'CONFIRMED',
            registeredAt: new Date(),
            notes: null,
            user: { name: 'Person 1', email: 'person1@example.com' }
          },
          {
            id: 'reg-2',
            name: 'Person 2',
            email: 'person2@example.com',
            status: 'WAITLISTED',
            registeredAt: new Date(),
            notes: 'Needs wheelchair access',
            user: null
          }
        ],
        total: 2
      }

      ;(registrationService.listEventRegistrations as jest.Mock).mockResolvedValue(mockRegistrations)

      const params = {
        eventId: mockEventId,
        status: ['CONFIRMED', 'WAITLISTED'] as any
      }

      const result = await maix_list_registrations(params, mockUserId)

      expect(result.success).toBe(true)
      expect(result.data?.registrations).toHaveLength(2)
      expect(result.data?.summary).toMatchObject({
        total: 2,
        confirmed: 1,
        waitlisted: 1,
        cancelled: 0
      })
      expect(registrationService.listEventRegistrations).toHaveBeenCalledWith(
        mockUserId,
        mockEventId,
        expect.objectContaining({
          status: ['CONFIRMED', 'WAITLISTED']
        })
      )
    })
  })

  describe('maix_check_registration', () => {
    it('should find existing registration', async () => {
      const mockRegistration = {
        id: mockRegistrationId,
        status: 'CONFIRMED',
        registeredAt: new Date('2025-08-01'),
        event: {
          name: 'Tech Meetup',
          date: new Date('2025-09-15')
        }
      }

      ;(registrationService.getRegistrationByEmail as jest.Mock).mockResolvedValue(mockRegistration)

      const result = await maix_check_registration({
        eventId: mockEventId,
        email: 'jane@example.com'
      })

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        isRegistered: true,
        registrationId: mockRegistrationId,
        status: 'CONFIRMED',
        message: 'Registration confirmed'
      })
    })

    it('should handle no registration found', async () => {
      ;(registrationService.getRegistrationByEmail as jest.Mock).mockResolvedValue(null)

      const result = await maix_check_registration({
        eventId: mockEventId,
        email: 'notregistered@example.com'
      })

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        isRegistered: false,
        message: 'Not registered for this event'
      })
    })
  })

  describe('maix_get_registration_stats', () => {
    it('should get registration statistics', async () => {
      const mockStats = {
        total: 100,
        confirmed: 85,
        waitlisted: 10,
        cancelled: 5
      }

      ;(registrationService.getRegistrationStats as jest.Mock).mockResolvedValue(mockStats)

      const result = await maix_get_registration_stats(
        { eventId: mockEventId },
        mockUserId
      )

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total: 100,
        confirmed: 85,
        waitlisted: 10,
        cancelled: 5,
        active: 95,
        confirmationRate: 85,
        waitlistRate: 10,
        cancellationRate: 5
      })
    })
  })
})