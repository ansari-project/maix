import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/api-handler'
import { withAuth, type AuthenticatedRequest } from '@/lib/api/with-auth'
import { NotificationService } from '@/services/notification.service'
import { logger } from '@/lib/logger'

const handlePost = withAuth(async (request: AuthenticatedRequest) => {
  const { notificationIds } = await request.json()

  if (!Array.isArray(notificationIds)) {
    return NextResponse.json(
      { error: 'Invalid notification IDs' },
      { status: 400 }
    )
  }

  await NotificationService.markAsRead(notificationIds, request.user.id)

  logger.info('Notifications marked as read', {
    userId: request.user.id,
    notificationIds,
    count: notificationIds.length
  })

  return NextResponse.json({ success: true })
})

export const POST = apiHandler({ POST: handlePost })