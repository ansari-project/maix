'use client'

import React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLayout } from '@/contexts/LayoutContext'
import { 
  Home, 
  FolderOpen, 
  CheckSquare, 
  Search, 
  Newspaper, 
  User, 
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Todos', href: '/todos', icon: CheckSquare },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'News', href: '/news', icon: Newspaper },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
]

const appItems: NavItem[] = [
  { label: 'Causemon', href: '/apps/causemon', icon: BarChart3 },
  { label: 'Event Manager', href: '/apps/events', icon: Calendar },
]

export function Sidebar() {
  const { data: session } = useSession()
  const { 
    isSidebarCollapsed, 
    toggleSidebar, 
    isActivePath,
    isMobile 
  } = useLayout()
  
  // Don't render on mobile - we'll use bottom navigation instead
  if (isMobile) {
    return null
  }
  
  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
        isSidebarCollapsed ? 'w-16' : 'w-[200px]'
      )}
    >
      {/* User Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium">
                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          {!isSidebarCollapsed && (
            <span className="text-sm font-medium truncate">
              {session?.user?.name || 'User'}
            </span>
          )}
        </div>
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = isActivePath(item.href)
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    'hover:bg-gray-100',
                    isActive && 'bg-blue-50 text-blue-600',
                    isSidebarCollapsed && 'justify-center'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <span className="text-blue-600">◀</span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        
        {/* Apps Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {!isSidebarCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Apps
            </h3>
          )}
          <ul className="space-y-1">
            {appItems.map((item) => {
              const Icon = item.icon
              const isActive = isActivePath(item.href)
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                      'hover:bg-gray-100',
                      isActive && 'bg-blue-50 text-blue-600',
                      isSidebarCollapsed && 'justify-center'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isSidebarCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <span className="text-blue-600">◀</span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
            
            {/* More Apps */}
            <li>
              <button
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full',
                  'hover:bg-gray-100 text-gray-600',
                  isSidebarCollapsed && 'justify-center'
                )}
              >
                <Plus className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="flex-1 text-left">More Apps</span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>
      
      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  )
}