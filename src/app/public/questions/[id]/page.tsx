"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Calendar, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { Markdown } from "@/components/ui/markdown"

interface Answer {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
  }
  _count: {
    comments: number
  }
}

interface Question {
  id: string
  content: string
  createdAt: string
  isResolved: boolean
  bestAnswerId: string | null
  author: {
    id: string
    name: string | null
  }
  answers: Answer[]
  _count: {
    comments: number
    replies?: number
  }
}

export default function PublicQuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchQuestion = async (id: string) => {
    try {
      const response = await fetch(`/api/public/questions/${id}`)
      if (response.ok) {
        const data = await response.json()
        setQuestion(data)
      } else if (response.status === 404) {
        router.push("/public/questions")
      }
    } catch (error) {
      console.error("Error fetching question:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchQuestion(params.id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
            <div className="border rounded-lg p-6 space-y-4">
              <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{question.author.name || 'Anonymous'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(question.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                </span>
                {question.isResolved && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Resolved
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Markdown content={question.content} />
            
            <div className="flex items-center justify-between pt-4 border-t">
              <Badge variant="secondary">
                {question.answers.length} answer{question.answers.length === 1 ? '' : 's'}
              </Badge>
              <Button asChild>
                <Link href="/auth/signin">Sign In to Answer</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Answers */}
        {question.answers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Answers
            </h2>
            
            {question.answers.map((answer) => (
              <Card 
                key={answer.id} 
                className={answer.id === question.bestAnswerId ? 'ring-2 ring-green-500' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardDescription className="flex items-center gap-2">
                      <span>{answer.author.name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{format(new Date(answer.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                    </CardDescription>
                    {answer.id === question.bestAnswerId && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Best Answer
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Markdown content={answer.content} />
                  
                  {answer._count.comments > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {answer._count.comments} comment{answer._count.comments === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <Card className="mt-6">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Have an answer?</h3>
            <p className="text-muted-foreground mb-4">
              Join Maix to share your knowledge and help the community
            </p>
            <Button asChild>
              <Link href="/auth/signup">Join Maix</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}