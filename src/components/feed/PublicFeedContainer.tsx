"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FolderOpen, 
  FileText, 
  MessageCircle,
  Calendar,
  ExternalLink,
  Package
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Markdown } from "@/components/ui/markdown"

interface FeedItem {
  id: string
  type: 'project_created' | 'product_update' | 'product_created' | 'question_asked' | 'answer_posted'
  title: string
  timestamp: Date
  user: {
    id: string
    name: string
  }
  data: any
}

export function PublicFeedContainer() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeedItems()
  }, [])

  const fetchFeedItems = async () => {
    try {
      const response = await fetch("/api/public/feed")
      if (response.ok) {
        const data = await response.json()
        // Ensure we have valid items with required properties
        const validItems = (data.items || []).filter((item: any) => 
          item && item.id && item.type && item.title && item.timestamp && item.user
        )
        setFeedItems(validItems)
      }
    } catch (error) {
      console.error("Error fetching feed items:", error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (feedItems.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {feedItems.map((item) => (
        <PublicFeedItem key={item.id} item={item} />
      ))}
      <div className="text-center pt-4">
        <Button variant="outline" asChild>
          <Link href="/public/projects">Browse All Projects</Link>
        </Button>
      </div>
    </div>
  )
}

interface FeedItemProps {
  item: FeedItem
}

function PublicFeedItem({ item }: FeedItemProps) {
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
              by {item.user.name}
            </p>
            
            {/* Type-specific content */}
            {item.type === 'project_created' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.description || ''} className="prose-sm line-clamp-2" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {item.data.helpType?.replace('_', ' ')}
                  </Badge>
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/public/projects#${item.data.id}`}>
                    View Project <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'product_created' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.description || ''} className="prose-sm line-clamp-2" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.data._count?.projects || 0} projects
                  </Badge>
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/public/products/${item.data.id}`}>
                    View Product <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'product_update' && item.data && (
              <div className="mt-2">
                <div className="text-sm">
                  <Markdown content={item.data.content || ''} className="prose-sm line-clamp-2" />
                </div>
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/public/products/${item.data.productId}`}>
                    View Product <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {item.type === 'question_asked' && item.data && (
              <div className="mt-2">
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href={`/public/questions/${item.data.id}`}>
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
                  <Link href={`/public/questions/${item.data.questionId}`}>
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

function getFeedItemIcon(type: FeedItem['type']) {
  switch (type) {
    case 'project_created':
      return FolderOpen
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
    case 'product_update':
      return 'bg-purple-100 text-purple-800'
    case 'product_created':
      return 'bg-indigo-100 text-indigo-800'
    case 'question_asked':
      return 'bg-amber-100 text-amber-800'
    case 'answer_posted':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}