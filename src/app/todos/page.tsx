"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { TodoListPane } from "./components/TodoListPane"
import { TodoDetailsPanel } from "./components/TodoDetailsPanel"
import { Todo, parseTodo, serializeTodo } from "./types"

export default function TodosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchTodos()
    }
  }, [status])

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/user/todos")
      if (response.ok) {
        const data = await response.json()
        // Parse dates from API response
        const parsedTodos = (data.todos || []).map(parseTodo)
        setTodos(parsedTodos)
        setError(null)
      } else {
        setError("Failed to load todos. Please try again.")
        console.error("Failed to fetch todos:", response.statusText)
      }
    } catch (error) {
      setError("Failed to load todos. Please check your connection.")
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
      const response = await fetch(`/api/user/todos/${updatedTodo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializeTodo(updatedTodo)),
      })

      if (response.ok) {
        const data = await response.json()
        const parsedData = parseTodo(data)
        setTodos(prev => prev.map(t => t.id === parsedData.id ? parsedData : t))
        if (selectedTodo?.id === parsedData.id) {
          setSelectedTodo(parsedData)
        }
        setError(null)
      } else {
        setError("Failed to update todo. Please try again.")
        console.error("Failed to update todo:", response.statusText)
      }
    } catch (error) {
      setError("Failed to update todo. Please check your connection.")
      console.error("Error updating todo:", error)
    }
  }

  const handleCommentAdd = async (todoId: string, comment: string) => {
    try {
      const response = await fetch(`/api/user/todos/${todoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: comment }),
      })

      if (response.ok) {
        // Refresh the selected todo to get new comments
        if (selectedTodo?.id === todoId) {
          const todoResponse = await fetch(`/api/user/todos/${todoId}`)
          if (todoResponse.ok) {
            const updatedTodo = await todoResponse.json()
            setSelectedTodo(parseTodo(updatedTodo))
          }
        }
        setError(null)
      } else {
        setError("Failed to add comment. Please try again.")
        console.error("Failed to add comment:", response.statusText)
      }
    } catch (error) {
      setError("Failed to add comment. Please check your connection.")
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
    <div className="h-screen flex flex-col">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-800 text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-2 gap-0">
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
    </div>
  )
}