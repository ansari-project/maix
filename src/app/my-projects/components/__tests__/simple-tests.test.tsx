import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { MyProjectsClient } from '../MyProjectsClient'
import { CreateProjectDialog } from '../CreateProjectDialog'
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}))

global.fetch = jest.fn()

describe('Personal Projects Components', () => {
  const mockPush = jest.fn()
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    
    ;(useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    })
  })

  describe('MyProjectsClient', () => {
    it('redirects unauthenticated users to signin', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<MyProjectsClient />)
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })

    it('shows loading state when status is loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(<MyProjectsClient />)
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('renders authenticated user interface', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: {
          user: {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        status: 'authenticated',
      })

      // Mock successful API calls
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      render(<MyProjectsClient />)

      await waitFor(() => {
        expect(screen.getByText('My Personal Projects')).toBeInTheDocument()
      })

      expect(screen.getByText('Manage your personal learning and development projects')).toBeInTheDocument()
      expect(screen.getByText('New Project')).toBeInTheDocument()
    })

    // Removed useless test that only verified fetch was called
  })

  describe('CreateProjectDialog', () => {
    const defaultProps = {
      open: true,
      onOpenChange: jest.fn(),
      onProjectCreated: jest.fn(),
    }

    it('renders dialog when open', () => {
      render(<CreateProjectDialog {...defaultProps} />)
      
      expect(screen.getByText('Create Personal Project')).toBeInTheDocument()
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<CreateProjectDialog {...defaultProps} open={false} />)
      
      expect(screen.queryByText('Create Personal Project')).not.toBeInTheDocument()
    })

    it('validates required fields', async () => {
      render(<CreateProjectDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /create project/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument()
        expect(screen.getByText('Description is required')).toBeInTheDocument()
      })
    })

    it('creates project with valid data', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'new-project', name: 'Test Project' }),
      })

      const mockOnProjectCreated = jest.fn()
      const mockOnOpenChange = jest.fn()

      render(
        <CreateProjectDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onProjectCreated={mockOnProjectCreated}
        />
      )

      // Fill form
      fireEvent.change(screen.getByLabelText(/project name/i), {
        target: { value: 'Test Project' },
      })
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Test Description' },
      })

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/projects/personal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Project',
            description: 'Test Description',
            personalCategory: undefined,
            targetCompletionDate: undefined,
          }),
        })
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Personal project created successfully',
        })
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        expect(mockOnProjectCreated).toHaveBeenCalled()
      })
    })

    it('handles API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' }),
      })

      render(<CreateProjectDialog {...defaultProps} />)

      fireEvent.change(screen.getByLabelText(/project name/i), {
        target: { value: 'Test Project' },
      })
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Test Description' },
      })

      fireEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Error',
          description: 'API Error',
        })
      })
    })
  })
})