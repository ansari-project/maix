"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { PostCard } from "./PostCard"
import { CreatePostForm } from "./CreatePostForm"
import { CreateReplyForm } from "./CreateReplyForm"
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  FileText,
  Filter,
  RefreshCw
} from "lucide-react"

// Post type from our schema
interface Post {
  id: string
  type: 'QUESTION' | 'ANSWER' | 'PROJECT_UPDATE' | 'PRODUCT_UPDATE' | 'PROJECT_DISCUSSION' | 'PRODUCT_DISCUSSION'
  content: string
  createdAt: string
  updatedAt: string
  parentId?: string | null
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

interface Project {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
}

interface PostsFeedProps {
  initialPosts?: Post[]
  projects?: Project[]
  products?: Product[]
}

export function PostsFeed({ 
  initialPosts = [], 
  projects = [], 
  products = [] 
}: PostsFeedProps) {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)

  useEffect(() => {
    if (session && initialPosts.length === 0) {
      fetchPosts()
    }
  }, [session, initialPosts.length])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/posts")
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
    }
    setLoading(false)
  }

  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev])
    setShowCreateForm(false)
  }

  const handleReplyCreated = (newReply: Post) => {
    // Update the parent post to include the new reply
    setPosts(prev => prev.map(post => {
      if (post.id === newReply.parentId) {
        return {
          ...post,
          replies: [...(post.replies || []), newReply],
          _count: {
            ...post._count,
            replies: post._count.replies + 1
          }
        }
      }
      return post
    }))
    setReplyingTo(null)
  }

  const handleReply = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (post) {
      setReplyingTo(post)
    }
  }

  const handleMarkBestAnswer = async (questionId: string, answerId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bestAnswerId: answerId }),
      })

      if (response.ok) {
        // Refresh posts to show updated best answer
        fetchPosts()
      }
    } catch (error) {
      console.error("Error marking best answer:", error)
    }
  }

  const filteredPosts = posts.filter(post => {
    if (activeFilter === "all") return true
    if (activeFilter === "questions") return post.type === "QUESTION"
    if (activeFilter === "updates") return post.type.includes("UPDATE")
    if (activeFilter === "discussions") return post.type.includes("DISCUSSION")
    return true
  })

  // Filter out answers and only show top-level posts
  const topLevelPosts = filteredPosts.filter(post => 
    post.type !== "ANSWER" && !post.parentId
  )

  if (!session) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">Sign in to view and participate in discussions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Community Discussions</h1>
          <p className="text-muted-foreground">
            Ask questions, share updates, and engage with the MAIX community
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={fetchPosts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreatePostForm
                projects={projects}
                products={products}
                onSuccess={handlePostCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All Posts
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="updates" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Updates
          </TabsTrigger>
          <TabsTrigger value="discussions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Discussions
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="space-y-6 mt-6">
          {/* Reply Form */}
          {replyingTo && (
            <CreateReplyForm
              parentPost={replyingTo}
              currentUser={{
                id: (session.user as any)?.id || session.user?.email || 'unknown',
                name: session.user?.name || null,
                image: session.user?.image || null
              }}
              onSuccess={handleReplyCreated}
              onCancel={() => setReplyingTo(null)}
            />
          )}

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : topLevelPosts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">No posts yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Be the first to start a discussion or ask a question!
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {topLevelPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showReplies={true}
                  onReply={handleReply}
                  onMarkBestAnswer={handleMarkBestAnswer}
                  currentUserId={(session.user as any)?.id || session.user?.email}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}