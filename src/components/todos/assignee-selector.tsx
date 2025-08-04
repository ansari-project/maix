"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "lucide-react"

interface Participant {
  id: string
  name: string | null
  username: string | null
  role: 'OWNER' | 'VOLUNTEER'
}

interface AssigneeSelectorProps {
  projectId: string
  value?: string | null
  onChange: (userId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function AssigneeSelector({
  projectId,
  value,
  onChange,
  placeholder = "Select assignee",
  disabled = false,
  className
}: AssigneeSelectorProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchParticipants() {
      try {
        setLoading(true)
        const response = await fetch(`/api/projects/${projectId}/participants`)
        if (response.ok) {
          const data = await response.json()
          setParticipants(data.participants || [])
        }
      } catch (error) {
        console.error('Failed to fetch participants:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchParticipants()
    }
  }, [projectId])

  return (
    <Select
      value={value || "unassigned"}
      onValueChange={(val) => onChange(val === "unassigned" ? null : val)}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {participants.map((participant) => (
          <SelectItem key={participant.id} value={participant.id}>
            <div className="flex items-center gap-2">
              <span>{participant.name || participant.username || 'Unknown'}</span>
              {participant.role === 'OWNER' && (
                <span className="text-xs text-muted-foreground">(Owner)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}