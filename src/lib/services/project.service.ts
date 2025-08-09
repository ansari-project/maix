import { PrismaClient, Project, ProjectStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schemas
export const createPersonalProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  personalCategory: z.string().max(100).optional(),
  targetCompletionDate: z.date().optional(),
})

export const createOrgProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  goal: z.string(),
  contactEmail: z.string().email(),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'FEATURE', 'MVP', 'FULL_PRODUCT']),
  targetCompletionDate: z.date().optional(),
  organizationId: z.string().optional(),
})

export type CreatePersonalProjectInput = z.infer<typeof createPersonalProjectSchema>
export type CreateOrgProjectInput = z.infer<typeof createOrgProjectSchema>

/**
 * Create a personal project
 */
export async function createPersonalProject(
  ownerId: string,
  data: CreatePersonalProjectInput
): Promise<Project> {
  const validated = createPersonalProjectSchema.parse(data)
  
  return prisma.project.create({
    data: {
      ...validated,
      ownerId,
      isPersonal: true,
      isActive: true,
      status: ProjectStatus.IN_PROGRESS,
      // Personal projects don't need these fields
      goal: null,
      contactEmail: null,
      helpType: null,
    },
    include: {
      owner: true,
      members: true,
    },
  })
}

/**
 * Get user's personal projects
 */
export async function getPersonalProjects(
  userId: string,
  options?: {
    includeShared?: boolean
    category?: string
  }
): Promise<Project[]> {
  const where: Prisma.ProjectWhereInput = {
    isPersonal: true,
  }

  if (options?.includeShared) {
    // Include projects where user is owner OR member
    where.OR = [
      { ownerId: userId },
      { members: { some: { userId } } },
    ]
  } else {
    // Only projects owned by user
    where.ownerId = userId
  }

  // Filter by category if specified
  if (options?.category) {
    where.personalCategory = options.category
  }

  return prisma.project.findMany({
    where,
    include: {
      owner: true,
      members: {
        include: {
          user: true,
        },
      },
      todos: {
        where: {
          status: {
            notIn: ['COMPLETED', 'DONE'],
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

/**
 * Share a personal project with another user
 */
export async function sharePersonalProject(
  projectId: string,
  userId: string,
  shareWithUserId: string
): Promise<Project> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (!project.isPersonal) {
    throw new Error('Can only share personal projects through this method')
  }

  if (project.ownerId !== userId) {
    throw new Error('Only the owner can share a personal project')
  }

  // Check if already shared
  const existingMember = project.members.find(m => m.userId === shareWithUserId)
  if (existingMember) {
    throw new Error('Project already shared with this user')
  }

  // Add user as member
  await prisma.projectMember.create({
    data: {
      projectId,
      userId: shareWithUserId,
      role: 'MEMBER',
    },
  })

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  }) as Promise<Project>
}

/**
 * Remove sharing for a personal project
 */
export async function unsharePersonalProject(
  projectId: string,
  userId: string,
  unshareUserId: string
): Promise<Project> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (!project.isPersonal) {
    throw new Error('Can only unshare personal projects through this method')
  }

  if (project.ownerId !== userId) {
    throw new Error('Only the owner can manage sharing')
  }

  // Remove member
  await prisma.projectMember.deleteMany({
    where: {
      projectId,
      userId: unshareUserId,
    },
  })

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  }) as Promise<Project>
}

/**
 * Delete a project and handle task orphaning
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { todos: true },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (project.ownerId !== userId) {
    throw new Error('Only the owner can delete a project')
  }

  // Transaction to handle task orphaning
  await prisma.$transaction(async (tx) => {
    // Orphan all tasks (make them standalone)
    await tx.todo.updateMany({
      where: { projectId },
      data: { projectId: null },
    })

    // Delete project members
    await tx.projectMember.deleteMany({
      where: { projectId },
    })

    // Delete the project
    await tx.project.delete({
      where: { id: projectId },
    })
  })
}

/**
 * Get all projects accessible to a user
 */
export async function getUserProjects(
  userId: string,
  options?: {
    includePersonal?: boolean
    includeOrganization?: boolean
  }
): Promise<Project[]> {
  const where: Prisma.ProjectWhereInput = {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  }

  // Filter by project type
  if (options?.includePersonal === false) {
    where.isPersonal = false
  } else if (options?.includeOrganization === false) {
    where.isPersonal = true
  }

  return prisma.project.findMany({
    where,
    include: {
      owner: true,
      organization: true,
      members: {
        include: {
          user: true,
        },
      },
      _count: {
        select: {
          todos: {
            where: {
              status: {
                notIn: ['COMPLETED', 'DONE'],
              },
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

/**
 * Update project category (personal projects only)
 */
export async function updatePersonalCategory(
  projectId: string,
  userId: string,
  category: string | null
): Promise<Project> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (!project.isPersonal) {
    throw new Error('Categories only apply to personal projects')
  }

  if (project.ownerId !== userId) {
    throw new Error('Only the owner can update project category')
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { personalCategory: category },
    include: {
      owner: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  })
}

/**
 * Get unique personal categories for a user
 */
export async function getUserPersonalCategories(
  userId: string
): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: {
      isPersonal: true,
      ownerId: userId,
      personalCategory: { not: null },
    },
    select: {
      personalCategory: true,
    },
    distinct: ['personalCategory'],
  })

  return projects
    .map(p => p.personalCategory)
    .filter((c): c is string => c !== null)
    .sort()
}