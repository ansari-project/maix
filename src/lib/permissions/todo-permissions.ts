import { prisma } from '@/lib/prisma'

/**
 * Check if a user can manage todos in a project (create, update, delete)
 * Must be project member (ADMIN/MEMBER role) or accepted volunteer
 */
export async function canManageTodos(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { 
          userId,
          role: { in: ['ADMIN', 'MEMBER'] }
        }
      },
      applications: {
        where: {
          userId,
          status: 'ACCEPTED'
        }
      }
    }
  })

  if (!project) return false

  // Check if user has project membership with appropriate role
  if (project.members.length > 0) return true

  // Check if user is an accepted volunteer (legacy support)
  if (project.applications.length > 0) return true

  return false
}

/**
 * Check if a user can view todos in a project
 * Must be project member or accepted volunteer
 */
export async function canViewTodos(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId }
      },
      applications: {
        where: {
          userId,
          status: 'ACCEPTED'
        }
      }
    }
  })

  if (!project) return false

  // Check if user has project membership
  if (project.members.length > 0) return true

  // Check if user is an accepted volunteer (legacy support)
  if (project.applications.length > 0) return true

  return false
}

/**
 * Check if a user can update a specific todo
 * Must be creator, assignee, or project member with ADMIN/MEMBER role
 */
export async function canUpdateTodo(userId: string, todoId: string): Promise<boolean> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      project: {
        include: {
          members: {
            where: { 
              userId,
              role: { in: ['ADMIN', 'MEMBER'] }
            }
          }
        }
      }
    }
  })

  if (!todo) return false

  // Creator can always update
  if (todo.creatorId === userId) return true

  // Assignee can update
  if (todo.assigneeId === userId) return true

  // Project members with appropriate role can update
  if (todo.project.members.length > 0) return true

  return false
}

/**
 * Check if a user can delete a specific todo
 * Must be creator or project admin
 */
export async function canDeleteTodo(userId: string, todoId: string): Promise<boolean> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      project: {
        include: {
          members: {
            where: { 
              userId,
              role: 'ADMIN'
            }
          }
        }
      }
    }
  })

  if (!todo) return false

  // Creator can delete
  if (todo.creatorId === userId) return true

  // Project admins can delete
  if (todo.project.members.length > 0) return true

  return false
}

/**
 * Check if a user is a valid assignee for a project
 * Must be project member or accepted volunteer
 */
export async function isValidAssignee(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId }
      }
    }
  })

  if (!project) return false

  // Project members are valid assignees
  if (project.members.length > 0) return true

  // Check if user is an accepted volunteer (legacy support)
  const application = await prisma.application.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  })

  return application?.status === 'ACCEPTED'
}