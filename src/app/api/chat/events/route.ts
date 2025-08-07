import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  type CoreMessage,
  streamText,
  tool
} from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { getOrCreateEventManagerPat } from '@/lib/services/pat-manager.service'
import { EVENT_ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai/event-assistant'
import { eventTools } from '@/lib/mcp/tools/manageEvent'
import { registrationTools } from '@/lib/mcp/tools/manageRegistration'
import { eventTaskTools } from '@/lib/mcp/tools/manageEventTasks'
import { 
  createEventConversation,
  updateConversationMessages,
  getEventConversation 
} from '@/lib/services/event-conversation.service'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get or create PAT for event management
    const patResult = await getOrCreateEventManagerPat(session.user.id)
    if (!patResult.plainToken) {
      // PAT exists but no plain token (not newly created)
      // For now, we'll proceed without the token
      // In future, we might want to handle this differently
    }

    // Parse request body
    const { messages, conversationId } = await request.json()

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Invalid messages', { status: 400 })
    }

    // Load or create conversation
    let conversation
    let fullMessages: CoreMessage[] = messages
    
    if (conversationId) {
      conversation = await getEventConversation(conversationId, session.user.id)
      if (conversation?.messages) {
        // Merge stored messages with new ones
        const storedMessages = (conversation.messages as any).messages || []
        fullMessages = [...storedMessages, ...messages.slice(-1)] // Add only the new message
      }
    } else {
      // Create new conversation
      conversation = await createEventConversation(
        session.user.id
      )
    }

    // Define tools for the AI
    const tools = {
      // Event management tools
      maix_create_event: tool({
        description: eventTools.maix_create_event.description,
        inputSchema: eventTools.maix_create_event.parameters,
        execute: async (params) => {
          return eventTools.maix_create_event.handler(params, session.user.id)
        }
      }),
      maix_update_event: tool({
        description: eventTools.maix_update_event.description,
        inputSchema: eventTools.maix_update_event.parameters,
        execute: async (params) => {
          return eventTools.maix_update_event.handler(params, session.user.id)
        }
      }),
      maix_get_event: tool({
        description: eventTools.maix_get_event.description,
        inputSchema: eventTools.maix_get_event.parameters,
        execute: async (params) => {
          return eventTools.maix_get_event.handler(params, session.user.id)
        }
      }),
      maix_list_events: tool({
        description: eventTools.maix_list_events.description,
        inputSchema: eventTools.maix_list_events.parameters,
        execute: async (params) => {
          return eventTools.maix_list_events.handler(params, session.user.id)
        }
      }),
      maix_delete_event: tool({
        description: eventTools.maix_delete_event.description,
        inputSchema: eventTools.maix_delete_event.parameters,
        execute: async (params) => {
          return eventTools.maix_delete_event.handler(params, session.user.id)
        }
      }),
      maix_get_event_stats: tool({
        description: eventTools.maix_get_event_stats.description,
        inputSchema: eventTools.maix_get_event_stats.parameters,
        execute: async (params) => {
          return eventTools.maix_get_event_stats.handler(params, session.user.id)
        }
      }),
      
      // Registration tools
      maix_register_for_event: tool({
        description: registrationTools.maix_register_for_event.description,
        inputSchema: registrationTools.maix_register_for_event.parameters,
        execute: async (params) => {
          return registrationTools.maix_register_for_event.handler(params, session.user.id)
        }
      }),
      maix_update_registration: tool({
        description: registrationTools.maix_update_registration.description,
        inputSchema: registrationTools.maix_update_registration.parameters,
        execute: async (params) => {
          return registrationTools.maix_update_registration.handler(params, session.user.id)
        }
      }),
      maix_cancel_registration: tool({
        description: registrationTools.maix_cancel_registration.description,
        inputSchema: registrationTools.maix_cancel_registration.parameters,
        execute: async (params) => {
          return registrationTools.maix_cancel_registration.handler(params, session.user.id)
        }
      }),
      maix_list_registrations: tool({
        description: registrationTools.maix_list_registrations.description,
        inputSchema: registrationTools.maix_list_registrations.parameters,
        execute: async (params) => {
          return registrationTools.maix_list_registrations.handler(params, session.user.id)
        }
      }),
      maix_check_registration: tool({
        description: registrationTools.maix_check_registration.description,
        inputSchema: registrationTools.maix_check_registration.parameters,
        execute: async (params) => {
          return registrationTools.maix_check_registration.handler(params)
        }
      }),
      maix_get_registration_stats: tool({
        description: registrationTools.maix_get_registration_stats.description,
        inputSchema: registrationTools.maix_get_registration_stats.parameters,
        execute: async (params) => {
          return registrationTools.maix_get_registration_stats.handler(params, session.user.id)
        }
      }),
      
      // Event task tools
      maix_generate_event_tasks: tool({
        description: eventTaskTools.maix_generate_event_tasks.description,
        inputSchema: eventTaskTools.maix_generate_event_tasks.parameters,
        execute: async (params) => {
          return eventTaskTools.maix_generate_event_tasks.handler(params, session.user.id)
        }
      }),
      maix_create_event_with_tasks: tool({
        description: eventTaskTools.maix_create_event_with_tasks.description,
        inputSchema: eventTaskTools.maix_create_event_with_tasks.parameters,
        execute: async (params) => {
          return eventTaskTools.maix_create_event_with_tasks.handler(params, session.user.id)
        }
      }),
      maix_bulk_create_tasks: tool({
        description: eventTaskTools.maix_bulk_create_tasks.description,
        inputSchema: eventTaskTools.maix_bulk_create_tasks.parameters,
        execute: async (params) => {
          return eventTaskTools.maix_bulk_create_tasks.handler(params, session.user.id)
        }
      })
    }

    // Stream response using Google Gemini
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages: fullMessages,
      system: EVENT_ASSISTANT_SYSTEM_PROMPT,
      tools: tools,
      temperature: 0.7,
      onFinish: async ({ text, usage }) => {
        // Save conversation after completion
        if (conversation) {
          const conversationToSave = [
            ...fullMessages,
            { role: 'assistant', content: text }
          ]
          
          await updateConversationMessages(
            conversation.id,
            session.user.id,
            conversationToSave,
            {
              model: 'gemini-1.5-flash',
              usage,
              lastUpdated: new Date().toISOString()
            }
          )
        }
      }
    })

    // Return streaming response
    return result.toTextStreamResponse()

  } catch (error) {
    console.error('Event chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}