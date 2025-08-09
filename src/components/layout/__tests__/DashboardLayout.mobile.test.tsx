import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardLayout } from '../DashboardLayout'
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/test',
}))

// Mock the components
jest.mock('@/components/navigation/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}))

jest.mock('@/components/navigation/MobileNav', () => ({
  MobileNav: () => <div data-testid="mobile-nav">Mobile Navigation</div>
}))

jest.mock('@/components/ai/AIAssistant', () => ({
  AIAssistant: () => <div data-testid="ai-assistant">AI Assistant</div>
}))

describe('DashboardLayout - Mobile Responsiveness', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  afterEach(() => {
    // Restore original window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    })
  })

  const setWindowSize = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height
    })
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
  }

  it('shows sidebar on desktop and hides mobile nav', () => {
    setWindowSize(1024) // Desktop size
    
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Wait for effect to run
    setTimeout(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
    }, 100)
  })

  it('hides sidebar on mobile and shows mobile nav', () => {
    setWindowSize(375) // Mobile size
    
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Wait for effect to run
    setTimeout(() => {
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
    }, 100)
  })

  it('switches between mobile and desktop on resize', () => {
    const { rerender } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Start with desktop
    setWindowSize(1024)
    setTimeout(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
    }, 100)

    // Resize to mobile
    setWindowSize(375)
    setTimeout(() => {
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
    }, 100)

    // Resize back to desktop
    setWindowSize(1024)
    setTimeout(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
    }, 100)
  })

  it('AI assistant is present on both mobile and desktop', () => {
    const { rerender } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Desktop
    setWindowSize(1024)
    expect(screen.getByTestId('ai-assistant')).toBeInTheDocument()

    // Mobile
    setWindowSize(375)
    expect(screen.getByTestId('ai-assistant')).toBeInTheDocument()
  })

  it('uses tablet breakpoint correctly', () => {
    // Just below tablet breakpoint (767px)
    setWindowSize(767)
    
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    setTimeout(() => {
      // Should show mobile layout
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
    }, 100)

    // At tablet breakpoint (768px)
    setWindowSize(768)
    setTimeout(() => {
      // Should show desktop layout
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
    }, 100)
  })
})