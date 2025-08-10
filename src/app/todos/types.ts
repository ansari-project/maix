// Shared types for Todo components

export interface Todo {
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
  comments?: Comment[]
}

export interface Comment {
  id: string
  content: string
  createdAt: Date
  author?: {
    id: string
    name: string | null
    email: string
  }
}

// Helper functions for date parsing
export const parseTodo = (data: any): Todo => ({
  ...data,
  createdAt: new Date(data.createdAt),
  updatedAt: new Date(data.updatedAt),
  dueDate: data.dueDate ? new Date(data.dueDate) : null,
  comments: data.comments?.map(parseComment) || []
})

export const parseComment = (data: any): Comment => ({
  ...data,
  createdAt: new Date(data.createdAt)
})

// Helper for serializing dates for API
export const serializeTodo = (todo: Todo) => ({
  ...todo,
  createdAt: todo.createdAt.toISOString(),
  updatedAt: todo.updatedAt.toISOString(),
  dueDate: todo.dueDate ? todo.dueDate.toISOString() : null
})