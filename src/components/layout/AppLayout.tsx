"use client"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  // AppLayout is now a simple pass-through since all pages handle their own layouts
  // Pages that need DashboardLayout import and use it directly
  return <>{children}</>
}