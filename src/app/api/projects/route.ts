import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { projectCreateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth/next"
import { validateOwnership } from "@/lib/ownership-utils"
import { ValidationError } from "@/lib/errors"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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
      return successResponse(projects)
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

    return successResponse(projects)
  } catch (error) {
    return handleApiError(error, "GET /api/projects")
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const validatedData = await parseRequestBody(request, projectCreateSchema)

    // Create project with associated discussion post
    const project = await prisma.$transaction(async (tx) => {
      // Prepare ownership data
      let ownerId: string | null = user.id
      let organizationId: string | null = null

      // If organizationId is provided, validate membership and set ownership
      if (validatedData.organizationId) {
        const isMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: validatedData.organizationId,
              userId: user.id
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
          authorId: user.id,
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

    return successResponse(project, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/projects")
  }
}