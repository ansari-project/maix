import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, updateEvent, deleteEvent, getEventStats } from '@/lib/services/event.service'
import { z } from 'zod'

/**
 * GET /api/events/[id] - Get a single event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const event = await getEvent(userId, id)

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      )
    }

    // Include stats if requested
    const includeStats = request.nextUrl.searchParams.get('includeStats') === 'true'
    if (includeStats) {
      const stats = await getEventStats(id)
      return NextResponse.json({
        ...event,
        stats
      })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/events/[id] - Update an event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const event = await updateEvent(session.user.id, id, body)

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Event not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
    }

    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[id] - Delete an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    await deleteEvent(session.user.id, id)

    return NextResponse.json(
      { message: 'Event deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Event not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('admin') || error.message.includes('permission')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
      if (error.message.includes('Cannot delete')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}