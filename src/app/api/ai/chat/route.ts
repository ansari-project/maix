import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiConversationService } from '@/lib/services/ai-conversation.service'
import { officialMcpClientService } from '@/lib/services/official-mcp-client.service'
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

    // 5. Get dynamic MCP tools with user's PAT using official SDK
    let tools = {}
    try {
      console.log('🔧 Attempting to get MCP tools for user:', session.user.id)
      tools = await officialMcpClientService.getTools(userPat)
      console.log('✅ MCP Tools retrieved successfully:', Object.keys(tools).length, 'tools')
    } catch (toolError) {
      console.error('❌ Failed to get MCP tools, continuing without tools:', toolError)
      tools = {} // Continue without MCP tools if retrieval fails
    }

    // 6. Stream AI response using Gemini with MCP tools
    const hasTools = Object.keys(tools).length > 0
    const streamConfig: any = {
      model: google('gemini-2.0-flash'),
      messages: messages,
      onFinish: async (result: any) => {
        // Add turn to conversation after streaming completes
        const userMessage = messages[messages.length - 1]
        const assistantContent = result.text || 'Response generated with tool calls'
        
        await aiConversationService.addTurn(
          conversation.id,
          userMessage.content || '',
          assistantContent,
          result.toolCalls?.map((tc: any) => tc.toolName) || []
        )
      },
    }
    
    // Only add tools if we have them
    if (hasTools) {
      streamConfig.tools = tools
      streamConfig.toolChoice = 'auto'
    }
    
    const stream = await streamText(streamConfig)

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