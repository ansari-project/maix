import type { User, Project, Post } from '@prisma/client'

export enum TodoStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR = 'WAITING_FOR',
  COMPLETED = 'COMPLETED'
}

export interface Todo {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  startDate?: Date | null
  dueDate?: Date | null
  createdAt: Date
  updatedAt: Date
  projectId?: string | null // Now optional for standalone tasks
  eventId?: string | null
  creatorId: string
  assigneeId?: string | null
  creator?: User
  assignee?: User | null
  project?: Project
  posts?: Post[]
}

export interface TodoWithRelations extends Todo {
  creator: User
  assignee: User | null
  project: Project
  posts: Post[]
}

export interface CreateTodoInput {
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  status?: TodoStatus
  assigneeId?: string | null
  dueDate?: string | null
}