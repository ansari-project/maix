/**
 * Basic test for DashboardLayout component
 * Testing core functionality without complex mocking
 */
import React from 'react'
import { render } from '@testing-library/react'
import { DashboardLayout } from '../DashboardLayout'

// Mock the LayoutProvider and useLayout hook
jest.mock('@/contexts/LayoutContext', () => ({
  LayoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLayout: () => ({
    isMobile: false,
    isAIExpanded: false,
    isSidebarCollapsed: false,
    currentPath: '/',
    isActivePath: jest.fn(),
    toggleAI: jest.fn(),
    toggleSidebar: jest.fn(),
    setAIExpanded: jest.fn(),
    setSidebarCollapsed: jest.fn(),
    setIsMobile: jest.fn()
  })
}))

// Mock the child components to avoid complex dependencies
jest.mock('@/components/navigation/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar Component</div>
}))

jest.mock('@/components/ai/AIAssistant', () => ({
  AIAssistant: () => <div data-testid="ai-assistant">AI Assistant Component</div>
}))

jest.mock('@/components/navigation/MobileNav', () => ({
  MobileNav: () => <div data-testid="mobile-nav">Mobile Nav Component</div>
}))

describe('DashboardLayout Basic Tests', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )
    expect(container).toBeTruthy()
  })

  it('renders children content', () => {
    const { getByText } = render(
      <DashboardLayout>
        <div>Child Content Here</div>
      </DashboardLayout>
    )
    expect(getByText('Child Content Here')).toBeInTheDocument()
  })

  it('includes all layout components', () => {
    const { getByTestId } = render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )
    
    expect(getByTestId('sidebar')).toBeInTheDocument()
    expect(getByTestId('ai-assistant')).toBeInTheDocument()
  })

  it('wraps content in main element', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Main Content</div>
      </DashboardLayout>
    )
    
    const mainElement = container.querySelector('main')
    expect(mainElement).toBeInTheDocument()
    expect(mainElement).toHaveClass('flex-1')
  })
})