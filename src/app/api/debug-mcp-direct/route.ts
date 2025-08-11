import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'
import { validatePersonalAccessToken } from '@/lib/mcp/services/pat.service'

export async function GET(request: NextRequest) {
  try {
    // 1. Get session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Get PAT
    const pat = await getOrCreateEncryptedAIAssistantPat(session.user.id)
    
    // 3. Test validation directly (same as MCP endpoint does)
    const validationResult = await validatePersonalAccessToken(pat)
    
    // 4. Also test the exact same logic as the GET handler
    const authHeader = `Bearer ${pat}`
    const token = authHeader.slice(7) // Remove "Bearer " prefix
    
    const getMcpValidation = await validatePersonalAccessToken(token)
    
    return NextResponse.json({
      sessionUserId: session.user.id,
      pat: {
        created: !!pat,
        prefix: pat?.substring(0, 20) + '...',
        length: pat?.length,
        startsWithPrefix: pat?.startsWith('maix_pat_')
      },
      directValidation: {
        isValid: !!validationResult,
        userId: validationResult?.id,
        matchesSession: validationResult?.id === session.user.id
      },
      mcpStyleValidation: {
        tokenPrefix: token?.substring(0, 20) + '...',
        tokenLength: token?.length,
        isValid: !!getMcpValidation,
        userId: getMcpValidation?.id,
        matchesSession: getMcpValidation?.id === session.user.id,
        sameAsDirectValidation: !!validationResult === !!getMcpValidation
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasAuthSecret: !!process.env.AUTH_SECRET
      }
    })
  } catch (error) {
    console.error('Debug MCP direct error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug MCP direct',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}