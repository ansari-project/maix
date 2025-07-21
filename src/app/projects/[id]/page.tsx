"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Markdown } from "@/components/ui/markdown"

function formatProjectStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'AWAITING_VOLUNTEERS':
      return { label: 'Awaiting Volunteers', color: 'bg-blue-100 text-blue-800' }
    case 'PLANNING':
      return { label: 'Planning', color: 'bg-purple-100 text-purple-800' }
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-green-100 text-green-800' }
    case 'ON_HOLD':
      return { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' }
    case 'COMPLETED':
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800' }
  }
}

interface Project {
  id: string
  name: string
  goal: string
  description: string
  helpType: string
  status: string
  contactEmail: string
  targetCompletionDate?: string
  isActive: boolean
  createdAt: string
  owner: {
    id: string
    name: string
    email: string
  }
  applications: Array<{
    id: string
    status: string
    user: {
      name: string
      email: string
    }
  }>
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState("")
  const [userApplication, setUserApplication] = useState<any>(null)

  // Resolve async params
  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, [params])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
        
        // Check if current user has already applied
        const existingApplication = data.applications.find(
          (app: any) => app.user.email === session?.user?.email
        )
        setUserApplication(existingApplication)
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    }
    setLoading(false)
  }, [projectId, session])

  useEffect(() => {
    if (session && projectId) {
      fetchProject()
    }
  }, [session, projectId, fetchProject])

  const handleApply = async () => {
    if (!applicationMessage.trim()) return
    
    setApplying(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: applicationMessage
        }),
      })

      if (response.ok) {
        fetchProject() // Refresh to show the application
        setApplicationMessage("")
      }
    } catch (error) {
      console.error("Error applying to project:", error)
    }
    setApplying(false)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || !project) return null

  const isOwner = project.owner.email === session.user?.email
  const hasApplied = !!userApplication
  const canApply = !isOwner && !hasApplied && project.isActive

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent p-6">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" className="mb-6" asChild>
            <Link href="/projects">← Back to Projects</Link>
          </Button>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{project.name}</CardTitle>
                        <CardDescription className="mt-2">
                          Posted by {project.owner.name || project.owner.email}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                          {project.helpType.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${formatProjectStatus(project.status).color}`}>
                          {formatProjectStatus(project.status).label}
                        </span>
                        {!project.isActive && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Not Recruiting
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick Apply Button */}
                    {!isOwner && !hasApplied && project.isActive && (
                      <div className="flex justify-end">
                        <Button 
                          size="lg" 
                          onClick={() => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Apply to Volunteer
                        </Button>
                      </div>
                    )}
                    {!isOwner && hasApplied && (
                      <div className="flex justify-end">
                        <span className={`text-sm px-3 py-1.5 rounded ${
                          userApplication.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          userApplication.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Application {userApplication.status.toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Goal</h3>
                    <Markdown content={project.goal} className="text-muted-foreground" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <Markdown content={project.description} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* Application Section */}
              {!isOwner && !hasApplied && (
                <Card id="application-form">
                  <CardHeader>
                    <CardTitle>Apply to this Project</CardTitle>
                    <CardDescription>
                      {project.isActive 
                        ? "Tell the project owner why you'd be a great fit"
                        : "This project is not currently accepting volunteers"
                      }
                    </CardDescription>
                  </CardHeader>
                  {project.isActive && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="message">Application Message</Label>
                        <Textarea
                          id="message"
                          value={applicationMessage}
                          onChange={(e) => setApplicationMessage(e.target.value)}
                          placeholder="Explain your background, why you're interested, and how you can help..."
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleApply} disabled={applying || !applicationMessage.trim()}>
                        {applying ? "Applying..." : "Submit Application"}
                      </Button>
                    </CardContent>
                  )}
                  {!project.isActive && (
                    <CardContent>
                      <p className="text-muted-foreground">
                        The project owner has paused volunteer recruitment. Check back later or contact them directly.
                      </p>
                    </CardContent>
                  )}
                </Card>
              )}

              {hasApplied && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Application</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      <span>Status:</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        userApplication.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        userApplication.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {userApplication.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      You have applied to this project. The owner will review your application.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applications:</span>
                    <span>{project.applications.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>{formatProjectStatus(project.status).label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recruiting:</span>
                    <span>{project.isActive ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted:</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  {project.targetCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Date:</span>
                      <span>{new Date(project.targetCompletionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <a href={`mailto:${project.contactEmail}`} className="text-primary hover:underline block">
                        {project.contactEmail}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Project</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        You are the owner of this project.
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href={`/projects/${project.id}/applications`}>
                          View Applications ({project.applications.length})
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}