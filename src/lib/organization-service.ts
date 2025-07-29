import { prisma } from '@/lib/prisma'

export async function getUserOrganizations(userId: string) {
  const organizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    include: {
      members: {
        where: { userId },
        select: {
          role: true
        }
      },
      _count: {
        select: {
          members: true,
          projects: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Add user's role to each organization for convenience
  const organizationsWithRole = organizations.map(org => ({
    ...org,
    userRole: org.members[0]?.role || null
  }))

  return organizationsWithRole
}

export async function getOrganizationBySlug(slug: string, userId?: string) {
  // If userId is provided, combine existence and membership check in one query
  const where = userId 
    ? { 
        slug,
        members: {
          some: {
            userId
          }
        }
      }
    : { slug }

  const organization = await prisma.organization.findFirst({
    where,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      _count: {
        select: {
          members: true,
          projects: true
        }
      }
    }
  })

  if (!organization) {
    return null
  }

  // Convert dates to strings for client components
  return {
    ...organization,
    members: organization.members.map(member => ({
      ...member,
      joinedAt: member.joinedAt.toISOString()
    }))
  }
}

export async function getOrganizationById(id: string, userId?: string) {
  // If userId is provided, combine existence and membership check in one query
  const where = userId 
    ? { 
        id,
        members: {
          some: {
            userId
          }
        }
      }
    : { id }

  const organization = await prisma.organization.findFirst({
    where,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      _count: {
        select: {
          members: true,
          projects: true
        }
      }
    }
  })

  if (!organization) {
    return null
  }

  return organization
}