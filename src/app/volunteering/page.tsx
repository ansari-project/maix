"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"

export default function VolunteeringPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Volunteering Coming Soon
              </CardTitle>
              <CardDescription>
                This page will show all your volunteer applications and their current status.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  We're working on the volunteer management interface.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button asChild>
                    <Link href="/projects">
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Projects
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/home">
                      Back to Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}