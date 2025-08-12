import { NextRequest, NextResponse } from 'next/server'
import { sign } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

interface JwtPayload {
  name?: string | null
  email?: string | null
  picture?: string | null
  sub?: string
  username?: string | null
  iat: number
  exp: number
}

export async function POST(request: NextRequest) {
  // 1. CRITICAL: Ensure this endpoint is not available in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 })
  }

  // 2. Validate the secret key from headers
  const providedKey = request.headers.get('x-test-session-key')
  const expectedKey = process.env.TEST_SESSION_SECRET_KEY
  
  if (!expectedKey) {
    console.error('TEST_SESSION_SECRET_KEY is not configured')
    return NextResponse.json({ 
      message: 'Test session endpoint not configured properly' 
    }, { status: 500 })
  }
  
  if (providedKey !== expectedKey) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 3. Find the designated test user
    const testUserEmail = process.env.TEST_SESSION_USER_EMAIL
    if (!testUserEmail) {
      throw new Error('TEST_SESSION_USER_EMAIL is not configured.')
    }
    
    const user = await prisma.user.findUnique({
      where: { email: testUserEmail }
    })

    if (!user) {
      return NextResponse.json({ 
        message: `Test user '${testUserEmail}' not found. Please ensure the user exists in the database.` 
      }, { status: 404 })
    }

    // 4. Create the JWT payload - matching NextAuth's structure
    const now = Math.floor(Date.now() / 1000)
    const expirationTime = now + (60 * 60) // Expires in 1 hour

    const payload: JwtPayload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      iat: now,
      exp: expirationTime,
    }

    // 5. Sign the token using the NextAuth secret
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    if (!nextAuthSecret) {
      throw new Error('NEXTAUTH_SECRET is not configured.')
    }
    
    const token = sign(payload, nextAuthSecret, {
      algorithm: 'HS256', // NextAuth default
    })

    // 6. Return the token with usage instructions
    return NextResponse.json({ 
      token,
      usage: 'Use this token in the Authorization header as: Bearer <token>',
      expiresIn: '1 hour',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

  } catch (error) {
    console.error('Test session generation failed:', error)
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Explicitly handle other methods
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 })
  }
  
  return NextResponse.json({ 
    message: 'This endpoint requires POST method',
    usage: 'POST /api/auth/test-session with X-Test-Session-Key header'
  }, { status: 405 })
}