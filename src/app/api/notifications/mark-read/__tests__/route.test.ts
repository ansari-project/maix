import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/api/with-auth')
jest.mock('@/lib/api/api-handler')
jest.mock('@/services/notification.service')
jest.mock('@/lib/logger')

// Mock the notification service
const mockNotificationService = {
  markAsRead: jest.fn(),
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

describe('/api/notifications/mark-read', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  }

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
        const method = request.method || 'POST'
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

  describe('POST /api/notifications/mark-read', () => {
    it('should mark notifications as read successfully', async () => {
      const notificationIds = ['notif-1', 'notif-2', 'notif-3']
      
      mockNotificationService.markAsRead.mockResolvedValue(undefined)

      const { POST } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        notificationIds,
        mockUser.id
      )
      expect(mockLogger.info).toHaveBeenCalledWith('Notifications marked as read', {
        userId: mockUser.id,
        notificationIds,
        count: 3,
      })
    })

    it('should handle empty notification IDs array', async () => {
      const notificationIds: string[] = []
      
      mockNotificationService.markAsRead.mockResolvedValue(undefined)

      const { POST } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        notificationIds,
        mockUser.id
      )
      expect(mockLogger.info).toHaveBeenCalledWith('Notifications marked as read', {
        userId: mockUser.id,
        notificationIds,
        count: 0,
      })
    })

    it('should reject invalid notification IDs (not array)', async () => {
      const { POST } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds: 'invalid' }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid notification IDs')

      expect(mockNotificationService.markAsRead).not.toHaveBeenCalled()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should reject missing notification IDs field', async () => {
      const { POST } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid notification IDs')

      expect(mockNotificationService.markAsRead).not.toHaveBeenCalled()
    })

    it('should handle notification service errors', async () => {
      const notificationIds = ['notif-1']
      
      // Setup error scenario
      mockNotificationService.markAsRead.mockRejectedValue(new Error('Database error'))

      // Mock the apiHandler to simulate error handling
      mockApiHandler.mockImplementation((handlers) => {
        return async (request: any) => {
          try {
            const method = request.method || 'POST'
            const handler = handlers[method]
            return await handler(request)
          } catch (error) {
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
              status: 500,
            })
          }
        }
      })

      const { POST } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON request body', async () => {
      const { POST } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Mock the apiHandler to simulate JSON parsing error
      mockApiHandler.mockImplementation((handlers) => {
        return async (request: any) => {
          try {
            const method = request.method || 'POST'
            const handler = handlers[method]
            return await handler(request)
          } catch (error) {
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
              status: 500,
            })
          }
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})