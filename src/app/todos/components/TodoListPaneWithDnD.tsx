"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Circle, Clock, Pause, ChevronDown, ChevronRight, GripVertical } from "lucide-react"
import { QuickAddTodo } from "@/components/todos/quick-add-todo"
import { format } from "date-fns"
import { TodoStatus } from "@prisma/client"
import { useRouter } from "next/navigation"
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Todo } from "../types"
import { useGroupedTodos, GroupBy } from "../hooks/useGroupedTodos"
import { useDragAndDrop } from "../hooks/useDragAndDrop"
import { DroppableGroup } from "./DroppableGroup"

interface TodoListPaneWithDnDProps {
  todos: Todo[]
  selectedTodo: Todo | null
  onTodoSelect: (todo: Todo) => void
  onTodoUpdate: (todo: Todo) => Promise<void>
}

interface SortableTodoItemProps {
  todo: Todo
  isSelected: boolean
  onSelect: () => void
  getStatusIcon: (status: string) => JSX.Element
  getStatusColor: (status: string) => string
  formatStatus: (status: string) => string
  groupBy: GroupBy
}

function SortableTodoItem({ 
  todo, 
  isSelected, 
  onSelect, 
  getStatusIcon, 
  getStatusColor, 
  formatStatus,
  groupBy 
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
          isSelected ? "bg-accent" : ""
        } ${isDragging ? "shadow-lg" : ""}`}
        onClick={onSelect}
      >
        <div className="flex items-start gap-3">
          <div 
            className="mt-1 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-1">
            {getStatusIcon(todo.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{todo.title}</h3>
            {todo.description && (
              <p className="text-sm text-muted-foreground truncate">
                {todo.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {groupBy !== 'status' && (
                <Badge variant="secondary" className={`text-xs ${getStatusColor(todo.status)}`}>
                  {formatStatus(todo.status)}
                </Badge>
              )}
              {groupBy !== 'project' && todo.project && (
                <Badge variant="outline" className="text-xs">
                  {todo.project.name}
                </Badge>
              )}
              {groupBy !== 'dueDate' && todo.dueDate && (
                <span className="text-xs text-muted-foreground">
                  Due {format(new Date(todo.dueDate), "MMM d")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function TodoListPaneWithDnD({ 
  todos, 
  selectedTodo, 
  onTodoSelect,
  onTodoUpdate 
}: TodoListPaneWithDnDProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const groupedTodos = useGroupedTodos(todos, groupBy)
  const router = useRouter()
  
  // Status mapping for group IDs to TodoStatus
  const statusMap: Record<string, TodoStatus> = {
    'not-started': 'NOT_STARTED',
    'in-progress': 'IN_PROGRESS',
    'waiting-for': 'WAITING_FOR',
    'completed': 'COMPLETED'
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  const updateHandlers = {
    onStatusChange: async (todoId: string, newStatus: string) => {
      const todo = todos.find(t => t.id === todoId)
      if (todo) {
        await onTodoUpdate({ ...todo, status: newStatus })
      }
    },
    onProjectChange: async (todoId: string, newProjectId: string | null) => {
      const todo = todos.find(t => t.id === todoId)
      if (todo) {
        await onTodoUpdate({ ...todo, projectId: newProjectId })
      }
    },
    onDueDateChange: async (todoId: string, newDueDate: Date | null) => {
      const todo = todos.find(t => t.id === todoId)
      if (todo) {
        await onTodoUpdate({ ...todo, dueDate: newDueDate })
      }
    }
  }

  const { handleDragStart, handleDragOver, handleDragEnd, activeId } = useDragAndDrop(
    todos,
    groupBy,
    updateHandlers
  )

  // Initialize groups as expanded when grouping changes (except Completed)
  useEffect(() => {
    const allGroupIds = groupedTodos.map(g => g.id)
    // Collapse the Completed group by default
    const expandedIds = allGroupIds.filter(id => id !== 'COMPLETED')
    setExpandedGroups(new Set(expandedIds))
  }, [groupBy, groupedTodos])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "WAITING_FOR":
        return <Pause className="h-4 w-4 text-yellow-600" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "WAITING_FOR":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const activeTodo = todos.find(t => t.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Todos</h2>
            <p className="text-sm text-muted-foreground">
              {todos.length} {todos.length === 1 ? "task" : "tasks"}
            </p>
          </div>
          
          {/* Group By Selector */}
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
            <SelectTrigger className="w-full" aria-label="Group by">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="createdAt">Start Date</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="none">No Grouping</SelectItem>
            </SelectContent>
          </Select>

          {groupBy !== 'none' && groupBy !== 'createdAt' && groupBy !== 'organization' && (
            <p className="text-xs text-muted-foreground">
              Drag todos between groups to update their {groupBy === 'status' ? 'status' : groupBy === 'project' ? 'project' : 'due date'}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {groupedTodos.map((group) => (
              <div 
                key={group.id} 
                className="space-y-2"
                data-group-id={group.id}
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-accent/50 rounded-md transition-colors"
                >
                  {expandedGroups.has(group.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">{group.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {group.todos.length} {group.todos.length === 1 ? "item" : "items"}
                  </span>
                </button>

                {/* Group Items */}
                {expandedGroups.has(group.id) && (
                  <DroppableGroup 
                    id={group.id}
                    className="space-y-2 ml-6 min-h-[60px] rounded-lg transition-colors"
                  >
                    <SortableContext
                      items={group.todos.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.todos.map((todo) => (
                        <SortableTodoItem
                          key={todo.id}
                          todo={todo}
                          isSelected={selectedTodo?.id === todo.id}
                          onSelect={() => onTodoSelect(todo)}
                          getStatusIcon={getStatusIcon}
                          getStatusColor={getStatusColor}
                          formatStatus={formatStatus}
                          groupBy={groupBy}
                        />
                      ))}
                    </SortableContext>
                    {/* Quick Add Todo for status groups */}
                    {groupBy === 'status' && (
                      <QuickAddTodo
                        initialStatus={statusMap[group.id] || 'NOT_STARTED'}
                        onSubmit={async (data) => {
                          // Create new todo via API
                          const response = await fetch('/api/user/todos', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              title: data.title,
                              description: '',
                              status: data.status,
                              startDate: data.startDate?.toISOString(),
                              dueDate: data.dueDate?.toISOString(),
                              projectId: data.projectId
                            }),
                          })
                          
                          if (!response.ok) {
                            let message = 'Failed to create todo'
                            try {
                              const err = await response.json()
                              message = err.error || err.message || message
                            } catch {}
                            throw new Error(message)
                          }
                          
                          // Refresh data without full page reload
                          router.refresh()
                        }}
                        className="mt-2"
                      />
                    )}
                    {/* Drop zone indicator for empty groups */}
                    {group.todos.length === 0 && (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Drop todos here
                        </p>
                      </div>
                    )}
                  </DroppableGroup>
                )}
              </div>
            ))}
            {todos.length === 0 && (
              <div className="py-8">
                <div className="text-center mb-6">
                  <p className="text-muted-foreground mb-2">No todos yet</p>
                  <p className="text-sm text-muted-foreground">Get started by creating your first todo</p>
                </div>
                <div className="max-w-md mx-auto">
                  <QuickAddTodo
                    onSubmit={async (data) => {
                      // Create new todo via API
                      const response = await fetch('/api/user/todos', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          title: data.title,
                          description: '',
                          status: data.status || 'NOT_STARTED',
                          startDate: data.startDate?.toISOString(),
                          dueDate: data.dueDate?.toISOString(),
                          projectId: data.projectId
                        }),
                      })
                      
                      if (!response.ok) {
                        let message = 'Failed to create todo'
                        try {
                          const err = await response.json()
                          message = err.error || err.message || message
                        } catch {}
                        throw new Error(message)
                      }
                      
                      // Refresh data without full page reload
                      router.refresh()
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeTodo ? (
          <Card className="p-3 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getStatusIcon(activeTodo.status)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{activeTodo.title}</h3>
              </div>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}