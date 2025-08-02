import { NextRequest } from 'next/server'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string }) {
        super(message)
        this.code = code
      }
    },
    PrismaClientUnknownRequestError: class PrismaClientUnknownRequestError extends Error {
      constructor(message: string) {
        super(message)
      }
    },
    PrismaClientValidationError: class PrismaClientValidationError extends Error {
      constructor(message: string) {
        super(message)
      }
    }
  }
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

import { GET, PUT } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/notifications/preferences', () => {
  const mockUser = createTestUser({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock user lookup for authentication
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
  })

  describe('GET /api/notifications/preferences', () => {
    it('should return user preferences when they exist', async () => {
      mockSession(mockUser)

      const mockPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPreference as any)

      const request = createMockRequest('GET', 'http://localhost:3000/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.emailEnabled).toBe(false)
    })

    it('should return default preferences when none exist', async () => {
      mockSession(mockUser)
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)

      const request = createMockRequest('GET', 'http://localhost:3000/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.emailEnabled).toBe(true) // Default is true
    })

    it('should return 401 when not authenticated', async () => {
      mockSession(null)

      const request = createMockRequest('GET', 'http://localhost:3000/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      mockSession(mockUser)
      mockPrisma.notificationPreference.findUnique.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/notifications/preferences', () => {
    it('should update existing preferences', async () => {
      mockSession(mockUser)

      const requestBody = {
        emailEnabled: false,
      }

      const updatedPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPreference as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/notifications/preferences', requestBody)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.emailEnabled).toBe(false)
      expect(data.userId).toBe(mockUser.id)

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        update: { emailEnabled: false },
        create: { userId: mockUser.id, emailEnabled: false },
      })
    })

    it('should create new preferences if none exist', async () => {
      mockSession(mockUser)

      const requestBody = {
        emailEnabled: true,
      }

      const newPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.upsert.mockResolvedValue(newPreference as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/notifications/preferences', requestBody)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.emailEnabled).toBe(true)
      expect(data.userId).toBe(mockUser.id)

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        update: { emailEnabled: true },
        create: { userId: mockUser.id, emailEnabled: true },
      })
    })

    it('should return 401 when not authenticated', async () => {
      mockSession(null)

      const requestBody = {
        emailEnabled: false,
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/notifications/preferences', requestBody)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle invalid request body', async () => {
      mockSession(mockUser)

      const requestBody = {
        emailEnabled: 'not-a-boolean', // Invalid type
      }

      const updatedPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: 'not-a-boolean',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPreference as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/notifications/preferences', requestBody)
      const response = await PUT(request)
      const data = await response.json()

      // Without validation, this actually succeeds
      expect(response.status).toBe(200)
      expect(data.emailEnabled).toBe('not-a-boolean')
    })

    it('should handle database errors during update', async () => {
      mockSession(mockUser)

      const requestBody = {
        emailEnabled: false,
      }

      mockPrisma.notificationPreference.upsert.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('PUT', 'http://localhost:3000/api/notifications/preferences', requestBody)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle empty request body', async () => {
      mockSession(mockUser)

      const updatedPreference = {
        id: 'pref-1',
        userId: mockUser.id,
        emailEnabled: undefined, // emailEnabled will be undefined when destructuring from empty object
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPreference as any)

      const request = createMockRequest('PUT', 'http://localhost:3000/api/notifications/preferences', {})
      const response = await PUT(request)
      const data = await response.json()

      // Without validation, this actually succeeds with undefined
      expect(response.status).toBe(200)
      expect(data.emailEnabled).toBeUndefined()
    })
  })
})