import { prisma } from '@/lib/prisma'
import type { EventConversation } from '@prisma/client'

const MAX_CONVERSATION_MESSAGES = 100
const MAX_CONVERSATIONS_PER_USER = 50

/**
 * Create a new event conversation
 */
export async function createEventConversation(
  userId: string,
  eventId?: string
): Promise<EventConversation> {
  // Check if user has too many conversations
  const count = await prisma.eventConversation.count({
    where: { userId }
  })
  
  if (count >= MAX_CONVERSATIONS_PER_USER) {
    // Delete oldest conversation
    const oldest = await prisma.eventConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'asc' }
    })
    
    if (oldest) {
      await prisma.eventConversation.delete({
        where: { id: oldest.id }
      })
    }
  }
  
  return await prisma.eventConversation.create({
    data: {
      userId,
      eventId: eventId || 'placeholder',  // eventId is required in schema
      messages: { messages: [] }
    }
  })
}

/**
 * Get a conversation by ID
 */
export async function getEventConversation(
  conversationId: string,
  userId: string
): Promise<EventConversation | null> {
  return await prisma.eventConversation.findUnique({
    where: {
      id: conversationId,
      userId
    }
  })
}

/**
 * Update conversation messages
 */
export async function updateConversationMessages(
  conversationId: string,
  userId: string,
  messages: any[],
  metadata?: Record<string, any>
): Promise<EventConversation> {
  // Limit messages to prevent storage bloat
  const trimmedMessages = messages.slice(-MAX_CONVERSATION_MESSAGES)
  
  return await prisma.eventConversation.update({
    where: {
      id: conversationId,
      userId
    },
    data: {
      messages: { messages: trimmedMessages },
      updatedAt: new Date()
    }
  })
}

/**
 * List user's event conversations
 */
export async function listEventConversations(
  userId: string,
  options: {
    eventId?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ conversations: EventConversation[], total: number }> {
  const where: any = { userId }
  
  if (options.eventId) {
    where.eventId = options.eventId
  }
  
  const [conversations, total] = await Promise.all([
    prisma.eventConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
      include: {
        event: {
          select: {
            name: true,
            date: true
          }
        }
      }
    }),
    prisma.eventConversation.count({ where })
  ])
  
  return { conversations, total }
}

/**
 * Delete a conversation
 */
export async function deleteEventConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  await prisma.eventConversation.delete({
    where: {
      id: conversationId,
      userId
    }
  })
}

/**
 * Get conversation summary
 */
export function getConversationSummary(conversation: EventConversation): {
  messageCount: number
  firstMessage?: string
  lastMessage?: string
  hasAIResponses: boolean
} {
  const messages = (conversation.messages as any)?.messages || []
  
  return {
    messageCount: messages.length,
    firstMessage: messages[0]?.content?.substring(0, 100),
    lastMessage: messages[messages.length - 1]?.content?.substring(0, 100),
    hasAIResponses: messages.some((m: any) => m.role === 'assistant')
  }
}

/**
 * Extract event IDs mentioned in conversation
 */
export function extractEventIds(conversation: EventConversation): string[] {
  const messages = (conversation.messages as any)?.messages || []
  const eventIds = new Set<string>()
  
  // Look for event IDs in tool calls
  messages.forEach((message: any) => {
    if (message.toolCalls) {
      message.toolCalls.forEach((call: any) => {
        if (call.args?.eventId) {
          eventIds.add(call.args.eventId)
        }
      })
    }
  })
  
  return Array.from(eventIds)
}

/**
 * Clean up old conversations
 */
export async function cleanupOldConversations(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const result = await prisma.eventConversation.deleteMany({
    where: {
      updatedAt: {
        lt: cutoffDate
      }
    }
  })
  
  return result.count
}