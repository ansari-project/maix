"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Search, Users, Calendar, Filter } from "lucide-react"
import { format } from "date-fns"
import { Markdown } from "@/components/ui/markdown"

interface Project {
  id: string
  name: string
  description: string
  goal: string
  projectType: string
  helpType: string
  requiredSkills: string[]
  maxVolunteers: number
  createdAt: string
  owner: {
    id: string
    name: string | null
  }
  _count: {
    applications: number
  }
}

export default function PublicProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [projectTypeFilter, setProjectTypeFilter] = useState("all")
  const [helpTypeFilter, setHelpTypeFilter] = useState("all")

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (projectTypeFilter !== 'all') params.append('projectType', projectTypeFilter)
      if (helpTypeFilter !== 'all') params.append('helpType', helpTypeFilter)
      
      const response = await fetch(`/api/public/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, projectTypeFilter, helpTypeFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProjects()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
            <div className="grid gap-4 mt-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-3">
                  <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Browse Projects</h1>
          <p className="text-muted-foreground">
            Discover projects that need your expertise and make a meaningful impact
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
          
          <div className="flex flex-wrap gap-2">
            <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Project Type" />
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
            
            <Select value={helpTypeFilter} onValueChange={setHelpTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Help Type" />
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

        {/* Projects List */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No projects found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <CardDescription>
                        by {project.owner.name || 'Anonymous'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {project.projectType.toLowerCase().replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {project.helpType.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <Markdown content={project.description} />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Goal</h3>
                    <Markdown content={project.goal} />
                  </div>
                  
                  {project.requiredSkills.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(project.createdAt), "MMM dd, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {project._count.applications} volunteers
                      </span>
                      <span>
                        Need {project.maxVolunteers} volunteers
                      </span>
                    </div>
                    
                    <Button asChild>
                      <Link href="/auth/signin">
                        Sign In to Apply
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}