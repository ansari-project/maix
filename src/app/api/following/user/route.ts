/**
 * User Following API - Get entities a user is following
 * 
 * This endpoint returns what the user is following for notification management.
 * The list is filtered to only include entities the user can still view.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { followingService } from '@/lib/services/following.service'
import { FollowableType } from '@prisma/client'
import { canViewEntity } from '@/lib/visibility-utils'
import { z } from 'zod'

// Query parameter validation
const querySchema = z.object({
  type: z.enum(['organization', 'project', 'product']).optional(),
  limit: z.coerce.number().positive().max(500).default(100),
  cursor: z.string().optional()
})

// Map URL types to database enum
function mapUrlTypeToEnum(type?: string): FollowableType | undefined {
  if (!type) return undefined
  const typeMap: Record<string, FollowableType> = {
    'organization': FollowableType.ORGANIZATION,
    'project': FollowableType.PROJECT,
    'product': FollowableType.PRODUCT
  }
  return typeMap[type]
}

/**
 * GET /api/following/user - Get entities the current user is following
 * 
 * Query params:
 * - type: Filter by entity type (organization, project, product)
 * - limit: Number of results (default 100, max 500)
 * - cursor: Pagination cursor
 * - includePrivate: Include entities user can no longer view (default false)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = {
      type: searchParams.get('type') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      cursor: searchParams.get('cursor') || undefined
    }

    // Validate parameters
    const validated = querySchema.parse(params)
    const followableType = mapUrlTypeToEnum(validated.type)
    const includePrivate = searchParams.get('includePrivate') === 'true'

    // Get user's following list
    const result = await followingService.getUserFollowing({
      userId: session.user.id,
      followableType,
      limit: validated.limit,
      cursor: validated.cursor
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get following list' },
        { status: 500 }
      )
    }

    // Filter out entities user can no longer view (unless includePrivate is true)
    let followingList = result.following || []
    
    if (!includePrivate) {
      // Check visibility for each entity in parallel
      const visibilityChecks = await Promise.all(
        followingList.map(async (item) => {
          const canView = await canViewEntity(
            session.user.id,
            item.followableId,
            item.followableType
          )
          return { item, canView }
        })
      )

      // Filter to only visible entities
      followingList = visibilityChecks
        .filter(({ canView }) => canView)
        .map(({ item }) => item)
    }

    // Group by type for convenience
    const grouped = {
      organizations: followingList.filter(f => f.followableType === FollowableType.ORGANIZATION),
      projects: followingList.filter(f => f.followableType === FollowableType.PROJECT),
      products: followingList.filter(f => f.followableType === FollowableType.PRODUCT)
    }

    return NextResponse.json({
      success: true,
      following: followingList,
      grouped,
      totalCount: followingList.length,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor
    })
  } catch (error) {
    console.error('Error getting user following list:', error)
    return NextResponse.json(
      { error: 'Failed to get following list' },
      { status: 500 }
    )
  }
}