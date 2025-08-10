import { aiConversationService, Message } from '../ai-conversation.service'
import { prismaTest } from '@/lib/test/db-test-utils'

describe('AIConversationService', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const user = await prismaTest.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User'
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

  describe('create', () => {
    it('should create a new conversation', async () => {
      const conversation = await aiConversationService.create(testUserId, 'Test Chat')

      expect(conversation).toBeDefined()
      expect(conversation.userId).toBe(testUserId)
      expect(conversation.title).toBe('Test Chat')
      expect(conversation.messages).toEqual([])
      expect(conversation.lastActiveAt).toBeDefined()
    })

    it('should create a conversation without title', async () => {
      const conversation = await aiConversationService.create(testUserId)

      expect(conversation.title).toBeNull()
    })
  })

  describe('findById', () => {
    it('should find conversation by ID for correct user', async () => {
      const created = await aiConversationService.create(testUserId, 'Find Test')
      const found = await aiConversationService.findById(created.id, testUserId)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.title).toBe('Find Test')
    })

    it('should return null for non-existent conversation', async () => {
      const found = await aiConversationService.findById('nonexistent', testUserId)
      expect(found).toBeNull()
    })

    it('should return null for conversation belonging to different user', async () => {
      // Create another user
      const otherUser = await prismaTest.user.create({
        data: {
          email: 'other@example.com',
          username: 'otheruser',
          name: 'Other User'
        }
      })

      const conversation = await aiConversationService.create(otherUser.id, 'Other Chat')
      const found = await aiConversationService.findById(conversation.id, testUserId)

      expect(found).toBeNull()

      // Cleanup
      await prismaTest.aIConversation.delete({ where: { id: conversation.id } })
      await prismaTest.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('addTurn', () => {
    it('should add user message and assistant response', async () => {
      const conversation = await aiConversationService.create(testUserId)

      await aiConversationService.addTurn(
        conversation.id,
        'Hello AI!',
        'Hello! How can I help you?',
        ['greeting']
      )

      const updated = await aiConversationService.findById(conversation.id, testUserId)
      const messages = updated?.messages as unknown as Message[]

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('Hello AI!')
      expect(messages[1].role).toBe('assistant')
      expect(messages[1].content).toBe('Hello! How can I help you?')
      expect(messages[1].toolsUsed).toEqual(['greeting'])
    })

    it('should throw error for non-existent conversation', async () => {
      await expect(
        aiConversationService.addTurn('nonexistent', 'test', 'test')
      ).rejects.toThrow('Conversation not found')
    })

    it('should handle multiple turns', async () => {
      const conversation = await aiConversationService.create(testUserId)

      await aiConversationService.addTurn(conversation.id, 'First message', 'First response')
      await aiConversationService.addTurn(conversation.id, 'Second message', 'Second response')

      const updated = await aiConversationService.findById(conversation.id, testUserId)
      const messages = updated?.messages as unknown as Message[]

      expect(messages).toHaveLength(4)
      expect(messages[0].content).toBe('First message')
      expect(messages[1].content).toBe('First response')
      expect(messages[2].content).toBe('Second message')
      expect(messages[3].content).toBe('Second response')
    })
  })

  describe('getRecentForUser', () => {
    it('should return conversations ordered by lastActiveAt', async () => {
      const conv1 = await aiConversationService.create(testUserId, 'First')
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      const conv2 = await aiConversationService.create(testUserId, 'Second')

      const recent = await aiConversationService.getRecentForUser(testUserId)

      expect(recent).toHaveLength(2)
      expect(recent[0].id).toBe(conv2.id) // Most recent first
      expect(recent[1].id).toBe(conv1.id)
    })

    it('should limit results correctly', async () => {
      // Create 3 conversations
      for (let i = 0; i < 3; i++) {
        await aiConversationService.create(testUserId, `Chat ${i}`)
      }

      const recent = await aiConversationService.getRecentForUser(testUserId, 2)
      expect(recent).toHaveLength(2)
    })
  })

  describe('loadOrCreate', () => {
    it('should load existing conversation when ID provided', async () => {
      const created = await aiConversationService.create(testUserId, 'Existing')
      const loaded = await aiConversationService.loadOrCreate(created.id, testUserId)

      expect(loaded.id).toBe(created.id)
      expect(loaded.title).toBe('Existing')
    })

    it('should create new conversation when ID not provided', async () => {
      const conversation = await aiConversationService.loadOrCreate(undefined, testUserId)

      expect(conversation).toBeDefined()
      expect(conversation.userId).toBe(testUserId)
      expect(conversation.title).toBeNull()
    })

    it('should create new conversation when invalid ID provided', async () => {
      const conversation = await aiConversationService.loadOrCreate('invalid', testUserId)

      expect(conversation).toBeDefined()
      expect(conversation.userId).toBe(testUserId)
      expect(conversation.id).not.toBe('invalid')
    })
  })

  describe('updateTitle', () => {
    it('should update conversation title', async () => {
      const conversation = await aiConversationService.create(testUserId)
      await aiConversationService.updateTitle(conversation.id, 'Updated Title')

      const updated = await aiConversationService.findById(conversation.id, testUserId)
      expect(updated?.title).toBe('Updated Title')
    })
  })

  describe('delete', () => {
    it('should delete conversation for correct user', async () => {
      const conversation = await aiConversationService.create(testUserId, 'To Delete')
      await aiConversationService.delete(conversation.id, testUserId)

      const found = await aiConversationService.findById(conversation.id, testUserId)
      expect(found).toBeNull()
    })

    it('should not delete conversation for different user', async () => {
      const otherUser = await prismaTest.user.create({
        data: {
          email: 'other2@example.com',
          username: 'otheruser2',
          name: 'Other User 2'
        }
      })

      const conversation = await aiConversationService.create(testUserId, 'Protected')
      await aiConversationService.delete(conversation.id, otherUser.id)

      // Should still exist
      const found = await aiConversationService.findById(conversation.id, testUserId)
      expect(found).toBeDefined()

      // Cleanup
      await prismaTest.user.delete({ where: { id: otherUser.id } })
    })
  })
})