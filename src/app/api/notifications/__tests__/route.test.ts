import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/api/with-auth')
jest.mock('@/lib/api/api-handler')
jest.mock('@/services/notification.service')
jest.mock('@/lib/logger')

// Mock the notification service
const mockNotificationService = {
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
}

jest.mock('@/services/notification.service', () => ({
  NotificationService: mockNotificationService,
}))

// Mock the logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

jest.mock('@/lib/logger', () => ({
  logger: mockLogger,
}))

// Mock auth middleware
const mockWithAuth = jest.fn()
jest.mock('@/lib/api/with-auth', () => ({
  withAuth: mockWithAuth,
}))

// Mock api handler
const mockApiHandler = jest.fn()
jest.mock('@/lib/api/api-handler', () => ({
  apiHandler: mockApiHandler,
}))

describe('/api/notifications', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  }

  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'NEW_PROJECT',
      title: 'New Project',
      message: 'A new project was created',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      type: 'APPLICATION_RECEIVED',
      title: 'Application Received',
      message: 'Someone applied to your project',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup withAuth mock to call the handler with authenticated request
    mockWithAuth.mockImplementation((handler) => {
      return async (request: any) => {
        const authenticatedRequest = {
          ...request,
          user: mockUser,
        }
        return handler(authenticatedRequest)
      }
    })

    // Setup apiHandler mock to call the provided handlers
    mockApiHandler.mockImplementation((handlers) => {
      return async (request: any) => {
        const method = request.method || 'GET'
        const handler = handlers[method]
        if (!handler) {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
          })
        }
        return handler(request)
      }
    })
  })

  describe('GET /api/notifications', () => {
    it('should return user notifications with default pagination', async () => {
      // Mock notification service responses
      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications)
      mockNotificationService.getUnreadCount.mockResolvedValue(2)

      // Import the actual route handler after mocks are set up
      const { GET } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        notifications: mockNotifications,
        unreadCount: 2,
        limit: 20,
        offset: 0,
      })

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        mockUser.id,
        20,
        0
      )
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(mockUser.id)
      expect(mockLogger.info).toHaveBeenCalledWith('Notifications fetched', {
        userId: mockUser.id,
        count: 2,
        unreadCount: 2,
        limit: 20,
        offset: 0,
      })
    })

    it('should respect custom pagination parameters', async () => {
      mockNotificationService.getUserNotifications.mockResolvedValue([mockNotifications[0]])
      mockNotificationService.getUnreadCount.mockResolvedValue(2)

      const { GET } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications?limit=10&offset=5', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limit).toBe(10)
      expect(data.offset).toBe(5)

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        mockUser.id,
        10,
        5
      )
    })

    it('should handle invalid pagination parameters gracefully', async () => {
      mockNotificationService.getUserNotifications.mockResolvedValue([])
      mockNotificationService.getUnreadCount.mockResolvedValue(0)

      const { GET } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications?limit=invalid&offset=invalid', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limit).toBe(20) // Should default to 20
      expect(data.offset).toBe(0) // Should default to 0
    })

    it('should handle notification service errors', async () => {
      // Setup error scenario
      mockNotificationService.getUserNotifications.mockRejectedValue(new Error('Database error'))

      // Mock the apiHandler to simulate error handling
      mockApiHandler.mockImplementation((handlers) => {
        return async (request: any) => {
          try {
            const method = request.method || 'GET'
            const handler = handlers[method]
            return await handler(request)
          } catch (error) {
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
              status: 500,
            })
          }
        }
      })

      const { GET } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})