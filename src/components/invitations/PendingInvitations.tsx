"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Mail, Clock, X, RefreshCw, Copy } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
  inviter: {
    name: string | null
    email: string
  }
}

interface PendingInvitationsProps {
  entityType: 'organization' | 'product' | 'project'
  entityId: string
  invitations: Invitation[]
  canManage: boolean
}

export function PendingInvitations({ 
  entityType, 
  entityId, 
  invitations,
  canManage 
}: PendingInvitationsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING')

  if (pendingInvitations.length === 0) {
    return null
  }

  async function cancelInvitation(invitationId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    setCancellingIds(prev => new Set(prev).add(invitationId))
    try {
      const response = await fetch(`/api/${entityType}s/${entityId}/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel invitation')
      }

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel invitation",
        variant: "destructive",
      })
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev)
        next.delete(invitationId)
        return next
      })
    }
  }

  async function resendInvitation(invitationId: string) {
    setResendingIds(prev => new Set(prev).add(invitationId))
    try {
      const response = await fetch(`/api/${entityType}s/${entityId}/invitations/${invitationId}/resend`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resend invitation')
      }

      toast({
        title: "Invitation resent",
        description: "The invitation email has been resent.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend invitation",
        variant: "destructive",
      })
    } finally {
      setResendingIds(prev => {
        const next = new Set(prev)
        next.delete(invitationId)
        return next
      })
    }
  }

  async function copyInvitationLink(invitation: any) {
    try {
      // In a real implementation, you'd get the token from the server
      // For now, we'll just show a message
      toast({
        title: "Feature coming soon",
        description: "Copy invitation link will be available in the next update.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy invitation link",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Pending Invitations</h3>
      <div className="space-y-2">
        {pendingInvitations.map((invitation) => {
          const isCancelling = cancellingIds.has(invitation.id)
          const isResending = resendingIds.has(invitation.id)
          const isExpired = new Date(invitation.expiresAt) < new Date()

          return (
            <Card key={invitation.id} className={isExpired ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Invited by {invitation.inviter.name || invitation.inviter.email}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(invitation.createdAt))} ago</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {invitation.role}
                  </Badge>
                  {isExpired ? (
                    <Badge variant="destructive">
                      <Clock className="w-3 h-3 mr-1" />
                      Expired
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyInvitationLink(invitation)}
                        title="Copy invitation link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resendInvitation(invitation.id)}
                        disabled={isResending || isExpired}
                        title="Resend invitation"
                      >
                        <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelInvitation(invitation.id)}
                        disabled={isCancelling}
                        title="Cancel invitation"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}