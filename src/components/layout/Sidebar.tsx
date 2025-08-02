"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { 
  Home, 
  User, 
  FolderOpen, 
  Plus, 
  FileText, 
  MessageCircle, 
  Users, 
  Settings,
  Menu,
  Key,
  Package,
  LogOut,
  HelpCircle,
  Shield,
  Megaphone
} from "lucide-react"

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
  isActive?: boolean
  badge?: number
}

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
  currentPath?: string
}

export function Sidebar({ isCollapsed = false, onToggle, currentPath }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navigationItems: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard/home",
      icon: Home,
      isActive: pathname === "/dashboard/home" || pathname === "/dashboard"
    },
    {
      name: "My Profile",
      href: "/profile", 
      icon: User,
      isActive: pathname === "/profile"
    },
    {
      name: "Q + A",
      href: "/q-and-a",
      icon: HelpCircle,
      isActive: pathname === "/q-and-a" || pathname.startsWith("/q-and-a/")
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
      isActive: pathname === "/products" || pathname.startsWith("/products/")
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      isActive: pathname === "/projects"
    },
    {
      name: "My Volunteering",
      href: "/volunteering",
      icon: FileText,
      isActive: pathname === "/volunteering"
    },
    {
      name: "Organizations",
      href: "/organizations",
      icon: Users,
      isActive: pathname === "/organizations" || pathname.startsWith("/organizations/")
    }
  ]

  // Apps section - visible to all authenticated users
  const appItems: NavigationItem[] = session ? [
    {
      name: "Causemon",
      href: "/causemon",
      icon: Megaphone,
      isActive: pathname === "/causemon"
    }
  ] : []

  const settingsItems: NavigationItem[] = [
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      isActive: pathname === "/settings"
    }
  ]

  // Admin items - only visible to admin
  const adminItems: NavigationItem[] = session?.user?.email === 'waleedk@gmail.com' ? [
    {
      name: "Admin",
      href: "/admin",
      icon: Shield,
      isActive: pathname === "/admin"
    }
  ] : []

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-primary">MAIX</h2>
              <p className="text-xs text-muted-foreground">Meaningful AI Exchange</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.name}
              item={item}
              isCollapsed={isCollapsed}
              onClick={() => setIsMobileOpen(false)}
            />
          ))}
        </div>

        {/* Apps Section */}
        {appItems.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              {!isCollapsed && (
                <p className="text-xs font-semibold text-muted-foreground px-3 mb-2">APPS</p>
              )}
              {appItems.map((item) => (
                <SidebarItem
                  key={item.name}
                  item={item}
                  isCollapsed={isCollapsed}
                  onClick={() => setIsMobileOpen(false)}
                />
              ))}
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Settings Section */}
        <div className="space-y-1">
          {settingsItems.map((item) => (
            <SidebarItem
              key={item.name}
              item={item}
              isCollapsed={isCollapsed}
              onClick={() => setIsMobileOpen(false)}
            />
          ))}
        </div>

        {/* Admin Section */}
        {adminItems.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              {adminItems.map((item) => (
                <SidebarItem
                  key={item.name}
                  item={item}
                  isCollapsed={isCollapsed}
                  onClick={() => setIsMobileOpen(false)}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User Profile Section */}
      {session && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-accent-foreground font-semibold text-sm">
                {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user?.name || session.user?.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{session.user?.username}
                </p>
              </div>
            )}
          </div>
          {/* Sign Out Button */}
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="Sign Out"
              className={cn(
                "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
                isCollapsed && "px-2"
              )}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sign Out</span>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col bg-background border-r transition-all duration-300 fixed left-0 top-0 h-full z-40",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </div>
    </>
  )
}

interface SidebarItemProps {
  item: NavigationItem
  isCollapsed: boolean
  onClick?: () => void
}

function SidebarItem({ item, isCollapsed, onClick }: SidebarItemProps) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        item.isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && (
        <span className="flex-1">{item.name}</span>
      )}
      {!isCollapsed && item.badge && (
        <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
          {item.badge}
        </span>
      )}
    </Link>
  )
}