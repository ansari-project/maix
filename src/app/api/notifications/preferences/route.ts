import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/api-handler'
import { withAuth, type AuthenticatedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const handleGet = withAuth(async (request: AuthenticatedRequest) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: request.user.id }
  })

  logger.info('Notification preferences fetched', {
    userId: request.user.id,
    emailEnabled: preference?.emailEnabled ?? true
  })

  return NextResponse.json({
    emailEnabled: preference?.emailEnabled ?? true
  })
})

const handlePut = withAuth(async (request: AuthenticatedRequest) => {
  const { emailEnabled } = await request.json()

  const preference = await prisma.notificationPreference.upsert({
    where: { userId: request.user.id },
    create: {
      userId: request.user.id,
      emailEnabled
    },
    update: { emailEnabled }
  })

  logger.info('Notification preferences updated', {
    userId: request.user.id,
    emailEnabled
  })

  return NextResponse.json(preference)
})

export const GET = apiHandler({ GET: handleGet })
export const PUT = apiHandler({ PUT: handlePut })