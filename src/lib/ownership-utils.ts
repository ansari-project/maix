import { prisma } from '@/lib/prisma'

/**
 * Validates that a resource has exactly one owner (user OR organization)
 * @throws Error if validation fails
 */
export function validateOwnership(data: { ownerId?: string | null; organizationId?: string | null }) {
  const hasUser = !!data.ownerId
  const hasOrg = !!data.organizationId

  if (hasUser && hasOrg) {
    throw new Error('A resource must be owned by exactly one user OR one organization, not both')
  }

  if (!hasUser && !hasOrg) {
    throw new Error('A resource must have an owner (either user or organization)')
  }
}

/**
 * Checks if a user has access to a resource (project or product)
 * @returns true if user has access, false otherwise
 */
export async function hasResourceAccess(
  userId: string,
  resource: {
    ownerId: string | null
    organizationId: string | null
    visibility: string
  },
  action: 'read' | 'update' | 'delete' = 'read'
): Promise<boolean> {
  // Public resources can be read by anyone
  if (action === 'read' && resource.visibility === 'PUBLIC') {
    return true
  }

  // User-owned resource
  if (resource.ownerId) {
    return resource.ownerId === userId
  }

  // Organization-owned resource
  if (resource.organizationId) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: resource.organizationId,
          userId
        }
      }
    })

    if (!member) return false

    // Delete requires OWNER role
    if (action === 'delete') {
      return member.role === 'OWNER'
    }

    // Read/Update allowed for any member
    return true
  }

  // Orphaned resource (should not happen with validation)
  return false
}

/**
 * Gets the owner display information for a resource
 */
export async function getOwnerInfo(resource: {
  ownerId: string | null
  organizationId: string | null
}) {
  if (resource.ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: resource.ownerId },
      select: { id: true, name: true }
    })
    return { type: 'user' as const, owner }
  }

  if (resource.organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: resource.organizationId },
      select: { id: true, name: true, slug: true }
    })
    return { type: 'organization' as const, organization }
  }

  return null
}