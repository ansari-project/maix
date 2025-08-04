"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Crown, User, Shield } from "lucide-react"
import { InviteDialog } from "@/components/invitations/InviteDialog"
import { PendingInvitations } from "@/components/invitations/PendingInvitations"

interface Member {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

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

interface OrganizationMembersWithInvitesProps {
  organizationId: string
  organizationName: string
  members: Member[]
  isOwner: boolean
  isAdmin: boolean
  currentUserId: string
}

export default function OrganizationMembersWithInvites({ 
  organizationId,
  organizationName,
  members, 
  isOwner,
  isAdmin,
  currentUserId 
}: OrganizationMembersWithInvitesProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)

  const canManageMembers = isOwner || isAdmin

  const loadInvitations = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`)
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoadingInvitations(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (canManageMembers) {
      loadInvitations()
    }
  }, [canManageMembers, loadInvitations])

  async function removeMember(userId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove member')
      }

      toast({
        title: "Member removed",
        description: "The member has been removed from the organization.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove member",
        variant: "destructive",
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="w-5 h-5 text-primary" />
      case 'ADMIN':
        return <Shield className="w-5 h-5 text-blue-600" />
      default:
        return <User className="w-5 h-5" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default'
      case 'ADMIN':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Members</h2>
        {canManageMembers && (
          <InviteDialog 
            entityType="organization" 
            entityId={organizationId}
            entityName={organizationName}
          />
        )}
      </div>

      {/* Active Members */}
      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    member.role === 'OWNER' ? 'bg-primary/10' : 
                    member.role === 'ADMIN' ? 'bg-blue-100' : 
                    'bg-secondary'
                  }`}>
                    {getRoleIcon(member.role)}
                  </div>
                </div>
                <div>
                  <p className="font-medium">
                    {member.user.name || member.user.email}
                    {member.userId === currentUserId && (
                      <span className="text-muted-foreground ml-2">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {member.role}
                </Badge>
                {canManageMembers && member.role !== 'OWNER' && member.userId !== currentUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMember(member.userId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Invitations */}
      {canManageMembers && !loadingInvitations && (
        <PendingInvitations
          entityType="organization"
          entityId={organizationId}
          invitations={invitations}
          canManage={canManageMembers}
        />
      )}
    </div>
  )
}