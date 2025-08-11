/**
 * Followers API - Get list of users following an entity
 * 
 * This endpoint returns followers for notification delivery purposes.
 * It does NOT grant any permissions - followers are just notification subscribers.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { followingService } from '@/lib/services/following.service'
import { FollowableType } from '@prisma/client'
import { canViewEntity } from '@/lib/visibility-utils'
import { z } from 'zod'

// Validate followable type from URL
const followableTypeSchema = z.enum(['organization', 'project', 'product'])

// Map URL types to database enum
function mapUrlTypeToEnum(type: string): FollowableType | null {
  const typeMap: Record<string, FollowableType> = {
    'organization': FollowableType.ORGANIZATION,
    'project': FollowableType.PROJECT,
    'product': FollowableType.PRODUCT
  }
  return typeMap[type] || null
}

/**
 * GET /api/following/[type]/[id]/followers - Get followers of an entity
 * 
 * Query params:
 * - limit: Number of results (default 100, max 500)
 * - cursor: Pagination cursor
 * - activeOnly: Only return followers with notifications enabled
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate type
    const validatedType = followableTypeSchema.safeParse(type)
    if (!validatedType.success) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const followableType = mapUrlTypeToEnum(validatedType.data)
    if (!followableType) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    // Check if user can view the entity
    const canView = await canViewEntity(session.user.id, id, followableType)
    if (!canView) {
      return NextResponse.json(
        { error: 'Cannot view followers of entity you do not have access to' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const cursor = searchParams.get('cursor') || undefined
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // Get followers
    let result
    if (activeOnly) {
      // Get only active followers (notifications enabled)
      const activeFollowers = await followingService.getActiveFollowers(
        id,
        followableType,
        limit
      )
      result = {
        success: true,
        followers: activeFollowers,
        nextCursor: undefined // Active followers doesn't support pagination yet
      }
    } else {
      // Get all followers with pagination
      result = await followingService.getFollowers({
        followableId: id,
        followableType,
        limit,
        cursor
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get followers' },
        { status: 500 }
      )
    }

    // Get follower count
    const totalCount = await followingService.getFollowerCount(id, followableType)

    return NextResponse.json({
      success: true,
      followers: result.followers,
      totalCount,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor
    })
  } catch (error) {
    console.error('Error getting followers:', error)
    return NextResponse.json(
      { error: 'Failed to get followers' },
      { status: 500 }
    )
  }
}