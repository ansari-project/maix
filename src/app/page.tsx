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
              <Button asChild variant="outline" className="text-lg px-6 py-3">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild className="text-lg px-6 py-3">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
          <h1 className="text-6xl font-bold text-primary-foreground mb-6">
            MAIX - Meaningful AI Exchange
          </h1>
          <p className="text-2xl text-primary-foreground/90 mb-12">
            Connecting volunteers with AI projects to advance humanity
          </p>
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl mb-4">Welcome to MAIX</CardTitle>
              <CardDescription className="text-lg">
                A platform that brings together skilled volunteers with meaningful 
                AI projects, fostering innovation for the betterment of humanity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="text-center">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary mb-3">Learn</CardTitle>
                    <CardDescription className="text-lg">
                      Discover how other people build meaningful AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-muted-foreground">
                      Explore projects, methodologies, and best practices from the community
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <CardTitle className="text-2xl text-accent mb-3">Help</CardTitle>
                    <CardDescription className="text-lg">
                      Support others building meaningful AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-muted-foreground">
                      Share your skills and expertise to help meaningful projects succeed
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <CardTitle className="text-2xl text-brand-gold mb-3">Get Help</CardTitle>
                    <CardDescription className="text-lg">
                      Receive support for your meaningful AI projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-muted-foreground">
                      Connect with volunteers who can help bring your vision to life
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}