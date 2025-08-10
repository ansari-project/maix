import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'
import { validatePersonalAccessToken } from '@/lib/mcp/services/pat.service'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Get or create PAT
    console.log('Debug: Getting PAT for user', session.user.id)
    const pat = await getOrCreateEncryptedAIAssistantPat(session.user.id)
    console.log('Debug: PAT retrieved/created', { 
      hasToken: !!pat,
      tokenPrefix: pat?.substring(0, 20) + '...'
    })

    // 3. Validate the PAT immediately
    console.log('Debug: Validating PAT')
    const validatedUser = await validatePersonalAccessToken(pat)
    console.log('Debug: Validation result', {
      isValid: !!validatedUser,
      userId: validatedUser?.id,
      matchesSession: validatedUser?.id === session.user.id
    })

    // 4. Check database directly
    const allPats = await prisma.personalAccessToken.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        tokenHash: true,
        createdAt: true,
        expiresAt: true
      }
    })

    return NextResponse.json({
      success: true,
      sessionUserId: session.user.id,
      patCreated: !!pat,
      patPrefix: pat?.substring(0, 20) + '...',
      validationResult: {
        isValid: !!validatedUser,
        userId: validatedUser?.id,
        matchesSession: validatedUser?.id === session.user.id
      },
      patsInDb: allPats.map(p => ({
        ...p,
        tokenHashPrefix: p.tokenHash.substring(0, 10) + '...'
      })),
      environment: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    })
  } catch (error) {
    console.error('Debug PAT error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug PAT',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}