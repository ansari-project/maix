"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TodoStatusBadge } from "./todo-status-badge"
import { Calendar, Clock, User, GripVertical } from "lucide-react"
import { TodoStatus } from "@prisma/client"
import { format } from "date-fns"

interface Task {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  startDate?: string | null
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  assignee?: {
    id: string
    name: string | null
    image: string | null
  } | null
}

interface TaskCardProps {
  task: Task
  projectName: string
}

export function TaskCard({ task, projectName }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TodoStatus.COMPLETED && task.status !== TodoStatus.DONE

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
    >
      <Card className="hover:shadow-sm transition-shadow cursor-move">
        <CardContent className="p-3">
          {/* Drag Handle */}
          <div className="flex items-start gap-2">
            <div
              {...listeners}
              className="flex-shrink-0 mt-1 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3 w-3" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Task Title */}
              <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                {task.title}
              </h4>
              
              {/* Task Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}
              
              {/* Task Metadata */}
              <div className="flex flex-col gap-1.5">
                {/* Dates */}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {task.startDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Start: {format(new Date(task.startDate), "MMM d")}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                      <Calendar className="h-3 w-3" />
                      <span>Due: {format(new Date(task.dueDate), "MMM d")}</span>
                      {isOverdue && <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">Overdue</Badge>}
                    </div>
                  )}
                </div>
                
                {/* Assignee */}
                {task.assignee && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{task.assignee.name || 'Unknown User'}</span>
                  </div>
                )}
                
                {/* Creation Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Created {format(new Date(task.createdAt), "MMM d")}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}