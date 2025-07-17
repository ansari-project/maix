"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@/components/auth/sign-in-button"
import Link from "next/link"

export default function Dashboard() {
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
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary-foreground">
              Welcome to MAIX Dashboard
            </h1>
            <p className="text-primary-foreground/80">
              Hello, {session.user?.name || session.user?.email}!
            </p>
          </div>
          <SignInButton />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">My Profile</CardTitle>
              <CardDescription>
                Complete your volunteer profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Set your specialty, experience level, and skills to get matched with projects.
              </p>
              <Button className="w-full" asChild>
                <Link href="/profile">Complete Profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-accent">Browse Projects</CardTitle>
              <CardDescription>
                Find AI/tech projects to contribute to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Discover projects that match your skills and interests.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/projects">Browse Projects</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-brand-gold">Post a Project</CardTitle>
              <CardDescription>
                Share your project with the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Need help with your AI/tech project? Post it here.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/projects/new">Post Project</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
              <CardDescription>
                Track your project applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View the status of your applications to projects.
              </p>
              <Button variant="outline" className="w-full">View Applications</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Communicate with project owners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Chat with project owners and other volunteers.
              </p>
              <Button variant="outline" className="w-full">Open Messages</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Community</CardTitle>
              <CardDescription>
                Connect with the Muslim tech community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Join discussions and share knowledge.
              </p>
              <Button variant="outline" className="w-full">Join Community</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}