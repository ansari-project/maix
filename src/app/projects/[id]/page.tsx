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

interface Project {
  id: string
  name: string
  goal: string
  description: string
  planOutline?: string
  history?: string
  webpage?: string
  helpType: string
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
                      {!project.isActive && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
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

                  {project.planOutline && (
                    <div>
                      <h3 className="font-semibold mb-2">Plan Outline</h3>
                      <Markdown content={project.planOutline} className="text-muted-foreground" />
                    </div>
                  )}

                  {project.history && (
                    <div>
                      <h3 className="font-semibold mb-2">Project History</h3>
                      <Markdown content={project.history} className="text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Application Section */}
              {canApply && (
                <Card>
                  <CardHeader>
                    <CardTitle>Apply to this Project</CardTitle>
                    <CardDescription>
                      Tell the project owner why you&apos;d be a great fit
                    </CardDescription>
                  </CardHeader>
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
                    <span>{project.isActive ? "Active" : "Inactive"}</span>
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
                  {project.webpage && (
                    <div>
                      <span className="text-muted-foreground">Website:</span>
                      <a href={project.webpage} target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline block">
                        Visit Website
                      </a>
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