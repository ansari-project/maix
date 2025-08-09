import React from 'react'
import { render, screen } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import ProfilePage from './page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/profile',
}))

// Mock DashboardLayout
jest.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}))

// Mock fetch
global.fetch = jest.fn()

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Test User',
        username: 'testuser',
        bio: 'Test bio',
        skills: ['React', 'TypeScript'],
      }),
    })
  })

  it('renders profile page with DashboardLayout', async () => {
    const mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2024-12-31',
    }

    render(
      <SessionProvider session={mockSession}>
        <ProfilePage />
      </SessionProvider>
    )

    // Check that DashboardLayout wrapper is present
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
    
    // Check for profile form elements
    await screen.findByText('Complete Your Profile')
    expect(screen.getByText('Help us match you with the right projects by completing your volunteer profile')).toBeInTheDocument()
  })

  it('returns null when no session', () => {
    const { container } = render(
      <SessionProvider session={null}>
        <ProfilePage />
      </SessionProvider>
    )

    // When no session, component returns null
    expect(container.firstChild).toBeNull()
  })
})