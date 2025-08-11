/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FollowingList } from '../FollowingList'
import { FollowableType } from '@prisma/client'

// Mock fetch
global.fetch = jest.fn()

const mockFollowers = [
  {
    id: 'follow-1',
    userId: 'user-1',
    notificationsEnabled: true,
    followedAt: '2024-01-01T00:00:00Z',
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com'
    }
  },
  {
    id: 'follow-2',
    userId: 'user-2',
    notificationsEnabled: false,
    followedAt: '2024-01-02T00:00:00Z',
    user: {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com'
    }
  }
]

describe('FollowingList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render subscriber count button', () => {
    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={5}
      />
    )

    expect(screen.getByText('5 subscribers')).toBeInTheDocument()
  })

  it('should render singular form for single subscriber', () => {
    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={1}
      />
    )

    expect(screen.getByText('1 subscriber')).toBeInTheDocument()
  })

  it('should open dialog when subscriber count is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: mockFollowers })
    })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={2}
      />
    )

    const subscriberButton = screen.getByText('2 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText('Update Subscribers')).toBeInTheDocument()
    })
  })

  it('should load and display followers when dialog opens', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: mockFollowers })
    })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={2}
      />
    )

    const subscriberButton = screen.getByText('2 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Check that API was called correctly
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/test-project-1/followers')
  })

  it('should display notification status badges correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: mockFollowers })
    })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={2}
      />
    )

    const subscriberButton = screen.getByText('2 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      // John Doe has notifications enabled
      expect(screen.getByText('Active')).toBeInTheDocument()
      // Jane Smith has notifications disabled
      expect(screen.getByText('Paused')).toBeInTheDocument()
    })
  })

  it('should display user initials correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: mockFollowers })
    })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={2}
      />
    )

    const subscriberButton = screen.getByText('2 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument() // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument() // Jane Smith
    })
  })

  it('should show loading state while fetching followers', async () => {
    // Mock a delayed response
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ followers: [] })
          })
        }, 100)
      })
    )

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={0}
      />
    )

    const subscriberButton = screen.getByText('0 subscribers')
    fireEvent.click(subscriberButton)

    // Should show loading spinner
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('should show error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={2}
      />
    )

    const subscriberButton = screen.getByText('2 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to load subscribers')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('should show empty state when no subscribers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: [] })
    })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={0}
      />
    )

    const subscriberButton = screen.getByText('0 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText('No subscribers yet')).toBeInTheDocument()
    })
  })

  it('should use correct API paths for different entity types', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: [] })
    })

    const { rerender } = render(
      <FollowingList
        entityId="org-1"
        entityType={FollowableType.ORGANIZATION}
        followerCount={0}
      />
    )

    fireEvent.click(screen.getByText('0 subscribers'))
    expect(fetch).toHaveBeenCalledWith('/api/v1/organizations/org-1/followers')

    // Test with PRODUCT
    rerender(
      <FollowingList
        entityId="product-1"
        entityType={FollowableType.PRODUCT}
        followerCount={0}
      />
    )

    fireEvent.click(screen.getByText('0 subscribers'))
    expect(fetch).toHaveBeenCalledWith('/api/v1/products/product-1/followers')
  })

  it('should show notification-only disclaimer in dialog', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ followers: [] })
    })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={0}
      />
    )

    const subscriberButton = screen.getByText('0 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText(/These subscriptions only control notifications/i)).toBeInTheDocument()
      expect(screen.getByText(/don't affect access permissions/i)).toBeInTheDocument()
    })
  })

  it('should retry fetching when "Try Again" is clicked', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ followers: mockFollowers })
      })

    render(
      <FollowingList
        entityId="test-project-1"
        entityType={FollowableType.PROJECT}
        followerCount={2}
      />
    )

    const subscriberButton = screen.getByText('2 subscribers')
    fireEvent.click(subscriberButton)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Should have called fetch twice
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})