import React from 'react'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileNav } from '@/components/navigation/MobileNav'
import { AIAssistant } from '@/components/ai/AIAssistant'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SessionProvider } from 'next-auth/react'
import { LayoutProvider } from '@/contexts/LayoutContext'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ 
    data: { 
      user: { 
        name: 'Test User',
        email: 'test@example.com',
        image: null 
      } 
    },
    status: 'authenticated'
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />
  },
}))

describe('Dark Mode Support', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.className = ''
  })

  describe('Sidebar Component', () => {
    it('should not have hardcoded white/gray colors', () => {
      const { container } = render(
        <LayoutProvider>
          <Sidebar />
        </LayoutProvider>
      )
      
      // Check that no elements have hardcoded color classes
      const elementsWithHardcodedColors = container.querySelectorAll(
        '[class*="bg-white"], [class*="bg-gray-"], [class*="text-gray-"], [class*="border-gray-"]'
      )
      
      expect(elementsWithHardcodedColors.length).toBe(0)
    })

    it('should use theme-aware classes', () => {
      const { container } = render(
        <LayoutProvider>
          <Sidebar />
        </LayoutProvider>
      )
      
      // Check for theme-aware classes
      const themeAwareElements = container.querySelectorAll(
        '[class*="bg-background"], [class*="bg-muted"], [class*="text-muted-foreground"], [class*="border-border"]'
      )
      
      expect(themeAwareElements.length).toBeGreaterThan(0)
    })
  })

  describe('MobileNav Component', () => {
    it('should not have hardcoded white/gray colors', () => {
      const { container } = render(
        <LayoutProvider>
          <MobileNav />
        </LayoutProvider>
      )
      
      const elementsWithHardcodedColors = container.querySelectorAll(
        '[class*="bg-white"], [class*="bg-gray-"], [class*="text-gray-"], [class*="border-gray-"]'
      )
      
      expect(elementsWithHardcodedColors.length).toBe(0)
    })

    it('should use theme-aware classes', () => {
      const { container } = render(
        <LayoutProvider>
          <MobileNav />
        </LayoutProvider>
      )
      
      const themeAwareElements = container.querySelectorAll(
        '[class*="bg-background"], [class*="text-muted-foreground"], [class*="border-border"]'
      )
      
      expect(themeAwareElements.length).toBeGreaterThan(0)
    })
  })

  describe('AIAssistant Component', () => {
    it('should not have hardcoded white/gray colors', () => {
      const { container } = render(
        <LayoutProvider>
          <AIAssistant />
        </LayoutProvider>
      )
      
      const elementsWithHardcodedColors = container.querySelectorAll(
        '[class*="bg-white"], [class*="bg-gray-"], [class*="text-gray-"], [class*="border-gray-"]'
      )
      
      expect(elementsWithHardcodedColors.length).toBe(0)
    })

    it('should use theme-aware classes', () => {
      const { container } = render(
        <LayoutProvider>
          <AIAssistant />
        </LayoutProvider>
      )
      
      const themeAwareElements = container.querySelectorAll(
        '[class*="bg-background"], [class*="bg-muted"], [class*="text-muted-foreground"], [class*="border-border"]'
      )
      
      expect(themeAwareElements.length).toBeGreaterThan(0)
    })
  })

  describe('DashboardLayout Component', () => {
    it('should not have hardcoded white/gray colors', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )
      
      const elementsWithHardcodedColors = container.querySelectorAll(
        '[class*="bg-gray-50"], [class*="bg-gray-100"], [class*="bg-gray-300"]'
      )
      
      expect(elementsWithHardcodedColors.length).toBe(0)
    })

    it('should use theme-aware background', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )
      
      const backgroundElements = container.querySelectorAll('[class*="bg-background"]')
      expect(backgroundElements.length).toBeGreaterThan(0)
    })
  })

  describe('Dark Mode Toggle', () => {
    it('should apply dark mode classes when enabled', () => {
      // Simulate dark mode
      document.documentElement.className = 'dark'
      
      const { container } = render(
        <LayoutProvider>
          <Sidebar />
        </LayoutProvider>
      )
      
      // Check that dark mode classes are properly applied
      const darkModeElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkModeElements.length).toBeGreaterThan(0)
    })
  })
})