import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Software engineer',
    specialty: 'AI',
    experienceLevel: 'SENIOR',
    skills: ['React', 'Node.js'],
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    githubUrl: 'https://github.com/johndoe',
    portfolioUrl: 'https://johndoe.com',
    availability: 'Available weekends',
    timezone: 'UTC-5',
  }

  const mockSession = {
    user: {
      email: 'john@example.com',
    },
  }

  describe('GET /api/profile', () => {
    test('should return user profile for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          specialty: true,
          experienceLevel: true,
          skills: true,
          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          availability: true,
          timezone: true,
        },
      })
    })

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('User not found')
    })

    test('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/profile', () => {
    const validUpdateData = {
      name: 'Jane Doe',
      bio: 'Senior Software Engineer',
      specialty: 'FULL_STACK',
      experienceLevel: 'SENIOR',
      skills: ['React', 'Node.js', 'Python'],
      linkedinUrl: 'https://linkedin.com/in/janedoe',
      githubUrl: 'https://github.com/janedoe',
      portfolioUrl: 'https://janedoe.com',
      availability: 'Available weekends',
      timezone: 'UTC-8',
    }

    const createMockRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest
    }

    test('should update user profile with valid data', async () => {
      const updatedUser = { ...mockUser, ...validUpdateData }
      
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.update.mockResolvedValue(updatedUser as any)

      const request = createMockRequest(validUpdateData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.name).toBe('Jane Doe')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        data: expect.objectContaining(validUpdateData),
        select: expect.any(Object),
      })
    })

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest(validUpdateData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    test('should return 400 for invalid input data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        name: 'A', // Too short
        bio: 'A'.repeat(1001), // Too long
        specialty: 'INVALID',
        skills: Array(21).fill('skill'), // Too many skills
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid input')
      expect(responseData.errors).toHaveLength(4)
    })

    test('should validate LinkedIn URL format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        linkedinUrl: 'https://facebook.com/profile',
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Must be a valid LinkedIn profile URL')
    })

    test('should validate GitHub URL format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        githubUrl: 'https://gitlab.com/user',
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Must be a valid GitHub profile URL')
    })

    test('should accept empty strings for URL fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      const dataWithEmptyUrls = {
        ...validUpdateData,
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
      }

      const request = createMockRequest(dataWithEmptyUrls)
      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        data: expect.objectContaining({
          linkedinUrl: null,
          githubUrl: null,
          portfolioUrl: null,
        }),
        select: expect.any(Object),
      })
    })

    test('should validate specialty enum', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        specialty: 'INVALID_SPECIALTY',
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid input')
    })

    test('should validate experience level enum', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        experienceLevel: 'INVALID_LEVEL',
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid input')
    })

    test('should validate skills array length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        skills: Array(21).fill('skill'),
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Maximum 20 skills allowed')
    })

    test('should validate bio length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        bio: 'A'.repeat(1001),
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Bio must be less than 1000 characters long')
    })

    test('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(validUpdateData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    test('should validate name format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        name: 'John123',
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Name can only contain letters and spaces')
    })

    test('should validate availability length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        availability: 'A'.repeat(101),
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Availability must be less than 100 characters long')
    })

    test('should validate timezone length', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        timezone: 'A'.repeat(51),
      }

      const request = createMockRequest(invalidData)
      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Timezone must be less than 50 characters long')
    })
  })
})