"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LeaveOrganizationButtonProps {
  organizationId: string
}

export default function LeaveOrganizationButton({ organizationId }: LeaveOrganizationButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLeaving, setIsLeaving] = useState(false)

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this organization?')) {
      return
    }

    setIsLeaving(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/leave`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to leave organization')
      }

      toast({
        title: "Left organization",
        description: "You have successfully left the organization.",
      })

      router.push('/organizations')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to leave organization",
        variant: "destructive",
      })
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleLeave}
      disabled={isLeaving}
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isLeaving ? 'Leaving...' : 'Leave Organization'}
    </Button>
  )
}