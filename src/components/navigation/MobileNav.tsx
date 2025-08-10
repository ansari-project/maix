'use client'

import React, { memo, useCallback } from 'react'
import Link from 'next/link'
import { useLayout } from '@/contexts/LayoutContext'
import { 
  Home, 
  FolderOpen, 
  CheckSquare, 
  Grid3x3,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const mobileNavItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Todos', href: '/todos', icon: CheckSquare },
  { label: 'Apps', href: '/apps', icon: Grid3x3 },
]

export const MobileNav = memo(function MobileNav() {
  const { isActivePath } = useLayout()
  const [showMore, setShowMore] = React.useState(false)
  
  const toggleMore = useCallback(() => {
    setShowMore(prev => !prev)
  }, [])
  
  const closeMore = useCallback(() => {
    setShowMore(false)
  }, [])
  
  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <ul className="flex justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const isActive = isActivePath(item.href)
            
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 px-2 transition-colors',
                    isActive ? 'text-blue-600' : 'text-muted-foreground',
                    'hover:text-blue-600'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              </li>
            )
          })}
          
          {/* More Menu */}
          <li className="flex-1">
            <button
              onClick={toggleMore}
              className="flex flex-col items-center gap-1 py-2 px-2 text-muted-foreground hover:text-blue-600 transition-colors w-full"
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-xs">More</span>
            </button>
          </li>
        </ul>
      </nav>
      
      {/* More Menu Overlay */}
      {showMore && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeMore}
          />
          <div className="fixed bottom-16 left-4 right-4 bg-background rounded-lg shadow-lg z-50 p-2">
            <Link
              href="/profile"
              className="block px-4 py-3 hover:bg-muted/50 rounded-md transition-colors"
              onClick={closeMore}
            >
              Profile
            </Link>
            <Link
              href="/search"
              className="block px-4 py-3 hover:bg-muted/50 rounded-md transition-colors"
              onClick={closeMore}
            >
              Search
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-3 hover:bg-muted/50 rounded-md transition-colors"
              onClick={closeMore}
            >
              Settings
            </Link>
            <hr className="my-2" />
            <Link
              href="/apps/causemon"
              className="block px-4 py-3 hover:bg-muted/50 rounded-md transition-colors"
              onClick={closeMore}
            >
              Causemon
            </Link>
            <Link
              href="/apps/events"
              className="block px-4 py-3 hover:bg-muted/50 rounded-md transition-colors"
              onClick={closeMore}
            >
              Event Manager
            </Link>
          </div>
        </>
      )}
    </>
  )
})