"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, ChevronDown, ChevronRight, Plus, Loader2, Check } from "lucide-react"
import { TodoStatus } from "@prisma/client"

interface Project {
  id: string
  name: string
}

interface QuickAddTodoProps {
  projectId?: string
  projects?: Project[]
  initialStatus?: TodoStatus
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
  initialStatus,
  onSubmit,
  className 
}: QuickAddTodoProps) {
  const [title, setTitle] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedProject, setSelectedProject] = useState(projectId || "uncategorized")
  const [selectedStatus, setSelectedStatus] = useState<TodoStatus>(initialStatus || "NOT_STARTED")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Show button when focused, hovered, or has content
  const showButton = isFocused || isHovered || title.length > 0

  // Auto-hide success message after 2 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
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

      // Show success feedback
      setShowSuccess(true)
      
      // Reset form on success
      setTitle("")
      setIsExpanded(false)
      setSelectedStatus("NOT_STARTED")
      setStartDate(new Date())
      setDueDate(undefined)
      setError(null)
      
      // Refocus input for continuous entry
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err: any) {
      setError(err.message || "Failed to create todo")
    } finally {
      setIsLoading(false)
    }
  }, [title, selectedProject, projectId, selectedStatus, startDate, dueDate, isExpanded, onSubmit])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === "Tab" && !isExpanded && title.trim()) {
      e.preventDefault()
      setIsExpanded(true)
    } else if (e.key === "Escape") {
      e.preventDefault()
      if (isExpanded) {
        setIsExpanded(false)
      } else if (title) {
        setTitle("")
      }
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "A") {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }, [isExpanded, title, handleSubmit])

  return (
    <div 
      ref={formRef}
      className={cn(
        "space-y-2 transition-all duration-200",
        showSuccess && "animate-pulse",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Success feedback */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-600 animate-in fade-in slide-in-from-top-1 duration-200">
          <Check className="h-4 w-4" />
          <span>Todo added successfully!</span>
        </div>
      )}
      
      {/* Main input row */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
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
                className={cn(
                  "flex-1 transition-all duration-200",
                  isFocused && "ring-2 ring-primary/20"
                )}
                aria-describedby={error ? "quick-add-error" : undefined}
                aria-label="Todo title"
              />
              {isLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Expand/Collapse button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={isLoading}
              className={cn(
                "shrink-0 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
              aria-label={isExpanded ? "Collapse options" : "Expand options"}
              title={isExpanded ? "Collapse options (Esc)" : "Expand options (Tab)"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Add button */}
            {showButton && (
              <Button
                onClick={() => handleSubmit()}
                disabled={isLoading || !title.trim()}
                size="sm"
                className={cn(
                  "shrink-0 transition-all duration-200",
                  !showButton && "opacity-0 scale-95"
                )}
                title="Add todo (Enter)"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p 
              id="quick-add-error" 
              role="alert" 
              className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Expanded fields */}
      {isExpanded && (
        <div className="pl-2 space-y-3 pt-2 border-l-2 border-muted ml-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Project selection */}
          {projects.length > 0 && (
            <div className="flex gap-2 items-center">
              <label className="text-sm text-muted-foreground w-20">Project:</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1" aria-label="Project">
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
              <SelectTrigger className="flex-1" aria-label="Status">
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
          <div className="text-xs text-muted-foreground space-x-3">
            <span>Enter: Add</span>
            <span>•</span>
            <span>Tab: Expand</span>
            <span>•</span>
            <span>Esc: Close</span>
            <span>•</span>
            <span>Cmd+Shift+A: Toggle</span>
          </div>
        </div>
      )}
    </div>
  )
}