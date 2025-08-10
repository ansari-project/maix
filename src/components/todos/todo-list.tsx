"use client"

import { useState } from "react"
import { TodoCard } from "./todo-card"
import { QuickAddTodo } from "./quick-add-todo"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TodoWithRelations } from "@/types/todo"
import { TodoStatus } from "@prisma/client"
import { Filter, Plus } from "lucide-react"

interface TodoListProps {
  todos: TodoWithRelations[]
  projectId?: string
  projects?: Array<{ id: string; name: string }>
  onStatusChange?: (todoId: string, status: string) => void
  onAssigneeChange?: (todoId: string, assigneeId: string | null) => void
  onCreateClick?: () => void
  onQuickAdd?: (data: {
    title: string
    projectId?: string
    status: TodoStatus
    dueDate?: Date
    startDate?: Date
  }) => Promise<void>
  showProject?: boolean
  canManage?: boolean
  loading?: boolean
}

export function TodoList({
  todos,
  projectId,
  projects,
  onStatusChange,
  onAssigneeChange,
  onCreateClick,
  onQuickAdd,
  showProject = false,
  canManage = false,
  loading = false
}: TodoListProps) {
  const [statusFilter, setStatusFilter] = useState<TodoStatus | 'ALL'>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL')

  // Get unique assignees for filter
  const assignees = Array.from(new Set(
    todos
      .filter(todo => todo.assignee)
      .map(todo => ({
        id: todo.assignee!.id,
        name: todo.assignee!.name || todo.assignee!.username || 'Unknown'
      }))
      .map(a => JSON.stringify(a))
  )).map(str => JSON.parse(str))

  // Apply filters
  const filteredTodos = todos.filter(todo => {
    if (statusFilter !== 'ALL' && todo.status !== statusFilter) return false
    if (assigneeFilter !== 'ALL' && todo.assigneeId !== assigneeFilter) return false
    return true
  })

  // Group by status
  const todosByStatus = {
    NOT_STARTED: filteredTodos.filter(t => t.status === 'NOT_STARTED'),
    IN_PROGRESS: filteredTodos.filter(t => t.status === 'IN_PROGRESS'),
    WAITING_FOR: filteredTodos.filter(t => t.status === 'WAITING_FOR'),
    COMPLETED: filteredTodos.filter(t => t.status === 'COMPLETED')
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading todos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and create button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as TodoStatus | 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="WAITING_FOR">Waiting For</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          {assignees.length > 0 && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All assignees</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {canManage && onCreateClick && (
          <Button onClick={onCreateClick} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Todo
          </Button>
        )}
      </div>

      {/* Todo lists by status */}
      {filteredTodos.length === 0 && (!canManage || !onQuickAdd) ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {todos.length === 0 ? "No todos yet" : "No todos match your filters"}
          </p>
          {todos.length === 0 && canManage && onCreateClick && (
            <Button 
              variant="link" 
              onClick={onCreateClick}
              className="mt-2"
            >
              Create the first todo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {statusFilter === 'ALL' ? (
            // Show grouped by status
            <>
              {(todosByStatus.NOT_STARTED.length > 0 || canManage) && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">
                    Not Started ({todosByStatus.NOT_STARTED.length})
                  </h3>
                  <div className="space-y-2">
                    {todosByStatus.NOT_STARTED.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        onStatusChange={canManage ? onStatusChange : undefined}
                        onAssigneeChange={canManage ? onAssigneeChange : undefined}
                        showProject={showProject}
                      />
                    ))}
                    {canManage && onQuickAdd && (
                      <QuickAddTodo
                        projectId={projectId}
                        projects={projects}
                        onSubmit={onQuickAdd}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              )}

              {(todosByStatus.IN_PROGRESS.length > 0 || canManage) && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">
                    In Progress ({todosByStatus.IN_PROGRESS.length})
                  </h3>
                  <div className="space-y-2">
                    {todosByStatus.IN_PROGRESS.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        onStatusChange={canManage ? onStatusChange : undefined}
                        onAssigneeChange={canManage ? onAssigneeChange : undefined}
                        showProject={showProject}
                      />
                    ))}
                    {canManage && onQuickAdd && (
                      <QuickAddTodo
                        projectId={projectId}
                        projects={projects}
                        onSubmit={onQuickAdd}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              )}

              {(todosByStatus.WAITING_FOR.length > 0 || canManage) && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">
                    Waiting For ({todosByStatus.WAITING_FOR.length})
                  </h3>
                  <div className="space-y-2">
                    {todosByStatus.WAITING_FOR.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        onStatusChange={canManage ? onStatusChange : undefined}
                        onAssigneeChange={canManage ? onAssigneeChange : undefined}
                        showProject={showProject}
                      />
                    ))}
                    {canManage && onQuickAdd && (
                      <QuickAddTodo
                        projectId={projectId}
                        projects={projects}
                        onSubmit={onQuickAdd}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              )}

              {(todosByStatus.COMPLETED.length > 0 || canManage) && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">
                    Completed ({todosByStatus.COMPLETED.length})
                  </h3>
                  <div className="space-y-2">
                    {todosByStatus.COMPLETED.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        onStatusChange={canManage ? onStatusChange : undefined}
                        onAssigneeChange={canManage ? onAssigneeChange : undefined}
                        showProject={showProject}
                      />
                    ))}
                    {canManage && onQuickAdd && (
                      <QuickAddTodo
                        projectId={projectId}
                        projects={projects}
                        onSubmit={onQuickAdd}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Show flat list when filtered
            <div className="space-y-2">
              {filteredTodos.map(todo => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onStatusChange={canManage ? onStatusChange : undefined}
                  onAssigneeChange={canManage ? onAssigneeChange : undefined}
                  showProject={showProject}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}