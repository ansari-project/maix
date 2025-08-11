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
    
    // Then test both MCP endpoints
    const mcpUrl = `${baseUrl}/api/mcp`
    const sseUrl = `${baseUrl}/api/mcp-sse`
    console.log('Testing MCP connection to:', mcpUrl)
    console.log('Testing SSE connection to:', sseUrl)
    
    // Test with GET request (what the official SDK uses for SSE)
    const mcpResponse = await fetch(mcpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    const mcpResponseText = await mcpResponse.text()
    
    // Also test our new SSE endpoint
    const sseResponse = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    const sseResponseText = await sseResponse.text()
    
    return NextResponse.json({
      patPrefix: pat?.substring(0, 20) + '...',
      mcpEndpoint: {
        url: mcpUrl,
        success: mcpResponse.ok,
        status: mcpResponse.status,
        statusText: mcpResponse.statusText,
        headers: Object.fromEntries(mcpResponse.headers.entries()),
        responsePreview: mcpResponseText.substring(0, 500),
      },
      sseEndpoint: {
        url: sseUrl,
        success: sseResponse.ok,
        status: sseResponse.status,
        statusText: sseResponse.statusText,
        headers: Object.fromEntries(sseResponse.headers.entries()),
        responsePreview: sseResponseText.substring(0, 500),
      },
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