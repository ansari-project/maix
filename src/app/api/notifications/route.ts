import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/api-handler'
import { withAuth, type AuthenticatedRequest } from '@/lib/api/with-auth'
import { NotificationService } from '@/services/notification.service'
import { logger } from '@/lib/logger'

const handleGet = withAuth(async (request: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const notifications = await NotificationService.getUserNotifications(
    request.user.id,
    limit,
    offset
  )

  const unreadCount = await NotificationService.getUnreadCount(request.user.id)

  logger.info('Notifications fetched', {
    userId: request.user.id,
    count: notifications.length,
    unreadCount,
    limit,
    offset
  })

  return NextResponse.json({
    notifications,
    unreadCount,
    limit,
    offset
  })
})

export const GET = apiHandler({ GET: handleGet })