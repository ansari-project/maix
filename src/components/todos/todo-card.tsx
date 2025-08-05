"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TodoStatusBadge } from "./todo-status-badge"
import { Markdown } from "@/components/ui/markdown"
import { Calendar, MessageSquare, User } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { TodoWithRelations } from "@/types/todo"

interface TodoCardProps {
  todo: TodoWithRelations
  onStatusChange?: (todoId: string, status: string) => void
  onAssigneeChange?: (todoId: string, assigneeId: string | null) => void
  showProject?: boolean
  className?: string
}

export function TodoCard({ 
  todo, 
  onStatusChange, 
  onAssigneeChange,
  showProject = false,
  className 
}: TodoCardProps) {
  const postCount = todo.posts?.length || 0

  return (
    <Card className={`hover:shadow-md transition-shadow ${className || ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with title and status */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg flex-1">{todo.title}</h3>
            <TodoStatusBadge status={todo.status} />
          </div>

          {/* Description */}
          {todo.description && (
            <div className="text-sm text-muted-foreground">
              <Markdown content={todo.description} />
            </div>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {/* Creator */}
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>Created by {todo.creator.name || 'Unknown'}</span>
            </div>

            {/* Assignee */}
            {todo.assignee && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>Assigned to {todo.assignee.name || 'Unknown'}</span>
              </div>
            )}

            {/* Due date */}
            {todo.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Due {format(new Date(todo.dueDate), "MMM d, yyyy")}</span>
              </div>
            )}

            {/* Attached posts */}
            {postCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{postCount} {postCount === 1 ? 'update' : 'updates'}</span>
              </div>
            )}
          </div>

          {/* Project link (if shown) */}
          {showProject && todo.project && (
            <div className="text-sm">
              <Link 
                href={`/projects/${todo.project.id}`}
                className="text-primary hover:underline"
              >
                {todo.project.name}
              </Link>
            </div>
          )}

          {/* Action buttons */}
          {(onStatusChange || onAssigneeChange) && (
            <div className="flex gap-2 pt-2">
              {onStatusChange && todo.status !== 'COMPLETED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(
                    todo.id, 
                    todo.status === 'OPEN' ? 'IN_PROGRESS' : 'COMPLETED'
                  )}
                >
                  Mark as {todo.status === 'OPEN' ? 'In Progress' : 'Completed'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}