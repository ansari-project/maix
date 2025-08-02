import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { NotificationService } from '@/services/notification.service'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const notifications = await NotificationService.getUserNotifications(
      user.id,
      limit,
      offset
    )

    const unreadCount = await NotificationService.getUnreadCount(user.id)

    return NextResponse.json({
      notifications,
      unreadCount,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}