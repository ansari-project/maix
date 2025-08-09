/**
 * @jest-environment node
 */

/**
 * Auth Tokens Route Integration Tests
 * Tests with real database instead of mocks
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

// Mock only external dependencies
jest.mock('next-auth')

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET, POST } from '../route'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/auth/tokens Integration Tests', () => {
  let testUser: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Create test user
    testUser = await createTestUser({
      name: 'Test User',
      email: 'test@example.com'
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
  }

  describe('GET /api/auth/tokens', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/tokens')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when user is not found in database', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          email: 'nonexistent@example.com',
          name: 'Non Existent',
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      })

      const request = new NextRequest('http://localhost/api/auth/tokens')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return empty array when user has no tokens', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/auth/tokens')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tokens).toEqual([])
    })

    it('should return user tokens from database', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      // Create some tokens in the database
      const token1 = await prismaTest.personalAccessToken.create({
        data: {
          name: 'Test Token 1',
          token: 'maix_pat_test1',
          hashedToken: 'hashed1',
          userId: testUser.id,
          lastUsedAt: new Date(),
        }
      })

      const token2 = await prismaTest.personalAccessToken.create({
        data: {
          name: 'Test Token 2',
          token: 'maix_pat_test2',
          hashedToken: 'hashed2',
          userId: testUser.id,
        }
      })

      const request = new NextRequest('http://localhost/api/auth/tokens')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tokens).toHaveLength(2)
      expect(data.tokens[0].name).toBe('Test Token 1')
      expect(data.tokens[1].name).toBe('Test Token 2')
      // Should not return the actual token values
      expect(data.tokens[0].token).toBeUndefined()
      expect(data.tokens[0].hashedToken).toBeUndefined()
    })
  })

  describe('POST /api/auth/tokens', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid token name', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token name is required and must be 1-100 characters')
    })

    it('should return 400 for token name too long', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token name is required and must be 1-100 characters')
    })

    it('should return 404 when user is not found in database', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          email: 'nonexistent@example.com',
          name: 'Non Existent',
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      })

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should create token in database and return it', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'My API Token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.token).toBeDefined()
      expect(data.token.name).toBe('My API Token')
      expect(data.token.token).toMatch(/^maix_pat_/)
      expect(data.token.userId).toBe(testUser.id)

      // Verify token was created in database
      const tokenInDb = await prismaTest.personalAccessToken.findFirst({
        where: { userId: testUser.id }
      })
      expect(tokenInDb).toBeTruthy()
      expect(tokenInDb?.name).toBe('My API Token')
      expect(tokenInDb?.hashedToken).toBeDefined()
      // Actual token should not be stored, only hash
      expect(tokenInDb?.token).not.toBe(data.token.token)
    })

    it('should allow multiple tokens with same name for same user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      // Create first token
      const request1 = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Duplicate Name' }),
      })
      const response1 = await POST(request1)
      expect(response1.status).toBe(201)

      // Create second token with same name
      const request2 = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Duplicate Name' }),
      })
      const response2 = await POST(request2)
      expect(response2.status).toBe(201)

      // Verify both tokens exist in database
      const tokensInDb = await prismaTest.personalAccessToken.findMany({
        where: { userId: testUser.id }
      })
      expect(tokensInDb).toHaveLength(2)
      expect(tokensInDb[0].name).toBe('Duplicate Name')
      expect(tokensInDb[1].name).toBe('Duplicate Name')
    })

    it('should handle concurrent token creation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      // Create multiple tokens concurrently
      const requests = Array.from({ length: 3 }, (_, i) => 
        new NextRequest('http://localhost/api/auth/tokens', {
          method: 'POST',
          body: JSON.stringify({ name: `Concurrent Token ${i}` }),
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      const statuses = responses.map(r => r.status)

      // All should succeed
      expect(statuses.every(s => s === 201)).toBe(true)

      // Verify all tokens were created
      const tokensInDb = await prismaTest.personalAccessToken.findMany({
        where: { userId: testUser.id }
      })
      expect(tokensInDb).toHaveLength(3)
    })
  })
})