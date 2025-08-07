import { GET, POST } from '../route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import * as eventService from '@/lib/services/event.service'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))
jest.mock('@/lib/services/event.service')

describe('GET /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockRequest = (url: string) => {
    const mockUrl = new URL(url)
    return {
      nextUrl: mockUrl,
      url
    } as unknown as NextRequest
  }

  it('should list public events', async () => {
    const mockEvents = [
      {
        id: 'event-1',
        name: 'Public Event 1',
        date: new Date('2025-03-15').toISOString(),
        isPublic: true
      },
      {
        id: 'event-2',
        name: 'Public Event 2',
        date: new Date('2025-04-20').toISOString(),
        isPublic: true
      }
    ]

    ;(eventService.listPublicEvents as jest.Mock).mockResolvedValue({
      events: mockEvents,
      total: 2
    })

    const request = createMockRequest('http://localhost/api/events')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.events).toEqual(mockEvents)
    expect(data.pagination).toEqual({
      total: 2,
      limit: 20,
      offset: 0,
      hasMore: false
    })
  })

  it('should filter upcoming events', async () => {
    ;(eventService.listPublicEvents as jest.Mock).mockResolvedValue({
      events: [],
      total: 0
    })

    const request = createMockRequest('http://localhost/api/events?upcoming=true')
    await GET(request)

    expect(eventService.listPublicEvents).toHaveBeenCalledWith({
      upcoming: true,
      limit: 20,
      offset: 0
    })
  })

  it('should handle pagination parameters', async () => {
    ;(eventService.listPublicEvents as jest.Mock).mockResolvedValue({
      events: [],
      total: 50
    })

    const request = createMockRequest('http://localhost/api/events?limit=10&offset=20')
    const response = await GET(request)
    const data = await response.json()

    expect(eventService.listPublicEvents).toHaveBeenCalledWith({
      upcoming: false,
      limit: 10,
      offset: 20
    })
    expect(data.pagination.hasMore).toBe(true)
  })

  it('should cap limit at 100', async () => {
    ;(eventService.listPublicEvents as jest.Mock).mockResolvedValue({
      events: [],
      total: 0
    })

    const request = createMockRequest('http://localhost/api/events?limit=200')
    await GET(request)

    expect(eventService.listPublicEvents).toHaveBeenCalledWith({
      upcoming: false,
      limit: 100, // Capped
      offset: 0
    })
  })

  it('should handle service errors', async () => {
    ;(eventService.listPublicEvents as jest.Mock).mockRejectedValue(
      new Error('Database error')
    )

    const request = createMockRequest('http://localhost/api/events')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to list events')
  })
})

describe('POST /api/events', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  }

  const mockEventInput = {
    organizationId: 'org-123',
    name: 'New Tech Meetup',
    description: 'A great event',
    date: '2025-03-15T18:00:00Z',
    capacity: 50,
    isPublic: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create event with authentication', async () => {
    const mockEvent = {
      id: 'event-123',
      ...mockEventInput,
      createdBy: mockUser.id,
      status: 'DRAFT'
    }

    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser
    })
    ;(eventService.createEvent as jest.Mock).mockResolvedValue(mockEvent)

    const request = {
      json: async () => mockEventInput
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(mockEvent)
    expect(eventService.createEvent).toHaveBeenCalledWith(mockUser.id, mockEventInput)
  })

  it('should require authentication', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const request = {
      json: async () => mockEventInput
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should validate required fields', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser
    })

    const invalidInput = {
      organizationId: 'org-123',
      // Missing required fields
    }

    const request = {
      json: async () => invalidInput
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should handle validation errors', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser
    })

    const ZodError = require('zod').ZodError
    const validationError = new ZodError([
      {
        path: ['name'],
        message: 'String must contain at least 1 character(s)',
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true
      }
    ])

    ;(eventService.createEvent as jest.Mock).mockRejectedValue(validationError)

    const request = {
      json: async () => mockEventInput
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
    expect(data.details).toBeDefined()
  })

  it('should handle permission errors', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser
    })
    ;(eventService.createEvent as jest.Mock).mockRejectedValue(
      new Error('You do not have permission to create events for this organization')
    )

    const request = {
      json: async () => mockEventInput
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('permission')
  })

  it('should handle unexpected errors', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser
    })
    ;(eventService.createEvent as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = {
      json: async () => mockEventInput
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create event')
  })
})