// TypeScript test fixes applied
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '../Sidebar'
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/components/notifications/NotificationDropdown', () => ({
  NotificationDropdown: () => <div data-testid="notification-dropdown">Notifications</div>
}))

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('Sidebar', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mocks
    mockUseSession.mockReturnValue({
      data: {
        user: { 
          id: 'user-1', 
          email: 'test@example.com', 
          name: 'Test User',
          username: 'testuser',
          // role removed - not in User type
        },
        expires: '2024-01-01'
      },
      status: 'authenticated',
      update: jest.fn()
    })
    
    mockUsePathname.mockReturnValue('/dashboard')
    mockSignOut.mockResolvedValue(undefined as any)
  })

  describe('Basic Rendering', () => {
    it('should render sidebar for authenticated users', () => {
      render(<Sidebar />)
      
      // Basic elements should be present
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getAllByTestId('notification-dropdown')).toHaveLength(2) // Desktop + mobile
    })

    it('should render basic layout when user is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })
      
      render(<Sidebar />)
      
      // Component should render without errors when unauthenticated
      expect(screen.getAllByText('Maix')).toHaveLength(2) // Still shows branding
    })
  })

  describe('Navigation Items', () => {
    it('should render main navigation items', () => {
      render(<Sidebar />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('My Profile')).toBeInTheDocument()
      expect(screen.getByText('Q + A')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('My Volunteering')).toBeInTheDocument()
      expect(screen.getByText('Organizations')).toBeInTheDocument()
    })

    it('should render app items', () => {
      render(<Sidebar />)
      
      expect(screen.getByText('Causemon')).toBeInTheDocument()
    })

    it('should render settings link', () => {
      render(<Sidebar />)
      
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
    })
  })

  describe('Admin Features', () => {
    it('should show admin section for admin users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: 'user-1', 
            email: 'waleedk@gmail.com', 
            name: 'Admin User',
            username: 'admin',
            // role removed - not in User type
          },
          expires: '2024-01-01'
        },
        status: 'authenticated',
        update: jest.fn()
      })
      
      render(<Sidebar />)
      
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin')
    })

    it('should not show admin section for regular users', () => {
      render(<Sidebar />)
      
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
    })
  })

  describe('User Actions', () => {
    it('should call signOut when logout is clicked', async () => {
      render(<Sidebar />)
      
      const logoutButton = screen.getByRole('button', { name: /sign out/i })
      await user.click(logoutButton)
      
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should show mobile menu button', () => {
      render(<Sidebar />)
      
      // Mobile menu button should be present in mobile header
      const mobileHeader = document.querySelector('.md\\:hidden')
      expect(mobileHeader).toBeInTheDocument()
      
      // The header contains a button with Menu icon
      const menuButton = within(mobileHeader as HTMLElement).getByRole('button')
      expect(menuButton).toBeInTheDocument()
    })
  })

  describe('Branding', () => {
    it('should show Maix branding', () => {
      render(<Sidebar />)
      
      // Maix branding appears in both desktop and mobile headers  
      expect(screen.getAllByText('Maix')).toHaveLength(2)
      // Only one instance of the tagline (in desktop version)
      expect(screen.getByText(/Meaningful AI Exchange/i)).toBeInTheDocument()
    })
  })
})