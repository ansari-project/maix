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
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/services/notification.service', () => ({
  NotificationService: {
    markAsRead: jest.fn(),
  },
}))

import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { NotificationService } from '@/services/notification.service'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>

describe('/api/notifications/mark-read', () => {
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

  describe('POST /api/notifications/mark-read', () => {
    it('should mark notifications as read successfully', async () => {
      mockSession(mockUser)

      const notificationIds = ['notif-1', 'notif-2', 'notif-3']
      mockNotificationService.markAsRead.mockResolvedValue(notificationIds.length)

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {
        notificationIds,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationIds, mockUser.id)
    })

    it('should handle empty notification IDs array', async () => {
      mockSession(mockUser)

      mockNotificationService.markAsRead.mockResolvedValue(0)

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {
        notificationIds: [],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith([], mockUser.id)
    })

    it('should return 401 when not authenticated', async () => {
      mockSession(null)

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {
        notificationIds: ['notif-1'],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject invalid notification IDs (not array)', async () => {
      mockSession(mockUser)

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {
        notificationIds: 'not-an-array',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid notification IDs')
    })

    it('should reject missing notification IDs field', async () => {
      mockSession(mockUser)

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid notification IDs')
    })

    it('should handle notification service errors', async () => {
      mockSession(mockUser)

      mockNotificationService.markAsRead.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {
        notificationIds: ['notif-1'],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle non-string array elements', async () => {
      mockSession(mockUser)

      mockNotificationService.markAsRead.mockResolvedValue(4)

      const request = createMockRequest('POST', 'http://localhost:3000/api/notifications/mark-read', {
        notificationIds: ['valid-id', 123, null, 'another-valid-id'],
      })
      const response = await POST(request)
      const data = await response.json()

      // The route doesn't validate array elements, so this succeeds
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})