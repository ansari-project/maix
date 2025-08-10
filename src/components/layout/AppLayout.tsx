"use client"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  // Since all authenticated pages now use DashboardLayout,
  // AppLayout just passes through children without modification
  return <>{children}</>
}