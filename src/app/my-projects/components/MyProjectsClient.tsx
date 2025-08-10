"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Calendar, Plus, Search, Filter, FolderOpen, Share2, Trash2, Edit } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { CreateProjectDialog } from "./CreateProjectDialog"
import { Markdown } from "@/components/ui/markdown"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

interface PersonalProject {
  id: string
  name: string
  description: string
  personalCategory?: string | null
  targetCompletionDate?: string | null
  createdAt: string
  updatedAt: string
  isActive: boolean
  status: "IN_PROGRESS" | "COMPLETED" | "PAUSED"
  owner: {
    id: string
    name: string | null
    email: string
  }
  members: Array<{
    id: string
    role: "OWNER" | "MEMBER"
    user: {
      id: string
      name: string | null
      email: string
    }
  }>
  todos?: Array<{
    id: string
    title: string
    status: string
  }>
}

export function MyProjectsClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<PersonalProject[]>([])
  const [filteredProjects, setFilteredProjects] = useState<PersonalProject[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [includeShared, setIncludeShared] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchProjects()
      fetchCategories()
    }
  }, [session, includeShared]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterProjects()
  }, [projects, searchQuery, categoryFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams()
      if (includeShared) {
        params.set('includeShared', 'true')
      }

      const response = await fetch(`/api/projects/personal?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }

      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load personal projects",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/projects/personal/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const filterProjects = () => {
    let filtered = [...projects]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.personalCategory?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      if (categoryFilter === "uncategorized") {
        filtered = filtered.filter(project => !project.personalCategory)
      } else {
        filtered = filtered.filter(project => project.personalCategory === categoryFilter)
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    setFilteredProjects(filtered)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? All associated tasks will become standalone tasks.")) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error("Failed to delete project")
      }

      setProjects(prev => prev.filter(p => p.id !== projectId))
      toast({
        title: "Success",
        description: "Project deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting project:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete project",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "PAUSED":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Personal Projects</h1>
            <p className="text-muted-foreground">
              Manage your personal learning and development projects
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {projects.filter(p => p.status === 'IN_PROGRESS').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {projects.filter(p => p.status === 'COMPLETED').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={includeShared ? "default" : "outline"}
              onClick={() => setIncludeShared(!includeShared)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {includeShared ? "Hide" : "Show"} Shared
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "list")}>
        <TabsList className="grid w-fit grid-cols-2 mb-6">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Projects */}
        <TabsContent value="grid" className="mt-0">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Personal Projects</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                    ? "No projects match your filters"
                    : "Start your personal development journey by creating your first project"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="line-clamp-2 mb-2">{project.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getStatusColor(project.status)}>
                            {formatStatus(project.status)}
                          </Badge>
                          {project.personalCategory && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                              {project.personalCategory}
                            </Badge>
                          )}
                          {project.members.length > 1 && (
                            <Badge variant="secondary">
                              <Share2 className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-3">
                      <Markdown content={project.description} className="prose-sm" />
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {project.targetCompletionDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Target: {format(new Date(project.targetCompletionDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <span>Tasks: {project.todos?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Members: {project.members.length}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {format(new Date(project.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Tasks
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Personal Projects</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                    ? "No projects match your filters"
                    : "Start your personal development journey by creating your first project"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <Badge className={getStatusColor(project.status)}>
                            {formatStatus(project.status)}
                          </Badge>
                          {project.personalCategory && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                              {project.personalCategory}
                            </Badge>
                          )}
                          {project.members.length > 1 && (
                            <Badge variant="secondary">
                              <Share2 className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {project.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {project.targetCompletionDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Target: {format(new Date(project.targetCompletionDate), "MMM d, yyyy")}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <FolderOpen className="h-4 w-4" />
                            <span>{project.todos?.length || 0} tasks</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{project.members.length} members</span>
                          </div>
                          <span>Updated {format(new Date(project.updatedAt), "MMM d")}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          View Tasks
                        </Button>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                        <Button variant="ghost" size="sm" className="p-2">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-2 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProjectCreated={() => {
          fetchProjects()
          fetchCategories()
        }}
      />
    </div>
    </DashboardLayout>
  )
}