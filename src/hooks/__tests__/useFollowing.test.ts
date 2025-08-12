/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
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
    const mockResponse = {
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 10
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-1',
        entityType: FollowableType.PROJECT
      })
    )

    // Wait for the async fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFollowing).toBe(true)
    expect(result.current.notificationsEnabled).toBe(true)
    expect(result.current.followerCount).toBe(10)

    // Verify the fetch was called with the correct path
    expect(fetch).toHaveBeenCalledWith('/api/following/project/test-project-1/followers/me/status')
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
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 404,
        ok: false
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isFollowing: true,
          notificationsEnabled: true,
          followerCount: 1
        })
      })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-org-1',
        entityType: FollowableType.ORGANIZATION
      })
    )

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFollowing).toBe(false)

    // Perform follow action
    await act(async () => {
      await result.current.follow()
    })

    expect(result.current.isFollowing).toBe(true)
    expect(result.current.notificationsEnabled).toBe(true)
    expect(result.current.followerCount).toBe(1)
    expect(result.current.error).toBe(null)
  })

  it('should handle unfollow action successfully', async () => {
    const initialState = {
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 5
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-product-1',
        entityType: FollowableType.PRODUCT,
        initialState
      })
    )

    expect(result.current.isFollowing).toBe(true)
    expect(result.current.followerCount).toBe(5)

    // Perform unfollow action
    await act(async () => {
      await result.current.unfollow()
    })

    expect(result.current.isFollowing).toBe(false)
    expect(result.current.notificationsEnabled).toBe(false)
    expect(result.current.followerCount).toBe(4)
    expect(result.current.error).toBe(null)
  })

  it('should handle toggle notifications successfully', async () => {
    const initialState = {
      isFollowing: true,
      notificationsEnabled: false,
      followerCount: 3
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        notificationsEnabled: true
      })
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-2',
        entityType: FollowableType.PROJECT,
        initialState
      })
    )

    expect(result.current.notificationsEnabled).toBe(false)

    // Toggle notifications on
    await act(async () => {
      await result.current.toggleNotifications(true)
    })

    expect(result.current.notificationsEnabled).toBe(true)
    expect(result.current.isFollowing).toBe(true) // Should remain following
    expect(result.current.followerCount).toBe(3) // Count shouldn't change
  })

  it('should handle API errors correctly', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-3',
        entityType: FollowableType.PROJECT
      })
    )

    // Wait for the async error to be handled
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.isFollowing).toBe(false)
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
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        isFollowing: false,
        notificationsEnabled: false,
        followerCount: 0
      })
    })

    // Test PROJECT type
    const { rerender } = renderHook(
      ({ entityId, entityType }) => useFollowing({ entityId, entityType }),
      {
        initialProps: {
          entityId: 'project-1',
          entityType: FollowableType.PROJECT
        }
      }
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/following/project/project-1/followers/me/status')
    })

    // Clear mock calls
    ;(global.fetch as jest.Mock).mockClear()

    // Test ORGANIZATION type
    rerender({
      entityId: 'org-1',
      entityType: FollowableType.ORGANIZATION
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/following/organization/org-1/followers/me/status')
    })

    // Clear mock calls
    ;(global.fetch as jest.Mock).mockClear()

    // Test PRODUCT type
    rerender({
      entityId: 'product-1',
      entityType: FollowableType.PRODUCT
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/following/product/product-1/followers/me/status')
    })
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
      followerCount: 0 // Already at zero
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() =>
      useFollowing({
        entityId: 'test-project-zero',
        entityType: FollowableType.PROJECT,
        initialState
      })
    )

    expect(result.current.followerCount).toBe(0)

    // Perform unfollow action
    await act(async () => {
      await result.current.unfollow()
    })

    // Count should stay at 0, not go negative
    expect(result.current.followerCount).toBe(0)
    expect(result.current.isFollowing).toBe(false)
  })
})