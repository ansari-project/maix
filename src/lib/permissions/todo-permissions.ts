import { prisma } from '@/lib/prisma'

/**
 * Check if a user can manage todos in a project (create, update, delete)
 * Must be project owner, accepted volunteer, or organization member
 */
export async function canManageTodos(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId }
          }
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

  // Check if user is project owner
  if (project.ownerId === userId) return true

  // Check if user is in the organization
  if (project.organization && project.organization.members.length > 0) return true

  // Check if user is an accepted volunteer
  if (project.applications.length > 0) return true

  return false
}

/**
 * Check if a user can update a specific todo
 * Must be creator, assignee, or project owner
 */
export async function canUpdateTodo(userId: string, todoId: string): Promise<boolean> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      project: {
        include: {
          owner: true,
          organization: {
            include: {
              members: {
                where: { userId }
              }
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

  // Project owner can update
  if (todo.project.ownerId === userId) return true

  // Organization members can update
  if (todo.project.organization && todo.project.organization.members.length > 0) {
    return true
  }

  return false
}

/**
 * Check if a user can delete a specific todo
 * Must be creator or project owner
 */
export async function canDeleteTodo(userId: string, todoId: string): Promise<boolean> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      project: {
        include: {
          organization: {
            include: {
              members: {
                where: { userId, role: 'OWNER' }
              }
            }
          }
        }
      }
    }
  })

  if (!todo) return false

  // Creator can delete
  if (todo.creatorId === userId) return true

  // Project owner can delete
  if (todo.project.ownerId === userId) return true

  // Organization owners can delete
  if (todo.project.organization && todo.project.organization.members.length > 0) {
    return true
  }

  return false
}

/**
 * Check if a user is a valid assignee for a project
 * Must be project participant (owner, accepted volunteer, or org member)
 */
export async function isValidAssignee(userId: string, projectId: string): Promise<boolean> {
  // Check if user is project owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId }
          }
        }
      }
    }
  })

  if (!project) return false

  // Project owner is valid
  if (project.ownerId === userId) return true

  // Organization members are valid
  if (project.organization && project.organization.members.length > 0) {
    return true
  }

  // Check if user is an accepted volunteer
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