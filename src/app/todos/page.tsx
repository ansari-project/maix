"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { TodoListPaneWithDnD } from "./components/TodoListPaneWithDnD"
import { TodoDetailsPanelEnhanced } from "./components/TodoDetailsPanelEnhanced"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { Todo, parseTodo, serializeTodo } from "./types"

export default function TodosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetailsPanel, setShowDetailsPanel] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  const handleTodoDelete = async (todoId: string) => {
    try {
      const response = await fetch(`/api/user/todos/${todoId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTodos(prev => prev.filter(t => t.id !== todoId))
        if (selectedTodo?.id === todoId) {
          setSelectedTodo(null)
        }
        setError(null)
      } else {
        setError("Failed to delete todo. Please try again.")
        console.error("Failed to delete todo:", response.statusText)
      }
    } catch (error) {
      setError("Failed to delete todo. Please check your connection.")
      console.error("Error deleting todo:", error)
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => {
      // Focus search input in TodoListPaneWithDnD
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      searchInput?.focus()
    },
    onNewTodo: async () => {
      // Create a new todo
      const newTodo = {
        title: "New Todo",
        description: "",
        status: "NOT_STARTED",
      }
      
      try {
        const response = await fetch("/api/user/todos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTodo),
        })

        if (response.ok) {
          const data = await response.json()
          const parsedTodo = parseTodo(data)
          setTodos(prev => [parsedTodo, ...prev])
          setSelectedTodo(parsedTodo)
        }
      } catch (error) {
        console.error("Error creating todo:", error)
      }
    },
    onToggleDetails: () => {
      setShowDetailsPanel(prev => !prev)
    },
    onNavigateUp: () => {
      if (todos.length === 0) return
      const newIndex = Math.max(0, selectedIndex - 1)
      setSelectedIndex(newIndex)
      setSelectedTodo(todos[newIndex])
    },
    onNavigateDown: () => {
      if (todos.length === 0) return
      const newIndex = Math.min(todos.length - 1, selectedIndex + 1)
      setSelectedIndex(newIndex)
      setSelectedTodo(todos[newIndex])
    },
    onDelete: () => {
      if (selectedTodo) {
        handleTodoDelete(selectedTodo.id)
      }
    },
    onToggleComplete: () => {
      if (selectedTodo) {
        const newStatus = selectedTodo.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED"
        handleTodoUpdate({ ...selectedTodo, status: newStatus })
      }
    }
  })

  // Sync selected index when todo is selected
  useEffect(() => {
    if (selectedTodo) {
      const index = todos.findIndex(t => t.id === selectedTodo.id)
      if (index !== -1) {
        setSelectedIndex(index)
      }
    }
  }, [selectedTodo, todos])

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
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
        
        {/* Main Grid - Full height with proper overflow handling */}
        <div className={`flex-1 grid ${showDetailsPanel ? 'grid-cols-2' : 'grid-cols-1'} gap-0 transition-all duration-300 min-h-0`}>
          {/* Left Pane - Todo List */}
          <div className={`${showDetailsPanel ? 'border-r border-border' : ''} h-full overflow-hidden`}>
            <TodoListPaneWithDnD 
              todos={todos}
              selectedTodo={selectedTodo}
              onTodoSelect={handleTodoSelect}
              onTodoUpdate={handleTodoUpdate}
            />
          </div>

          {/* Right Pane - Todo Details (conditionally rendered) */}
          {showDetailsPanel && (
            <div className="h-full overflow-hidden">
              <TodoDetailsPanelEnhanced
                todo={selectedTodo}
                onUpdate={handleTodoUpdate}
                onCommentAdd={handleCommentAdd}
                onDelete={handleTodoDelete}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}