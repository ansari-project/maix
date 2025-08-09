import { TodoStatus } from '@prisma/client'
import { z } from 'zod'

// Export validation schemas (these are the same as real ones)
export const createTodoSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.nativeEnum(TodoStatus).default(TodoStatus.NOT_STARTED),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  projectId: z.string().optional(),
  eventId: z.string().optional(),
  assigneeId: z.string().optional(),
})

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TodoStatus).optional(),
  startDate: z.date().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
})

// Mock functions
export const createTodo = jest.fn()
export const createStandaloneTask = jest.fn()
export const updateTodoStatus = jest.fn()
export const getMyTasks = jest.fn()
export const getMyTasksGrouped = jest.fn()
export const moveTaskToProject = jest.fn()