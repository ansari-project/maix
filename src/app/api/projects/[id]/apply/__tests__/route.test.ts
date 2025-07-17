import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/projects/[id]/apply', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe',
  }

  const mockSession = {
    user: {
      email: 'john@example.com',
    },
  }

  const mockProject = {
    id: 'project-123',
    title: 'AI-Powered Learning Platform',
    maxVolunteers: 5,
    applications: [],
  }

  const mockApplication = {
    id: 'application-123',
    message: 'I am interested in contributing to this project with my React and Node.js skills.',
    userId: 'user-123',
    projectId: 'project-123',
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    project: {
      title: 'AI-Powered Learning Platform',
    },
  }

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  const mockParams = { id: 'project-123' }

  describe('POST /api/projects/[id]/apply', () => {
    const validApplicationData = {
      message: 'I am interested in contributing to this project with my React and Node.js skills.',
    }

    test('should create application with valid data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockResolvedValue(mockApplication as any)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.message).toBe(validApplicationData.message)
      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: {
          message: validApplicationData.message,
          userId: mockUser.id,
          projectId: mockParams.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              title: true,
            },
          },
        },
      })
    })

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('User not found')
    })

    test('should return 404 for non-existent project', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Project not found')
    })

    test('should return 400 for existing application', async () => {
      const existingApplication = {
        id: 'existing-application',
        userId: mockUser.id,
        projectId: mockParams.id,
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(existingApplication as any)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('You have already applied to this project')
    })

    test('should return 400 when project is at capacity', async () => {
      const fullProject = {
        ...mockProject,
        maxVolunteers: 2,
        applications: [
          { id: 'app-1', userId: 'user-1' },
          { id: 'app-2', userId: 'user-2' },
        ],
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(fullProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('This project has reached its volunteer limit')
    })

    test('should return 400 for invalid input data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const invalidData = {
        message: 'Short', // Too short
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors[0].message).toBe('Application message must be at least 10 characters long')
    })

    test('should validate message length - too short', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const invalidData = {
        message: 'Too short',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Application message must be at least 10 characters long')
    })

    test('should validate message length - too long', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const invalidData = {
        message: 'A'.repeat(2001),
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Application message must be less than 2000 characters long')
    })

    test('should validate message is required', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const invalidData = {}

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors[0].field).toBe('message')
    })

    test('should check for existing application with correct composite key', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockResolvedValue(mockApplication as any)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })

      expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
        where: {
          userId_projectId: {
            userId: mockUser.id,
            projectId: mockParams.id,
          },
        },
      })

      expect(response.status).toBe(201)
    })

    test('should handle database errors during user lookup', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should handle database errors during project lookup', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should handle database errors during application creation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should include project info in application details', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)
      mockPrisma.application.create.mockResolvedValue(mockApplication as any)

      const request = createMockRequest(validApplicationData)
      const response = await POST(request, { params: mockParams })

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: mockParams.id },
        include: {
          applications: true,
        },
      })

      expect(response.status).toBe(201)
    })

    test('should validate empty message', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const invalidData = {
        message: '',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Application message must be at least 10 characters long')
    })
  })
})