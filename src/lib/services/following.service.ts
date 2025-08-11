/**
 * Following Service - Pure Notification Subscription System
 * 
 * CRITICAL: This service is ONLY for managing notification subscriptions.
 * It has ZERO permission implications and NEVER affects access control.
 * 
 * Following is completely orthogonal to:
 * - RBAC (Role-Based Access Control) - what actions users can perform
 * - Visibility System - what entities users can see
 * 
 * Following ONLY determines what notifications users receive.
 */

import { prisma } from '@/lib/prisma'
import { FollowableType, Prisma } from '@prisma/client'
import { z } from 'zod'

/**
 * Input validation schemas
 */
export const followInputSchema = z.object({
  userId: z.string().cuid(),
  followableId: z.string().cuid(),
  followableType: z.nativeEnum(FollowableType),
  notificationsEnabled: z.boolean().optional().default(true)
})

export const unfollowInputSchema = z.object({
  userId: z.string().cuid(),
  followableId: z.string().cuid(),
  followableType: z.nativeEnum(FollowableType)
})

export const getFollowersInputSchema = z.object({
  followableId: z.string().cuid(),
  followableType: z.nativeEnum(FollowableType),
  limit: z.number().positive().optional().default(100),
  cursor: z.string().cuid().optional()
})

export const getUserFollowingInputSchema = z.object({
  userId: z.string().cuid(),
  followableType: z.nativeEnum(FollowableType).optional(),
  limit: z.number().positive().optional().default(100),
  cursor: z.string().cuid().optional()
})

/**
 * Service response types
 */
export type FollowResponse = {
  success: boolean
  following?: {
    id: string
    userId: string
    followableId: string
    followableType: FollowableType
    followedAt: Date
    notificationsEnabled: boolean
  }
  error?: string
}

export type UnfollowResponse = {
  success: boolean
  error?: string
}

export type FollowersResponse = {
  success: boolean
  followers?: Array<{
    id: string
    userId: string
    followedAt: Date
    notificationsEnabled: boolean
    user: {
      id: string
      name: string | null
      email: string
    }
  }>
  nextCursor?: string
  error?: string
}

export type UserFollowingResponse = {
  success: boolean
  following?: Array<{
    id: string
    followableId: string
    followableType: FollowableType
    followedAt: Date
    notificationsEnabled: boolean
  }>
  nextCursor?: string
  error?: string
}

/**
 * Following Service Class
 * Handles all notification subscription operations
 */
export class FollowingService {
  /**
   * Follow an entity to receive notifications
   * 
   * IMPORTANT: This method does NOT check permissions.
   * Callers MUST verify the user can see the entity BEFORE calling this.
   * Following grants ZERO additional access.
   */
  async follow(input: z.infer<typeof followInputSchema>): Promise<FollowResponse> {
    try {
      const validated = followInputSchema.parse(input)
      
      // Check if already following
      const existing = await prisma.following.findUnique({
        where: {
          userId_followableId_followableType: {
            userId: validated.userId,
            followableId: validated.followableId,
            followableType: validated.followableType
          }
        }
      })

      if (existing) {
        // Update notifications preference if different
        if (existing.notificationsEnabled !== validated.notificationsEnabled) {
          const updated = await prisma.following.update({
            where: { id: existing.id },
            data: { notificationsEnabled: validated.notificationsEnabled }
          })
          return { success: true, following: updated }
        }
        return { success: true, following: existing }
      }

      // Create new follow relationship
      const following = await prisma.following.create({
        data: {
          userId: validated.userId,
          followableId: validated.followableId,
          followableType: validated.followableType,
          notificationsEnabled: validated.notificationsEnabled
        }
      })

      return { success: true, following }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input parameters' }
      }
      console.error('Error following entity:', error)
      return { success: false, error: 'Failed to follow entity' }
    }
  }

  /**
   * Unfollow an entity to stop receiving notifications
   * 
   * Note: Users can unfollow even if they no longer have view access.
   * This allows cleanup of stale subscriptions.
   */
  async unfollow(input: z.infer<typeof unfollowInputSchema>): Promise<UnfollowResponse> {
    try {
      const validated = unfollowInputSchema.parse(input)
      
      const result = await prisma.following.deleteMany({
        where: {
          userId: validated.userId,
          followableId: validated.followableId,
          followableType: validated.followableType
        }
      })

      if (result.count === 0) {
        return { success: false, error: 'Not following this entity' }
      }

      return { success: true }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input parameters' }
      }
      console.error('Error unfollowing entity:', error)
      return { success: false, error: 'Failed to unfollow entity' }
    }
  }

  /**
   * Check if a user is following an entity
   * 
   * Used primarily by notification system to determine delivery.
   * NOT used for permission checks.
   */
  async isFollowing(
    userId: string, 
    followableId: string, 
    followableType: FollowableType
  ): Promise<boolean> {
    try {
      const following = await prisma.following.findUnique({
        where: {
          userId_followableId_followableType: {
            userId,
            followableId,
            followableType
          }
        }
      })
      return !!following
    } catch (error) {
      console.error('Error checking following status:', error)
      return false
    }
  }

  /**
   * Get followers of an entity (for notification delivery)
   * 
   * IMPORTANT: Callers should re-check visibility at notification
   * delivery time to ensure followers still have access.
   */
  async getFollowers(
    input: z.infer<typeof getFollowersInputSchema>
  ): Promise<FollowersResponse> {
    try {
      const validated = getFollowersInputSchema.parse(input)
      
      const where: Prisma.FollowingWhereInput = {
        followableId: validated.followableId,
        followableType: validated.followableType
      }

      if (validated.cursor) {
        where.id = { gt: validated.cursor }
      }

      const followers = await prisma.following.findMany({
        where,
        take: validated.limit,
        orderBy: { id: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      const nextCursor = followers.length === validated.limit 
        ? followers[followers.length - 1].id 
        : undefined

      return { 
        success: true, 
        followers,
        nextCursor
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input parameters' }
      }
      console.error('Error getting followers:', error)
      return { success: false, error: 'Failed to get followers' }
    }
  }

  /**
   * Get entities a user is following (for user's subscription management)
   * 
   * Note: Should filter results based on what the user can currently see.
   * This is handled by the API layer, not the service.
   */
  async getUserFollowing(
    input: z.infer<typeof getUserFollowingInputSchema>
  ): Promise<UserFollowingResponse> {
    try {
      const validated = getUserFollowingInputSchema.parse(input)
      
      const where: Prisma.FollowingWhereInput = {
        userId: validated.userId
      }

      if (validated.followableType) {
        where.followableType = validated.followableType
      }

      if (validated.cursor) {
        where.id = { gt: validated.cursor }
      }

      const following = await prisma.following.findMany({
        where,
        take: validated.limit,
        orderBy: { followedAt: 'desc' }
      })

      const nextCursor = following.length === validated.limit 
        ? following[following.length - 1].id 
        : undefined

      return { 
        success: true, 
        following,
        nextCursor
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input parameters' }
      }
      console.error('Error getting user following:', error)
      return { success: false, error: 'Failed to get following list' }
    }
  }

  /**
   * Get follower count for an entity
   * Used for UI display (e.g., "42 followers")
   */
  async getFollowerCount(
    followableId: string,
    followableType: FollowableType
  ): Promise<number> {
    try {
      return await prisma.following.count({
        where: {
          followableId,
          followableType
        }
      })
    } catch (error) {
      console.error('Error getting follower count:', error)
      return 0
    }
  }

  /**
   * Toggle notification preferences for a follow relationship
   */
  async toggleNotifications(
    userId: string,
    followableId: string,
    followableType: FollowableType,
    enabled: boolean
  ): Promise<FollowResponse> {
    try {
      const following = await prisma.following.findUnique({
        where: {
          userId_followableId_followableType: {
            userId,
            followableId,
            followableType
          }
        }
      })

      if (!following) {
        return { success: false, error: 'Not following this entity' }
      }

      const updated = await prisma.following.update({
        where: { id: following.id },
        data: { notificationsEnabled: enabled }
      })

      return { success: true, following: updated }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      return { success: false, error: 'Failed to update notification preferences' }
    }
  }

  /**
   * Batch check following status for multiple entities
   * Used for efficient UI rendering (showing follow/unfollow buttons)
   */
  async batchCheckFollowing(
    userId: string,
    entities: Array<{ followableId: string; followableType: FollowableType }>
  ): Promise<Map<string, boolean>> {
    try {
      const following = await prisma.following.findMany({
        where: {
          userId,
          OR: entities.map(e => ({
            followableId: e.followableId,
            followableType: e.followableType
          }))
        },
        select: {
          followableId: true,
          followableType: true
        }
      })

      const followingMap = new Map<string, boolean>()
      
      // Initialize all to false
      entities.forEach(e => {
        const key = `${e.followableType}:${e.followableId}`
        followingMap.set(key, false)
      })

      // Set true for followed entities
      following.forEach(f => {
        const key = `${f.followableType}:${f.followableId}`
        followingMap.set(key, true)
      })

      return followingMap
    } catch (error) {
      console.error('Error batch checking following:', error)
      // Return all false on error
      const followingMap = new Map<string, boolean>()
      entities.forEach(e => {
        const key = `${e.followableType}:${e.followableId}`
        followingMap.set(key, false)
      })
      return followingMap
    }
  }

  /**
   * Get followers with notification preferences enabled
   * Used by notification system for actual delivery
   */
  async getActiveFollowers(
    followableId: string,
    followableType: FollowableType,
    limit: number = 1000
  ): Promise<Array<{ userId: string; email: string }>> {
    try {
      const followers = await prisma.following.findMany({
        where: {
          followableId,
          followableType,
          notificationsEnabled: true
        },
        take: limit,
        select: {
          userId: true,
          user: {
            select: {
              email: true
            }
          }
        }
      })

      return followers.map(f => ({
        userId: f.userId,
        email: f.user.email
      }))
    } catch (error) {
      console.error('Error getting active followers:', error)
      return []
    }
  }
}

// Export singleton instance
export const followingService = new FollowingService()