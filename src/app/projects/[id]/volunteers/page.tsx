"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface Application {
  id: string
  message: string
  status: string
  appliedAt: string
  user: {
    name: string
    email: string
    specialty?: string
    experienceLevel?: string
    skills?: string[]
    linkedinUrl?: string
    githubUrl?: string
  }
}

interface Project {
  id: string
  title: string
  owner: {
    email: string
  }
  applications: Application[]
}

export default function ProjectApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

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
        
        // Check if user is the owner
        if (data.owner.email !== session?.user?.email) {
          router.push(`/projects/${projectId}`)
          return
        }
        
        setProject(data)
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    }
    setLoading(false)
  }, [projectId, session, router])

  useEffect(() => {
    if (session && projectId) {
      fetchProject()
    }
  }, [session, projectId, fetchProject])

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    setUpdating(applicationId)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchProject() // Refresh the data
      }
    } catch (error) {
      console.error("Error updating application:", error)
    }
    setUpdating(null)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || !project) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent p-6">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" className="mb-6" asChild>
            <Link href={`/projects/${projectId}`}>← Back to Project</Link>
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Manage Applications</CardTitle>
              <CardDescription>
                {project.title} • {project.applications.length} applications
              </CardDescription>
            </CardHeader>
          </Card>

          {project.applications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">No applications yet.</p>
                <Button asChild>
                  <Link href="/projects">Share your project to get applications</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {project.applications.map((application) => (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {application.user.name || application.user.email}
                        </CardTitle>
                        <CardDescription>
                          Applied {new Date(application.appliedAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        application.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Application Message</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {application.message}
                      </p>
                    </div>

                    {(application.user.specialty || application.user.experienceLevel) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {application.user.specialty && (
                          <div>
                            <span className="text-sm font-medium">Specialty:</span>
                            <p className="text-muted-foreground">
                              {application.user.specialty.replace('_', ' ')}
                            </p>
                          </div>
                        )}
                        {application.user.experienceLevel && (
                          <div>
                            <span className="text-sm font-medium">Experience:</span>
                            <p className="text-muted-foreground">
                              {application.user.experienceLevel.replace('_', ' ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {application.user.skills && application.user.skills.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {application.user.skills.map((skill, index) => (
                            <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-muted-foreground">Contact:</span>
                      <a href={`mailto:${application.user.email}`} 
                         className="text-primary hover:underline text-sm">
                        {application.user.email}
                      </a>
                      {application.user.linkedinUrl && (
                        <a href={application.user.linkedinUrl} target="_blank" rel="noopener noreferrer"
                           className="text-primary hover:underline text-sm">
                          LinkedIn
                        </a>
                      )}
                      {application.user.githubUrl && (
                        <a href={application.user.githubUrl} target="_blank" rel="noopener noreferrer"
                           className="text-primary hover:underline text-sm">
                          GitHub
                        </a>
                      )}
                    </div>

                    {application.status === 'PENDING' && (
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => updateApplicationStatus(application.id, 'ACCEPTED')}
                          disabled={updating === application.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {updating === application.id ? "Updating..." : "Accept"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateApplicationStatus(application.id, 'REJECTED')}
                          disabled={updating === application.id}
                        >
                          {updating === application.id ? "Updating..." : "Reject"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}