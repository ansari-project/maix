"use client"

import { useState, useEffect } from "react"
import { TodoList } from "./todo-list"
import { TodoForm } from "./todo-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { TodoWithRelations } from "@/types/todo"
import { CheckSquare, Plus } from "lucide-react"

interface TodoSectionProps {
  projectId: string
  canManage?: boolean
}

export function TodoSection({ projectId, canManage = false }: TodoSectionProps) {
  const [todos, setTodos] = useState<TodoWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()

  // Fetch todos
  const fetchTodos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/todos`)
      if (response.ok) {
        const data = await response.json()
        setTodos(data.todos || [])
      } else {
        throw new Error('Failed to fetch todos')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load todos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle todo creation
  const handleCreateTodo = async (data: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create todo')
      }

      const result = await response.json()
      setTodos([result.todo, ...todos])
      setShowCreateDialog(false)
      
      toast({
        title: "Success",
        description: "Todo created successfully"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create todo",
        variant: "destructive"
      })
    }
  }

  // Handle status change
  const handleStatusChange = async (todoId: string, status: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update todo')
      }

      const result = await response.json()
      setTodos(todos.map(t => t.id === todoId ? result.todo : t))
      
      toast({
        title: "Success",
        description: "Todo status updated"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update todo status",
        variant: "destructive"
      })
    }
  }

  // Handle assignee change
  const handleAssigneeChange = async (todoId: string, assigneeId: string | null) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId })
      })

      if (!response.ok) {
        throw new Error('Failed to update todo')
      }

      const result = await response.json()
      setTodos(todos.map(t => t.id === todoId ? result.todo : t))
      
      toast({
        title: "Success",
        description: "Todo assignee updated"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update todo assignee",
        variant: "destructive"
      })
    }
  }

  // Calculate stats
  const stats = {
    total: todos.length,
    notStarted: todos.filter(t => t.status === 'NOT_STARTED').length,
    inProgress: todos.filter(t => t.status === 'IN_PROGRESS').length,
    waitingFor: todos.filter(t => t.status === 'WAITING_FOR').length,
    completed: todos.filter(t => t.status === 'COMPLETED').length
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Todos</h2>
          {!loading && todos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({stats.completed}/{stats.total} completed)
            </span>
          )}
        </div>
        
        {canManage && !loading && (
          <Button 
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Todo
          </Button>
        )}
      </div>

      {/* Todo List */}
      <TodoList
        todos={todos}
        onStatusChange={canManage ? handleStatusChange : undefined}
        onAssigneeChange={canManage ? handleAssigneeChange : undefined}
        onCreateClick={() => setShowCreateDialog(true)}
        canManage={canManage}
        loading={loading}
      />

      {/* Create Todo Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Todo</DialogTitle>
          </DialogHeader>
          <TodoForm
            projectId={projectId}
            onSubmit={handleCreateTodo}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}