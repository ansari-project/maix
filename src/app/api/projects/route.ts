import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { projectCreateSchema } from "@/lib/validations"
import { validateOwnership } from "@/lib/ownership-utils"
import { ValidationError } from "@/lib/errors"
import { apiHandler } from '@/lib/api/api-handler'
import { withAuth, type AuthenticatedRequest } from '@/lib/api/with-auth'
import { logger } from '@/lib/logger'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NotificationService } from "@/services/notification.service"

export const dynamic = 'force-dynamic'

// GET /api/projects - List projects
const handleGet = async (request: Request) => {
  // Get current user session (if any)
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organizationId')

  if (!userId) {
    // No session - only return public projects
    const projects = await prisma.project.findMany({
      where: {
        isActive: true,
        visibility: 'PUBLIC',
        ...(organizationId && { organizationId })
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            url: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })
    
    logger.apiResponse('GET', '/api/projects', 200, 0)
    return NextResponse.json(projects)
  }

  // Use a single optimized query with OR conditions
  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...(organizationId && { organizationId }),
      OR: [
        { visibility: 'PUBLIC' },
        // User's personal projects
        {
          isPersonal: true,
          ownerId: userId
        },
        // Personal projects shared with user
        {
          isPersonal: true,
          members: {
            some: { userId }
          }
        },
        // Check membership in project directly
        {
          members: {
            some: { userId }
          }
        },
        // Check membership in parent product
        {
          product: {
            members: {
              some: { userId }
            }
          }
        },
        // Check membership in parent organization
        { 
          organization: { 
            members: { 
              some: { userId } 
            } 
          } 
        }
      ]
    },
    include: {
      owner: {
        select: {
          name: true,
          email: true
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      product: {
        select: {
          id: true,
          name: true,
          url: true
        }
      },
      _count: {
        select: {
          applications: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  logger.apiResponse('GET', '/api/projects', 200, 0)
  return NextResponse.json(projects)
}

// POST /api/projects - Create project
const handlePost = withAuth(async (request: AuthenticatedRequest) => {
  const body = await request.json()
  const validatedData = projectCreateSchema.parse(body)

  // Create project with associated discussion post
  const project = await prisma.$transaction(async (tx) => {
    // Handle personal project creation
    if (validatedData.isPersonal) {
      // Personal projects don't need organization/product validation
      // They also have relaxed requirements for goal, contactEmail, helpType
      const newProject = await tx.project.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          isPersonal: true,
          personalCategory: validatedData.personalCategory,
          ownerId: request.user.id,
          status: 'IN_PROGRESS', // Personal projects start in progress
          isActive: true,
          visibility: 'PRIVATE', // Personal projects are private by default
          targetCompletionDate: validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : null,
          // These fields are null for personal projects
          goal: null,
          contactEmail: null,
          helpType: null,
          organizationId: null,
          productId: null,
        },
        include: {
          owner: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
      
      return newProject
    }
    
    // For organization projects, validate requirements
    if (!validatedData.goal || !validatedData.contactEmail || !validatedData.helpType) {
      throw new ValidationError('Organization projects require goal, contactEmail, and helpType')
    }
    
    // If organizationId is provided, validate membership
    if (validatedData.organizationId) {
      const isMember = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: validatedData.organizationId,
            userId: request.user.id
          }
        }
      })

      if (!isMember) {
        throw new ValidationError('You must be a member of the organization to create projects under it')
      }
    }

    // If productId is provided, validate membership
    if (validatedData.productId) {
      const product = await tx.product.findUnique({
        where: { id: validatedData.productId },
        include: {
          members: {
            where: { userId: request.user.id }
          }
        }
      })

      if (!product) {
        throw new Error("Product not found")
      }

      // Check if user has access to the product
      const hasProductAccess = product.members.length > 0
      const hasOrgAccess = product.organizationId && validatedData.organizationId === product.organizationId

      if (!hasProductAccess && !hasOrgAccess) {
        throw new Error("You must be a member of the product or its organization to create projects under it")
      }
    }

    // 1. Create the project first
    const newProject = await tx.project.create({
      data: {
        name: validatedData.name,
        goal: validatedData.goal,
        description: validatedData.description,
        contactEmail: validatedData.contactEmail,
        helpType: validatedData.helpType,
        status: validatedData.status,
        visibility: validatedData.visibility || 'PUBLIC',
        productId: validatedData.productId,
        targetCompletionDate: validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : null,
        organizationId: validatedData.organizationId
      }
    })

    // Create membership for the creator as ADMIN
    await tx.projectMember.create({
      data: {
        projectId: newProject.id,
        userId: request.user.id,
        role: 'ADMIN'
      }
    })

    // 2. Create the discussion post and link it to the project (only for org projects)
    if (!validatedData.isPersonal) {
      await tx.post.create({
        data: {
          type: 'PROJECT_DISCUSSION',
          authorId: request.user.id,
          content: `Discussion thread for ${newProject.name}`,
          projectDiscussionThreadId: newProject.id, // Post holds FK to Project
        }
      })
    }

    // 3. Return the project with includes
    return tx.project.findUnique({
      where: { id: newProject.id },
      include: {
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      }
    })
  })

  if (!project) {
    throw new Error('Failed to create project')
  }

  // Send notifications for new project (only for organization projects)
  // Personal projects don't send notifications to all users
  if (!validatedData.isPersonal) {
    // This runs after the transaction completes to ensure the project exists
    const activeUsers = await prisma.user.findMany({
      where: { 
        isActive: true,
        id: { not: request.user.id } // Don't notify the creator
      },
      select: { id: true }
    })

    // Create notifications for each user 
    // NOTE: Currently synchronous for MVP simplicity. For scale, consider:
    // 1. Background job queue (Bull/BullMQ with Redis)
    // 2. Promise.allSettled() for parallel processing
    // 3. Batch notification creation with single DB transaction
    for (const activeUser of activeUsers) {
      await NotificationService.createNewProject({
        userId: activeUser.id,
        projectName: project.name,
        projectGoal: project.goal || '',
        projectId: project.id,
        helpType: project.helpType || 'ADVICE'
      })
    }
  }

  logger.info('Project created', {
    projectId: project.id,
    name: project.name,
    userId: request.user.id,
    organizationId: project.organizationId,
    helpType: project.helpType,
    status: project.status
  })

  return NextResponse.json(project, { status: 201 })
})

export const GET = apiHandler({ GET: handleGet })
export const POST = apiHandler({ POST: handlePost })