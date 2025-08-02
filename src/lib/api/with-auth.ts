import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { Session } from 'next-auth'
import type { User } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  session: Session
  user: User
}

type AuthenticatedHandler = (
  request: AuthenticatedRequest
) => Promise<Response> | Response

/**
 * Higher-order function that ensures the request is authenticated
 * and attaches the session and user to the request
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      logger.warn('Unauthorized request attempt', {
        url: request.url,
        method: request.method,
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get full user object from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      logger.error('Session user not found in database', {
        email: session.user.email,
        sessionId: session.user.id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Augment request with session and user
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.session = session
    authenticatedRequest.user = user

    return handler(authenticatedRequest)
  }
}