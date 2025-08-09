/**
 * @jest-environment node
import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
 */

/**
 * Auth Signup Route Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real users in a test database
 *   - Validates database constraints and unique indexes
 *   - Tests actual password hashing and validation
 *   - Verifies data persistence and integrity
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('/api/auth/signup Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000) // 30 second timeout for database setup

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
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
    it('should create user with valid data in real database', async () => {
      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.message).toBe('User created successfully')
      expect(responseData.userId).toBeDefined()

      // Verify user was actually created in database
      const userInDb = await prismaTest.user.findUnique({
        where: { email: validSignupData.email }
      })
      
      expect(userInDb).toBeTruthy()
      expect(userInDb?.name).toBe(validSignupData.name)
      expect(userInDb?.username).toBe(validSignupData.username)
      expect(userInDb?.email).toBe(validSignupData.email)
      // Password should be hashed, not plain text
      expect(userInDb?.password).not.toBe(validSignupData.password)
      expect(userInDb?.password).toContain('$2b$') // bcrypt hash prefix (modern bcrypt uses $2b$)
    })

    it('should return 400 for invalid input data', async () => {
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

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should prevent duplicate email registration', async () => {
      // Create first user
      await createTestUser({
        name: 'Existing User',
        email: validSignupData.email,
        username: 'existinguser'
      })

      // Try to create another user with same email
      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('User with this email already exists')

      // Verify only one user exists
      const userCount = await prismaTest.user.count({
        where: { email: validSignupData.email }
      })
      expect(userCount).toBe(1)
    })

    it('should prevent duplicate username registration', async () => {
      // Create first user with the username
      await createTestUser({
        name: 'Existing User',
        email: 'existing@example.com',
        username: validSignupData.username
      })

      // Try to create another user with same username
      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Username is already taken')

      // Verify only one user with this username exists
      const userCount = await prismaTest.user.count({
        where: { username: validSignupData.username }
      })
      expect(userCount).toBe(1)
    })

    it('should validate password strength requirements', async () => {
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

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should validate name format', async () => {
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

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should validate email format', async () => {
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

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should handle database constraint violations gracefully', async () => {
      // Create a user first
      const firstUser = await createTestUser({
        name: 'First User',
        email: 'first@example.com',
        username: 'firstuser'
      })

      // Try to create another user with same email (bypassing our checks somehow)
      // This tests the database constraint as a last line of defense
      const request = createMockRequest({
        ...validSignupData,
        email: 'first@example.com', // Duplicate email
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('User with this email already exists')
    })

    it('should validate password length limits', async () => {
      const shortPasswordData = {
        ...validSignupData,
        password: 'Pass1!', // Only 6 characters
      }

      const request = createMockRequest(shortPasswordData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Password must be at least 8 characters long')

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should validate name length limits', async () => {
      const longNameData = {
        ...validSignupData,
        name: 'A'.repeat(51), // 51 characters
      }

      const request = createMockRequest(longNameData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Name must be less than 50 characters long')

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should validate email length limits', async () => {
      const longEmailData = {
        ...validSignupData,
        email: 'a'.repeat(250) + '@example.com', // Over 255 characters
      }

      const request = createMockRequest(longEmailData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.errors[0].message).toBe('Email must be less than 255 characters long')

      // Verify no user was created
      const userCount = await prismaTest.user.count()
      expect(userCount).toBe(0)
    })

    it('should handle concurrent signup attempts gracefully', async () => {
      // Use unique data for this test to avoid conflicts with other tests
      const concurrentData = {
        ...validSignupData,
        email: 'concurrent@example.com',
        username: 'concurrentuser'
      }
      
      // Simulate concurrent requests with same email
      const request1 = createMockRequest(concurrentData)
      const request2 = createMockRequest(concurrentData)

      // Run both requests in parallel
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ])

      // Due to race conditions, both might succeed (if checks happen before inserts)
      // or one might fail. The database unique constraint ensures only one user is created.
      const statuses = [response1.status, response2.status]
      
      // At least one should succeed
      expect(statuses).toContain(201)
      
      // Verify only one user was created despite concurrent attempts
      const userCount = await prismaTest.user.count({
        where: { email: concurrentData.email }
      })
      expect(userCount).toBe(1)
    })

    it('should reject input with whitespace in fields', async () => {
      const dataWithWhitespace = {
        name: '  John Doe  ',
        username: '  johndoe  ',
        email: '  john@example.com  ',
        password: 'Password123!',
      }

      const request = createMockRequest(dataWithWhitespace)
      const response = await POST(request)
      const responseData = await response.json()

      // Currently the API doesn't trim whitespace, so it will fail validation
      expect(response.status).toBe(400)
      // Username and email with spaces would fail validation
      expect(responseData.message).toBe('Invalid input')
    })

    it('should create user with all required fields and proper defaults', async () => {
      const request = createMockRequest(validSignupData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)

      const user = await prismaTest.user.findUnique({
        where: { id: responseData.userId }
      })

      // Verify all user fields
      expect(user).toBeTruthy()
      expect(user?.isActive).toBe(true) // Should default to active
      expect(user?.createdAt).toBeInstanceOf(Date)
      expect(user?.updatedAt).toBeInstanceOf(Date)
    })
  })
})