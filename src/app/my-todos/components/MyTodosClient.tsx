"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TodoStatusBadge } from "@/components/todos/todo-status-badge"
import { Calendar, Clock, Filter, Search, SortDesc } from "lucide-react"
import { TodoStatus } from "@prisma/client"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface Todo {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  project: {
    id: string
    name: string
    status: string
  }
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  posts: {
    id: string
  }[]
}

interface Project {
  id: string
  name: string
}

interface TodoCounts {
  total: number
  NOT_STARTED: number
  OPEN: number
  IN_PROGRESS: number
  WAITING_FOR: number
  COMPLETED: number
  DONE: number
}

export default function MyTodosClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [todos, setTodos] = useState<Todo[]>([])
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [counts, setCounts] = useState<TodoCounts>({
    total: 0,
    NOT_STARTED: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_FOR: 0,
    COMPLETED: 0,
    DONE: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<TodoStatus | "ALL">("ALL")
  const [selectedProject, setSelectedProject] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    fetchTodos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterAndSortTodos()
  }, [todos, selectedStatus, selectedProject, searchQuery, sortBy, sortOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTodos = async () => {
    try {
      const params = new URLSearchParams()
      const response = await fetch(`/api/user/todos?${params}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch todos")
      }

      const data = await response.json()
      setTodos(data.todos)
      setProjects(data.projects)
      setCounts(data.counts)
    } catch (error) {
      console.error("Error fetching todos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load todos",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTodos = () => {
    let filtered = [...todos]

    // Filter by status
    if (selectedStatus !== "ALL") {
      filtered = filtered.filter((todo) => todo.status === selectedStatus)
    }

    // Filter by project
    if (selectedProject !== "ALL") {
      filtered = filtered.filter((todo) => todo.project.id === selectedProject)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(query) ||
          todo.description?.toLowerCase().includes(query) ||
          todo.project.name.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      if (sortBy === "dueDate") {
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : sortOrder === "asc" ? Infinity : -Infinity
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : sortOrder === "asc" ? Infinity : -Infinity
      } else {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === "asc") {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    setFilteredTodos(filtered)
  }

  const updateTodoStatus = async (todoId: string, newStatus: TodoStatus) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update todo")
      }

      // Update local state
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId ? { ...todo, status: newStatus } : todo
        )
      )

      // Update counts
      const oldTodo = todos.find((t) => t.id === todoId)
      if (oldTodo) {
        setCounts((prev) => {
          const newCounts = { ...prev }
          // Safely update counts using string indexing
          const oldStatus = oldTodo.status as keyof TodoCounts
          const statusKey = newStatus as keyof TodoCounts
          if (oldStatus in newCounts && oldStatus !== 'total') {
            newCounts[oldStatus] = (newCounts[oldStatus] as number) - 1
          }
          if (statusKey in newCounts && statusKey !== 'total') {
            newCounts[statusKey] = (newCounts[statusKey] as number) + 1
          }
          return newCounts
        })
      }

      toast({
        title: "Success",
        description: "Todo status updated",
      })
    } catch (error) {
      console.error("Error updating todo:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update todo",
      })
    }
  }

  const navigateToProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Todos</h1>
        <p className="text-muted-foreground">
          Manage all your assigned tasks across different projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{counts.OPEN}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{counts.IN_PROGRESS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{counts.COMPLETED}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search todos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: "createdAt" | "dueDate") => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <SortDesc className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Todos List with Tabs */}
      <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as TodoStatus | "ALL")}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ALL">All ({counts.total})</TabsTrigger>
          <TabsTrigger value="OPEN">Open ({counts.OPEN})</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress ({counts.IN_PROGRESS})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({counts.COMPLETED})</TabsTrigger>
        </TabsList>
        <TabsContent value={selectedStatus} className="mt-6">
          {filteredTodos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || selectedProject !== "ALL"
                    ? "No todos found matching your filters"
                    : selectedStatus === "ALL"
                    ? "You don't have any assigned todos"
                    : `You don't have any ${selectedStatus.toLowerCase().replace("_", " ")} todos`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTodos.map((todo) => (
                <Card key={todo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{todo.title}</h3>
                          <TodoStatusBadge status={todo.status} />
                        </div>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {todo.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <button
                            onClick={() => navigateToProject(todo.project.id)}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <span className="font-medium">{todo.project.name}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Created {format(new Date(todo.createdAt), "MMM d, yyyy")}</span>
                          </div>
                          {todo.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due {format(new Date(todo.dueDate), "MMM d, yyyy")}</span>
                            </div>
                          )}
                          {todo.posts.length > 0 && (
                            <Badge variant="secondary">
                              {todo.posts.length} update{todo.posts.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Select
                        value={todo.status}
                        onValueChange={(value: TodoStatus) => updateTodoStatus(todo.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}