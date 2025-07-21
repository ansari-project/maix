"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, CheckCircle2, MessageCircle, Star, User } from "lucide-react"

interface Post {
  id: string
  type: string
  content: string
  createdAt: string
  isResolved?: boolean
  author: {
    id: string
    name: string
    image?: string
  }
  bestAnswer?: {
    id: string
  }
  _count: {
    replies: number
    comments: number
  }
}

export default function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [question, setQuestion] = useState<Post | null>(null)
  const [answers, setAnswers] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [answerContent, setAnswerContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [questionId, setQuestionId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setQuestionId(p.id))
  }, [params])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && questionId) {
      fetchQuestionAndAnswers()
    }
  }, [session, questionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestionAndAnswers = async () => {
    setLoading(true)
    try {
      // Fetch question
      const questionResponse = await fetch(`/api/posts/${questionId}`)
      if (questionResponse.ok) {
        const questionData = await questionResponse.json()
        setQuestion(questionData.data)
      }

      // Fetch answers (replies to this question)
      const answersResponse = await fetch(`/api/posts/${questionId}/comments`)
      if (answersResponse.ok) {
        const answersData = await answersResponse.json()
        // Filter to only show ANSWER type posts
        const answerPosts = answersData.data.filter((post: Post) => post.type === "ANSWER")
        setAnswers(answerPosts)
      }
    } catch (error) {
      console.error("Error fetching question:", error)
    }
    setLoading(false)
  }

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answerContent.trim()) {
      setError("Please enter your answer")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ANSWER",
          content: answerContent.trim(),
          parentId: questionId
        })
      })

      if (response.ok) {
        setAnswerContent("")
        fetchQuestionAndAnswers() // Refresh answers
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to post answer")
      }
    } catch (error) {
      console.error("Error posting answer:", error)
      setError("An error occurred. Please try again.")
    }
    setSubmitting(false)
  }

  const handleMarkResolved = async () => {
    try {
      const response = await fetch(`/api/questions/${questionId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: true })
      })

      if (response.ok) {
        fetchQuestionAndAnswers()
      }
    } catch (error) {
      console.error("Error marking resolved:", error)
    }
  }

  const handleSelectBestAnswer = async (answerId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bestAnswerId: answerId })
      })

      if (response.ok) {
        fetchQuestionAndAnswers()
      }
    } catch (error) {
      console.error("Error selecting best answer:", error)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || !question) return null

  const isQuestionAuthor = question.author.id === session.user?.id

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/q-and-a" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Q&A
            </Link>
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-4">{question.content}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
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
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                )}
              </div>
            </CardHeader>
            {isQuestionAuthor && !question.isResolved && (
              <CardContent>
                <Button variant="outline" size="sm" onClick={handleMarkResolved}>
                  Mark as Resolved
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Answers */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
            </h2>
            
            {answers.length > 0 ? (
              <div className="space-y-4">
                {answers.map((answer) => {
                  const isBestAnswer = question.bestAnswer?.id === answer.id
                  return (
                    <Card key={answer.id} className={isBestAnswer ? "border-green-600" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardDescription className="flex items-center gap-4 mb-2">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {answer.author.name}
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                              </span>
                              {isBestAnswer && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Star className="h-3 w-3 fill-current" />
                                  Best Answer
                                </span>
                              )}
                            </CardDescription>
                            <div className="whitespace-pre-wrap">{answer.content}</div>
                          </div>
                        </div>
                      </CardHeader>
                      {isQuestionAuthor && !question.bestAnswer && (
                        <CardContent>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSelectBestAnswer(answer.id)}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Mark as Best Answer
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No answers yet. Be the first to help!</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Answer Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea
                    id="answer"
                    placeholder="Share your knowledge and help solve this question..."
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={submitting}>
                  {submitting ? "Posting..." : "Post Answer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}