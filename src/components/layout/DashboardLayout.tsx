'use client'

import React, { ReactNode, Suspense, lazy, memo } from 'react'
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileNav } from '@/components/navigation/MobileNav'
import { cn } from '@/lib/utils'

// Lazy load AI Assistant for better initial load performance
const AIAssistant = lazy(() => import('@/components/ai/AIAssistant').then(module => ({ default: module.AIAssistant })))

// AI Assistant loading fallback
const AIAssistantSkeleton = () => (
  <div className="h-12 bg-muted/30 border-t border-border flex items-center px-4">
    <div className="animate-pulse flex items-center space-x-2">
      <div className="h-6 w-6 bg-muted rounded"></div>
      <div className="h-4 w-32 bg-muted rounded"></div>
    </div>
  </div>
)

interface DashboardLayoutProps {
  children: ReactNode
  className?: string
}

const DashboardLayoutContent = memo(function DashboardLayoutContent({ children, className }: DashboardLayoutProps) {
  const { isMobile, isAIExpanded, aiHeight } = useLayout()
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop only */}
      {!isMobile && <Sidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content - Account for AI Assistant height */}
        <main 
          className={cn(
            'flex-1 overflow-hidden transition-all duration-300',
            className
          )}
          style={{
            // Ensure the height accounts for AI height properly
            height: isAIExpanded ? `calc(100vh - ${aiHeight}px)` : 'calc(100vh - 48px)'
          }}
        >
          {children}
        </main>
        
        {/* AI Assistant - Lazy loaded with suspense */}
        <Suspense fallback={<AIAssistantSkeleton />}>
          <AIAssistant />
        </Suspense>
      </div>
      
      {/* Mobile Navigation - Mobile only */}
      {isMobile && <MobileNav />}
    </div>
  )
})

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <LayoutProvider>
      <DashboardLayoutContent className={className}>
        {children}
      </DashboardLayoutContent>
    </LayoutProvider>
  )
}