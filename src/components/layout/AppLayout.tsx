"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Don't show sidebar on public pages
  const publicPages = ["/", "/auth/signin", "/auth/signup"]
  const isPublicPage = publicPages.includes(pathname) || pathname.startsWith("/public")
  const showSidebar = session && !isPublicPage

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPath={pathname}
      />
      <main className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        {children}
      </main>
    </div>
  )
}