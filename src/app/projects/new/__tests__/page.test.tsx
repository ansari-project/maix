import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import NewProjectPage from '../page'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/hooks/use-toast')
jest.mock('@/components/forms/OrganizationSelector', () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => (
    <div data-testid="organization-selector">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        aria-label="Organization"
      >
        <option value="">No organization</option>
        <option value="org-1">Test Organization</option>
      </select>
    </div>
  )
}))

// Mock Radix UI components as simple HTML elements for basic testing
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-mock">
      <select value={value || ''} onChange={(e) => onValueChange?.(e.target.value)}>
        <option value="">Please select...</option>
        <option value="ADVICE">Advice & Consultation</option>
        <option value="PROTOTYPE">Prototype Development</option>
        <option value="MVP">MVP Development</option>
        <option value="FULL_PRODUCT">Full Product Development</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>
}))

const mockPush = jest.fn()
const mockToast = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

// Mock fetch globally
global.fetch = jest.fn()

describe('NewProjectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mocks
    mockUseSession.mockReturnValue({
      data: {
        user: { 
          id: 'user-1', 
          email: 'test@example.com', 
          name: 'Test User',
          username: 'testuser' 
        },
        expires: '2024-01-01'
      },
      status: 'authenticated',
      update: jest.fn()
    })
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    })
    
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
      getAll: jest.fn().mockReturnValue([]),
      has: jest.fn().mockReturnValue(false),
      entries: jest.fn().mockReturnValue([]),
      keys: jest.fn().mockReturnValue([]),
      values: jest.fn().mockReturnValue([]),
      toString: jest.fn().mockReturnValue(''),
      forEach: jest.fn(),
      [Symbol.iterator]: jest.fn()
    } as any)
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: jest.fn()
    })
    
    // Mock products API response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'prod-1', name: 'Product 1' },
        { id: 'prod-2', name: 'Product 2' }
      ]
    })
  })

  describe('Authentication', () => {
    it('should redirect to signin if unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      render(<NewProjectPage />)
      
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })

    it('should show loading state while checking auth', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn()
      })

      render(<NewProjectPage />)
      
      // Loading state shows a spinner
      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).toBeInTheDocument()
      })
    })
  })

  describe('Basic Form Rendering', () => {
    it('should render form title and description', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Post a New Project')).toBeInTheDocument()
        expect(screen.getByText('Share your AI/tech project with the volunteer community')).toBeInTheDocument()
      })
    })

    it('should render required form fields', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/project goal/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/project description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument()
      })
    })

    it('should render form buttons', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Post Project')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })

    it('should render organization selector', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('organization-selector')).toBeInTheDocument()
      })
    })
  })

  describe('Basic Form Validation', () => {
    it('should mark required fields as required', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
        const goalInput = screen.getByLabelText(/project goal/i) as HTMLTextAreaElement
        const descriptionInput = screen.getByLabelText(/project description/i) as HTMLTextAreaElement
        const emailInput = screen.getByLabelText(/contact email/i) as HTMLInputElement
        
        expect(nameInput.required).toBe(true)
        expect(goalInput.required).toBe(true)
        expect(descriptionInput.required).toBe(true)
        expect(emailInput.required).toBe(true)
      })
    })

    it('should validate email field type', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/contact email/i) as HTMLInputElement
        expect(emailInput.type).toBe('email')
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to projects page on cancel', async () => {
      render(<NewProjectPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByText('Cancel')
      cancelButton.click()
      
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })
  })

  describe('Query Parameters', () => {
    it('should handle productId query parameter', () => {
      mockUseSearchParams.mockReturnValue({
        get: jest.fn((param) => param === 'productId' ? 'prod-1' : null),
        getAll: jest.fn().mockReturnValue([]),
        has: jest.fn().mockReturnValue(false),
        entries: jest.fn().mockReturnValue([]),
        keys: jest.fn().mockReturnValue([]),
        values: jest.fn().mockReturnValue([]),
        toString: jest.fn().mockReturnValue(''),
        forEach: jest.fn(),
        [Symbol.iterator]: jest.fn()
      } as any)

      render(<NewProjectPage />)
      
      // Component should render without errors when productId is provided
      expect(screen.getByText('Post a New Project')).toBeInTheDocument()
    })

    it('should handle organizationId query parameter', () => {
      mockUseSearchParams.mockReturnValue({
        get: jest.fn((param) => param === 'organizationId' ? 'org-1' : null),
        getAll: jest.fn().mockReturnValue([]),
        has: jest.fn().mockReturnValue(false),
        entries: jest.fn().mockReturnValue([]),
        keys: jest.fn().mockReturnValue([]),
        values: jest.fn().mockReturnValue([]),
        toString: jest.fn().mockReturnValue(''),
        forEach: jest.fn(),
        [Symbol.iterator]: jest.fn()
      } as any)

      render(<NewProjectPage />)
      
      // Component should render without errors when organizationId is provided
      expect(screen.getByText('Post a New Project')).toBeInTheDocument()
    })
  })
})