"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Clock, Pause } from "lucide-react"
import { format } from "date-fns"
import { Todo } from "../types"

interface TodoListPaneProps {
  todos: Todo[]
  selectedTodo: Todo | null
  onTodoSelect: (todo: Todo) => void
}

export function TodoListPane({ todos, selectedTodo, onTodoSelect }: TodoListPaneProps) {
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Todos</h2>
        <p className="text-sm text-muted-foreground">
          {todos.length} {todos.length === 1 ? "task" : "tasks"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {todos.map((todo) => (
            <Card
              key={todo.id}
              className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedTodo?.id === todo.id ? "bg-accent" : ""
              }`}
              onClick={() => onTodoSelect(todo)}
            >
              <div className="flex items-start gap-3">
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
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(todo.status)}`}>
                      {formatStatus(todo.status)}
                    </Badge>
                    {todo.project && (
                      <Badge variant="outline" className="text-xs">
                        {todo.project.name}
                      </Badge>
                    )}
                    {todo.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {format(new Date(todo.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {todos.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No todos yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}