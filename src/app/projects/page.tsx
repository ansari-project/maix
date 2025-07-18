"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Project {
  id: string
  title: string
  description: string
  projectType: string
  helpType: string
  budgetRange?: string
  maxVolunteers: number
  createdAt: string
  owner: {
    name: string
    email: string
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
  const [typeFilter, setTypeFilter] = useState("all")
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
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || project.projectType === typeFilter
    const matchesHelp = helpFilter === "all" || project.helpType === helpFilter
    
    return matchesSearch && matchesType && matchesHelp
  })

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent p-6">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary-foreground">Browse Projects</h1>
            <p className="text-primary-foreground/80">Find AI/tech projects to contribute to</p>
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="RESEARCH">Research</SelectItem>
                    <SelectItem value="STARTUP">Startup</SelectItem>
                    <SelectItem value="NON_PROFIT">Non-Profit</SelectItem>
                    <SelectItem value="OPEN_SOURCE">Open Source</SelectItem>
                    <SelectItem value="CORPORATE">Corporate</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="text-primary-foreground/60 mb-4">
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
                    <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {project.helpType.replace('_', ' ')}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-3">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{project.projectType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Budget:</span>
                      <span>{project.budgetRange || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Applications:</span>
                      <span>{project._count.applications}/{project.maxVolunteers}</span>
                    </div>
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
    </div>
  )
}