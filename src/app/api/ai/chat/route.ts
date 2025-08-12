import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiConversationService } from '@/lib/services/ai-conversation.service'
import { officialMcpClientService } from '@/lib/services/official-mcp-client.service'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'
import { streamText, generateText } from 'ai'
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
      console.log('📋 Available tool names:', Object.keys(tools))
      
      // Debug: Check if tools have proper structure
      const sampleToolName = Object.keys(tools)[0]
      if (sampleToolName) {
        const sampleTool = (tools as any)[sampleToolName]
        console.log('🔍 Sample tool structure for', sampleToolName, ':', {
          hasDescription: !!sampleTool.description,
          hasParameters: !!sampleTool.parameters,
          hasInputSchema: !!sampleTool.inputSchema,
          hasExecute: typeof sampleTool.execute === 'function',
          actualKeys: Object.keys(sampleTool)
        })
        // Log the actual inputSchema if it exists
        if (sampleTool.inputSchema) {
          console.log('📋 InputSchema type:', typeof sampleTool.inputSchema)
          console.log('📋 ACTUAL inputSchema content:', JSON.stringify(sampleTool.inputSchema, null, 2))
        }
        console.log('📋 Tool description:', sampleTool.description)
      }
    } catch (toolError) {
      console.error('❌ Failed to get MCP tools, continuing without tools:', toolError)
      tools = {} // Continue without MCP tools if retrieval fails
    }

    // 6. Stream AI response using Gemini with MCP tools and Google Search grounding
    const hasTools = Object.keys(tools).length > 0
    
    // Use only MCP tools to avoid mixing function tools with provider tools
    // Gemini doesn't allow mixing custom function tools with provider-defined tools
    const allTools = {
      ...tools
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

When users ask you to perform actions like creating projects, managing todos, searching for information, or organizing their work, use these tools to help them.

Be proactive in using tools when appropriate. For example:
- If someone asks "What projects do I have?", use the search tools
- If someone says "Create a todo for...", use the todo management tool
- If someone wants to create something, use the appropriate management tool

**CRITICAL INSTRUCTION**: You MUST use the available tools to complete user requests. Never say you cannot fulfill a request if you have the appropriate tool available.

**IMPORTANT TODO HANDLING**: 
1. When users ask for "my todos", "show todos", "list todos", or similar:
   - IMMEDIATELY use maix_manage_todo with action "list-all" - this gets ALL their todos (personal + project)
   - Do NOT say you're having trouble or cannot retrieve todos
   - The tool is available and working - USE IT

2. When users want to update a todo status (e.g., "mark X as done", "complete the database task"):
   - First use maix_search_todos to find the todo by searching for keywords from their request
   - Then use maix_manage_todo with action "update" using the found todo ID
   - For "mark as done/completed": set status to "COMPLETED"
   - For "start working on X": set status to "IN_PROGRESS"

**TOOL RESULT HANDLING**: When you receive results from tools, ALWAYS format them into a clear, human-readable response. Do not just return raw tool output. Present the information in a helpful, conversational way.

Example interaction:
User: "What are my todos?"
Assistant: (calls maix_manage_todo with action "list-all")
Tool Result: {"todos": [{"id": "123", "title": "Review pull request", "status": "IN_PROGRESS"}, {"id": "124", "title": "Update documentation", "status": "NOT_STARTED"}]}
Assistant: "Here are your current todos:

1. **Review pull request** - In Progress
2. **Update documentation** - Not Started

You have 2 tasks total. Would you like to update any of these or add new ones?"

When working with dates and times, be aware of the user's timezone and adjust accordingly. For todos and deadlines, consider the user's local time.

Always confirm actions taken and provide clear feedback about what was done.`
    }
    
    // Prepend system message to messages if not already present
    let workingMessages = messages[0]?.role === 'system' 
      ? [...messages]
      : [systemMessage, ...messages]
    
    // Phase 1: Tool Execution Loop using generateText
    const maxToolIterations = 5
    let toolCallsExecuted = false
    
    for (let i = 0; i < maxToolIterations; i++) {
      console.log(`🔄 Tool iteration ${i + 1}/${maxToolIterations}`)
      
      try {
        const result = await generateText({
          model: google('gemini-2.5-flash'),
          messages: workingMessages,
          tools: allTools,
          system: systemMessage.content,
        })
        
        console.log(`📊 Iteration ${i + 1} result:`, {
          hasText: !!result.text,
          textLength: result.text?.length || 0,
          toolCallCount: result.toolCalls?.length || 0,
          finishReason: result.finishReason
        })
        
        // If we got text without tool calls, we're done with tools
        if (result.text && (!result.toolCalls || result.toolCalls.length === 0)) {
          console.log('✅ Got text response without tool calls, ending tool loop')
          // Add the assistant's response to messages for final streaming
          workingMessages.push({
            role: 'assistant',
            content: result.text
          })
          break
        }
        
        // If we have tool calls, execute them
        if (result.toolCalls && result.toolCalls.length > 0) {
          toolCallsExecuted = true
          console.log(`🛠️ Executing ${result.toolCalls.length} tool calls`)
          
          // Add assistant message with tool calls
          // For the generateText API, we need to add the assistant's message differently
          // The tool calls are part of the result, not a separate message
          workingMessages.push({
            role: 'assistant',
            content: '',  // Empty content when there are only tool calls
            toolCalls: result.toolCalls
          })
          
          // Execute tools and collect all results
          const toolResultParts = []
          for (const toolCall of result.toolCalls) {
            console.log(`⚙️ Executing tool: ${toolCall.toolName}`)
            
            // Debug: Log the complete toolCall structure
            console.log('🔍 Tool call structure:', {
              toolName: toolCall.toolName,
              hasInput: !!(toolCall as any).input,
              hasArguments: !!(toolCall as any).arguments,
              hasArgs: !!(toolCall as any).args,
              input: (toolCall as any).input,
              arguments: (toolCall as any).arguments,
              args: (toolCall as any).args
            })
            
            // Execute the tool manually using its execute function
            const tool = (allTools as any)[toolCall.toolName]
            if (tool && tool.execute) {
              try {
                const toolArgs = (toolCall as any).input || (toolCall as any).arguments || (toolCall as any).args || {}
                console.log(`📦 Tool arguments being passed:`, toolArgs)
                const toolResult = await tool.execute(toolArgs)
                console.log(`✅ Tool ${toolCall.toolName} executed successfully`)
                
                // Collect tool result with correct 'result' property
                toolResultParts.push({
                  type: 'tool-result',
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  result: toolResult  // Changed from 'output' to 'result'
                })
              } catch (toolError) {
                console.error(`❌ Tool ${toolCall.toolName} execution failed:`, toolError)
                // Add error result
                const errorMessage = toolError instanceof Error ? toolError.message : String(toolError)
                toolResultParts.push({
                  type: 'tool-result',
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  result: { error: errorMessage }  // Changed from 'output' to 'result'
                })
              }
            } else {
              console.warn(`⚠️ Tool ${toolCall.toolName} not found in available tools`)
              // Add error for missing tool
              toolResultParts.push({
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                result: { error: `Tool '${toolCall.toolName}' was not found.` }
              })
            }
          }
          
          // Add a single tool message with all the results
          if (toolResultParts.length > 0) {
            workingMessages.push({
              role: 'tool',
              content: toolResultParts
            })
          }
        } else if (!result.text) {
          console.log('⚠️ No text and no tool calls, may need to force text generation')
          break
        }
      } catch (toolError) {
        console.error(`❌ Error in tool iteration ${i + 1}:`, toolError)
        break
      }
    }
    
    // Phase 2: Final Text Generation with streamText (tools disabled)
    console.log('🎯 Starting final text generation phase')
    console.log(`📝 Messages count: ${workingMessages.length}`)
    console.log(`🛠️ Tool calls were executed: ${toolCallsExecuted}`)
    
    const streamConfig: any = {
      model: google('gemini-2.5-flash'),
      messages: workingMessages,
      // Critical: Disable tools to force text generation
      toolChoice: 'none',
      experimental_providerMetadata: true,
      onFinish: async (result: any) => {
        // Add turn to conversation after streaming completes
        const userMessage = messages[messages.length - 1]
        
        // If tools were called but no text was generated, this means Gemini needs another round
        // This shouldn't happen with proper SDK handling, but log it for debugging
        let assistantContent = result.text
        
        if (!assistantContent && result.toolCalls && result.toolCalls.length > 0) {
          console.warn('⚠️ Tools were called but no text response generated. This may indicate a continuation issue.')
          // Try to extract content from tool results for logging
          if (result.toolResults && result.toolResults.length > 0) {
            const toolResultSummary = result.toolResults.map((tr: any) => 
              `Tool ${tr.toolName || 'unknown'}: ${tr.result?.substring(0, 100) || 'no result'}`
            ).join('; ')
            assistantContent = `Processing tool results: ${toolResultSummary}`
          } else {
            assistantContent = 'Tool calls executed successfully'
          }
        } else if (!assistantContent) {
          assistantContent = 'Response generated'
        }
        
        console.log('════════════════════════════════════════')
        console.log('📥 GEMINI RESPONSE:')
        console.log('Text:', assistantContent.substring(0, 500))
        console.log('Tool Calls:', result.toolCalls?.length || 0)
        console.log('Finish Reason:', result.finishReason)
        console.log('Usage:', result.usage)
        console.log('Warnings:', result.warnings)
        
        // Debug: Log all tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log('🛠️ Tool calls made:', result.toolCalls.map((tc: any) => ({
            name: tc.toolName,
            args: tc.args,
            result: tc.result?.substring(0, 200) + '...' || 'NO RESULT'
          })))
        } else {
          console.log('⚠️ No tool calls made for message:', userMessage.content)
        }
        
        // Check for tool call errors
        if (result.toolResults && result.toolResults.length > 0) {
          console.log('🔧 Tool Results:', result.toolResults.map((tr: any) => ({
            toolCallId: tr.toolCallId,
            result: tr.result?.substring(0, 200) + '...' || 'NO RESULT',
            isError: tr.isError
          })))
        }
        console.log('════════════════════════════════════════')
        
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
          console.log('✅ Todo-related MCP tools were called in this conversation')
        }
        
        // Log if Google Search was used
        const googleSearchUsed = result.toolCalls?.some((tc: any) => 
          tc.toolName === 'google_search'
        )
        
        if (googleSearchUsed) {
          console.log('🔍 Google Search grounding was used in this conversation')
        }
      },
    }
    
    // Note: Tools are disabled in final stream to force text generation
    // They were already executed in the generateText loop above
    
    // Debug: Log FULL request to Gemini
    console.log('════════════════════════════════════════')
    console.log('📤 FINAL STREAMING REQUEST TO GEMINI:')
    console.log('Messages count:', workingMessages.length)
    console.log('Last message role:', workingMessages[workingMessages.length - 1]?.role)
    console.log('Tool Choice:', streamConfig.toolChoice)
    console.log('Tools enabled:', streamConfig.toolChoice !== 'none' ? 'Yes' : 'No (forced text)')
    console.log('════════════════════════════════════════')
    
    // Try to stream the response
    try {
      console.log('📝 Attempting final stream with config:', { 
        messageCount: workingMessages.length,
        toolsExecutedInLoop: toolCallsExecuted,
        toolChoice: streamConfig.toolChoice,
        forcingTextGeneration: true
      })
      
      const result = streamText(streamConfig)
      
      // Add conversation ID to response headers
      const response = result.toTextStreamResponse()
      response.headers.set('X-Conversation-ID', conversation.id)
      
      return response
      
    } catch (streamError) {
      console.error('🚨 StreamText failed:', streamError)
      // Fallback to a simple response without streaming
      return NextResponse.json({
        message: "I'm having trouble connecting right now. The AI service is temporarily unavailable.",
        error: true
      })
    }

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

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    // If requesting a specific conversation, return it with messages
    if (conversationId) {
      const conversation = await aiConversationService.findById(conversationId, session.user.id)
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      return NextResponse.json({ conversation })
    }

    // Otherwise, get recent conversations for user (list view)
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