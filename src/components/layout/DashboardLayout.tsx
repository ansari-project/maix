'use client'

import React, { ReactNode } from 'react'
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext'
import { Sidebar } from '@/components/navigation/Sidebar'
import { AIAssistant } from '@/components/ai/AIAssistant'
import { MobileNav } from '@/components/navigation/MobileNav'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
  className?: string
}

function DashboardLayoutContent({ children, className }: DashboardLayoutProps) {
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
        
        {/* AI Assistant - Present on all pages */}
        <AIAssistant />
      </div>
      
      {/* Mobile Navigation - Mobile only */}
      {isMobile && <MobileNav />}
    </div>
  )
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <LayoutProvider>
      <DashboardLayoutContent className={className}>
        {children}
      </DashboardLayoutContent>
    </LayoutProvider>
  )
}