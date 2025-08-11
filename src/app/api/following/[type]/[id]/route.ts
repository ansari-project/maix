/**
 * Following API - Subscription Management Endpoints
 * 
 * CRITICAL: These endpoints manage notification subscriptions ONLY.
 * They do NOT grant any permissions or affect access control.
 * 
 * The API layer MUST verify viewing permissions before allowing follows.
 * Following a private entity you can't see should be prevented HERE, not in the service.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { followingService } from '@/lib/services/following.service'
import { FollowableType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
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
 * GET /api/following/[type]/[id] - Check if user is following an entity
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

    // Check if following
    const isFollowing = await followingService.isFollowing(
      session.user.id,
      id,
      followableType
    )

    return NextResponse.json({ 
      following: isFollowing,
      entityId: id,
      entityType: followableType
    })
  } catch (error) {
    console.error('Error checking following status:', error)
    return NextResponse.json(
      { error: 'Failed to check following status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/following/[type]/[id] - Follow an entity
 * 
 * IMPORTANT: This endpoint MUST verify the user can view the entity
 * before allowing them to follow it. Following is for notifications only.
 */
export async function POST(
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

    // Parse request body for notification preferences
    const body = await request.json().catch(() => ({}))
    const notificationsEnabled = body.notificationsEnabled !== false // Default true

    // CRITICAL: Verify user can view the entity before allowing follow
    // This prevents following private entities the user shouldn't see
    const canView = await canViewEntity(
      session.user.id,
      id,
      followableType
    )

    if (!canView) {
      return NextResponse.json(
        { error: 'Cannot follow entity you do not have access to view' },
        { status: 403 }
      )
    }

    // Follow the entity (notification subscription only)
    const result = await followingService.follow({
      userId: session.user.id,
      followableId: id,
      followableType,
      notificationsEnabled
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to follow entity' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      following: result.following,
      message: 'Successfully followed for notifications'
    })
  } catch (error) {
    console.error('Error following entity:', error)
    return NextResponse.json(
      { error: 'Failed to follow entity' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/following/[type]/[id] - Unfollow an entity
 * 
 * Note: Users can unfollow even if they no longer have view access.
 * This allows cleanup of stale subscriptions.
 */
export async function DELETE(
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

    // Unfollow the entity
    const result = await followingService.unfollow({
      userId: session.user.id,
      followableId: id,
      followableType
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Not following this entity' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed'
    })
  } catch (error) {
    console.error('Error unfollowing entity:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow entity' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/following/[type]/[id] - Update notification preferences
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { notificationsEnabled } = body

    if (typeof notificationsEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'notificationsEnabled must be a boolean' },
        { status: 400 }
      )
    }

    // Toggle notifications
    const result = await followingService.toggleNotifications(
      session.user.id,
      id,
      followableType,
      notificationsEnabled
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update notification preferences' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      following: result.following,
      message: `Notifications ${notificationsEnabled ? 'enabled' : 'disabled'}`
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}