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

export const dynamic = 'force-dynamic'

// GET /api/projects - List projects
const handleGet = async (request: Request) => {
  // Get current user session (if any)
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    // No session - only return public projects
    const projects = await prisma.project.findMany({
      where: {
        isActive: true,
        visibility: 'PUBLIC'
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
      OR: [
        { visibility: 'PUBLIC' },
        { ownerId: userId },
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
    // Prepare ownership data
    let ownerId: string | null = request.user.id
    let organizationId: string | null = null

    // If organizationId is provided, validate membership and set ownership
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

      // Set organization ownership
      ownerId = null
      organizationId = validatedData.organizationId
    }

    // Validate ownership constraint
    validateOwnership({ ownerId, organizationId })

    // If productId is provided, validate ownership
    if (validatedData.productId) {
      const product = await tx.product.findUnique({
        where: { id: validatedData.productId }
      })

      if (!product) {
        throw new Error("Product not found")
      }

      // Check if the product has the same ownership
      if ((product.ownerId !== ownerId) || (product.organizationId !== organizationId)) {
        throw new Error("You can only associate projects with products that have the same ownership")
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
        ownerId,
        organizationId
      }
    })

    // 2. Create the discussion post and link it to the project
    await tx.post.create({
      data: {
        type: 'PROJECT_DISCUSSION',
        authorId: request.user.id,
        content: `Discussion thread for ${newProject.name}`,
        projectDiscussionThreadId: newProject.id, // Post holds FK to Project
      }
    })

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