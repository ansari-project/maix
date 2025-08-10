import { prisma } from '@/lib/prisma'
import { AIConversation, Prisma } from '@prisma/client'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  toolsUsed?: string[]
}

export interface ConversationTurn {
  userMessage: Message
  assistantResponse: string
  toolsUsed?: string[]
  usage?: any
}

export class AIConversationService {
  /**
   * Create a new AI conversation
   */
  async create(userId: string, title?: string): Promise<AIConversation> {
    return await prisma.aIConversation.create({
      data: {
        userId,
        title,
        messages: [],
        lastActiveAt: new Date()
      }
    })
  }

  /**
   * Find conversation by ID for specific user
   */
  async findById(id: string, userId: string): Promise<AIConversation | null> {
    return await prisma.aIConversation.findFirst({
      where: {
        id,
        userId
      }
    })
  }

  /**
   * Update conversation with new messages
   */
  async update(id: string, messages: Message[]): Promise<AIConversation> {
    return await prisma.aIConversation.update({
      where: { id },
      data: {
        messages: messages as unknown as Prisma.JsonArray,
        lastActiveAt: new Date()
      }
    })
  }

  /**
   * Add a conversation turn (user message + assistant response)
   */
  async addTurn(
    id: string, 
    userMessage: string, 
    assistantResponse: string,
    toolsUsed?: string[]
  ): Promise<void> {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id }
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const messages = conversation.messages as unknown as Message[]
    
    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    })

    // Add assistant response
    messages.push({
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date(),
      toolsUsed
    })

    await prisma.aIConversation.update({
      where: { id },
      data: {
        messages: messages as unknown as Prisma.JsonArray,
        lastActiveAt: new Date()
      }
    })
  }

  /**
   * Get recent conversations for user
   */
  async getRecentForUser(userId: string, limit: number = 10): Promise<AIConversation[]> {
    return await prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      take: limit
    })
  }

  /**
   * Load or create conversation - helper for API routes
   */
  async loadOrCreate(conversationId: string | undefined, userId: string): Promise<AIConversation> {
    if (conversationId) {
      const existing = await this.findById(conversationId, userId)
      if (existing) {
        return existing
      }
    }

    // Create new conversation
    return await this.create(userId)
  }

  /**
   * Auto-generate title from first message
   */
  async updateTitle(id: string, title: string): Promise<void> {
    await prisma.aIConversation.update({
      where: { id },
      data: { title }
    })
  }

  /**
   * Delete conversation
   */
  async delete(id: string, userId: string): Promise<void> {
    await prisma.aIConversation.deleteMany({
      where: {
        id,
        userId
      }
    })
  }
}

export const aiConversationService = new AIConversationService()