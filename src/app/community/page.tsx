"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Plus, Heart } from "lucide-react"

export default function CommunityPage() {
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
            <h1 className="text-3xl font-bold text-primary mb-2">Community</h1>
            <p className="text-muted-foreground">
              Connect with the Meaningful tech community and share knowledge
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Community Features Coming Soon
              </CardTitle>
              <CardDescription>
                A vibrant community space for technologists to connect, share, and grow together.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Discussion Forums</h3>
                    <p className="text-sm text-muted-foreground">
                      Share ideas and get advice from fellow developers
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Heart className="h-8 w-8 text-accent mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Success Stories</h3>
                    <p className="text-sm text-muted-foreground">
                      Celebrate completed projects and meaningful collaborations
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Plus className="h-8 w-8 text-secondary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Knowledge Sharing</h3>
                    <p className="text-sm text-muted-foreground">
                      Tutorials, resources, and best practices for meaningful tech
                    </p>
                  </div>
                </div>
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