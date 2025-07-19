import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Mock the dependencies
jest.mock('@/lib/prisma')
jest.mock('bcryptjs')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('/api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validSignupData = {
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'Password123!',
  }

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  describe('POST /api/auth/signup', () => {
    test('should create user with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        name: validSignupData.name,
        username: validSignupData.username,
        email: validSignupData.email,
        password: 'hashed-password',
      }

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // First call for email check
        .mockResolvedValueOnce(null) // Second call for username check
      mockPrisma.user.create.mockResolvedValue(mockUser)
      mockBcrypt.hash.mockResolvedValue('hashed-password')

      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.message).toBe('User created successfully')
      expect(responseData.userId).toBe('user-123')
      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123!', 8)
    })

    test('should return 400 for invalid input data', async () => {
      const invalidData = {
        name: 'A', // Too short
        username: 'ab', // Too short
        email: 'invalid-email',
        password: 'weak',
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Password requirements not met')
      expect(responseData.errors.length).toBeGreaterThanOrEqual(3)
      expect(responseData.errors.some((err: any) => err.field === 'name')).toBe(true)
      expect(responseData.errors.some((err: any) => err.field === 'email')).toBe(true)
      expect(responseData.errors.some((err: any) => err.field === 'password')).toBe(true)
    })

    test('should return 400 for existing user', async () => {
      const existingUser = {
        id: 'existing-user',
        email: validSignupData.email,
      }

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser as any) // First call for email check
        .mockResolvedValueOnce(null) // Second call for username check

      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('User with this email already exists')
    })

    test('should validate password strength', async () => {
      const weakPasswordData = {
        ...validSignupData,
        password: 'password', // Missing uppercase, number, special char
      }

      const request = createMockRequest(weakPasswordData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Password requirements not met')
      expect(responseData.errors.some((err: any) => 
        err.message.includes('uppercase')
      )).toBe(true)
    })

    test('should validate name format', async () => {
      const invalidNameData = {
        ...validSignupData,
        name: 'John123', // Contains numbers
      }

      const request = createMockRequest(invalidNameData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors[0].message).toBe('Name can only contain letters and spaces')
    })

    test('should validate email format', async () => {
      const invalidEmailData = {
        ...validSignupData,
        email: 'not-an-email',
      }

      const request = createMockRequest(invalidEmailData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
      expect(responseData.errors[0].message).toBe('Invalid email address')
    })

    test('should handle database errors', async () => {
      mockPrisma.user.findUnique
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null)

      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should handle bcrypt errors', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // First call for email check
        .mockResolvedValueOnce(null) // Second call for username check
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'))

      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    test('should validate password length limits', async () => {
      const shortPasswordData = {
        ...validSignupData,
        password: 'Pass1!', // Only 6 characters
      }

      const request = createMockRequest(shortPasswordData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Password must be at least 8 characters long')
    })

    test('should validate name length limits', async () => {
      const longNameData = {
        ...validSignupData,
        name: 'A'.repeat(51), // 51 characters
      }

      const request = createMockRequest(longNameData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Name must be less than 50 characters long')
    })

    test('should validate email length limits', async () => {
      const longEmailData = {
        ...validSignupData,
        email: 'a'.repeat(250) + '@example.com', // Over 255 characters
      }

      const request = createMockRequest(longEmailData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Email must be less than 255 characters long')
    })
  })
})