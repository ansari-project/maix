/**
 * Test for Phase 2: Dual Panel Layout
 * Verifies the Actions and Community panels render correctly
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ActionsPanel } from '../ActionsPanel'
import { CommunityPanel } from '../CommunityPanel'

// Mock the FeedContainer to avoid complex dependencies
jest.mock('@/components/feed/FeedContainer', () => ({
  FeedContainer: () => <div data-testid="feed-container">Feed Content</div>
}))

describe('Phase 2: Dual Panel Layout Tests', () => {
  describe('ActionsPanel', () => {
    it('renders without crashing', () => {
      const { container } = render(<ActionsPanel />)
      expect(container).toBeTruthy()
    })

    it('displays Quick Actions section', () => {
      render(<ActionsPanel />)
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Create New')).toBeInTheDocument()
    })

    it('shows all action buttons', () => {
      render(<ActionsPanel />)
      expect(screen.getByText('New Project')).toBeInTheDocument()
      expect(screen.getByText('Ask Question')).toBeInTheDocument()
      expect(screen.getByText('Add Todo')).toBeInTheDocument()
      expect(screen.getByText('Plan Event')).toBeInTheDocument()
      expect(screen.getByText('New Product')).toBeInTheDocument()
      expect(screen.getByText('New Organization')).toBeInTheDocument()
    })

    it('displays My Todos section', () => {
      render(<ActionsPanel />)
      expect(screen.getByText('My Todos')).toBeInTheDocument()
      expect(screen.getByText('Your tasks and priorities')).toBeInTheDocument()
    })

    it('does not show removed sections', () => {
      render(<ActionsPanel />)
      // Verify that removed sections are not present
      expect(screen.queryByText('Your Activities')).not.toBeInTheDocument()
      expect(screen.queryByText('Your Impact')).not.toBeInTheDocument()
      expect(screen.queryByText('My Projects')).not.toBeInTheDocument()
      expect(screen.queryByText('My Volunteering')).not.toBeInTheDocument()
    })
  })

  describe('CommunityPanel', () => {
    it('renders without crashing', () => {
      const { container } = render(<CommunityPanel />)
      expect(container).toBeTruthy()
    })

    it('displays Community Feed title', () => {
      render(<CommunityPanel />)
      expect(screen.getByText('Community Feed')).toBeInTheDocument()
    })

    it('does not show filter and refresh buttons', () => {
      render(<CommunityPanel />)
      // Verify that removed buttons are not present
      expect(screen.queryByText('Filter')).not.toBeInTheDocument()
      expect(screen.queryByText('Refresh')).not.toBeInTheDocument()
    })

    it('renders FeedContainer', () => {
      render(<CommunityPanel />)
      expect(screen.getByTestId('feed-container')).toBeInTheDocument()
    })

    it('displays What\'s happening card', () => {
      render(<CommunityPanel />)
      expect(screen.getByText('What\'s happening')).toBeInTheDocument()
    })
  })

  describe('Dual Panel Integration', () => {
    it('both panels can render together', () => {
      const { container } = render(
        <div className="flex">
          <div className="flex-1">
            <ActionsPanel />
          </div>
          <div className="flex-1">
            <CommunityPanel />
          </div>
        </div>
      )
      
      // Both panels should be present
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Community Feed')).toBeInTheDocument()
      
      // Check flex layout is applied
      const flexContainer = container.querySelector('.flex')
      expect(flexContainer).toBeInTheDocument()
      expect(flexContainer?.children).toHaveLength(2)
    })
  })
})