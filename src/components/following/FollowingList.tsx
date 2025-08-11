'use client'

import { useState, useEffect } from 'react'
import { Users, Bell, BellOff, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FollowableType } from '@prisma/client'
import { followingApiPaths } from '@/lib/api-paths'
import { getEntityTypeLabel, getInitials, formatRelativeTime } from '@/lib/entity-utils'

interface Follower {
  id: string
  userId: string
  notificationsEnabled: boolean
  followedAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface FollowingListProps {
  entityId: string
  entityType: FollowableType
  followerCount: number
}

/**
 * FollowingList Component
 * 
 * Shows who is subscribed to notifications for an entity.
 * CRITICAL: This is about notification subscriptions only - no permissions implied.
 */
export function FollowingList({
  entityId,
  entityType,
  followerCount
}: FollowingListProps) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const loadFollowers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(followingApiPaths.followers(entityType, entityId))
      
      if (!response.ok) {
        throw new Error('Failed to load followers')
      }

      const data = await response.json()
      setFollowers(data.followers || [])
    } catch (error) {
      console.error('Failed to load followers:', error)
      setError('Failed to load subscribers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && followers.length === 0) {
      loadFollowers()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Users className="h-4 w-4 mr-1" />
          {followerCount} {followerCount === 1 ? 'subscriber' : 'subscribers'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Subscribers</DialogTitle>
          <DialogDescription>
            People who receive notifications when this {getEntityTypeLabel(entityType).toLowerCase()} is updated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFollowers}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !error && followers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                No subscribers yet
              </p>
            </div>
          )}

          {!isLoading && !error && followers.length > 0 && (
            <div className="space-y-2">
              {followers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                      {getInitials(follower.user.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{follower.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Subscribed {formatRelativeTime(follower.followedAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {follower.notificationsEnabled ? (
                      <Badge variant="secondary" className="text-xs">
                        <Bell className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <BellOff className="h-3 w-3 mr-1" />
                        Paused
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> These subscriptions only control notifications. 
            They don&apos;t affect access permissions to this {getEntityTypeLabel(entityType).toLowerCase()}.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}


