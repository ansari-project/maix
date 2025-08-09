"use client"

import { useState, useEffect } from "react"
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from "@dnd-kit/core"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TaskCard } from "./TaskCard"
import { TodoStatusBadge } from "./todo-status-badge"
import { Calendar, Clock, Plus, Search, FolderOpen, User, Archive } from "lucide-react"
import { TodoStatus } from "@prisma/client"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  startDate?: string | null
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  assignee?: {
    id: string
    name: string | null
    image: string | null
  } | null
}

interface ProjectGroup {
  projectId: string | null
  projectName: string
  isPersonal: boolean
  personalCategory?: string | null
  tasks: Task[]
}

interface TaskCounts {
  total: number
  NOT_STARTED: number
  IN_PROGRESS: number
  WAITING_FOR: number
  COMPLETED: number
}

const statusColumns: { status: TodoStatus; label: string; color: string }[] = [
  { status: TodoStatus.NOT_STARTED, label: "Not Started", color: "bg-gray-100 text-gray-800" },
  { status: TodoStatus.IN_PROGRESS, label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  { status: TodoStatus.WAITING_FOR, label: "Waiting For", color: "bg-orange-100 text-orange-800" },
  { status: TodoStatus.COMPLETED, label: "Completed", color: "bg-green-100 text-green-800" },
]

function DroppableColumn({ 
  status, 
  children 
}: { 
  status: TodoStatus; 
  children: React.ReactNode 
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  
  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[200px] transition-colors ${
        isOver ? 'bg-blue-50 border-blue-200' : ''
      }`}
    >
      {children}
    </div>
  )
}

export default function MyTasksView() {
  const { toast } = useToast()
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<ProjectGroup[]>([])
  const [counts, setCounts] = useState<TaskCounts>({
    total: 0,
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    WAITING_FOR: 0,
    COMPLETED: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<string>("ALL")
  const [showCompleted, setShowCompleted] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskProject, setNewTaskProject] = useState<string | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<TodoStatus>(TodoStatus.NOT_STARTED)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasksGrouped()
  }, [showCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterGroups()
  }, [projectGroups, searchQuery, selectedProject]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTasksGrouped = async () => {
    try {
      const params = new URLSearchParams()
      if (showCompleted) {
        params.set('includeCompleted', 'true')
      }
      params.set('grouped', 'true')

      const response = await fetch(`/api/todos/my-tasks?${params}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch tasks")
      }

      const data = await response.json()
      setProjectGroups(data)
      
      // Calculate counts from all tasks
      const allTasks = data.flatMap((group: ProjectGroup) => group.tasks)
      const newCounts: TaskCounts = {
        total: allTasks.length,
        NOT_STARTED: 0,
        IN_PROGRESS: 0,
        WAITING_FOR: 0,
        COMPLETED: 0,
      }
      
      allTasks.forEach((task: Task) => {
        if (task.status in newCounts) {
          newCounts[task.status as keyof TaskCounts] = (newCounts[task.status as keyof TaskCounts] as number) + 1
        }
      })
      
      setCounts(newCounts)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tasks",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterGroups = () => {
    let filtered = [...projectGroups]

    // Filter by project
    if (selectedProject !== "ALL") {
      filtered = filtered.filter((group) => 
        group.projectId === (selectedProject === "standalone" ? null : selectedProject)
      )
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          group.projectName.toLowerCase().includes(query)
        ),
      })).filter((group) => group.tasks.length > 0)
    }

    setFilteredGroups(filtered)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    const allTasks = projectGroups.flatMap(group => group.tasks)
    const task = allTasks.find(t => t.id === taskId)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveTask(null)
    
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const newStatus = over.id as TodoStatus

    // Validate that it's a valid status transition
    if (!Object.values(TodoStatus).includes(newStatus)) return

    try {
      const response = await fetch(`/api/todos/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task status")
      }

      // Update local state
      setProjectGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          ),
        }))
      )

      // Update counts
      const allTasks = projectGroups.flatMap(group => group.tasks)
      const task = allTasks.find(t => t.id === taskId)
      if (task) {
        setCounts((prev) => {
          const newCounts = { ...prev }
          // Safely decrement old status
          const oldStatus = task.status as keyof TaskCounts
          if (oldStatus in newCounts && oldStatus !== 'total') {
            newCounts[oldStatus] = Math.max(0, (newCounts[oldStatus] as number) - 1)
          }
          // Safely increment new status
          const statusKey = newStatus as keyof TaskCounts
          if (statusKey in newCounts && statusKey !== 'total') {
            newCounts[statusKey] = (newCounts[statusKey] as number) + 1
          }
          return newCounts
        })
      }

      toast({
        title: "Success",
        description: "Task status updated",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status",
      })
    }
  }

  const createQuickTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      const taskData = {
        title: newTaskTitle,
        status: newTaskStatus,
        projectId: newTaskProject,
      }

      const response = await fetch('/api/todos/standalone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const newTask = await response.json()
      
      // Refresh the view to show the new task
      await fetchTasksGrouped()
      
      setNewTaskTitle("")
      setNewTaskProject(null)
      setNewTaskStatus(TodoStatus.NOT_STARTED)

      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task",
      })
    }
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

  // Get unique projects for dropdown
  const projectOptions = [
    { id: "ALL", name: "All Projects" },
    { id: "standalone", name: "Standalone Tasks" },
    ...projectGroups
      .filter((group) => group.projectId !== null)
      .map((group) => ({ id: group.projectId!, name: group.projectName }))
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Tasks</h1>
        <p className="text-muted-foreground">
          Organize your tasks by project and drag between status columns
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        {statusColumns.slice(1, 5).map((col) => (
          <Card key={col.status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {col.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${col.color.includes('blue') ? 'text-blue-600' : 
                col.color.includes('yellow') ? 'text-yellow-600' : 
                col.color.includes('orange') ? 'text-orange-600' :
                col.color.includes('green') ? 'text-green-600' : 'text-gray-600'}`}>
                {counts[col.status as keyof TaskCounts] as number}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Quick Add */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tasks..."
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
                {projectOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showCompleted ? "default" : "outline"}
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showCompleted ? "Hide" : "Show"} Completed
            </Button>
          </div>
          
          {/* Quick Add Task */}
          <div className="border-t pt-4">
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="Quick add task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && createQuickTask()}
              />
              <Select value={newTaskProject || "standalone"} onValueChange={(value) => 
                setNewTaskProject(value === "standalone" ? null : value)
              }>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone Task</SelectItem>
                  {projectGroups
                    .filter((group) => group.projectId !== null)
                    .map((group) => (
                      <SelectItem key={group.projectId!} value={group.projectId!}>
                        {group.projectName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={newTaskStatus} onValueChange={(value: TodoStatus) => setNewTaskStatus(value)}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusColumns.slice(1, 5).map((col) => (
                    <SelectItem key={col.status} value={col.status}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={createQuickTask} disabled={!newTaskTitle.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Project with Status Columns */}
      <DndContext 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || selectedProject !== "ALL"
                    ? "No tasks found matching your filters"
                    : "You don't have any assigned tasks"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.projectId || "standalone"} className="space-y-4">
                {/* Project Header */}
                <div className="flex items-center gap-3">
                  {group.isPersonal ? (
                    <User className="h-5 w-5 text-purple-600" />
                  ) : group.projectId ? (
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-600" />
                  )}
                  <h2 className="text-xl font-semibold">{group.projectName}</h2>
                  {group.personalCategory && (
                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                      {group.personalCategory}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Status Columns */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  {statusColumns.map((column) => {
                    const tasksInStatus = group.tasks.filter((task) => task.status === column.status)
                    
                    return (
                      <DroppableColumn key={column.status} status={column.status}>
                        <Card className="min-h-[200px]">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                              <span className={`px-2 py-1 rounded-full text-xs ${column.color}`}>
                                {column.label}
                              </span>
                              <span className="text-muted-foreground">
                                {tasksInStatus.length}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {tasksInStatus.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                projectName={group.projectName}
                              />
                            ))}
                          </CardContent>
                        </Card>
                      </DroppableColumn>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <TaskCard 
              task={activeTask} 
              projectName="Moving task..."
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}