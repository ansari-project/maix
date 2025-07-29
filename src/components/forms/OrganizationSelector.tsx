"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Building2, User } from "lucide-react"

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationSelectorProps {
  value?: string
  onChange: (value: string | undefined) => void
  label?: string
  description?: string
}

export default function OrganizationSelector({
  value,
  onChange,
  label = "Create under",
  description = "Choose to create this as a personal resource or under an organization"
}: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/organizations')
        if (response.ok) {
          const data = await response.json()
          setOrganizations(data)
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || "personal"}
        onValueChange={(val) => onChange(val === "personal" ? undefined : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              Personal
            </div>
          </SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                {org.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}