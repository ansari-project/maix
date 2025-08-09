"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255, "Project name is too long"),
  description: z.string().min(1, "Description is required"),
  personalCategory: z.string().max(100).optional(),
  targetCompletionDate: z.date().optional(),
})

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
}

export function CreateProjectDialog({ open, onOpenChange, onProjectCreated }: CreateProjectDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [personalCategory, setPersonalCategory] = useState("")
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setName("")
    setDescription("")
    setPersonalCategory("")
    setTargetCompletionDate(undefined)
    setErrors({})
  }

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        personalCategory: personalCategory.trim() || undefined,
        targetCompletionDate,
      }

      const validated = createProjectSchema.parse(data)
      setLoading(true)

      const response = await fetch('/api/projects/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validated),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.details) {
          // Handle validation errors from API
          const fieldErrors: Record<string, string> = {}
          errorData.details.forEach((error: any) => {
            if (error.path) {
              fieldErrors[error.path[0]] = error.message
            }
          })
          setErrors(fieldErrors)
        } else {
          throw new Error(errorData.error || "Failed to create project")
        }
        return
      }

      const project = await response.json()
      
      toast({
        title: "Success",
        description: "Personal project created successfully",
      })

      resetForm()
      onOpenChange(false)
      onProjectCreated()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path) {
            fieldErrors[err.path[0]] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error("Error creating project:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create project",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen)
      if (!newOpen) {
        resetForm()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Personal Project</DialogTitle>
          <DialogDescription>
            Start a new personal development or learning project. You can organize your tasks and track your progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Learn React Development"
              disabled={loading}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you want to accomplish with this project..."
              rows={4}
              disabled={loading}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              value={personalCategory}
              onChange={(e) => setPersonalCategory(e.target.value)}
              placeholder="e.g., Learning, Side Project, Hobby"
              disabled={loading}
              className={errors.personalCategory ? "border-red-500" : ""}
            />
            {errors.personalCategory && <p className="text-sm text-red-500">{errors.personalCategory}</p>}
            <p className="text-sm text-muted-foreground">
              Use categories to organize your projects (Learning, Development, Health, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Target Completion Date (Optional)</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !targetCompletionDate && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetCompletionDate ? format(targetCompletionDate, "PPP") : "Pick a target date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetCompletionDate}
                  onSelect={(date) => {
                    setTargetCompletionDate(date)
                    setCalendarOpen(false)
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              Set a target date to help track your progress and stay motivated
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}