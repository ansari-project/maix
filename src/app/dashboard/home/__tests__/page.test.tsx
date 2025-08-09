/**
 * Behavioral tests for dashboard home page
 * Tests actual user interactions and flows
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardHomePage from '../page'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')

jest.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/dashboard/ActionsPanel', () => ({
  ActionsPanel: () => <div data-testid="actions-panel">Actions Panel</div>
}))

jest.mock('@/components/dashboard/CommunityPanel', () => ({
  CommunityPanel: () => <div data-testid="community-panel">Community Panel</div>
}))

describe('Dashboard Home Page - User Behavior', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('redirects unauthenticated users to sign in', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(<DashboardHomePage />)
    
    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('shows loading state while session is loading', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading'
    })

    render(<DashboardHomePage />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByTestId('actions-panel')).not.toBeInTheDocument()
  })

  it('renders dual panels for authenticated users', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated'
    })

    render(<DashboardHomePage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('actions-panel')).toBeInTheDocument()
      expect(screen.getByTestId('community-panel')).toBeInTheDocument()
    })
  })

  it('maintains 50/50 split layout structure', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated'
    })

    const { container } = render(<DashboardHomePage />)
    
    // Check for flex layout with two equal panels
    const layoutContainer = container.querySelector('.flex-col.lg\\:flex-row')
    expect(layoutContainer).toBeInTheDocument()
    
    const panels = container.querySelectorAll('.flex-1.lg\\:max-w-\\[50\\%\\]')
    expect(panels).toHaveLength(2)
  })

  it('does not render content when session is null after loading', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'authenticated' // Edge case: authenticated but no session data
    })

    const { container } = render(<DashboardHomePage />)
    
    expect(container.textContent).toBe('')
    expect(screen.queryByTestId('actions-panel')).not.toBeInTheDocument()
  })
})