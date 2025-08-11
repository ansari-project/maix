import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { officialMcpClientService } from '@/lib/services/official-mcp-client.service'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Get or create AI Assistant PAT for this user
    const userPat = await getOrCreateEncryptedAIAssistantPat(session.user.id)

    // 3. Get MCP tools using the service
    console.log('🔧 Testing MCP tools loading for user:', session.user.id)
    const tools = await officialMcpClientService.getTools(userPat)
    
    // 4. Return tool count and names
    const toolNames = Object.keys(tools)
    console.log('✅ Successfully loaded MCP tools:', toolNames)
    
    return NextResponse.json({
      success: true,
      patPrefix: userPat?.substring(0, 20) + '...',
      toolCount: toolNames.length,
      toolNames: toolNames,
      message: `Successfully loaded ${toolNames.length} MCP tools`,
      explanation: toolNames.length > 0 
        ? "✅ SUCCESS: MCP tools loaded and converted correctly" 
        : "⚠️ WARNING: Connection successful but no tools loaded"
    })

  } catch (error) {
    console.error('MCP Test Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load MCP tools', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}