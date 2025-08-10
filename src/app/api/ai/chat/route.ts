import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiConversationService } from '@/lib/services/ai-conversation.service'
import { mcpClientService } from '@/lib/services/mcp-client.service'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 2. Parse request
    const { messages, conversationId } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // 3. Load or create conversation
    const conversation = await aiConversationService.loadOrCreate(
      conversationId, 
      session.user.id
    )

    // 4. Get or create AI Assistant PAT for this user
    const userPat = await getOrCreateEncryptedAIAssistantPat(session.user.id)

    // 5. Get dynamic MCP tools with user's PAT
    const tools = await mcpClientService.getTools(userPat)

    // 6. Stream AI response using Gemini with MCP tools
    const stream = await streamText({
      model: google('gemini-2.0-flash'),
      messages: messages,
      tools,
      toolChoice: 'auto',
      onFinish: async (result) => {
        // Add turn to conversation after streaming completes
        const userMessage = messages[messages.length - 1]
        const assistantContent = result.text || 'Response generated with tool calls'
        
        await aiConversationService.addTurn(
          conversation.id,
          userMessage.content || '',
          assistantContent,
          result.toolCalls?.map(tc => tc.toolName) || []
        )
      },
    })

    // Add conversation ID to response headers
    const response = stream.toTextStreamResponse()
    response.headers.set('X-Conversation-ID', conversation.id)
    
    return response

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get recent conversations for user
    const conversations = await aiConversationService.getRecentForUser(session.user.id)

    return NextResponse.json({ conversations })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}