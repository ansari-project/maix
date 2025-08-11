/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FollowButton } from '../FollowButton'
import { FollowableType } from '@prisma/client'
import { useFollowing } from '@/hooks/useFollowing'

// Mock the useFollowing hook
jest.mock('@/hooks/useFollowing')
const mockUseFollowing = useFollowing as jest.MockedFunction<typeof useFollowing>

// Mock fetch
global.fetch = jest.fn()

describe('FollowButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render "Get Updates" button when not following', () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: false,
      notificationsEnabled: false,
      followerCount: 0,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    expect(screen.getByText('Get Updates')).toBeInTheDocument()
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('should render "Getting Updates" button when following with notifications enabled', async () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 5,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    expect(screen.getByText('Getting Updates')).toBeInTheDocument()
  })

  it('should render "Updates Paused" button when following with notifications disabled', async () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: false,
      followerCount: 3,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    expect(screen.getByText('Updates Paused')).toBeInTheDocument()
  })

  it('should call follow function when "Get Updates" button is clicked', async () => {
    const mockFollow = jest.fn()
    const mockOnFollowChange = jest.fn()

    mockUseFollowing.mockReturnValue({
      isFollowing: false,
      notificationsEnabled: false,
      followerCount: 0,
      isLoading: false,
      error: null,
      follow: mockFollow,
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
        onFollowChange={mockOnFollowChange}
      />
    )

    const followButton = screen.getByText('Get Updates')
    fireEvent.click(followButton)

    await waitFor(() => {
      expect(mockFollow).toHaveBeenCalled()
    })
  })

  it('should show popover with notification options when following button is clicked', async () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 2,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    const followButton = screen.getByText('Getting Updates')
    fireEvent.click(followButton)

    await waitFor(() => {
      expect(screen.getByText('Notification Subscription')).toBeInTheDocument()
      expect(screen.getByText(/You're subscribed to updates from/i)).toBeInTheDocument()
      expect(screen.getByText(/Test Project/i)).toBeInTheDocument()
    })
  })

  it('should call toggleNotifications when pause/resume button is clicked', async () => {
    const mockToggleNotifications = jest.fn()

    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 1,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: mockToggleNotifications,
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    // Click to open popover
    const followButton = screen.getByText('Getting Updates')
    fireEvent.click(followButton)

    await waitFor(() => {
      const pauseButton = screen.getByText('Pause Notifications')
      fireEvent.click(pauseButton)
    })

    expect(mockToggleNotifications).toHaveBeenCalled()
  })

  it('should call unfollow when unsubscribe button is clicked', async () => {
    const mockUnfollow = jest.fn()
    const mockOnFollowChange = jest.fn()

    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 1,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: mockUnfollow,
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
        onFollowChange={mockOnFollowChange}
      />
    )

    // Click to open popover
    const followButton = screen.getByText('Getting Updates')
    fireEvent.click(followButton)

    await waitFor(() => {
      const unsubscribeButton = screen.getByText('Unsubscribe from Updates')
      fireEvent.click(unsubscribeButton)
    })

    expect(mockUnfollow).toHaveBeenCalled()
  })

  it('should disable button when loading', () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: false,
      notificationsEnabled: false,
      followerCount: 0,
      isLoading: true,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should display correct messaging for different entity types', async () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 1,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    const { rerender } = render(
      <FollowButton
        entityId="test-org-1"
        entityType={FollowableType.ORGANIZATION}
        entityName="Test Org"
      />
    )

    // Click to open popover
    fireEvent.click(screen.getByText('Getting Updates'))

    await waitFor(() => {
      expect(screen.getByText(/this organization/i)).toBeInTheDocument()
    })

    // Test with PROJECT
    rerender(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    fireEvent.click(screen.getByText('Getting Updates'))
    
    await waitFor(() => {
      expect(screen.getByText(/this project/i)).toBeInTheDocument()
    })
  })

  it('should show notification-only disclaimer in popover', async () => {
    mockUseFollowing.mockReturnValue({
      isFollowing: true,
      notificationsEnabled: true,
      followerCount: 1,
      isLoading: false,
      error: null,
      follow: jest.fn(),
      unfollow: jest.fn(),
      toggleNotifications: jest.fn(),
      refresh: jest.fn()
    })

    render(
      <FollowButton
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        entityName="Test Project"
      />
    )

    // Click to open popover
    fireEvent.click(screen.getByText('Getting Updates'))

    await waitFor(() => {
      expect(screen.getByText(/This subscription only controls notifications/i)).toBeInTheDocument()
      expect(screen.getByText(/doesn't change your access permissions/i)).toBeInTheDocument()
    })
  })
})