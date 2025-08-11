/**
 * Batch Following Check API - Check multiple entities at once
 * 
 * Efficiently check if user is following multiple entities.
 * Used by UI to show follow/unfollow buttons on lists.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { followingService } from '@/lib/services/following.service'
import { FollowableType } from '@prisma/client'
import { z } from 'zod'

// Request body validation
const batchCheckSchema = z.object({
  entities: z.array(z.object({
    id: z.string().cuid(),
    type: z.enum(['organization', 'project', 'product'])
  })).min(1).max(100) // Limit to 100 entities per request
})

// Map URL types to database enum
function mapUrlTypeToEnum(type: string): FollowableType {
  const typeMap: Record<string, FollowableType> = {
    'organization': FollowableType.ORGANIZATION,
    'project': FollowableType.PROJECT,
    'product': FollowableType.PRODUCT
  }
  return typeMap[type]
}

/**
 * POST /api/following/batch-check - Check if user is following multiple entities
 * 
 * Request body:
 * {
 *   entities: [
 *     { id: "entity-id-1", type: "project" },
 *     { id: "entity-id-2", type: "organization" }
 *   ]
 * }
 * 
 * Response:
 * {
 *   results: {
 *     "project:entity-id-1": true,
 *     "organization:entity-id-2": false
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = batchCheckSchema.parse(body)

    // Convert to service format
    const entitiesToCheck = validated.entities.map(entity => ({
      followableId: entity.id,
      followableType: mapUrlTypeToEnum(entity.type)
    }))

    // Batch check following status
    const followingMap = await followingService.batchCheckFollowing(
      session.user.id,
      entitiesToCheck
    )

    // Convert Map to object for JSON response
    const results: Record<string, boolean> = {}
    followingMap.forEach((value, key) => {
      results[key] = value
    })

    // Also provide a more structured response
    const structured = validated.entities.map(entity => {
      const key = `${mapUrlTypeToEnum(entity.type)}:${entity.id}`
      return {
        id: entity.id,
        type: entity.type,
        following: followingMap.get(key) || false
      }
    })

    return NextResponse.json({
      success: true,
      results,
      entities: structured
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    console.error('Error batch checking following status:', error)
    return NextResponse.json(
      { error: 'Failed to check following status' },
      { status: 500 }
    )
  }
}