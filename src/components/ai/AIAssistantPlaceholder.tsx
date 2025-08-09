'use client'

import React from 'react'
import { useLayout } from '@/contexts/LayoutContext'
import { MessageSquare, ChevronUp, ChevronDown, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AIAssistantPlaceholder() {
  const { isAIExpanded, toggleAI, isMobile } = useLayout()
  
  return (
    <div
      className={cn(
        'border-t border-gray-200 bg-white transition-all duration-300 ease-out',
        isAIExpanded 
          ? isMobile ? 'h-[50vh]' : 'h-[25vh] min-h-[200px] max-h-[400px]'
          : 'h-12'
      )}
    >
      {/* Collapsed State */}
      {!isAIExpanded && (
        <button
          onClick={toggleAI}
          className="w-full h-full px-4 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
          aria-label="Open AI Assistant"
        >
          <MessageSquare className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
          <span className="text-gray-500 group-hover:text-gray-700">
            Need help? Ask AI about this page...
          </span>
          <div className="ml-auto flex items-center gap-2 text-gray-400">
            <div className="flex items-center gap-1 text-xs">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      )}
      
      {/* Expanded State */}
      {isAIExpanded && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium">AI Assistant</span>
              <span className="text-sm text-gray-500">- {getCurrentPageContext()}</span>
            </div>
            <button
              onClick={toggleAI}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Minimize AI Assistant"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="text-center text-gray-500 mt-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">AI Assistant will be implemented in Phase 3</p>
              <p className="text-xs mt-2">This is a placeholder component</p>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get current page context
function getCurrentPageContext(): string {
  if (typeof window === 'undefined') return 'Loading'
  
  const path = window.location.pathname
  
  if (path === '/') return 'Home'
  if (path.startsWith('/projects')) return 'Projects'
  if (path.startsWith('/todos')) return 'Todos'
  if (path.startsWith('/search')) return 'Search'
  if (path.startsWith('/news')) return 'News'
  if (path.startsWith('/profile')) return 'Profile'
  if (path.startsWith('/settings')) return 'Settings'
  if (path.startsWith('/apps/causemon')) return 'Causemon'
  if (path.startsWith('/apps/events')) return 'Event Manager'
  
  return 'Page'
}