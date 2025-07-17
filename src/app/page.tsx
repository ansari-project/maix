import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-accent">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-end mb-8">
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-6">
            MAIX - Muslim AI Exchange
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Connecting Muslim volunteers with AI/tech projects to advance the Ummah
          </p>
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to MAIX</CardTitle>
              <CardDescription>
                A platform that brings together skilled Muslim volunteers with meaningful 
                AI and technology projects, fostering innovation while maintaining Islamic values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-primary">For Volunteers</CardTitle>
                    <CardDescription>
                      Share your expertise in AI, Full Stack development, or Program Management
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-accent">For Projects</CardTitle>
                    <CardDescription>
                      Get help with advice, prototypes, MVPs, or complete product development
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}