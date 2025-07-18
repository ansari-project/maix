import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/applications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProjectOwner = {
    id: 'owner-123',
    email: 'owner@example.com',
    name: 'Project Owner',
  }

  const mockSession = {
    user: {
      email: 'owner@example.com',
    },
  }

  const mockApplication = {
    id: 'application-123',
    message: 'I am interested in contributing to this project.',
    status: 'PENDING',
    userId: 'user-123',
    projectId: 'project-123',
    project: {
      id: 'project-123',
      title: 'AI-Powered Learning Platform',
      owner: mockProjectOwner,
    },
  }

  const mockUpdatedApplication = {
    id: 'application-123',
    status: 'ACCEPTED',
    message: 'Welcome to the team!',
    respondedAt: new Date('2024-01-15T10:00:00Z'),
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  }

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  const mockParams = { id: 'application-123' }

  describe('PATCH /api/applications/[id]', () => {
    const validUpdateData = {
      status: 'ACCEPTED',
      message: 'Welcome to the team!',
    }

    test('should update volunteer application with valid data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockResolvedValue(mockUpdatedApplication as any)

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('ACCEPTED')
      expect(responseData.message).toBe('Welcome to the team!')
      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: validUpdateData.status,
          message: validUpdateData.message,
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 404 for non-existent application', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Application not found')
    })

    test('should return 403 for non-project-owner', async () => {
      const nonOwnerSession = {
        user: {
          email: 'someone-else@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(nonOwnerSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 400 for invalid input data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)

      const invalidData = {
        status: 'INVALID_STATUS',
        message: 'A'.repeat(1001), // Too long
      }

      const request = createMockRequest(invalidData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors).toHaveLength(2)
    })

    test('should validate status enum values', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)

      const invalidData = {
        status: 'INVALID_STATUS',
      }

      const request = createMockRequest(invalidData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors[0].field).toBe('status')
    })

    test('should validate message length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)

      const invalidData = {
        status: 'ACCEPTED',
        message: 'A'.repeat(1001),
      }

      const request = createMockRequest(invalidData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Response message must be less than 1000 characters long')
    })

    test('should accept all valid status values', async () => {
      const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']

      for (const status of validStatuses) {
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
        mockPrisma.application.update.mockResolvedValue({
          ...mockUpdatedApplication,
          status,
        } as any)

        const request = createMockRequest({ status })
        const response = await PATCH(request, { params: mockParams })

        expect(response.status).toBe(200)
      }
    })

    test('should work with status only (no message)', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockResolvedValue(mockUpdatedApplication as any)

      const statusOnlyData = {
        status: 'REJECTED',
      }

      const request = createMockRequest(statusOnlyData)
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: 'REJECTED',
          message: undefined,
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should work with message only (no status)', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockResolvedValue(mockUpdatedApplication as any)

      const messageOnlyData = {
        message: 'Thank you for your interest.',
      }

      const request = createMockRequest(messageOnlyData)
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: undefined,
          message: 'Thank you for your interest.',
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should handle database errors during application lookup', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should handle database errors during application update', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should include project owner info in application lookup', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockResolvedValue(mockUpdatedApplication as any)

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })

      expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        include: {
          project: {
            include: {
              owner: true,
            },
          },
        },
      })

      expect(response.status).toBe(200)
    })

    test('should validate empty message', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockResolvedValue(mockUpdatedApplication as any)

      const emptyMessageData = {
        status: 'ACCEPTED',
        message: '',
      }

      const request = createMockRequest(emptyMessageData)
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: 'ACCEPTED',
          message: '',
          respondedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    })

    test('should set respondedAt timestamp', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.application.findUnique.mockResolvedValue(mockApplication as any)
      mockPrisma.application.update.mockResolvedValue(mockUpdatedApplication as any)

      const request = createMockRequest(validUpdateData)
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        data: {
          status: validUpdateData.status,
          message: validUpdateData.message,
          respondedAt: mockDate,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      jest.restoreAllMocks()
    })
  })
})