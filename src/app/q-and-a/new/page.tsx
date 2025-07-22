"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewQuestionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError("Please enter your question")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "QUESTION",
          content: content.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/q-and-a/${data.id}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to post question")
      }
    } catch (error) {
      console.error("Error posting question:", error)
      setError("An error occurred. Please try again.")
    }
    setSubmitting(false)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/q-and-a" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Q&A
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>
                Get help from the tech community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="question">Your Question</Label>
                  <Textarea
                    id="question"
                    placeholder="What would you like to know? Be specific and provide context..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="resize-none"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Write a clear, specific question. Include relevant details about your tech stack, what you&apos;ve tried, and what you&apos;re trying to achieve.
                  </p>
                </div>

                {error && (
                  <div className="text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Posting..." : "Post Question"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/q-and-a")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}