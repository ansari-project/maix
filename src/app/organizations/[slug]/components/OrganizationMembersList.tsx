"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Trash2, Crown, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Member {
  id: string
  userId: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface OrganizationMembersListProps {
  organizationId: string
  members: Member[]
  isOwner: boolean
  currentUserId: string
}

export default function OrganizationMembersList({ 
  organizationId, 
  members, 
  isOwner,
  currentUserId 
}: OrganizationMembersListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isInviting, setIsInviting] = useState(false)
  const [userIdToInvite, setUserIdToInvite] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  async function inviteMember() {
    if (!userIdToInvite.trim()) return

    setIsInviting(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userIdToInvite }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite member')
      }

      toast({
        title: "Member invited",
        description: "The user has been added to the organization.",
      })

      setUserIdToInvite("")
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite member",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Members</h2>
        {isOwner && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogDescription>
                  Add a user to this organization by their user ID.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="Enter user ID"
                    value={userIdToInvite}
                    onChange={(e) => setUserIdToInvite(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={inviteMember}
                  disabled={isInviting || !userIdToInvite.trim()}
                >
                  Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {member.role === 'OWNER' ? (
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  )}
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
                <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                  {member.role}
                </Badge>
                {isOwner && member.role !== 'OWNER' && member.userId !== currentUserId && (
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
    </div>
  )
}