import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { projectCreateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        isActive: true
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true
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
      take: 50 // Add pagination limit
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

    // If productId is provided, validate user owns the product
    if (validatedData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId }
      })

      if (!product) {
        throw new Error("Product not found")
      }

      if (product.ownerId !== user.id) {
        throw new Error("You can only associate projects with your own products")
      }
    }

    // Create project with associated discussion post
    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the project first
      const newProject = await tx.project.create({
        data: {
          ...validatedData,
          // Convert empty string to null for optional URL field
          webpage: validatedData.webpage === '' ? null : validatedData.webpage,
          // Convert targetCompletionDate string to Date if provided
          targetCompletionDate: validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : null,
          ownerId: user.id
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