'use client'

import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { FollowableType } from '@prisma/client'
import { useFollowing } from '@/hooks/useFollowing'
import { cn } from '@/lib/utils'
import { getEntityTypeLabel } from '@/lib/entity-utils'

interface FollowButtonProps {
  entityId: string
  entityType: FollowableType
  entityName: string
  initialFollowState?: {
    isFollowing: boolean
    notificationsEnabled: boolean
    followerCount: number
  }
  onFollowChange?: (isFollowing: boolean, notificationsEnabled: boolean) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

/**
 * FollowButton Component
 * 
 * CRITICAL: This is NOTIFICATION-ONLY functionality
 * - Following grants ZERO additional permissions
 * - Only controls notification subscriptions
 * - Clear messaging to avoid permission confusion
 */
export function FollowButton({
  entityId,
  entityType,
  entityName,
  initialFollowState,
  onFollowChange,
  variant = 'outline',
  size = 'default',
  className
}: FollowButtonProps) {
  const [showPopover, setShowPopover] = useState(false)
  
  const {
    isFollowing,
    notificationsEnabled,
    isLoading,
    error,
    follow,
    unfollow,
    toggleNotifications
  } = useFollowing({
    entityId,
    entityType,
    initialState: initialFollowState
  })

  const handleFollow = async () => {
    await follow()
    onFollowChange?.(true, true)
  }

  const handleUnfollow = async () => {
    await unfollow()
    setShowPopover(false)
    onFollowChange?.(false, false)
  }

  const handleToggleNotifications = async () => {
    await toggleNotifications()
    onFollowChange?.(isFollowing, !notificationsEnabled)
  }

  if (!isFollowing) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleFollow}
        disabled={isLoading}
        className={cn(className)}
      >
        <Bell className="h-4 w-4 mr-2" />
        Get Updates
      </Button>
    )
  }

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button
          variant={notificationsEnabled ? 'default' : 'outline'}
          size={size}
          disabled={isLoading}
          className={cn(className)}
        >
          {notificationsEnabled ? (
            <Bell className="h-4 w-4 mr-2" />
          ) : (
            <BellOff className="h-4 w-4 mr-2" />
          )}
          {notificationsEnabled ? 'Getting Updates' : 'Updates Paused'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Notification Subscription</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;re subscribed to updates from <strong>{entityName}</strong>
            </p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleNotifications}
              disabled={isLoading}
              className="justify-start"
            >
              {notificationsEnabled ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Pause Notifications
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Resume Notifications
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnfollow}
              disabled={isLoading}
              className="justify-start text-muted-foreground hover:text-foreground"
            >
              Unsubscribe from Updates
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>
              <strong>Note:</strong> This subscription only controls notifications. 
              It doesn&apos;t change your access permissions to this {getEntityTypeLabel(entityType).toLowerCase()}.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

