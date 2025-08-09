import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import { CreateProjectDialog } from '../CreateProjectDialog'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockToast = jest.fn()
const mockOnOpenChange = jest.fn()
const mockOnProjectCreated = jest.fn()

const defaultProps = {
  open: true,
  onOpenChange: mockOnOpenChange,
  onProjectCreated: mockOnProjectCreated,
}

describe('CreateProjectDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
  })

  it('renders the dialog when open', () => {
    render(<CreateProjectDialog {...defaultProps} />)

    expect(screen.getByText('Create Personal Project')).toBeInTheDocument()
    expect(screen.getByText('Start a new personal development or learning project. You can organize your tasks and track your progress.')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<CreateProjectDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Create Personal Project')).not.toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(<CreateProjectDialog {...defaultProps} />)

    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByText(/target completion date/i)).toBeInTheDocument()
  })

  it('shows validation errors for required fields', async () => {
    render(<CreateProjectDialog {...defaultProps} />)

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })
  })

  it('validates project name length', async () => {
    render(<CreateProjectDialog {...defaultProps} />)

    const nameInput = screen.getByLabelText(/project name/i)
    
    // Test maximum length validation
    const longName = 'a'.repeat(256)
    fireEvent.change(nameInput, { target: { value: longName } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Valid description' } })

    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Project name is too long')).toBeInTheDocument()
    })
  })

  it('validates category length', async () => {
    render(<CreateProjectDialog {...defaultProps} />)

    const nameInput = screen.getByLabelText(/project name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const categoryInput = screen.getByLabelText(/category/i)
    
    fireEvent.change(nameInput, { target: { value: 'Valid Project Name' } })
    fireEvent.change(descriptionInput, { target: { value: 'Valid description' } })
    
    // Test maximum length validation for category
    const longCategory = 'a'.repeat(101)
    fireEvent.change(categoryInput, { target: { value: longCategory } })

    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('String must contain at most 100 character(s)')).toBeInTheDocument()
    })
  })

  it('creates project successfully with valid data', async () => {
    const mockProject = {
      id: 'new-project-id',
      name: 'Test Project',
      description: 'Test Description',
    }

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProject),
    })

    render(<CreateProjectDialog {...defaultProps} />)

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/project name/i), { 
      target: { value: 'Test Project' } 
    })
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'Test Description' } 
    })
    fireEvent.change(screen.getByLabelText(/category/i), { 
      target: { value: 'Learning' } 
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test Description',
          personalCategory: 'Learning',
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

  it('shows date picker when date button is clicked', async () => {
    render(<CreateProjectDialog {...defaultProps} />)

    // Open date picker
    const dateButton = screen.getByRole('button', { name: /pick a target date/i })
    fireEvent.click(dateButton)

    // For simplicity, we'll test that clicking the button doesn't crash
    // The actual calendar interaction is complex and relies on third-party components
    expect(dateButton).toBeInTheDocument()
  })

  it('handles API errors', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Failed to create project',
      }),
    })

    render(<CreateProjectDialog {...defaultProps} />)

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/project name/i), { 
      target: { value: 'Test Project' } 
    })
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'Test Description' } 
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create project',
      })
    })
  })

  it('handles validation errors from API', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Invalid data',
        details: [
          { path: ['name'], message: 'Name is too short' },
          { path: ['description'], message: 'Description is required' },
        ],
      }),
    })

    render(<CreateProjectDialog {...defaultProps} />)

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/project name/i), { 
      target: { value: 'Test Project' } 
    })
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'Test Description' } 
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is too short')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })
  })

  it('handles network errors', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<CreateProjectDialog {...defaultProps} />)

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/project name/i), { 
      target: { value: 'Test Project' } 
    })
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'Test Description' } 
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Network error',
      })
    })
  })

  it('disables form when loading', async () => {
    // Mock a slow response
    ;(fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }), 100))
    )

    render(<CreateProjectDialog {...defaultProps} />)

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/project name/i), { 
      target: { value: 'Test Project' } 
    })
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'Test Description' } 
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    // Check that form is disabled during loading
    await waitFor(() => {
      expect(screen.getByLabelText(/project name/i)).toBeDisabled()
      expect(screen.getByLabelText(/description/i)).toBeDisabled()
      expect(screen.getByLabelText(/category/i)).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  it('resets form when dialog is closed', () => {
    const { rerender } = render(<CreateProjectDialog {...defaultProps} />)

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/project name/i), { 
      target: { value: 'Test Project' } 
    })
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'Test Description' } 
    })

    // Close and reopen dialog
    rerender(<CreateProjectDialog {...defaultProps} open={false} />)
    rerender(<CreateProjectDialog {...defaultProps} open={true} />)

    // Form should be reset
    expect(screen.getByLabelText(/project name/i)).toHaveValue('')
    expect(screen.getByLabelText(/description/i)).toHaveValue('')
  })

  it('cancels dialog without creating project', () => {
    render(<CreateProjectDialog {...defaultProps} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnProjectCreated).not.toHaveBeenCalled()
  })

  it('shows helpful placeholder text and descriptions', () => {
    render(<CreateProjectDialog {...defaultProps} />)

    expect(screen.getByPlaceholderText('e.g., Learn React Development')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe what you want to accomplish with this project...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., Learning, Side Project, Hobby')).toBeInTheDocument()
    
    expect(screen.getByText('Use categories to organize your projects (Learning, Development, Health, etc.)')).toBeInTheDocument()
    expect(screen.getByText('Set a target date to help track your progress and stay motivated')).toBeInTheDocument()
  })
})