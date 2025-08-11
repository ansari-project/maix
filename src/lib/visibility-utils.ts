/**
 * Visibility System Utilities
 * 
 * Controls what entities users can VIEW (separate from RBAC which controls actions).
 * This is one of three orthogonal systems:
 * 1. RBAC - Controls actions (what you can do)
 * 2. Visibility - Controls viewing (what you can see) 
 * 3. Following - Controls notifications (what updates you get)
 */

import { prisma } from '@/lib/prisma'
import { FollowableType, Visibility } from '@prisma/client'

/**
 * Check if a user can view an entity based on visibility rules
 * 
 * Visibility Rules:
 * - PUBLIC: Anyone can view
 * - DRAFT: Only the owner can view (work in progress)
 * - PRIVATE: Only direct participants/members can view
 * 
 * @param userId - The user attempting to view
 * @param entityId - The entity being viewed
 * @param entityType - Type of entity (Organization, Project, Product)
 * @returns True if user can view, false otherwise
 */
export async function canViewEntity(
  userId: string,
  entityId: string,
  entityType: FollowableType
): Promise<boolean> {
  try {
    switch (entityType) {
      case FollowableType.ORGANIZATION:
        return canViewOrganization(userId, entityId)
      
      case FollowableType.PROJECT:
        return canViewProject(userId, entityId)
      
      case FollowableType.PRODUCT:
        return canViewProduct(userId, entityId)
      
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking entity visibility:', error)
    return false
  }
}

/**
 * Check if user can view an organization
 * Organizations are always viewable (they control member visibility, not org visibility)
 */
async function canViewOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  // For now, all organizations are viewable
  // In the future, we might add private organizations
  const org = await prisma.organization.findUnique({
    where: { id: organizationId }
  })
  
  return !!org // If org exists, it's viewable
}

/**
 * Check if user can view a project based on visibility settings
 */
async function canViewProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      visibility: true,
      organizationId: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { id: true }
      }
    }
  })

  if (!project) return false

  // Check visibility rules
  switch (project.visibility) {
    case Visibility.PUBLIC:
      return true
    
    case Visibility.DRAFT:
      // DRAFT: Only owner can view (work in progress)
      return project.ownerId === userId
    
    case Visibility.PRIVATE:
      // Check if user is owner
      if (project.ownerId === userId) return true
      
      // Check if user is a participant
      if (project.members.length > 0) return true
      
      // Check if user is in the organization (if project belongs to org)
      if (project.organizationId) {
        const isMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: project.organizationId,
              userId
            }
          }
        })
        if (isMember) return true
      }
      
      return false
    
    default:
      return false
  }
}

/**
 * Check if user can view a product based on visibility settings
 */
async function canViewProduct(
  userId: string,
  productId: string
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      visibility: true,
      organizationId: true,
      members: {
        where: { userId },
        select: { id: true }
      }
    }
  })

  if (!product) return false

  // Check visibility rules
  switch (product.visibility) {
    case Visibility.PUBLIC:
      return true
    
    case Visibility.DRAFT:
      // DRAFT: Only organization owners can view (work in progress)
      if (product.organizationId) {
        const isOwner = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: product.organizationId,
              userId
            }
          }
        })
        return isOwner?.role === 'OWNER'
      }
      return false
    
    case Visibility.PRIVATE:
      // Check if user is a product member
      if (product.members.length > 0) return true
      
      // Check if user is in the organization
      if (product.organizationId) {
        const isMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: product.organizationId,
              userId
            }
          }
        })
        if (isMember) return true
      }
      
      return false
    
    default:
      return false
  }
}

/**
 * Get visibility filter for listing entities
 * Returns a Prisma where clause that filters entities by what the user can see
 */
export function getVisibilityFilter(userId: string, organizationId?: string) {
  return {
    OR: [
      // Public entities
      { visibility: Visibility.PUBLIC },
      
      // Entities where user is owner
      { ownerId: userId },
      
      // Draft entities where user is owner (for projects)
      {
        AND: [
          { visibility: Visibility.DRAFT },
          { ownerId: userId }
        ]
      },
      
      // Private entities where user is a participant/member
      {
        AND: [
          { visibility: Visibility.PRIVATE },
          {
            OR: [
              { members: { some: { userId } } },
              // User is in the organization  
              ...(organizationId ? [{ organizationId }] : [])
            ]
          }
        ]
      }
    ]
  }
}