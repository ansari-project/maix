"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Markdown } from "@/components/ui/markdown"
import { MessageSquare } from "lucide-react"
import { TodoSection } from "@/components/todos/todo-section"

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

interface ProjectPageClientProps {
  project: any
  currentUser: any
  userRole: string | null
  session: any
}

export default function ProjectPageClient({ 
  project, 
  currentUser, 
  userRole, 
  session 
}: ProjectPageClientProps) {
  const router = useRouter()
  const [applying, setApplying] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState("")
  const [userApplication, setUserApplication] = useState<any>(null)
  const [projectUpdates, setProjectUpdates] = useState<any[]>([])
  const [newUpdateContent, setNewUpdateContent] = useState("")
  const [newProjectStatus, setNewProjectStatus] = useState<string | undefined>(undefined)
  const [postingUpdate, setPostingUpdate] = useState(false)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProjectUpdates = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts?projectId=${project.id}&type=PROJECT_UPDATE`)
      if (response.ok) {
        const data = await response.json()
        setProjectUpdates(data)
      }
    } catch (error) {
      console.error("Error fetching project updates:", error)
    }
  }, [project.id])

  useEffect(() => {
    // Check if current user has already applied
    const existingApplication = project.applications?.find(
      (app: any) => app.user.email === session?.user?.email
    )
    setUserApplication(existingApplication)
    
    // Initial data fetch
    fetchProjectUpdates()
    setLoading(false)
  }, [project, session, fetchProjectUpdates])

  const handleApply = async () => {
    if (!applicationMessage.trim()) return
    
    setApplying(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: applicationMessage
        }),
      })

      if (response.ok) {
        // Refresh the page to show updated application status
        router.refresh()
        setApplicationMessage("")
      }
    } catch (error) {
      console.error("Error applying to project:", error)
    }
    setApplying(false)
  }

  const handlePostUpdate = async () => {
    if (!newUpdateContent.trim()) return
    
    setPostingUpdate(true)
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "PROJECT_UPDATE",
          content: newUpdateContent,
          projectId: project.id,
          ...(newProjectStatus && { projectStatus: newProjectStatus })
        }),
      })

      if (response.ok) {
        setNewUpdateContent("")
        setNewProjectStatus(undefined)
        setShowUpdateForm(false)
        fetchProjectUpdates() // Refresh updates
        // If status was updated, refresh the entire page
        if (newProjectStatus) {
          router.refresh()
        }
      }
    } catch (error) {
      console.error("Error posting update:", error)
    }
    setPostingUpdate(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Progressive enhancement based on authentication and role
  const isAuthenticated = !!currentUser
  const isOwner = userRole === 'OWNER' || userRole === 'ADMIN'
  const hasApplied = !!userApplication
  // Allow owners to volunteer for their own projects
  const canApply = isAuthenticated && !hasApplied && project.isActive
  const isAcceptedVolunteer = userApplication?.status === 'ACCEPTED'
  const canPostUpdate = userRole && ['OWNER', 'ADMIN', 'MEMBER'].includes(userRole)

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header with Project Title and Action Button */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">{project.name}</h1>
                <p className="text-muted-foreground">
                  Posted by {project.owner?.name || project.members?.find((m: any) => m.role === 'OWNER')?.user?.name || 'Project Owner'}
                </p>
                {/* Visibility indicator for authenticated users */}
                {isAuthenticated && project.visibility !== 'PUBLIC' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mt-2">
                    {project.visibility === 'PRIVATE' ? '🔒 Private' : '📝 Draft'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {canApply && (
                  <Button 
                    size="lg" 
                    onClick={() => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    {isOwner ? 'Volunteer for Your Project' : 'Apply to Volunteer'}
                  </Button>
                )}
                {hasApplied && (
                  <span className={`text-sm px-3 py-1.5 rounded ${
                    userApplication.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    userApplication.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Application {userApplication.status.toLowerCase()}
                  </span>
                )}
                {isOwner && (
                  <Button variant="outline" asChild>
                    <Link href={`/projects/${project.id}/volunteers`}>
                      View Applications ({project.applications?.length || 0})
                    </Link>
                  </Button>
                )}
                {!isAuthenticated && (
                  <Button asChild>
                    <Link href="/auth/signin">Sign In to Apply</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex gap-2">
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      {project.helpType?.replace('_', ' ') || 'No Type'}
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

              {/* Project Updates Section - only show to authenticated users for private projects */}
              {(project.visibility === 'PUBLIC' || isAuthenticated) && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Project Updates</CardTitle>
                      {canPostUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUpdateForm(!showUpdateForm)}
                        >
                          {showUpdateForm ? "Cancel" : "Post Update"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showUpdateForm && canPostUpdate && (
                      <div className="space-y-4 mb-6 pb-6 border-b">
                        <div className="space-y-2">
                          <Label htmlFor="update">Update Content</Label>
                          <Textarea
                            id="update"
                            value={newUpdateContent}
                            onChange={(e) => setNewUpdateContent(e.target.value)}
                            placeholder="Share progress, milestones, or important news about the project..."
                            rows={4}
                          />
                        </div>
                        
                        {/* Project Status (only for project owners) */}
                        {isOwner && (
                          <div className="space-y-2">
                            <Label htmlFor="status">Update Project Status (Optional)</Label>
                            <Select value={newProjectStatus} onValueChange={setNewProjectStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder={`Current: ${formatProjectStatus(project.status).label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AWAITING_VOLUNTEERS">Awaiting Volunteers</SelectItem>
                                <SelectItem value="PLANNING">Planning</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                              Update the project status along with your update post
                            </p>
                          </div>
                        )}
                        
                        <Button 
                          onClick={handlePostUpdate} 
                          disabled={postingUpdate || !newUpdateContent.trim()}
                        >
                          {postingUpdate ? "Posting..." : "Post Update"}
                        </Button>
                      </div>
                    )}
                    
                    {projectUpdates.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No updates posted yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {projectUpdates.map((update) => (
                          <div key={update.id} className="border-b last:border-0 pb-4 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {update.author?.name || "Anonymous"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(update.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {update._count?.comments > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <MessageSquare className="h-4 w-4" />
                                  {update._count.comments}
                                </div>
                              )}
                            </div>
                            <Markdown content={update.content} className="text-sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Todo Section - only for project owners and accepted volunteers */}
              {isAuthenticated && (isOwner || isAcceptedVolunteer) && (
                <Card>
                  <CardContent className="pt-6">
                    <TodoSection 
                      projectId={project.id} 
                      canManage={isOwner || isAcceptedVolunteer}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Application Section - only for authenticated users */}
              {canApply && (
                <Card id="application-form">
                  <CardHeader>
                    <CardTitle>{isOwner ? 'Volunteer for Your Project' : 'Apply to this Project'}</CardTitle>
                    <CardDescription>
                      {project.isActive 
                        ? isOwner 
                          ? "As the project owner, you can also volunteer to contribute hands-on work"
                          : "Tell the project owner why you'd be a great fit"
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
                          placeholder={isOwner 
                            ? "Describe how you plan to contribute and what areas you'll work on..."
                            : "Explain your background, why you're interested, and how you can help..."
                          }
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleApply} disabled={applying || !applicationMessage.trim()}>
                        {applying ? "Applying..." : "Submit Application"}
                      </Button>
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
                    <span>{project.applications?.length || 0}</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}