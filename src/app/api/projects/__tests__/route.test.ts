import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/projects', () => {
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
    description: 'A comprehensive learning platform that uses AI to personalize education.',
    projectType: 'STARTUP',
    helpType: 'MVP',
    budgetRange: '$10,000 - $50,000',
    maxVolunteers: 5,
    contactEmail: 'contact@example.com',
    organizationUrl: 'https://example.com',
    timeline: { description: '6-month development cycle' },
    requiredSkills: ['React', 'Node.js', 'AI/ML'],
    ownerId: 'user-123',
    owner: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  }

  describe('GET /api/projects', () => {
    test('should return all active projects', async () => {
      const mockProjects = [mockProject]
      mockPrisma.project.findMany.mockResolvedValue(mockProjects as any)

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual(mockProjects)
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      })
    })

    test('should handle database errors', async () => {
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('POST /api/projects', () => {
    const validProjectData = {
      title: 'AI-Powered Learning Platform',
      description: 'A comprehensive learning platform that uses AI to personalize education for students worldwide.',
      projectType: 'STARTUP',
      helpType: 'MVP',
      budgetRange: '$10,000 - $50,000',
      maxVolunteers: 5,
      contactEmail: 'contact@example.com',
      organizationUrl: 'https://example.com',
      timeline: {
        description: '6-month development cycle',
      },
      requiredSkills: ['React', 'Node.js', 'AI/ML'],
    }

    const createMockRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest
    }

    test('should create project with valid data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.$transaction.mockResolvedValue(mockProject as any)

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.title).toBe(validProjectData.title)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('User not found')
    })

    test('should return 400 for invalid input data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        title: 'AI', // Too short
        description: 'Short description', // Too short
        projectType: 'INVALID',
        helpType: 'INVALID',
        maxVolunteers: 0, // Too low
        contactEmail: 'invalid-email',
        requiredSkills: Array(21).fill('skill'), // Too many skills
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors).toHaveLength(7)
    })

    test('should validate title length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        title: 'AI', // Too short
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Title must be at least 5 characters long')
    })

    test('should validate description length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        description: 'Too short',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Description must be at least 50 characters long')
    })

    test('should validate project type enum', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        projectType: 'INVALID',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    test('should validate help type enum', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        helpType: 'INVALID',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    test('should validate max volunteers range', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        maxVolunteers: 51, // Too high
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Cannot exceed 50 volunteers')
    })

    test('should validate contact email format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        contactEmail: 'invalid-email',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Invalid contact email address')
    })

    test('should validate organization URL format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        organizationUrl: 'not-a-url',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Invalid organization URL')
    })

    test('should convert empty organization URL to null', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.$transaction.mockResolvedValue(mockProject as any)

      const dataWithEmptyUrl = {
        ...validProjectData,
        organizationUrl: '',
      }

      const request = createMockRequest(dataWithEmptyUrl)
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    test('should validate required skills array length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        requiredSkills: Array(21).fill('skill'),
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Maximum 20 required skills allowed')
    })

    test('should validate timeline description length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        timeline: {
          description: 'A'.repeat(1001),
        },
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Timeline description must be less than 1000 characters long')
    })

    test('should validate budget range length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const invalidData = {
        ...validProjectData,
        budgetRange: 'A'.repeat(51),
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Budget range must be less than 50 characters long')
    })

    test('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should handle user lookup errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validProjectData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })
})