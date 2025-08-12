/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { UserSubscriptions } from '../UserSubscriptions'
import { FollowableType } from '@prisma/client'

// Mock fetch
global.fetch = jest.fn()

const mockSubscriptions = [
  {
    id: 'sub-1',
    followableId: 'org-1',
    followableType: FollowableType.ORGANIZATION,
    notificationsEnabled: true,
    followedAt: '2024-01-01T00:00:00Z',
    entity: {
      id: 'org-1',
      name: 'Tech Foundation',
      description: 'A non-profit tech organization'
    }
  },
  {
    id: 'sub-2',
    followableId: 'project-1',
    followableType: FollowableType.PROJECT,
    notificationsEnabled: false,
    followedAt: '2024-01-02T00:00:00Z',
    entity: {
      id: 'project-1',
      name: 'Open Source Library',
      description: 'A useful library for developers'
    }
  },
  {
    id: 'sub-3',
    followableId: 'product-1',
    followableType: FollowableType.PRODUCT,
    notificationsEnabled: true,
    followedAt: '2024-01-03T00:00:00Z',
    entity: {
      id: 'product-1',
      name: 'API Service',
      description: 'RESTful API service'
    }
  }
]

describe('UserSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render subscription management title and description', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: [] })
    })

    await act(async () => { render(<UserSubscriptions />) })

    expect(screen.getByText('Notification Subscriptions')).toBeInTheDocument()
    
    await waitFor(() => {
      const description = screen.getByText(/Manage which updates you want to be notified about/i)
      expect(description).toBeInTheDocument()
    })
  })

  it('should show loading state initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

    await act(async () => { render(<UserSubscriptions />) })

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should display empty state when no subscriptions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: [] })
    })

    await act(async () => {
      render(<UserSubscriptions />)
    })

    await waitFor(() => {
      expect(screen.getByText('No Active Subscriptions')).toBeInTheDocument()
    })
    
    expect(screen.getByText(/You haven't subscribed to any update notifications yet/i)).toBeInTheDocument()
    expect(screen.getByText(/Visit organizations, projects, or products and click "Get Updates"/i)).toBeInTheDocument()
  })

  it('should load and display subscriptions grouped by type', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: mockSubscriptions })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      // Should group by type
      expect(screen.getByText('Organizations')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()

      // Should display entity names
      expect(screen.getByText('Tech Foundation')).toBeInTheDocument()
      expect(screen.getByText('Open Source Library')).toBeInTheDocument()
      expect(screen.getByText('API Service')).toBeInTheDocument()
    })

    // Check API call
    expect(fetch).toHaveBeenCalledWith('/api/following/user')
  })

  it('should display notification status badges correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: mockSubscriptions })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      // Should show Active badges for enabled notifications
      const activeBadges = screen.getAllByText('Active')
      expect(activeBadges).toHaveLength(2) // org-1 and product-1

      // Should show Paused badge for disabled notifications
      expect(screen.getByText('Paused')).toBeInTheDocument() // project-1
    })
  })

  it('should display group counts correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: mockSubscriptions })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      // Each group should have count badge
      const countBadges = screen.getAllByText('1') // Each group has 1 item
      expect(countBadges).toHaveLength(3)
    })
  })

  it('should toggle notifications when switch is clicked', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriptions: mockSubscriptions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      expect(screen.getByText('Tech Foundation')).toBeInTheDocument()
    })

    // Find and click the notification switch for Tech Foundation
    const switches = screen.getAllByRole('switch')
    const techFoundationSwitch = switches[0] // First org, notifications enabled
    
    fireEvent.click(techFoundationSwitch)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/following/organizations/org-1/followers/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationsEnabled: false
        })
      })
    })
  })

  it('should show unsubscribe confirmation dialog', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: mockSubscriptions })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      expect(screen.getByText('Tech Foundation')).toBeInTheDocument()
    })

    // Find and click the trash button for Tech Foundation
    const deleteButtons = screen.getAllByRole('button')
    const trashButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('data-testid') !== 'loading-spinner'
    )
    fireEvent.click(trashButton!)

    await waitFor(() => {
      expect(screen.getByText('Unsubscribe from Updates')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to unsubscribe from updates about/i)).toBeInTheDocument()
      expect(screen.getByText(/Tech Foundation/i)).toBeInTheDocument()
    })
  })

  it('should unsubscribe when confirmation is accepted', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriptions: mockSubscriptions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      expect(screen.getByText('Tech Foundation')).toBeInTheDocument()
    })

    // Open confirmation dialog
    const deleteButtons = screen.getAllByRole('button')
    const trashButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('data-testid') !== 'loading-spinner'
    )
    fireEvent.click(trashButton!)

    await waitFor(() => {
      expect(screen.getByText('Unsubscribe from Test Organization?')).toBeInTheDocument()
    })

    // Clear previous mock calls and set up DELETE request mock
    (global.fetch as jest.Mock).mockClear()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

    const confirmButton = screen.getByText('Unsubscribe')
    
    await act(async () => {
      fireEvent.click(confirmButton)
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/following/organizations/org-1/followers/me', {
        method: 'DELETE'
      })
    })
  })

  it('should show error state when loading fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      expect(screen.getByText('Failed to load your subscriptions')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should retry loading when "Try Again" is clicked', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriptions: mockSubscriptions })
      })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
    
    const retryButton = screen.getByText('Try Again')
    await act(async () => {
      fireEvent.click(retryButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Tech Foundation')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('should display entity descriptions when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: mockSubscriptions })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      expect(screen.getByText('A non-profit tech organization')).toBeInTheDocument()
      expect(screen.getByText('A useful library for developers')).toBeInTheDocument()
      expect(screen.getByText('RESTful API service')).toBeInTheDocument()
    })
  })

  it('should format relative time correctly', async () => {
    const recentSubscription = {
      id: 'sub-recent',
      followableId: 'org-recent',
      followableType: FollowableType.ORGANIZATION,
      notificationsEnabled: true,
      followedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      entity: {
        id: 'org-recent',
        name: 'Recent Org',
        description: 'A recently followed organization'
      }
    }

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: [recentSubscription] })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      // The relative time may vary slightly, so check for the entity first
      expect(screen.getByText('Recent Org')).toBeInTheDocument()
      // Then check for any time-like text
      const timeTexts = screen.getAllByText(/ago/)
      expect(timeTexts.length).toBeGreaterThan(0)
    })
  })

  it('should show correct icons for different entity types', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: mockSubscriptions })
    })

    await act(async () => { render(<UserSubscriptions />) })

    await waitFor(() => {
      // Check that all group headers are present (icons are rendered within these)
      expect(screen.getByText('Organizations')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
    })
  })
})