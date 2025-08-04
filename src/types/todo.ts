import type { User, Project, Post } from '@prisma/client'

export enum TodoStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface Todo {
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  dueDate?: Date | null
  createdAt: Date
  updatedAt: Date
  projectId: string
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