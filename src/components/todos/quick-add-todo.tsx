"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, ChevronDown, ChevronRight, Plus } from "lucide-react"
import { TodoStatus } from "@prisma/client"

interface Project {
  id: string
  name: string
}

interface QuickAddTodoProps {
  projectId?: string
  projects?: Project[]
  onSubmit: (data: {
    title: string
    projectId?: string
    status: TodoStatus
    dueDate?: Date
    startDate?: Date
  }) => Promise<void>
  className?: string
}

export function QuickAddTodo({ 
  projectId, 
  projects = [], 
  onSubmit,
  className 
}: QuickAddTodoProps) {
  const [title, setTitle] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedProject, setSelectedProject] = useState(projectId || "uncategorized")
  const [selectedStatus, setSelectedStatus] = useState<TodoStatus>("NOT_STARTED")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Show button when focused, hovered, or has content
  const showButton = isFocused || isHovered || title.length > 0

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!title.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      await onSubmit({
        title: title.trim(),
        projectId: selectedProject !== "uncategorized" ? selectedProject : projectId,
        status: selectedStatus,
        startDate: isExpanded ? startDate : new Date(),
        dueDate: isExpanded ? dueDate : undefined
      })

      // Reset form on success
      setTitle("")
      setIsExpanded(false)
      setSelectedStatus("NOT_STARTED")
      setStartDate(new Date())
      setDueDate(undefined)
      inputRef.current?.focus()
    } catch (err: any) {
      setError(err.message || "Failed to create todo")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === "Tab" && !isExpanded) {
      e.preventDefault()
      setIsExpanded(true)
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "A") {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div 
      ref={formRef}
      className={cn("space-y-2", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main input row */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Add a new todo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              className="flex-1"
              aria-describedby={error ? "quick-add-error" : undefined}
            />
            
            {/* Expand/Collapse button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={isLoading}
              className="shrink-0"
              aria-label={isExpanded ? "Collapse options" : "Expand options"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {/* Add button */}
            {showButton && (
              <Button
                onClick={() => handleSubmit()}
                disabled={isLoading || !title.trim()}
                size="sm"
                className="shrink-0"
              >
                {isLoading ? "Adding..." : <><Plus className="h-4 w-4 mr-1" /> Add</>}
              </Button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p id="quick-add-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Expanded fields */}
      {isExpanded && (
        <div className="pl-2 space-y-3 pt-2 border-l-2 border-muted ml-2">
          {/* Project selection */}
          {projects.length > 0 && (
            <div className="flex gap-2 items-center">
              <label className="text-sm text-muted-foreground w-20">Project:</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status selection */}
          <div className="flex gap-2 items-center">
            <label className="text-sm text-muted-foreground w-20">Status:</label>
            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as TodoStatus)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING_FOR">Waiting For</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date selection */}
          <div className="space-y-2">
            {/* Start date */}
            <div className="flex gap-2 items-center">
              <label className="text-sm text-muted-foreground w-20">Start:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due date */}
            <div className="flex gap-2 items-center">
              <label className="text-sm text-muted-foreground w-20">Due:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date (optional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-muted-foreground">
            Press Enter to add • Tab to expand • Cmd+Shift+A to toggle options
          </div>
        </div>
      )}
    </div>
  )
}