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
    
    // Then test both URLs - with and without www redirect issue
    const mcpUrlOld = 'https://maix.io/api/mcp' // This will redirect and drop auth
    const mcpUrlFixed = 'https://www.maix.io/api/mcp' // This should work
    console.log('Testing MCP connection - old URL (with redirect):', mcpUrlOld)
    console.log('Testing MCP connection - fixed URL (no redirect):', mcpUrlFixed)
    
    // Test old URL (will redirect and drop auth)
    const mcpResponseOld = await fetch(mcpUrlOld, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    const mcpResponseOldText = await mcpResponseOld.text()
    
    // Test fixed URL (no redirect, should preserve auth)
    const mcpResponseFixed = await fetch(mcpUrlFixed, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    const mcpResponseFixedText = await mcpResponseFixed.text()
    
    return NextResponse.json({
      patPrefix: pat?.substring(0, 20) + '...',
      mcpEndpointOld: {
        url: mcpUrlOld,
        success: mcpResponseOld.ok,
        status: mcpResponseOld.status,
        statusText: mcpResponseOld.statusText,
        headers: Object.fromEntries(mcpResponseOld.headers.entries()),
        responsePreview: mcpResponseOldText.substring(0, 500),
        explanation: "This should fail with 401 due to redirect dropping Authorization header"
      },
      mcpEndpointFixed: {
        url: mcpUrlFixed,
        success: mcpResponseFixed.ok,
        status: mcpResponseFixed.status,  
        statusText: mcpResponseFixed.statusText,
        headers: Object.fromEntries(mcpResponseFixed.headers.entries()),
        responsePreview: mcpResponseFixedText.substring(0, 500),
        explanation: "This should work with proper authentication"
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