import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'

export async function GET() {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Get or create PAT
    const pat = await getOrCreateEncryptedAIAssistantPat(session.user.id)
    
    // 3. Test both debug endpoint and actual MCP endpoint
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://maix.io'
    
    // First test debug endpoint to see request format
    const debugUrl = `${baseUrl}/api/debug-mcp-request`
    const debugResponse = await fetch(debugUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    const debugData = await debugResponse.json().catch(() => ({}))
    
    // Then test actual MCP endpoint
    const mcpUrl = `${baseUrl}/api/mcp`
    console.log('Testing MCP connection to:', mcpUrl)
    
    // Test with GET request (what the official SDK uses for SSE)
    const response = await fetch(mcpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    const responseText = await response.text()
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responsePreview: responseText.substring(0, 500),
      patPrefix: pat?.substring(0, 20) + '...',
      mcpUrl,
      debugEndpoint: {
        url: debugUrl,
        status: debugResponse.status,
        data: debugData
      },
      environment: {
        nextPublicUrl: process.env.NEXT_PUBLIC_URL,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }
    })
  } catch (error) {
    console.error('Test MCP connection error:', error)
    return NextResponse.json({ 
      error: 'Failed to test MCP connection',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}