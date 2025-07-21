"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, CheckCircle2, Plus, User } from "lucide-react"

interface Question {
  id: string
  content: string
  createdAt: string
  isResolved: boolean
  author: {
    id: string
    name: string
    image?: string
  }
  _count: {
    replies: number
    comments: number
  }
  bestAnswer?: {
    id: string
    content: string
    author: {
      id: string
      name: string
    }
  }
}

export default function QAndAPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchQuestions()
    }
  }, [session, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: "QUESTION" })
      const response = await fetch(`/api/posts?${params}`)
      if (response.ok) {
        const data = await response.json()
        let filtered = data || []
        
        // Apply client-side filtering
        if (filter === "my") {
          filtered = filtered.filter((q: Question) => q.author.id === session?.user?.id)
        } else if (filter === "resolved") {
          filtered = filtered.filter((q: Question) => q.isResolved)
        } else if (filter === "unanswered") {
          filtered = filtered.filter((q: Question) => q._count.replies === 0)
        }
        
        setQuestions(filtered)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
    setLoading(false)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Q&A</h1>
              <p className="text-muted-foreground">
                Ask questions and share knowledge with the Muslim tech community
              </p>
            </div>
            <Button asChild>
              <Link href="/q-and-a/new">
                <Plus className="h-4 w-4 mr-2" />
                Ask Question
              </Link>
            </Button>
          </div>

          <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Questions</TabsTrigger>
              <TabsTrigger value="my">My Questions</TabsTrigger>
              <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={filter}>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : questions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {filter === "my" && "You haven't asked any questions yet"}
                      {filter === "unanswered" && "All questions have been answered"}
                      {filter === "resolved" && "No resolved questions yet"}
                      {filter === "all" && "No questions yet. Be the first to ask!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <Card key={question.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link href={`/q-and-a/${question.id}`}>
                              <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer">
                                {question.content.length > 100 
                                  ? question.content.substring(0, 100) + "..." 
                                  : question.content}
                              </CardTitle>
                            </Link>
                            <CardDescription className="mt-2 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {question.author.name}
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {question._count.replies} {question._count.replies === 1 ? 'answer' : 'answers'}
                              </span>
                            </CardDescription>
                          </div>
                          {question.isResolved && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}