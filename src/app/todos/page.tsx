"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { TodoListPane } from "./components/TodoListPane"
import { TodoDetailsPanel } from "./components/TodoDetailsPanel"

interface Todo {
  id: string
  title: string
  description: string | null
  status: string
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  projectId: string | null
  creatorId: string
  assigneeId: string | null
  project?: {
    id: string
    name: string
  }
  assignee?: {
    id: string
    name: string | null
    email: string
  }
}

export default function TodosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchTodos()
    }
  }, [session])

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/user/todos")
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

  const handleTodoSelect = (todo: Todo) => {
    setSelectedTodo(todo)
  }

  const handleTodoUpdate = async (updatedTodo: Todo) => {
    try {
      const response = await fetch(`/api/todos/${updatedTodo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTodo),
      })

      if (response.ok) {
        const data = await response.json()
        setTodos(prev => prev.map(t => t.id === data.id ? data : t))
        if (selectedTodo?.id === data.id) {
          setSelectedTodo(data)
        }
      }
    } catch (error) {
      console.error("Error updating todo:", error)
    }
  }

  const handleCommentAdd = async (todoId: string, comment: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: comment }),
      })

      if (response.ok) {
        // Refresh the selected todo to get new comments
        if (selectedTodo?.id === todoId) {
          const todoResponse = await fetch(`/api/todos/${todoId}`)
          if (todoResponse.ok) {
            const updatedTodo = await todoResponse.json()
            setSelectedTodo(updatedTodo)
          }
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="h-screen grid grid-cols-2 gap-0">
      {/* Left Pane - Todo List */}
      <div className="border-r border-border overflow-hidden">
        <TodoListPane 
          todos={todos}
          selectedTodo={selectedTodo}
          onTodoSelect={handleTodoSelect}
        />
      </div>

      {/* Right Pane - Todo Details */}
      <div className="overflow-hidden">
        <TodoDetailsPanel
          todo={selectedTodo}
          onUpdate={handleTodoUpdate}
          onCommentAdd={handleCommentAdd}
        />
      </div>
    </div>
  )
}