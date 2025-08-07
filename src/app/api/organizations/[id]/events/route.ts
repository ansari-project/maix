import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listOrganizationEvents } from '@/lib/services/event.service'
import { MaixEventStatus } from '@prisma/client'

/**
 * GET /api/organizations/[id]/events - List events for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const statusParam = searchParams.get('status')
    const status = statusParam ? statusParam.split(',') as MaixEventStatus[] : undefined
    const upcoming = searchParams.get('upcoming') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { events, total } = await listOrganizationEvents(
      userId,
      id,
      {
        status,
        upcoming,
        limit: Math.min(limit, 100), // Cap at 100
        offset
      }
    )

    return NextResponse.json({
      events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total
      }
    })
  } catch (error) {
    console.error('Error listing organization events:', error)
    return NextResponse.json(
      { error: 'Failed to list organization events' },
      { status: 500 }
    )
  }
}