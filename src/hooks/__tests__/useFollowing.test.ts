/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useFollowing } from '../useFollowing'
import { FollowableType } from '@prisma/client'

// Mock fetch
global.fetch = jest.fn()

describe('useFollowing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 404,
      ok: false
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    expect(result.current.isFollowing).toBe(false)
    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.followerCount).toBe(0)
    expect(result.current.isLoading).toBe(true) // Initially loading
    expect(result.current.error).toBe(null)
  })

  it('should use initial state when provided', () => {
    const initialState = {
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 5
    }

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT,
        initialState
      })
    )

    expect(result.current.isFollowing).toBe(true)
    expect(result.current.notificationsEnabled).toBe(true)
    expect(result.current.followerCount).toBe(5)
    expect(result.current.isLoading).toBe(false)
  })

  it('should fetch following status on mount when no initial state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        isFollowing: true,
        notificationsEnabled: true,
        followerCount: 3
      })
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    await act(async () => {
      // Wait for the effect to complete
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/test-project-1/followers/me/status')
    expect(result.current.isFollowing).toBe(true)
    expect(result.current.notificationsEnabled).toBe(true)
    expect(result.current.followerCount).toBe(3)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle 404 status (not following) correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 404,
      ok: false
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    await act(async () => {
      // Wait for the effect to complete
    })

    expect(result.current.isFollowing).toBe(false)
    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should handle unauthorized access (401) correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 401,
      ok: false
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    await act(async () => {
      // Wait for the effect to complete
    })

    expect(result.current.isFollowing).toBe(false)
    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null) // No error for 401
  })

  it('should handle follow action successfully', async () => {
    (global.fetch as jest.Mock)
      // Initial status check
      .mockResolvedValueOnce({
        status: 404,
        ok: false
      })
      // Follow action
      .mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({})
      })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    await act(async () => {
      await result.current.follow()
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/test-project-1/followers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationsEnabled: true
      })
    })

    expect(result.current.isFollowing).toBe(true)
    expect(result.current.notificationsEnabled).toBe(true)
    expect(result.current.followerCount).toBe(1) // Incremented from 0
  })

  it('should handle unfollow action successfully', async () => {
    const initialState = {
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 3
    }

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT,
        initialState
      })
    )

    await act(async () => {
      await result.current.unfollow()
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/test-project-1/followers/me', {
      method: 'DELETE'
    })

    expect(result.current.isFollowing).toBe(false)
    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.followerCount).toBe(2) // Decremented from 3
  })

  it('should handle toggle notifications successfully', async () => {
    const initialState = {
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 2
    }

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT,
        initialState
      })
    )

    await act(async () => {
      await result.current.toggleNotifications()
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/test-project-1/followers/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationsEnabled: false
      })
    })

    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.isFollowing).toBe(true) // Still following
    expect(result.current.followerCount).toBe(2) // Unchanged
  })

  it('should handle API errors correctly', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    await act(async () => {
      // Wait for initial fetch to complete
    })

    expect(result.current.error).toBe('Failed to load following status')
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle follow error correctly', async () => {
    (global.fetch as jest.Mock)
      // Initial status check
      .mockResolvedValueOnce({
        status: 404,
        ok: false
      })
      // Follow action fails
      .mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({ error: 'Access denied' })
      })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    await act(async () => {
      await result.current.follow()
    })

    expect(result.current.error).toBe('Access denied')
    expect(result.current.isFollowing).toBe(false) // Should remain unchanged
  })

  it('should use correct API paths for different entity types', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 404,
      ok: false
    })

    // Test ORGANIZATION
    const { rerender } = renderHook((props) =>
      useFollowing(props),
      {
        initialProps: {
          entityId: 'org-1',
          entityType: FollowableType.ORGANIZATION
        }
      }
    )

    expect(fetch).toHaveBeenCalledWith('/api/v1/organizations/org-1/followers/me/status')

    // Test PRODUCT
    rerender({
      entityId: 'product-1',
      entityType: FollowableType.PRODUCT
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/products/product-1/followers/me/status')
  })

  it('should handle refresh function correctly', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 404,
        ok: false
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          isFollowing: true,
          notificationsEnabled: false,
          followerCount: 1
        })
      })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    // Initial state should be not following
    await act(async () => {
      // Wait for initial load
    })
    expect(result.current.isFollowing).toBe(false)

    // Call refresh
    await act(async () => {
      await result.current.refresh()
    })

    // Should now be following
    expect(result.current.isFollowing).toBe(true)
    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.followerCount).toBe(1)
  })

  it('should not cause follower count to go below zero', async () => {
    const initialState = {
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 0 // Edge case: already at 0
    }

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT,
        initialState
      })
    )

    await act(async () => {
      await result.current.unfollow()
    })

    expect(result.current.followerCount).toBe(0) // Should not go below 0
  })
})