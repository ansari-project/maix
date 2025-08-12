"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Send, 
  Calendar, 
  User, 
  Folder, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Todo, Comment } from "../types"

interface TodoDetailsPanelEnhancedProps {
  todo: Todo | null
  onUpdate: (todo: Todo) => Promise<void>
  onCommentAdd: (todoId: string, comment: string) => Promise<void>
  onDelete?: (todoId: string) => Promise<void>
  projects?: Array<{ id: string; name: string }>
  users?: Array<{ id: string; name: string | null; email: string }>
  readonly?: boolean
}

export function TodoDetailsPanelEnhanced({ 
  todo, 
  onUpdate, 
  onCommentAdd,
  onDelete,
  projects = [],
  users = [],
  readonly = false 
}: TodoDetailsPanelEnhancedProps) {
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null)
  const [newComment, setNewComment] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const validateFields = useCallback(() => {
    const errors: Record<string, string> = {}
    
    if (!editedTodo?.title?.trim()) {
      errors.title = "Title is required"
    }
    
    if (editedTodo?.title && editedTodo.title.length > 200) {
      errors.title = "Title must be less than 200 characters"
    }
    
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [editedTodo])

  useEffect(() => {
    if (todo) {
      setEditedTodo({ ...todo })
      setValidationErrors({})
    } else {
      setEditedTodo(null)
    }
  }, [todo])

  useEffect(() => {
    // Auto-save with 2-second debounce
    if (editedTodo && todo && !readonly) {
      clearTimeout(saveTimeoutRef.current)
      
      const hasChanges = 
        editedTodo.title !== todo.title ||
        editedTodo.description !== todo.description ||
        editedTodo.status !== todo.status ||
        editedTodo.startDate !== todo.startDate ||
        editedTodo.dueDate !== todo.dueDate ||
        editedTodo.projectId !== todo.projectId ||
        editedTodo.assigneeId !== todo.assigneeId

      if (hasChanges && validateFields()) {
        setIsSaving(true)
        saveTimeoutRef.current = setTimeout(async () => {
          await onUpdate(editedTodo)
          setIsSaving(false)
        }, 2000)
      }
    }

    return () => {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [editedTodo, todo, onUpdate, readonly, validateFields])

  const handleFieldChange = (field: keyof Todo, value: any) => {
    if (!editedTodo || readonly) return
    setEditedTodo({ ...editedTodo, [field]: value })
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!todo || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      await onCommentAdd(todo.id, newComment)
      setNewComment("")
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDelete = async () => {
    if (!todo || !onDelete) return
    if (confirm("Are you sure you want to delete this todo?")) {
      await onDelete(todo.id)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "WAITING_FOR":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  // Create unified timeline with comments and activity
  const createTimeline = () => {
    if (!todo) return []
    
    const timelineEvents = []

    // Add creation event
    timelineEvents.push({
      id: 'created',
      type: 'activity',
      date: new Date(todo.createdAt),
      title: 'Todo created',
      author: 'You',
      icon: 'created'
    })

    // Add update event if different from creation
    if (todo.updatedAt && todo.updatedAt !== todo.createdAt) {
      timelineEvents.push({
        id: 'updated',
        type: 'activity', 
        date: new Date(todo.updatedAt),
        title: 'Todo updated',
        author: 'You',
        icon: 'updated'
      })
    }

    // Add comments
    if (todo.comments) {
      todo.comments.forEach(comment => {
        timelineEvents.push({
          id: comment.id,
          type: 'comment',
          date: new Date(comment.createdAt),
          title: comment.content,
          author: comment.author?.name || comment.author?.email || 'Unknown',
          icon: 'comment'
        })
      })
    }

    // Sort by date (most recent first)
    return timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <div className="w-2 h-2 rounded-full bg-blue-500"></div>
      case 'updated':
        return <div className="w-2 h-2 rounded-full bg-green-500"></div>
      case 'comment':
        return <div className="w-2 h-2 rounded-full bg-purple-500"></div>
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500"></div>
    }
  }

  if (!todo || !editedTodo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a todo to view details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(editedTodo.status)}
            <h2 className="text-lg font-semibold truncate max-w-[300px]">
              {editedTodo.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <Badge variant="secondary" className="text-xs">
                Saving...
              </Badge>
            )}
            {onDelete && !readonly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                title="Delete Todo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Created {formatDistanceToNow(new Date(todo.createdAt))} ago</span>
          {todo.updatedAt && (
            <span>• Updated {formatDistanceToNow(new Date(todo.updatedAt))} ago</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Details Section */}
          <div className="border-b border-border sticky top-0 bg-background z-10">
            <h3 className="px-6 py-3 font-medium text-sm text-muted-foreground bg-muted/30">Details</h3>
          </div>

          {/* Details Section Content */}
          <div className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={editedTodo.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                disabled={readonly}
                className={validationErrors.title ? "border-red-500" : ""}
              />
              {validationErrors.title && (
                <p className="text-xs text-red-500">{validationErrors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                value={editedTodo.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                disabled={readonly}
                rows={6}
                className={validationErrors.description ? "border-red-500" : ""}
              />
              {validationErrors.description && (
                <p className="text-xs text-red-500">{validationErrors.description}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editedTodo.status}
                onValueChange={(value) => handleFieldChange("status", value)}
                disabled={readonly}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="WAITING_FOR">Waiting For</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editedTodo.startDate ? format(new Date(editedTodo.startDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => handleFieldChange("startDate", e.target.value ? new Date(e.target.value) : null)}
                  disabled={readonly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={editedTodo.dueDate ? format(new Date(editedTodo.dueDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => handleFieldChange("dueDate", e.target.value ? new Date(e.target.value) : null)}
                  disabled={readonly}
                />
              </div>
            </div>

            {/* Project and Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">
                  <Folder className="inline h-3 w-3 mr-1" />
                  Project
                </Label>
                {projects.length > 0 ? (
                  <Select
                    value={editedTodo.projectId || "none"}
                    onValueChange={(value) => handleFieldChange("projectId", value === "none" ? null : value)}
                    disabled={readonly}
                  >
                    <SelectTrigger id="project">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {editedTodo.project?.name || "No Project"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">
                  <User className="inline h-3 w-3 mr-1" />
                  Assignee
                </Label>
                {users.length > 0 ? (
                  <Select
                    value={editedTodo.assigneeId || "none"}
                    onValueChange={(value) => handleFieldChange("assigneeId", value === "none" ? null : value)}
                    disabled={readonly}
                  >
                    <SelectTrigger id="assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {editedTodo.assignee?.name || editedTodo.assignee?.email || "Unassigned"}
                  </div>
                )}
              </div>
            </div>

            {/* Priority and Tags (future enhancement) */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Enhancement</Badge>
                <Badge variant="secondary">UI/UX</Badge>
                <Button variant="outline" size="sm" className="h-6 text-xs">
                  + Add Tag
                </Button>
              </div>
            </div>
          </div>
        </div>

          {/* Timeline Section */}
          <div className="border-b border-t border-border sticky top-0 bg-background z-10">
            <h3 className="px-6 py-3 font-medium text-sm text-muted-foreground bg-muted/30">Activity & Comments</h3>
          </div>

          {/* Timeline Content */}
          <div className="p-6">
            <div className="space-y-4">
              {createTimeline().map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="mt-2 flex-shrink-0">
                    {getTimelineIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {event.type === 'comment' ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{event.author}</span>
                          <span className="text-xs text-muted-foreground">commented</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(event.date)} ago
                          </span>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-sm break-words">{event.title}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">
                          <span className="font-medium">{event.author}</span> {event.title.toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(event.date, "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {createTimeline().length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              )}
            </div>
          </div>
        </div> {/* End of scrollable area */}

        {/* Comment Input - Fixed at bottom */}
        {!readonly && (
          <div className="border-t border-border p-4 bg-background">
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmittingComment}>
                {isSubmittingComment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}