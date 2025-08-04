import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { prisma } from "./prisma"
import { AuthError } from "./errors"
import type { UnifiedRole, Visibility } from "@prisma/client"

export type { UnifiedRole } from "@prisma/client"

// Role hierarchy for permission comparisons
export const ROLE_HIERARCHY: Record<UnifiedRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4
}

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    throw new AuthError("Not authenticated")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    // Treat this as an authentication failure. The session is valid,
    // but the user it points to is gone.
    throw new AuthError("Authenticated user not found")
  }

  return user
}

// Get effective role with inheritance
export async function getEffectiveRole(
  userId: string,
  entityType: 'organization' | 'product' | 'project',
  entityId: string
): Promise<UnifiedRole | null> {
  // Check direct membership first
  switch (entityType) {
    case 'project': {
      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: entityId, userId } }
      })
      if (projectMember) {
        return projectMember.role
      }
      
      // Check parent product/org membership
      const project = await prisma.project.findUnique({
        where: { id: entityId },
        select: { productId: true, organizationId: true }
      })
      
      if (project?.productId) {
        return await getEffectiveRole(userId, 'product', project.productId)
      } else if (project?.organizationId) {
        return await getEffectiveRole(userId, 'organization', project.organizationId)
      }
      break
    }
    
    case 'product': {
      const productMember = await prisma.productMember.findUnique({
        where: { productId_userId: { productId: entityId, userId } }
      })
      if (productMember) {
        return productMember.role
      }
      
      // Check parent organization membership
      const product = await prisma.product.findUnique({
        where: { id: entityId },
        select: { organizationId: true }
      })
      
      if (product?.organizationId) {
        const orgRole = await getEffectiveRole(userId, 'organization', product.organizationId)
        // Organization OWNER gets ADMIN access, others get VIEWER
        return orgRole ? (orgRole === 'OWNER' ? 'ADMIN' : 'VIEWER') : null
      }
      break
    }
    
    case 'organization': {
      const orgMember = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: entityId, userId } }
      })
      // Map legacy OrgRole to UnifiedRole during transition
      if (orgMember) {
        return orgMember.role as unknown as UnifiedRole
      }
      break
    }
  }
  
  return null
}

// Permission check with required role
export async function requirePermission(
  entityType: 'organization' | 'product' | 'project',
  entityId: string,
  requiredRole: UnifiedRole = 'VIEWER'
) {
  const user = await requireAuth()
  const effectiveRole = await getEffectiveRole(user.id, entityType, entityId)
  
  if (!effectiveRole) {
    throw new AuthError('Access denied')
  }
  
  const userLevel = ROLE_HIERARCHY[effectiveRole]
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  
  if (userLevel < requiredLevel) {
    throw new AuthError(`Insufficient permissions. Required: ${requiredRole}, Current: ${effectiveRole}`)
  }
  
  return { user, role: effectiveRole }
}

// Check if user has permission for an action
export function hasPermission(role: UnifiedRole | null, requiredRole: UnifiedRole): boolean {
  if (!role) return false
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole]
}

// Core authorization function for visibility-aware permissions
export async function can(
  user: { id: string } | null,
  action: 'read' | 'update' | 'delete' | 'invite' | 'manage_members',
  entity: { id: string, type: 'organization' | 'product' | 'project', visibility?: Visibility }
): Promise<boolean> {
  // Public read access
  if (action === 'read' && entity.visibility === 'PUBLIC') {
    return true
  }
  
  // All other actions require auth
  if (!user) return false
  
  // Get effective role from RBAC
  const role = await getEffectiveRole(user.id, entity.type, entity.id)
  
  // Map actions to required roles
  const actionRoleMap: Record<string, UnifiedRole> = {
    'read': 'VIEWER',
    'update': 'MEMBER',
    'delete': 'ADMIN',
    'invite': entity.type === 'organization' ? 'OWNER' : 'ADMIN',
    'manage_members': 'ADMIN'
  }
  
  const requiredRole = actionRoleMap[action] || 'ADMIN'
  return hasPermission(role, requiredRole)
}

// Custom error for not found entities
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

// Visibility-aware entity fetching
export async function canViewEntity(
  entityType: 'organization' | 'product' | 'project' | 'post',
  entityId: string,
  userId?: string
): Promise<{ entity: any, user: any, role: UnifiedRole | null }> {
  let entity
  let user = null
  let role: UnifiedRole | null = null
  
  // Get user if authenticated
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId }
    })
  }
  
  // Fetch entity with visibility
  switch (entityType) {
    case 'organization':
      entity = await prisma.organization.findUnique({
        where: { id: entityId },
        include: {
          members: true,
          products: true,
          projects: true
        }
      })
      // Organizations are always visible (they don't have visibility field yet)
      break
      
    case 'product':
      entity = await prisma.product.findUnique({
        where: { id: entityId },
        include: {
          members: true,
          projects: true,
          organization: true
        }
      })
      break
      
    case 'project':
      entity = await prisma.project.findUnique({
        where: { id: entityId },
        include: {
          members: true,
          product: true,
          organization: true
        }
      })
      break
      
    case 'post':
      entity = await prisma.post.findUnique({
        where: { id: entityId },
        include: {
          author: true,
          project: true,
          product: true
        }
      })
      break
  }
  
  if (!entity) {
    throw new NotFoundError(`${entityType} not found`)
  }
  
  // Check visibility permissions
  if (entityType === 'organization' || (entity as any).visibility === 'PUBLIC') {
    // For public content, get role if user is authenticated
    if (user && entityType !== 'post') {
      role = await getEffectiveRole(user.id, entityType as 'organization' | 'product' | 'project', entityId)
    }
    return { entity, user, role }
  }
  
  // Private/Draft content requires authentication and permissions
  if (!user) {
    throw new NotFoundError(`${entityType} not found`)
  }
  
  // For posts with DRAFT visibility, only the author can see it
  if ((entity as any).visibility === 'DRAFT' && entityType === 'post') {
    if ((entity as any).authorId !== user.id) {
      throw new NotFoundError(`${entityType} not found`)
    }
    // For draft posts, no role needed as it's author-only access
    return { entity, user, role: null }
  }
  
  // For private content, check if user has access via RBAC
  // Get the role first since can() will need it anyway
  if (entityType !== 'post') {
    role = await getEffectiveRole(user.id, entityType as 'organization' | 'product' | 'project', entityId)
  }
  
  const hasAccess = await can(user, 'read', {
    id: entityId,
    type: entityType as 'organization' | 'product' | 'project',
    visibility: (entity as any).visibility
  })
  
  if (!hasAccess) {
    throw new NotFoundError(`${entityType} not found`)
  }
  
  return { entity, user, role }
}