"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  User,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Markdown } from "@/components/ui/markdown"

// Post type from our schema
interface Post {
  id: string
  type: 'QUESTION' | 'ANSWER' | 'PROJECT_UPDATE' | 'PRODUCT_UPDATE' | 'PROJECT_DISCUSSION' | 'PRODUCT_DISCUSSION'
  content: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  project?: {
    id: string
    name: string
  } | null
  product?: {
    id: string
    name: string
  } | null
  bestAnswer?: {
    id: string
    content: string
    author: {
      id: string
      name: string | null
      image: string | null
    }
  } | null
  replies?: Post[]
  _count: {
    replies: number
    comments: number
  }
}

interface PostCardProps {
  post: Post
  showReplies?: boolean
  isReply?: boolean
  onReply?: (postId: string) => void
  onMarkBestAnswer?: (postId: string, answerId: string) => void
  currentUserId?: string
}

export function PostCard({ 
  post, 
  showReplies = true, 
  isReply = false,
  onReply,
  onMarkBestAnswer,
  currentUserId 
}: PostCardProps) {
  const [showAllReplies, setShowAllReplies] = useState(false)

  const getPostTypeInfo = (type: Post['type']) => {
    switch (type) {
      case 'QUESTION':
        return { 
          label: 'Question', 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: MessageSquare 
        }
      case 'ANSWER':
        return { 
          label: 'Answer', 
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle 
        }
      case 'PROJECT_UPDATE':
        return { 
          label: 'Project Update', 
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Clock 
        }
      case 'PRODUCT_UPDATE':
        return { 
          label: 'Product Update', 
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: Clock 
        }
      case 'PROJECT_DISCUSSION':
        return { 
          label: 'Project Discussion', 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: MessageSquare 
        }
      case 'PRODUCT_DISCUSSION':
        return { 
          label: 'Product Discussion', 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: MessageSquare 
        }
      default:
        return { 
          label: 'Post', 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: MessageSquare 
        }
    }
  }

  const typeInfo = getPostTypeInfo(post.type)
  const Icon = typeInfo.icon
  const isQuestion = post.type === 'QUESTION'
  const isAnswer = post.type === 'ANSWER'
  const canMarkBestAnswer = isQuestion && currentUserId === post.author.id
  const displayedReplies = showAllReplies ? post.replies : post.replies?.slice(0, 3)

  return (
    <div className={`space-y-4 ${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {post.author.name || 'Anonymous User'}
                  </span>
                  <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {typeInfo.label}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{format(new Date(post.createdAt), 'MMM dd, yyyy')}</span>
                  {post.project && (
                    <>
                      <span>•</span>
                      <Link 
                        href={`/projects/${post.project.id}`}
                        className="hover:text-primary"
                      >
                        {post.project.name}
                      </Link>
                    </>
                  )}
                  {post.product && (
                    <>
                      <span>•</span>
                      <Link 
                        href={`/products/${post.product.id}`}
                        className="hover:text-primary"
                      >
                        {post.product.name}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Post Content */}
          <div className="prose prose-sm max-w-none">
            <div>
              <Markdown content={post.content} />
            </div>
          </div>

          {/* Best Answer Preview for Questions */}
          {isQuestion && post.bestAnswer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Best Answer</span>
                <span className="text-xs text-green-600">
                  by {post.bestAnswer.author.name}
                </span>
              </div>
              <div className="text-sm text-green-700">
                <Markdown content={post.bestAnswer.content} className="prose-sm" />
              </div>
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              {/* Reply Count */}
              {(post._count.replies > 0 || isQuestion) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    {post._count.replies} {isQuestion ? 'answers' : 'replies'}
                  </span>
                </div>
              )}

              {/* Comment Count */}
              {post._count.comments > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>{post._count.comments} comments</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Reply Button */}
              {onReply && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onReply(post.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {isQuestion ? 'Answer' : 'Reply'}
                </Button>
              )}

              {/* View Full Post Button */}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/posts/${post.id}`}>
                  View Full
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies/Answers */}
      {showReplies && post.replies && post.replies.length > 0 && (
        <div className="space-y-4">
          {displayedReplies?.map((reply) => (
            <div key={reply.id} className="relative">
              <PostCard 
                post={reply}
                showReplies={false}
                isReply={true}
                currentUserId={currentUserId}
                onMarkBestAnswer={onMarkBestAnswer}
              />
              
              {/* Mark as Best Answer button for question authors */}
              {canMarkBestAnswer && reply.type === 'ANSWER' && !post.bestAnswer && (
                <div className="absolute top-2 right-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => onMarkBestAnswer?.(post.id, reply.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Best Answer
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Show More Replies */}
          {post.replies.length > 3 && !showAllReplies && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAllReplies(true)}
              className="ml-8"
            >
              Show {post.replies.length - 3} more {isQuestion ? 'answers' : 'replies'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}