import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { NotificationService } from '@/services/notification.service'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { notificationIds } = await request.json()

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Invalid notification IDs' },
        { status: 400 }
      )
    }

    await NotificationService.markAsRead(notificationIds, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}