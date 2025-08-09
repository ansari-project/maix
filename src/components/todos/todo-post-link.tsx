"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TodoStatusBadge } from "./todo-status-badge"
import { CheckSquare } from "lucide-react"
import { TodoStatus } from "@prisma/client"

interface TodoOption {
  id: string
  title: string
  status: TodoStatus
}

interface TodoPostLinkProps {
  projectId: string
  value?: string | null
  onChange: (todoId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TodoPostLink({
  projectId,
  value,
  onChange,
  placeholder = "Link to todo (optional)",
  disabled = false,
  className
}: TodoPostLinkProps) {
  const [todos, setTodos] = useState<TodoOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTodos() {
      try {
        setLoading(true)
        const response = await fetch(`/api/projects/${projectId}/todos?status=NOT_STARTED&status=IN_PROGRESS`)
        if (response.ok) {
          const data = await response.json()
          setTodos(data.todos || [])
        }
      } catch (error) {
        console.error('Failed to fetch todos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchTodos()
    }
  }, [projectId])

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
      disabled={disabled || loading || todos.length === 0}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No todo linked</span>
        </SelectItem>
        {todos.map((todo) => (
          <SelectItem key={todo.id} value={todo.id}>
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate">{todo.title}</span>
              <TodoStatusBadge status={todo.status} className="scale-90" />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}