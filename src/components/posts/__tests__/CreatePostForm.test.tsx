import { render, screen } from '@testing-library/react'
import { CreatePostForm } from '../CreatePostForm'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

describe('CreatePostForm', () => {
  const mockProjects = [
    { id: 'proj-1', name: 'AI Assistant' },
    { id: 'proj-2', name: 'ML Platform' }
  ]
  
  const mockProducts = [
    { id: 'prod-1', name: 'Product Alpha' },
    { id: 'prod-2', name: 'Product Beta' }
  ]

  // Mock fetch
  const mockFetch = jest.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        id: 'post-1', 
        type: 'QUESTION',
        content: 'Test content' 
      })
    })
  })

  describe('Basic Rendering', () => {
    it('should render form with basic elements', () => {
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      // Basic form elements should be present
      expect(screen.getAllByText('Ask a Question')).toHaveLength(2) // Header and badge
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument()
    })

    it('should render with initial question type', () => {
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      // Should default to question type
      expect(screen.getAllByText('Ask a Question')).toHaveLength(2) // Header and badge
      expect(screen.getByText('Get help from the community')).toBeInTheDocument()
    })

    it('should render textarea for content input', () => {
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('placeholder')
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('should render submit button', () => {
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      const submitButton = screen.getByRole('button', { name: /post/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Props Handling', () => {
    it('should handle projects prop', () => {
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      // Component should render without errors when projects are provided
      expect(screen.getByText('Get help from the community')).toBeInTheDocument()
    })

    it('should handle products prop', () => {
      render(
        <CreatePostForm 
          projects={mockProducts} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      // Component should render without errors when products are provided
      expect(screen.getByText('Get help from the community')).toBeInTheDocument()
    })

    it('should handle onSuccess callback prop', () => {
      const mockOnSuccess = jest.fn()
      
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={mockOnSuccess}
        />
      )
      
      // Component should render without errors when onSuccess is provided
      expect(screen.getByText('Get help from the community')).toBeInTheDocument()
    })
  })

  describe('Form Type Display', () => {
    it('should show question type by default', () => {
      render(
        <CreatePostForm 
          projects={mockProjects} 
          products={mockProducts} 
          onSuccess={jest.fn()}
        />
      )
      
      expect(screen.getByText('Get help from the community')).toBeInTheDocument()
    })
  })
})