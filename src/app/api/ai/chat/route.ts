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
    const { messages, conversationId, timezone } = await request.json()

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

    // 6. Stream AI response using Gemini with MCP tools and Google Search grounding
    const hasTools = Object.keys(tools).length > 0
    
    // Add Google Search grounding as a built-in tool
    // This enables the AI to search Google for real-time information
    const allTools = {
      ...tools,
      // Enable Google Search grounding for real-time information
      google_search: google.tools.googleSearch({})
    }
    
    // Create a system message that describes available tools dynamically
    const toolNames = Object.keys(allTools)
    const toolDescriptions = toolNames.map(name => {
      const tool = (allTools as any)[name]
      // Get the actual description from the tool if available
      const description = tool?.description || name.replace(/_/g, ' ')
      return `- ${name}: ${description}`
    }).join('\n')
    
    // Get current date and format timezone info
    const currentDate = new Date().toISOString().split('T')[0]
    const userTimezone = timezone || 'UTC'
    const timezoneInfo = timezone ? `User's timezone: ${timezone}` : 'Timezone: UTC (default)'
    
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant for Maix, a platform that connects skilled volunteers with meaningful AI/tech projects. 

Current date: ${currentDate}
${timezoneInfo}
      
You have access to ${toolNames.length} tools to help users manage their work on the platform:

${toolDescriptions}

When users ask you to perform actions like creating projects, managing todos, searching for information, or organizing their work, use these tools to help them. You can search Google for current events, facts, and real-time information when needed.

Be proactive in using tools when appropriate. For example:
- If someone asks "What projects do I have?", use the search tools
- If someone says "Create a todo for...", use the todo management tool
- If someone asks about current events or facts, use google_search
- If someone wants to create something, use the appropriate management tool

When working with dates and times, be aware of the user's timezone and adjust accordingly. For todos and deadlines, consider the user's local time.

Always confirm actions taken and provide clear feedback about what was done.`
    }
    
    // Prepend system message to messages if not already present
    const messagesWithSystem = messages[0]?.role === 'system' 
      ? messages 
      : [systemMessage, ...messages]
    
    const streamConfig: any = {
      model: google('gemini-2.0-flash'),
      messages: messagesWithSystem,
      experimental_providerMetadata: true, // Enable to get grounding metadata
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
        
        // Log if todo tools were called for debugging
        const todoToolsCalled = result.toolCalls?.some((tc: any) => 
          tc.toolName === 'maix_manage_todo' || 
          tc.toolName === 'maix_manage_personal_project'
        )
        
        if (todoToolsCalled) {
          console.log('Todo-related MCP tools were called in this conversation')
        }
        
        // Log if Google Search was used
        const googleSearchUsed = result.toolCalls?.some((tc: any) => 
          tc.toolName === 'google_search'
        )
        
        if (googleSearchUsed) {
          console.log('Google Search grounding was used in this conversation')
        }
      },
    }
    
    // Add tools if we have any (MCP tools + Google Search)
    if (Object.keys(allTools).length > 0) {
      streamConfig.tools = allTools
      streamConfig.toolChoice = 'auto'
    }
    
    // Try to stream the response
    let stream
    try {
      console.log('📝 Attempting to stream with config:', { 
        hasTools, 
        messageCount: messages.length,
        mcpToolCount: Object.keys(tools).length,
        googleSearchEnabled: true,
        totalToolCount: Object.keys(allTools).length 
      })
      stream = await streamText(streamConfig)
    } catch (streamError) {
      console.error('🚨 StreamText failed:', streamError)
      // Fallback to a simple response without streaming
      return NextResponse.json({
        message: "I'm having trouble connecting right now. The AI service is temporarily unavailable.",
        error: true
      })
    }

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