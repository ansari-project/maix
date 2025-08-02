import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/api/with-auth')
jest.mock('@/lib/api/api-handler')
jest.mock('@/lib/prisma')
jest.mock('@/lib/logger')

// Mock Prisma
const mockPrisma = {
  notificationPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
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

describe('/api/notifications/preferences', () => {
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
        const method = request.method
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

  describe('GET /api/notifications/preferences', () => {
    it('should return user preferences when they exist', async () => {
      const mockPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: false,
      }

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPreference)

      const { GET } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        emailEnabled: false,
      })

      expect(mockPrisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      })
      expect(mockLogger.info).toHaveBeenCalledWith('Notification preferences fetched', {
        userId: mockUser.id,
        emailEnabled: false,
      })
    })

    it('should return default preferences when none exist', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)

      const { GET } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        emailEnabled: true, // Default value
      })

      expect(mockLogger.info).toHaveBeenCalledWith('Notification preferences fetched', {
        userId: mockUser.id,
        emailEnabled: true,
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.notificationPreference.findUnique.mockRejectedValue(new Error('Database error'))

      // Mock the apiHandler to simulate error handling
      mockApiHandler.mockImplementation((handlers) => {
        return async (request: any) => {
          try {
            const method = request.method
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

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/notifications/preferences', () => {
    it('should update existing preferences', async () => {
      const updatedPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPreference)

      const { PUT } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ emailEnabled: false }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(updatedPreference)

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        create: {
          userId: mockUser.id,
          emailEnabled: false,
        },
        update: { emailEnabled: false },
      })
      expect(mockLogger.info).toHaveBeenCalledWith('Notification preferences updated', {
        userId: mockUser.id,
        emailEnabled: false,
      })
    })

    it('should create new preferences if none exist', async () => {
      const newPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.upsert.mockResolvedValue(newPreference)

      const { PUT } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ emailEnabled: true }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(newPreference)

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        create: {
          userId: mockUser.id,
          emailEnabled: true,
        },
        update: { emailEnabled: true },
      })
    })

    it('should handle invalid request body', async () => {
      const { PUT } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ invalidField: true }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // The function extracts emailEnabled with destructuring, undefined would be passed
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        create: {
          userId: mockUser.id,
          emailEnabled: undefined,
        },
        update: { emailEnabled: undefined },
      })
    })

    it('should handle database errors during update', async () => {
      mockPrisma.notificationPreference.upsert.mockRejectedValue(new Error('Database error'))

      // Mock the apiHandler to simulate error handling
      mockApiHandler.mockImplementation((handlers) => {
        return async (request: any) => {
          try {
            const method = request.method
            const handler = handlers[method]
            return await handler(request)
          } catch (error) {
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
              status: 500,
            })
          }
        }
      })

      const { PUT } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ emailEnabled: false }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON request body', async () => {
      const { PUT } = await import('../route')

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Mock the apiHandler to simulate JSON parsing error
      mockApiHandler.mockImplementation((handlers) => {
        return async (request: any) => {
          try {
            const method = request.method
            const handler = handlers[method]
            return await handler(request)
          } catch (error) {
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
              status: 500,
            })
          }
        }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})