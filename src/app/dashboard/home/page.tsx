"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { FeedContainer } from "@/components/feed/FeedContainer"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, User, Settings, FolderOpen, CheckSquare, Calendar, MessageCircle } from "lucide-react"

export default function DashboardHomePage() {
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

  if (!session) {
    return null // Will redirect to signin
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full p-6">
        {/* Actions Panel - Left 50% */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            
            {/* Create New Section */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Create New</CardTitle>
                <CardDescription>Start something new today</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Link href="/projects/new">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </Link>
                <Link href="/q-and-a/ask">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ask Question
                  </Button>
                </Link>
                <Link href="/my-todos">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Add Todo
                  </Button>
                </Link>
                <Link href="/apps/events">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Plan Event
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Your Activities Section */}
            <Card>
              <CardHeader>
                <CardTitle>Your Activities</CardTitle>
                <CardDescription>Recent actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/my-projects" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">My Projects</p>
                          <p className="text-sm text-muted-foreground">Manage your projects</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">→</span>
                    </div>
                  </Link>
                  <Link href="/volunteering" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">My Volunteering</p>
                          <p className="text-sm text-muted-foreground">Track contributions</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">→</span>
                    </div>
                  </Link>
                  <Link href="/settings" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Settings</p>
                          <p className="text-sm text-muted-foreground">Manage your account</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">→</span>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Community Panel - Right 50% */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">Community Feed</h2>
          <FeedContainer />
        </div>
      </div>
    </DashboardLayout>
  )
}