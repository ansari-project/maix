'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface LayoutContextType {
  // Sidebar state
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // AI Assistant state
  isAIExpanded: boolean
  toggleAI: () => void
  setAIExpanded: (expanded: boolean) => void
  
  // Current page tracking
  currentPath: string
  isActivePath: (path: string) => boolean
  
  // Mobile state
  isMobile: boolean
  setIsMobile: (mobile: boolean) => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isAIExpanded, setIsAIExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Callbacks
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])
  
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
  }, [])
  
  const toggleAI = useCallback(() => {
    setIsAIExpanded(prev => !prev)
  }, [])
  
  const setAIExpanded = useCallback((expanded: boolean) => {
    setIsAIExpanded(expanded)
  }, [])
  
  const isActivePath = useCallback((path: string) => {
    if (!pathname) return false
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }, [pathname])
  
  // Effect to handle responsive behavior
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setIsSidebarCollapsed(true)
      }
    }
    
    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Effect to handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to toggle AI
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleAI()
      }
      // Escape to close AI if expanded
      if (e.key === 'Escape' && isAIExpanded) {
        setAIExpanded(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAIExpanded, toggleAI, setAIExpanded])
  
  const value: LayoutContextType = {
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    isAIExpanded,
    toggleAI,
    setAIExpanded,
    currentPath: pathname,
    isActivePath,
    isMobile,
    setIsMobile,
  }
  
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}