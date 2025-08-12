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

// Mock fetch for AI API calls
global.fetch = jest.fn()

describe('AI Assistant Component', () => {
  const mockToggleAI = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useLayout as jest.Mock).mockReturnValue({
      isAIExpanded: false,
      toggleAI: mockToggleAI,
      currentPath: '/'
    })

    // Mock AI API response - simulate streaming without ReadableStream
    const mockResponse = 'AI response from real backend'
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(mockResponse)
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: (key: string) => key === 'X-Conversation-ID' ? 'test-conversation-id' : null
      },
      body: {
        getReader: () => mockReader
      }
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


    it('disables input while loading', async () => {
      // Create a delayed mock to capture the loading state
      let resolveFirstRead: any
      let resolveSecondRead: any
      let readCallCount = 0

      const mockReader = {
        read: jest.fn().mockImplementation(() => {
          readCallCount++
          if (readCallCount === 1) {
            return new Promise(resolve => {
              resolveFirstRead = resolve
            })
          } else {
            return new Promise(resolve => {
              resolveSecondRead = resolve
            })
          }
        })
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => key === 'X-Conversation-ID' ? 'test-conversation-id' : null
        },
        body: {
          getReader: () => mockReader
        }
      })

      const user = userEvent.setup()
      render(<AIAssistant />)
      
      const input = screen.getByPlaceholderText(/How can I help you today/) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: '' })
      
      await user.type(input, 'Test message')
      await user.click(submitButton)
      
      // Input should be disabled while loading
      expect(input).toBeDisabled()
      
      // Resolve the first read (with data)
      resolveFirstRead({
        done: false,
        value: new TextEncoder().encode('Test response')
      })
      
      // Resolve the second read (done)
      setTimeout(() => {
        resolveSecondRead({
          done: true,
          value: undefined
        })
      }, 10)
      
      // Wait for response and check input is enabled again
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