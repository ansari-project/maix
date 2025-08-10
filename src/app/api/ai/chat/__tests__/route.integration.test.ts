import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import { prismaTest } from '@/lib/test/db-test-utils'
import { getServerSession } from 'next-auth'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/ai/chat Integration Tests', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const user = await prismaTest.user.create({
      data: {
        email: 'aitest@example.com',
        username: 'aitestuser',
        name: 'AI Test User'
      }
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Clean up conversations after each test
    await prismaTest.aIConversation.deleteMany({
      where: { userId: testUserId }
    })
  })

  afterAll(async () => {
    // Clean up test user
    await prismaTest.user.delete({
      where: { id: testUserId }
    })
  })

  describe('POST /api/ai/chat', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: testUserId, email: 'aitest@example.com' },
        expires: '2024-01-01'
      })
    })

    afterEach(() => {
      mockGetServerSession.mockReset()
    })

    it('should create new conversation when no conversationId provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello AI!' }]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversationId).toBeDefined()
      expect(data.status).toBe('ready_for_phase_2')

      // Verify conversation was created in database
      const conversation = await prismaTest.aIConversation.findUnique({
        where: { id: data.conversationId }
      })
      expect(conversation).toBeDefined()
      expect(conversation?.userId).toBe(testUserId)
    })

    it('should use existing conversation when conversationId provided', async () => {
      // Create conversation first
      const conversation = await prismaTest.aIConversation.create({
        data: {
          userId: testUserId,
          title: 'Existing Chat',
          messages: [],
          lastActiveAt: new Date()
        }
      })

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Continue chat' }],
          conversationId: conversation.id
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversationId).toBe(conversation.id)
    })

    it('should return 401 when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 400 when messages array is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Messages array is required')
    })

    it('should return 400 when messages is not an array', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: 'invalid'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Messages array is required')
    })
  })

  describe('GET /api/ai/chat', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: testUserId, email: 'aitest@example.com' },
        expires: '2024-01-01'
      })
    })

    afterEach(() => {
      mockGetServerSession.mockReset()
    })

    it('should return recent conversations for authenticated user', async () => {
      // Create test conversations
      const conv1 = await prismaTest.aIConversation.create({
        data: {
          userId: testUserId,
          title: 'Chat 1',
          messages: [{ role: 'user', content: 'Hello 1' }],
          lastActiveAt: new Date(Date.now() - 1000) // Older
        }
      })

      const conv2 = await prismaTest.aIConversation.create({
        data: {
          userId: testUserId,
          title: 'Chat 2',
          messages: [{ role: 'user', content: 'Hello 2' }],
          lastActiveAt: new Date() // Newer
        }
      })

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(2)
      expect(data.conversations[0].id).toBe(conv2.id) // Most recent first
      expect(data.conversations[1].id).toBe(conv1.id)
    })

    it('should return empty array when no conversations exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toEqual([])
    })

    it('should return 401 when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'GET'
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })
})