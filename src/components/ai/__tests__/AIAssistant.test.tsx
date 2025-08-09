/**
 * Tests for AI Assistant component
 * Focus on behavior and user interactions
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIAssistant } from '../AIAssistant'
import { useLayout } from '@/contexts/LayoutContext'

// Mock the LayoutContext
jest.mock('@/contexts/LayoutContext', () => ({
  useLayout: jest.fn()
}))

describe('AI Assistant Component', () => {
  const mockToggleAI = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useLayout as jest.Mock).mockReturnValue({
      isAIExpanded: false,
      toggleAI: mockToggleAI,
      currentPath: '/'
    })
  })

  describe('Collapsed State', () => {
    it('renders collapsed state by default', () => {
      render(<AIAssistant />)
      
      // Should show placeholder text
      expect(screen.getByText(/How can I help you today/)).toBeInTheDocument()
      // Should show keyboard shortcut
      expect(screen.getByText('Cmd+K')).toBeInTheDocument()
    })

    it('expands when clicked', () => {
      render(<AIAssistant />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockToggleAI).toHaveBeenCalledTimes(1)
    })

    it('shows context-aware placeholder based on current page', () => {
      // Test projects page
      ;(useLayout as jest.Mock).mockReturnValue({
        isAIExpanded: false,
        toggleAI: mockToggleAI,
        currentPath: '/projects'
      })
      
      const { rerender } = render(<AIAssistant />)
      expect(screen.getByText(/Ask about projects/)).toBeInTheDocument()
      
      // Test todos page
      ;(useLayout as jest.Mock).mockReturnValue({
        isAIExpanded: false,
        toggleAI: mockToggleAI,
        currentPath: '/todos'
      })
      
      rerender(<AIAssistant />)
      expect(screen.getByText(/Show my tasks/)).toBeInTheDocument()
    })
  })

  describe('Expanded State', () => {
    beforeEach(() => {
      ;(useLayout as jest.Mock).mockReturnValue({
        isAIExpanded: true,
        toggleAI: mockToggleAI,
        currentPath: '/'
      })
    })

    it('renders expanded interface with all elements', () => {
      render(<AIAssistant />)
      
      // Header elements
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      expect(screen.getByText('- Home')).toBeInTheDocument()
      
      // Control buttons
      expect(screen.getByLabelText('Minimize')).toBeInTheDocument()
      expect(screen.getByLabelText('Close')).toBeInTheDocument()
      
      // Welcome message
      expect(screen.getByText(/Hi! I'm your AI assistant/)).toBeInTheDocument()
      
      // Input field
      expect(screen.getByPlaceholderText(/How can I help you today/)).toBeInTheDocument()
    })

    it('closes when minimize button clicked', () => {
      render(<AIAssistant />)
      
      const minimizeButton = screen.getByLabelText('Minimize')
      fireEvent.click(minimizeButton)
      
      expect(mockToggleAI).toHaveBeenCalledTimes(1)
    })

    it('closes when X button clicked', () => {
      render(<AIAssistant />)
      
      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)
      
      expect(mockToggleAI).toHaveBeenCalledTimes(1)
    })

    it('submits message and shows response', async () => {
      const user = userEvent.setup()
      render(<AIAssistant />)
      
      const input = screen.getByPlaceholderText(/How can I help you today/)
      const submitButton = screen.getByRole('button', { name: '' }) // Send button
      
      // Type a message
      await user.type(input, 'Show my priorities')
      
      // Submit
      await user.click(submitButton)
      
      // Check user message appears
      expect(screen.getByText('Show my priorities')).toBeInTheDocument()
      
      // Wait for AI response (mocked with setTimeout)
      await waitFor(() => {
        expect(screen.getByText(/I understand you're asking about/)).toBeInTheDocument()
      }, { timeout: 1500 })
    })

    it('disables input while loading', async () => {
      const user = userEvent.setup()
      render(<AIAssistant />)
      
      const input = screen.getByPlaceholderText(/How can I help you today/) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: '' })
      
      await user.type(input, 'Test message')
      await user.click(submitButton)
      
      // Input should be disabled while loading
      expect(input).toBeDisabled()
      
      // Wait for response
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      }, { timeout: 1500 })
    })

    it('clears input after submission', async () => {
      const user = userEvent.setup()
      render(<AIAssistant />)
      
      const input = screen.getByPlaceholderText(/How can I help you today/) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: '' })
      
      await user.type(input, 'Test message')
      expect(input.value).toBe('Test message')
      
      await user.click(submitButton)
      expect(input.value).toBe('')
    })

    it('provides contextual responses based on page and query', async () => {
      // Mock projects page
      ;(useLayout as jest.Mock).mockReturnValue({
        isAIExpanded: true,
        toggleAI: mockToggleAI,
        currentPath: '/projects'
      })
      
      const user = userEvent.setup()
      render(<AIAssistant />)
      
      const input = screen.getByPlaceholderText(/Ask about projects/)
      await user.type(input, 'create new project')
      await user.click(screen.getByRole('button', { name: '' }))
      
      await waitFor(() => {
        expect(screen.getByText(/help you create a new project/)).toBeInTheDocument()
      }, { timeout: 1500 })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('responds to Cmd+K to toggle', () => {
      render(<AIAssistant />)
      
      // Simulate Cmd+K
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
      
      expect(mockToggleAI).toHaveBeenCalledTimes(1)
    })

    it('responds to Escape when expanded', () => {
      ;(useLayout as jest.Mock).mockReturnValue({
        isAIExpanded: true,
        toggleAI: mockToggleAI,
        currentPath: '/'
      })
      
      render(<AIAssistant />)
      
      // Simulate Escape
      fireEvent.keyDown(window, { key: 'Escape' })
      
      expect(mockToggleAI).toHaveBeenCalledTimes(1)
    })

    it('does not respond to Escape when collapsed', () => {
      ;(useLayout as jest.Mock).mockReturnValue({
        isAIExpanded: false,
        toggleAI: mockToggleAI,
        currentPath: '/'
      })
      
      render(<AIAssistant />)
      
      // Simulate Escape
      fireEvent.keyDown(window, { key: 'Escape' })
      
      // Should not toggle when already collapsed
      expect(mockToggleAI).not.toHaveBeenCalled()
    })
  })
})