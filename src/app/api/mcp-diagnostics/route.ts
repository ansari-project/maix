import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { officialMcpClientService } from '@/lib/services/official-mcp-client.service'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        step: 'authentication',
        fix: 'Please sign in to your account'
      }, { status: 401 })
    }

    const diagnostics: any = {
      user: {
        id: session.user.id,
        email: session.user.email,
        authenticated: true
      },
      pat: {
        status: 'checking...'
      },
      mcp: {
        status: 'checking...'
      },
      tools: {
        count: 0,
        names: []
      }
    }

    // 2. Check PAT existence
    try {
      const userPat = await getOrCreateEncryptedAIAssistantPat(session.user.id)
      diagnostics.pat.status = userPat ? 'exists' : 'missing'
      diagnostics.pat.prefix = userPat ? userPat.substring(0, 20) + '...' : null
      
      // Check if PAT exists in database
      const patRecord = await prisma.personalAccessToken.findFirst({
        where: {
          userId: session.user.id,
          name: 'AI Assistant',
          OR: [
            { expiresAt: { gte: new Date() } },
            { expiresAt: null }
          ]
        }
      })
      
      diagnostics.pat.inDatabase = !!patRecord
      diagnostics.pat.createdAt = patRecord?.createdAt
      diagnostics.pat.lastUsedAt = patRecord?.lastUsedAt
      
      // 3. Test MCP connection
      if (userPat) {
        console.log('🔧 Testing MCP connection for diagnostics')
        const tools = await officialMcpClientService.getTools(userPat)
        const toolNames = Object.keys(tools)
        
        diagnostics.mcp.status = 'connected'
        diagnostics.tools.count = toolNames.length
        diagnostics.tools.names = toolNames
        
        // Test if tools are properly formatted
        if (toolNames.length > 0) {
          const firstTool = tools[toolNames[0]]
          diagnostics.tools.sampleTool = {
            name: toolNames[0],
            hasDescription: !!firstTool.description,
            hasExecute: typeof firstTool.execute === 'function'
          }
        }
      } else {
        diagnostics.mcp.status = 'no PAT available'
      }
    } catch (mcpError) {
      diagnostics.mcp.status = 'error'
      diagnostics.mcp.error = mcpError instanceof Error ? mcpError.message : 'Unknown error'
      console.error('MCP diagnostic error:', mcpError)
    }

    // 4. Check environment
    diagnostics.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasNextPublicUrl: !!process.env.NEXT_PUBLIC_URL,
      nextPublicUrl: process.env.NEXT_PUBLIC_URL,
      baseUrl: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    }

    // 5. Overall health status
    diagnostics.health = {
      authenticated: true,
      patConfigured: diagnostics.pat.status === 'exists',
      mcpConnected: diagnostics.mcp.status === 'connected',
      toolsAvailable: diagnostics.tools.count > 0,
      overallStatus: diagnostics.tools.count > 0 ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'
    }

    // 6. Troubleshooting tips
    diagnostics.troubleshooting = []
    
    if (!diagnostics.health.patConfigured) {
      diagnostics.troubleshooting.push('PAT is missing. The system should auto-create one.')
    }
    
    if (!diagnostics.health.mcpConnected) {
      diagnostics.troubleshooting.push('MCP connection failed. Check server logs for errors.')
    }
    
    if (!diagnostics.health.toolsAvailable) {
      diagnostics.troubleshooting.push('No MCP tools loaded. This could be a schema conversion issue.')
    }

    return NextResponse.json(diagnostics, { 
      status: diagnostics.health.overallStatus === '✅ HEALTHY' ? 200 : 503 
    })

  } catch (error) {
    console.error('Diagnostics Error:', error)
    return NextResponse.json(
      { 
        error: 'Diagnostics failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}