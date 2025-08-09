import { PrismaClient, Todo, TodoStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schemas
export const createTodoSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.nativeEnum(TodoStatus).default(TodoStatus.NOT_STARTED),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().optional(),
  eventId: z.string().optional(),
  assigneeId: z.string().optional(),
})

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TodoStatus).optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
})

export type CreateTodoInput = z.infer<typeof createTodoSchema>
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>

/**
 * Create a new todo task
 */
export async function createTodo(
  creatorId: string,
  data: CreateTodoInput
): Promise<Todo> {
  const validated = createTodoSchema.parse(data)
  
  return prisma.todo.create({
    data: {
      ...validated,
      creatorId,
    },
    include: {
      creator: true,
      assignee: true,
      project: true,
    },
  })
}

/**
 * Create a standalone task (no project)
 */
export async function createStandaloneTask(
  creatorId: string,
  data: Omit<CreateTodoInput, 'projectId' | 'eventId'>
): Promise<Todo> {
  return createTodo(creatorId, {
    ...data,
    projectId: undefined,
    eventId: undefined,
  })
}

/**
 * Update todo status (for drag-and-drop)
 */
export async function updateTodoStatus(
  todoId: string,
  status: TodoStatus,
  userId: string
): Promise<Todo> {
  // Verify user has permission to update
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { project: { include: { members: true } } },
  })

  if (!todo) {
    throw new Error('Todo not found')
  }

  // Check permissions
  if (!canUpdateTodo(todo, userId)) {
    throw new Error('Unauthorized to update this todo')
  }

  return prisma.todo.update({
    where: { id: todoId },
    data: { status },
    include: {
      creator: true,
      assignee: true,
      project: true,
    },
  })
}

/**
 * Get all tasks assigned to a user (My Tasks view)
 */
export async function getMyTasks(
  userId: string,
  options?: {
    includeCompleted?: boolean
    projectId?: string
  }
): Promise<Todo[]> {
  const where: Prisma.TodoWhereInput = {
    OR: [
      { assigneeId: userId },
      { creatorId: userId, assigneeId: null },
    ],
  }

  // Optionally filter out completed tasks
  if (!options?.includeCompleted) {
    where.status = {
      notIn: [TodoStatus.COMPLETED],
    }
  }

  // Optionally filter by project
  if (options?.projectId) {
    where.projectId = options.projectId
  }

  return prisma.todo.findMany({
    where,
    include: {
      creator: true,
      assignee: true,
      project: {
        include: {
          owner: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { startDate: 'asc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  })
}

/**
 * Get tasks grouped by project for My Tasks view
 */
export async function getMyTasksGrouped(
  userId: string,
  options?: {
    includeCompleted?: boolean
  }
) {
  const tasks = await getMyTasks(userId, options)
  
  // Group tasks by project
  const grouped = new Map<string | null, typeof tasks>()
  
  for (const task of tasks) {
    const key = task.projectId || 'standalone'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(task)
  }
  
  // Convert to array format
  const result = []
  
  // Add standalone tasks first
  if (grouped.has('standalone')) {
    result.push({
      projectId: null,
      projectName: 'Standalone Tasks',
      isPersonal: false,
      tasks: grouped.get('standalone')!,
    })
  }
  
  // Add project tasks
  grouped.forEach((tasks, projectId) => {
    if (projectId && projectId !== 'standalone' && tasks.length > 0) {
      // Get project info from the first task (all tasks in group have same project)
      const firstTaskWithProject = tasks[0] as any // Type assertion needed due to Prisma include typing
      const project = firstTaskWithProject.project
      result.push({
        projectId,
        projectName: project?.name || 'Unknown Project',
        isPersonal: project?.isPersonal || false,
        personalCategory: project?.personalCategory,
        tasks,
      })
    }
  })
  
  return result
}

/**
 * Move task between projects (or to standalone)
 */
export async function moveTaskToProject(
  todoId: string,
  newProjectId: string | null,
  userId: string
): Promise<Todo> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { project: { include: { members: true } } },
  })

  if (!todo) {
    throw new Error('Todo not found')
  }

  // Check permissions for source
  if (!canUpdateTodo(todo, userId)) {
    throw new Error('Unauthorized to move this todo')
  }

  // Check permissions for destination
  if (newProjectId) {
    const newProject = await prisma.project.findUnique({
      where: { id: newProjectId },
      include: { members: true },
    })

    if (!newProject) {
      throw new Error('Destination project not found')
    }

    if (!canAccessProject(newProject, userId)) {
      throw new Error('Unauthorized to add tasks to destination project')
    }
  }

  return prisma.todo.update({
    where: { id: todoId },
    data: { projectId: newProjectId },
    include: {
      creator: true,
      assignee: true,
      project: true,
    },
  })
}

/**
 * Helper: Check if user can update a todo
 */
function canUpdateTodo(
  todo: Todo & { project: any },
  userId: string
): boolean {
  // Creator can always update
  if (todo.creatorId === userId) return true
  
  // Assignee can update
  if (todo.assigneeId === userId) return true
  
  // Project owner/member can update
  if (todo.project) {
    return canAccessProject(todo.project, userId)
  }
  
  return false
}

/**
 * Helper: Check if user can access a project
 */
function canAccessProject(
  project: any,
  userId: string
): boolean {
  // Owner always has access
  if (project.ownerId === userId) return true
  
  // Check if user is a member
  if (project.members) {
    return project.members.some((m: any) => 
      m.userId === userId
    )
  }
  
  return false
}