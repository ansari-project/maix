"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Todo, Comment } from "../types"

interface TodoDetailsPanelProps {
  todo: Todo | null
  onUpdate: (todo: Todo) => Promise<void>
  onCommentAdd: (todoId: string, comment: string) => Promise<void>
  readonly?: boolean
}

export function TodoDetailsPanel({ todo, onUpdate, onCommentAdd, readonly = false }: TodoDetailsPanelProps) {
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null)
  const [newComment, setNewComment] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (todo) {
      setEditedTodo({ ...todo })
    } else {
      setEditedTodo(null)
    }
  }, [todo])

  useEffect(() => {
    // Auto-save with 3-second debounce
    if (editedTodo && todo && !readonly) {
      clearTimeout(saveTimeoutRef.current)
      
      const hasChanges = 
        editedTodo.title !== todo.title ||
        editedTodo.description !== todo.description ||
        editedTodo.status !== todo.status ||
        editedTodo.dueDate !== todo.dueDate

      if (hasChanges) {
        setIsSaving(true)
        saveTimeoutRef.current = setTimeout(async () => {
          await onUpdate(editedTodo)
          setIsSaving(false)
        }, 3000)
      }
    }

    return () => {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [editedTodo, todo, onUpdate, readonly])

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

  if (!todo || !editedTodo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Click on a todo to see the details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Todo Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Todo Details</span>
                {isSaving && (
                  <span className="text-sm font-normal text-muted-foreground">Saving...</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editedTodo.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  disabled={readonly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedTodo.description || ""}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  disabled={readonly}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={editedTodo.dueDate ? format(new Date(editedTodo.dueDate), "yyyy-MM-dd") : ""}
                    onChange={(e) => handleFieldChange("dueDate", e.target.value ? new Date(e.target.value) : null)}
                    disabled={readonly}
                  />
                </div>
              </div>

              {editedTodo.project && (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <div className="p-2 bg-muted rounded-md">
                    {editedTodo.project.name}
                  </div>
                </div>
              )}

              {editedTodo.assignee && (
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <div className="p-2 bg-muted rounded-md">
                    {editedTodo.assignee.name || editedTodo.assignee.email}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment List */}
              {todo.comments && todo.comments.length > 0 ? (
                <div className="space-y-3">
                  {todo.comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-border pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comment.author?.name || comment.author?.email || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              )}

              {/* Add Comment Form */}
              {!readonly && (
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}