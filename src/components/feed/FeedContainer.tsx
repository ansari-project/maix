"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FolderOpen, 
  FileText, 
  User, 
  Calendar,
  ExternalLink,
  Package,
  MessageCircle
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
  type: 'project_created' | 'volunteer_applied' | 'profile_updated' | 'product_update' | 'product_created' | 'question_asked' | 'answer_posted'
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
}

export function FeedContainer({ initialItems = [] }: FeedContainerProps) {
  const { data: session } = useSession()
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialItems)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchFeedItems()
    }
  }, [session])

  const fetchFeedItems = async () => {
    try {
      const response = await fetch("/api/feed")
      if (response.ok) {
        const data = await response.json()
        setFeedItems(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching feed items:", error)
    }
    setLoading(false)
  }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Activity Feed</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest activities in the MAIX community
          </p>
        </div>
        <Button variant="outline" onClick={fetchFeedItems}>
          Refresh Feed
        </Button>
      </div>

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No activities yet</p>
              <p className="text-sm text-muted-foreground">
                Start by creating a project or updating your profile to see activity here.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <FeedItem key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  )
}

interface FeedItemProps {
  item: FeedItem
}

function FeedItem({ item }: FeedItemProps) {
  const Icon = getFeedItemIcon(item.type)
  const colorClass = getFeedItemColor(item.type)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <span className="text-xs text-muted-foreground">
                {format(new Date(item.timestamp), 'MMM dd, yyyy')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              by {item.user.name || 'Unknown User'}
            </p>
            
            {/* Type-specific content */}
            {item.type === 'project_created' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.description || ''} className="prose-sm" />
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
                  <Link href={`/projects/${item.data.id}`}>
                    View Project <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'volunteer_applied' && item.data && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Volunteered for: {item.data.project?.name}
                </p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {item.data.status}
                </Badge>
              </div>
            )}

            {item.type === 'product_update' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/products/${item.data.productId}`}>
                    View Product <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'product_created' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.description || ''} className="prose-sm" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.data._count?.projects || 0} projects
                  </Badge>
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/products/${item.data.id}`}>
                    View Product <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'question_asked' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm line-clamp-3" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/q-and-a/${item.data.id}`}>
                    View Question <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'answer_posted' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm line-clamp-2" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/q-and-a/${item.data.parent?.id || item.data.questionId || item.data.parentId}`}>
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
    case 'volunteer_applied':
      return FileText
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
    case 'volunteer_applied':
      return 'bg-green-100 text-green-800'
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