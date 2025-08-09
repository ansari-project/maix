import { Project, ProjectMember, User } from '@prisma/client'

type ProjectWithMembers = Project & {
  members?: (ProjectMember & { user?: User })[]
  owner?: User
}

/**
 * Check if a user can view a project
 */
export function canViewProject(
  project: ProjectWithMembers,
  userId: string
): boolean {
  // Personal projects have special visibility rules
  if (project.isPersonal) {
    return canAccessPersonalProject(project, userId)
  }

  // Organization projects
  // Public projects can be viewed by anyone
  if (project.visibility === 'PUBLIC') {
    return true
  }

  // Private projects require membership
  return isProjectMemberOrOwner(project, userId)
}

/**
 * Check if a user can edit a project
 */
export function canEditProject(
  project: ProjectWithMembers,
  userId: string
): boolean {
  // Only owner can edit personal projects
  if (project.isPersonal) {
    return project.ownerId === userId
  }

  // For org projects, check ownership or admin role
  if (project.ownerId === userId) {
    return true
  }

  const member = project.members?.find(m => m.userId === userId)
  return member?.role === 'ADMIN' || member?.role === 'OWNER'
}

/**
 * Check if a user can delete a project
 */
export function canDeleteProject(
  project: ProjectWithMembers,
  userId: string
): boolean {
  // Only owner can delete
  return project.ownerId === userId
}

/**
 * Check if a user can manage project members
 */
export function canManageMembers(
  project: ProjectWithMembers,
  userId: string
): boolean {
  // Personal project owners can share/unshare
  if (project.isPersonal) {
    return project.ownerId === userId
  }

  // Org project owners and admins can manage members
  if (project.ownerId === userId) {
    return true
  }

  const member = project.members?.find(m => m.userId === userId)
  return member?.role === 'ADMIN' || member?.role === 'OWNER'
}

/**
 * Check if a user can create tasks in a project
 */
export function canCreateTask(
  project: ProjectWithMembers,
  userId: string
): boolean {
  // Any member can create tasks
  return isProjectMemberOrOwner(project, userId)
}

/**
 * Check if a user can access a personal project
 */
function canAccessPersonalProject(
  project: ProjectWithMembers,
  userId: string
): boolean {
  // Owner always has access
  if (project.ownerId === userId) {
    return true
  }

  // Check if user is in shared members
  return project.members?.some(m => m.userId === userId) || false
}

/**
 * Check if user is project member or owner
 */
function isProjectMemberOrOwner(
  project: ProjectWithMembers,
  userId: string
): boolean {
  if (project.ownerId === userId) {
    return true
  }

  return project.members?.some(m => m.userId === userId) || false
}

/**
 * Get user's role in a project
 */
export function getUserProjectRole(
  project: ProjectWithMembers,
  userId: string
): 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null {
  if (project.ownerId === userId) {
    return 'OWNER'
  }

  const member = project.members?.find(m => m.userId === userId)
  return member?.role || null
}

/**
 * Check if a project is shared (has members beyond owner)
 */
export function isProjectShared(project: ProjectWithMembers): boolean {
  return (project.members?.length || 0) > 0
}

/**
 * Get list of users who can access a project
 */
export function getProjectAccessList(project: ProjectWithMembers): string[] {
  const users = new Set<string>()
  
  // Add owner
  if (project.ownerId) {
    users.add(project.ownerId)
  }
  
  // Add members
  project.members?.forEach(m => {
    users.add(m.userId)
  })
  
  return Array.from(users)
}