"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface Project {
  id: string
  title: string
  description: string
  projectType: string
  helpType: string
  budgetRange?: string
  maxVolunteers: number
  contactEmail: string
  organizationUrl?: string
  timeline: any
  requiredSkills: any
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

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState("")
  const [userApplication, setUserApplication] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && params.id) {
      fetchProject()
    }
  }, [session, params.id])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
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
  }

  const handleApply = async () => {
    if (!applicationMessage.trim()) return
    
    setApplying(true)
    try {
      const response = await fetch(`/api/projects/${params.id}/apply`, {
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
  const canApply = !isOwner && !hasApplied && project.applications.length < project.maxVolunteers

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent py-8">
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
                      <CardTitle className="text-2xl">{project.title}</CardTitle>
                      <CardDescription className="mt-2">
                        Posted by {project.owner.name || project.owner.email}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {project.projectType.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                        {project.helpType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                  </div>

                  {project.timeline?.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Timeline</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{project.timeline.description}</p>
                    </div>
                  )}

                  {project.requiredSkills && project.requiredSkills.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill: string, index: number) => (
                          <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
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
                    <span className="text-muted-foreground">Budget:</span>
                    <span>{project.budgetRange || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volunteers:</span>
                    <span>{project.applications.length}/{project.maxVolunteers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted:</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  {project.organizationUrl && (
                    <div>
                      <span className="text-muted-foreground">Organization:</span>
                      <a href={project.organizationUrl} target="_blank" rel="noopener noreferrer" 
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