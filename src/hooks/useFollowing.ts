/**
 * useFollowing Hook
 * 
 * Manages following state for notification subscriptions
 * CRITICAL: This is NOTIFICATION-ONLY functionality - grants ZERO permissions
 */

import { useState, useEffect, useCallback } from 'react'
import { FollowableType } from '@prisma/client'
import { followingApiPaths } from '@/lib/api-paths'

interface FollowingState {
  isFollowing: boolean
  notificationsEnabled: boolean
  followerCount: number
}

interface UseFollowingOptions {
  entityId: string
  entityType: FollowableType
  initialState?: Partial<FollowingState>
}

interface UseFollowingReturn extends FollowingState {
  isLoading: boolean
  error: string | null
  follow: () => Promise<void>
  unfollow: () => Promise<void>
  toggleNotifications: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Hook for managing following/subscription state
 */
export function useFollowing({
  entityId,
  entityType,
  initialState
}: UseFollowingOptions): UseFollowingReturn {
  const [state, setState] = useState<FollowingState>({
    isFollowing: false,
    notificationsEnabled: false,
    followerCount: 0,
    ...initialState
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(followingApiPaths.myStatus(entityType, entityId))
      
      if (response.status === 401) {
        // User not authenticated, skip loading state
        setState(prev => ({ ...prev, isFollowing: false, notificationsEnabled: false }))
        return
      }
      
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to load following status')
      }
      
      if (response.status === 404) {
        // Not following
        setState(prev => ({ ...prev, isFollowing: false, notificationsEnabled: false }))
        return
      }

      const data = await response.json()
      setState(prev => ({
        ...prev,
        isFollowing: data.isFollowing,
        notificationsEnabled: data.notificationsEnabled,
        followerCount: data.followerCount
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load following status')
    } finally {
      setIsLoading(false)
    }
  }, [entityId, entityType])

  const follow = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(followingApiPaths.followers(entityType, entityId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationsEnabled: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to subscribe to updates')
      }

      setState(prev => ({
        ...prev,
        isFollowing: true,
        notificationsEnabled: true,
        followerCount: prev.followerCount + 1
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow')
    } finally {
      setIsLoading(false)
    }
  }, [entityId, entityType])

  const unfollow = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(followingApiPaths.mySubscription(entityType, entityId), {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unsubscribe from updates')
      }

      setState(prev => ({
        ...prev,
        isFollowing: false,
        notificationsEnabled: false,
        followerCount: Math.max(0, prev.followerCount - 1)
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow')
    } finally {
      setIsLoading(false)
    }
  }, [entityId, entityType])

  const toggleNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(followingApiPaths.mySubscription(entityType, entityId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationsEnabled: !state.notificationsEnabled
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update notification settings')
      }

      setState(prev => ({
        ...prev,
        notificationsEnabled: !prev.notificationsEnabled
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle notifications')
    } finally {
      setIsLoading(false)
    }
  }, [entityId, entityType, state.notificationsEnabled])

  // Load initial state
  useEffect(() => {
    if (!initialState) {
      refresh()
    }
  }, [initialState, refresh])

  return {
    isFollowing: state.isFollowing,
    notificationsEnabled: state.notificationsEnabled,
    followerCount: state.followerCount,
    isLoading,
    error,
    follow,
    unfollow,
    toggleNotifications,
    refresh
  }
}