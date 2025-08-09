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
  <div className="h-12 bg-gray-100 border-t flex items-center px-4">
    <div className="animate-pulse flex items-center space-x-2">
      <div className="h-6 w-6 bg-gray-300 rounded"></div>
      <div className="h-4 w-32 bg-gray-300 rounded"></div>
    </div>
  </div>
)

interface DashboardLayoutProps {
  children: ReactNode
  className?: string
}

const DashboardLayoutContent = memo(function DashboardLayoutContent({ children, className }: DashboardLayoutProps) {
  const { isMobile, isAIExpanded } = useLayout()
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop only */}
      {!isMobile && <Sidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main 
          className={cn(
            'flex-1 overflow-auto',
            isAIExpanded && 'pb-0', // Remove padding when AI is expanded
            className
          )}
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