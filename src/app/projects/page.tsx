"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Package, ExternalLink, Lock, Globe } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"

interface Project {
  id: string
  name: string
  goal: string
  description: string
  helpType: string
  webpage?: string
  targetCompletionDate?: string
  isActive: boolean
  createdAt: string
  visibility?: "PUBLIC" | "PRIVATE"  // Added visibility field
  owner: {
    name: string
    email: string
  }
  product?: {
    id: string
    name: string
    url: string | null
  }
  _count: {
    applications: number
  }
}

export default function ProjectsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [helpFilter, setHelpFilter] = useState("all")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchProjects()
    }
  }, [session])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
    setLoading(false)
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.goal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesHelp = helpFilter === "all" || project.helpType === helpFilter
    
    return matchesSearch && matchesHelp
  })

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Browse Projects</h1>
            <p className="text-muted-foreground">Find AI/tech projects to contribute to</p>
          </div>
          <Button asChild>
            <Link href="/projects/new">Post Project</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Find Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Help Type</label>
                <Select value={helpFilter} onValueChange={setHelpFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Help Types</SelectItem>
                    <SelectItem value="ADVICE">Advice</SelectItem>
                    <SelectItem value="PROTOTYPE">Prototype</SelectItem>
                    <SelectItem value="MVP">MVP</SelectItem>
                    <SelectItem value="FULL_PRODUCT">Full Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-muted-foreground mb-4">
                {projects.length === 0 ? "No projects posted yet." : "No projects match your filters."}
              </div>
              <Button asChild>
                <Link href="/projects/new">Post the First Project</Link>
              </Button>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <CardTitle className="line-clamp-2">{project.name}</CardTitle>
                      {project.visibility === "PRIVATE" && (
                        <Lock className="h-4 w-4 text-amber-600 mt-1" aria-label="Private project" />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {project.helpType.replace('_', ' ')}
                      </span>
                      {!project.isActive && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  {project.product && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        <Link href={`/products/${project.product.id}`} className="hover:underline">
                          {project.product.name}
                        </Link>
                      </Badge>
                      {project.product.url && (
                        <Button variant="ghost" size="sm" className="h-auto p-1" asChild>
                          <Link href={project.product.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Goal:</div>
                    <div>
                      <Markdown content={project.goal} className="prose-sm" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Applications:</span>
                      <span>{project._count.applications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span>{project.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    {project.targetCompletionDate && (
                      <div className="flex justify-between">
                        <span>Target Date:</span>
                        <span>{new Date(project.targetCompletionDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Posted by:</span>
                      <span>{project.owner.name || project.owner.email}</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" asChild>
                    <Link href={`/projects/${project.id}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}