"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FolderOpen, 
  FileText, 
  User, 
  Calendar,
  Package,
  MessageCircle,
  ExternalLink
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Markdown } from "@/components/ui/markdown"

function formatProjectStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'AWAITING_VOLUNTEERS':
      return { label: 'Awaiting Volunteers', color: 'bg-blue-100 text-blue-800' }
    case 'PLANNING':
      return { label: 'Planning', color: 'bg-purple-100 text-purple-800' }
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-green-100 text-green-800' }
    case 'ON_HOLD':
      return { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' }
    case 'COMPLETED':
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800' }
  }
}

interface FeedItem {
  id: string
  type: 'project_created' | 'profile_updated' | 'product_update' | 'product_created' | 'question_asked' | 'answer_posted'
  title: string
  timestamp: Date
  user: {
    id: string
    name: string | null
  }
  data: any
}

interface FeedContainerProps {
  initialItems?: FeedItem[]
  isPublic?: boolean
  showHeader?: boolean
}

export function FeedContainer({ initialItems = [], isPublic = false, showHeader = true }: FeedContainerProps) {
  const { data: session } = useSession()
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialItems)
  const [loading, setLoading] = useState(true)

  const fetchFeedItems = useCallback(async () => {
    try {
      const endpoint = isPublic ? "/api/public/feed" : "/api/feed"
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setFeedItems(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching feed items:", error)
    }
    setLoading(false)
  }, [isPublic])

  useEffect(() => {
    if (isPublic || session) {
      fetchFeedItems()
    }
  }, [session, isPublic, fetchFeedItems])

  // Show all items directly without filtering tabs
  const filteredItems = feedItems

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary">Activity Feed</h1>
            <p className="text-muted-foreground">
              Stay up to date with the latest activities in the Maix community
            </p>
          </div>
          <Button variant="outline" onClick={fetchFeedItems}>
            Refresh Feed
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No activities yet</p>
              {!isPublic && (
                <p className="text-sm text-muted-foreground">
                  Start by creating a project or updating your profile to see activity here.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <FeedItem key={item.id} item={item} isPublic={isPublic} />
          ))
        )}
      </div>
    </div>
  )
}

interface FeedItemProps {
  item: FeedItem
  isPublic?: boolean
}

function FeedItem({ item, isPublic = false }: FeedItemProps) {
  const Icon = getFeedItemIcon(item.type)
  const colorClass = getFeedItemColor(item.type)

  const isCompletedProject = item.type === 'project_created' && item.data?.status === 'COMPLETED'
  
  return (
    <Card className={`hover:shadow-md transition-shadow ${isCompletedProject ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {/* Make title clickable for items with links */}
                {(item.type === 'project_created' && item.data?.id) ? (
                  <Link href={`/projects/${item.data.id}`} className="hover:text-primary">
                    {item.data.status === 'COMPLETED' ? `🎉 ${item.title} 🎉` : item.title}
                  </Link>
                ) : (item.type === 'product_created' && item.data?.id) ? (
                  <Link href={`/products/${item.data.id}`} className="hover:text-primary">
                    {item.title}
                  </Link>
                ) : (item.type === 'product_update' && item.data?.productId) ? (
                  <Link href={`/products/${item.data.productId}`} className="hover:text-primary">
                    {item.title}
                  </Link>
                ) : (item.type === 'question_asked' && item.data?.id) ? (
                  <Link href={`/q-and-a/${item.data.id}`} className="hover:text-primary">
                    {item.title}
                  </Link>
                ) : (item.type === 'answer_posted' && (item.data?.parent?.id || item.data?.questionId || item.data?.parentId)) ? (
                  <Link href={`/q-and-a/${item.data.parent?.id || item.data.questionId || item.data.parentId}`} className="hover:text-primary">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h3>
              <span className="text-xs text-muted-foreground">
                {format(new Date(item.timestamp), 'MMM dd, yyyy')}
              </span>
            </div>
            
            {/* Type-specific content */}
            {item.type === 'project_created' && item.data && (
              <div className="mt-2">
                {/* Special celebration display for completed projects */}
                {item.data.status === 'COMPLETED' && (
                  <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎉</span>
                      <span className="font-semibold text-green-800">Project Completed!</span>
                      <span className="text-2xl">🎊</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Congratulations to the team for successfully delivering this project! 🚀
                    </p>
                  </div>
                )}
                <div className="text-sm">
                  <Markdown content={item.data.description || ''} className="prose-sm line-clamp-4" />
                </div>
                <div className="flex gap-2 mt-2">
                  {item.data.status && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${formatProjectStatus(item.data.status).color}`}
                    >
                      {formatProjectStatus(item.data.status).label}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {item.data.helpType?.replace('_', ' ')}
                  </Badge>
                  {item.data.isActive === false && (
                    <Badge variant="destructive" className="text-xs">
                      Not Recruiting
                    </Badge>
                  )}
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={isPublic ? `/public/projects#${item.data.id}` : `/projects/${item.data.id}`}>
                    View Project <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}


            {item.type === 'product_update' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm line-clamp-4" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={isPublic ? `/public/products/${item.data.productId}` : `/products/${item.data.productId}`}>
                    View Product <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'product_created' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.description || ''} className="prose-sm line-clamp-4" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.data._count?.projects || 0} projects
                  </Badge>
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={isPublic ? `/public/products/${item.data.id}` : `/products/${item.data.id}`}>
                    View Product <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'question_asked' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm line-clamp-4" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={isPublic ? `/public/questions/${item.data.id}` : `/q-and-a/${item.data.id}`}>
                    View Question <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'answer_posted' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm line-clamp-4" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={isPublic ? `/public/questions/${item.data.parent?.id || item.data.questionId || item.data.parentId}` : `/q-and-a/${item.data.parent?.id || item.data.questionId || item.data.parentId}`}>
                    View Discussion <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper functions (move to separate file later)
function getFeedItemIcon(type: FeedItem['type']) {
  switch (type) {
    case 'project_created':
      return FolderOpen
    case 'profile_updated':
      return User
    case 'product_update':
    case 'product_created':
      return Package
    case 'question_asked':
    case 'answer_posted':
      return MessageCircle
    default:
      return Calendar
  }
}

function getFeedItemColor(type: FeedItem['type']) {
  switch (type) {
    case 'project_created':
      return 'bg-blue-100 text-blue-800'
    case 'profile_updated':
      return 'bg-orange-100 text-orange-800'
    case 'product_update':
      return 'bg-purple-100 text-purple-800'
    case 'product_created':
      return 'bg-indigo-100 text-indigo-800'
    case 'question_asked':
      return 'bg-amber-100 text-amber-800'
    case 'answer_posted':
      return 'bg-teal-100 text-teal-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}