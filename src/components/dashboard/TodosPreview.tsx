"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckSquare, Calendar, Clock, Plus } from "lucide-react"
import { format, isToday, isTomorrow, parseISO } from "date-fns"

interface Todo {
  id: string
  title: string
  description?: string | null
  status: "NOT_STARTED" | "IN_PROGRESS" | "WAITING_FOR" | "COMPLETED"
  dueDate?: string | null
  createdAt: string
  project?: {
    id: string
    name: string
  } | null
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "NOT_STARTED":
      return "bg-gray-100 text-gray-800"
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800"
    case "WAITING_FOR":
      return "bg-orange-100 text-orange-800"
    case "COMPLETED":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "NOT_STARTED":
      return "Not Started"
    case "IN_PROGRESS":
      return "In Progress"
    case "WAITING_FOR":
      return "Waiting"
    case "COMPLETED":
      return "Done"
    default:
      return status
  }
}

const formatDueDate = (dueDateStr: string) => {
  const dueDate = parseISO(dueDateStr)
  if (isToday(dueDate)) {
    return "Due today"
  } else if (isTomorrow(dueDate)) {
    return "Due tomorrow"
  } else {
    return `Due ${format(dueDate, "MMM d")}`
  }
}

export function TodosPreview() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/user/todos?limit=5")
      if (response.ok) {
        const data = await response.json()
        setTodos(data.todos || [])
      }
    } catch (error) {
      console.error("Error fetching todos:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Todos</CardTitle>
          <CardDescription>Your current tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter out completed todos and show only active ones
  const activeTodos = todos.filter(todo => todo.status !== "COMPLETED").slice(0, 4)
  const completedCount = todos.filter(todo => todo.status === "COMPLETED").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Todos</CardTitle>
            <CardDescription>
              {activeTodos.length} active task{activeTodos.length !== 1 ? "s" : ""}
              {completedCount > 0 && `, ${completedCount} completed`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/todos">
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeTodos.length === 0 ? (
          <div className="text-center py-6">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">No active todos</p>
            <Button size="sm" asChild>
              <Link href="/todos">
                <Plus className="h-4 w-4 mr-2" />
                Add Todo
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTodos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{todo.title}</p>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(todo.status)}`}>
                      {getStatusLabel(todo.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {todo.project && (
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        {todo.project.name}
                      </span>
                    )}
                    {todo.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDueDate(todo.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {todos.length > 4 && (
              <div className="pt-2 border-t">
                <Link href="/todos" className="block text-center">
                  <Button variant="ghost" size="sm" className="w-full">
                    View {todos.length - 4} more task{todos.length - 4 !== 1 ? "s" : ""}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}