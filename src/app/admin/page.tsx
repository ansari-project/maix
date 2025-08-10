'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderOpen, Package, FileText, TrendingUp } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

const ADMIN_EMAIL = 'waleedk@gmail.com'

interface AdminStats {
  overview: {
    totalUsers: number
    activeUsers: number
    recentUsers: number
    usersWithProjects: number
    usersWithApplications: number
    usersWithProducts: number
  }
  content: {
    totalProjects: number
    totalProducts: number
    totalApplications: number
    totalPosts: number
  }
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    createdAt: string
    isActive: boolean
    _count: {
      projects: number
      products: number
      applications: number
      posts: number
    }
  }>
  projectOwners: Array<{
    id: string
    name: string | null
    email: string
    _count: {
      projects: number
    }
  }>
  volunteers: Array<{
    id: string
    name: string | null
    email: string
    _count: {
      applications: number
    }
  }>
  generatedAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user?.email !== ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }

    fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!stats) return null

  const engagementRate = stats.overview.totalUsers > 0 
    ? ((stats.overview.usersWithProjects + stats.overview.usersWithApplications) / stats.overview.totalUsers * 100).toFixed(1)
    : '0'

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(stats.generatedAt).toLocaleString()}
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.activeUsers} active ({((stats.overview.activeUsers / stats.overview.totalUsers) * 100).toFixed(0)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.recentUsers}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementRate}%</div>
              <p className="text-xs text-muted-foreground">Users with projects or applications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.content.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                By {stats.overview.usersWithProjects} users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.content.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                By {stats.overview.usersWithProducts} users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.content.totalPosts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.content.totalApplications} volunteer applications
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest 10 user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{user.name || 'Unnamed User'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{user._count.projects} projects</p>
                    <p>{user._count.products} products</p>
                    <p>{user._count.applications} applications</p>
                    <p>{user._count.posts} posts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Project Owners */}
          <Card>
            <CardHeader>
              <CardTitle>Project Owners</CardTitle>
              <CardDescription>Users who have created projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.projectOwners.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name || 'Unnamed User'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <p className="text-sm font-medium">{user._count.projects} projects</p>
                  </div>
                ))}
                {stats.projectOwners.length === 0 && (
                  <p className="text-muted-foreground">No project owners yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Volunteers */}
          <Card>
            <CardHeader>
              <CardTitle>Active Volunteers</CardTitle>
              <CardDescription>Users who have applied to projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.volunteers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name || 'Unnamed User'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <p className="text-sm font-medium">{user._count.applications} applications</p>
                  </div>
                ))}
                {stats.volunteers.length === 0 && (
                  <p className="text-muted-foreground">No volunteers yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}