'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Trash2, Settings, Building, FolderOpen, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { FollowableType } from '@prisma/client'
import { followingApiPaths } from '@/lib/api-paths'
import { getEntityTypePluralLabel, formatRelativeTime } from '@/lib/entity-utils'

interface UserSubscription {
  id: string
  followableId: string
  followableType: FollowableType
  notificationsEnabled: boolean
  followedAt: string
  entity: {
    id: string
    name: string
    description?: string
    slug?: string
  }
}

/**
 * UserSubscriptions Component
 * 
 * Allows users to manage their notification subscriptions.
 * Clear messaging that this is about notifications only, not permissions.
 */
export function UserSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(followingApiPaths.userSubscriptions())
      
      if (!response.ok) {
        throw new Error('Failed to load subscriptions')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error('Failed to load subscriptions:', error)
      setError('Failed to load your subscriptions')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleNotifications = async (subscriptionId: string, enabled: boolean) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId)
      if (!subscription) return

      const response = await fetch(
        followingApiPaths.mySubscription(subscription.followableType, subscription.followableId),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notificationsEnabled: enabled
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update notification settings')
      }

      // Update local state
      setSubscriptions(subscriptions.map(sub =>
        sub.id === subscriptionId
          ? { ...sub, notificationsEnabled: enabled }
          : sub
      ))
    } catch (error) {
      console.error('Failed to toggle notifications:', error)
      // TODO: Show toast notification for error
    }
  }

  const unsubscribe = async (subscriptionId: string) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId)
      if (!subscription) return

      const response = await fetch(
        followingApiPaths.mySubscription(subscription.followableType, subscription.followableId),
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        throw new Error('Failed to unsubscribe')
      }

      // Remove from local state
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId))
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      // TODO: Show toast notification for error
    }
  }

  const groupedSubscriptions = groupSubscriptionsByType(subscriptions)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Notification Subscriptions
          </CardTitle>
          <CardDescription>
            Manage your update notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Notification Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadSubscriptions} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Notification Subscriptions
        </CardTitle>
        <CardDescription>
          Manage which updates you want to be notified about. These subscriptions only control 
          notifications and don&apos;t affect your access to organizations, projects, or products.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t subscribed to any update notifications yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Visit organizations, projects, or products and click &ldquo;Get Updates&rdquo; to start receiving notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSubscriptions).map(([type, items]) => (
              <div key={type}>
                <div className="flex items-center mb-3">
                  {getTypeIcon(type as FollowableType)}
                  <h3 className="font-semibold ml-2">
                    {getEntityTypePluralLabel(type as FollowableType)}
                  </h3>
                  <Badge variant="secondary" className="ml-2">
                    {items.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {items.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{subscription.entity.name}</h4>
                          {subscription.notificationsEnabled ? (
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
                        {subscription.entity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {subscription.entity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Subscribed {formatRelativeTime(subscription.followedAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={subscription.notificationsEnabled}
                            onCheckedChange={(checked) => 
                              toggleNotifications(subscription.id, checked)
                            }
                          />
                          <Label className="text-xs">Notifications</Label>
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unsubscribe from Updates</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to unsubscribe from updates about{' '}
                                <strong>{subscription.entity.name}</strong>? 
                                You can always subscribe again later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => unsubscribe(subscription.id)}
                              >
                                Unsubscribe
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Group subscriptions by entity type
 */
function groupSubscriptionsByType(subscriptions: UserSubscription[]) {
  return subscriptions.reduce((acc, subscription) => {
    const type = subscription.followableType
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(subscription)
    return acc
  }, {} as Record<FollowableType, UserSubscription[]>)
}


/**
 * Get icon for entity type
 */
function getTypeIcon(type: FollowableType) {
  switch (type) {
    case FollowableType.ORGANIZATION:
      return <Building className="h-4 w-4" />
    case FollowableType.PROJECT:
      return <FolderOpen className="h-4 w-4" />
    case FollowableType.PRODUCT:
      return <Package className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

