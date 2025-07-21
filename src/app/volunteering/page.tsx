"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { FileText, Plus, Calendar, User } from "lucide-react"
import { format } from "date-fns"

interface Application {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
  message: string
  appliedAt: string
  respondedAt: string | null
  project: {
    id: string
    name: string
    helpType: string
    status: string
    owner: {
      name: string | null
      email: string
    }
  }
}

export default function VolunteeringPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchApplications()
    }
  }, [session])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
      case 'ACCEPTED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Accepted</Badge>
      case 'REJECTED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>
      case 'WITHDRAWN':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Withdrawn</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">My Volunteering</h1>
            <p className="text-muted-foreground">
              Track your volunteer applications and their status
            </p>
          </div>

          {applications.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  No Applications Yet
                </CardTitle>
                <CardDescription>
                  You haven&apos;t applied to any projects yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Start by browsing available projects and applying to ones that match your skills.
                  </p>
                  <Button asChild>
                    <Link href="/projects">
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Projects
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          <Link 
                            href={`/projects/${application.project.id}`}
                            className="hover:text-primary"
                          >
                            {application.project.name}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4" />
                          {application.project.owner.name || application.project.owner.email}
                          <span className="text-xs">•</span>
                          <span className="text-xs">{application.project.helpType.replace('_', ' ')}</span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Your Application Message:</h4>
                      <p className="text-sm text-muted-foreground bg-muted rounded p-3">
                        {application.message}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Applied {format(new Date(application.appliedAt), 'MMM dd, yyyy')}
                      </span>
                      {application.respondedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Responded {format(new Date(application.respondedAt), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>

                    {application.status === 'ACCEPTED' && (
                      <div className="pt-2">
                        <Button asChild size="sm">
                          <Link href={`/projects/${application.project.id}`}>
                            View Project Details
                          </Link>
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